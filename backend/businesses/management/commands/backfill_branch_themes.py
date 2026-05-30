"""Assign customer catalog themes to branches that have none (or too few)."""

from django.core.management.base import BaseCommand

from rooms.services.customer_theme_service import assign_themes_to_branches, ensure_customer_themes


class Command(BaseCommand):
    help = "Ensure customer themes exist and link them to active branches."

    def handle(self, *args, **options):
        themes = ensure_customer_themes()
        linked = assign_themes_to_branches(themes=themes, min_per_branch=3)
        self.stdout.write(
            self.style.SUCCESS(
                f"Customer themes ready: {len(themes)} theme(s), {linked} new branch link(s)."
            )
        )
