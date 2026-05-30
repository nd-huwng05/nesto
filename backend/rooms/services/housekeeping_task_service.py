"""Housekeeping task lifecycle when rooms need cleaning."""

from __future__ import annotations

from django.db import transaction
from django.db.models import Count
from django.utils import timezone

from rooms.models import HousekeepingTask, Room

_ACTIVE_STATUSES = {HousekeepingTask.Status.PENDING, HousekeepingTask.Status.IN_PROGRESS}


def collapse_duplicate_active_tasks(*, branch_id=None, room_id=None) -> int:
    """Keep the newest active task per room; cancel older duplicates."""
    qs = HousekeepingTask.objects.filter(status__in=_ACTIVE_STATUSES)
    if branch_id:
        qs = qs.filter(branch_id=branch_id)
    if room_id:
        qs = qs.filter(room_id=room_id)

    duplicate_room_ids = (
        qs.values("room_id")
        .annotate(task_count=Count("id"))
        .filter(task_count__gt=1)
        .values_list("room_id", flat=True)
    )

    cancelled = 0
    for rid in duplicate_room_ids:
        active = list(qs.filter(room_id=rid).order_by("-created_at", "-id"))
        if len(active) <= 1:
            continue
        keeper_id = active[0].id
        cancelled += (
            HousekeepingTask.objects.filter(id__in=[t.id for t in active[1:]]).update(
                status=HousekeepingTask.Status.CANCELLED
            )
        )
        _ = keeper_id
    return cancelled


def close_stale_housekeeping_tasks(*, branch_id=None) -> int:
    """
    Auto-complete active tasks when the physical room is already available
    (e.g. reception marked the room ready but the HK task was not closed).
    """
    qs = (
        HousekeepingTask.objects.filter(status__in=_ACTIVE_STATUSES, room__status=Room.Status.AVAILABLE)
        .select_related("room")
    )
    if branch_id:
        qs = qs.filter(branch_id=branch_id)
    task_ids = list(qs.values_list("id", flat=True))
    if not task_ids:
        return 0
    now = timezone.now()
    return HousekeepingTask.objects.filter(id__in=task_ids).update(
        status=HousekeepingTask.Status.COMPLETED,
        completed_at=now,
        updated_at=now,
    )


def _emit_task_created(task: HousekeepingTask, branch_id) -> None:
    from rooms.serializers import HousekeepingTaskSerializer
    from staff.services.ws_events_service import emit_branch_task
    from core.services.realtime_service import broadcast_group

    payload = HousekeepingTaskSerializer(task).data
    emit_branch_task(branch_id, payload, event_type="task_created")
    broadcast_group(
        f"rooms_branch_{branch_id}_role_HOUSEKEEPING",
        "group_message",
        {
            "type": "housekeeping_task_created",
            "branch_id": str(branch_id),
            "task": payload,
        },
    )


@transaction.atomic
def ensure_housekeeping_task_for_dirty_room(
    room_id,
    *,
    branch_id=None,
    note: str = "Post checkout — full clean",
) -> tuple[HousekeepingTask | None, bool]:
    """
    Ensure exactly one active housekeeping task exists for a dirty/cleaning room.
    Returns (task, created).
    """
    room = Room.objects.select_for_update().filter(id=room_id).first()
    if not room:
        return None, False

    status = str(room.status or "").upper()
    if status not in {Room.Status.DIRTY, Room.Status.CLEANING}:
        return None, False

    resolved_branch_id = branch_id or room.branch_id
    collapse_duplicate_active_tasks(branch_id=resolved_branch_id, room_id=room.id)

    active = (
        HousekeepingTask.objects.select_for_update()
        .filter(branch_id=resolved_branch_id, room_id=room.id, status__in=_ACTIVE_STATUSES)
        .order_by("-created_at", "-id")
        .first()
    )
    if active:
        return active, False

    task = HousekeepingTask.objects.create(
        branch_id=resolved_branch_id,
        room_id=room.id,
        status=HousekeepingTask.Status.PENDING,
        note=str(note or "").strip() or "Room needs cleaning.",
    )
    _emit_task_created(task, resolved_branch_id)
    return task, True
