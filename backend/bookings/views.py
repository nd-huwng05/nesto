"""
Booking API views.

Customer flow: quote -> create (PENDING) -> add-service -> pay deposit
Staff flow: walk-in, lookup, check-in, checkout, cancel
Service staff: BookingLineItem task actions
Public: ReviewForumPost / locket feed
"""
import uuid as uuid_lib

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsCustomerMember, IsReceptionistMember, IsServiceMember
from accounts.services.branch_access_service import BranchAccessService
from accounts.services.tenant_queryset import TenantQuerysetService
from bookings.models import Booking, BookingLineItem, ReviewForumPost, build_review_scope_key
from bookings.serializers import (
    BookingBillSerializer,
    BookingDetailSerializer,
    BookingLineItemSerializer,
    BookingListSerializer,
    BookingQuoteInputSerializer,
    CustomerBookingCreateSerializer,
    ReviewForumPostCreateSerializer,
    ReviewForumPostSerializer,
)
from bookings.services.billing_service import build_final_bill, build_live_bill_payload
from bookings.services.booking_operations_service import BookingOperationsService
from bookings.services.booking_quote_service import BookingQuoteService
from bookings.services.customer_booking_service import CustomerBookingService
from bookings.services.geo_service import nearby_branch_ids
from bookings.services.hold_service import (
    enforce_all_overdue_no_shows,
    enforce_late_hold_for_queryset,
    enforce_late_hold_no_show,
)
from bookings.services.line_item_service import add_catalog_services_to_booking, create_line_item_from_catalog
from bookings.services.line_item_workflow_service import LineItemWorkflowService
from bookings.services.realtime_service import emit_booking_live_bill, reload_booking_for_bill
from bookings.services.review_notification_service import ReviewNotificationService
from payments.services import (
    can_use_instant_customer_payment,
    confirm_instant_deposit,
    confirm_sandbox_deposit,
    get_latest_payment_status,
    is_payment_sandbox,
)
from rooms.models import READY_ROOM_STATUSES, Room
from service_orders.models import ExtraService
from staff.models import StaffProfile


@extend_schema(tags=["Bookings"])
class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingDetailSerializer
    permission_classes = [permissions.IsAuthenticated, IsReceptionistMember]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "list":
            return BookingListSerializer
        if self.action in {"for_day"}:
            return BookingBillSerializer
        if self.action in {"retrieve", "live_bill", "final_bill", "checkout", "lookup_booking"}:
            return BookingBillSerializer
        return BookingDetailSerializer

    def update(self, request, *args, **kwargs):
        return Response(
            {"detail": "Direct booking updates are disabled. Use check-in, checkout, or cancel actions."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    partial_update = update
    destroy = update

    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        qs = (
            Booking.objects.select_related("branch", "branch__company", "room", "room__category", "room_category", "customer")
            .prefetch_related("line_items")
            .order_by("-created_at")
        )
        qs = TenantQuerysetService.filter_by_branch_membership(qs, self.request.user)

        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs

    @staticmethod
    def _truthy(value) -> bool:
        return str(value or "").lower() in {"true", "1", "yes", "on"}

    def create(self, request, *args, **kwargs):
        if self._truthy(request.data.get("walk_in") or request.data.get("walkIn")):
            return self._create_walk_in_booking(request)
        return super().create(request, *args, **kwargs)

    def _create_walk_in_booking(self, request):
        branch_id = request.data.get("branch") or request.data.get("branchId") or request.data.get("branch_id")
        room_id = request.data.get("room") or request.data.get("roomId") or request.data.get("room_id")
        guest_name = str(request.data.get("guest_name") or request.data.get("guestName") or "").strip()
        phone = str(request.data.get("phone") or "").strip()
        if not branch_id or not room_id:
            return Response(
                {"detail": "branch and room are required for walk-in check-in."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not guest_name:
            return Response({"detail": "guest_name is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not phone:
            return Response({"detail": "phone is required."}, status=status.HTTP_400_BAD_REQUEST)

        allowed, detail = BranchAccessService.assert_branch_for_staff(request.user, str(branch_id))
        if not allowed:
            return Response({"detail": detail}, status=status.HTTP_403_FORBIDDEN)

        duration_hours = int(request.data.get("duration_hours") or request.data.get("durationHours") or 0)
        if duration_hours < 1:
            days = int(request.data.get("duration_days") or request.data.get("durationDays") or 0)
            hours = int(request.data.get("duration_hours") or request.data.get("durationHours") or 1)
            duration_hours = max(1, days * 24 + hours)

        result = BookingOperationsService.create_walk_in(
            branch_id=branch_id,
            room_id=room_id,
            guest_name=guest_name,
            phone=phone,
            duration_hours=duration_hours,
            hotel_name=str(request.data.get("hotel_name") or request.data.get("hotelName") or "").strip(),
            hotel_address=str(request.data.get("hotel_address") or request.data.get("hotelAddress") or "").strip(),
            hourly_rate_fallback=int(request.data.get("hourlyRate") or request.data.get("hourly_rate") or 0),
            request=request,
            acting_user=request.user,
        )
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(result.booking).data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        booking = serializer.save()
        emit_booking_live_bill(booking, request=self.request)

    def perform_update(self, serializer):
        booking = serializer.save()
        emit_booking_live_bill(booking, request=self.request)

    @extend_schema(tags=["Bookings"])
    @action(detail=False, methods=["get"], url_path="for-day")
    def for_day(self, request):
        branch_id = request.query_params.get("branch_id") or request.query_params.get("branch")
        date_key = request.query_params.get("date")
        qs = self.get_queryset()
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        if date_key:
            try:
                y, m, d = [int(x) for x in str(date_key).split("-")]
                start = timezone.make_aware(timezone.datetime(y, m, d, 0, 0, 0))
                end = start + timezone.timedelta(days=1)
                qs = qs.filter(
                    Q(check_in_at__lt=end, expected_check_out_at__gt=start)
                    | Q(check_in_at__gte=start, check_in_at__lt=end)
                    | Q(check_out_at__gte=start, check_out_at__lt=end)
                    | (
                        Q(status="CHECKED_IN", check_in_at__lt=end)
                        & (Q(check_out_at__gt=start) | Q(check_out_at__isnull=True))
                    )
                    | Q(check_in_at__isnull=True, created_at__gte=start, created_at__lt=end)
                )
            except Exception:
                return Response({"detail": "Invalid date. Expected YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        enforce_late_hold_for_queryset(qs)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(qs, many=True).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=False, methods=["get"], url_path="lookup")
    def lookup_booking(self, request):
        raw = str(
            request.query_params.get("booking_id")
            or request.query_params.get("bookingId")
            or request.query_params.get("code")
            or request.query_params.get("booking_code")
            or ""
        ).strip()
        if not raw:
            return Response({"detail": "booking_id or code is required."}, status=status.HTTP_400_BAD_REQUEST)

        qs = self.get_queryset()
        booking = None
        try:
            parsed = uuid_lib.UUID(raw)
            booking = qs.filter(id=parsed).first()
        except (ValueError, AttributeError):
            booking = qs.filter(booking_code__iexact=raw).first()

        if not booking:
            return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        enforce_late_hold_no_show(booking)
        booking.refresh_from_db()
        if booking.status in {Booking.Status.CANCELLED, Booking.Status.CANCELLED_NO_SHOW}:
            return Response(
                {"detail": "This booking was cancelled and cannot be checked in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(booking)
        payload = dict(serializer.data)
        payload["final_bill"] = build_final_bill(booking)
        return Response(payload, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["get"], url_path="available-rooms")
    def available_rooms(self, request, pk=None):
        booking = self.get_object()
        qs = Room.objects.filter(branch_id=booking.branch_id).select_related("category")
        if booking.room_category_id:
            qs = qs.filter(category_id=booking.room_category_id)
        elif booking.room_type:
            qs = qs.filter(category__name__iexact=str(booking.room_type).strip())

        status_labels = dict(Room.Status.choices)
        rows = []
        for room in qs.order_by("room_number"):
            room_status = str(room.status or "").upper()
            rows.append(
                {
                    "id": str(room.id),
                    "room_number": room.room_number,
                    "floor": str(getattr(room, "floor", "") or ""),
                    "status": room_status,
                    "status_label": status_labels.get(room_status, room_status.title()),
                    "selectable": room_status in READY_ROOM_STATUSES,
                    "room_type_name": str(getattr(room.category, "name", "") or ""),
                    "category_id": str(room.category_id) if room.category_id else None,
                }
            )
        rows.sort(key=lambda row: (not row["selectable"], str(row["room_number"])))
        return Response(
            {
                "booking_id": str(booking.id),
                "room_type": booking.room_type,
                "room_category_id": str(booking.room_category_id) if booking.room_category_id else None,
                "rooms": rows,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["get"], url_path="final-bill")
    def final_bill(self, request, pk=None):
        booking = self.get_object()
        booking = reload_booking_for_bill(booking)
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["post"], url_path="confirm-checkin")
    def confirm_checkin(self, request, pk=None):
        booking = self.get_object()
        result = BookingOperationsService.confirm_check_in(booking, request=request)
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(result.booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["post"], url_path="assign-room-and-checkin")
    def assign_room_and_checkin(self, request, pk=None):
        booking = self.get_object()
        room_id = request.data.get("room_id") or request.data.get("room")
        if not room_id:
            return Response({"detail": "room_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        result = BookingOperationsService.assign_room_and_check_in(booking, room_id, request=request)
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(result.booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["post"], url_path="reassign-room")
    @transaction.atomic
    def reassign_room(self, request, pk=None):
        booking = self.get_object()
        room_id = request.data.get("room_id") or request.data.get("room")
        if not room_id:
            return Response({"detail": "room_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        result = BookingOperationsService.reassign_room(booking, room_id, request=request)
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(result.booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["post"], url_path="switch-room")
    @transaction.atomic
    def switch_room(self, request, pk=None):
        booking = self.get_object()
        room_id = request.data.get("room_id") or request.data.get("room")
        if not room_id:
            return Response({"detail": "room_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        note = str(request.data.get("note") or request.data.get("room_change_note") or "").strip()
        result = BookingOperationsService.switch_room(
            booking,
            room_id,
            note=note,
            actor=request.user,
            request=request,
        )
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(result.booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["post"], url_path="checkout")
    def checkout(self, request, pk=None):
        booking = self.get_object()
        payment_method = str(request.data.get("payment_method") or request.data.get("paymentMethod") or "cash").strip()
        amount_collected_raw = request.data.get("amount_collected") or request.data.get("amountCollected")
        amount_collected = int(amount_collected_raw) if amount_collected_raw is not None else None
        result = BookingOperationsService.checkout(
            booking,
            payment_method=payment_method,
            amount_collected=amount_collected,
            request=request,
        )
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        output = self.get_serializer(result.booking).data
        output.update(result.payload or {})
        return Response(output, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["get"], url_path="live-bill")
    def live_bill(self, request, pk=None):
        booking = self.get_object()
        booking = reload_booking_for_bill(booking)
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["post"], url_path="add-extra-service")
    def add_extra_service(self, request, pk=None):
        booking = self.get_object()
        if booking.status != Booking.Status.CHECKED_IN:
            return Response(
                {"detail": "Services can only be added while the guest is checked in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service_id = request.data.get("service_id") or request.data.get("serviceId")
        if not service_id:
            return Response({"detail": "service_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        svc = ExtraService.objects.filter(id=service_id, branch_id=booking.branch_id).first()
        if not svc:
            return Response(
                {"detail": "Service not found for this branch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        amount = request.data.get("amount")
        if amount is None or str(amount).strip() == "":
            amount = int(svc.price or 0)
        else:
            amount = int(amount) if str(amount).isdigit() else int(svc.price or 0)

        line = create_line_item_from_catalog(
            booking,
            svc,
            source=BookingLineItem.Source.RECEPTION,
            initial_status=BookingLineItem.Status.PENDING,
        )
        if int(amount) != int(line.amount):
            line.amount = int(amount)
            line.summary = str(request.data.get("summary") or svc.name or "")[:255]
            line.save(update_fields=["amount", "summary", "updated_at"])
        amount = int(line.amount or 0)
        booking.base_price = int(booking.base_price or 0) + amount
        booking.save(update_fields=["base_price", "updated_at"])
        booking = reload_booking_for_bill(booking)
        emit_booking_live_bill(booking, request=request)
        output = self.get_serializer(booking).data
        output["live_bill"] = build_live_bill_payload(booking)
        return Response(output, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["post"], url_path="cancel")
    @transaction.atomic
    def cancel_booking(self, request, pk=None):
        booking = self.get_object()
        reason = str(request.data.get("reason") or request.data.get("cancelReason") or "staff_cancelled").strip()
        result = BookingOperationsService.cancel_booking(
            booking,
            actor=request.user,
            reason=reason,
            request=request,
        )
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        output = dict(self.get_serializer(result.booking).data)
        if result.payload and result.payload.get("refund"):
            output["refund"] = result.payload["refund"]
        return Response(output, status=status.HTTP_200_OK)


@extend_schema(tags=["Customer"])
class CustomerBookingViewSet(viewsets.ModelViewSet):
    """
    API dat phong cho khach hang (role CUSTOMER).

    Luong app mobile:
      quote -> payment MoMo/ZaloPay -> create CONFIRMED booking (checkout-first)
      add-service: them dich vu vao booking da tao (checkout hoac sau check-in)
    """
    permission_classes = [permissions.IsAuthenticated, IsCustomerMember]
    http_method_names = ["get", "post"]

    def get_serializer_class(self):
        if self.action == "create":
            return CustomerBookingCreateSerializer
        if self.action == "list":
            return BookingListSerializer
        if self.action in {"customer_live_bill", "add_service"}:
            return BookingBillSerializer
        return BookingDetailSerializer

    def get_queryset(self):
        user = self.request.user
        qs = (
            Booking.objects.select_related("branch", "room", "room__category", "room_category")
            .prefetch_related("line_items")
            .filter(customer=user)
            .order_by("-created_at")
        )
        booking_code = self.request.query_params.get("booking_code")
        if booking_code:
            qs = qs.filter(booking_code=str(booking_code).strip())
        return qs

    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        enforce_late_hold_no_show(instance)
        instance.refresh_from_db()
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Customer"])
    @action(detail=False, methods=["post"], url_path="quote")
    def quote(self, request):
        """Step 1: price quote + availability check (does not create a booking)."""
        result = BookingQuoteService.build_customer_quote(
            room_type_id=request.data.get("room_type_id") or request.data.get("roomTypeId"),
            branch_id=request.data.get("branch") or request.data.get("branch_id"),
            check_in_raw=request.data.get("check_in_at") or request.data.get("checkInAt"),
            check_out_raw=request.data.get("expected_check_out_at") or request.data.get("expectedCheckOutAt"),
            deposit_percentage_raw=request.data.get("deposit_percentage")
            or request.data.get("depositPercentage"),
            customer_id=getattr(request.user, "id", None),
        )
        if not result.ok:
            body = {"detail": result.detail}
            if result.available is not None:
                body["available"] = result.available
            return Response(body, status=result.http_status)
        return Response(result.payload, status=status.HTTP_200_OK)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Legacy: create PENDING booking (resume payment). Prefer checkout-first payment flow."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = CustomerBookingService.create_pending(
            user=request.user,
            serializer=serializer,
            raw_deposit_percentage=request.data.get("deposit_percentage")
            or request.data.get("depositPercentage"),
            request=request,
        )
        if not result.ok:
            return Response({"detail": result.detail}, status=result.http_status)
        # Chưa thanh toán — không broadcast WS (tránh crash client; chỉ push sau CONFIRMED).
        return Response(result.response_data, status=status.HTTP_201_CREATED)

    @extend_schema(tags=["Customer"])
    @action(detail=True, methods=["post"], url_path="check-in")
    def customer_check_in(self, request, pk=None):
        """Physical check-in is performed by reception (QR + room assignment)."""
        booking = self.get_object()
        if booking.status not in {Booking.Status.PENDING, Booking.Status.CONFIRMED}:
            return Response(
                {"detail": "Only pending or confirmed bookings can proceed to reception check-in."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not booking.room_id:
            return Response(
                {
                    "detail": "A physical room must be assigned by reception before check-in.",
                    "status": booking.status,
                    "booking_code": booking.booking_code,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "detail": "Present your booking QR at reception to complete check-in.",
                "status": booking.status,
                "booking_code": booking.booking_code,
                "room_assigned": True,
            },
            status=status.HTTP_200_OK,
        )

    @extend_schema(tags=["Customer"])
    @action(detail=True, methods=["post"], url_path="cancel")
    @transaction.atomic
    def cancel_booking(self, request, pk=None):
        booking = self.get_object()
        reason = str(request.data.get("reason") or request.data.get("cancelReason") or "").strip()
        result = BookingOperationsService.cancel_booking(
            booking,
            actor=request.user,
            reason=reason,
            request=request,
        )
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        response_data = dict(self.get_serializer(result.booking).data)
        if result.payload and result.payload.get("refund"):
            response_data["refund"] = result.payload["refund"]
        return Response(response_data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Customer"])
    @action(detail=True, methods=["post"], url_path="pay-deposit")
    @transaction.atomic
    def pay_deposit(self, request, pk=None):
        booking = Booking.objects.select_for_update().get(pk=self.get_object().pk, customer=request.user)
        amount = int(request.data.get("amount") or request.data.get("depositAmount") or booking.deposit_amount or 0)
        payment_method = request.data.get("payment_method") or request.data.get("paymentMethod") or "momo"

        from bookings.services.hold_service import enforce_payment_hold_expiry

        try:
            enforce_payment_hold_expiry(booking)
            booking.refresh_from_db()
            if booking.status == Booking.Status.CANCELLED:
                return Response(
                    {"detail": "Payment window expired. Please create a new booking."},
                    status=status.HTTP_410_GONE,
                )

            if can_use_instant_customer_payment(payment_method):
                confirm_instant_deposit(booking, amount=amount, payment_method=payment_method)
            elif is_payment_sandbox(payment_method):
                confirm_sandbox_deposit(booking, amount=amount, payment_method=payment_method)
            else:
                payload = get_latest_payment_status(booking, reconcile=True)
                if not payload.get("deposit_paid"):
                    return Response(
                        {
                            "detail": "Payment not verified yet. Complete payment in MoMo/ZaloPay and wait for confirmation.",
                            "payment_status": payload,
                        },
                        status=status.HTTP_402_PAYMENT_REQUIRED,
                    )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        booking.refresh_from_db()
        emit_booking_live_bill(booking, request=request)
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Customer"])
    @action(detail=True, methods=["post"], url_path="add-service")
    @transaction.atomic
    def add_service(self, request, pk=None):
        """Them dich vu vao booking (checkout hoac sau khi da dat / dang o)."""
        booking = Booking.objects.select_for_update().get(pk=self.get_object().pk, customer=request.user)
        allowed_statuses = {
            Booking.Status.PENDING,
            Booking.Status.CONFIRMED,
            Booking.Status.CHECKED_IN,
        }
        if booking.status not in allowed_statuses:
            return Response(
                {"detail": "Services cannot be added to this booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_ids = request.data.get("service_ids") or request.data.get("serviceIds") or []
        if isinstance(raw_ids, str):
            raw_ids = [part.strip() for part in raw_ids.split(",") if part.strip()]
        if not isinstance(raw_ids, list) or not raw_ids:
            single_id = request.data.get("service_id") or request.data.get("serviceId")
            raw_ids = [single_id] if single_id else []

        service_ids = [str(sid).strip() for sid in raw_ids if str(sid).strip()]
        if not service_ids:
            return Response({"detail": "service_ids is required."}, status=status.HTTP_400_BAD_REQUEST)

        services_qs = list(ExtraService.objects.filter(id__in=service_ids, branch_id=booking.branch_id))
        if len(services_qs) != len(set(service_ids)):
            return Response(
                {"detail": "One or more services are invalid for this branch."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _, added_total = add_catalog_services_to_booking(
            booking,
            services_qs,
            source=BookingLineItem.Source.CUSTOMER,
            initial_status=BookingLineItem.Status.PENDING,
        )
        booking.base_price = int(booking.base_price or 0) + added_total
        booking.save(update_fields=["base_price", "updated_at"])
        booking = reload_booking_for_bill(booking)
        emit_booking_live_bill(booking, request=request)

        response_data = dict(self.get_serializer(booking).data)
        response_data["added_services_total"] = added_total
        response_data["live_bill"] = build_live_bill_payload(booking)
        return Response(response_data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Customer"])
    @action(detail=True, methods=["get"], url_path="live-bill")
    def customer_live_bill(self, request, pk=None):
        booking = self.get_object()
        booking = reload_booking_for_bill(booking)
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)


@extend_schema(tags=["Service Orders"])
class BookingLineItemViewSet(viewsets.ReadOnlyModelViewSet):
    """Staff tasks for extra services (spa, restaurant, transport, ...)."""

    serializer_class = BookingLineItemSerializer
    permission_classes = [permissions.IsAuthenticated, IsServiceMember]

    def get_queryset(self):
        qs = (
            BookingLineItem.objects.select_related("booking", "branch", "extra_service", "assigned_to")
            .exclude(status=BookingLineItem.Status.CANCELLED)
            .order_by("-created_at")
        )
        qs = TenantQuerysetService.filter_by_branch_membership(qs, self.request.user)
        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)

        profile = StaffProfile.objects.filter(user=self.request.user).first()
        service_category = str(getattr(profile, "service_category", "") or "").strip().upper()
        if service_category:
            qs = qs.filter(category__iexact=service_category)
        return qs

    @extend_schema(tags=["Service Orders"])
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def accept(self, request, pk=None):
        line = self.get_object()
        result = LineItemWorkflowService.accept(line, actor=request.user)
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(result.line_item).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Service Orders"])
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def start(self, request, pk=None):
        line = self.get_object()
        result = LineItemWorkflowService.start(line)
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(result.line_item).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Service Orders"])
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def complete(self, request, pk=None):
        line = self.get_object()
        result = LineItemWorkflowService.complete(line)
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(result.line_item).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Service Orders"])
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def cancel(self, request, pk=None):
        line = self.get_object()
        result = LineItemWorkflowService.cancel(line)
        if not result.ok:
            return Response({"detail": result.detail}, status=status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(result.line_item).data, status=status.HTTP_200_OK)


def _resolve_booking_for_customer(user, booking_id_raw: str):
    token = str(booking_id_raw or "").strip().lstrip("#")
    if not token:
        return None
    qs = Booking.objects.filter(customer=user).select_related("branch")
    booking = qs.filter(booking_code__iexact=token).first()
    if booking:
        return booking
    if token.upper().startswith("BK"):
        booking = qs.filter(booking_code__iexact=token).first()
        if booking:
            return booking
    try:
        parsed = uuid_lib.UUID(token)
        return qs.filter(id=parsed).first()
    except (ValueError, AttributeError):
        return None


def _personal_branch_ids(user):
    from businesses.models import FavoriteBranch

    booked = set(
        Booking.objects.filter(customer=user)
        .exclude(branch_id__isnull=True)
        .values_list("branch_id", flat=True)
    )
    favorited = set(FavoriteBranch.objects.filter(customer=user).values_list("branch_id", flat=True))
    return list(booked | favorited)


def _filter_reviews_by_branches(qs, branch_ids):
    if not branch_ids:
        return qs.none()
    return qs.filter(
        Q(branch_id__in=branch_ids) | Q(booking_ref__branch_id__in=branch_ids)
    ).distinct()


@extend_schema(tags=["Reviews"])
class ReviewForumPostViewSet(viewsets.ModelViewSet):
    queryset = (
        ReviewForumPost.objects.select_related("customer", "booking_ref", "booking_ref__branch", "branch")
        .prefetch_related("liked_by")
        .all()
    )
    http_method_names = ["get", "post", "head", "options"]

    def get_permissions(self):
        if self.action in {"create", "toggle_heart"}:
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        if self.action == "create":
            return ReviewForumPostCreateSerializer
        return ReviewForumPostSerializer

    def get_queryset(self):
        qs = super().get_queryset().order_by("-created_at")
        branch_id = str(self.request.query_params.get("branch_id") or self.request.query_params.get("branchId") or "").strip()
        hotel_name = str(self.request.query_params.get("hotel_name") or "").strip()
        room_name = str(self.request.query_params.get("room_name") or "").strip()
        public = str(self.request.query_params.get("public") or "").strip().lower() in {"1", "true", "yes"}
        if public:
            branch_id = str(
                self.request.query_params.get("branch_id") or self.request.query_params.get("branchId") or ""
            ).strip()
            if branch_id:
                qs = qs.filter(Q(branch_id=branch_id) | Q(booking_ref__branch_id=branch_id)).distinct()
            else:
                qs = qs.filter(branch_id__isnull=False)
            return qs[:50]
        mine = str(self.request.query_params.get("mine") or "").strip().lower() in {"1", "true", "yes"}
        if mine:
            user = getattr(self.request, "user", None)
            if user and user.is_authenticated:
                qs = qs.filter(customer=user)
        if branch_id:
            qs = qs.filter(Q(branch_id=branch_id) | Q(booking_ref__branch_id=branch_id)).distinct()
        if hotel_name and room_name:
            scope_key = build_review_scope_key(hotel_name, room_name)
            qs = qs.filter(scope_key=scope_key)
        elif hotel_name:
            qs = qs.filter(hotel_name__icontains=hotel_name)
        return qs

    @extend_schema(tags=["Reviews"])
    @action(detail=False, methods=["get"], url_path="locket-feed")
    def locket_feed(self, request):
        public = str(request.query_params.get("public") or "").strip().lower() in {"1", "true", "yes"}
        qs = ReviewForumPost.objects.select_related(
            "customer", "booking_ref", "booking_ref__branch", "branch"
        ).prefetch_related("liked_by").order_by("-created_at")
        if public:
            branch_id = str(request.query_params.get("branch_id") or request.query_params.get("branchId") or "").strip()
            if branch_id:
                qs = qs.filter(Q(branch_id=branch_id) | Q(booking_ref__branch_id=branch_id)).distinct()
            else:
                qs = qs.filter(branch_id__isnull=False)
            serializer = ReviewForumPostSerializer(qs[:50], many=True, context={"request": request})
            return Response(
                {
                    "mode": "public",
                    "radiusKm": None,
                    "branchIds": [],
                    "results": serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        lat_raw = request.query_params.get("latitude") or request.query_params.get("lat")
        lng_raw = request.query_params.get("longitude") or request.query_params.get("lng")
        radius_raw = request.query_params.get("radius_km") or request.query_params.get("radiusKm") or "30"

        has_coords = False
        try:
            lat = float(lat_raw)
            lng = float(lng_raw)
            has_coords = True
        except (TypeError, ValueError):
            lat = lng = 0.0

        mode = "personal"
        radius_km = 30.0
        branch_ids = []

        if has_coords:
            try:
                radius_km = max(5.0, float(radius_raw))
            except (TypeError, ValueError):
                radius_km = 30.0
            branch_ids = nearby_branch_ids(lat, lng, radius_km=radius_km)
            if not branch_ids and radius_km < 80:
                branch_ids = nearby_branch_ids(lat, lng, radius_km=80.0)
                radius_km = 80.0
            mode = "nearby"
            qs = _filter_reviews_by_branches(qs, branch_ids)
        else:
            user = getattr(request, "user", None)
            if user and user.is_authenticated:
                branch_ids = _personal_branch_ids(user)
            qs = _filter_reviews_by_branches(qs, branch_ids)

        serializer = ReviewForumPostSerializer(qs[:120], many=True, context={"request": request})
        return Response(
            {
                "mode": mode,
                "radiusKm": radius_km,
                "branchIds": [str(bid) for bid in branch_ids],
                "results": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        booking_id = str(serializer.validated_data.pop("booking_id", "") or "").strip()
        booking = _resolve_booking_for_customer(request.user, booking_id) if booking_id else None
        branch = None
        branch_id = serializer.validated_data.pop("branch_id", None)
        if branch_id:
            from businesses.models import Branch

            branch = Branch.objects.filter(id=branch_id, is_active=True).first()
        if not branch and booking and booking.branch_id:
            branch = booking.branch
        post = serializer.save(
            customer=request.user,
            booking_ref=booking,
            branch=branch,
        )
        ReviewNotificationService.notify_locket_post_created(post)
        output = ReviewForumPostSerializer(post, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="toggle-heart")
    def toggle_heart(self, request, pk=None):
        post = self.get_object()
        user = request.user
        if post.liked_by.filter(id=user.id).exists():
            post.liked_by.remove(user)
        else:
            post.liked_by.add(user)
        output = ReviewForumPostSerializer(post, context={"request": request})
        return Response(output.data, status=status.HTTP_200_OK)

__all__ = ["BookingViewSet", "BookingLineItemViewSet", "CustomerBookingViewSet", "ReviewForumPostViewSet"]
