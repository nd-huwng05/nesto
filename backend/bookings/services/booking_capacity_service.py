"""Room category availability checks for booking create."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from bookings.models import Booking
from rooms.models import Room


# PENDING = chưa thanh toán, không giữ phòng. Chỉ CONFIRMED/CHECKED_IN trừ tồn.
CAPACITY_BLOCKING_STATUSES = {
    Booking.Status.CONFIRMED,
    Booking.Status.CHECKED_IN,
}

# Giữ tên cũ cho code tham chiếu nội bộ (no-show, v.v.)
ACTIVE_STATUSES = {
    Booking.Status.PENDING,
    Booking.Status.CONFIRMED,
    Booking.Status.CHECKED_IN,
}


def release_customer_overlapping_pending(
    *,
    customer_id,
    branch_id,
    room_category_id,
    check_in_at,
    expected_check_out_at,
) -> int:
    """Cancel the customer's unpaid PENDING overlaps so they can retry checkout."""
    if not customer_id or not room_category_id or not check_in_at or not expected_check_out_at:
        return 0

    qs = Booking.objects.filter(
        customer_id=customer_id,
        branch_id=branch_id,
        room_category_id=room_category_id,
        status=Booking.Status.PENDING,
        check_in_at__lt=expected_check_out_at,
        expected_check_out_at__gt=check_in_at,
    )
    return qs.update(status=Booking.Status.CANCELLED, updated_at=timezone.now())


def release_stale_pending_bookings(*, branch_id=None, max_age_minutes=30) -> int:
    """Cancel old unpaid PENDING bookings that block inventory during demos."""
    cutoff = timezone.now() - timedelta(minutes=max(5, int(max_age_minutes or 30)))
    qs = Booking.objects.filter(status=Booking.Status.PENDING, created_at__lt=cutoff)
    if branch_id:
        qs = qs.filter(branch_id=branch_id)
    return qs.update(status=Booking.Status.CANCELLED, updated_at=timezone.now())


def prepare_category_availability(
    *,
    customer_id=None,
    branch_id,
    room_category_id,
    check_in_at,
    expected_check_out_at,
) -> None:
    release_stale_pending_bookings(branch_id=branch_id, max_age_minutes=180)
    if customer_id:
        release_customer_overlapping_pending(
            customer_id=customer_id,
            branch_id=branch_id,
            room_category_id=room_category_id,
            check_in_at=check_in_at,
            expected_check_out_at=expected_check_out_at,
        )


def count_available_rooms(*, branch_id, room_category_id) -> int:
    if not room_category_id:
        return 0
    return (
        Room.objects.filter(
            branch_id=branch_id,
            category_id=room_category_id,
        )
        .exclude(status__in={Room.Status.MAINTENANCE, Room.Status.OUT_OF_ORDER})
        .count()
    )


def count_bookable_rooms_for_period(
    *,
    branch_id,
    room_category_id,
    check_in_at,
    expected_check_out_at,
    exclude_booking_id=None,
) -> int:
    capacity = count_available_rooms(branch_id=branch_id, room_category_id=room_category_id)
    if capacity <= 0:
        return 0
    overlapping = count_overlapping_bookings(
        branch_id=branch_id,
        room_category_id=room_category_id,
        check_in_at=check_in_at,
        expected_check_out_at=expected_check_out_at,
        exclude_booking_id=exclude_booking_id,
    )
    return max(0, capacity - overlapping)


def count_overlapping_bookings(
    *,
    branch_id,
    room_category_id,
    check_in_at,
    expected_check_out_at,
    exclude_booking_id=None,
) -> int:
    if not room_category_id or not check_in_at or not expected_check_out_at:
        return 0

    qs = Booking.objects.filter(
        branch_id=branch_id,
        room_category_id=room_category_id,
        status__in=CAPACITY_BLOCKING_STATUSES,
        check_in_at__lt=expected_check_out_at,
        expected_check_out_at__gt=check_in_at,
    )
    if exclude_booking_id:
        qs = qs.exclude(pk=exclude_booking_id)
    return qs.count()


def assert_category_available(
    *,
    branch_id,
    room_category_id,
    check_in_at,
    expected_check_out_at,
    exclude_booking_id=None,
) -> None:
    capacity = count_available_rooms(branch_id=branch_id, room_category_id=room_category_id)
    if capacity <= 0:
        raise ValueError("This room type is not available at the selected branch.")

    overlapping = count_overlapping_bookings(
        branch_id=branch_id,
        room_category_id=room_category_id,
        check_in_at=check_in_at,
        expected_check_out_at=expected_check_out_at,
        exclude_booking_id=exclude_booking_id,
    )
    if overlapping >= capacity:
        raise ValueError(
            "No rooms available for this type in the selected period. Please choose different dates."
        )
