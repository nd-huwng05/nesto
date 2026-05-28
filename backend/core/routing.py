from django.urls import re_path

from accounts.consumers import AuthConsumer

websocket_urlpatterns = [
    re_path(r"ws/(?P<room_name>bookings)/$", AuthConsumer.as_asgi()),
    re_path(r"ws/(?P<room_name>services)/$", AuthConsumer.as_asgi()),
    re_path(r"ws/(?P<room_name>rooms)/$", AuthConsumer.as_asgi()),
    re_path(r"ws/(?P<room_name>customer)/$", AuthConsumer.as_asgi()),
]

