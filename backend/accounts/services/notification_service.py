"""Persist in-app notifications for users."""

from __future__ import annotations

from accounts.models import UserNotification


def create_user_notification(
    *,
    user,
    title: str,
    message: str,
    notification_type: str = "general",
    meta: dict | None = None,
) -> UserNotification | None:
    if not user or not getattr(user, "id", None):
        return None
    return UserNotification.objects.create(
        user=user,
        title=str(title or "Notification")[:255],
        message=str(message or "")[:2000],
        notification_type=str(notification_type or "general")[:64],
        meta=meta or {},
    )
