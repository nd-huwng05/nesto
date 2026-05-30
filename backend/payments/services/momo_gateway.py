import hashlib
import hmac
import json
import logging
import uuid
from urllib import error, request

from django.conf import settings

logger = logging.getLogger(__name__)


def _momo_signature(raw_signature: str) -> str:
    secret = str(getattr(settings, "MOMO_SECRET_KEY", "") or "")
    return hmac.new(secret.encode("utf-8"), raw_signature.encode("utf-8"), hashlib.sha256).hexdigest()


def _post_json(url: str, payload: dict, timeout: int = 30) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with request.urlopen(req, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8") or "{}")
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        logger.error("MoMo HTTP %s: %s", exc.code, raw)
        raise ValueError(f"MoMo API error ({exc.code})") from exc
    except error.URLError as exc:
        logger.error("MoMo network error: %s", exc)
        raise ValueError("Unable to reach MoMo payment API.") from exc


def create_momo_payment(*, amount: int, order_id: str, order_info: str, extra_data: dict | None = None) -> dict:
    partner_code = str(getattr(settings, "MOMO_PARTNER_CODE", "MOMO") or "MOMO")
    access_key = str(getattr(settings, "MOMO_ACCESS_KEY", "") or "")
    request_id = str(uuid.uuid4())
    request_type = "captureWallet"
    redirect_url = str(getattr(settings, "MOMO_REDIRECT_URL", "") or "")
    ipn_url = str(getattr(settings, "MOMO_IPN_URL", "") or "")
    endpoint = str(
        getattr(settings, "MOMO_ENDPOINT", "https://test-payment.momo.vn/v2/gateway/api/create")
        or "https://test-payment.momo.vn/v2/gateway/api/create"
    )
    extra_data_encoded = json.dumps(extra_data or {}, separators=(",", ":"), ensure_ascii=False)

    raw_signature = (
        f"accessKey={access_key}"
        f"&amount={int(amount)}"
        f"&extraData={extra_data_encoded}"
        f"&ipnUrl={ipn_url}"
        f"&orderId={order_id}"
        f"&orderInfo={order_info}"
        f"&partnerCode={partner_code}"
        f"&redirectUrl={redirect_url}"
        f"&requestId={request_id}"
        f"&requestType={request_type}"
    )
    signature = _momo_signature(raw_signature)

    payload = {
        "partnerCode": partner_code,
        "partnerName": "Nesto",
        "storeId": "NestoStore",
        "requestId": request_id,
        "amount": int(amount),
        "orderId": order_id,
        "orderInfo": order_info,
        "redirectUrl": redirect_url,
        "ipnUrl": ipn_url,
        "lang": "vi",
        "extraData": extra_data_encoded,
        "requestType": request_type,
        "signature": signature,
    }

    data = _post_json(endpoint, payload)
    result_code = int(data.get("resultCode", data.get("errorCode", -1)) or -1)
    pay_url = str(data.get("payUrl") or data.get("deeplink") or "").strip()
    if result_code != 0 or not pay_url:
        message = str(data.get("message") or data.get("localMessage") or "MoMo create payment failed")
        raise ValueError(message)

    return {
        "provider": "momo",
        "requestId": request_id,
        "orderId": order_id,
        "amount": int(amount),
        "signature": signature,
        "endpoint": endpoint,
        "payload": payload,
        "payUrl": pay_url,
        "providerResponse": data,
    }


def query_momo_payment(*, order_id: str, request_id: str | None = None) -> dict:
    partner_code = str(getattr(settings, "MOMO_PARTNER_CODE", "MOMO") or "MOMO")
    access_key = str(getattr(settings, "MOMO_ACCESS_KEY", "") or "")
    req_id = str(request_id or uuid.uuid4())
    endpoint = str(
        getattr(settings, "MOMO_QUERY_ENDPOINT", "https://test-payment.momo.vn/v2/gateway/api/query")
        or "https://test-payment.momo.vn/v2/gateway/api/query"
    )

    raw_signature = (
        f"accessKey={access_key}"
        f"&orderId={order_id}"
        f"&partnerCode={partner_code}"
        f"&requestId={req_id}"
    )
    signature = _momo_signature(raw_signature)
    payload = {
        "partnerCode": partner_code,
        "requestId": req_id,
        "orderId": order_id,
        "lang": "vi",
        "signature": signature,
    }
    return _post_json(endpoint, payload)


def refund_momo_payment(*, order_id: str, amount: int, trans_id: str, description: str = "Booking refund") -> dict:
    partner_code = str(getattr(settings, "MOMO_PARTNER_CODE", "MOMO") or "MOMO")
    access_key = str(getattr(settings, "MOMO_ACCESS_KEY", "") or "")
    request_id = str(uuid.uuid4())
    endpoint = str(
        getattr(settings, "MOMO_REFUND_ENDPOINT", "https://test-payment.momo.vn/v2/gateway/api/refund")
        or "https://test-payment.momo.vn/v2/gateway/api/refund"
    )
    desc = str(description or "Booking refund")[:250]

    raw_signature = (
        f"accessKey={access_key}"
        f"&amount={int(amount)}"
        f"&description={desc}"
        f"&orderId={order_id}"
        f"&partnerCode={partner_code}"
        f"&requestId={request_id}"
        f"&transId={trans_id}"
    )
    signature = _momo_signature(raw_signature)
    payload = {
        "partnerCode": partner_code,
        "orderId": order_id,
        "requestId": request_id,
        "amount": int(amount),
        "transId": str(trans_id),
        "lang": "vi",
        "description": desc,
        "signature": signature,
    }
    data = _post_json(endpoint, payload)
    result_code = int(data.get("resultCode", data.get("errorCode", -1)) or -1)
    if result_code != 0:
        message = str(data.get("message") or data.get("localMessage") or "MoMo refund failed")
        raise ValueError(message)
    return data
