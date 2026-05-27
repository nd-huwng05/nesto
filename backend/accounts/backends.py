from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from oauth2_provider.oauth2_validators import OAuth2Validator
from accounts.services.auth_service import AuthService

User = get_user_model()

class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if not username or not password:
            return None
        try:
            user = User.objects.get(email__iexact=username.lower())
        except User.DoesNotExist:
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None

class CustomOAuth2Validator(OAuth2Validator):
    def validate_user(self, client, grant_type, request, *args, **kwargs):
        if grant_type == 'google':
            id_token = request.POST.get('id_token')
            if not id_token:
                return False
            try:
                user = AuthService.google_authenticate(id_token)
                if user:
                    request.user = user
                    return True
            except Exception:
                return False
            return False
        return super().validate_user(client, grant_type, request, *args, **kwargs)
