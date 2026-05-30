"""Room and theme WebSocket notifications."""

from __future__ import annotations

from bookings.services.realtime_service import emit_room_status
from core.services.realtime_service import broadcast_group


class RoomRealtimeService:
    @staticmethod
    def room_status_groups(branch_id) -> list[str]:
        return [
            f"rooms_branch_{branch_id}_role_HOUSEKEEPING",
            f"rooms_branch_{branch_id}_role_RECEPTIONIST",
            f"rooms_branch_{branch_id}_role_BUSINESS_OWNER",
            f"rooms_branch_{branch_id}_role_SUPER_ADMIN",
        ]

    @classmethod
    def notify_room_status(cls, branch_id, room_id, status: str) -> None:
        emit_room_status(branch_id, room_id, status)

    @classmethod
    def notify_theme_toggled(cls, branch_id, theme_id, enabled: bool) -> None:
        broadcast_group(
            f"rooms_branch_{branch_id}_role_CUSTOMER",
            "group_message",
            {
                "type": "theme_toggled",
                "branchId": str(branch_id),
                "themeId": str(theme_id),
                "enabled": bool(enabled),
            },
        )
