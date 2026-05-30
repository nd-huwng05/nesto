"""JSON helpers for WebSocket payloads (UUID, datetime, Decimal)."""

from __future__ import annotations

import json
import uuid
from datetime import date, datetime, time
from decimal import Decimal


def json_safe(value):
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [json_safe(item) for item in value]
    return str(value)


def dumps_ws_message(payload) -> str:
    return json.dumps(json_safe(payload))
