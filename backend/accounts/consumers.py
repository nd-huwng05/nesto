import json
from channels.generic.websocket import AsyncWebsocketConsumer


class AuthConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add(
            'auth_general',
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            'auth_general',
            self.channel_name
        )

    async def receive(self, text_data):
        await self.channel_layer.group_send(
            'auth_general',
            {
                'type': 'auth_message',
                'message': json.loads(text_data)
            }
        )

    async def auth_message(self, event):
        await self.send(text_data=json.dumps(event['message']))