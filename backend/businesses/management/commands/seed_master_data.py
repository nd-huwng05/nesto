import random
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Role, User
from businesses.models import Branch, Company
from rooms.models import BranchTheme, Room, RoomCategory, RoomTheme


THEMES = [
    ("Featured", "star"),
    ("Suite", "bed"),
    ("Family", "people"),
    ("Business", "briefcase"),
    ("Couples", "heart"),
    ("AI Picks", "sparkles"),
]

UNSPLASH_BRANCH = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1551887373-6d7f0e5d95c3?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1501117716987-c8e2a2b2c0b1?auto=format&fit=crop&w=1600&q=80",
]


class Command(BaseCommand):
    help = "Seed master demo data (themes + branches + rooms)"

    def add_arguments(self, parser):
        parser.add_argument("--branches", type=int, default=25)
        parser.add_argument("--rooms", type=int, default=80)

    @transaction.atomic
    def handle(self, *args, **options):
        branches_count = int(options["branches"])
        rooms_count = int(options["rooms"])

        admin, _ = User.objects.get_or_create(
            email="admin@nesto.local",
            defaults={"name": "Admin", "role": Role.SUPER_ADMIN, "is_staff": True, "is_superuser": True},
        )
        if not admin.has_usable_password():
            admin.set_password("Admin@123456")
            admin.save(update_fields=["password"])

        company, _ = Company.objects.get_or_create(manager=admin, name="Nesto Hotels")

        theme_rows = []
        for name, icon in THEMES:
            t, _ = RoomTheme.objects.get_or_create(name=name, defaults={"icon": icon})
            if not t.icon:
                t.icon = icon
                t.save(update_fields=["icon", "updated_at"])
            theme_rows.append(t)

        cities = [
            ("New York", "USA"),
            ("London", "UK"),
            ("Paris", "France"),
            ("Tokyo", "Japan"),
            ("Seoul", "Korea"),
            ("Singapore", "Singapore"),
            ("Sydney", "Australia"),
            ("Toronto", "Canada"),
            ("Dubai", "UAE"),
            ("Barcelona", "Spain"),
        ]

        branches = []
        for i in range(branches_count):
            city, country = random.choice(cities)
            b = Branch.objects.create(
                company=company,
                name=f"Nesto {city} Hotel {i+1}",
                address=f"{random.randint(10, 999)} {city} Central, {country}",
                phone=f"+1-555-{random.randint(1000,9999)}",
                email=f"hello-{i+1}@nesto.demo",
                images=random.sample(UNSPLASH_BRANCH, k=min(3, len(UNSPLASH_BRANCH))),
                is_active=True,
            )
            branches.append(b)
            for theme in random.sample(theme_rows, k=random.randint(1, 3)):
                BranchTheme.objects.get_or_create(branch=b, theme=theme)

        category_specs = [
            ("Basic", 250000, 2),
            ("Family", 420000, 4),
            ("Suite", 650000, 2),
            ("Business", 520000, 2),
            ("Couples", 480000, 2),
        ]

        categories = []
        for b in branches:
            for name, base, cap in category_specs:
                c, _ = RoomCategory.objects.get_or_create(
                    branch=b,
                    name=name,
                    defaults={"base_price": base, "capacity": cap, "description": f"{name} room with premium comfort."},
                )
                categories.append(c)

        existing = Room.objects.count()
        target_new = max(0, rooms_count - existing)
        for idx in range(target_new):
            b = random.choice(branches)
            floor = str(random.randint(1, 18))
            number = f"{floor}{random.randint(1, 20):02d}"
            cands = [c for c in categories if c.branch_id == b.id]
            cat = random.choice(cands) if cands else None
            Room.objects.create(branch=b, category=cat, room_number=number, floor=floor, status="AVAILABLE")

        self.stdout.write(self.style.SUCCESS(f"Seeded themes={len(theme_rows)} branches={len(branches)} rooms_total={Room.objects.count()}"))

