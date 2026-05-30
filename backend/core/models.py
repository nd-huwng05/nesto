import uuid

from django.db import models


class BaseAuditedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class TenantAwareModel(BaseAuditedModel):
    """
    Optional mixin: auto-fills tenant (Company) from branch or company FK.

    Prefer TenantQuerysetService for API queryset scoping; subclass this only when
    you need a persisted company_id column on branch-bound models.
    """

    tenant = models.ForeignKey(
        "businesses.Company",
        on_delete=models.CASCADE,
        related_name="%(class)s_set",
        null=True,
        blank=True,
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.tenant_id is None:
            if hasattr(self, "branch_id") and self.branch_id:
                self.tenant_id = self._get_tenant_from_branch()
            elif hasattr(self, "company_id") and self.company_id:
                self.tenant_id = self.company_id
        super().save(*args, **kwargs)

    def _get_tenant_from_branch(self):
        from businesses.models import Branch

        try:
            return Branch.objects.values_list("company_id", flat=True).get(pk=self.branch_id)
        except Branch.DoesNotExist:
            return None
