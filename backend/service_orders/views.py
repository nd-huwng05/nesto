from drf_spectacular.utils import extend_schema
from rest_framework import permissions, viewsets

from accounts.permissions import IsBusinessMember
from accounts.services.tenant_queryset import TenantQuerysetService
from service_orders.models import ExtraService
from service_orders.serializers import ExtraServiceSerializer


@extend_schema(tags=["Service Orders"])
class ExtraServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ExtraServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsBusinessMember()]

    def get_queryset(self):
        qs = ExtraService.objects.select_related("branch", "branch__company").order_by("name")
        user = self.request.user
        role = getattr(user, "role", None)
        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")

        if role == "CUSTOMER":
            if branch_id:
                return qs.filter(branch_id=branch_id, branch__is_active=True)
            return qs.none()

        qs = TenantQuerysetService.filter_by_branch_membership(qs, user)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs
