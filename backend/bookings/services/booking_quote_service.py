"""Price quotes and availability checks before a customer booking is created."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from bookings.services.booking_capacity_service import assert_category_available, prepare_category_availability
from bookings.services.hold_service import calculate_deposit_amount, calculate_hold_minutes
from rooms.models import RoomCategory
from rooms.services.pricing_service import calculate_tiered_room_price


@dataclass(frozen=True)
class BookingQuoteResult:
    ok: bool
    payload: dict[str, Any] | None = None
    detail: str = ""
    http_status: int = 400
    available: bool | None = None


def normalize_deposit_percentage(raw_value) -> int:
    try:
        pct = int(raw_value or 20)
    except (TypeError, ValueError):
        pct = 20
    return pct if pct in {20, 50, 100} else 20


def parse_booking_window(check_in_raw, check_out_raw):
    check_in_at = parse_datetime(str(check_in_raw))
    expected_check_out_at = parse_datetime(str(check_out_raw))
    if not check_in_at or not expected_check_out_at:
        return None, None
    tz = timezone.get_current_timezone()
    if timezone.is_naive(check_in_at):
        check_in_at = timezone.make_aware(check_in_at, tz)
    if timezone.is_naive(expected_check_out_at):
        expected_check_out_at = timezone.make_aware(expected_check_out_at, tz)
    return check_in_at, expected_check_out_at


class BookingQuoteService:
    @staticmethod
    def build_customer_quote(
        *,
        room_type_id,
        branch_id,
        check_in_raw,
        check_out_raw,
        deposit_percentage_raw=20,
        customer_id=None,
    ) -> BookingQuoteResult:
        if not room_type_id or not branch_id or not check_in_raw or not check_out_raw:
            return BookingQuoteResult(
                ok=False,
                detail="room_type_id, branch, check_in_at, and expected_check_out_at are required.",
            )

        category = RoomCategory.objects.filter(id=room_type_id, branch_id=branch_id).first()
        if not category:
            return BookingQuoteResult(ok=False, detail="Room type not found for this branch.", http_status=400)

        check_in_at, expected_check_out_at = parse_booking_window(check_in_raw, check_out_raw)
        if not check_in_at or not expected_check_out_at:
            return BookingQuoteResult(ok=False, detail="Invalid datetime format.")

        if expected_check_out_at <= check_in_at:
            return BookingQuoteResult(ok=False, detail="Check-out must be after check-in.")

        deposit_pct = normalize_deposit_percentage(deposit_percentage_raw)

        prepare_category_availability(
            customer_id=customer_id,
            branch_id=branch_id,
            room_category_id=category.id,
            check_in_at=check_in_at,
            expected_check_out_at=expected_check_out_at,
        )

        try:
            assert_category_available(
                branch_id=branch_id,
                room_category_id=category.id,
                check_in_at=check_in_at,
                expected_check_out_at=expected_check_out_at,
            )
        except ValueError as exc:
            return BookingQuoteResult(
                ok=False,
                detail=str(exc),
                http_status=409,
                available=False,
            )

        pricing = calculate_tiered_room_price(category, check_in_at, expected_check_out_at)
        room_total = int(pricing.get("room_total") or 0)
        stay_minutes = int(pricing.get("duration_minutes") or 0)
        deposit_amount = calculate_deposit_amount(room_total, deposit_pct)
        hold_minutes = calculate_hold_minutes(stay_minutes, deposit_pct)

        return BookingQuoteResult(
            ok=True,
            payload={
                **pricing,
                "available": True,
                "room_total": room_total,
                "deposit_percentage": deposit_pct,
                "deposit_amount": deposit_amount,
                "hold_minutes": hold_minutes,
                "late_hold_deadline_at": (check_in_at + timezone.timedelta(minutes=hold_minutes)).isoformat(),
            },
            http_status=200,
            available=True,
        )
