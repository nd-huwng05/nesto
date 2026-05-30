"""
Master development seed — single entrypoint for local / demo testing.

Usage:
    python manage.py migrate
    python manage.py seed_dev --reset

Creates one coherent tenant:
    - Nesto Hospitality Group + Nesto Central Hotel
    - 4 room categories × 8 physical rooms each (32 rooms total)
    - Extra services, customer themes, housekeeping tasks
    - Demo bookings (far-future + one active check-in) that do NOT block new bookings
    - All 8 role accounts (password: Test@1234)

Single entrypoint — replaces all legacy seed_* commands.
"""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import Role
from accounts.services.role_sync_service import RoleSyncService
from bookings.models import Booking, BookingLineItem, service_code_from_catalog
from bookings.services.hold_service import apply_late_hold_deadline, calculate_deposit_amount
from bookings.services.realtime_service import emit_booking_live_bill
from businesses.models import Branch, Company
from rooms.models import HousekeepingTask, Room, RoomCategory
from rooms.services.customer_theme_service import seed_customer_catalog_themes
from rooms.services.pricing_service import calculate_tiered_room_price
from service_orders.models import ExtraService
from staff.models import StaffProfile

User = get_user_model()

UNIVERSAL_PASSWORD = "Test@1234"
ROOMS_PER_CATEGORY = 8
REMOVED_SEED_EMAILS = ("manager@nesto.com",)

ROLE_ACCOUNTS = [
    {
        "label": "Admin",
        "email": "admin@nesto.com",
        "name": "Nesto Super Admin",
        "role": Role.SUPER_ADMIN,
        "is_staff": True,
        "is_superuser": True,
        "staff_department": None,
        "service_category": "",
        "job_role": "",
    },
    {
        "label": "Owner",
        "email": "owner@nesto.com",
        "name": "Nesto Business Owner",
        "role": Role.BUSINESS_OWNER,
        "is_staff": True,
        "is_superuser": False,
        "staff_department": None,
        "service_category": "",
        "job_role": "",
    },
    {
        "label": "Receptionist",
        "email": "reception@nesto.com",
        "name": "Nesto Receptionist",
        "role": Role.RECEPTIONIST,
        "is_staff": True,
        "is_superuser": False,
        "staff_department": StaffProfile.Department.RECEPTIONIST,
        "service_category": "",
        "job_role": "Receptionist",
    },
    {
        "label": "Housekeeping",
        "email": "housekeeping@nesto.com",
        "name": "Nesto Housekeeper",
        "role": Role.HOUSEKEEPING,
        "is_staff": True,
        "is_superuser": False,
        "staff_department": StaffProfile.Department.HOUSEKEEPING,
        "service_category": "",
        "job_role": "Housekeeper",
    },
    {
        "label": "Driver",
        "email": "driver@nesto.com",
        "name": "Nesto Driver",
        "role": Role.SERVICE,
        "is_staff": True,
        "is_superuser": False,
        "staff_department": StaffProfile.Department.SERVICE,
        "service_category": StaffProfile.ServiceCategory.TRANSPORT,
        "job_role": "Driver",
    },
    {
        "label": "Spa",
        "email": "spa@nesto.com",
        "name": "Nesto Spa Staff",
        "role": Role.SERVICE,
        "is_staff": True,
        "is_superuser": False,
        "staff_department": StaffProfile.Department.SERVICE,
        "service_category": StaffProfile.ServiceCategory.SPA,
        "job_role": "Spa Staff",
    },
    {
        "label": "Restaurant",
        "email": "restaurant@nesto.com",
        "name": "Nesto Restaurant Staff",
        "role": Role.SERVICE,
        "is_staff": True,
        "is_superuser": False,
        "staff_department": StaffProfile.Department.SERVICE,
        "service_category": StaffProfile.ServiceCategory.RESTAURANT,
        "job_role": "Restaurant Staff",
    },
    {
        "label": "Customer",
        "email": "customer@nesto.com",
        "name": "Nesto Customer",
        "role": Role.CUSTOMER,
        "is_staff": False,
        "is_superuser": False,
        "staff_department": None,
        "service_category": "",
        "job_role": "",
    },
]

BRANCH_IMAGE = (
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80"
)
ROOM_IMAGE = (
    "https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&w=1600&q=80"
)

CATEGORY_SPECS = [
    {
        "name": "Deluxe Suite",
        "capacity": 2,
        "description": "Spacious suite with city view, king bed, and lounge area.",
        "price_per_hour": 180_000,
        "price_per_half_day": 950_000,
        "price_per_day": 1_800_000,
        "amenities": ["King bed", "City view", "Mini bar", "Rain shower"],
        "room_start": 101,
        "floor": "1",
    },
    {
        "name": "Family Room",
        "capacity": 4,
        "description": "Two queen beds, ideal for families with children.",
        "price_per_hour": 140_000,
        "price_per_half_day": 750_000,
        "price_per_day": 1_400_000,
        "amenities": ["2 Queen beds", "Sofa", "Bathtub", "Kids amenities"],
        "room_start": 111,
        "floor": "1",
    },
    {
        "name": "Executive King",
        "capacity": 2,
        "description": "Business-friendly room with work desk and express check-in.",
        "price_per_hour": 160_000,
        "price_per_half_day": 850_000,
        "price_per_day": 1_600_000,
        "amenities": ["King bed", "Work desk", "Nespresso", "Smart TV"],
        "room_start": 201,
        "floor": "2",
    },
    {
        "name": "Standard Twin",
        "capacity": 2,
        "description": "Comfortable twin room for short business stays.",
        "price_per_hour": 95_000,
        "price_per_half_day": 520_000,
        "price_per_day": 950_000,
        "amenities": ["Twin beds", "Desk", "Wi-Fi", "Blackout curtains"],
        "room_start": 301,
        "floor": "3",
    },
]

# Override default AVAILABLE for specific demo rooms (staff / housekeeping flows).
ROOM_STATUS_OVERRIDES = {
    "201": "OCCUPIED",   # active checked-in guest (reception demo)
    "202": "DIRTY",      # housekeeping pending task
    "203": "AVAILABLE",  # ready for walk-in assignment
    "104": "MAINTENANCE",  # excluded from capacity — still 7 bookable Deluxe rooms
    "112": "CLEANING",   # mid-stay refresh — task already in progress
}

CATALOG_SPECS = [
    {
        "name": "Spa Relaxation Package",
        "description": "60-minute aromatherapy massage at in-house spa.",
        "price": 680_000,
        "icon": "flower-outline",
        "category": "SPA",
    },
    {
        "name": "Airport Transfer",
        "description": "Private sedan pickup or drop-off (Tan Son Nhat).",
        "price": 350_000,
        "icon": "car-sport-outline",
        "category": "TRANSPORT",
    },
    {
        "name": "Breakfast Buffet",
        "description": "Full breakfast buffet for two guests.",
        "price": 220_000,
        "icon": "restaurant-outline",
        "category": "RESTAURANT",
    },
    {
        "name": "Late Checkout (2h)",
        "description": "Extend checkout by up to two hours subject to availability.",
        "price": 200_000,
        "icon": "time-outline",
        "category": "ROOM_SERVICE",
    },
]

LINE_ITEM_PLANS = [
    {"catalog_name": "Spa Relaxation Package", "status": BookingLineItem.Status.PENDING},
    {"catalog_name": "Breakfast Buffet", "status": BookingLineItem.Status.COMPLETED},
    {"catalog_name": "Airport Transfer", "status": BookingLineItem.Status.CONFIRMED},
    {"catalog_name": "Late Checkout (2h)", "status": BookingLineItem.Status.IN_PROGRESS},
]

HK_TASK_SPECS = [
    {"room_number": "202", "status": HousekeepingTask.Status.PENDING, "note": "Post checkout — full clean"},
    {"room_number": "112", "status": HousekeepingTask.Status.IN_PROGRESS, "note": "Mid-stay refresh"},
    {"room_number": "302", "status": HousekeepingTask.Status.COMPLETED, "note": "Morning turnover done"},
]


class Command(BaseCommand):
    help = "Master seed for local development (accounts, branch, rooms, bookings, housekeeping)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Flush the database before seeding (recommended for a clean slate).",
        )

    def handle(self, *args, **options):
        if options.get("reset"):
            self.stdout.write(self.style.WARNING("Resetting database (flush)..."))
            from django.core.management import call_command

            call_command("flush", "--noinput")

        with transaction.atomic():
            self._seed_all_role_accounts()
            summary = self._seed_ecosystem()
            self._link_staff_profiles(summary["branch"])
            self._cleanup_stale_demo_bookings(summary["branch"])

        from accounts.services.auth_service import AuthService

        app = AuthService.get_oauth2_application()
        self.stdout.write(self.style.SUCCESS(f"  OAuth app ready (client_id={app.client_id})"))

        self._print_summary(summary)

    def _seed_all_role_accounts(self) -> None:
        if REMOVED_SEED_EMAILS:
            deactivated = User.objects.filter(email__in=REMOVED_SEED_EMAILS, is_active=True).update(is_active=False)
            if deactivated:
                self.stdout.write(
                    self.style.WARNING(f"  Deactivated {deactivated} legacy account(s)")
                )
        for spec in ROLE_ACCOUNTS:
            user, created = User.objects.get_or_create(
                email=spec["email"],
                defaults={
                    "name": spec["name"],
                    "role": spec["role"],
                    "is_active": True,
                    "is_staff": spec["is_staff"],
                    "is_superuser": spec["is_superuser"],
                    "phone": "0901234567" if spec["role"] == Role.CUSTOMER else "0900000000",
                },
            )
            user.name = spec["name"]
            user.role = spec["role"]
            user.is_active = True
            user.is_staff = spec["is_staff"]
            user.is_superuser = spec["is_superuser"]
            user.set_password(UNIVERSAL_PASSWORD)
            user.save()
            if not spec.get("staff_department"):
                RoleSyncService.sync_user_groups(user)
            action = "Created" if created else "Updated"
            self.stdout.write(f"  {action} account {spec['email']} ({spec['role']})")

    def _link_staff_profiles(self, branch: Branch) -> None:
        for spec in ROLE_ACCOUNTS:
            if not spec.get("staff_department"):
                continue
            user = User.objects.filter(email=spec["email"]).first()
            if not user:
                continue
            profile, created = StaffProfile.objects.get_or_create(
                user=user,
                defaults={
                    "branch": branch,
                    "department": spec["staff_department"],
                    "job_role": spec["job_role"],
                    "service_category": spec.get("service_category") or "",
                },
            )
            profile.branch = branch
            profile.department = spec["staff_department"]
            profile.job_role = spec["job_role"]
            profile.service_category = spec.get("service_category") or ""
            profile.save()
            if created:
                self.stdout.write(self.style.SUCCESS(f"  Staff profile linked: {spec['email']}"))

    def _seed_ecosystem(self) -> dict:
        owner = User.objects.get(email="owner@nesto.com")
        reception = User.objects.get(email="reception@nesto.com")
        customer = User.objects.get(email="customer@nesto.com")

        company = self._ensure_company(owner)
        branch = self._ensure_branch(company)
        categories = self._ensure_categories(branch)
        rooms = self._ensure_rooms(branch, categories)
        catalog = self._ensure_catalog(branch)
        hk_tasks = self._ensure_housekeeping_tasks(branch, rooms)
        theme_stats = seed_customer_catalog_themes(min_per_branch=4)
        self.stdout.write(
            self.style.SUCCESS(
                f"  Customer themes: {theme_stats['themes']} theme(s), "
                f"{theme_stats['links_created']} new branch link(s)"
            )
        )

        # Far-future confirmed booking — does not overlap default customer dates (today → tomorrow).
        booking_upcoming = self._create_booking(
            customer=customer,
            branch=branch,
            category=categories["Deluxe Suite"],
            room=None,
            status=Booking.Status.CONFIRMED,
            check_in_offset_days=90,
            stay_hours=26,
            label="upcoming",
        )
        # Active check-in on Executive King — only occupies room 201; 7 other Executive rooms remain.
        booking_active = self._create_booking(
            customer=customer,
            branch=branch,
            category=categories["Executive King"],
            room=rooms["201"],
            status=Booking.Status.CHECKED_IN,
            check_in_offset_days=-1,
            stay_hours=30,
            label="active",
        )

        lines_upcoming = self._create_line_items(
            booking=booking_upcoming,
            branch=branch,
            catalog=catalog,
            guest_name=customer.name,
            guest_phone=customer.phone or "0901234567",
            room_number="",
            assigned_staff="",
        )
        lines_active = self._create_line_items(
            booking=booking_active,
            branch=branch,
            catalog=catalog,
            guest_name=customer.name,
            guest_phone=customer.phone or "0901234567",
            room_number="201",
            assigned_staff=reception.name or reception.email,
        )

        self._refresh_booking_totals(booking_upcoming)
        self._refresh_booking_totals(booking_active)
        self._emit_live_bill_safe(booking_active)

        return {
            "company": company,
            "branch": branch,
            "owner": owner,
            "reception": reception,
            "customer": customer,
            "categories": categories,
            "rooms": rooms,
            "catalog": catalog,
            "hk_tasks": hk_tasks,
            "booking_upcoming": booking_upcoming,
            "booking_active": booking_active,
            "lines_upcoming": lines_upcoming,
            "lines_active": lines_active,
        }

    def _ensure_company(self, owner: User) -> Company:
        company = Company.objects.filter(name="Nesto Hospitality Group").first()
        if company is None:
            company = Company(
                name="Nesto Hospitality Group",
                manager=owner,
                business_type="HOTEL",
                lodging_type="Hotel",
                contact_email="owner@nesto.com",
                contact_phone="+84-28-1234-5678",
                headquarters_address="88 Nguyen Hue, District 1, Ho Chi Minh City",
            )
            company.save()
            self.stdout.write(self.style.SUCCESS("  Created company Nesto Hospitality Group"))
        else:
            if company.manager_id != owner.id:
                company.manager = owner
                company.save(update_fields=["manager", "updated_at"])
            self.stdout.write("  Reused company Nesto Hospitality Group")
        return company

    def _ensure_branch(self, company: Company) -> Branch:
        branch = Branch.objects.filter(company=company, name="Nesto Central Hotel").first()
        if branch is None:
            branch = Branch(
                company=company,
                name="Nesto Central Hotel",
                lodging_type="Hotel",
                address="88 Nguyen Hue, District 1, Ho Chi Minh City, Vietnam",
                phone="+84-28-1234-5678",
                email="central@nesto.com",
                amenities=["Pool", "Spa", "Restaurant", "Free Wi-Fi", "Parking"],
                guest_segments=["Business", "Family", "Leisure"],
                images=[BRANCH_IMAGE],
                latitude=10.7769,
                longitude=106.7009,
                is_active=True,
            )
            branch.save()
            self.stdout.write(self.style.SUCCESS("  Created branch Nesto Central Hotel"))
        else:
            branch.is_active = True
            branch.latitude = 10.7769
            branch.longitude = 106.7009
            if not branch.images:
                branch.images = [BRANCH_IMAGE]
            branch.save()
            self.stdout.write("  Reused branch Nesto Central Hotel")
        return branch

    def _ensure_categories(self, branch: Branch) -> dict[str, RoomCategory]:
        result: dict[str, RoomCategory] = {}
        for spec in CATEGORY_SPECS:
            category = RoomCategory.objects.filter(branch=branch, name=spec["name"]).first()
            if category is None:
                category = RoomCategory(
                    branch=branch,
                    name=spec["name"],
                    max_guests=spec["capacity"],
                    description=spec["description"],
                    price_per_hour=spec["price_per_hour"],
                    price_per_half_day=spec["price_per_half_day"],
                    price_per_day=spec["price_per_day"],
                    base_price=spec["price_per_day"],
                    room_amenities=spec["amenities"],
                    images=[ROOM_IMAGE],
                )
                category.save()
                self.stdout.write(self.style.SUCCESS(f"  Created category {spec['name']}"))
            else:
                category.max_guests = spec["capacity"]
                category.description = spec["description"]
                category.price_per_hour = spec["price_per_hour"]
                category.price_per_half_day = spec["price_per_half_day"]
                category.price_per_day = spec["price_per_day"]
                category.base_price = spec["price_per_day"]
                category.room_amenities = spec["amenities"]
                if not category.images:
                    category.images = [ROOM_IMAGE]
                category.save()
                self.stdout.write(f"  Reused category {spec['name']}")
            result[spec["name"]] = category
        return result

    def _ensure_rooms(self, branch: Branch, categories: dict[str, RoomCategory]) -> dict[str, Room]:
        result: dict[str, Room] = {}
        for spec in CATEGORY_SPECS:
            category = categories[spec["name"]]
            start = int(spec["room_start"])
            for offset in range(ROOMS_PER_CATEGORY):
                room_number = str(start + offset)
                status = ROOM_STATUS_OVERRIDES.get(room_number, "AVAILABLE")
                room = Room.objects.filter(branch=branch, room_number=room_number).first()
                if room is None:
                    room = Room(
                        branch=branch,
                        category=category,
                        room_number=room_number,
                        floor=spec["floor"],
                        status=status,
                    )
                    room.save()
                    self.stdout.write(self.style.SUCCESS(f"  Created room {room_number} ({spec['name']}, {status})"))
                else:
                    room.category = category
                    room.floor = spec["floor"]
                    room.status = status
                    room.save()
                result[room_number] = room

        total = Room.objects.filter(branch=branch).count()
        self.stdout.write(self.style.SUCCESS(f"  Physical rooms at branch: {total}"))
        return result

    def _ensure_catalog(self, branch: Branch) -> dict[str, ExtraService]:
        result: dict[str, ExtraService] = {}
        for spec in CATALOG_SPECS:
            service = ExtraService.objects.filter(branch=branch, name=spec["name"]).first()
            if service is None:
                service = ExtraService(
                    branch=branch,
                    name=spec["name"],
                    description=spec["description"],
                    price=spec["price"],
                    icon=spec["icon"],
                    category=spec["category"],
                )
                service.save()
                self.stdout.write(self.style.SUCCESS(f"  Created extra service {spec['name']}"))
            else:
                service.description = spec["description"]
                service.price = spec["price"]
                service.icon = spec["icon"]
                service.category = spec["category"]
                service.save()
            result[spec["name"]] = service
        return result

    def _ensure_housekeeping_tasks(self, branch: Branch, rooms: dict[str, Room]) -> list[HousekeepingTask]:
        created: list[HousekeepingTask] = []
        for spec in HK_TASK_SPECS:
            room = rooms.get(spec["room_number"])
            if not room:
                continue
            task = HousekeepingTask.objects.filter(branch=branch, room=room).exclude(
                status=HousekeepingTask.Status.CANCELLED
            ).first()
            if task is None:
                task = HousekeepingTask(
                    branch=branch,
                    room=room,
                    status=spec["status"],
                    note=spec["note"],
                )
                task.save()
                self.stdout.write(self.style.SUCCESS(f"  Created HK task room {spec['room_number']} ({spec['status']})"))
            else:
                task.status = spec["status"]
                task.note = spec["note"]
                task.save()
            if spec["status"] == HousekeepingTask.Status.COMPLETED and not task.completed_at:
                task.completed_at = timezone.now()
                task.save(update_fields=["completed_at", "updated_at"])
            elif spec["status"] == HousekeepingTask.Status.PENDING:
                if str(room.status).upper() not in {Room.Status.DIRTY, Room.Status.CLEANING}:
                    room.status = Room.Status.DIRTY
                    room.save(update_fields=["status", "updated_at"])
            elif spec["status"] == HousekeepingTask.Status.IN_PROGRESS:
                if str(room.status).upper() not in {Room.Status.CLEANING, Room.Status.OCCUPIED}:
                    room.status = Room.Status.CLEANING
                    room.save(update_fields=["status", "updated_at"])
            created.append(task)
        return created

    def _create_booking(
        self,
        *,
        customer: User,
        branch: Branch,
        category: RoomCategory,
        room: Room | None,
        status: str,
        check_in_offset_days: int,
        stay_hours: int,
        label: str,
    ) -> Booking:
        now = timezone.now()
        check_in = now + timedelta(days=check_in_offset_days)
        check_in = check_in.replace(hour=14, minute=0, second=0, microsecond=0)
        if timezone.is_naive(check_in):
            check_in = timezone.make_aware(check_in, timezone.get_current_timezone())

        expected_check_out = check_in + timedelta(hours=stay_hours)
        pricing = calculate_tiered_room_price(category, check_in, expected_check_out)
        room_total = int(pricing.get("room_total") or category.price_per_day or category.base_price or 0)
        deposit_pct = 20
        deposit_amount = calculate_deposit_amount(room_total, deposit_pct)

        booking_code = f"BK-SEED-{label.upper()}"
        Booking.objects.filter(booking_code=booking_code).delete()

        booking = Booking(
            booking_code=booking_code,
            customer=customer,
            branch=branch,
            room=room,
            room_category=category,
            guest_name=customer.name or "Nesto Customer",
            email=customer.email,
            phone=customer.phone or "0901234567",
            status=status,
            walk_in=False,
            check_in_at=check_in,
            expected_check_out_at=expected_check_out,
            check_out_at=expected_check_out if status == Booking.Status.CHECKED_OUT else None,
            hotel_name=branch.name,
            hotel_address=branch.address,
            room_type=category.name,
            original_room_number=str(room.room_number) if room else "",
            hourly_rate=int(pricing.get("price_per_hour") or category.price_per_hour or 0),
            room_price=room_total,
            base_price=room_total,
            deposit_percentage=deposit_pct,
            deposit_amount=deposit_amount,
            payment_method="momo" if status != Booking.Status.PENDING else "",
        )
        booking.save()
        apply_late_hold_deadline(booking, deposit_pct)
        booking.save(
            update_fields=[
                "hold_minutes",
                "late_hold_deadline_at",
                "deposit_percentage",
                "deposit_amount",
                "updated_at",
            ]
        )

        if room is not None and status == Booking.Status.CHECKED_IN:
            room.status = "OCCUPIED"
            room.save(update_fields=["status", "updated_at"])

        self.stdout.write(
            self.style.SUCCESS(
                f"  Created booking {booking.booking_code} ({status}, {category.name}, "
                f"check-in +{check_in_offset_days}d)"
            )
        )
        return booking

    def _create_line_items(
        self,
        *,
        booking: Booking,
        branch: Branch,
        catalog: dict[str, ExtraService],
        guest_name: str,
        guest_phone: str,
        room_number: str,
        assigned_staff: str,
    ) -> list[BookingLineItem]:
        BookingLineItem.objects.filter(booking=booking).delete()
        created: list[BookingLineItem] = []

        for plan in LINE_ITEM_PLANS:
            service = catalog[plan["catalog_name"]]
            status = plan["status"]
            staff_name = assigned_staff if status != BookingLineItem.Status.PENDING else ""
            service_code = service_code_from_catalog(service)

            line = BookingLineItem(
                booking=booking,
                branch=branch,
                extra_service=service,
                service_key=str(service.id),
                service_code=service_code,
                line_no=1,
                summary=service.name,
                amount=int(service.price or 0),
                category=service.category,
                status=status,
                source=BookingLineItem.Source.CUSTOMER,
                assigned_staff=staff_name,
                items=[{"name": service.name, "price": int(service.price or 0)}],
                room_number=room_number,
                guest_name=guest_name,
                guest_phone=guest_phone,
            )
            line.save()
            created.append(line)

        self.stdout.write(
            self.style.SUCCESS(f"  Created {len(created)} line items for {booking.booking_code}")
        )
        return created

    def _emit_live_bill_safe(self, booking: Booking) -> None:
        try:
            emit_booking_live_bill(booking)
            self.stdout.write(self.style.SUCCESS(f"  Live bill broadcast for {booking.booking_code}"))
        except Exception as exc:
            self.stdout.write(
                self.style.WARNING(f"  Skipped live bill broadcast (channel layer unavailable): {exc}")
            )

    def _refresh_booking_totals(self, booking: Booking) -> None:
        services_total = sum(
            int(row.amount or 0)
            for row in BookingLineItem.objects.filter(booking=booking).exclude(
                status=BookingLineItem.Status.CANCELLED
            )
        )
        room_total = int(booking.room_price or 0)
        booking.base_price = room_total + services_total
        booking.save(update_fields=["base_price", "updated_at"])

    def _cleanup_stale_demo_bookings(self, branch: Branch) -> None:
        from bookings.services.booking_capacity_service import release_stale_pending_bookings

        cancelled = release_stale_pending_bookings(branch_id=branch.id, max_age_minutes=0)
        if cancelled:
            self.stdout.write(
                self.style.WARNING(f"  Cancelled {cancelled} stale PENDING booking(s) at demo branch")
            )

    def _print_summary(self, summary: dict) -> None:
        branch = summary["branch"]
        booking_upcoming = summary["booking_upcoming"]
        booking_active = summary["booking_active"]
        room_count = Room.objects.filter(branch=branch).count()
        bookable = (
            Room.objects.filter(branch=branch)
            .exclude(status__in={Room.Status.MAINTENANCE, Room.Status.OUT_OF_ORDER})
            .count()
        )

        divider = "=" * 62
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(divider))
        self.stdout.write(self.style.SUCCESS("NESTO MASTER SEED — READY FOR DEMO"))
        self.stdout.write(self.style.SUCCESS(f"Universal password: {UNIVERSAL_PASSWORD}"))
        self.stdout.write(self.style.SUCCESS(divider))
        self.stdout.write("")
        self.stdout.write("Accounts (password: Test@1234):")
        for spec in ROLE_ACCOUNTS:
            self.stdout.write(f"  {spec['email']:<24} -> {spec['label']}")
        self.stdout.write("")
        from core.utils.network import primary_lan_ip

        lan_ip = primary_lan_ip()
        self.stdout.write("iPhone / physical device networking:")
        self.stdout.write("  python manage.py runserver 0.0.0.0:8000")
        self.stdout.write(f"  frontend/.env  EXPO_PUBLIC_DEV_API_HOST={lan_ip}")
        self.stdout.write("  npx expo start -c")
        self.stdout.write("")
        self.stdout.write(f"Company : {summary['company'].name}")
        self.stdout.write(f"Branch  : {branch.name}")
        self.stdout.write(f"Rooms   : {room_count} physical ({bookable} bookable, {ROOMS_PER_CATEGORY}/category)")
        self.stdout.write(f"HK tasks: {len(summary.get('hk_tasks') or [])}")
        self.stdout.write("")
        self.stdout.write("Demo bookings (do NOT block today's customer bookings):")
        self.stdout.write(
            f"  {booking_upcoming.booking_code} - {booking_upcoming.status} "
            f"(+90 days, {booking_upcoming.room_type})"
        )
        self.stdout.write(
            f"  {booking_active.booking_code} - {booking_active.status} "
            f"(room 201 only, 7 other Executive King rooms free)"
        )
        self.stdout.write("")
        self.stdout.write("Customer flow: Room detail -> Book -> Pay with MoMo -> poll confirms deposit")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(divider))
