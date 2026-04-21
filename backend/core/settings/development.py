"""Development settings."""

from .base import *

if not SECRET_KEY:
    SECRET_KEY = "django-insecure-dev-only-do-not-use-in-production"

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(BASE_DIR / "db.sqlite3"),
    }
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
REFRESH_COOKIE_SECURE = False