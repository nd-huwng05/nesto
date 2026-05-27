from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/auth/(?P<room_name>\w+)/$', consumers.AuthConsumer.as_asgi()),
]
