import logging
import secrets

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


class OTPService:
    OTP_PREFIX = 'otp_'
    REGISTER_TOKEN_PREFIX = 'register_token_'
    OTP_EXPIRY_MINUTES = 5
    REGISTER_TOKEN_EXPIRY_MINUTES = 30

    @classmethod
    def generate_otp(cls, email, purpose='REGISTER'):
        email_lower = email.lower().strip()
        cache_key = f"{cls.OTP_PREFIX}{purpose}_{email_lower}"
        existing_otp = cache.get(cache_key)
        if existing_otp:
            logger.debug("Returning existing OTP for %s", email_lower)
            return existing_otp
        otp_code = f"{secrets.randbelow(1000000):06d}"
        cache.set(cache_key, otp_code, timeout=cls.OTP_EXPIRY_MINUTES * 60)
        logger.debug("Generated new OTP for %s", email_lower)
        return otp_code

    @classmethod
    def generate_and_send_otp(cls, email, purpose='REGISTER'):
        """Generate OTP, store in cache, and attempt email delivery.

        Returns (success, otp_code). In DEBUG, success is True even when email fails
        so local registration can continue (OTP appears in console / dev_otp response).
        """
        otp_code = cls.generate_otp(email, purpose)
        try:
            send_mail(
                subject='Your Nesto verification code',
                message=(
                    f'Your verification code is: {otp_code}\n\n'
                    f'This code expires in {cls.OTP_EXPIRY_MINUTES} minutes.\n\n'
                    f'If you did not request this code, please ignore this email.'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            return True, otp_code
        except Exception as exc:
            logger.warning("Failed to send OTP email to %s: %s", email, exc)
            if settings.DEBUG:
                logger.info("[DEV] OTP for %s (%s): %s", email, purpose, otp_code)
                print(f"[DEV OTP] {email} ({purpose}): {otp_code}")
                return True, otp_code
            return False, otp_code

    @classmethod
    def verify_otp(cls, email, purpose='REGISTER', user_otp=None):
        if not user_otp:
            return False
        email_lower = email.lower().strip()
        cache_key = f"{cls.OTP_PREFIX}{purpose}_{email_lower}"
        stored_otp = cache.get(cache_key)
        if not stored_otp:
            return False
        is_valid = secrets.compare_digest(str(stored_otp), str(user_otp))
        if is_valid:
            cache.delete(cache_key)
        return is_valid

    @classmethod
    def generate_register_token(cls, email):
        token = secrets.token_urlsafe(32)
        cache_key = f"{cls.REGISTER_TOKEN_PREFIX}{email.lower()}"
        cache.set(cache_key, token, timeout=cls.REGISTER_TOKEN_EXPIRY_MINUTES * 60)
        return token

    @classmethod
    def verify_register_token(cls, email, token):
        cache_key = f"{cls.REGISTER_TOKEN_PREFIX}{email.lower()}"
        stored_token = cache.get(cache_key)
        if not stored_token:
            return False
        is_valid = secrets.compare_digest(stored_token, token)
        if is_valid:
            cache.delete(cache_key)
        return is_valid
