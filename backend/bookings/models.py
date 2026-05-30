import uuid

from django.conf import settings
from cloudinary.models import CloudinaryField
from django.db import models
from django.utils import timezone

from core.models import BaseAuditedModel


class Booking(BaseAuditedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CHECKED_IN = "CHECKED_IN", "Checked in"
        CHECKED_OUT = "CHECKED_OUT", "Checked out"
        CANCELLED = "CANCELLED", "Cancelled"
        CANCELLED_NO_SHOW = "CANCELLED_NO_SHOW", "Cancelled no-show"

    booking_code = models.CharField(max_length=64, unique=True)
    guest_name = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(max_length=255, blank=True, default="")
    phone = models.CharField(max_length=64, blank=True, default="")
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    walk_in = models.BooleanField(default=False)

    check_in_at = models.DateTimeField(null=True, blank=True)
    check_out_at = models.DateTimeField(null=True, blank=True)
    expected_check_out_at = models.DateTimeField(null=True, blank=True)

    hotel_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Snapshot of branch name at booking time.",
    )
    hotel_address = models.TextField(
        blank=True,
        default="",
        help_text="Snapshot of branch address at booking time.",
    )

    room_type = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Snapshot of room category name at booking time.",
    )
    original_room_number = models.CharField(max_length=32, blank=True, default="")
    room_change_note = models.TextField(blank=True, default="")
    special_requests = models.TextField(
        blank=True,
        default="",
        help_text="Guest special requests captured at booking time (diet, accessibility, etc.).",
    )

    hourly_rate = models.IntegerField(default=0)
    room_price = models.IntegerField(default=0)
    base_price = models.IntegerField(default=0)
    deposit_percentage = models.PositiveSmallIntegerField(default=20)
    deposit_amount = models.IntegerField(default=0)
    hold_minutes = models.PositiveIntegerField(default=0)
    late_hold_deadline_at = models.DateTimeField(null=True, blank=True)
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
        indexes = [
            models.Index(fields=["branch", "room_category", "status"], name="booking_avail_status_idx"),
            models.Index(fields=["branch", "room_category", "check_in_at"], name="booking_avail_checkin_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.booking_code:
            self.booking_code = f"BK-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)


def build_display_code(service_code: str, line_no: int) -> str:
    code = str(service_code or "").strip()
    no = max(1, int(line_no or 1))
    return code if no <= 1 else f"{code}-{no:02d}"


def service_code_from_catalog(catalog_service) -> str:
    if catalog_service is None:
        return "SER-UNKNOWN"
    category = str(getattr(catalog_service, "category", "SVC") or "SVC").upper()[:3]
    suffix = str(getattr(catalog_service, "id", "")).replace("-", "")[:6].upper()
    return f"SER-{category}-{suffix or '001'}"


class BookingLineItem(BaseAuditedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONFIRMED = "CONFIRMED", "Confirmed"
        IN_PROGRESS = "IN_PROGRESS", "In progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    class Source(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        RECEPTION = "RECEPTION", "Reception"

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="line_items")
    branch = models.ForeignKey("businesses.Branch", on_delete=models.CASCADE, related_name="booking_line_items")
    extra_service = models.ForeignKey(
        "service_orders.ExtraService",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="line_items",
    )
    service_key = models.CharField(max_length=64, blank=True, default="")
    service_code = models.CharField(max_length=64, blank=True, default="")
    line_no = models.PositiveSmallIntegerField(default=1)
    display_code = models.CharField(max_length=64, blank=True, default="")
    summary = models.CharField(max_length=255, blank=True, default="")
    amount = models.IntegerField(default=0)
    category = models.CharField(max_length=64, default="ROOM_SERVICE")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING, db_index=True)
    source = models.CharField(max_length=32, choices=Source.choices, default=Source.CUSTOMER)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_booking_line_items",
    )
    assigned_staff = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Display name fallback when staff user is not linked.",
    )
    items = models.JSONField(default=list, blank=True)
    room_number = models.CharField(max_length=32, blank=True, default="")
    guest_name = models.CharField(max_length=255, blank=True, default="")
    guest_phone = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        db_table = "booking_line_items"
        constraints = [
            models.UniqueConstraint(fields=["booking", "display_code"], name="uniq_booking_line_display_code"),
        ]

    def save(self, *args, **kwargs):
        if not self.service_code and self.extra_service_id:
            self.service_code = service_code_from_catalog(self.extra_service)
        if not self.display_code:
            self.display_code = build_display_code(self.service_code, self.line_no)
        super().save(*args, **kwargs)


def normalize_scope_part(value: str) -> str:
    return " ".join(str(value or "").strip().lower().split())


def build_review_scope_key(hotel_name: str, room_name: str) -> str:
    return f"{normalize_scope_part(hotel_name)}::{normalize_scope_part(room_name)}"


class ReviewForumPost(BaseAuditedModel):
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
    branch = models.ForeignKey(
        "businesses.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="locket_posts",
    )
    hotel_name = models.CharField(max_length=255)
    room_name = models.CharField(max_length=255)
    scope_key = models.CharField(max_length=600, db_index=True)

    rating = models.PositiveSmallIntegerField(default=0)
    content = models.TextField()
    image = CloudinaryField("image", blank=True, null=True)
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
            models.Index(fields=["booking_ref", "created_at"]),
            models.Index(fields=["branch", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        self.scope_key = build_review_scope_key(self.hotel_name, self.room_name)
        super().save(*args, **kwargs)

    @property
    def booking_id(self) -> str:
        if self.booking_ref_id:
            return str(self.booking_ref_id)
        return ""
