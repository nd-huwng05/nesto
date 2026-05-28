from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from businesses.models import Company, Branch
from rooms.models import Room, RoomCategory, HousekeepingTask
from bookings.models import Booking, ReviewForumPost, build_review_scope_key
from service_orders.models import ExtraService, ServiceOrder
from staff.models import StaffProfile

User = get_user_model()

class Command(BaseCommand):
    def handle(self, *args, **options):
        owner, _ = User.objects.get_or_create(
            email="owner@hotel.com",
            defaults={"name": "Hotel Owner", "role": "BUSINESS_OWNER", "is_active": True},
        )
        owner.set_password("123456")
        owner.save()

        company, _ = Company.objects.get_or_create(
            manager=owner,
            defaults={"name": "Grand Hotel Group", "business_type": "HOTEL"},
        )

        cloudinary_urls = [
            "https://res.cloudinary.com/demo/image/upload/v1690000000/hotel/branch_01.jpg",
            "https://res.cloudinary.com/demo/image/upload/v1690000000/hotel/branch_02.jpg",
            "https://res.cloudinary.com/demo/image/upload/v1690000000/hotel/branch_03.jpg",
            "https://res.cloudinary.com/demo/image/upload/v1690000000/hotel/branch_04.jpg",
            "https://res.cloudinary.com/demo/image/upload/v1690000000/hotel/branch_05.jpg",
            "https://res.cloudinary.com/demo/image/upload/v1690000000/hotel/room_01.jpg",
            "https://res.cloudinary.com/demo/image/upload/v1690000000/hotel/room_02.jpg",
            "https://res.cloudinary.com/demo/image/upload/v1690000000/hotel/room_03.jpg",
            "https://res.cloudinary.com/demo/image/upload/v1690000000/hotel/service_01.jpg",
            "https://res.cloudinary.com/demo/image/upload/v1690000000/hotel/service_02.jpg",
        ]

        branch_specs = [
            ("Grand Hotel Downtown", "Ho Chi Minh City, District 1", "Hotel", 10.7769, 106.7009),
            ("Grand Hotel Riverside", "Ho Chi Minh City, District 2", "Hotel", 10.7872, 106.7498),
            ("Grand Hotel Beach Resort", "Vung Tau Beach", "Resort", 10.4114, 107.1362),
            ("Grand Hotel Mountain Retreat", "Da Lat Highlands", "Resort", 11.9404, 108.4583),
            ("Grand Hotel Old Quarter", "Ha Noi, Hoan Kiem", "Hotel", 21.0285, 105.8542),
        ]
        branches = []
        for idx, (name, address, lodging_type, latitude, longitude) in enumerate(branch_specs):
            b, _ = Branch.objects.get_or_create(
                company=company,
                name=name,
                defaults={
                    "address": address,
                    "lodging_type": lodging_type,
                    "images": [cloudinary_urls[idx % len(cloudinary_urls)]],
                    "amenities": ["WiFi", "Breakfast", "Pool", "Gym"],
                    "guest_segments": ["Business", "Family", "Couple"],
                    "is_active": True,
                    "latitude": float(latitude),
                    "longitude": float(longitude),
                },
            )
            if b.latitude is None or b.longitude is None:
                b.latitude = float(latitude)
                b.longitude = float(longitude)
                b.save(update_fields=["latitude", "longitude", "updated_at"])
            if not b.images:
                b.images = [cloudinary_urls[idx % len(cloudinary_urls)]]
                b.save(update_fields=["images", "updated_at"])
            branches.append(b)

        staff_specs = [
            ("reception", "Receptionist", StaffProfile.Department.RECEPTIONIST),
            ("housekeeping", "Housekeeping", StaffProfile.Department.HOUSEKEEPING),
            ("service", "Service", StaffProfile.Department.SERVICE),
            ("manager", "Manager", StaffProfile.Department.MANAGER),
        ]
        for branch in branches:
            for prefix, label, dept in staff_specs:
                email = f"{prefix}.{branch.id.hex[:6]}@hotel.com"
                u, _ = User.objects.get_or_create(
                    email=email,
                    defaults={"name": f"{label} · {branch.name}", "is_active": True},
                )
                u.set_password("123456")
                u.save()
                StaffProfile.objects.get_or_create(
                    user=u,
                    defaults={"branch": branch, "department": dept, "job_role": label},
                )

        for branch in branches:
            standard, _ = RoomCategory.objects.get_or_create(
                branch=branch,
                name="Standard",
                defaults={"base_price": 500000, "capacity": 2, "description": "Standard room"},
            )
            deluxe, _ = RoomCategory.objects.get_or_create(
                branch=branch,
                name="Deluxe",
                defaults={"base_price": 800000, "capacity": 2, "description": "Deluxe room"},
            )
            suite, _ = RoomCategory.objects.get_or_create(
                branch=branch,
                name="Suite",
                defaults={"base_price": 1200000, "capacity": 3, "description": "Suite room"},
            )
            for idx, cat in enumerate([standard, deluxe, suite], start=1):
                for i in range(1, 9):
                    number = f"{idx}{i:02d}"
                    Room.objects.get_or_create(
                        branch=branch,
                        room_number=number,
                        defaults={"floor": str(idx), "category": cat, "status": "AVAILABLE"},
                    )

        customers = []
        for i in range(1, 26):
            u, _ = User.objects.get_or_create(
                email=f"customer{i}@mail.com",
                defaults={"name": f"Customer {i}", "role": "CUSTOMER", "is_active": True},
            )
            u.set_password("123456")
            u.save()
            customers.append(u)

        now = timezone.now()
        extra_service_specs = [
            ("Breakfast", 120000),
            ("Airport Pickup", 350000),
            ("Laundry", 80000),
            ("Spa Package", 600000),
            ("Late Checkout", 200000),
            ("City Tour", 450000),
        ]
        for branch in branches:
            for name, price in extra_service_specs:
                ExtraService.objects.get_or_create(
                    branch=branch,
                    name=name,
                    defaults={"price": price, "description": f"{name} service"},
                )

        total_bookings = 0
        total_reviews = 0
        total_orders = 0
        for branch_idx, branch in enumerate(branches):
            rooms = list(Room.objects.filter(branch=branch).select_related("category").order_by("room_number"))
            services = list(ExtraService.objects.filter(branch=branch).order_by("name"))
            for n in range(0, 25):
                dt = now - timedelta(days=(branch_idx * 8) + n)
                room = rooms[(branch_idx + n) % len(rooms)]
                customer = customers[(branch_idx * 3 + n) % len(customers)]
                code = f"BKSEED-{branch.id.hex[:4].upper()}-{n:03d}"
                booking, _ = Booking.objects.get_or_create(
                    booking_code=code,
                    defaults={
                        "branch": branch,
                        "room": room,
                        "room_category": room.category,
                        "customer": customer,
                        "guest_name": customer.name,
                        "email": customer.email,
                        "phone": "0900000000",
                        "status": "CHECKED_OUT" if n % 3 else "CHECKED_IN",
                        "check_in_at": dt - timedelta(days=1),
                        "check_out_at": dt if n % 3 else None,
                        "base_price": int(500000 + (n % 7) * 80000),
                        "walk_in": False,
                    },
                )
                total_bookings += 1

                HousekeepingTask.objects.get_or_create(
                    branch=branch,
                    room=room,
                    status=HousekeepingTask.Status.COMPLETED,
                    defaults={"note": "", "completed_at": dt},
                )

                if services and (n % 2 == 0):
                    svc = services[(n + branch_idx) % len(services)]
                    order, created = ServiceOrder.objects.get_or_create(
                        branch=branch,
                        booking=booking,
                        defaults={
                            "status": "COMPLETED",
                            "room_number": str(room.room_number or ""),
                            "guest_name": str(customer.name or ""),
                            "guest_phone": "0900000000",
                            "items": [{"name": svc.name, "qty": 1, "unit_price": int(svc.price or 0)}],
                            "amount": int(svc.price or 0),
                        },
                    )
                    if created:
                        total_orders += 1

                if n % 2 == 1:
                    hotel_name = branch.name
                    room_name = f"Room {room.room_number}"
                    scope_key = build_review_scope_key(hotel_name, room_name)
                    ReviewForumPost.objects.get_or_create(
                        scope_key=scope_key,
                        booking_id=booking.booking_code,
                        customer=customer,
                        defaults={
                            "booking_ref": booking,
                            "hotel_name": hotel_name,
                            "room_name": room_name,
                            "content": f"Great stay at {hotel_name}, room {room.room_number}.",
                            "rating": (n % 5) + 1,
                            "image_url": cloudinary_urls[(5 + (n % 3)) % len(cloudinary_urls)],
                        },
                    )
                    total_reviews += 1

        self.stdout.write(self.style.SUCCESS(f"Seeding completed: branches={len(branches)} customers={len(customers)} bookings={total_bookings} orders={total_orders} reviews={total_reviews}"))
