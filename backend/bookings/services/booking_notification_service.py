"""Booking lifecycle notifications — email + WebSocket."""

from __future__ import annotations

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction

from accounts.services.notification_service import create_user_notification

logger = logging.getLogger(__name__)


def _recipient_email(booking) -> str:
    email = str(getattr(booking, "email", "") or "").strip()
    if email:
        return email
    customer = getattr(booking, "customer", None)
    return str(getattr(customer, "email", "") or "").strip()


def _send_email(subject: str, message: str, recipient: str) -> None:
    if not recipient:
        return
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None) or "noreply@nesto.local"
    try:
        send_mail(subject, message, from_email, [recipient], fail_silently=True)
    except Exception as exc:
        logger.warning("Booking email failed to=%s: %s", recipient, exc)


def _emit_customer_event(booking) -> None:
    from bookings.services.realtime_service import emit_booking_live_bill

    transaction.on_commit(lambda: emit_booking_live_bill(booking))


class BookingNotificationService:
    @staticmethod
    def _push_in_app(booking, *, title: str, message: str, notification_type: str) -> None:
        customer = getattr(booking, "customer", None)
        if not customer:
            return
        transaction.on_commit(
            lambda: create_user_notification(
                user=customer,
                title=title,
                message=message,
                notification_type=notification_type,
                meta={"bookingId": str(booking.id), "bookingCode": booking.booking_code},
            )
        )

    @staticmethod
    def on_confirmed(booking) -> None:
        recipient = _recipient_email(booking)
        subject = f"Booking confirmed — {booking.booking_code}"
        message = (
            f"Hello {booking.guest_name or 'Guest'},\n\n"
            f"Your booking at {booking.hotel_name} is confirmed.\n"
            f"Booking code: {booking.booking_code}\n"
            f"Room type: {booking.room_type}\n"
            f"Check-in: {booking.check_in_at}\n"
            f"Deposit: {booking.deposit_amount:,} VND\n\n"
            f"Present your QR code at reception for check-in.\n"
        )
        push_message = f"Booking {booking.booking_code} at {booking.hotel_name} is confirmed."
        transaction.on_commit(lambda: _send_email(subject, message, recipient))
        BookingNotificationService._push_in_app(
            booking,
            title="Booking confirmed",
            message=push_message,
            notification_type="booking-confirmed",
        )
        _emit_customer_event(booking)

    @staticmethod
    def on_cancelled(booking, *, reason: str = "") -> None:
        recipient = _recipient_email(booking)
        subject = f"Booking cancelled — {booking.booking_code}"
        detail = f"\nReason: {reason}" if reason else ""
        message = (
            f"Hello {booking.guest_name or 'Guest'},\n\n"
            f"Your booking {booking.booking_code} at {booking.hotel_name} has been cancelled.{detail}\n"
        )
        push_message = f"Booking {booking.booking_code} has been cancelled."
        transaction.on_commit(lambda: _send_email(subject, message, recipient))
        BookingNotificationService._push_in_app(
            booking,
            title="Booking cancelled",
            message=push_message,
            notification_type="booking-cancelled",
        )
        _emit_customer_event(booking)
