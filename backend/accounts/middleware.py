import urllib.parse

from asgiref.sync import sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from oauth2_provider.models import AccessToken


class OAuth2TokenMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"")
        if isinstance(query_string, bytes):
            query_string = query_string.decode("utf-8")

        params = urllib.parse.parse_qs(query_string)
        token = (params.get("token") or [None])[0]

        scope["user"] = await self._get_user_from_token(token)
        return await super().__call__(scope, receive, send)

    @sync_to_async
    def _get_user_from_token(self, token):
        if not token:
            return AnonymousUser()

        try:
            access_token = (
                AccessToken.objects.select_related("user").only("token", "user__id").get(token=token)
            )
        except AccessToken.DoesNotExist:
            return AnonymousUser()

        return access_token.user

