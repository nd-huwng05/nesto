from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import connection

from accounts.models import Role
from bookings.models import Booking, BookingStatus
from businesses.models import Hotel, HotelCategory
from customers.models import (
    CustomerBookingSnapshot,
    CustomerHotelRating,
    CustomerNotification,
    CustomerWatchlistPost,
    SnapshotType,
)


class Command(BaseCommand):
    help = "Seed MySQL with demo data for Customer Home flow"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing seeded records for this demo user before seeding",
        )

    def handle(self, *args, **options):
        self.booking_table_exists = Booking._meta.db_table in set(connection.introspection.table_names())
        self.hotel_table_exists = Hotel._meta.db_table in set(connection.introspection.table_names())
        user = self._upsert_demo_user()

        if options.get("reset"):
            self._reset_user_data(user)

        bookings = self._upsert_bookings(user) if self.booking_table_exists else {}
        self._upsert_snapshots(user, bookings)
        self._upsert_notifications(user)
        self._upsert_watchlist_posts(user)
        self._upsert_hotel_ratings(user)
        if self.hotel_table_exists:
            self._upsert_hotels()

        self.stdout.write(self.style.SUCCESS("Seed completed successfully."))
        self.stdout.write(f"Demo user: {user.email}")
        if self.booking_table_exists:
            self.stdout.write(f"Bookings: {Booking.objects.filter(customer=user).count()}")
        else:
            self.stdout.write("Bookings: skipped (table 'bookings' not found in current schema)")
        self.stdout.write(f"Snapshots: {CustomerBookingSnapshot.objects.filter(customer=user).count()}")
        self.stdout.write(f"Notifications: {CustomerNotification.objects.filter(customer=user).count()}")
        self.stdout.write(f"Watchlist posts: {CustomerWatchlistPost.objects.filter(customer=user).count()}")
        self.stdout.write(f"Hotel ratings: {CustomerHotelRating.objects.filter(customer=user).count()}")
        if self.hotel_table_exists:
            self.stdout.write(f"Hotels: {Hotel.objects.filter(is_active=True).count()}")
        else:
            self.stdout.write("Hotels: skipped (table 'business_hotels' not found in current schema)")

    def _upsert_demo_user(self):
        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            email="customer.demo@nesto.local",
            defaults={
                "name": "Customer Demo",
                "phone": "0900000001",
                "role": Role.CUSTOMER,
                "is_active": True,
            },
        )
        user.set_password("Demo@12345")
        user.role = Role.CUSTOMER
        if not user.name:
            user.name = "Customer Demo"
        if not user.phone:
            user.phone = "0900000001"
        user.save(update_fields=["password", "role", "name", "phone", "updated_at"])

        if created:
            self.stdout.write(self.style.SUCCESS("Created demo customer account."))
        else:
            self.stdout.write(self.style.WARNING("Demo customer account already exists, updated password/profile."))

        return user

    def _reset_user_data(self, user):
        CustomerBookingSnapshot.objects.filter(customer=user).delete()
        CustomerNotification.objects.filter(customer=user).delete()
        CustomerWatchlistPost.objects.filter(customer=user).delete()
        CustomerHotelRating.objects.filter(customer=user).delete()
        if self.booking_table_exists:
            Booking.objects.filter(customer=user).delete()
        self.stdout.write(self.style.WARNING("Reset existing demo records for the customer."))

    def _upsert_bookings(self, user):
        today = date.today()
        seed_rows = [
            {
                "hotel_name": "Nesto Ho Chi Minh Center",
                "room_name": "Standard Room 01",
                "check_in_date": today + timedelta(days=2),
                "check_out_date": today + timedelta(days=4),
                "status": BookingStatus.CONFIRMED,
            },
            {
                "hotel_name": "Nesto Hanoi Lake View",
                "room_name": "VIP Lake Suite",
                "check_in_date": today - timedelta(days=12),
                "check_out_date": today - timedelta(days=10),
                "status": BookingStatus.COMPLETED,
            },
            {
                "hotel_name": "Nesto Executive Hanoi",
                "room_name": "Super VIP Room",
                "check_in_date": today + timedelta(days=8),
                "check_out_date": today + timedelta(days=10),
                "status": BookingStatus.PENDING,
            },
        ]

        booking_map = {}
        for row in seed_rows:
            booking = Booking.objects.filter(
                customer=user,
                hotel_name=row["hotel_name"],
                room_name=row["room_name"],
                check_in_date=row["check_in_date"],
            ).first()
            if not booking:
                booking = Booking.objects.create(customer=user, **row)
            else:
                booking.check_out_date = row["check_out_date"]
                booking.status = row["status"]
                booking.save(update_fields=["check_out_date", "status", "updated_at"])

            booking_map[row["hotel_name"]] = booking

        return booking_map

    def _upsert_snapshots(self, user, bookings):
        snapshot_rows = [
            {
                "snapshot_id": "SNAP_HOME_UPCOMING_001",
                "snapshot_type": SnapshotType.UPCOMING,
                "hotel_name": "Nesto Ho Chi Minh Center",
                "room_name": "Standard Room 01",
                "payment_status": "partial",
                "total_amount": Decimal("120.00"),
                "paid_amount": Decimal("50.00"),
                "remaining_amount": Decimal("70.00"),
                "customer_name": "Customer Demo",
                "customer_email": "customer.demo@nesto.local",
                "customer_phone": "0900000001",
                "action_label": "Pay now",
                "action_color": "#d87d2f",
            },
            {
                "snapshot_id": "SNAP_HOME_HISTORY_001",
                "snapshot_type": SnapshotType.HISTORY,
                "hotel_name": "Nesto Hanoi Lake View",
                "room_name": "VIP Lake Suite",
                "payment_status": "paid",
                "total_amount": Decimal("300.00"),
                "paid_amount": Decimal("300.00"),
                "remaining_amount": Decimal("0.00"),
                "customer_name": "Customer Demo",
                "customer_email": "customer.demo@nesto.local",
                "customer_phone": "0900000001",
                "action_label": "Booked",
                "action_color": "#2b8a3e",
            },
            {
                "snapshot_id": "SNAP_HOME_PAYMENT_001",
                "snapshot_type": SnapshotType.PAYMENT,
                "hotel_name": "Nesto Executive Hanoi",
                "room_name": "Super VIP Room",
                "payment_status": "unpaid",
                "total_amount": Decimal("240.00"),
                "paid_amount": Decimal("0.00"),
                "remaining_amount": Decimal("240.00"),
                "customer_name": "Customer Demo",
                "customer_email": "customer.demo@nesto.local",
                "customer_phone": "0900000001",
                "action_label": "Checkout",
                "action_color": "#2f6fd8",
            },
        ]

        for row in snapshot_rows:
            booking = bookings.get(row["hotel_name"])
            defaults = {
                **row,
                "booking_code": booking.booking_id if booking else "",
                "check_in_date": booking.check_in_date if booking else None,
                "check_out_date": booking.check_out_date if booking else None,
                "check_in_label": str(booking.check_in_date) if booking and booking.check_in_date else "",
                "check_out_label": str(booking.check_out_date) if booking and booking.check_out_date else "",
                "source": "seed-mysql",
            }
            CustomerBookingSnapshot.objects.update_or_create(
                snapshot_id=row["snapshot_id"],
                defaults={"customer": user, **defaults},
            )

    def _upsert_notifications(self, user):
        notification_rows = [
            {
                "notification_id": "NOTI_HOME_001",
                "title": "Booking confirmed",
                "message": "Your booking at Nesto Ho Chi Minh Center has been confirmed.",
                "notification_type": "booking",
                "is_read": False,
            },
            {
                "notification_id": "NOTI_HOME_002",
                "title": "Payment received",
                "message": "We received your payment of $50.00 for BK upcoming booking.",
                "notification_type": "payment",
                "is_read": True,
            },
            {
                "notification_id": "NOTI_HOME_003",
                "title": "Rate your stay",
                "message": "Please rate your recent stay at Nesto Hanoi Lake View.",
                "notification_type": "rating",
                "is_read": False,
            },
        ]

        for row in notification_rows:
            CustomerNotification.objects.update_or_create(
                notification_id=row["notification_id"],
                defaults={"customer": user, **row},
            )

    def _upsert_watchlist_posts(self, user):
        post_rows = [
            {
                "post_id": "WATCH_HOME_001",
                "booking_code": "",
                "hotel_name": "Nesto Ho Chi Minh Center",
                "room_name": "Standard Room 01",
                "description": "Great pool and central location.",
                "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg",
                "rating": 5,
                "posted_by_name": "Customer Demo",
                "posted_by_email": "customer.demo@nesto.local",
                "is_active": True,
            },
            {
                "post_id": "WATCH_HOME_002",
                "booking_code": "",
                "hotel_name": "Nesto Hanoi Lake View",
                "room_name": "VIP Lake Suite",
                "description": "Lake view was amazing and service was excellent.",
                "image_url": "https://images.unsplash.com/photo-1455587734955-081b22074882?fit=crop&w=1400&q=80&fm=jpg",
                "rating": 5,
                "posted_by_name": "Customer Demo",
                "posted_by_email": "customer.demo@nesto.local",
                "is_active": True,
            },
        ]

        for row in post_rows:
            CustomerWatchlistPost.objects.update_or_create(
                post_id=row["post_id"],
                defaults={"customer": user, **row},
            )

    def _upsert_hotel_ratings(self, user):
        rating_rows = [
            {
                "rating_id": "RATE_HOME_001",
                "booking_code": "",
                "hotel_name": "Nesto Ho Chi Minh Center",
                "room_name": "Standard Room 01",
                "rating": Decimal("4.8"),
                "customer_name": "Customer Demo",
                "customer_email": "customer.demo@nesto.local",
                "source": "seed-mysql",
            },
            {
                "rating_id": "RATE_HOME_002",
                "booking_code": "",
                "hotel_name": "Nesto Hanoi Lake View",
                "room_name": "VIP Lake Suite",
                "rating": Decimal("5.0"),
                "customer_name": "Customer Demo",
                "customer_email": "customer.demo@nesto.local",
                "source": "seed-mysql",
            },
            {
                "rating_id": "RATE_HOME_003",
                "booking_code": "",
                "hotel_name": "Nesto Executive Hanoi",
                "room_name": "Super VIP Room",
                "rating": Decimal("4.9"),
                "customer_name": "Customer Demo",
                "customer_email": "customer.demo@nesto.local",
                "source": "seed-mysql",
            },
        ]

        for row in rating_rows:
            CustomerHotelRating.objects.update_or_create(
                rating_id=row["rating_id"],
                defaults={"customer": user, **row},
            )

    def _upsert_hotels(self):
        rows = [
            {
                'hotel_id': 'hotel-family-hcm-01',
                'title': 'Nesto Ho Chi Minh Center',
                'city': 'Ho Chi Minh City',
                'address': '123 Nguyen Hue, District 1, Ho Chi Minh City',
                'description': 'A modern family-friendly hotel in the heart of Ho Chi Minh City, featuring spacious Standard and VIP rooms, a rooftop pool, and convenient access to city landmarks.',
                'image_url': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg',
                'price_per_night': Decimal('90.00'),
                'rating': Decimal('4.7'),
                'category': HotelCategory.FAMILY,
                'is_active': True,
            },
            {
                'hotel_id': 'hotel-family-hcm-02',
                'title': 'Nesto Family Saigon',
                'city': 'Ho Chi Minh City',
                'address': '45 Le Loi, District 1, Ho Chi Minh City',
                'description': 'Designed for families, offering cozy Standard Rooms with kid-friendly amenities, a playground, and a restaurant with family meal packages.',
                'image_url': 'https://images.unsplash.com/photo-1582719508461-905c673771fd?fit=crop&w=1400&q=80&fm=jpg',
                'price_per_night': Decimal('85.00'),
                'rating': Decimal('4.5'),
                'category': HotelCategory.FAMILY,
                'is_active': True,
            },
            {
                'hotel_id': 'hotel-business-hn-01',
                'title': 'Nesto Hanoi Lake View',
                'city': 'Hanoi',
                'address': '10 Xuan Dieu, Tay Ho District, Hanoi',
                'description': 'An upscale business hotel overlooking West Lake. Featuring Super VIP suites, a fully equipped business center, and a premium dining experience.',
                'image_url': 'https://images.unsplash.com/photo-1455587734955-081b22074882?fit=crop&w=1400&q=80&fm=jpg',
                'price_per_night': Decimal('150.00'),
                'rating': Decimal('4.8'),
                'category': HotelCategory.BUSINESS,
                'is_active': True,
            },
            {
                'hotel_id': 'hotel-business-hn-02',
                'title': 'Nesto Executive Hanoi',
                'city': 'Hanoi',
                'address': '88 Ba Trieu, Hai Ba Trung District, Hanoi',
                'description': 'Premium VIP and Super VIP rooms tailored for executives, with high-speed Wi-Fi, private meeting rooms, and an on-site sky lounge.',
                'image_url': 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?fit=crop&w=1400&q=80&fm=jpg',
                'price_per_night': Decimal('240.00'),
                'rating': Decimal('4.9'),
                'category': HotelCategory.BUSINESS,
                'is_active': True,
            },
            {
                'hotel_id': 'hotel-business-hn-03-suite',
                'title': 'Nesto Skyline Suite Hanoi',
                'city': 'Hanoi',
                'address': '21 Phan Chu Trinh, Hoan Kiem District, Hanoi',
                'description': 'Signature suite-focused property with panoramic skyline rooms, executive lounge access, and premium concierge support.',
                'image_url': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?fit=crop&w=1400&q=80&fm=jpg',
                'price_per_night': Decimal('210.00'),
                'rating': Decimal('4.8'),
                'category': HotelCategory.BUSINESS,
                'is_active': True,
            },
            {
                'hotel_id': 'hotel-family-dn-01',
                'title': 'Nesto Da Nang Beach Resort',
                'city': 'Da Nang',
                'address': '102 Vo Nguyen Giap, Son Tra District, Da Nang',
                'description': 'Beachfront family resort with connecting rooms, kids club, and sunset pool deck overlooking My Khe Beach.',
                'image_url': 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?fit=crop&w=1400&q=80&fm=jpg',
                'price_per_night': Decimal('175.00'),
                'rating': Decimal('4.7'),
                'category': HotelCategory.FAMILY,
                'is_active': True,
            },
            {
                'hotel_id': 'hotel-business-sg-01',
                'title': 'Nesto Saigon Central Business Hotel',
                'city': 'Ho Chi Minh City',
                'address': '12 Ton Duc Thang, District 1, Ho Chi Minh City',
                'description': 'Modern business hotel with conference floors, express check-in, and premium airport transfer services.',
                'image_url': 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?fit=crop&w=1400&q=80&fm=jpg',
                'price_per_night': Decimal('190.00'),
                'rating': Decimal('4.8'),
                'category': HotelCategory.BUSINESS,
                'is_active': True,
            },
            {
                'hotel_id': 'hotel-family-hue-01',
                'title': 'Nesto Hue Heritage Suites',
                'city': 'Hue',
                'address': '5 Le Loi, Vinh Ninh Ward, Hue',
                'description': 'Heritage-inspired suites with spacious family layouts, local cuisine classes, and river-view balconies.',
                'image_url': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?fit=crop&w=1400&q=80&fm=jpg',
                'price_per_night': Decimal('145.00'),
                'rating': Decimal('4.6'),
                'category': HotelCategory.FAMILY,
                'is_active': True,
            },
            {
                'hotel_id': 'hotel-business-nhatrang-01',
                'title': 'Nesto Nha Trang Bay Suite Hotel',
                'city': 'Nha Trang',
                'address': '40 Tran Phu, Loc Tho Ward, Nha Trang',
                'description': 'Suite-only property for business and premium leisure stays with ocean-view work lounges and private meeting pods.',
                'image_url': 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?fit=crop&w=1400&q=80&fm=jpg',
                'price_per_night': Decimal('220.00'),
                'rating': Decimal('4.9'),
                'category': HotelCategory.BUSINESS,
                'is_active': True,
            },
        ]

        for row in rows:
            Hotel.objects.update_or_create(hotel_id=row['hotel_id'], defaults=row)