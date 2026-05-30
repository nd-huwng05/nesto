"""Register and query branch guest CRM records."""

from __future__ import annotations

from django.db.models import F
from django.utils import timezone


def register_branch_customer(booking) -> None:
    """Upsert branch customer profile when a booking is confirmed."""
    from businesses.models import BranchCustomer

    if not booking or not booking.branch_id or not booking.customer_id:
        return

    now = timezone.now()
    spent = int(booking.base_price or booking.room_price or 0)
    defaults = {
        "guest_name": str(booking.guest_name or "").strip(),
        "email": str(booking.email or "").strip(),
        "phone": str(booking.phone or "").strip(),
        "last_booking_at": now,
    }
    profile, created = BranchCustomer.objects.get_or_create(
        branch_id=booking.branch_id,
        user_id=booking.customer_id,
        defaults={**defaults, "booking_count": 1, "total_spent": spent},
    )
    if created:
        return

    BranchCustomer.objects.filter(pk=profile.pk).update(
        guest_name=defaults["guest_name"] or F("guest_name"),
        email=defaults["email"] or F("email"),
        phone=defaults["phone"] or F("phone"),
        booking_count=F("booking_count") + 1,
        total_spent=F("total_spent") + spent,
        last_booking_at=now,
        updated_at=now,
    )
