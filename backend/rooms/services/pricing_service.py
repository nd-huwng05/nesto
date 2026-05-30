import math
from datetime import datetime
from typing import Any

from django.utils import timezone

from rooms.models import RoomCategory


def _as_aware(dt: datetime) -> datetime:
    if dt is None:
        return None
    if timezone.is_naive(dt):
        return timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


def tier_rates_from_category(category: RoomCategory | None) -> dict[str, int]:
    if not category:
        return {"price_per_hour": 0, "price_per_half_day": 0, "price_per_day": 0}

    per_day = int(getattr(category, "price_per_day", 0) or 0)
    per_half = int(getattr(category, "price_per_half_day", 0) or 0)
    per_hour = int(getattr(category, "price_per_hour", 0) or 0)
    legacy = int(getattr(category, "base_price", 0) or 0)

    if per_day <= 0 and legacy > 0:
        per_day = legacy
    if per_half <= 0 and per_day > 0:
        per_half = max(per_hour * 12, int(per_day * 0.55)) if per_hour else int(per_day * 0.55)
    if per_hour <= 0 and per_day > 0:
        per_hour = max(1, int(per_day / 24))

    return {
        "price_per_hour": max(0, per_hour),
        "price_per_half_day": max(0, per_half),
        "price_per_day": max(0, per_day),
    }


def duration_hours_between(check_in_at: datetime, check_out_at: datetime) -> float:
    start = _as_aware(check_in_at)
    end = _as_aware(check_out_at)
    if not start or not end or end <= start:
        return 0.0
    return max(0.0, (end - start).total_seconds() / 3600.0)


def calculate_tiered_room_price(
    category: RoomCategory | None,
    check_in_at: datetime,
    check_out_at: datetime,
) -> dict[str, Any]:
    rates = tier_rates_from_category(category)
    per_hour = rates["price_per_hour"]
    per_half_day = rates["price_per_half_day"]
    per_day = rates["price_per_day"]

    duration_hours = duration_hours_between(check_in_at, check_out_at)
    if duration_hours <= 0:
        return {
            "room_total": 0,
            "duration_hours": 0.0,
            "duration_minutes": 0,
            "pricing_tier": "none",
            "price_per_hour": per_hour,
            "price_per_half_day": per_half_day,
            "price_per_day": per_day,
        }

    duration_minutes = max(0, int(round(duration_hours * 60)))

    if duration_hours < 12:
        room_total = int(math.ceil(duration_hours * per_hour))
        tier = "hourly"
    elif duration_hours <= 24:
        extra_hours = max(0.0, duration_hours - 12.0)
        room_total = int(per_half_day + math.ceil(extra_hours * per_hour))
        tier = "half_day"
    else:
        days = max(1, int(math.ceil(duration_hours / 24.0)))
        room_total = int(days * per_day)
        tier = "daily"

    return {
        "room_total": max(0, room_total),
        "duration_hours": round(duration_hours, 2),
        "duration_minutes": duration_minutes,
        "pricing_tier": tier,
        "price_per_hour": per_hour,
        "price_per_half_day": per_half_day,
        "price_per_day": per_day,
    }


class PricingService:
    """Tiered room pricing."""

    _as_aware = staticmethod(_as_aware)
    tier_rates_from_category = staticmethod(tier_rates_from_category)
    duration_hours_between = staticmethod(duration_hours_between)
    calculate_tiered_room_price = staticmethod(calculate_tiered_room_price)
