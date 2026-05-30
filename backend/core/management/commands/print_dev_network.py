"""Print LAN URLs for Expo physical device testing."""

from django.core.management.base import BaseCommand

from core.utils.network import get_lan_ipv4_addresses, primary_lan_ip


class Command(BaseCommand):
    help = "Show API URLs and .env hints for iPhone/Android on the same WiFi."

    def handle(self, *args, **options):
        port = "8000"
        ips = get_lan_ipv4_addresses() or [primary_lan_ip()]
        primary = ips[0]

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("NESTO — PHYSICAL DEVICE NETWORK SETUP"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write("")
        self.stdout.write("1) Start Django bound to all interfaces:")
        self.stdout.write(self.style.NOTICE(f"   python manage.py runserver 0.0.0.0:{port}"))
        self.stdout.write("")
        self.stdout.write("2) In frontend/.env set (PC and phone on same WiFi):")
        self.stdout.write(self.style.NOTICE(f"   EXPO_PUBLIC_DEV_API_HOST={primary}"))
        self.stdout.write(self.style.NOTICE(f"   EXPO_PUBLIC_USE_LOCAL_API=true"))
        self.stdout.write("")
        self.stdout.write("3) Restart Expo: npx expo start -c")
        self.stdout.write("")
        self.stdout.write("Detected LAN IP(s):")
        for ip in ips:
            self.stdout.write(f"  http://{ip}:{port}/api/v1")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
