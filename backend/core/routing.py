from django.urls import re_path

from accounts.consumers import AuthConsumer
from bookings.routing import websocket_urlpatterns as booking_websocket_urlpatterns
from staff.routing import websocket_urlpatterns as staff_websocket_urlpatterns

websocket_urlpatterns = [
    re_path(r"ws/(?P<room_name>bookings)/$", AuthConsumer.as_asgi()),
    re_path(r"ws/(?P<room_name>services)/$", AuthConsumer.as_asgi()),
    re_path(r"ws/(?P<room_name>rooms)/$", AuthConsumer.as_asgi()),
    re_path(r"ws/(?P<room_name>customer)/$", AuthConsumer.as_asgi()),
    *booking_websocket_urlpatterns,
    *staff_websocket_urlpatterns,
]
