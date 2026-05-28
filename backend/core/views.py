from django.db.models import Sum
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, viewsets
from rest_framework.response import Response

from bookings.models import Booking
from businesses.models import Branch, Company
from rooms.models import Room
from core.serializers import InvoiceSerializer


@extend_schema(tags=["Billing"])
class ReportViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        role = getattr(request.user, "role", None)
        if role not in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            return Response({"detail": "Not permitted."}, status=403)
        business_id = request.query_params.get("businessId", "all")
        branch_id = request.query_params.get("branchId", "all")
        payload = self._build_dashboard(business_id, branch_id, request.user)
        return Response(payload)

    def retrieve(self, request, pk=None):
        return self.list(request)

    def _build_dashboard(self, business_id, branch_id, user):
        companies_qs = Company.objects.filter(manager=user)
        if business_id and business_id != "all":
            companies_qs = companies_qs.filter(id=business_id)
        branches_qs = Branch.objects.filter(company__in=companies_qs)
        if branch_id and branch_id != "all":
            branches_qs = branches_qs.filter(id=branch_id)

        rooms_qs = Room.objects.filter(branch__in=branches_qs)
        bookings_qs = Booking.objects.filter(branch__in=branches_qs)

        total_rooms = rooms_qs.count()
        occupied_rooms = rooms_qs.filter(status__iexact="OCCUPIED").count()
        occupancy_rate = (occupied_rooms / total_rooms * 100) if total_rooms else 0
        monthly_revenue = (
            bookings_qs.filter(status="CHECKED_OUT").aggregate(total=Sum("base_price")).get("total") or 0
        )
        today_checkins = bookings_qs.filter(status="CHECKED_IN").count()
        pending_bookings = bookings_qs.filter(status="PENDING").count()

        branch_filters = [{"id": "all", "name": "All Branches", "businessId": "all"}]
        for br in branches_qs:
            branch_filters.append(
                {"id": str(br.id), "name": br.name, "businessId": str(br.company_id)}
            )

        business_filters = [{"id": "all", "name": "All Businesses"}]
        for cp in companies_qs:
            business_filters.append({"id": str(cp.id), "name": cp.name})

        return {
            "status": "success",
            "data": {
                "businessFilter": business_id or "all",
                "branchFilter": branch_id or "all",
                "businessOptions": business_filters,
                "branchOptions": branch_filters,
                "totalRevenue": int(monthly_revenue),
                "totalBookings": bookings_qs.count(),
                "csatScore": 4.6,
                "monthlyRevenue": [],
                "occupancyRate": round(occupancy_rate, 1),
                "filterLabel": "Portfolio",
                "periodLabel": "Current period",
                "occupancy_rate": round(occupancy_rate, 1),
                "total_rooms": total_rooms,
                "occupied_rooms": occupied_rooms,
                "monthly_revenue": int(monthly_revenue),
                "today_checkins": today_checkins,
                "pending_bookings": pending_bookings,
            },
        }


@extend_schema(tags=["Billing"])
class TransactionViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        return Response({"status": "success", "data": []})

    def create(self, request):
        return Response({"status": "success", "data": request.data})


@extend_schema(tags=["Billing"])
class InvoiceViewSet(viewsets.ViewSet):
    """
    Minimal invoice endpoints to satisfy frontend contract.
    This project stores payments/checkout totals on Bookings; invoices are represented as lightweight DTOs.
    """

    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        # Keep access aligned with billing reports (owners/admin only).
        role = getattr(request.user, "role", None)
        if role not in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            return Response({"detail": "Not permitted."}, status=403)
        return Response({"status": "success", "data": []})

    def retrieve(self, request, pk=None):
        role = getattr(request.user, "role", None)
        if role not in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            return Response({"detail": "Not permitted."}, status=403)
        # Placeholder object shape (no DB model in this backend).
        payload = {"id": str(pk), "status": "DRAFT", "amount": 0, "currency": "VND", "note": ""}
        serializer = InvoiceSerializer(payload)
        return Response({"status": "success", "data": serializer.data})

    def create(self, request):
        role = getattr(request.user, "role", None)
        if role not in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            return Response({"detail": "Not permitted."}, status=403)
        serializer = InvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        data["id"] = "invoice"
        return Response({"status": "success", "data": data})

    def partial_update(self, request, pk=None):
        role = getattr(request.user, "role", None)
        if role not in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            return Response({"detail": "Not permitted."}, status=403)
        serializer = InvoiceSerializer(data={**request.data, "id": str(pk)}, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        data["id"] = str(pk)
        return Response({"status": "success", "data": data})

