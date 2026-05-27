from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ['*']

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

INTERNAL_IPS = ['127.0.0.1']
