from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from businesses.models import Company, Branch
from rooms.models import Room, RoomCategory
from service_orders.models import ExtraService
from bookings.models import Booking, ReviewForumPost, build_review_scope_key

User = get_user_model()


class Command(BaseCommand):
    def handle(self, *args, **options):
        owner, _ = User.objects.get_or_create(
            email="demo.owner@nesto.vn",
            defaults={"name": "Demo Owner", "role": "BUSINESS_OWNER", "is_active": True},
        )
        owner.set_password("123456")
        owner.save()

        company, _ = Company.objects.get_or_create(
            manager=owner,
            defaults={"name": "Nesto Demo Group", "business_type": "HOTEL"},
        )

        image_pool = [
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
            ("Nesto Saigon Central", "Ho Chi Minh City, District 1", "Hotel", 10.7769, 106.7009),
            ("Nesto Saigon Riverside", "Ho Chi Minh City, District 2", "Hotel", 10.7872, 106.7498),
            ("Nesto Hanoi Old Quarter", "Ha Noi, Hoan Kiem", "Hotel", 21.0285, 105.8542),
            ("Nesto Danang Beachfront", "Da Nang, Son Tra", "Resort", 16.0758, 108.2230),
            ("Nesto Nha Trang Bay", "Nha Trang, Khanh Hoa", "Resort", 12.2388, 109.1967),
            ("Nesto Dalat Retreat", "Da Lat, Lam Dong", "Resort", 11.9404, 108.4583),
            ("Nesto Phu Quoc Paradise", "Phu Quoc, Kien Giang", "Resort", 10.2899, 103.9840),
            ("Nesto Vung Tau Seaview", "Vung Tau, Ba Ria", "Resort", 10.4114, 107.1362),
            ("Nesto Can Tho Riverside", "Can Tho, Ninh Kieu", "Hotel", 10.0452, 105.7469),
            ("Nesto Hue Heritage", "Hue, Thua Thien Hue", "Hotel", 16.4637, 107.5909),
        ]

        branches = []
        for idx, (name, address, lodging_type, lat, lng) in enumerate(branch_specs):
            b, _ = Branch.objects.get_or_create(
                company=company,
                name=name,
                defaults={
                    "address": address,
                    "lodging_type": lodging_type,
                    "images": [image_pool[idx % len(image_pool)]],
                    "amenities": ["WiFi", "Breakfast", "Pool", "Gym", "Spa"],
                    "guest_segments": ["Business", "Family", "Couple", "Solo"],
                    "is_active": True,
                    "latitude": float(lat),
                    "longitude": float(lng),
                },
            )
            if not b.images:
                b.images = [image_pool[idx % len(image_pool)]]
            if b.latitude is None or b.longitude is None:
                b.latitude = float(lat)
                b.longitude = float(lng)
            b.save(update_fields=["images", "latitude", "longitude", "updated_at"])
            branches.append(b)

        categories_created = 0
        rooms_created = 0
        services_created = 0
        bookings_created = 0
        reviews_created = 0

        category_templates = [
            ("Standard", 450000, 2),
            ("Deluxe", 700000, 2),
            ("Suite", 1100000, 3),
            ("Family Suite", 1400000, 4),
            ("Business Suite", 1600000, 2),
        ]
        service_templates = [
            ("Breakfast", 120000),
            ("Airport Pickup", 350000),
            ("Laundry", 80000),
            ("Spa Package", 600000),
            ("Late Checkout", 200000),
            ("City Tour", 450000),
            ("Room Service", 150000),
            ("Mini Bar", 90000),
            ("Bike Rental", 110000),
            ("Massage", 500000),
        ]

        customer_users = []
        for i in range(1, 41):
            u, _ = User.objects.get_or_create(
                email=f"demo.customer{i}@nesto.vn",
                defaults={"name": f"Demo Customer {i}", "role": "CUSTOMER", "is_active": True},
            )
            u.set_password("123456")
            u.save()
            customer_users.append(u)

        now = timezone.now()
        for b_idx, branch in enumerate(branches):
            categories = []
            for c_idx in range(5):
                t = category_templates[(b_idx + c_idx) % len(category_templates)]
                cat, created = RoomCategory.objects.get_or_create(
                    branch=branch,
                    name=f"{t[0]} {c_idx + 1}",
                    defaults={"base_price": t[1] + c_idx * 25000, "capacity": t[2], "description": f"{t[0]} room"},
                )
                if created:
                    categories_created += 1
                categories.append(cat)
            while len(categories) < 5:
                categories.append(categories[-1])

            for r_idx in range(12):
                for cat_idx, cat in enumerate(categories[:5]):
                    room_number = f"{cat_idx + 1}{(r_idx + 1):02d}"
                    room, created = Room.objects.get_or_create(
                        branch=branch,
                        room_number=room_number,
                        defaults={"floor": str(cat_idx + 1), "category": cat, "status": "AVAILABLE"},
                    )
                    if created:
                        rooms_created += 1

            for s_idx in range(3):
                t = service_templates[(b_idx * 3 + s_idx) % len(service_templates)]
                svc, created = ExtraService.objects.get_or_create(
                    branch=branch,
                    name=f"{t[0]} {s_idx + 1}",
                    defaults={"price": t[1] + s_idx * 15000, "description": f"{t[0]} service"},
                )
                if created:
                    services_created += 1

            rooms = list(Room.objects.filter(branch=branch).select_related("category").order_by("room_number"))
            for k in range(20):
                customer = customer_users[(b_idx * 7 + k) % len(customer_users)]
                room = rooms[(k + b_idx) % len(rooms)]
                dt = now - timedelta(days=b_idx * 3 + k)
                code = f"BKMS-{branch.id.hex[:4].upper()}-{k:04d}"
                booking, created = Booking.objects.get_or_create(
                    booking_code=code,
                    defaults={
                        "branch": branch,
                        "room": room,
                        "room_category": room.category,
                        "customer": customer,
                        "guest_name": customer.name,
                        "email": customer.email,
                        "phone": "0900000000",
                        "status": "CHECKED_OUT" if k % 2 else "PENDING",
                        "check_in_at": dt - timedelta(days=1),
                        "check_out_at": dt if k % 2 else None,
                        "base_price": int(450000 + (k % 7) * 90000),
                        "walk_in": False,
                    },
                )
                if created:
                    bookings_created += 1

                if k % 2 == 1:
                    hotel_name = branch.name
                    room_name = f"Room {room.room_number}"
                    scope_key = build_review_scope_key(hotel_name, room_name)
                    post, created_post = ReviewForumPost.objects.get_or_create(
                        scope_key=scope_key,
                        booking_id=booking.booking_code,
                        customer=customer,
                        defaults={
                            "booking_ref": booking,
                            "hotel_name": hotel_name,
                            "room_name": room_name,
                            "content": f"Stay at {hotel_name} was excellent. Room {room.room_number} was clean and comfortable.",
                            "rating": (k % 5) + 1,
                            "image_url": image_pool[(5 + (k % 4)) % len(image_pool)],
                        },
                    )
                    if created_post:
                        reviews_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"seed_massive_data done branches={len(branches)} categories+={categories_created} rooms+={rooms_created} services+={services_created} bookings+={bookings_created} reviews+={reviews_created}"
            )
        )

