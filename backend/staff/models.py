from django.db import models
from django.conf import settings

from core.models import BaseAuditedModel


class StaffProfile(BaseAuditedModel):
    class Department(models.TextChoices):
        RECEPTIONIST = "RECEPTIONIST", "Receptionist"
        HOUSEKEEPING = "HOUSEKEEPING", "Housekeeping"
        MANAGER = "MANAGER", "Manager"
        SERVICE = "SERVICE", "Service"

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

    def __str__(self) -> str:
        return self.user.name or self.user.email

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from django.contrib.auth.models import Group

        group_name_map = {
            self.Department.RECEPTIONIST: "Receptionist_Group",
            self.Department.HOUSEKEEPING: "Housekeeping_Group",
            self.Department.MANAGER: "Manager_Group",
            self.Department.SERVICE: "Service_Group",
        }
        role_map = {
            self.Department.RECEPTIONIST: "RECEPTIONIST",
            self.Department.HOUSEKEEPING: "HOUSEKEEPING",
            self.Department.MANAGER: "MANAGER",
            self.Department.SERVICE: "SERVICE",
        }

        user = self.user
        target_group = group_name_map.get(self.department)
        removable = list(group_name_map.values()) + ["Staff_Group"]
        user.groups.remove(*user.groups.filter(name__in=removable))
        if target_group:
            group, _ = Group.objects.get_or_create(name=target_group)
            user.groups.add(group)
        staff_group, _ = Group.objects.get_or_create(name="Staff_Group")
        user.groups.add(staff_group)
        role_value = role_map.get(self.department)
        if role_value and user.role != role_value:
            user.role = role_value
            user.save(update_fields=["role", "updated_at"])
