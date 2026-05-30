"""Create unified booking line items (bill + staff tasks)."""

from __future__ import annotations

from bookings.models import Booking, BookingLineItem
from service_orders.models import ExtraService
from service_orders.services.order_notification_service import OrderNotificationService


class LineItemBranchMismatchError(ValueError):
    """Raised when a line item branch does not match its booking branch."""


def ensure_line_item_branch(booking: Booking, *, branch_id=None) -> int:
    """Return the canonical branch id and validate optional branch_id matches booking."""
    canonical = int(booking.branch_id)
    if branch_id is not None and int(branch_id) != canonical:
        raise LineItemBranchMismatchError("Line item branch must match the booking branch.")
    return canonical


def _snapshot_guest_fields(booking: Booking) -> dict:
    room_number = ""
    if booking.room_id and getattr(booking, "room", None):
        room_number = str(getattr(booking.room, "room_number", "") or "")
    return {
        "room_number": room_number,
        "guest_name": str(booking.guest_name or ""),
        "guest_phone": str(booking.phone or ""),
    }


def create_line_item_from_catalog(
    booking: Booking,
    catalog_service: ExtraService,
    *,
    source: str = BookingLineItem.Source.CUSTOMER,
    initial_status: str = BookingLineItem.Status.PENDING,
    notify: bool = True,
) -> BookingLineItem:
    if catalog_service.branch_id != booking.branch_id:
        raise LineItemBranchMismatchError("Catalog service does not belong to this booking branch.")
    guest = _snapshot_guest_fields(booking)
    branch_id = ensure_line_item_branch(booking)
    line = BookingLineItem.objects.create(
        booking=booking,
        branch_id=branch_id,
        extra_service=catalog_service,
        service_key=str(catalog_service.id),
        summary=str(catalog_service.name or "")[:255],
        amount=int(catalog_service.price or 0),
        category=str(catalog_service.category or "ROOM_SERVICE"),
        status=initial_status,
        source=source,
        items=[{"name": catalog_service.name, "price": int(catalog_service.price or 0)}],
        **guest,
    )
    if notify:
        OrderNotificationService.notify_line_item_updated(line)
        OrderNotificationService.notify_branch_task(line, event_type="task_created")
    return line


def add_catalog_services_to_booking(
    booking: Booking,
    catalog_services: list[ExtraService],
    *,
    source: str = BookingLineItem.Source.CUSTOMER,
    initial_status: str = BookingLineItem.Status.PENDING,
) -> tuple[list[BookingLineItem], int]:
    existing_keys = set(
        BookingLineItem.objects.filter(booking=booking).values_list("service_key", flat=True)
    )
    lines: list[BookingLineItem] = []
    total = 0
    for svc in catalog_services:
        service_key = str(svc.id)
        if service_key in existing_keys:
            continue
        line = create_line_item_from_catalog(
            booking,
            svc,
            source=source,
            initial_status=initial_status,
            notify=True,
        )
        existing_keys.add(service_key)
        lines.append(line)
        total += int(line.amount or 0)
    return lines, total
