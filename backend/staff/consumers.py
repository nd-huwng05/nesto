import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from businesses.models import Branch
from staff.models import StaffProfile


STAFF_TASK_ROLES = {
    "SUPER_ADMIN",
    "BUSINESS_OWNER",
    "RECEPTIONIST",
    "HOUSEKEEPING",
    "SERVICE",
    "STAFF",
}


@database_sync_to_async
def user_can_access_branch_tasks(user, branch_id: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    role = getattr(user, "role", None)
    if role not in STAFF_TASK_ROLES:
        return False
    if role == "SUPER_ADMIN":
        return Branch.objects.filter(id=branch_id, is_active=True).exists()
    if role == "BUSINESS_OWNER":
        return Branch.objects.filter(id=branch_id, company__manager_id=user.id, is_active=True).exists()
    staff_branch_id = StaffProfile.objects.filter(user=user).values_list("branch_id", flat=True).first()
    return staff_branch_id is not None and str(staff_branch_id) == str(branch_id)


class BranchTasksConsumer(AsyncWebsocketConsumer):
    """Subscribes to branch_{branch_id}_tasks for live housekeeping / ops tasks."""

    async def connect(self):
        self.user = self.scope.get("user")
        self.branch_id = str(self.scope["url_route"]["kwargs"].get("branch_id") or "").strip()

        if not self.branch_id:
            await self.close(code=4004)
            return

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        allowed = await user_can_access_branch_tasks(self.user, self.branch_id)
        if not allowed:
            await self.close(code=4003)
            return

        self.group_name = f"branch_{self.branch_id}_tasks"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(
            text_data=json.dumps(
                {
                    "type": "connected",
                    "branchId": self.branch_id,
                    "channel": self.group_name,
                }
            )
        )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        return

    async def task_event(self, event):
        from core.services.json_utils import dumps_ws_message

        await self.send(text_data=dumps_ws_message(event.get("message") or {}))

    async def group_message(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        from core.services.json_utils import dumps_ws_message

        await self.send(text_data=dumps_ws_message(event.get("message") or {}))
