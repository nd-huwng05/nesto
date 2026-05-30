import json
import logging
import uuid
from urllib.parse import urlencode

from django.conf import settings
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking
from payments.services import (
    build_payment_order_id,
    complete_checkout_payment,
    complete_payment_transaction,
    confirm_sandbox_deposit,
    create_momo_payment,
    create_payment_intent,
    create_zalopay_payment,
    get_checkout_payment_status,
    get_latest_payment_status,
    is_payment_sandbox,
    resolve_booking_from_payment_order,
    resolve_booking_id_from_payment_order,
    verify_momo_ipn_signature,
    verify_zalopay_callback_mac,
)
from payments.serializers import PaymentInitSerializer, PaymentStatusSerializer

logger = logging.getLogger(__name__)


def _resolve_amount(validated_data, booking: Booking | None = None) -> int:
    if booking is not None:
        saved_deposit = int(booking.deposit_amount or 0)
        if saved_deposit > 0:
            return saved_deposit

    explicit = validated_data.get("amount")
    if explicit:
        return int(explicit)

    booking_data = validated_data.get("booking_data") or {}
    deposit_amount = int(booking_data.get("deposit_amount") or booking_data.get("depositAmount") or 0)
    if deposit_amount > 0:
        return deposit_amount

    total_amount = int(booking_data.get("total_amount") or booking_data.get("totalAmount") or 0)
    deposit_percentage = int(validated_data.get("deposit_percentage") or 20)
    if total_amount > 0:
        return max(1, int(round(total_amount * (deposit_percentage / 100))))
    return 0


def _momo_app_return_url(*, result_code: int, order_id: str, booking_id: str, amount: int, message: str) -> str:
    query = urlencode(
        {
            "resultCode": int(result_code),
            "orderId": str(order_id or ""),
            "bookingId": str(booking_id or ""),
            "amount": int(amount or 0),
            "message": str(message or "")[:200],
        }
    )
    return f"nesto://payment/return?{query}"


def _resolve_booking_for_payment(booking_id: str, user) -> Booking | None:
    key = str(booking_id or "").strip()
    if not key:
        return None
    qs = Booking.objects.filter(customer=user)
    booking = qs.filter(id=key).first()
    if booking:
        return booking
    return qs.filter(booking_code=key).first()


def _payment_response_payload(
    *,
    sandbox: bool = False,
    pay_url: str | None = None,
    provider: str = "",
    order_id: str = "",
    checkout_session_id: str = "",
    booking_id: str = "",
    amount: int = 0,
    deposit_paid: bool = False,
    return_url: str = "",
) -> dict:
    return {
        "sandbox": bool(sandbox),
        "pay_url": pay_url,
        "provider": provider,
        "order_id": order_id,
        "checkout_session_id": checkout_session_id,
        "booking_id": booking_id,
        "amount": int(amount),
        "deposit_paid": bool(deposit_paid),
        "return_url": return_url,
    }


def _init_gateway_payment(
    *,
    request,
    provider: str,
    data: dict,
    amount: int,
    checkout_session_id: str,
    payment_order_id: str,
    create_fn,
    create_kwargs: dict,
    checkout_payload: dict | None = None,
):
    from payments.services.payment_service import build_checkout_payload

    booking = _resolve_booking_for_payment(checkout_session_id, request.user)
    payload_checkout = checkout_payload or build_checkout_payload(validated_data=data, user=request.user)

    if is_payment_sandbox(provider):
        if booking:
            create_payment_intent(
                booking=booking,
                customer=request.user,
                provider=provider,
                order_id=payment_order_id,
                amount=amount,
                pay_url="",
                request_id="sandbox",
                raw_response={"sandbox": True},
            )
            try:
                confirm_sandbox_deposit(booking, amount=amount, payment_method=provider)
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            return Response(
                _payment_response_payload(
                    sandbox=True,
                    provider=provider,
                    order_id=payment_order_id,
                    checkout_session_id=checkout_session_id,
                    booking_id=str(booking.id),
                    amount=amount,
                    deposit_paid=True,
                ),
                status=status.HTTP_200_OK,
            )

        create_payment_intent(
            booking=None,
            customer=request.user,
            provider=provider,
            order_id=payment_order_id,
            amount=amount,
            pay_url="",
            request_id="sandbox",
            raw_response={"sandbox": True},
            checkout_session_id=checkout_session_id,
            checkout_payload=payload_checkout,
        )
        return Response(
            _payment_response_payload(
                sandbox=True,
                provider=provider,
                order_id=payment_order_id,
                checkout_session_id=checkout_session_id,
                amount=amount,
                deposit_paid=False,
            ),
            status=status.HTTP_200_OK,
        )

    try:
        payment = create_fn(**create_kwargs)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    create_payment_intent(
        booking=booking,
        customer=request.user,
        provider=provider,
        order_id=payment_order_id,
        amount=amount,
        pay_url=payment.get("payUrl") or payment.get("pay_url") or "",
        request_id=str(payment.get("requestId") or payment.get("appTransId") or ""),
        raw_response=payment.get("providerResponse") or {},
        checkout_session_id=checkout_session_id if not booking else "",
        checkout_payload=payload_checkout if not booking else None,
    )

    return_url = ""
    if provider == "momo":
        return_url = str(getattr(settings, "MOMO_REDIRECT_URL", "") or "").strip()

    return Response(
        _payment_response_payload(
            sandbox=False,
            pay_url=payment.get("payUrl") or payment.get("pay_url") or "",
            provider=payment.get("provider") or provider,
            order_id=payment.get("orderId") or payment.get("order_id") or payment_order_id,
            checkout_session_id=checkout_session_id,
            booking_id=str(booking.id) if booking else "",
            amount=int(payment.get("amount") or amount),
            deposit_paid=False,
            return_url=return_url,
        ),
        status=status.HTTP_200_OK,
    )


@extend_schema(tags=["Payments"])
class MoMoPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PaymentInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        booking_id = str(data.get("booking_id") or "").strip() or str(uuid.uuid4())
        checkout_session_id = booking_id
        booking = _resolve_booking_for_payment(checkout_session_id, request.user)
        amount = _resolve_amount(data, booking=booking)
        if amount <= 0:
            return Response({"detail": "amount must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

        payment_order_id = build_payment_order_id(checkout_session_id)
        order_info = str(data.get("order_info") or "").strip() or f"Nesto booking {checkout_session_id}"
        extra = {
            "booking_data": data.get("booking_data") or {},
            "selected_services": data.get("selected_services") or [],
            "deposit_percentage": data.get("deposit_percentage"),
            "customer_id": str(request.user.id),
            "checkout_session_id": checkout_session_id,
            "payment_order_id": payment_order_id,
        }

        return _init_gateway_payment(
            request=request,
            provider="momo",
            data=data,
            amount=amount,
            checkout_session_id=checkout_session_id,
            payment_order_id=payment_order_id,
            create_fn=create_momo_payment,
            create_kwargs={
                "amount": amount,
                "order_id": payment_order_id,
                "order_info": order_info,
                "extra_data": extra,
            },
        )


@extend_schema(tags=["Payments"])
class ZaloPayPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PaymentInitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        booking_id = str(data.get("booking_id") or "").strip() or str(uuid.uuid4())
        checkout_session_id = booking_id
        booking = _resolve_booking_for_payment(checkout_session_id, request.user)
        amount = _resolve_amount(data, booking=booking)
        if amount <= 0:
            return Response({"detail": "amount must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)

        payment_order_id = build_payment_order_id(checkout_session_id)
        description = str(data.get("order_info") or "").strip() or f"Nesto booking {checkout_session_id}"
        booking_data = {
            **(data.get("booking_data") or {}),
            "checkout_session_id": checkout_session_id,
            "payment_order_id": payment_order_id,
            "selected_services": data.get("selected_services") or [],
            "deposit_percentage": data.get("deposit_percentage"),
            "customer_id": str(request.user.id),
        }

        return _init_gateway_payment(
            request=request,
            provider="zalopay",
            data=data,
            amount=amount,
            checkout_session_id=checkout_session_id,
            payment_order_id=payment_order_id,
            create_fn=create_zalopay_payment,
            create_kwargs={
                "amount": amount,
                "order_id": payment_order_id,
                "description": description,
                "booking_data": booking_data,
            },
        )


@extend_schema(tags=["Payments"])
class PaymentStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):
        booking = _resolve_booking_for_payment(booking_id, request.user)
        if booking:
            return Response(
                PaymentStatusSerializer(get_latest_payment_status(booking, reconcile=True)).data,
                status=status.HTTP_200_OK,
            )

        checkout_status = get_checkout_payment_status(booking_id, request.user)
        if checkout_status:
            return Response(PaymentStatusSerializer(checkout_status).data, status=status.HTTP_200_OK)

        return Response({"detail": "Booking or checkout session not found."}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(tags=["Payments"])
class PaymentSyncView(APIView):
    """Query MoMo/ZaloPay and confirm deposit after user returns from the wallet app."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, booking_id):
        booking = _resolve_booking_for_payment(booking_id, request.user)
        if booking:
            payload = get_latest_payment_status(booking, reconcile=True)
            booking.refresh_from_db()
            payload["booking_status"] = booking.status
            return Response(PaymentStatusSerializer(payload).data, status=status.HTTP_200_OK)

        checkout_status = get_checkout_payment_status(booking_id, request.user)
        if checkout_status:
            return Response(PaymentStatusSerializer(checkout_status).data, status=status.HTTP_200_OK)

        return Response({"detail": "Booking or checkout session not found."}, status=status.HTTP_404_NOT_FOUND)


@extend_schema(tags=["Payments"])
class CheckoutPaymentCompleteView(APIView):
    """Finalize sandbox checkout — creates the booking in DB only after payment."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, checkout_session_id):
        amount = int(request.data.get("amount") or request.data.get("depositAmount") or 0)
        payment_method = request.data.get("payment_method") or request.data.get("paymentMethod") or "sandbox"
        try:
            payload = complete_checkout_payment(
                checkout_session_id=checkout_session_id,
                customer=request.user,
                amount=amount,
                payment_method=payment_method,
                request=request,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PaymentStatusSerializer(payload).data, status=status.HTTP_200_OK)


@extend_schema(tags=["Payments"])
class MoMoReturnView(APIView):
    """MoMo redirect target: confirm payment server-side, then deep-link back into the mobile app."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        params = request.GET
        result_code = int(params.get("resultCode", params.get("errorCode", -1)) or -1)
        order_id = str(params.get("orderId") or params.get("order_id") or "").strip()
        amount = int(params.get("amount") or 0)
        trans_id = str(params.get("transId") or params.get("requestId") or "").strip()
        message = str(params.get("message") or params.get("localMessage") or "").strip()
        booking_id = resolve_booking_id_from_payment_order(order_id)

        if result_code == 0 and order_id:
            if amount <= 0:
                booking_for_amount = resolve_booking_from_payment_order(order_id)
                if booking_for_amount:
                    amount = int(booking_for_amount.deposit_amount or 0)
            verified = True
            if params.get("signature"):
                verified = verify_momo_ipn_signature(dict(params))
                if not verified and getattr(settings, "DEBUG", False):
                    verified = True
            try:
                complete_payment_transaction(
                    order_id=order_id,
                    provider="momo",
                    amount=amount,
                    provider_trans_id=trans_id,
                    raw_payload=dict(params),
                    verified=verified,
                )
            except ValueError as exc:
                logger.warning("MoMo return confirm failed orderId=%s: %s", order_id, exc)
                message = str(exc) or message

        deep_link = _momo_app_return_url(
            result_code=result_code,
            order_id=order_id,
            booking_id=booking_id,
            amount=amount,
            message=message or ("Thành công." if result_code == 0 else "Thanh toán chưa hoàn tất."),
        )
        safe_link = json.dumps(deep_link)
        html = f"""<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Nesto Payment</title></head>
<body style="font-family:sans-serif;text-align:center;padding:32px;">
<p>Đang quay lại ứng dụng Nesto…</p>
<p><a id="open" href="{deep_link}">Mở Nesto</a></p>
<script>window.location.replace({safe_link});</script>
</body></html>"""
        return HttpResponse(html, content_type="text/html; charset=utf-8")


@extend_schema(tags=["Payments"])
class MoMoIpnView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        if not verify_momo_ipn_signature(payload):
            logger.warning("MoMo IPN rejected: invalid signature for orderId=%s", payload.get("orderId"))
            return Response({"detail": "invalid signature"}, status=status.HTTP_403_FORBIDDEN)

        result_code = int(payload.get("resultCode", payload.get("errorCode", -1)) or -1)
        order_id = str(payload.get("orderId") or payload.get("order_id") or "").strip()
        amount = int(payload.get("amount") or 0)
        trans_id = str(payload.get("transId") or payload.get("requestId") or "").strip()

        if result_code != 0:
            return Response({"detail": "ignored"}, status=status.HTTP_200_OK)

        try:
            complete_payment_transaction(
                order_id=order_id,
                provider="momo",
                amount=amount,
                provider_trans_id=trans_id,
                raw_payload=payload,
                verified=True,
            )
        except ValueError as exc:
            logger.warning("MoMo IPN confirm failed orderId=%s: %s", order_id, exc)
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "ok"}, status=status.HTTP_200_OK)


@extend_schema(tags=["Payments"])
class ZaloPayCallbackView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        data_raw = payload.get("data")
        received_mac = str(payload.get("mac") or "").strip()

        if isinstance(data_raw, str):
            if not verify_zalopay_callback_mac(data_raw, received_mac):
                logger.warning("ZaloPay callback rejected: invalid mac")
                return Response({"return_code": -1, "return_message": "invalid mac"}, status=status.HTTP_403_FORBIDDEN)
            try:
                data = json.loads(data_raw)
            except json.JSONDecodeError:
                data = {}
        else:
            data = data_raw if isinstance(data_raw, dict) else payload

        return_code = int(data.get("return_code", data.get("returncode", -1)) or -1)
        app_trans_id = str(data.get("app_trans_id") or "").strip()
        amount = int(data.get("amount") or 0)
        zp_trans_id = str(data.get("zp_trans_id") or app_trans_id).strip()

        embed_raw = data.get("embed_data") or "{}"
        if isinstance(embed_raw, str):
            try:
                embed = json.loads(embed_raw)
            except json.JSONDecodeError:
                embed = {}
        else:
            embed = embed_raw if isinstance(embed_raw, dict) else {}

        booking_payload = embed.get("booking") if isinstance(embed.get("booking"), dict) else {}
        order_id = str(
            booking_payload.get("payment_order_id")
            or booking_payload.get("paymentOrderId")
            or booking_payload.get("booking_id")
            or booking_payload.get("bookingId")
            or ""
        ).strip()

        if return_code != 1:
            return Response({"return_code": 1, "return_message": "ignored"}, status=status.HTTP_200_OK)

        if not order_id:
            logger.warning("ZaloPay callback missing booking_id embed app_trans_id=%s", app_trans_id)
            return Response({"return_code": -1, "return_message": "missing booking id"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            complete_payment_transaction(
                order_id=order_id,
                provider="zalopay",
                amount=amount,
                provider_trans_id=zp_trans_id,
                raw_payload=data,
                verified=True,
            )
        except ValueError as exc:
            logger.warning("ZaloPay callback confirm failed orderId=%s: %s", order_id, exc)
            return Response({"return_code": -1, "return_message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"return_code": 1, "return_message": "success"}, status=status.HTTP_200_OK)
