from drf_spectacular.utils import extend_schema
from rest_framework import permissions, viewsets

from accounts.permissions import IsBusinessMember
from staff.models import StaffProfile
from staff.serializers import StaffProfileSerializer


@extend_schema(tags=["Staff"])
class StaffProfileViewSet(viewsets.ModelViewSet):
    serializer_class = StaffProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated(), IsBusinessMember()]
        user = self.request.user
        if getattr(user, "role", None) in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            return [permissions.IsAuthenticated(), IsBusinessMember()]
        if user.groups.filter(name__in=["Manager_Group", "Admin_Group", "Business_Group"]).exists():
            return [permissions.IsAuthenticated(), IsBusinessMember()]
        return [permissions.IsAuthenticated(), permissions.IsAdminUser()]

    def get_queryset(self):
        qs = StaffProfile.objects.select_related("user", "branch", "branch__company").order_by("-created_at")

        business_id = self.request.query_params.get("businessId") or self.request.query_params.get("business_id")
        branch_id = self.request.query_params.get("branchId") or self.request.query_params.get("branch_id")
        if business_id:
            qs = qs.filter(branch__company_id=business_id)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs
