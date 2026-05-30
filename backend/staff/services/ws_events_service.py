from core.services.realtime_service import broadcast_group


def _group_send(group: str, handler_type: str, message: dict) -> None:
    broadcast_group(group, handler_type, message)


def emit_branch_task(branch_id, task_payload: dict, event_type: str = "task_created") -> None:
    """Broadcast housekeeping / driver / service tasks to branch staff dashboards."""
    if not branch_id:
        return
    message = {
        "type": event_type,
        "branchId": str(branch_id),
        "task": task_payload,
    }
    _group_send(f"branch_{branch_id}_tasks", "task_event", message)


class StaffRealtimeService:
    """Staff task WebSocket events."""

    _group_send = staticmethod(_group_send)
    emit_branch_task = staticmethod(emit_branch_task)
