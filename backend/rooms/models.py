from django.db import models
from django.conf import settings

from core.models import BaseAuditedModel


class RoomTheme(BaseAuditedModel):
    class Meta:
        db_table = "room_themes"
        indexes = [models.Index(fields=["name"])]

    name = models.CharField(max_length=64, unique=True)
    icon = models.CharField(max_length=64, blank=True, default="")

    def __str__(self) -> str:
        return self.name


class BranchTheme(BaseAuditedModel):
    class Meta:
        db_table = "branch_themes"
        unique_together = ("branch", "theme")
        indexes = [
            models.Index(fields=["branch", "theme"]),
            models.Index(fields=["theme"]),
        ]

    branch = models.ForeignKey("businesses.Branch", on_delete=models.CASCADE, related_name="branch_themes")
    theme = models.ForeignKey(RoomTheme, on_delete=models.CASCADE, related_name="branch_themes")

    def __str__(self) -> str:
        return f"{self.branch_id}:{self.theme_id}"


class RoomCategory(BaseAuditedModel):
    class Meta:
        db_table = "room_categories"

    branch = models.ForeignKey("businesses.Branch", on_delete=models.CASCADE, related_name="room_categories")

    name = models.CharField(max_length=255)
    base_price = models.IntegerField(default=0)
    price_per_hour = models.IntegerField(default=0)
    price_per_half_day = models.IntegerField(default=0)
    price_per_day = models.IntegerField(default=0)
    capacity = models.IntegerField(default=1)
    description = models.TextField(blank=True, default="")

    room_amenities = models.JSONField(default=list, blank=True)
    images = models.JSONField(default=list, blank=True)

    def save(self, *args, **kwargs):
        if int(self.price_per_day or 0) <= 0 and int(self.base_price or 0) > 0:
            self.price_per_day = int(self.base_price)
        if int(self.price_per_hour or 0) <= 0 and int(self.price_per_day or 0) > 0:
            self.price_per_hour = max(1, int(self.price_per_day / 24))
        if int(self.price_per_half_day or 0) <= 0 and int(self.price_per_day or 0) > 0:
            self.price_per_half_day = max(self.price_per_hour * 12, int(self.price_per_day * 0.55))
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.name


class Room(BaseAuditedModel):
    class Meta:
        db_table = "rooms"

    branch = models.ForeignKey("businesses.Branch", on_delete=models.CASCADE, related_name="rooms")
    category = models.ForeignKey(RoomCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="rooms")
    themes = models.ManyToManyField(RoomTheme, through="RoomThemeLink", related_name="rooms", blank=True)

    room_number = models.CharField(max_length=32)
    floor = models.CharField(max_length=32, blank=True, default="")

    status = models.CharField(
        max_length=32,
        default="AVAILABLE",
        db_index=True,
    )

    def __str__(self) -> str:
        return f"Room {self.room_number}"


class RoomThemeLink(BaseAuditedModel):
    class Meta:
        db_table = "room_theme_links"
        unique_together = ("room", "theme")
        indexes = [
            models.Index(fields=["room", "theme"]),
            models.Index(fields=["theme"]),
        ]

    room = models.ForeignKey("rooms.Room", on_delete=models.CASCADE, related_name="room_theme_links")
    theme = models.ForeignKey(RoomTheme, on_delete=models.CASCADE, related_name="room_theme_links")

    def __str__(self) -> str:
        return f"{self.room_id}:{self.theme_id}"


class MaintenanceIssue(BaseAuditedModel):
    class Meta:
        db_table = "maintenance_issues"

    branch = models.ForeignKey("businesses.Branch", on_delete=models.CASCADE, related_name="maintenance_issues")

    room_number = models.CharField(max_length=32, blank=True, default="")
    issue_type = models.CharField(max_length=128, blank=True, default="Maintenance")
    description = models.TextField(blank=True, default="")
    is_resolved = models.BooleanField(default=False)

    def __str__(self) -> str:
        return f"{self.issue_type} - {self.room_number}"


class HousekeepingTask(BaseAuditedModel):
    class Meta:
        db_table = "housekeeping_tasks"
        indexes = [
            models.Index(fields=["branch", "status"]),
            models.Index(fields=["room", "status"]),
        ]

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    branch = models.ForeignKey("businesses.Branch", on_delete=models.CASCADE, related_name="housekeeping_tasks")
    room = models.ForeignKey("rooms.Room", on_delete=models.CASCADE, related_name="housekeeping_tasks")

    status = models.CharField(max_length=32, choices=Status.choices, default=Status.PENDING, db_index=True)
    note = models.TextField(blank=True, default="")
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"HK:{self.branch_id}:{self.room_id}:{self.status}"
