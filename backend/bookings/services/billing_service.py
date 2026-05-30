import math

from django.utils import timezone

from bookings.models import Booking, BookingLineItem
from rooms.services.pricing_service import calculate_tiered_room_price, tier_rates_from_category


def _booking_category(booking: Booking):
    category = getattr(booking, "room_category", None)
    if category is None and booking.room_id and getattr(booking, "room", None):
        category = booking.room.category
    return category


def _resolve_hourly_rate(booking: Booking) -> int:
    hourly = int(booking.hourly_rate or 0)
    if hourly > 0:
        return hourly
    rates = tier_rates_from_category(_booking_category(booking))
    return int(rates.get("price_per_hour") or 0)


def _resolve_room_total(booking: Booking) -> tuple[int, str, float]:
    stored_room = int(getattr(booking, "room_price", 0) or 0)
    category = _booking_category(booking)
    check_in = booking.check_in_at
    check_out = booking.expected_check_out_at or booking.check_out_at
    if category and check_in and check_out:
        quote = calculate_tiered_room_price(category, check_in, check_out)
        computed = int(quote.get("room_total") or quote.get("roomTotal") or 0)
        pricing_tier = str(quote.get("pricing_tier") or quote.get("pricingTier") or "")
        duration_hours = float(quote.get("duration_hours") or quote.get("durationHours") or 0)
        if stored_room <= 0:
            return computed, pricing_tier, duration_hours
        return stored_room, pricing_tier, duration_hours
    if stored_room > 0:
        return stored_room, "", 0.0
    services_total = _services_total(booking)
    return max(0, int(booking.base_price or 0) - services_total), "", 0.0


def _services_total(booking: Booking) -> int:
    rows = getattr(booking, "line_items", None)
    if rows is not None and hasattr(rows, "all"):
        return sum(int(row.amount or 0) for row in rows.all() if row.status != BookingLineItem.Status.CANCELLED)
    return sum(
        int(row.amount or 0)
        for row in BookingLineItem.objects.filter(booking=booking).exclude(status=BookingLineItem.Status.CANCELLED)
    )


def calculate_overtime_charge(booking: Booking, now=None):
    if booking.status != Booking.Status.CHECKED_IN:
        return {
            "overtime_charge": 0,
            "late_minutes": 0,
            "is_overtime": False,
            "penalty_blocks": 0,
        }

    checkout_deadline = booking.expected_check_out_at
    if not checkout_deadline:
        return {
            "overtime_charge": 0,
            "late_minutes": 0,
            "is_overtime": False,
            "penalty_blocks": 0,
        }

    current = now or timezone.now()
    if timezone.is_naive(checkout_deadline):
        checkout_deadline = timezone.make_aware(checkout_deadline, timezone.get_current_timezone())
    if timezone.is_naive(current):
        current = timezone.make_aware(current, timezone.get_current_timezone())

    if current <= checkout_deadline:
        return {
            "overtime_charge": 0,
            "late_minutes": 0,
            "is_overtime": False,
            "penalty_blocks": 0,
        }

    late_seconds = (current - checkout_deadline).total_seconds()
    late_minutes = max(0, int(late_seconds // 60))
    if late_minutes <= 0:
        return {
            "overtime_charge": 0,
            "late_minutes": 0,
            "is_overtime": False,
            "penalty_blocks": 0,
        }

    hourly_rate = _resolve_hourly_rate(booking)
    overtime_hours = max(1, math.ceil(late_minutes / 60))
    overtime_charge = overtime_hours * max(0, hourly_rate)

    return {
        "overtime_charge": overtime_charge,
        "late_minutes": late_minutes,
        "is_overtime": True,
        "overtime_hours": overtime_hours,
        "penalty_blocks": overtime_hours,
    }


def calculate_stay_metrics(booking: Booking):
    check_in = booking.check_in_at
    check_out = booking.expected_check_out_at or booking.check_out_at
    if not check_in or not check_out:
        return {"stay_nights": 1, "stay_minutes": 0, "stay_label": "1 night"}

    if timezone.is_naive(check_in):
        check_in = timezone.make_aware(check_in, timezone.get_current_timezone())
    if timezone.is_naive(check_out):
        check_out = timezone.make_aware(check_out, timezone.get_current_timezone())

    delta = check_out - check_in
    total_minutes = max(0, int(delta.total_seconds() // 60))
    nights = max(1, delta.days or int(total_minutes // 1440) or 1)

    if nights >= 1 and total_minutes >= 1440:
        label = f"{nights} night{'s' if nights != 1 else ''}"
    else:
        label = f"{total_minutes} minute{'s' if total_minutes != 1 else ''}"

    return {
        "stay_nights": nights,
        "stay_minutes": total_minutes,
        "stay_label": label,
    }


def build_booking_bill(booking: Booking, now=None):
    services_total = _services_total(booking)
    room_total, pricing_tier, duration_hours = _resolve_room_total(booking)
    overtime = calculate_overtime_charge(booking, now=now)
    overtime_charge = int(overtime.get("overtime_charge") or 0)
    stay = calculate_stay_metrics(booking)
    subtotal = room_total + services_total
    total_amount = subtotal + overtime_charge
    hourly_rate = _resolve_hourly_rate(booking)
    rates = tier_rates_from_category(_booking_category(booking))
    nightly_rate = int(rates.get("price_per_day") or 0) or (hourly_rate * 24 if hourly_rate else 0)

    return {
        "room_total": room_total,
        "services_total": services_total,
        "subtotal": subtotal,
        "overtime_charge": overtime_charge,
        "late_minutes": int(overtime.get("late_minutes") or 0),
        "is_overtime": bool(overtime.get("is_overtime")),
        "penalty_blocks": int(overtime.get("penalty_blocks") or 0),
        "total_amount": total_amount,
        "stay_nights": stay["stay_nights"],
        "stay_minutes": stay["stay_minutes"],
        "stay_label": stay["stay_label"],
        "pricing_tier": pricing_tier,
        "duration_hours": duration_hours or stay["stay_minutes"] / 60.0 if stay["stay_minutes"] else 0,
        "nightly_rate": nightly_rate,
        "hourly_rate": hourly_rate,
        "deposit_percentage": int(getattr(booking, "deposit_percentage", 0) or 0),
        "deposit_amount": int(getattr(booking, "deposit_amount", 0) or 0),
        "hold_minutes": int(getattr(booking, "hold_minutes", 0) or 0),
    }


def build_live_bill_payload(booking: Booking, now=None):
    bill = build_booking_bill(booking, now=now)
    final = build_final_bill(booking, now=now)
    return {
        **bill,
        "live_bill": bill,
        "final_bill": final,
        "gross_total": final.get("gross_total"),
        "deposit_paid": final.get("deposit_paid"),
        "amount_due": final.get("amount_due"),
    }


def build_final_bill(booking: Booking, now=None):
    bill = build_booking_bill(booking, now=now)
    room_total = int(bill.get("room_total") or 0)
    services_total = int(bill.get("services_total") or 0)
    overtime_charge = int(bill.get("overtime_charge") or 0)
    gross_total = room_total + services_total + overtime_charge
    deposit_paid = int(getattr(booking, "deposit_amount", 0) or 0)
    amount_due = max(0, gross_total - deposit_paid)

    return {
        **bill,
        "room_total": room_total,
        "services_total": services_total,
        "overtime_charge": overtime_charge,
        "gross_total": gross_total,
        "deposit_paid": deposit_paid,
        "deposit_percentage": int(getattr(booking, "deposit_percentage", 0) or 0),
        "amount_due": amount_due,
        "final_payment": amount_due,
    }


class BillingService:
    """Booking bill calculation."""

    _booking_category = staticmethod(_booking_category)
    _resolve_hourly_rate = staticmethod(_resolve_hourly_rate)
    _resolve_room_total = staticmethod(_resolve_room_total)
    _services_total = staticmethod(_services_total)
    calculate_overtime_charge = staticmethod(calculate_overtime_charge)
    calculate_stay_metrics = staticmethod(calculate_stay_metrics)
    build_booking_bill = staticmethod(build_booking_bill)
    build_live_bill_payload = staticmethod(build_live_bill_payload)
    build_final_bill = staticmethod(build_final_bill)
