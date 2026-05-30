"""Reception booking operations — check-in, walk-in, checkout, room changes."""

from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone

from accounts.services.branch_access_service import BranchAccessService
from bookings.models import Booking
from bookings.services.billing_service import build_final_bill
from bookings.services.booking_notification_service import BookingNotificationService
from bookings.services.booking_refund_service import request_deposit_refund
from bookings.services.realtime_service import emit_booking_live_bill, emit_room_status
from rooms.services.housekeeping_task_service import ensure_housekeeping_task_for_dirty_room
from rooms.models import READY_ROOM_STATUSES, Room
from rooms.services.pricing_service import calculate_tiered_room_price


@dataclass
class ServiceResult:
    ok: bool
    booking: Booking | None = None
    detail: str = ""
    payload: dict | None = None


class BookingOperationsService:
    @classmethod
    def _room_is_ready(cls, room: Room) -> bool:
        return str(room.status).upper() in READY_ROOM_STATUSES

    @classmethod
    @transaction.atomic
    def create_walk_in(
        cls,
        *,
        branch_id,
        room_id,
        guest_name: str,
        phone: str,
        duration_hours: int,
        hotel_name: str = "",
        hotel_address: str = "",
        hourly_rate_fallback: int = 0,
        request=None,
        acting_user=None,
    ) -> ServiceResult:
        if acting_user is not None:
            allowed, detail = BranchAccessService.assert_branch_for_staff(acting_user, str(branch_id))
            if not allowed:
                return ServiceResult(ok=False, detail=detail)

        if duration_hours < 1:
            duration_hours = 1
        try:
            room = Room.objects.select_for_update().select_related("category", "branch").get(
                id=room_id, branch_id=branch_id
            )
        except Room.DoesNotExist:
            return ServiceResult(ok=False, detail="Room not found for this branch.")

        if not cls._room_is_ready(room):
            return ServiceResult(ok=False, detail="Only clean, available rooms can accept walk-ins.")

        now = timezone.now()
        expected_check_out = now + timezone.timedelta(hours=duration_hours)
        category = room.category
        pricing = calculate_tiered_room_price(category, now, expected_check_out) if category else {}
        room_total = int(pricing.get("room_total") or pricing.get("roomTotal") or 0)
        hourly_rate = int(pricing.get("price_per_hour") or pricing.get("pricePerHour") or hourly_rate_fallback or 0)

        booking = Booking.objects.create(
            branch_id=branch_id,
            room=room,
            room_category=category,
            guest_name=guest_name,
            phone=phone,
            status=Booking.Status.CHECKED_IN,
            walk_in=True,
            check_in_at=now,
            expected_check_out_at=expected_check_out,
            hotel_name=hotel_name or str(getattr(room.branch, "name", "") or ""),
            hotel_address=hotel_address,
            room_type=str(getattr(category, "name", "") or ""),
            original_room_number=str(room.room_number or ""),
            hourly_rate=hourly_rate,
            room_price=room_total,
            base_price=room_total,
            deposit_amount=0,
            deposit_percentage=20,
        )
        room.status = "OCCUPIED"
        room.save(update_fields=["status", "updated_at"])
        emit_room_status(booking.branch_id, room.id, room.status)
        emit_booking_live_bill(booking, request=request)
        return ServiceResult(ok=True, booking=booking)

    @classmethod
    @transaction.atomic
    def assign_room_and_check_in(cls, booking: Booking, room_id, *, request=None) -> ServiceResult:
        booking = Booking.objects.select_for_update().get(pk=booking.pk)
        if booking.status not in {Booking.Status.PENDING, Booking.Status.CONFIRMED}:
            return ServiceResult(ok=False, detail="Only pending or confirmed bookings can be assigned.")
        try:
            room = Room.objects.select_for_update().select_related("category").get(
                id=room_id, branch_id=booking.branch_id
            )
        except Room.DoesNotExist:
            return ServiceResult(ok=False, detail="Room not found for this branch.")

        if not cls._room_is_ready(room):
            return ServiceResult(ok=False, detail="Only clean, available rooms can be assigned.")

        if booking.room_category_id and room.category_id != booking.room_category_id:
            return ServiceResult(ok=False, detail="Selected room does not match the booked room type.")
        if not booking.room_category_id and booking.room_type:
            expected = str(booking.room_type).strip().lower()
            actual = str(getattr(room.category, "name", "") or "").strip().lower()
            if expected and actual and expected != actual:
                return ServiceResult(ok=False, detail="Selected room does not match the booked room type.")

        booking.room = room
        booking.room_category = room.category or booking.room_category
        booking.original_room_number = booking.original_room_number or str(room.room_number or "")
        booking.status = Booking.Status.CHECKED_IN
        booking.check_in_at = booking.check_in_at or timezone.now()
        booking.save(
            update_fields=["room", "room_category", "status", "check_in_at", "updated_at", "original_room_number"]
        )
        room.status = "OCCUPIED"
        room.save(update_fields=["status", "updated_at"])
        emit_room_status(booking.branch_id, room.id, room.status)
        emit_booking_live_bill(booking, request=request)
        return ServiceResult(ok=True, booking=booking)

    @classmethod
    @transaction.atomic
    def reassign_room(cls, booking: Booking, room_id, *, request=None) -> ServiceResult:
        """Change assigned room before check-in (PENDING/CONFIRMED with room already set)."""
        booking = Booking.objects.select_for_update().get(pk=booking.pk)
        if booking.status not in {Booking.Status.PENDING, Booking.Status.CONFIRMED}:
            return ServiceResult(ok=False, detail="Only pending or confirmed bookings can be reassigned.")
        if not booking.room_id:
            return ServiceResult(ok=False, detail="Assign a room first, or use Assign Room & Check-in.")
        try:
            new_room = Room.objects.select_for_update().select_related("category").get(
                id=room_id, branch_id=booking.branch_id
            )
        except Room.DoesNotExist:
            return ServiceResult(ok=False, detail="Room not found for this branch.")
        if not cls._room_is_ready(new_room):
            return ServiceResult(ok=False, detail="Only clean, available rooms can be assigned.")
        if booking.room_category_id and new_room.category_id != booking.room_category_id:
            return ServiceResult(ok=False, detail="Selected room does not match the booked room type.")

        old_room_id = booking.room_id
        old_room_number = booking.room.room_number if booking.room else ""
        booking.original_room_number = old_room_number or booking.original_room_number
        booking.room = new_room
        booking.room_category = new_room.category or booking.room_category
        booking.room_change_note = f"Reassigned from {old_room_number or 'N/A'} to {new_room.room_number}"
        booking.save(
            update_fields=["room", "room_category", "original_room_number", "room_change_note", "updated_at"]
        )
        if old_room_id and old_room_id != new_room.id:
            Room.objects.filter(id=old_room_id).update(status="AVAILABLE", updated_at=timezone.now())
            emit_room_status(booking.branch_id, old_room_id, "AVAILABLE")
        emit_booking_live_bill(booking, request=request)
        return ServiceResult(ok=True, booking=booking)

    @classmethod
    @transaction.atomic
    def confirm_check_in(cls, booking: Booking, *, request=None) -> ServiceResult:
        booking = Booking.objects.select_for_update().get(pk=booking.pk)
        if booking.status not in {Booking.Status.PENDING, Booking.Status.CONFIRMED}:
            return ServiceResult(ok=False, detail="Only pending or confirmed bookings can be checked in.")
        if not booking.room_id:
            return ServiceResult(ok=False, detail="Assign a room before check-in.")
        booking.status = Booking.Status.CHECKED_IN
        booking.check_in_at = booking.check_in_at or timezone.now()
        booking.save(update_fields=["status", "check_in_at", "updated_at"])
        Room.objects.filter(id=booking.room_id).update(status="OCCUPIED", updated_at=timezone.now())
        emit_room_status(booking.branch_id, booking.room_id, "OCCUPIED")
        emit_booking_live_bill(booking, request=request)
        return ServiceResult(ok=True, booking=booking)

    @classmethod
    @transaction.atomic
    def checkout(
        cls,
        booking: Booking,
        *,
        payment_method: str = "cash",
        amount_collected: int | None = None,
        request=None,
    ) -> ServiceResult:
        booking = Booking.objects.select_for_update().get(pk=booking.pk)
        if booking.status != Booking.Status.CHECKED_IN:
            return ServiceResult(ok=False, detail="Only checked-in bookings can be checked out.")
        bill = build_final_bill(booking)
        amount_due = int(bill.get("amount_due") or bill.get("amountDue") or 0)
        collected = amount_due if amount_collected is None else int(amount_collected)
        if collected < 0:
            return ServiceResult(ok=False, detail="amount_collected must be zero or positive.")

        booking.payment_method = payment_method
        booking.status = Booking.Status.CHECKED_OUT
        booking.check_out_at = timezone.now()
        booking.save(update_fields=["payment_method", "status", "check_out_at", "updated_at"])

        if booking.room_id:
            Room.objects.filter(id=booking.room_id).update(status="DIRTY", updated_at=timezone.now())
            emit_room_status(booking.branch_id, booking.room_id, "DIRTY")
            ensure_housekeeping_task_for_dirty_room(
                booking.room_id,
                branch_id=booking.branch_id,
                note="Post checkout — full clean",
            )
        emit_booking_live_bill(booking, request=request)
        from bookings.services.invoice_email_service import send_booking_invoice_email

        invoice_emailed = send_booking_invoice_email(booking)
        return ServiceResult(
            ok=True,
            booking=booking,
            payload={
                "final_bill": build_final_bill(booking),
                "amount_collected": collected,
                "amount_due": amount_due,
                "invoice_emailed": invoice_emailed,
            },
        )

    @classmethod
    @transaction.atomic
    def switch_room(
        cls,
        booking: Booking,
        new_room_id,
        *,
        note: str = "",
        actor=None,
        request=None,
    ) -> ServiceResult:
        booking = Booking.objects.select_for_update().get(pk=booking.pk)
        if booking.status != Booking.Status.CHECKED_IN:
            return ServiceResult(ok=False, detail="Only checked-in bookings can switch rooms.")
        try:
            new_room = Room.objects.select_for_update().select_related("category").get(
                id=new_room_id, branch_id=booking.branch_id
            )
        except Room.DoesNotExist:
            return ServiceResult(ok=False, detail="Room not found for this branch.")

        if not cls._room_is_ready(new_room):
            return ServiceResult(ok=False, detail="Only clean, available rooms can be assigned.")

        if booking.room_category_id and new_room.category_id != booking.room_category_id:
            return ServiceResult(ok=False, detail="Selected room does not match the booked room type.")

        old_room_id = booking.room_id
        old_room_number = booking.room.room_number if booking.room else ""
        booking.original_room_number = old_room_number
        booking.room = new_room
        change_note = str(note or "").strip()
        if not change_note:
            change_note = f"Switched from {old_room_number or 'N/A'} to {new_room.room_number}"
        booking.room_change_note = change_note
        booking.save(update_fields=["room", "original_room_number", "room_change_note", "updated_at"])

        if old_room_id:
            Room.objects.filter(id=old_room_id).update(status="DIRTY", updated_at=timezone.now())
            emit_room_status(booking.branch_id, old_room_id, "DIRTY")
            ensure_housekeeping_task_for_dirty_room(
                old_room_id,
                branch_id=booking.branch_id,
                note="Post checkout — full clean",
            )
        new_room.status = "OCCUPIED"
        new_room.save(update_fields=["status", "updated_at"])
        emit_room_status(booking.branch_id, new_room.id, new_room.status)

        emit_booking_live_bill(booking, request=request)
        return ServiceResult(ok=True, booking=booking)

    @classmethod
    @transaction.atomic
    def cancel_booking(
        cls,
        booking: Booking,
        *,
        actor=None,
        reason: str = "",
        request=None,
    ) -> ServiceResult:
        booking = Booking.objects.select_for_update().get(pk=booking.pk)
        if booking.status not in {Booking.Status.PENDING, Booking.Status.CONFIRMED}:
            return ServiceResult(
                ok=False,
                detail="Only pending or confirmed bookings can be cancelled.",
            )

        cancel_reason = str(reason or "").strip() or "cancelled"
        booking.status = Booking.Status.CANCELLED
        booking.save(update_fields=["status", "updated_at"])

        refund = request_deposit_refund(booking) if booking.payment_method else None

        if booking.room_id:
            Room.objects.filter(id=booking.room_id).update(status="AVAILABLE", updated_at=timezone.now())
            emit_room_status(booking.branch_id, booking.room_id, "AVAILABLE")

        BookingNotificationService.on_cancelled(booking, reason=cancel_reason)
        emit_booking_live_bill(booking, request=request)
        payload = {"refund": refund} if refund else None
        return ServiceResult(ok=True, booking=booking, payload=payload)
