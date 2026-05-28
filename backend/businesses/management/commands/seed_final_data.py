import random
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User, Role
from businesses.models import Company, Branch
from rooms.models import RoomCategory, Room


UNSPLASH_BRANCH = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1551887373-6d7f0e5d95c3?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1501117716987-c8e2a2b2c0b1?auto=format&fit=crop&w=1600&q=80",
]

UNSPLASH_ROOMS = [
    "https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1600&q=80",
]


def _pick(images, n=3):
    return random.sample(images, k=min(n, len(images)))


class Command(BaseCommand):
    help = "Seed final demo data (branches, categories, rooms)"

    def add_arguments(self, parser):
        parser.add_argument("--branches", type=int, default=20)
        parser.add_argument("--rooms", type=int, default=60)

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
            b, _ = Branch.objects.get_or_create(
                company=company,
                name=f"Nesto {city} Hotel {i+1}",
                defaults={
                    "address": f"{random.randint(10, 999)} {city} Central, {country}",
                    "phone": f"+1-555-{random.randint(1000,9999)}",
                    "email": f"hello-{i+1}@nesto.demo",
                    "images": _pick(UNSPLASH_BRANCH, 3),
                    "is_active": True,
                },
            )
            if not b.images:
                b.images = _pick(UNSPLASH_BRANCH, 3)
                b.save(update_fields=["images", "updated_at"])
            branches.append(b)

        category_specs = [
            ("Basic", 250000, 2),
            ("Family", 420000, 4),
            ("Suite", 650000, 2),
        ]

        categories = []
        for b in branches:
            for name, base, cap in category_specs:
                c, _ = RoomCategory.objects.get_or_create(
                    branch=b,
                    name=name,
                    defaults={
                        "base_price": base,
                        "capacity": cap,
                        "description": f"{name} room with premium comfort and modern amenities.",
                        "images": _pick(UNSPLASH_ROOMS, 3),
                    },
                )
                if not c.images:
                    c.images = _pick(UNSPLASH_ROOMS, 3)
                    c.save(update_fields=["images", "updated_at"])
                categories.append(c)

        existing_rooms = Room.objects.count()
        target_new = max(0, rooms_count - existing_rooms)
        for idx in range(target_new):
            b = random.choice(branches)
            cands = [c for c in categories if c.branch_id == b.id]
            cat = random.choice(cands) if cands else None
            floor = str(random.randint(1, 12))
            number = f"{floor}{random.randint(1, 20):02d}"
            Room.objects.create(
                branch=b,
                category=cat,
                room_number=number,
                floor=floor,
                status="AVAILABLE",
            )

        self.stdout.write(self.style.SUCCESS(f"Seeded branches={len(branches)} categories={len(categories)} rooms_total={Room.objects.count()}"))

