import secrets
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from oauth2_provider.models import Application

from accounts.models import Role
from accounts.services.role_sync_service import RoleSyncService

User = get_user_model()

class AuthService:
    @staticmethod
    def get_oauth2_application():
        client_id = getattr(settings, 'OAUTH_CLIENT_ID', 'ggb9KpzfxhcaIof27VOtdTkLA5puE3J0tNsU68KO')
        app, created = Application.objects.get_or_create(
            client_id=client_id,
            defaults={
                'name': 'Nesto Mobile App',
                'client_type': Application.CLIENT_PUBLIC,
                'authorization_grant_type': Application.GRANT_PASSWORD,
                'skip_authorization': True,
            },
        )
        changed = False
        if app.client_type != Application.CLIENT_PUBLIC:
            app.client_type = Application.CLIENT_PUBLIC
            changed = True
        if app.authorization_grant_type != Application.GRANT_PASSWORD:
            app.authorization_grant_type = Application.GRANT_PASSWORD
            changed = True
        if not app.skip_authorization:
            app.skip_authorization = True
            changed = True
        if changed:
            app.save(update_fields=['client_type', 'authorization_grant_type', 'skip_authorization'])
        return app

    @staticmethod
    def build_session_claims(user):
        """Minimal routing claims for auth responses — full profile lives on /accounts/users/me/."""
        from accounts.services.role_sync_service import resolve_ui_flow

        return {
            "role": getattr(user, "role", None),
            "ui_flow": resolve_ui_flow(user),
        }

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
            "access_token": access_token.token,
            "refresh_token": refresh_token.token,
            "expires_in": 86400,
            "token_type": "Bearer",
            **AuthService.build_session_claims(user),
        }

    @staticmethod
    def _google_client_ids():
        configured = list(getattr(settings, 'GOOGLE_OAUTH2_CLIENT_IDS', []) or [])
        primary = getattr(settings, 'GOOGLE_OAUTH2_CLIENT_ID', None)
        if primary and primary not in configured:
            configured.insert(0, primary)
        return [cid for cid in configured if cid]

    @staticmethod
    def google_authenticate(id_token_str):
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        client_ids = AuthService._google_client_ids()
        if not client_ids:
            raise ValueError('GOOGLE_OAUTH2_CLIENT_ID not configured')

        info = None
        for google_client_id in client_ids:
            try:
                info = id_token.verify_oauth2_token(
                    id_token_str,
                    google_requests.Request(),
                    google_client_id,
                )
                if info:
                    break
            except Exception:
                continue

        if not info:
            raise ValueError('Invalid Google ID token')

        email = info.get('email')
        if not email:
            raise ValueError('Google token missing email')

        email_lower = email.lower()
        google_sub = str(info.get('sub') or '')
        user, created = User.objects.get_or_create(
            email=email_lower,
            defaults={
                'is_active': True,
                'role': Role.CUSTOMER,
                'name': info.get('name', '') or '',
            },
        )

        updates = []
        if created:
            user.set_unusable_password()
            updates.extend(['password'])
        if not user.name and info.get('name'):
            user.name = info.get('name')
            updates.append('name')
        if not user.is_active:
            user.is_active = True
            updates.append('is_active')
        if created or not user.role:
            user.role = user.role or Role.CUSTOMER
            updates.append('role')
        if updates:
            user.save(update_fields=list(dict.fromkeys(updates + ['updated_at'])))

        if google_sub:
            from accounts.models import Provider, UserAuthMethod

            UserAuthMethod.objects.update_or_create(
                provider=Provider.GOOGLE,
                provider_user_id=google_sub,
                defaults={
                    'user': user,
                    'is_verified': bool(info.get('email_verified')),
                    'metadata': {
                        'email': email_lower,
                        'picture': info.get('picture'),
                    },
                },
            )

        RoleSyncService.sync_user_groups(user)
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
        mobile_url = f"nesto://reset-password?uid={user.pk}&token={token}"
        try:
            send_mail(
                subject='Reset your Nesto password',
                message=(
                    f'Click the link to reset your password: {reset_url}\n\n'
                    f'On the Nesto mobile app, open: {mobile_url}\n\n'
                    f'This link expires in 24 hours.'
                ),
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
