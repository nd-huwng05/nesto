from django.core.management.base import BaseCommand

from bookings.services.hold_service import enforce_all_overdue_no_shows


class Command(BaseCommand):
    help = "Cancel bookings that exceeded their late-hold deadline (no-show)."

    def handle(self, *args, **options):
        count = enforce_all_overdue_no_shows()
        self.stdout.write(self.style.SUCCESS(f"Processed {count} overdue booking(s)."))
