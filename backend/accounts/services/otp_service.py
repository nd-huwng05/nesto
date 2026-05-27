import secrets
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail

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
            print(f"[DEBUG OTP] Returning existing OTP for {email_lower}: {existing_otp}")
            return existing_otp
        otp_code = f"{secrets.randbelow(1000000):06d}"
        cache.set(cache_key, otp_code, timeout=cls.OTP_EXPIRY_MINUTES * 60)
        print(f"[DEBUG OTP] Generated NEW OTP for {email_lower}: {otp_code}")
        return otp_code

    @classmethod
    def generate_and_send_otp(cls, email, purpose='REGISTER'):
        otp_code = cls.generate_otp(email, purpose)
        try:
            send_mail(
                subject='Your Nesto verification code',
                message=f'Your verification code is: {otp_code}\n\n'
                        f'This code expires in {cls.OTP_EXPIRY_MINUTES} minutes.\n\n'
                        f'If you did not request this code, please ignore this email.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"[Email Error] Failed to send OTP email to {email}: {e}")
            if settings.DEBUG:
                print(f"[DEV] OTP for {email}: {otp_code}")
            return False
        return True

    @classmethod
    def verify_otp(cls, email, purpose='REGISTER', user_otp=None):
        if not user_otp:
            return False
        email_lower = email.lower().strip()
        cache_key = f"{cls.OTP_PREFIX}{purpose}_{email_lower}"
        stored_otp = cache.get(cache_key)
        print(f"[DEBUG OTP VERIFY] Email: {email_lower}, Cache Key: {cache_key}, Stored OTP: {stored_otp}, User OTP: {user_otp}")
        if not stored_otp:
            return False
        is_valid = secrets.compare_digest(str(stored_otp), str(user_otp))
        print(f"[DEBUG OTP VERIFY] Comparison result: {is_valid}")
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
