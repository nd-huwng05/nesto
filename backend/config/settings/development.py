from .base import *  # noqa: F401,F403

import os

from core.utils.network import get_lan_ipv4_addresses



DEBUG = True

ALLOWED_HOSTS = ['*']



CORS_ALLOW_ALL_ORIGINS = True

_dev_port = os.getenv('DJANGO_DEV_PORT', '8000')
_csrf_origins = {
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    f'http://localhost:{_dev_port}',
    f'http://127.0.0.1:{_dev_port}',
}
for ip in get_lan_ipv4_addresses():
    _csrf_origins.add(f'http://{ip}:{_dev_port}')
    _csrf_origins.add(f'http://{ip}:8081')
_extra_csrf = os.getenv('CSRF_TRUSTED_ORIGINS', '')
for origin in _extra_csrf.split(','):
    origin = origin.strip()
    if origin:
        _csrf_origins.add(origin)
CSRF_TRUSTED_ORIGINS = sorted(_csrf_origins)



INTERNAL_IPS = ['127.0.0.1']



# MoMo / ZaloPay sandbox demo keys — mở trang thanh toán bên thứ 3 (test gateway), không mock nội bộ

if not os.getenv('MOMO_ACCESS_KEY', '').strip():

    MOMO_ACCESS_KEY = 'F8BBA566ECFA41CAA0A2345D3BF5EF6'

if not os.getenv('MOMO_SECRET_KEY', '').strip():

    MOMO_SECRET_KEY = 'K951B6RS2CDMNTMXN4J9Q67UU2UZ18UJ'

if not os.getenv('MOMO_PARTNER_CODE', '').strip():

    MOMO_PARTNER_CODE = 'MOMO'

if not os.getenv('ZALOPAY_KEY1', '').strip():

    ZALOPAY_KEY1 = 'pcwlbd5szpfhp2k'

if not os.getenv('ZALOPAY_KEY2', '').strip():

    ZALOPAY_KEY2 = 'kLtgPl8mHBTrxO1gE2EZCPy9aZb5X'

if not os.getenv('ZALOPAY_APP_ID', '').strip():

    ZALOPAY_APP_ID = '2553'



# Luôn redirect sang MoMo/ZaloPay — chỉ bật mock nội bộ khi set PAYMENTS_SANDBOX=true

PAYMENTS_SANDBOX = os.getenv('PAYMENTS_SANDBOX', '').lower() in ('1', 'true', 'yes')



# WebSocket (Channels): dev mặc định in-memory — không phụ thuộc Redis remote.

if os.getenv('CHANNEL_LAYER_REDIS', '').lower() not in ('1', 'true', 'yes'):

    CHANNEL_LAYERS = {

        'default': {

            'BACKEND': 'channels.layers.InMemoryChannelLayer',

        },

    }



# Cache/session: tránh timeout Redis remote khi develop local

if os.getenv('USE_REDIS_CACHE', '').lower() not in ('1', 'true', 'yes'):

    CACHES = {

        'default': {

            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',

            'LOCATION': 'unique-snowflake',

        },

    }

    SESSION_ENGINE = 'django.contrib.sessions.backends.db'

