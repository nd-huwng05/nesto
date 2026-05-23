"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

Supports:
- Django HTTP/WSGI requests
- WebSocket connections via Django Channels
"""

import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

# Import notifications routing AFTER Django setup
from notifications.routing import websocket_urlpatterns

# Application wrapper with Channels
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
