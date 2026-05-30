from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from bookings.models import Booking
from rooms.models import Room

MIN_HOLD_MINUTES = 180
MAX_HOLD_MINUTES = 24 * 60
PAYMENT_HOLD_MINUTES = 10


def _emit_no_show(booking: Booking) -> None:
    from bookings.services.realtime_service import emit_booking_live_bill, emit_room_status

    emit_booking_live_bill(booking)
    if booking.room_id:
        emit_room_status(booking.branch_id, booking.room_id, "AVAILABLE")


def calculate_hold_minutes(stay_minutes: int, deposit_percentage: int) -> int:
    pct = max(20, min(100, int(deposit_percentage or 20)))
    minutes = max(1, int(round(max(1, int(stay_minutes or 0)) * (pct / 100.0))))
    return max(MIN_HOLD_MINUTES, min(minutes, MAX_HOLD_MINUTES))


def calculate_deposit_amount(room_price: int, deposit_percentage: int) -> int:
    pct = max(20, min(100, int(deposit_percentage or 20)))
    base = max(0, int(room_price or 0))
    return max(1, int(round(base * (pct / 100.0)))) if base > 0 else 0


def apply_payment_hold_deadline(booking: Booking, minutes: int | None = None) -> Booking:
    """PENDING booking: customer must pay within N minutes or the hold is released."""
    hold = max(1, int(minutes or PAYMENT_HOLD_MINUTES))
    now = timezone.now()
    booking.hold_minutes = hold
    booking.late_hold_deadline_at = now + timedelta(minutes=hold)
    return booking


def enforce_payment_hold_expiry(booking: Booking, now=None) -> Booking:
    """Cancel unpaid PENDING bookings after the payment window expires."""
    current = now or timezone.now()
    with transaction.atomic():
        locked = Booking.objects.select_for_update().get(pk=booking.pk)
        if locked.status != Booking.Status.PENDING:
            return locked
        if not locked.late_hold_deadline_at:
            return locked

        deadline = locked.late_hold_deadline_at
        if timezone.is_naive(deadline):
            deadline = timezone.make_aware(deadline, timezone.get_current_timezone())
        if timezone.is_naive(current):
            current = timezone.make_aware(current, timezone.get_current_timezone())
        if current <= deadline:
            return locked

        locked.status = Booking.Status.CANCELLED
        locked.save(update_fields=["status", "updated_at"])
        booking.status = locked.status
        return locked


def apply_late_hold_deadline(booking: Booking, deposit_percentage: int | None = None) -> Booking:
    pct = int(deposit_percentage if deposit_percentage is not None else getattr(booking, "deposit_percentage", 20) or 20)
    pct = max(20, min(100, pct))

    check_in = booking.check_in_at
    check_out = booking.expected_check_out_at or booking.check_out_at
    if not check_in:
        return booking

    if check_out and check_out > check_in:
        stay_minutes = max(1, int((check_out - check_in).total_seconds() // 60))
    else:
        stay_minutes = 24 * 60

    hold_minutes = calculate_hold_minutes(stay_minutes, pct)
    booking.deposit_percentage = pct
    booking.hold_minutes = hold_minutes
    deadline = check_in + timedelta(minutes=hold_minutes)
    now = timezone.now()
    if timezone.is_naive(deadline):
        deadline = timezone.make_aware(deadline, timezone.get_current_timezone())
    if timezone.is_naive(now):
        now = timezone.make_aware(now, timezone.get_current_timezone())
    grace_floor = max(check_in, now) + timedelta(minutes=30)
    if timezone.is_naive(grace_floor):
        grace_floor = timezone.make_aware(grace_floor, timezone.get_current_timezone())
    if deadline < grace_floor:
        deadline = grace_floor
    booking.late_hold_deadline_at = deadline
    return booking


def enforce_late_hold_no_show(booking: Booking, now=None) -> Booking:
    current = now or timezone.now()
    with transaction.atomic():
        locked = Booking.objects.select_for_update().get(pk=booking.pk)
        if locked.status not in {Booking.Status.PENDING, Booking.Status.CONFIRMED}:
            return locked
        if not locked.late_hold_deadline_at or not locked.check_in_at:
            return locked

        deadline = locked.late_hold_deadline_at
        if timezone.is_naive(deadline):
            deadline = timezone.make_aware(deadline, timezone.get_current_timezone())
        if timezone.is_naive(current):
            current = timezone.make_aware(current, timezone.get_current_timezone())

        if current <= deadline:
            return locked

        check_in = locked.check_in_at
        if check_in:
            if timezone.is_naive(check_in):
                check_in = timezone.make_aware(check_in, timezone.get_current_timezone())
            if current < check_in:
                return locked

        locked.status = (
            Booking.Status.CANCELLED
            if locked.status == Booking.Status.PENDING
            else Booking.Status.CANCELLED_NO_SHOW
        )
        locked.save(update_fields=["status", "updated_at"])

        if locked.room_id:
            Room.objects.filter(id=locked.room_id).update(status="AVAILABLE", updated_at=timezone.now())

        _emit_no_show(locked)
        booking.status = locked.status
        return locked


def enforce_late_hold_for_queryset(queryset, now=None):
    for booking in queryset:
        enforce_late_hold_no_show(booking, now=now)


def enforce_all_overdue_no_shows(now=None) -> int:
    """Cancel all bookings past their late-hold deadline. Returns count processed."""
    current = now or timezone.now()
    qs = Booking.objects.filter(
        status__in={Booking.Status.PENDING, Booking.Status.CONFIRMED},
        late_hold_deadline_at__isnull=False,
        late_hold_deadline_at__lt=current,
    )
    count = qs.count()
    enforce_late_hold_for_queryset(qs, now=current)
    return count


class HoldService:
    """Deposit holds and no-show rules."""

    calculate_hold_minutes = staticmethod(calculate_hold_minutes)
    calculate_deposit_amount = staticmethod(calculate_deposit_amount)
    apply_payment_hold_deadline = staticmethod(apply_payment_hold_deadline)
    enforce_payment_hold_expiry = staticmethod(enforce_payment_hold_expiry)
    apply_late_hold_deadline = staticmethod(apply_late_hold_deadline)
    enforce_late_hold_no_show = staticmethod(enforce_late_hold_no_show)
    enforce_late_hold_for_queryset = staticmethod(enforce_late_hold_for_queryset)
    enforce_all_overdue_no_shows = staticmethod(enforce_all_overdue_no_shows)
