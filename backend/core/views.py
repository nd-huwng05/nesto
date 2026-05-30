"""
API Views cho app core — upload anh + billing.
"""
# === UPLOAD CLOUDINARY ===
import os

import cloudinary.uploader
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView


@extend_schema(tags=["Media"])
class CloudinaryImageUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload_file = request.FILES.get("file") or request.FILES.get("image")
        if not upload_file:
            return Response({"detail": "file or image is required."}, status=status.HTTP_400_BAD_REQUEST)

        folder = str(request.data.get("folder") or "nesto/lockets").strip() or "nesto/lockets"
        if not os.getenv("CLOUDINARY_CLOUD_NAME"):
            return Response(
                {"detail": "Cloudinary is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            result = cloudinary.uploader.upload(
                upload_file,
                folder=folder,
                resource_type="image",
            )
        except Exception as exc:
            return Response(
                {"detail": f"Cloudinary upload failed: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        secure_url = str(result.get("secure_url") or result.get("url") or "").strip()
        if not secure_url:
            return Response({"detail": "Upload succeeded but no URL was returned."}, status=status.HTTP_502_BAD_GATEWAY)

        return Response(
            {
                "url": secure_url,
                "secureUrl": secure_url,
                "publicId": result.get("public_id") or "",
                "width": result.get("width"),
                "height": result.get("height"),
                "format": result.get("format") or "",
            },
            status=status.HTTP_201_CREATED,
        )

# === BILLING (staff) ===
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response

from accounts.permissions import IsBusinessMember, IsReceptionistMember
from accounts.services.tenant_queryset import TenantQuerysetService
from bookings.models import Booking
from bookings.services.billing_service import build_final_bill
from bookings.services.booking_operations_service import BookingOperationsService
from core.serializers.billing import (
    BillingInvoiceSerializer,
    BillingReportSerializer,
    BillingTransactionSerializer,
)


def _resolve_booking_id(raw):
    token = str(raw or "").strip().lstrip("#")
    if not token:
        return None
    booking = Booking.objects.filter(booking_code__iexact=token).first()
    if booking:
        return booking
    try:
        import uuid as uuid_lib

        return Booking.objects.filter(id=uuid_lib.UUID(token)).first()
    except (ValueError, AttributeError):
        return None


def _scoped_bookings(user, request):
    qs = Booking.objects.select_related("branch", "customer", "room", "room_category").order_by("-updated_at")
    qs = TenantQuerysetService.filter_by_branch_membership(qs, user)
    branch_id = str(request.query_params.get("branch_id") or request.query_params.get("branchId") or "").strip()
    if branch_id:
        qs = qs.filter(branch_id=branch_id)
    business_id = str(request.query_params.get("businessId") or request.query_params.get("company") or "").strip()
    if business_id:
        qs = qs.filter(branch__company_id=business_id)
    return qs


def _serialize_transaction(booking: Booking) -> dict:
    total = int(getattr(booking, "base_price", 0) or 0)
    payload = {
        "id": str(booking.id),
        "transaction_id": str(booking.id),
        "booking_id": str(booking.id),
        "status": "completed" if booking.status == Booking.Status.CHECKED_OUT else "pending",
        "amount": total,
        "currency": "VND",
        "payment_method": str(booking.payment_method or ""),
        "branch_id": str(booking.branch_id or ""),
        "branch_name": str(getattr(getattr(booking, "branch", None), "name", "") or ""),
        "customer_name": str(getattr(getattr(booking, "customer", None), "name", "") or ""),
        "created_at": booking.check_out_at or booking.updated_at or timezone.now(),
        "updated_at": booking.updated_at,
    }
    return BillingTransactionSerializer(payload).data


def _serialize_invoice(booking: Booking) -> dict:
    bill = build_final_bill(booking)
    payload = {
        "id": str(booking.id),
        "status": "PAID" if booking.status == Booking.Status.CHECKED_OUT else "OPEN",
        "amount": int(bill.get("gross_total") or bill.get("grossTotal") or booking.base_price or 0),
        "currency": "VND",
        "note": f"Booking {booking.booking_code}",
        "booking_id": str(booking.id),
        "branch_id": str(booking.branch_id or ""),
        "payment_method": str(booking.payment_method or ""),
        "created_at": booking.check_out_at or booking.created_at,
        "updated_at": booking.updated_at,
    }
    return BillingInvoiceSerializer(payload).data


class _StaffBillingPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        for checker in (IsReceptionistMember(), IsBusinessMember()):
            if checker.has_permission(request, view):
                return True
        return False


@extend_schema(tags=["Billing"])
class BillingTransactionViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, _StaffBillingPermission]

    def list(self, request):
        qs = _scoped_bookings(request.user, request).filter(status=Booking.Status.CHECKED_OUT)
        booking_id = str(
            request.query_params.get("bookingId")
            or request.query_params.get("transactionId")
            or request.query_params.get("id")
            or ""
        ).strip()
        if booking_id:
            resolved = _resolve_booking_id(booking_id)
            qs = qs.filter(id=resolved.id) if resolved else qs.none()
        rows = [_serialize_transaction(booking) for booking in qs[:100]]
        return Response({"results": rows}, status=status.HTTP_200_OK)

    def create(self, request):
        booking_id = request.data.get("bookingId") or request.data.get("booking_id")
        booking = _resolve_booking_id(booking_id)
        if not booking:
            return Response({"detail": "bookingId is required."}, status=status.HTTP_400_BAD_REQUEST)

        payment_method = str(
            request.data.get("paymentMethod") or request.data.get("payment_method") or "cash"
        ).strip()
        amount_raw = request.data.get("amount") or request.data.get("amountCollected") or request.data.get("amount_collected")
        amount_collected = int(amount_raw) if amount_raw is not None else None

        result = BookingOperationsService.checkout(
            booking,
            payment_method=payment_method,
            amount_collected=amount_collected,
            request=request,
        )
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_serialize_transaction(result.booking), status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        booking = _resolve_booking_id(pk)
        if not booking:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        qs = _scoped_bookings(request.user, request).filter(id=booking.id)
        if not qs.exists():
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_serialize_transaction(booking), status=status.HTTP_200_OK)


@extend_schema(tags=["Billing"])
class BillingInvoiceViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, _StaffBillingPermission]

    def list(self, request):
        qs = _scoped_bookings(request.user, request).exclude(status=Booking.Status.CANCELLED)
        rows = [_serialize_invoice(booking) for booking in qs[:100]]
        return Response({"results": rows}, status=status.HTTP_200_OK)

    def retrieve(self, request, pk=None):
        booking = _resolve_booking_id(pk)
        if not booking:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        qs = _scoped_bookings(request.user, request).filter(id=booking.id)
        if not qs.exists():
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_serialize_invoice(booking), status=status.HTTP_200_OK)


@extend_schema(tags=["Billing"])
class BillingReportViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]

    def list(self, request):
        qs = _scoped_bookings(request.user, request).filter(status=Booking.Status.CHECKED_OUT)
        total_revenue = sum(int(b.base_price or 0) for b in qs[:5000])
        total_bookings = qs.count()
        return Response(
            {
                "results": [
                    BillingReportSerializer(
                        {
                            "id": "summary",
                            "title": "Billing summary",
                            "total_revenue": total_revenue,
                            "total_bookings": total_bookings,
                            "currency": "VND",
                            "generated_at": timezone.now(),
                        }
                    ).data
                ]
            },
            status=status.HTTP_200_OK,
        )

    def retrieve(self, request, pk=None):
        return self.list(request)

__all__ = [
    "CloudinaryImageUploadView",
    "BillingTransactionViewSet",
    "BillingInvoiceViewSet",
    "BillingReportViewSet",
]
