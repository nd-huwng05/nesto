import math
import random
from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Role, User
from businesses.models import Branch, Company
from rooms.models import BranchTheme, Room, RoomCategory, RoomTheme, RoomThemeLink


THEMES = [
    ("AI ✨", "sparkles"),
    ("ALL", "apps"),
    ("Featured", "star"),
    ("Family", "people"),
    ("Suite", "bed"),
    ("Luxury", "diamond"),
    ("View", "image"),
    ("Budget", "pricetag"),
]

BRANCH_IMAGES = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1551887373-6d7f0e5d95c3?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1501117716987-c8e2a2b2c0b1?auto=format&fit=crop&w=1600&q=80",
]

ROOM_IMAGES = [
    "https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1600&q=80",
]


def jitter(val, delta):
    return float(val) + random.uniform(-delta, delta)


def pick_many(items, k):
    return random.sample(items, k=min(k, len(items)))


class Command(BaseCommand):
    help = "Seed everything for demo: themes, branches with lat/lng, rooms with room themes"

    def add_arguments(self, parser):
        parser.add_argument("--branches", type=int, default=24)
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

        ai_theme = next((t for t in theme_rows if t.name == "AI ✨"), None)

        cities = [
            ("San Francisco", "USA", 37.7749, -122.4194),
            ("New York", "USA", 40.7128, -74.0060),
            ("London", "UK", 51.5074, -0.1278),
            ("Paris", "France", 48.8566, 2.3522),
            ("Tokyo", "Japan", 35.6762, 139.6503),
            ("Seoul", "Korea", 37.5665, 126.9780),
            ("Singapore", "Singapore", 1.3521, 103.8198),
            ("Sydney", "Australia", -33.8688, 151.2093),
            ("Toronto", "Canada", 43.6532, -79.3832),
            ("Dubai", "UAE", 25.2048, 55.2708),
            ("Barcelona", "Spain", 41.3851, 2.1734),
            ("Rome", "Italy", 41.9028, 12.4964),
        ]

        branches = []
        for i in range(branches_count):
            city, country, base_lat, base_lng = random.choice(cities)
            name = f"{random.choice(['Aurora', 'Cobalt', 'Opal', 'Zenith', 'Elysian', 'Nova'])} {city} Hotel"
            b = Branch.objects.create(
                company=company,
                name=f"{name} {i+1}",
                address=f"{random.randint(10, 999)} {city} Central, {country}",
                phone=f"+1-555-{random.randint(1000,9999)}",
                email=f"hello-{i+1}@nesto.demo",
                images=pick_many(BRANCH_IMAGES, 3),
                latitude=jitter(base_lat, 0.07),
                longitude=jitter(base_lng, 0.07),
                is_active=True,
            )
            branches.append(b)

        cat_specs = [
            ("Budget", 190000, 2),
            ("Family", 420000, 4),
            ("Suite", 650000, 2),
            ("Luxury", 990000, 2),
        ]

        categories = []
        for b in branches:
            for name, base, cap in cat_specs:
                c, _ = RoomCategory.objects.get_or_create(
                    branch=b,
                    name=name,
                    defaults={
                        "base_price": base,
                        "capacity": cap,
                        "description": f"{name} stay with premium comfort.",
                        "images": pick_many(ROOM_IMAGES, 3),
                    },
                )
                if not c.images:
                    c.images = pick_many(ROOM_IMAGES, 3)
                    c.save(update_fields=["images", "updated_at"])
                categories.append(c)

        created_rooms = []
        existing_rooms = Room.objects.count()
        target_new = max(0, rooms_count - existing_rooms)
        for idx in range(target_new):
            b = random.choice(branches)
            floor = str(random.randint(1, 18))
            number = f"{floor}{random.randint(1, 20):02d}"
            bcats = [c for c in categories if c.branch_id == b.id]
            cat = random.choice(bcats) if bcats else None
            r = Room.objects.create(branch=b, category=cat, room_number=number, floor=floor, status="AVAILABLE")
            created_rooms.append(r)

        all_rooms = list(Room.objects.select_related("branch", "category").all())
        for r in all_rooms:
            desired = pick_many(theme_rows, 2)
            if ai_theme and random.random() < 0.18:
                desired = list({*desired, ai_theme})
            for t in desired:
                RoomThemeLink.objects.get_or_create(room=r, theme=t)

        room_ids = [str(r.id) for r in all_rooms]
        random.shuffle(room_ids)
        theme_by_name = {t.name: t for t in theme_rows}
        per_theme_target = 5
        for theme in theme_rows:
            current = RoomThemeLink.objects.filter(theme=theme).values_list("room_id", flat=True)
            current_set = {str(x) for x in current}
            missing = max(0, per_theme_target - len(current_set))
            if missing == 0:
                continue
            candidates = [rid for rid in room_ids if rid not in current_set]
            for rid in candidates[:missing]:
                RoomThemeLink.objects.get_or_create(room_id=rid, theme=theme)

        ai_rooms = RoomThemeLink.objects.filter(theme=ai_theme).values_list("room_id", flat=True)[:50] if ai_theme else []
        ai_branch_ids = list(Room.objects.filter(id__in=list(ai_rooms)).values_list("branch_id", flat=True).distinct())
        for bid in ai_branch_ids:
            BranchTheme.objects.get_or_create(branch_id=bid, theme=ai_theme)

        for b in branches:
            for t in random.sample(theme_rows, k=random.randint(2, 4)):
                BranchTheme.objects.get_or_create(branch=b, theme=t)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded themes={RoomTheme.objects.count()} branches={len(branches)} rooms_total={Room.objects.count()}"
            )
        )

