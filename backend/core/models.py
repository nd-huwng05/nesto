import uuid

from django.db import models


class BaseAuditedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']


class TenantAwareModel(BaseAuditedModel):
    tenant = models.ForeignKey(
        'businesses.Company',
        on_delete=models.CASCADE,
        related_name='%(class)s_set',
        null=True,
        blank=True
    )

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if self.tenant_id is None:
            from django.db.models import F
            if hasattr(self, 'branch_id') and self.branch_id:
                self.tenant_id = self._get_tenant_from_branch()
            elif hasattr(self, 'business_id') and self.business_id:
                self.tenant_id = self._get_tenant_from_business()
        super().save(*args, **kwargs)

    def _get_tenant_from_branch(self):
        from businesses.models import Branch
        try:
            return Branch.objects.get(pk=self.branch_id).business.tenant_id
        except Branch.DoesNotExist:
            return None

    def _get_tenant_from_business(self):
        from businesses.models import Company
        try:
            return Company.objects.get(pk=self.business_id).tenant_id
        except Company.DoesNotExist:
            return None
