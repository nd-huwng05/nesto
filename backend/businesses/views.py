from datetime import date

from django.db.models import Count, Sum
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
import logging

from businesses.models import Branch, Company, Department
from businesses.serializers import BranchSerializer, CompanySerializer, DepartmentSerializer
from accounts.permissions import IsBusinessMember
from staff.models import StaffProfile
from bookings.models import Booking
from rooms.models import HousekeepingTask, Room

logger = logging.getLogger(__name__)


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
        user = request.user
        business_id = getattr(request, "query_params", request.GET).get("businessId", "all")
        branch_id = getattr(request, "query_params", request.GET).get("branchId", "all")
        try:
            months = int(getattr(request, "query_params", request.GET).get("months", 6) or 6)
        except Exception:
            months = 6
        months = max(1, min(months, 24))

        # Safe defaults - never 500.
        total_revenue = 0
        total_bookings = 0
        occupancy_rate = 0.0
        task_completion_rate = 0.0
        monthly_revenue = []
        business_filters = [{"id": "all", "name": "All Businesses"}]
        branch_filters = [{"id": "all", "name": "All Branches", "businessId": "all"}]

        end = timezone.now()
        start = end.replace(day=1, hour=0, minute=0, second=0, microsecond=0) - timezone.timedelta(
            days=31 * (months - 1)
        )

        try:
            # Owners see companies they manage. Managers/staff may not be managers of a company,
            # so we also allow companies derived from their StaffProfile branch assignment.
            companies_qs = Company.objects.filter(manager=user)
            if not companies_qs.exists():
                companies_qs = Company.objects.filter(branches__staff_profiles__user=user)
            companies_qs = companies_qs.distinct()
            if business_id and business_id != "all":
                companies_qs = companies_qs.filter(id=business_id)

            try:
                business_filters = [{"id": "all", "name": "All Businesses"}] + [
                    {"id": str(cp.id), "name": cp.name} for cp in companies_qs.order_by("name")
                ]
            except Exception as exc:
                logger.exception("Analytics business options failed: %s", exc)

            branches_qs = Branch.objects.filter(company__in=companies_qs)
            if branch_id and branch_id != "all":
                branches_qs = branches_qs.filter(id=branch_id)

            try:
                branch_filters = [{"id": "all", "name": "All Branches", "businessId": "all"}] + [
                    {"id": str(br.id), "name": br.name, "businessId": str(br.company_id)}
                    for br in branches_qs.order_by("name")
                ]
            except Exception as exc:
                logger.exception("Analytics branch options failed: %s", exc)

            # These queries are the most likely to fail on schema mismatch.
            try:
                rooms_qs = Room.objects.filter(branch__in=branches_qs)
                total_rooms = rooms_qs.count()
            except Exception as exc:
                logger.exception("Analytics rooms query failed: %s", exc)
                total_rooms = 0

            try:
                bookings_qs = Booking.objects.filter(branch__in=branches_qs)
                total_bookings = bookings_qs.count()
                checked_in = bookings_qs.filter(status="CHECKED_IN").count()
                occupancy_rate = round((checked_in / total_rooms * 100) if total_rooms else 0, 1)
            except Exception as exc:
                logger.exception("Analytics bookings query failed: %s", exc)
                bookings_qs = None
                total_bookings = 0
                occupancy_rate = 0.0

            # Monthly revenue
            by_month = {}
            if bookings_qs is not None:
                try:
                    revenue_rows = (
                        bookings_qs.filter(
                            status="CHECKED_OUT",
                            check_out_at__isnull=False,
                            check_out_at__gte=start,
                        )
                        .annotate(month=TruncMonth("check_out_at"))
                        .values("month")
                        .annotate(revenue=Coalesce(Sum("base_price"), 0), bookings=Count("id"))
                        .order_by("month")
                    )
                    by_month = {
                        row["month"].date(): int(row["revenue"] or 0)
                        for row in revenue_rows
                        if row.get("month")
                    }
                except Exception as exc:
                    logger.exception("Analytics revenue aggregation failed: %s", exc)
                    by_month = {}

            labels = []
            cursor = start.date().replace(day=1)
            for _ in range(months):
                labels.append(cursor)
                cursor_year = cursor.year + (cursor.month // 12)
                cursor_month = (cursor.month % 12) + 1
                cursor = date(cursor_year, cursor_month, 1)

            for m in labels:
                label = f"{m.month:02d}/{str(m.year)[-2:]}"
                monthly_revenue.append({"label": label, "revenue": int(by_month.get(m, 0))})
            total_revenue = int(sum(item["revenue"] for item in monthly_revenue))

            # Housekeeping completion
            try:
                tasks_qs = HousekeepingTask.objects.filter(branch__in=branches_qs)
                completed_tasks = tasks_qs.filter(status="COMPLETED").count()
                total_tasks = tasks_qs.exclude(status="CANCELLED").count()
                task_completion_rate = round((completed_tasks / total_tasks * 5) if total_tasks else 0, 1)
            except Exception as exc:
                logger.exception("Analytics housekeeping query failed: %s", exc)
                task_completion_rate = 0.0

        except Exception as exc:
            # Absolute safety net: never 500.
            logger.exception("Analytics dashboard failed: %s", exc)

        return Response(
            {
                "businessFilter": business_id or "all",
                "branchFilter": branch_id or "all",
                "businessOptions": business_filters,
                "branchOptions": branch_filters,
                "totalRevenue": int(total_revenue or 0),
                "totalBookings": int(total_bookings or 0),
                "csatScore": float(task_completion_rate or 0),
                "monthlyRevenue": monthly_revenue,
                "occupancyRate": float(occupancy_rate or 0),
                "filterLabel": "Portfolio",
                "periodLabel": f"Last {months} months",
            }
        )
