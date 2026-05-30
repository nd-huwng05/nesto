"""
Django settings for nesto backend project.
Production-ready configuration with OAuth 2.0 authentication.
"""
from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-me-in-production')
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'oauth2_provider',
    'drf_spectacular',
    'channels',
    'cloudinary',
    'core',
    'accounts',
    'businesses',
    'rooms',
    'bookings',
    'staff',
    'service_orders',
    'payments',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database Configuration
DB_ENGINE = os.getenv('DB_ENGINE', 'django.db.backends.sqlite3')

if DB_ENGINE == 'django.db.backends.mysql':
    try:
        import MySQLdb  # noqa: F401
    except ImportError:
        DB_ENGINE = 'django.db.backends.sqlite3'

if DB_ENGINE == 'django.db.backends.mysql':
    DATABASES = {
        'default': {
            'ENGINE': DB_ENGINE,
            'NAME': os.getenv('DB_NAME', 'nesto'),
            'USER': os.getenv('DB_USER', 'nesto'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '3306'),
            'OPTIONS': {
                'charset': 'utf8mb4',
            },
        }
    }
elif DB_ENGINE == 'django.db.backends.postgresql':
    DATABASES = {
        'default': {
            'ENGINE': DB_ENGINE,
            'NAME': os.getenv('DB_NAME', 'nesto'),
            'USER': os.getenv('DB_USER', 'nesto'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': DB_ENGINE,
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Ho_Chi_Minh'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Redis Configuration (Channels layer requires Redis in production-like setups)
REDIS_URL = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')

def _channel_layer_hosts(redis_url: str):
    """Pass REDIS_URL to channels_redis (must keep user/password in URL)."""
    from urllib.parse import urlparse

    parsed = urlparse(redis_url)
    if parsed.scheme in {'redis', 'rediss'} and parsed.hostname:
        # Full URL preserves :password@ — tuple (host, port, db) drops auth and breaks Redis 6+.
        return [redis_url]

    return [redis_url]


CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": _channel_layer_hosts(REDIS_URL),
        },
    },
}

if REDIS_URL:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': REDIS_URL,
        }
    }
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
        }
    }
    SESSION_ENGINE = 'django.contrib.sessions.backends.db'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@nesto.local')
AUTH_USER_MODEL = 'accounts.User'

AUTHENTICATION_BACKENDS = [
    'accounts.backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# REST Framework with OAuth 2.0
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'oauth2_provider.contrib.rest_framework.OAuth2Authentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'EXCEPTION_HANDLER': 'core.services.exception_handlers.custom_exception_handler',
}

# OAuth2 Provider Settings
OAUTH_CLIENT_ID = os.getenv('OAUTH_CLIENT_ID', 'ggb9KpzfxhcaIof27VOtdTkLA5puE3J0tNsU68KO')

OAUTH2_PROVIDER = {
    'SCOPES': {
        'read': 'Read access',
        'write': 'Write access',
    },
    'ACCESS_TOKEN_EXPIRE_SECONDS': 3600,
    'REFRESH_TOKEN_EXPIRE_SECONDS': 86400,
    'ROTATE_REFRESH_TOKEN': True,
    'GRANT_TYPES': (
        'password',
        'refresh_token',
        'google',
    ),
    'ALLOWED_GRANT_TYPES': ['password', 'refresh_token', 'google'],
    'OAUTH2_VALIDATOR_CLASS': 'accounts.backends.CustomOAuth2Validator',
}

# CORS Settings
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
CORS_ALLOWED_ORIGINS = [
    FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]
CORS_ALLOW_CREDENTIALS = True

# API Documentation
SPECTACULAR_SETTINGS = {
    'TITLE': 'Nesto API',
    'DESCRIPTION': 'Hotel Management System API - Backend for Business, Staff, and Customer Operations',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# Cloudinary Configuration
import cloudinary

cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME', ''),
    api_key=os.getenv('CLOUDINARY_API_KEY', ''),
    api_secret=os.getenv('CLOUDINARY_API_SECRET', '')
)

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.channels': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY', '').strip()
SENDGRID_FROM_EMAIL = os.getenv('SENDGRID_FROM', '').strip()
EMAIL_FORCE_SMTP = os.getenv('EMAIL_FORCE_SMTP', '').lower() == 'true'

if SENDGRID_API_KEY and SENDGRID_FROM_EMAIL and (EMAIL_FORCE_SMTP or not DEBUG):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = 'smtp.sendgrid.net'
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
    EMAIL_HOST_USER = 'apikey'
    EMAIL_HOST_PASSWORD = SENDGRID_API_KEY
    DEFAULT_FROM_EMAIL = SENDGRID_FROM_EMAIL
else:
    EMAIL_BACKEND = os.getenv(
        'EMAIL_BACKEND',
        'django.core.mail.backends.console.EmailBackend',
    )
    EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')

MOMO_PARTNER_CODE = os.getenv('MOMO_PARTNER_CODE', 'MOMO')
MOMO_ACCESS_KEY = os.getenv('MOMO_ACCESS_KEY', '')
MOMO_SECRET_KEY = os.getenv('MOMO_SECRET_KEY', '')
MOMO_REDIRECT_URL = os.getenv('MOMO_REDIRECT_URL', 'https://nesto.local/payments/momo/return')
MOMO_IPN_URL = os.getenv('MOMO_IPN_URL', 'https://nesto.local/payments/momo/ipn')
MOMO_ENDPOINT = os.getenv('MOMO_ENDPOINT', 'https://test-payment.momo.vn/v2/gateway/api/create')
MOMO_QUERY_ENDPOINT = os.getenv('MOMO_QUERY_ENDPOINT', 'https://test-payment.momo.vn/v2/gateway/api/query')
MOMO_REFUND_ENDPOINT = os.getenv('MOMO_REFUND_ENDPOINT', 'https://test-payment.momo.vn/v2/gateway/api/refund')

ZALOPAY_APP_ID = os.getenv('ZALOPAY_APP_ID', '2553')
ZALOPAY_KEY1 = os.getenv('ZALOPAY_KEY1', '')
ZALOPAY_KEY2 = os.getenv('ZALOPAY_KEY2', '')
ZALOPAY_APP_USER = os.getenv('ZALOPAY_APP_USER', 'nesto_guest')
ZALOPAY_REDIRECT_URL = os.getenv('ZALOPAY_REDIRECT_URL', 'https://nesto.local/payments/zalopay/return')
ZALOPAY_ENDPOINT = os.getenv('ZALOPAY_ENDPOINT', 'https://sb-openapi.zalopay.vn/v2/create')
ZALOPAY_QUERY_ENDPOINT = os.getenv('ZALOPAY_QUERY_ENDPOINT', 'https://sb-openapi.zalopay.vn/v2/query')
ZALOPAY_REFUND_ENDPOINT = os.getenv('ZALOPAY_REFUND_ENDPOINT', 'https://sb-openapi.zalopay.vn/v2/refund')

# When true, or when gateway keys are missing, deposits are confirmed internally (dev/demo).
PAYMENTS_SANDBOX = os.getenv('PAYMENTS_SANDBOX', '').lower() in ('1', 'true', 'yes')

GOOGLE_OAUTH2_CLIENT_ID = os.getenv('GOOGLE_OAUTH2_CLIENT_ID', '').strip()
GOOGLE_OAUTH2_CLIENT_SECRET = os.getenv('GOOGLE_OAUTH2_CLIENT_SECRET', '').strip()
_raw_google_client_ids = os.getenv('GOOGLE_OAUTH2_CLIENT_IDS', '')
GOOGLE_OAUTH2_CLIENT_IDS = [
    cid.strip()
    for cid in (_raw_google_client_ids.split(',') if _raw_google_client_ids else [])
    if cid.strip()
]
if GOOGLE_OAUTH2_CLIENT_ID and GOOGLE_OAUTH2_CLIENT_ID not in GOOGLE_OAUTH2_CLIENT_IDS:
    GOOGLE_OAUTH2_CLIENT_IDS.insert(0, GOOGLE_OAUTH2_CLIENT_ID)

SOCIAL_AUTH_GOOGLE_OAUTH2_UTILS_ENDPOINT = (
    'https://oauth2.googleapis.com/tokeninfo'
)
