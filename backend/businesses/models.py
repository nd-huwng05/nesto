from django.db import models

from core.models import BaseAuditedModel
from django.conf import settings
from cloudinary.models import CloudinaryField


class Company(BaseAuditedModel):
    class Meta:
        db_table = "business_companies"

    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_companies",
    )

    name = models.CharField(max_length=255)
    logo = CloudinaryField("company_logo", blank=True, null=True)

    lodging_type = models.CharField(max_length=64, blank=True, default="")
    business_type = models.CharField(max_length=64, blank=True, default="")
    scale = models.CharField(max_length=64, blank=True, default="")

    legal_name = models.CharField(max_length=255, blank=True, default="")
    tax_code = models.CharField(max_length=64, blank=True, default="")
    legal_representative = models.CharField(max_length=255, blank=True, default="")

    contact_email = models.EmailField(max_length=255, blank=True, default="")
    contact_phone = models.CharField(max_length=64, blank=True, default="")
    headquarters_address = models.TextField(blank=True, default="")

    def __str__(self) -> str:
        return self.name


class Branch(BaseAuditedModel):
    class Meta:
        db_table = "business_branches"

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="branches")

    name = models.CharField(max_length=255)
    lodging_type = models.CharField(max_length=64, blank=True, default="")
    address = models.TextField(blank=True, default="")

    phone = models.CharField(max_length=64, blank=True, default="")
    email = models.EmailField(max_length=255, blank=True, default="")

    amenities = models.JSONField(default=list, blank=True)
    guest_segments = models.JSONField(default=list, blank=True)

    image = CloudinaryField("branch_image", blank=True, null=True)
    images = models.JSONField(default=list, blank=True)

    themes = models.ManyToManyField(
        "rooms.RoomTheme",
        through="rooms.BranchTheme",
        related_name="branches",
        blank=True,
    )

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    bank_name = models.CharField(max_length=128, blank=True, default="")
    bank_account_number = models.CharField(max_length=128, blank=True, default="")

    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.company_id})"


class Department(BaseAuditedModel):
    class Meta:
        db_table = "business_departments"

    code = models.CharField(max_length=64, unique=True)
    label = models.CharField(max_length=128, blank=True, default="")

    def __str__(self) -> str:
        return self.code


class BranchCustomer(BaseAuditedModel):
    """Guest CRM record for a branch — populated when a booking is confirmed."""

    class Meta:
        db_table = "branch_customers"
        unique_together = ("branch", "user")
        indexes = [
            models.Index(fields=["branch", "last_booking_at"]),
        ]

    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="branch_customers")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="branch_customer_profiles",
    )
    guest_name = models.CharField(max_length=255, blank=True, default="")
    email = models.EmailField(max_length=255, blank=True, default="")
    phone = models.CharField(max_length=64, blank=True, default="")
    booking_count = models.PositiveIntegerField(default=0)
    total_spent = models.PositiveIntegerField(default=0)
    last_booking_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.guest_name or self.email} @ {self.branch_id}"


class FavoriteBranch(BaseAuditedModel):
    class Meta:
        db_table = "customer_favorite_branches"
        unique_together = ("customer", "branch")

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorite_branches")
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="favorited_by")

