import secrets
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from oauth2_provider.models import Application

User = get_user_model()

class AuthService:
    @staticmethod
    def get_oauth2_application():
        client_id = getattr(settings, 'OAUTH_CLIENT_ID', 'ggb9KpzfxhcaIof27VOtdTkLA5puE3J0tNsU68KO')
        app, _ = Application.objects.get_or_create(
            client_id=client_id,
            defaults={
                'name': 'Nesto Mobile App',
                'client_type': Application.CLIENT_PUBLIC,
                'authorization_grant_type': Application.GRANT_PASSWORD,
                'skip_authorization': True,
            }
        )
        return app

    @staticmethod
    def generate_tokens(user):
        app = AuthService.get_oauth2_application()
        from oauth2_provider.models import AccessToken, RefreshToken
        access_token = AccessToken.objects.create(
            user=user, application=app, token=secrets.token_urlsafe(32),
            expires=timezone.now() + timedelta(hours=24), scope='read write',
        )
        refresh_token = RefreshToken.objects.create(
            user=user, application=app, token=secrets.token_urlsafe(32), access_token=access_token,
        )
        return {
            'access_token': access_token.token, 'refresh_token': refresh_token.token,
            'expires_in': 86400, 'token_type': 'Bearer',
        }

    @staticmethod
    def google_authenticate(id_token_str):
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
        google_client_id = getattr(settings, 'GOOGLE_OAUTH2_CLIENT_ID', None)
        if not google_client_id:
            raise ValueError('GOOGLE_OAUTH2_CLIENT_ID not configured')
        try:
            info = id_token.verify_oauth2_token(id_token_str, google_requests.Request(), google_client_id)
        except Exception:
            raise ValueError('Invalid Google ID token')

        email = info.get('email')
        if not email:
            raise ValueError('Google token missing email')

        user, created = User.objects.get_or_create(
            email=email.lower(),
            defaults={'is_active': True}
        )
        if created:
            user.name = info.get('name', '')
            user.set_unusable_password()
            user.save()
        return user

    @staticmethod
    def send_reset_password_email(email):
        try:
            user = User.objects.get(email=email.lower())
        except User.DoesNotExist:
            return {'success': True, 'message': 'If an account exists, a reset link has been sent.'}
        from django.contrib.auth.tokens import default_token_generator
        token = default_token_generator.make_token(user)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?uid={user.pk}&token={token}"
        try:
            send_mail(
                subject='Reset your Nesto password',
                message=f'Click the link to reset your password: {reset_url}\n\nThis link expires in 24 hours.',
                from_email=settings.DEFAULT_FROM_EMAIL, recipient_list=[email], fail_silently=False,
            )
        except Exception as e:
            print(f"[Email Error] Failed to send reset password email to {email}: {e}")
            return {'success': False, 'message': 'Failed to send reset email due to a server error.'}
        return {'success': True, 'message': 'If an account exists, a reset link has been sent.'}

    @staticmethod
    def reset_password(token, uid, new_password):
        try:
            user = User.objects.get(pk=uid)
        except User.DoesNotExist:
            return {'success': False, 'message': 'Invalid user.'}
        from django.contrib.auth.tokens import default_token_generator
        if not default_token_generator.check_token(user, token):
            return {'success': False, 'message': 'Invalid or expired token.'}
        user.set_password(new_password)
        user.save()
        return {'success': True, 'message': 'Password reset successful.'}
