from core.services.json_utils import json_safe
from core.services.realtime_service import broadcast_many

from bookings.models import Booking
from bookings.serializers import BookingBillSerializer, BookingLineItemSerializer


def reload_booking_for_bill(booking: Booking) -> Booking:
    return (
        Booking.objects.select_related("branch", "room", "room__category", "room_category")
        .prefetch_related("line_items")
        .get(pk=booking.pk)
    )


def build_booking_ws_message(booking: Booking, request=None) -> dict:
    booking = reload_booking_for_bill(booking)
    bill_data = json_safe(BookingBillSerializer(booking, context={"request": request}).data)
    extra_rows = json_safe(BookingLineItemSerializer(booking.line_items.all(), many=True).data)
    message = dict(bill_data)
    message["type"] = "update_booking"
    message["booking_id"] = str(booking.id)
    message["live_bill"] = bill_data.get("final_bill") or {}
    message["extra_services"] = extra_rows
    message["line_items"] = extra_rows
    return message


def build_update_bill_message(booking: Booking, request=None) -> dict:
    message = build_booking_ws_message(booking, request=request)
    message["type"] = "update_bill"
    return message


def _group_send(group: str, handler_type: str, message: dict) -> None:
    from core.services.realtime_service import broadcast_group

    broadcast_group(group, handler_type, message)


def emit_booking_live_bill(booking: Booking, request=None) -> None:
    """Push live bill to booking-scoped WebSocket group and legacy fan-out groups."""
    bill_message = build_update_bill_message(booking, request=request)
    legacy_message = build_booking_ws_message(booking, request=request)

    _group_send(f"booking_{booking.id}", "update_bill", bill_message)

    if booking.customer_id:
        _group_send(
            f"user_{booking.customer_id}_bookings",
            "group_message",
            legacy_message,
        )

    branch_key = str(booking.branch_id)
    branch_groups = [
        f"bookings_branch_{branch_key}_role_RECEPTIONIST",
        f"bookings_branch_{branch_key}_role_BUSINESS_OWNER",
        f"bookings_branch_{branch_key}_role_SUPER_ADMIN",
        f"bookings_branch_{branch_key}_role_STAFF",
        f"bookings_branch_{branch_key}_role_CUSTOMER",
    ]
    for group in branch_groups:
        _group_send(group, "group_message", legacy_message)


def emit_branch_availability_changed(branch_id, room_category_id=None) -> None:
    """Notify clients to refresh date-based room availability for a branch."""
    branch_key = str(branch_id)
    category_key = str(room_category_id) if room_category_id else None
    message = json_safe(
        {
            "type": "availability_changed",
            "branch_id": branch_key,
            "room_category_id": category_key,
        }
    )
    groups = [
        "customer_global_role_CUSTOMER",
        f"bookings_branch_{branch_key}_role_CUSTOMER",
        f"rooms_branch_{branch_key}_role_CUSTOMER",
        f"bookings_branch_{branch_key}_role_RECEPTIONIST",
        f"bookings_branch_{branch_key}_role_BUSINESS_OWNER",
        f"bookings_branch_{branch_key}_role_SUPER_ADMIN",
        f"rooms_branch_{branch_key}_role_RECEPTIONIST",
        f"rooms_branch_{branch_key}_role_BUSINESS_OWNER",
    ]
    if category_key:
        groups.append(f"availability_branch_{branch_key}_category_{category_key}")
    broadcast_many(groups, "group_message", message)


def emit_room_status(branch_id, room_id, room_status: str, *, room_number: str | None = None) -> None:
    rid = str(room_id)
    number = str(room_number or "").strip()
    if not number:
        from rooms.models import Room

        number = str(Room.objects.filter(pk=room_id).values_list("room_number", flat=True).first() or "")
    message = {
        "type": "room_status",
        "room_id": rid,
        "room_number": number,
        "status": str(room_status),
        "branch_id": str(branch_id),
    }
    groups = [
        f"rooms_branch_{branch_id}_role_HOUSEKEEPING",
        f"rooms_branch_{branch_id}_role_RECEPTIONIST",
        f"rooms_branch_{branch_id}_role_BUSINESS_OWNER",
        f"rooms_branch_{branch_id}_role_SUPER_ADMIN",
    ]
    broadcast_many(groups, "group_message", message)


class BookingRealtimeService:
    """Booking WebSocket broadcasts."""

    reload_booking_for_bill = staticmethod(reload_booking_for_bill)
    build_booking_ws_message = staticmethod(build_booking_ws_message)
    build_update_bill_message = staticmethod(build_update_bill_message)
    _group_send = staticmethod(_group_send)
    emit_booking_live_bill = staticmethod(emit_booking_live_bill)
    emit_branch_availability_changed = staticmethod(emit_branch_availability_changed)
    emit_room_status = staticmethod(emit_room_status)
