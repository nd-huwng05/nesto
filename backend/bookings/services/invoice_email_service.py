"""Send checkout invoice summaries to guest email."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail

from bookings.models import Booking
from bookings.services.billing_service import build_final_bill

logger = logging.getLogger(__name__)


def build_invoice_email_body(booking: Booking) -> tuple[str, str]:
    bill = build_final_bill(booking)
    guest = str(booking.guest_name or booking.email or "Guest").strip()
    branch_name = str(getattr(booking.branch, "name", "") or booking.hotel_name or "Nesto Hotel")
    subject = f"Your invoice — {branch_name} ({booking.booking_code})"
    lines = [
        f"Dear {guest},",
        "",
        f"Thank you for staying at {branch_name}.",
        f"Booking code: {booking.booking_code}",
        f"Status: {booking.status}",
        "",
        "Bill summary (VND):",
        f"  Room total: {int(bill.get('room_total') or bill.get('roomTotal') or 0):,}",
        f"  Services: {int(bill.get('services_total') or bill.get('servicesTotal') or 0):,}",
        f"  Overtime: {int(bill.get('overtime_charge') or bill.get('overtimeCharge') or 0):,}",
        f"  Deposit paid: {int(bill.get('deposit_paid') or bill.get('depositPaid') or 0):,}",
        f"  Amount due at checkout: {int(bill.get('amount_due') or bill.get('amountDue') or 0):,}",
        f"  Total collected: {int(bill.get('gross_total') or bill.get('grossTotal') or bill.get('total_amount') or bill.get('totalAmount') or 0):,}",
        "",
        f"Payment method: {booking.payment_method or 'N/A'}",
        "",
        "This is an automated message from Nesto Smart Hotel.",
    ]
    if str(booking.special_requests or "").strip():
        lines.extend(["", "Special requests noted:", str(booking.special_requests).strip()])
    return subject, "\n".join(lines)


def send_booking_invoice_email(booking: Booking) -> bool:
    """Email final bill after checkout. Returns True when send succeeds or is skipped in dev."""
    recipient = str(booking.email or getattr(booking.customer, "email", "") or "").strip()
    if not recipient:
        return False

    subject, body = build_invoice_email_body(booking)
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or "noreply@nesto.local"

    try:
        sent = send_mail(
            subject,
            body,
            from_email,
            [recipient],
            fail_silently=False,
        )
        return bool(sent)
    except Exception as exc:
        logger.warning("Invoice email failed for %s: %s", booking.booking_code, exc)
        if settings.DEBUG:
            logger.info("[DEV] Invoice email to %s:\n%s\n%s", recipient, subject, body)
            print(f"[DEV INVOICE EMAIL] To: {recipient}\n{subject}\n---\n{body}")
            return True
        return False
