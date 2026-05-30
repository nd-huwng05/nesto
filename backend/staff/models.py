from django.db import models
from django.conf import settings

from core.models import BaseAuditedModel


class StaffProfile(BaseAuditedModel):
    class Department(models.TextChoices):
        RECEPTIONIST = "RECEPTIONIST", "Receptionist"
        HOUSEKEEPING = "HOUSEKEEPING", "Housekeeping"
        SERVICE = "SERVICE", "Service"

    class ServiceCategory(models.TextChoices):
        SPA = "SPA", "Spa"
        RESTAURANT = "RESTAURANT", "Restaurant"
        TRANSPORT = "TRANSPORT", "Transport"
        ROOM_SERVICE = "ROOM_SERVICE", "Room Service"

    class Meta:
        db_table = "staff_profiles"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="staff_profile",
    )
    branch = models.ForeignKey(
        "businesses.Branch",
        on_delete=models.CASCADE,
        related_name="staff_profiles",
    )

    job_role = models.CharField(max_length=64, blank=True, default="")
    department = models.CharField(
        max_length=32,
        choices=Department.choices,
        default=Department.RECEPTIONIST,
    )
    service_category = models.CharField(
        max_length=32,
        blank=True,
        default="",
        help_text="Task filter for SERVICE staff: SPA, RESTAURANT, TRANSPORT, ROOM_SERVICE",
    )

    def __str__(self) -> str:
        return self.user.name or self.user.email

    def save(self, *args, **kwargs):
        from accounts.services.role_sync_service import normalize_service_category

        if self.department == self.Department.SERVICE:
            self.service_category = normalize_service_category(self.service_category) or self.ServiceCategory.ROOM_SERVICE
        else:
            self.service_category = ""
        super().save(*args, **kwargs)
        from accounts.services.role_sync_service import RoleSyncService

        RoleSyncService.apply_staff_profile(self.user, self)
