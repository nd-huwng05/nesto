from django.urls import re_path

from staff.consumers import BranchTasksConsumer

websocket_urlpatterns = [
    re_path(r"ws/branch/(?P<branch_id>[^/]+)/tasks/$", BranchTasksConsumer.as_asgi()),
]
