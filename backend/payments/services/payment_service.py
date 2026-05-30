from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

logger = logging.getLogger(__name__)


def is_payment_sandbox(provider: str = "momo") -> bool:
    if getattr(settings, "PAYMENTS_SANDBOX", False):
        return True
    provider_key = str(provider or "momo").lower()
    if provider_key == "zalopay":
        return not bool(str(getattr(settings, "ZALOPAY_KEY1", "") or "").strip())
    return not (
        str(getattr(settings, "MOMO_ACCESS_KEY", "") or "").strip()
        and str(getattr(settings, "MOMO_SECRET_KEY", "") or "").strip()
    )


def build_sandbox_payment_init(*, amount: int, order_id: str, provider: str) -> dict:
    return {
        "sandbox": True,
        "payUrl": None,
        "provider": provider,
        "orderId": order_id,
        "amount": int(amount),
    }


def normalize_payment_method(value: str) -> str:
    key = str(value or "").strip().lower()
    if key in {"zalo", "zalopay", "zp"}:
        return "zalopay"
    if key in {"momo", "wallet"}:
        return "momo"
    if key in {"sandbox", "test", "dev"}:
        return "sandbox"
    return key or "momo"


PAYMENT_ORDER_SEP = "-pay-"


def build_payment_order_id(booking_id) -> str:
    """Unique MoMo/ZaloPay order id per attempt (MoMo rejects duplicate orderId)."""
    booking_key = str(booking_id or "").strip()
    stamp = int(timezone.now().timestamp() * 1000)
    return f"{booking_key}{PAYMENT_ORDER_SEP}{stamp}"


def resolve_booking_id_from_payment_order(order_id: str) -> str:
    key = str(order_id or "").strip()
    if not key:
        return ""
    if PAYMENT_ORDER_SEP in key:
        return key.split(PAYMENT_ORDER_SEP, 1)[0].strip()
    return key


def resolve_booking_from_payment_order(order_id: str):
    from bookings.models import Booking

    key = str(order_id or "").strip()
    if not key:
        return None

    booking_key = resolve_booking_id_from_payment_order(key)
    booking = Booking.objects.filter(id=booking_key).first()
    if booking:
        return booking
    if booking_key != key:
        booking = Booking.objects.filter(id=key).first()
        if booking:
            return booking

    code_key = booking_key or key
    return Booking.objects.filter(booking_code=code_key).first()


def create_payment_intent(
    *,
    booking,
    customer,
    provider: str,
    order_id: str,
    amount: int,
    pay_url: str = "",
    request_id: str = "",
    raw_response: dict | None = None,
    checkout_session_id: str = "",
    checkout_payload: dict | None = None,
):
    from payments.models import PaymentTransaction

    provider_key = normalize_payment_method(provider)
    stored_response = dict(raw_response or {})
    if checkout_payload:
        stored_response["checkout"] = checkout_payload

    defaults = {
        "booking": booking,
        "customer": customer,
        "amount": int(amount),
        "status": PaymentTransaction.Status.PENDING,
        "pay_url": str(pay_url or ""),
        "request_id": str(request_id or ""),
        "raw_response": stored_response,
        "checkout_session_id": str(checkout_session_id or "").strip(),
    }
    txn, _ = PaymentTransaction.objects.update_or_create(
        order_id=str(order_id),
        provider=provider_key,
        defaults=defaults,
    )
    return txn


def build_checkout_payload(*, validated_data: dict, user) -> dict:
    booking_data = dict(validated_data.get("booking_data") or {})
    selected_services = validated_data.get("selected_services") or []
    service_ids = booking_data.get("service_ids") or booking_data.get("serviceIds") or []
    if not service_ids and selected_services:
        service_ids = [
            str(item.get("id") or item.get("service_id") or item.get("serviceId") or "").strip()
            for item in selected_services
            if str(item.get("id") or item.get("service_id") or item.get("serviceId") or "").strip()
        ]

    return {
        "branch_id": str(
            booking_data.get("branch_id") or booking_data.get("branchId") or booking_data.get("branch") or ""
        ).strip(),
        "room_type_id": str(booking_data.get("room_type_id") or booking_data.get("roomTypeId") or "").strip() or None,
        "room_type": str(booking_data.get("room_type") or booking_data.get("roomType") or "").strip(),
        "hotel_name": str(booking_data.get("hotel_name") or booking_data.get("hotelName") or "").strip(),
        "hotel_address": str(booking_data.get("hotel_address") or booking_data.get("hotelAddress") or "").strip(),
        "guest_name": str(booking_data.get("guest_name") or booking_data.get("guestName") or getattr(user, "name", "") or "").strip(),
        "email": str(booking_data.get("email") or getattr(user, "email", "") or "").strip(),
        "phone": str(booking_data.get("phone") or getattr(user, "phone", "") or "").strip(),
        "check_in_at": booking_data.get("check_in_at") or booking_data.get("checkInAt"),
        "expected_check_out_at": booking_data.get("expected_check_out_at") or booking_data.get("expectedCheckOutAt"),
        "service_ids": [str(sid).strip() for sid in service_ids if str(sid).strip()],
        "special_requests": str(
            booking_data.get("special_requests") or booking_data.get("specialRequests") or ""
        ).strip(),
        "deposit_percentage": validated_data.get("deposit_percentage"),
        "total_amount": int(booking_data.get("total_amount") or booking_data.get("totalAmount") or 0),
        "room_total": int(booking_data.get("room_total") or booking_data.get("roomTotal") or 0),
        "services_total": int(booking_data.get("services_total") or booking_data.get("servicesTotal") or 0),
    }


def get_checkout_payment_status(checkout_session_id: str, user) -> dict | None:
    from bookings.models import Booking
    from payments.models import PaymentTransaction

    session_key = str(checkout_session_id or "").strip()
    if not session_key:
        return None

    txn = (
        PaymentTransaction.objects.filter(checkout_session_id=session_key, customer=user)
        .select_related("booking")
        .order_by("-created_at")
        .first()
    )
    if not txn:
        return None

    booking = txn.booking
    if booking:
        return get_latest_payment_status(booking, reconcile=False)

    return {
        "checkout_session_id": session_key,
        "booking_id": None,
        "booking_code": "",
        "booking_status": "",
        "deposit_paid": txn.status == PaymentTransaction.Status.SUCCESS,
        "payment_method": "",
        "deposit_amount": int(txn.amount or 0),
        "transaction": {
            "id": str(txn.id),
            "provider": txn.provider,
            "order_id": txn.order_id,
            "amount": txn.amount,
            "status": txn.status,
            "provider_trans_id": txn.provider_trans_id,
            "verified_at": txn.verified_at.isoformat() if txn.verified_at else None,
        },
    }


def complete_checkout_payment(
    *,
    checkout_session_id: str,
    customer,
    amount: int,
    payment_method: str,
    request=None,
) -> dict:
    """Sandbox / client-side completion: create booking only after payment succeeds."""
    from bookings.models import Booking
    from bookings.services.customer_booking_service import CustomerBookingService
    from payments.models import PaymentTransaction

    session_key = str(checkout_session_id or "").strip()
    if not session_key:
        raise ValueError("checkout_session_id is required.")

    with transaction.atomic():
        txn = (
            PaymentTransaction.objects.select_for_update()
            .filter(checkout_session_id=session_key, customer=customer, booking__isnull=True)
            .order_by("-created_at")
            .first()
        )
        if not txn:
            paid_txn = (
                PaymentTransaction.objects.filter(
                    checkout_session_id=session_key,
                    customer=customer,
                    booking__isnull=False,
                    status=PaymentTransaction.Status.SUCCESS,
                )
                .select_related("booking")
                .order_by("-created_at")
                .first()
            )
            if paid_txn and paid_txn.booking:
                return get_latest_payment_status(paid_txn.booking, reconcile=False)
            raise ValueError("Checkout session not found.")

        if txn.status == PaymentTransaction.Status.SUCCESS and txn.booking_id:
            return get_latest_payment_status(txn.booking, reconcile=False)

        checkout_payload = (txn.raw_response or {}).get("checkout") or {}
        provider_key = normalize_payment_method(payment_method)
        paid_amount = int(amount or txn.amount or 0)

        if is_payment_sandbox(provider_key):
            txn.status = PaymentTransaction.Status.SUCCESS
            txn.provider_trans_id = f"SANDBOX-{txn.id.hex[:12].upper()}"
            txn.verified_at = timezone.now()
            txn.amount = paid_amount
            txn.save(
                update_fields=["status", "provider_trans_id", "verified_at", "amount", "updated_at"]
            )
        elif txn.status != PaymentTransaction.Status.SUCCESS:
            raise ValueError("Payment has not been verified by the gateway.")

        result = CustomerBookingService.create_confirmed_from_checkout(
            user=customer,
            checkout_payload=checkout_payload,
            payment_method=provider_key,
            deposit_amount=paid_amount,
            request=request,
        )
        if not result.ok or not result.booking:
            raise ValueError(result.detail or "Unable to create booking after payment.")

        booking = result.booking
        txn.booking = booking
        txn.save(update_fields=["booking", "updated_at"])

    return get_latest_payment_status(booking, reconcile=False)


def get_latest_payment_status(booking, *, reconcile: bool = False) -> dict:
    from bookings.models import Booking
    from payments.models import PaymentTransaction

    if reconcile:
        reconcile_pending_payment(booking)

    latest = (
        PaymentTransaction.objects.filter(booking=booking)
        .order_by("-created_at")
        .first()
    )
    return {
        "booking_id": str(booking.id),
        "booking_code": booking.booking_code,
        "booking_status": booking.status,
        "deposit_paid": booking.status
        in {Booking.Status.CONFIRMED, Booking.Status.CHECKED_IN, Booking.Status.CHECKED_OUT},
        "payment_method": booking.payment_method,
        "deposit_amount": int(booking.deposit_amount or 0),
        "transaction": None
        if not latest
        else {
            "id": str(latest.id),
            "provider": latest.provider,
            "order_id": latest.order_id,
            "amount": latest.amount,
            "status": latest.status,
            "provider_trans_id": latest.provider_trans_id,
            "verified_at": latest.verified_at.isoformat() if latest.verified_at else None,
        },
    }


def complete_payment_transaction(
    *,
    order_id: str,
    provider: str,
    amount: int,
    provider_trans_id: str = "",
    raw_payload: dict | None = None,
    verified: bool = True,
) -> tuple[Any, bool]:
    """Mark transaction success and confirm booking deposit. Returns (booking, created)."""
    from bookings.models import Booking
    from payments.models import PaymentTransaction

    with transaction.atomic():
        provider_key = normalize_payment_method(provider)
        txn = (
            PaymentTransaction.objects.select_for_update()
            .filter(order_id=str(order_id), provider=provider_key)
            .select_related("booking")
            .order_by("-created_at")
            .first()
        )
        booking = txn.booking if txn else resolve_booking_from_payment_order(order_id)
        if not booking and txn:
            checkout_payload = (txn.raw_response or {}).get("checkout") or {}
            if checkout_payload and txn.customer_id:
                from bookings.services.customer_booking_service import CustomerBookingService

                result = CustomerBookingService.create_confirmed_from_checkout(
                    user=txn.customer,
                    checkout_payload=checkout_payload,
                    payment_method=provider_key,
                    deposit_amount=int(amount or txn.amount or 0),
                )
                if not result.ok or not result.booking:
                    raise ValueError(result.detail or "Unable to create booking after payment.")
                booking = result.booking
                txn.booking = booking
                txn.save(update_fields=["booking", "updated_at"])

        if not booking:
            raise ValueError("Booking not found for payment confirmation.")

        booking = Booking.objects.select_for_update().get(pk=booking.pk)

        if not txn:
            txn = create_payment_intent(
                booking=booking,
                customer=booking.customer,
                provider=provider_key,
                order_id=str(order_id),
                amount=int(amount or booking.deposit_amount or 0),
                raw_response=raw_payload or {},
            )
            txn = PaymentTransaction.objects.select_for_update().get(pk=txn.pk)

        if txn.status == PaymentTransaction.Status.SUCCESS:
            return booking, False

        txn.status = PaymentTransaction.Status.SUCCESS
        txn.provider_trans_id = str(provider_trans_id or txn.provider_trans_id or "")
        txn.amount = int(amount or txn.amount or booking.deposit_amount or 0)
        if raw_payload:
            txn.raw_response = raw_payload
        if verified:
            txn.verified_at = timezone.now()
        txn.save(
            update_fields=[
                "status",
                "provider_trans_id",
                "amount",
                "raw_response",
                "verified_at",
                "updated_at",
            ]
        )

        confirm_booking_deposit(
            booking,
            amount=txn.amount,
            payment_method=provider_key,
            transaction_ref=txn.provider_trans_id,
            require_verified=verified,
            _locked=True,
        )
    return booking, True


def confirm_booking_deposit(
    booking,
    *,
    amount: int,
    payment_method: str,
    transaction_ref: str = "",
    require_verified: bool = False,
    _locked: bool = False,
) -> None:
    from bookings.models import Booking
    from bookings.services.booking_notification_service import BookingNotificationService

    if not _locked:
        booking = Booking.objects.select_for_update().get(pk=booking.pk)

    if booking.status in {
        Booking.Status.CANCELLED,
        Booking.Status.CANCELLED_NO_SHOW,
        Booking.Status.CHECKED_OUT,
    }:
        raise ValueError("This booking can no longer accept payment.")

    method = normalize_payment_method(payment_method)
    if require_verified or (not is_payment_sandbox(method) and method != "sandbox"):
        from payments.models import PaymentTransaction

        if not transaction_ref:
            raise ValueError("Verified payment reference is required.")
        txn = (
            PaymentTransaction.objects.filter(
                booking=booking,
                provider=method,
                status=PaymentTransaction.Status.SUCCESS,
            )
            .filter(provider_trans_id=transaction_ref)
            .first()
        )
        if not txn and transaction_ref:
            txn = (
                PaymentTransaction.objects.filter(
                    booking=booking,
                    provider=method,
                    status=PaymentTransaction.Status.SUCCESS,
                )
                .order_by("-created_at")
                .first()
            )
        if not txn or txn.status != PaymentTransaction.Status.SUCCESS:
            raise ValueError("Payment has not been verified by the gateway.")

    expected = int(booking.deposit_amount or 0)
    paid = int(amount or 0)
    if expected > 0 and paid > 0 and abs(paid - expected) > max(1000, int(expected * 0.05)):
        raise ValueError("Paid amount does not match the required deposit.")

    was_pending = booking.status == Booking.Status.PENDING
    if was_pending and booking.room_category_id and booking.check_in_at and booking.expected_check_out_at:
        from bookings.services.booking_capacity_service import assert_category_available

        assert_category_available(
            branch_id=booking.branch_id,
            room_category_id=booking.room_category_id,
            check_in_at=booking.check_in_at,
            expected_check_out_at=booking.expected_check_out_at,
            exclude_booking_id=booking.id,
        )

    booking.payment_method = method
    update_fields = ["payment_method", "status", "updated_at"]
    if was_pending:
        booking.status = Booking.Status.CONFIRMED
        checkout = booking.expected_check_out_at or booking.check_out_at
        if checkout and booking.check_in_at:
            booking.late_hold_deadline_at = checkout
            update_fields.append("late_hold_deadline_at")
        else:
            from bookings.services.hold_service import apply_late_hold_deadline

            apply_late_hold_deadline(booking, deposit_percentage=booking.deposit_percentage)
            update_fields.extend(["hold_minutes", "late_hold_deadline_at", "deposit_percentage"])
    booking.save(update_fields=update_fields)

    if was_pending:
        from bookings.services.realtime_service import (
            emit_booking_live_bill,
            emit_branch_availability_changed,
        )
        from businesses.services.branch_customer_service import register_branch_customer

        register_branch_customer(booking)
        BookingNotificationService.on_confirmed(booking)
        emit_booking_live_bill(booking)
        if booking.branch_id:
            emit_branch_availability_changed(
                booking.branch_id,
                booking.room_category_id,
            )

    if transaction_ref:
        logger.info(
            "Deposit confirmed booking=%s method=%s amount=%s ref=%s",
            booking.id,
            method,
            paid or expected,
            transaction_ref,
        )


def can_use_instant_customer_payment(payment_method: str = "momo") -> bool:
    if getattr(settings, "PAYMENTS_SANDBOX", False):
        return True
    if getattr(settings, "PAYMENTS_INSTANT", False):
        return True
    if getattr(settings, "DEBUG", False):
        return True
    return is_payment_sandbox(payment_method)


def confirm_instant_deposit(booking, *, amount: int, payment_method: str = "momo") -> None:
    """Demo/dev: confirm deposit immediately (MoMo/ZaloPay UI without opening real gateway)."""
    from bookings.models import Booking
    from bookings.services.hold_service import enforce_payment_hold_expiry
    from payments.models import PaymentTransaction

    if not can_use_instant_customer_payment(payment_method):
        raise ValueError("Instant wallet payment is not enabled.")

    method = normalize_payment_method(payment_method)
    provider_key = method if method in {"momo", "zalopay", "sandbox"} else "momo"

    with transaction.atomic():
        booking = Booking.objects.select_for_update().get(pk=booking.pk)
        enforce_payment_hold_expiry(booking)
        if booking.status == Booking.Status.CANCELLED:
            raise ValueError("Payment window expired. Please book again.")

        paid_amount = int(amount or booking.deposit_amount or 0)
        txn = create_payment_intent(
            booking=booking,
            customer=booking.customer,
            provider=provider_key,
            order_id=build_payment_order_id(booking.id),
            amount=paid_amount,
            request_id="instant",
            raw_response={"instant": True, "method": method},
        )
        txn = PaymentTransaction.objects.select_for_update().get(pk=txn.pk)
        txn.status = PaymentTransaction.Status.SUCCESS
        txn.provider_trans_id = f"INSTANT-{provider_key.upper()}-{txn.id.hex[:10]}"
        txn.verified_at = timezone.now()
        txn.save(update_fields=["status", "provider_trans_id", "verified_at", "updated_at"])

        confirm_booking_deposit(
            booking,
            amount=txn.amount,
            payment_method=method,
            transaction_ref=txn.provider_trans_id,
            require_verified=False,
            _locked=True,
        )


def confirm_sandbox_deposit(booking, *, amount: int, payment_method: str = "sandbox") -> None:
    from bookings.models import Booking
    from payments.models import PaymentTransaction

    if not is_payment_sandbox(payment_method):
        raise ValueError("Sandbox confirmation is disabled.")

    with transaction.atomic():
        booking = Booking.objects.select_for_update().get(pk=booking.pk)
        txn = create_payment_intent(
            booking=booking,
            customer=booking.customer,
            provider="sandbox",
            order_id=str(booking.id),
            amount=int(amount or booking.deposit_amount or 0),
        )
        txn = PaymentTransaction.objects.select_for_update().get(pk=txn.pk)
        txn.status = PaymentTransaction.Status.SUCCESS
        txn.provider_trans_id = f"SANDBOX-{txn.id.hex[:12].upper()}"
        txn.verified_at = timezone.now()
        txn.save(update_fields=["status", "provider_trans_id", "verified_at", "updated_at"])

        confirm_booking_deposit(
            booking,
            amount=txn.amount,
            payment_method="sandbox",
            transaction_ref=txn.provider_trans_id,
            require_verified=False,
            _locked=True,
        )


def _allow_unverified_payment_webhook(provider: str) -> bool:
    if not getattr(settings, "DEBUG", False):
        return False
    return bool(getattr(settings, "PAYMENTS_SANDBOX", False) or is_payment_sandbox(provider))


def verify_momo_ipn_signature(payload: dict) -> bool:
    secret = str(getattr(settings, "MOMO_SECRET_KEY", "") or "")
    access_key = str(getattr(settings, "MOMO_ACCESS_KEY", "") or "")
    if not secret or not access_key:
        return _allow_unverified_payment_webhook("momo")

    received = str(payload.get("signature") or "").strip()
    if not received:
        return False

    parts = [
        f"accessKey={access_key}",
        f"amount={payload.get('amount', '')}",
        f"extraData={payload.get('extraData', '')}",
        f"message={payload.get('message', '')}",
        f"orderId={payload.get('orderId', '')}",
        f"orderInfo={payload.get('orderInfo', '')}",
        f"orderType={payload.get('orderType', '')}",
        f"partnerCode={payload.get('partnerCode', '')}",
        f"payType={payload.get('payType', '')}",
        f"requestId={payload.get('requestId', '')}",
        f"responseTime={payload.get('responseTime', '')}",
        f"resultCode={payload.get('resultCode', '')}",
        f"transId={payload.get('transId', '')}",
    ]
    raw_signature = "&".join(parts)
    expected = hmac.new(secret.encode("utf-8"), raw_signature.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received)


def verify_zalopay_callback_mac(data_raw: str, received_mac: str) -> bool:
    key2 = str(getattr(settings, "ZALOPAY_KEY2", "") or "")
    if not key2:
        return _allow_unverified_payment_webhook("zalopay")

    received = str(received_mac or "").strip()
    if not received:
        return False

    expected = hmac.new(key2.encode("utf-8"), str(data_raw or "").encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received)


def reconcile_pending_payment(booking) -> bool:
    """Query MoMo/ZaloPay for pending transactions and confirm if gateway reports success."""
    from bookings.models import Booking
    from payments.models import PaymentTransaction
    from payments.services.momo_gateway import query_momo_payment
    from payments.services.zalopay_gateway import query_zalopay_payment

    if booking.status != Booking.Status.PENDING:
        return False

    txn = (
        PaymentTransaction.objects.filter(
            booking=booking,
            status=PaymentTransaction.Status.PENDING,
        )
        .order_by("-created_at")
        .first()
    )
    if not txn:
        return False

    if txn.provider == PaymentTransaction.Provider.MOMO:
        if is_payment_sandbox("momo"):
            return False
        try:
            data = query_momo_payment(order_id=txn.order_id, request_id=txn.request_id or None)
        except ValueError as exc:
            logger.warning("MoMo query failed booking=%s: %s", booking.id, exc)
            return False

        result_code = int(data.get("resultCode", data.get("errorCode", -1)) or -1)
        if result_code != 0:
            return False

        trans_id = str(data.get("transId") or data.get("requestId") or "").strip()
        amount = int(data.get("amount") or txn.amount or booking.deposit_amount or 0)
        try:
            complete_payment_transaction(
                order_id=txn.order_id,
                provider="momo",
                amount=amount,
                provider_trans_id=trans_id,
                raw_payload=data,
                verified=True,
            )
            return True
        except ValueError:
            return False

    if txn.provider == PaymentTransaction.Provider.ZALOPAY:
        if is_payment_sandbox("zalopay"):
            return False
        app_trans_id = str(txn.request_id or txn.raw_response.get("appTransId") or "").strip()
        if not app_trans_id:
            return False
        try:
            data = query_zalopay_payment(app_trans_id=app_trans_id)
        except ValueError as exc:
            logger.warning("ZaloPay query failed booking=%s: %s", booking.id, exc)
            return False

        return_code = int(data.get("return_code", data.get("returncode", -1)) or -1)
        sub_return_code = int(data.get("sub_return_code", data.get("subreturncode", -1)) or -1)
        if return_code != 1 or sub_return_code != 1:
            return False

        zp_trans_id = str(data.get("zp_trans_id") or app_trans_id).strip()
        amount = int(data.get("amount") or txn.amount or booking.deposit_amount or 0)
        try:
            complete_payment_transaction(
                order_id=txn.order_id,
                provider="zalopay",
                amount=amount,
                provider_trans_id=zp_trans_id,
                raw_payload=data,
                verified=True,
            )
            return True
        except ValueError:
            return False

    return False
