from django.db import models

from core.models import BaseAuditedModel


class ExtraService(BaseAuditedModel):
    class Meta:
        db_table = "extra_services"
        constraints = [
            models.UniqueConstraint(fields=["branch", "name"], name="uniq_extra_service_branch_name"),
        ]

    branch = models.ForeignKey("businesses.Branch", on_delete=models.CASCADE, related_name="extra_services")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    price = models.IntegerField(default=0)
    icon = models.CharField(max_length=64, blank=True, default="sparkles-outline")
    category = models.CharField(max_length=64, default="RESTAURANT")

    def __str__(self) -> str:
        return self.name
