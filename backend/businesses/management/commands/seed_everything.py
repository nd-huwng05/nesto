import math
import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import Role, User
from bookings.services.hold_service import calculate_deposit_amount
from bookings.models import Booking, ReviewForumPost
from businesses.models import Branch, Company
from rooms.models import BranchTheme, HousekeepingTask, Room, RoomCategory, RoomTheme, RoomThemeLink
from rooms.services.pricing_service import calculate_tiered_room_price
from service_orders.models import ExtraService, ServiceOrder
from staff.models import StaffProfile


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

BRANCH_SERVICE_TEMPLATES = [
    ("Airport Transfer", 350000, "car-sport-outline", "TRANSPORT"),
    ("Breakfast Buffet", 220000, "restaurant-outline", "RESTAURANT"),
    ("Spa Package", 680000, "flower-outline", "SPA"),
    ("Late Checkout", 200000, "time-outline", "ROOM_SERVICE"),
    ("Laundry Express", 120000, "shirt-outline", "ROOM_SERVICE"),
]

ROOM_IMAGES = [
    "https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1600&q=80",
]

# Inventory used by branch-room-types availability API (counts AVAILABLE rooms per category).
AVAILABLE_ROOMS_PER_CATEGORY = 50

LOCKET_IMAGES = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551887373-6d7f0e5d95c3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1611892440504-42a988e24fbe?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80",
]

LOCKET_CAPTIONS = [
    "The view is very beautiful!",
    "Amazing pool side experience.",
    "Best stay ever!",
    "Loved the sunrise from our room.",
    "Staff were incredibly welcoming.",
    "Perfect weekend getaway.",
    "The suite was spotless and cozy.",
    "Will definitely come back!",
]

LOCKET_GUEST_PROFILES = [
    ("Mia Chen", "locket.guest1@nesto.demo"),
    ("James Wilson", "locket.guest2@nesto.demo"),
    ("Sofia Martinez", "locket.guest3@nesto.demo"),
    ("Liam Nguyen", "locket.guest4@nesto.demo"),
    ("Emma Dubois", "locket.guest5@nesto.demo"),
    ("Noah Patel", "locket.guest6@nesto.demo"),
    ("Ava Thompson", "locket.guest7@nesto.demo"),
    ("Ethan Brooks", "locket.guest8@nesto.demo"),
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
        parser.add_argument(
            "--reset-inventory",
            action="store_true",
            help="Release active booking room assignments and reset all rooms to AVAILABLE.",
        )

    def _ensure_owner(self):
        owner, _ = User.objects.get_or_create(
            email="owner@nesto.com",
            defaults={
                "name": "Nesto Business Owner",
                "role": Role.BUSINESS_OWNER,
                "is_staff": True,
            },
        )
        if not owner.has_usable_password():
            owner.set_password("Test@1234")
            owner.save(update_fields=["password"])
        return owner

    def _seed_tenant_operations(self, company, branches, categories):
        customer, _ = User.objects.get_or_create(
            email="customer@nesto.com",
            defaults={"name": "Nesto Customer", "role": Role.CUSTOMER},
        )
        if not customer.has_usable_password():
            customer.set_password("Test@1234")
            customer.save(update_fields=["password"])

        primary_branch = branches[0] if branches else None
        if not primary_branch:
            return {"bookings": 0, "tasks": 0, "orders": 0}

        branch_categories = [c for c in categories if c.branch_id == primary_branch.id]
        category = branch_categories[0] if branch_categories else None
        rooms = list(
            Room.objects.filter(branch=primary_branch, category=category).order_by("room_number")[:8]
        )
        if not rooms:
            return {"bookings": 0, "tasks": 0, "orders": 0}

        now = timezone.now()
        booking_specs = [
            {"suffix": "PEND", "status": Booking.Status.PENDING, "offset_hours": 24, "duration_hours": 4, "room": None},
            {"suffix": "CONF", "status": Booking.Status.CONFIRMED, "offset_hours": 12, "duration_hours": 6, "room": None},
            {"suffix": "IN", "status": Booking.Status.CHECKED_IN, "offset_hours": -2, "duration_hours": 8, "room": rooms[2]},
            {"suffix": "OUT", "status": Booking.Status.CHECKED_OUT, "offset_hours": -48, "duration_hours": 6, "room": rooms[3]},
            {"suffix": "CAN", "status": Booking.Status.CANCELLED, "offset_hours": 72, "duration_hours": 4, "room": None},
        ]

        bookings_created = 0
        for spec in booking_specs:
            check_in = now + timedelta(hours=spec["offset_hours"])
            check_out = check_in + timedelta(hours=spec["duration_hours"])
            pricing = calculate_tiered_room_price(category, check_in, check_out) if category else {}
            room_total = int(pricing.get("roomTotal") or 0)
            deposit_pct = 20
            deposit_amount = calculate_deposit_amount(room_total, deposit_pct)
            code = f"SEED-{str(primary_branch.id).replace('-', '')[:6]}-{spec['suffix']}"
            booking, created = Booking.objects.get_or_create(
                booking_code=code,
                defaults={
                    "branch": primary_branch,
                    "customer": customer,
                    "guest_name": customer.name or "Demo Guest",
                    "email": customer.email,
                    "phone": "0900000000",
                    "status": spec["status"],
                    "room": spec["room"],
                    "room_category": category,
                    "room_type": str(getattr(category, "name", "") or "Standard"),
                    "hotel_name": primary_branch.name,
                    "hotel_address": primary_branch.address or "",
                    "check_in_at": check_in if spec["status"] in {Booking.Status.CHECKED_IN, Booking.Status.CHECKED_OUT} else None,
                    "expected_check_out_at": check_out,
                    "check_out_at": check_out if spec["status"] == Booking.Status.CHECKED_OUT else None,
                    "hourly_rate": int(pricing.get("pricePerHour") or 0),
                    "room_price": room_total,
                    "base_price": room_total,
                    "deposit_percentage": deposit_pct,
                    "deposit_amount": deposit_amount if spec["status"] != Booking.Status.CHECKED_OUT else 0,
                },
            )
            if created:
                bookings_created += 1
            if spec["room"] and spec["status"] == Booking.Status.CHECKED_IN:
                spec["room"].status = "OCCUPIED"
                spec["room"].save(update_fields=["status", "updated_at"])

        tasks_created = 0
        dirty_rooms = rooms[4:7]
        for room in dirty_rooms:
            room.status = "DIRTY"
            room.save(update_fields=["status", "updated_at"])
            task, created = HousekeepingTask.objects.get_or_create(
                branch=primary_branch,
                room=room,
                status=HousekeepingTask.Status.PENDING,
                defaults={"note": f"Auto-seeded turnover for room {room.room_number}"},
            )
            if created:
                tasks_created += 1

        orders_created = 0
        checked_in = Booking.objects.filter(branch=primary_branch, status=Booking.Status.CHECKED_IN).first()
        if checked_in:
            extra_services = list(ExtraService.objects.filter(branch=primary_branch)[:3])
            for idx, service in enumerate(extra_services):
                order, created = ServiceOrder.objects.get_or_create(
                    branch=primary_branch,
                    booking=checked_in,
                    category=service.category,
                    guest_name=customer.name or "Guest",
                    defaults={
                        "status": "PENDING" if idx == 0 else ("IN_PROGRESS" if idx == 1 else "COMPLETED"),
                        "room_number": str(getattr(checked_in.room, "room_number", "") or ""),
                        "guest_phone": "0900000000",
                        "items": [{"name": service.name, "amount": int(service.price or 0)}],
                        "amount": int(service.price or 0),
                    },
                )
                if created:
                    orders_created += 1

        reception_user = User.objects.filter(email="reception@nesto.com").first()
        if reception_user:
            StaffProfile.objects.get_or_create(
                user=reception_user,
                branch=primary_branch,
                defaults={
                    "department": StaffProfile.Department.RECEPTIONIST,
                    "job_role": "Receptionist",
                },
            )
        housekeeping_user = User.objects.filter(email="housekeeping@nesto.com").first()
        if housekeeping_user:
            StaffProfile.objects.get_or_create(
                user=housekeeping_user,
                branch=primary_branch,
                defaults={
                    "department": StaffProfile.Department.HOUSEKEEPING,
                    "job_role": "Housekeeper",
                },
            )

        return {"bookings": bookings_created, "tasks": tasks_created, "orders": orders_created}

    @transaction.atomic
    def handle(self, *args, **options):
        branches_count = int(options["branches"])
        rooms_count = int(options["rooms"])
        reset_inventory = bool(options.get("reset_inventory"))

        admin, _ = User.objects.get_or_create(
            email="admin@nesto.local",
            defaults={"name": "Admin", "role": Role.SUPER_ADMIN, "is_staff": True, "is_superuser": True},
        )
        if not admin.has_usable_password():
            admin.set_password("Admin@123456")
            admin.save(update_fields=["password"])

        owner = self._ensure_owner()
        company, _ = Company.objects.get_or_create(manager=owner, name="Nesto Hotels")
        if company.manager_id != owner.id:
            company.manager = owner
            company.save(update_fields=["manager", "updated_at"])

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
            r = Room.objects.create(
                branch=b,
                category=cat,
                room_number=number,
                floor=floor,
                status="AVAILABLE",
            )
            created_rooms.append(r)

        # Guarantee bookable inventory: each room type (category) keeps a healthy AVAILABLE pool.
        rooms_repaired = 0
        for cat in categories:
            available_now = Room.objects.filter(category=cat, status="AVAILABLE").count()
            needed = max(0, AVAILABLE_ROOMS_PER_CATEGORY - available_now)
            for n in range(needed):
                floor = str(random.randint(1, 18))
                unique_tail = str(cat.id).replace("-", "")[:6]
                number = f"{floor}{unique_tail}{n:02d}"[-8:]
                Room.objects.create(
                    branch_id=cat.branch_id,
                    category=cat,
                    room_number=number,
                    floor=floor,
                    status="AVAILABLE",
                )
                rooms_repaired += 1

            Room.objects.filter(category=cat).exclude(status="AVAILABLE").update(status="AVAILABLE")

        released_bookings = 0
        if reset_inventory:
            active_statuses = [
                Booking.Status.PENDING,
                Booking.Status.CONFIRMED,
                Booking.Status.CHECKED_IN,
            ]
            released_bookings = Booking.objects.filter(status__in=active_statuses, room_id__isnull=False).update(
                room_id=None
            )
            Booking.objects.filter(status=Booking.Status.CHECKED_IN).update(
                status=Booking.Status.CONFIRMED,
                updated_at=timezone.now(),
            )
            Room.objects.exclude(status="AVAILABLE").update(status="AVAILABLE")

        orphan_rooms = Room.objects.filter(category__isnull=True).select_related("branch")
        for room in orphan_rooms:
            fallback = RoomCategory.objects.filter(branch_id=room.branch_id).order_by("name").first()
            if not fallback:
                continue
            room.category = fallback
            room.status = "AVAILABLE"
            room.save(update_fields=["category", "status", "updated_at"])

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

        locket_guests = []
        for guest_name, guest_email in LOCKET_GUEST_PROFILES:
            guest_user, _ = User.objects.get_or_create(
                email=guest_email,
                defaults={"name": guest_name, "role": Role.CUSTOMER},
            )
            if not guest_user.name:
                guest_user.name = guest_name
                guest_user.save(update_fields=["name", "updated_at"])
            locket_guests.append(guest_user)

        locket_posts_created = 0
        room_labels = ["Suite", "Family", "Budget", "Luxury", "Deluxe"]
        for b in branches:
            post_count = random.randint(3, 5)
            for idx in range(post_count):
                guest = random.choice(locket_guests)
                room_name = random.choice(room_labels)
                scope_key = f"{b.id}::locket::{idx}"
                _, created_post = ReviewForumPost.objects.get_or_create(
                    scope_key=scope_key,
                    defaults={
                        "branch": b,
                        "customer": guest,
                        "hotel_name": b.name,
                        "room_name": room_name,
                        "content": random.choice(LOCKET_CAPTIONS),
                        "rating": random.randint(4, 5),
                        "image_url": random.choice(LOCKET_IMAGES),
                        "booking_id": f"LK-{str(b.id).replace('-', '')[:8]}-{idx}",
                    },
                )
                if created_post:
                    locket_posts_created += 1

        services_created = 0
        for b in branches:
            picked = random.sample(
                BRANCH_SERVICE_TEMPLATES,
                k=random.randint(3, min(5, len(BRANCH_SERVICE_TEMPLATES))),
            )
            for name, price, icon, category in picked:
                _, created = ExtraService.objects.get_or_create(
                    branch=b,
                    name=name,
                    defaults={
                        "price": price,
                        "icon": icon,
                        "category": category,
                        "description": f"{name} at {b.name}",
                    },
                )
                if created:
                    services_created += 1

        ops = self._seed_tenant_operations(company, branches, categories)

        min_available = (
            Room.objects.filter(status="AVAILABLE", category__isnull=False)
            .values("category_id")
            .distinct()
            .count()
        )
        available_room_total = Room.objects.filter(status="AVAILABLE", category__isnull=False).count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded themes={RoomTheme.objects.count()} branches={len(branches)} "
                f"rooms_total={Room.objects.count()} inventory_rooms_added={rooms_repaired} "
                f"bookings_released={released_bookings} available_rooms={available_room_total} "
                f"categories_with_stock={min_available} branch_services={services_created} "
                f"locket_posts={ReviewForumPost.objects.count()} locket_posts_created={locket_posts_created} "
                f"seed_bookings={ops['bookings']} hk_tasks={ops['tasks']} service_orders={ops['orders']}"
            )
        )

