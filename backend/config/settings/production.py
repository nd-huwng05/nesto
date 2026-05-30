import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403

DEBUG = False

_secret_key = os.getenv('SECRET_KEY', '').strip()
if not _secret_key or _secret_key == 'django-insecure-change-me-in-production':
    raise ImproperlyConfigured('Set a strong SECRET_KEY environment variable in production.')
SECRET_KEY = _secret_key

if not os.getenv('REDIS_URL', '').strip():
    raise ImproperlyConfigured('REDIS_URL is required in production for WebSocket channel layers and caching.')

allowed_hosts = os.getenv('ALLOWED_HOSTS', '')
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts.split(',') if host.strip()]
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured('ALLOWED_HOSTS must list at least one host in production.')

_db_engine = os.getenv('DB_ENGINE', 'django.db.backends.sqlite3')
_db_config = {
    'ENGINE': _db_engine,
    'NAME': os.getenv('DB_NAME', str(BASE_DIR / 'db.sqlite3')),
    'USER': os.getenv('DB_USER', ''),
    'PASSWORD': os.getenv('DB_PASSWORD', ''),
    'HOST': os.getenv('DB_HOST', ''),
    'PORT': os.getenv('DB_PORT', ''),
}
if _db_engine == 'django.db.backends.mysql':
    _db_config['OPTIONS'] = {'charset': 'utf8mb4'}
DATABASES = {'default': _db_config}

EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
_cors_origins = [
    origin.strip()
    for origin in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
    if origin.strip()
]
if not _cors_origins:
    raise ImproperlyConfigured('CORS_ALLOWED_ORIGINS must list at least one origin in production.')
CORS_ALLOWED_ORIGINS = _cors_origins

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'true').lower() == 'true'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
