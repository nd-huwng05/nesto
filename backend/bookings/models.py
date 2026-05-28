import uuid

from django.db import models
from django.utils import timezone


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CHECKED_IN = "CHECKED_IN", "Checked in"
        CHECKED_OUT = "CHECKED_OUT", "Checked out"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    booking_code = models.CharField(max_length=64, unique=True)
    guest_name = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(max_length=255, blank=True, default="")
    phone = models.CharField(max_length=64, blank=True, default="")
    status = models.CharField(max_length=32, db_index=True, default=Status.PENDING)
    walk_in = models.BooleanField(default=False)

    check_in_at = models.DateTimeField(null=True, blank=True)
    check_out_at = models.DateTimeField(null=True, blank=True)
    expected_check_out_at = models.DateTimeField(null=True, blank=True)

    hotel_name = models.CharField(max_length=255, blank=True, default="")
    hotel_address = models.TextField(blank=True, default="")

    room_type = models.CharField(max_length=255, blank=True, default="")
    original_room_number = models.CharField(max_length=32, blank=True, default="")
    room_change_note = models.TextField(blank=True, default="")

    hourly_rate = models.IntegerField(default=0)
    base_price = models.IntegerField(default=0)
    discount = models.IntegerField(default=0)
    payment_method = models.CharField(max_length=32, blank=True, default="")

    branch = models.ForeignKey("businesses.Branch", on_delete=models.CASCADE, related_name="bookings")
    room = models.ForeignKey("rooms.Room", on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    room_category = models.ForeignKey(
        "rooms.RoomCategory",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings",
    )
    customer = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_bookings",
    )

    class Meta:
        db_table = "bookings"

    def save(self, *args, **kwargs):
        if not self.booking_code:
            self.booking_code = f"BK-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)


class BookingExtraService(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="extra_services")
    service_key = models.CharField(max_length=64)
    summary = models.CharField(max_length=255, blank=True, default="")
    amount = models.IntegerField(default=0)

    class Meta:
        db_table = "booking_extra_services"


def normalize_scope_part(value: str) -> str:
    return " ".join(str(value or "").strip().lower().split())


def build_review_scope_key(hotel_name: str, room_name: str) -> str:
    return f"{normalize_scope_part(hotel_name)}::{normalize_scope_part(room_name)}"


class ReviewForumPost(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    customer = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="review_forum_posts",
    )
    booking_ref = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviews",
    )
    booking_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    hotel_name = models.CharField(max_length=255)
    room_name = models.CharField(max_length=255)
    scope_key = models.CharField(max_length=600, db_index=True)

    rating = models.PositiveSmallIntegerField(default=0)
    content = models.TextField()
    image_url = models.URLField(blank=True, default="")

    liked_by = models.ManyToManyField(
        "accounts.User",
        related_name="liked_review_forum_posts",
        blank=True,
    )

    class Meta:
        db_table = "review_forum_posts"
        indexes = [
            models.Index(fields=["scope_key", "created_at"]),
            models.Index(fields=["hotel_name", "room_name"]),
            models.Index(fields=["booking_id"]),
        ]

    def save(self, *args, **kwargs):
        self.scope_key = build_review_scope_key(self.hotel_name, self.room_name)
        super().save(*args, **kwargs)
