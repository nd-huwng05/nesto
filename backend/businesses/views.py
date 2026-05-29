from drf_spectacular.utils import extend_schema
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.services.permissions import IsBusinessMember
from businesses.models import Branch, Company, Department
from businesses.serializers import BranchSerializer, CompanySerializer, DepartmentSerializer
from businesses.services.analytics_service import BusinessAnalyticsService
from staff.models import StaffProfile


@extend_schema(tags=["Businesses"])
class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "role", None) in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            return Company.objects.filter(manager=user).order_by("-created_at")
        return Company.objects.none()


@extend_schema(tags=["Businesses"])
class BranchViewSet(viewsets.ModelViewSet):
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsBusinessMember()]

    def get_queryset(self):
        user = self.request.user
        qs = Branch.objects.select_related("company").order_by("-created_at")
        role = getattr(user, "role", None)
        if role in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            qs = qs.filter(company__manager=user)
        else:
            staff_branch_id = (
                StaffProfile.objects.filter(user=user).values_list("branch_id", flat=True).first()
            )
            if staff_branch_id:
                qs = qs.filter(id=staff_branch_id)
            else:
                qs = qs.none()

        company_id = self.request.query_params.get("businessId") or self.request.query_params.get("company")
        if company_id:
            qs = qs.filter(company_id=company_id)
        return qs


@extend_schema(tags=["Businesses"])
class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all().order_by("code")
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]


@extend_schema(tags=["Businesses"])
class BusinessMetadataViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(tags=["Businesses"])
    @action(detail=False, methods=["get"])
    def options(self, request):
        return Response(
            {
                "lodgingTypes": ["Hotel", "Resort", "Motel", "Homestay", "Apartment"],
                "amenityOptions": [
                    "Free Wifi",
                    "Swimming Pool",
                    "Gym / Fitness",
                    "Parking Space",
                    "24/7 Front Desk",
                    "Restaurant",
                ],
                "guestSegments": ["Family", "Business", "Solo", "Couple", "Group"],
                "roomAmenities": [
                    "Air Conditioner",
                    "TV",
                    "Mini Bar",
                    "Wi-Fi",
                    "Work Desk",
                    "Balcony",
                ],
            }
        )


@extend_schema(tags=["Businesses"])
class BusinessAnalyticsViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]

    @extend_schema(tags=["Businesses"])
    @action(detail=False, methods=["get"], url_path="dashboard")
    def dashboard(self, request):
        qp = getattr(request, "query_params", request.GET)
        business_id = qp.get("businessId", "all")
        branch_id = qp.get("branchId", "all")
        try:
            months = int(qp.get("months", 6) or 6)
        except (TypeError, ValueError):
            months = 6
        payload = BusinessAnalyticsService.build_dashboard(
            request.user,
            business_id=business_id,
            branch_id=branch_id,
            months=months,
        )
        return Response(payload)
