import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from bookings.models import Booking
from staff.models import StaffProfile


@database_sync_to_async
def user_can_access_booking(user, booking_id: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    booking = Booking.objects.filter(id=booking_id).only("id", "customer_id", "branch_id").first()
    if not booking:
        return False

    role = getattr(user, "role", None)
    if role == "CUSTOMER":
        return str(booking.customer_id) == str(user.id)
    if role == "SUPER_ADMIN":
        return True
    if role == "BUSINESS_OWNER":
        return Booking.objects.filter(
            id=booking.id,
            branch__company__manager_id=user.id,
        ).exists()
    if role in {"RECEPTIONIST", "STAFF", "HOUSEKEEPING", "SERVICE"}:
        staff_branch_id = StaffProfile.objects.filter(user=user).values_list("branch_id", flat=True).first()
        return staff_branch_id is not None and str(staff_branch_id) == str(booking.branch_id)
    return False


class BookingConsumer(AsyncWebsocketConsumer):
    """Subscribes to booking_{booking_id} for zero-refresh live bill updates."""

    async def connect(self):
        self.booking_id = str(self.scope["url_route"]["kwargs"].get("booking_id") or "").strip()
        self.user = self.scope.get("user")

        if not self.booking_id:
            await self.close(code=4004)
            return

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        allowed = await user_can_access_booking(self.user, self.booking_id)
        if not allowed:
            await self.close(code=4003)
            return

        self.group_name = f"booking_{self.booking_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(
            text_data=json.dumps(
                {
                    "type": "connected",
                    "bookingId": self.booking_id,
                    "channel": self.group_name,
                }
            )
        )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        return

    async def update_bill(self, event):
        from core.services.json_utils import dumps_ws_message

        await self.send(text_data=dumps_ws_message(event.get("message") or {}))

    async def group_message(self, event):
        if event.get("sender_channel") == self.channel_name:
            return
        from core.services.json_utils import dumps_ws_message

        await self.send(text_data=dumps_ws_message(event.get("message") or {}))
