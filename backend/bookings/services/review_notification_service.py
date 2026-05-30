"""WebSocket notifications for Locket / review forum events."""

from __future__ import annotations

from core.services.realtime_service import broadcast_group


class ReviewNotificationService:
    @staticmethod
    def notify_locket_post_created(post) -> None:
        broadcast_group(
            "customer_global_role_CUSTOMER",
            "group_message",
            {
                "type": "locket_post_created",
                "postId": str(post.id),
                "branchId": str(post.branch_id) if post.branch_id else "",
                "hotelName": str(post.hotel_name or ""),
                "roomName": str(post.room_name or ""),
            },
        )
