"""Deposit refund handling when bookings are cancelled."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def _attempt_gateway_refund(txn, booking) -> dict:
    from payments.services.payment_service import is_payment_sandbox

    amount = int(txn.amount or booking.deposit_amount or 0)
    if amount <= 0:
        return {"status": "skipped", "reason": "zero_amount"}

    provider = str(txn.provider or "").lower()
    if provider == "momo":
        if is_payment_sandbox("momo"):
            return {"status": "sandbox", "provider": "momo"}
        trans_id = str(txn.provider_trans_id or "").strip()
        if not trans_id:
            return {"status": "failed", "reason": "missing_trans_id"}
        from payments.services.momo_gateway import refund_momo_payment

        response = refund_momo_payment(
            order_id=str(txn.order_id),
            amount=amount,
            trans_id=trans_id,
            description=f"Refund booking {booking.booking_code}",
        )
        return {"status": "submitted", "provider": "momo", "gatewayResponse": response}

    if provider == "zalopay":
        if is_payment_sandbox("zalopay"):
            return {"status": "sandbox", "provider": "zalopay"}
        zp_trans_id = str(txn.provider_trans_id or txn.request_id or "").strip()
        if not zp_trans_id:
            return {"status": "failed", "reason": "missing_zp_trans_id"}
        from payments.services.zalopay_gateway import refund_zalopay_payment

        response = refund_zalopay_payment(
            zp_trans_id=zp_trans_id,
            amount=amount,
            description=f"Refund booking {booking.booking_code}",
        )
        return {"status": "submitted", "provider": "zalopay", "gatewayResponse": response}

    if provider == "sandbox":
        return {"status": "sandbox", "provider": "sandbox"}

    return {"status": "unsupported", "provider": provider}


def request_deposit_refund(booking) -> dict | None:
    """Refund deposit via gateway when possible. Returns refund summary or None."""
    from payments.models import PaymentTransaction

    txn = (
        PaymentTransaction.objects.filter(
            booking=booking,
            status=PaymentTransaction.Status.SUCCESS,
        )
        .order_by("-created_at")
        .first()
    )
    if not txn:
        return None

    refund_amount = int(txn.amount or booking.deposit_amount or 0)
    gateway_result = {"status": "not_attempted"}
    try:
        gateway_result = _attempt_gateway_refund(txn, booking)
    except ValueError as exc:
        logger.warning("Gateway refund failed booking=%s txn=%s: %s", booking.id, txn.id, exc)
        gateway_result = {"status": "failed", "error": str(exc), "provider": txn.provider}

    refund_status = "refund_requested"
    if gateway_result.get("status") == "submitted":
        refund_status = "refund_submitted"
    elif gateway_result.get("status") == "sandbox":
        refund_status = "refund_sandbox"

    txn.status = PaymentTransaction.Status.CANCELLED
    txn.raw_response = {
        **(txn.raw_response or {}),
        "refundRequested": True,
        "refundReason": "booking_cancelled",
        "refundAmount": refund_amount,
        "refundStatus": refund_status,
        "refundGateway": gateway_result,
    }
    txn.save(update_fields=["status", "raw_response", "updated_at"])

    logger.info(
        "Refund processed booking=%s txn=%s amount=%s status=%s provider=%s",
        booking.id,
        txn.id,
        refund_amount,
        refund_status,
        txn.provider,
    )
    return {
        "transactionId": str(txn.id),
        "provider": txn.provider,
        "amount": refund_amount,
        "status": refund_status,
        "gateway": gateway_result,
    }
