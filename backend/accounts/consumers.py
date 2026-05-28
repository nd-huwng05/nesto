import json
import urllib.parse
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


ALLOWED_CHANNELS = {'bookings', 'services', 'rooms', 'customer'}

CHANNEL_ROLES = {
    'bookings': {'BUSINESS_OWNER', 'STAFF', 'RECEPTIONIST', 'HOUSEKEEPING', 'SERVICE', 'MANAGER'},
    'services': {'BUSINESS_OWNER', 'STAFF', 'RECEPTIONIST', 'HOUSEKEEPING', 'SERVICE', 'MANAGER'},
    'rooms': {'BUSINESS_OWNER', 'STAFF', 'RECEPTIONIST', 'HOUSEKEEPING', 'SERVICE', 'MANAGER'},
    'customer': {'CUSTOMER', 'BUSINESS_OWNER', 'STAFF', 'RECEPTIONIST', 'HOUSEKEEPING', 'SERVICE', 'MANAGER', 'SUPER_ADMIN'},
}


def get_user_role(user):
    if user.is_anonymous or not user.is_authenticated:
        return None
    return getattr(user, 'role', None)


class AuthConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope.get('user')
        self.room_name = self.scope.get('url_route', {}).get('kwargs', {}).get('room_name', '')

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        if self.room_name not in ALLOWED_CHANNELS:
            await self.close(code=4003)
            return

        role = await database_sync_to_async(get_user_role)(self.user)
        allowed_roles = CHANNEL_ROLES.get(self.room_name, set())

        if role not in allowed_roles:
            await self.close(code=4003)
            return

        query_string = self.scope.get("query_string", b"")
        if isinstance(query_string, bytes):
            query_string = query_string.decode("utf-8")
        params = urllib.parse.parse_qs(query_string)
        branch_id = (params.get("branch_id") or [None])[0]
        if self.room_name != "customer":
            if not branch_id:
                await self.close(code=4004)
                return

        if self.room_name == "customer":
            self.subscription_groups = [
                "customer_global_role_CUSTOMER",
                f"user_{self.user.id}_bookings",
            ]
        else:
            self.subscription_groups = []
        if branch_id:
            self.subscription_groups.extend(
                [
                    f"{self.room_name}_branch_{branch_id}_role_{role}",
                    f"{self.room_name}_branch_{branch_id}_role_MANAGER",
                    f"{self.room_name}_branch_{branch_id}_role_BUSINESS_OWNER",
                    f"{self.room_name}_branch_{branch_id}_role_SUPER_ADMIN",
                ]
            )

        for group_name in self.subscription_groups:
            await self.channel_layer.group_add(group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "subscription_groups"):
            for group_name in self.subscription_groups:
                await self.channel_layer.group_discard(group_name, self.channel_name)

    async def receive(self, text_data):
        if not hasattr(self, 'subscription_groups'):
            return
        try:
            payload = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return
        # Client-to-server messages are ignored by default (server is authoritative).
        # If needed later, route messages to branch-scoped groups only.
        return

    async def group_message(self, event):
        if event.get('sender_channel') == self.channel_name:
            return
        await self.send(text_data=json.dumps(event['message']))
