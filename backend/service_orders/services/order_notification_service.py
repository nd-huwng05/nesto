"""Booking line-item WebSocket fan-out (staff tasks)."""

from __future__ import annotations

from core.services.realtime_service import broadcast_many
from staff.services.ws_events_service import emit_branch_task


class OrderNotificationService:
    @staticmethod
    def service_groups(branch_id) -> list[str]:
        return [
            f"services_branch_{branch_id}_role_SERVICE",
            f"services_branch_{branch_id}_role_BUSINESS_OWNER",
            f"services_branch_{branch_id}_role_SUPER_ADMIN",
        ]

    @classmethod
    def notify_line_item_updated(cls, line_item) -> None:
        message = {
            "type": "service_update",
            "orderId": str(line_item.id),
            "status": line_item.status,
            "branchId": str(line_item.branch_id),
        }
        broadcast_many(cls.service_groups(line_item.branch_id), "group_message", message)

    @classmethod
    def notify_branch_task(cls, line_item, *, event_type: str = "task_updated") -> None:
        emit_branch_task(
            line_item.branch_id,
            {
                "id": str(line_item.id),
                "taskKind": "service_order",
                "status": line_item.status,
                "summary": str(line_item.summary or line_item.category or "Service order"),
                "branchId": str(line_item.branch_id),
                "bookingId": str(line_item.booking_id) if line_item.booking_id else None,
            },
            event_type=event_type,
        )

    # Backward-compatible aliases used by older call sites.
    notify_order_updated = notify_line_item_updated
