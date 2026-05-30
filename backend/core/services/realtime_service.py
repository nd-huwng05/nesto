"""Central WebSocket dispatch — HTTP views must not call channel_layer directly."""

from __future__ import annotations

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from core.services.json_utils import json_safe

logger = logging.getLogger(__name__)


def broadcast_group(group: str, handler_type: str, message: dict) -> None:
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.warning("CHANNEL_LAYERS unavailable; dropped broadcast to %s", group)
        return
    safe_message = json_safe(message)
    try:
        async_to_sync(channel_layer.group_send)(
            group,
            {"type": handler_type, "message": safe_message, "sender_channel": None},
        )
    except Exception:
        logger.exception("Redis group_send failed for group=%s handler=%s", group, handler_type)


def broadcast_many(groups: list[str], handler_type: str, message: dict) -> None:
    for group in groups:
        broadcast_group(group, handler_type, message)


class RealtimeBroadcastService:
    """Central WebSocket group dispatch."""

    broadcast_group = staticmethod(broadcast_group)
    broadcast_many = staticmethod(broadcast_many)
