import hashlib
import hmac
import json
import logging
import time
from urllib import error, request
from urllib.parse import quote

from django.conf import settings

logger = logging.getLogger(__name__)


def _zalo_mac(message: str) -> str:
    key = str(getattr(settings, "ZALOPAY_KEY1", "") or "")
    return hmac.new(key.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()


def _post_form(url: str, payload: dict, timeout: int = 30) -> dict:
    encoded = "&".join(f"{key}={quote(str(value))}" for key, value in payload.items()).encode("utf-8")
    req = request.Request(
        url,
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8") or "{}")
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        logger.error("ZaloPay HTTP %s: %s", exc.code, raw)
        raise ValueError(f"ZaloPay API error ({exc.code})") from exc
    except error.URLError as exc:
        logger.error("ZaloPay network error: %s", exc)
        raise ValueError("Unable to reach ZaloPay payment API.") from exc


def create_zalopay_payment(*, amount: int, order_id: str, description: str, booking_data: dict | None = None) -> dict:
    app_id = str(getattr(settings, "ZALOPAY_APP_ID", "2553") or "2553")
    app_user = str(getattr(settings, "ZALOPAY_APP_USER", "nesto_guest") or "nesto_guest")
    app_trans_id = f"{time.strftime('%y%m%d')}_{order_id.replace('-', '')[:20]}"
    app_time = int(round(time.time() * 1000))
    booking_payload = dict(booking_data or {})
    booking_uuid = str(
        booking_payload.get("booking_id")
        or booking_payload.get("bookingId")
        or ""
    ).strip()
    if booking_uuid:
        booking_payload["booking_id"] = booking_uuid
        booking_payload["bookingId"] = booking_uuid
    booking_payload["payment_order_id"] = str(order_id)
    embed_data = json.dumps(
        {
            "booking": booking_payload,
            "redirecturl": getattr(settings, "ZALOPAY_REDIRECT_URL", ""),
        },
        separators=(",", ":"),
    )
    item = json.dumps([{"id": order_id, "name": description, "price": int(amount)}], separators=(",", ":"))
    bank_code = ""

    mac_input = f"{app_id}|{app_trans_id}|{app_user}|{int(amount)}|{app_time}|{embed_data}|{item}"
    mac = _zalo_mac(mac_input)

    endpoint = str(
        getattr(settings, "ZALOPAY_ENDPOINT", "https://sb-openapi.zalopay.vn/v2/create")
        or "https://sb-openapi.zalopay.vn/v2/create"
    )

    payload = {
        "app_id": app_id,
        "app_trans_id": app_trans_id,
        "app_user": app_user,
        "app_time": app_time,
        "amount": int(amount),
        "item": item,
        "embed_data": embed_data,
        "description": description,
        "bank_code": bank_code,
        "mac": mac,
    }

    data = _post_form(endpoint, payload)
    return_code = int(data.get("return_code", data.get("returncode", -1)) or -1)
    pay_url = str(data.get("order_url") or data.get("orderurl") or "").strip()
    if return_code != 1 or not pay_url:
        message = str(data.get("return_message") or data.get("returnmessage") or "ZaloPay create payment failed")
        raise ValueError(message)

    return {
        "provider": "zalopay",
        "appTransId": app_trans_id,
        "orderId": order_id,
        "amount": int(amount),
        "mac": mac,
        "endpoint": endpoint,
        "payload": payload,
        "payUrl": pay_url,
        "providerResponse": data,
    }


def query_zalopay_payment(*, app_trans_id: str) -> dict:
    app_id = str(getattr(settings, "ZALOPAY_APP_ID", "2553") or "2553")
    app_time = int(round(time.time() * 1000))
    endpoint = str(
        getattr(settings, "ZALOPAY_QUERY_ENDPOINT", "https://sb-openapi.zalopay.vn/v2/query")
        or "https://sb-openapi.zalopay.vn/v2/query"
    )
    mac_input = f"{app_id}|{app_trans_id}|{app_time}"
    mac = _zalo_mac(mac_input)
    payload = {
        "app_id": app_id,
        "app_trans_id": str(app_trans_id),
        "mac": mac,
    }
    return _post_form(endpoint, payload)


def refund_zalopay_payment(*, zp_trans_id: str, amount: int, description: str = "Booking refund") -> dict:
    app_id = str(getattr(settings, "ZALOPAY_APP_ID", "2553") or "2553")
    timestamp = int(round(time.time() * 1000))
    endpoint = str(
        getattr(settings, "ZALOPAY_REFUND_ENDPOINT", "https://sb-openapi.zalopay.vn/v2/refund")
        or "https://sb-openapi.zalopay.vn/v2/refund"
    )
    desc = str(description or "Booking refund")[:250]
    mac_input = f"{app_id}|{zp_trans_id}|{int(amount)}|{desc}|{timestamp}"
    mac = _zalo_mac(mac_input)
    payload = {
        "app_id": app_id,
        "zp_trans_id": str(zp_trans_id),
        "amount": int(amount),
        "description": desc,
        "timestamp": timestamp,
        "mac": mac,
    }
    data = _post_form(endpoint, payload)
    return_code = int(data.get("return_code", data.get("returncode", -1)) or -1)
    if return_code != 1:
        message = str(data.get("return_message") or data.get("returnmessage") or "ZaloPay refund failed")
        raise ValueError(message)
    return data
