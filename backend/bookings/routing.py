from django.urls import re_path

from bookings.consumers import BookingConsumer

websocket_urlpatterns = [
    re_path(r"ws/booking/(?P<booking_id>[^/]+)/$", BookingConsumer.as_asgi()),
]
