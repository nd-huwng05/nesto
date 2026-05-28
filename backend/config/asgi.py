import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
import accounts.middleware
import core.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),

    "websocket": AllowedHostsOriginValidator(
        accounts.middleware.OAuth2TokenMiddleware(
            URLRouter(
                core.routing.websocket_urlpatterns
            )
        )
    ),
})
