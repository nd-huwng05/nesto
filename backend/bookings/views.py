from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsCustomerMember, IsReceptionistMember
from bookings.models import Booking, BookingExtraService, ReviewForumPost, build_review_scope_key
from bookings.serializers import (
    BookingSerializer,
    CustomerBookingCreateSerializer,
    ReviewForumPostCreateSerializer,
    ReviewForumPostSerializer,
)
from rooms.models import Room
from staff.models import StaffProfile


def _emit_bookings_event(booking: Booking, event_type: str = "booking_update"):
    channel_layer = get_channel_layer()
    groups = [
        f"bookings_branch_{booking.branch_id}_role_RECEPTIONIST",
        f"bookings_branch_{booking.branch_id}_role_MANAGER",
        f"bookings_branch_{booking.branch_id}_role_BUSINESS_OWNER",
        f"bookings_branch_{booking.branch_id}_role_SUPER_ADMIN",
    ]
    message = {
        "type": event_type,
        "bookingId": str(booking.id),
        "status": booking.status,
        "branchId": str(booking.branch_id),
    }
    for group in groups:
        async_to_sync(channel_layer.group_send)(
            group, {"type": "group_message", "message": message, "sender_channel": None}
        )


def _emit_room_event(branch_id, room_id, room_status):
    channel_layer = get_channel_layer()
    groups = [
        f"rooms_branch_{branch_id}_role_HOUSEKEEPING",
        f"rooms_branch_{branch_id}_role_RECEPTIONIST",
        f"rooms_branch_{branch_id}_role_MANAGER",
        f"rooms_branch_{branch_id}_role_BUSINESS_OWNER",
        f"rooms_branch_{branch_id}_role_SUPER_ADMIN",
    ]
    message = {"type": "room_status", "roomId": str(room_id), "status": room_status, "branchId": str(branch_id)}
    for group in groups:
        async_to_sync(channel_layer.group_send)(
            group, {"type": "group_message", "message": message, "sender_channel": None}
        )


@extend_schema(tags=["Bookings"])
class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated, IsReceptionistMember]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsReceptionistMember()]

    def get_queryset(self):
        qs = Booking.objects.select_related("branch", "room").order_by("-created_at")
        user = self.request.user
        role = getattr(user, "role", None)
        if role in {"SUPER_ADMIN"}:
            pass
        elif role in {"BUSINESS_OWNER"}:
            qs = qs.filter(Q(branch__company__owner=user) | Q(branch__business__owner=user))
        else:
            staff_branch_id = (
                StaffProfile.objects.filter(user=user).values_list("branch_id", flat=True).first()
            )
            if staff_branch_id:
                qs = qs.filter(branch_id=staff_branch_id)
            else:
                qs = qs.none()

        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs

    def perform_create(self, serializer):
        booking = serializer.save()
        _emit_bookings_event(booking, "booking_update")

    def perform_update(self, serializer):
        booking = serializer.save()
        _emit_bookings_event(booking, "booking_update")

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
                qs = qs.filter(created_at__gte=start, created_at__lt=end)
            except Exception:
                return Response({"detail": "Invalid date. Expected YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(self.get_serializer(page, many=True).data)
        return Response(self.get_serializer(qs, many=True).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["post"], url_path="confirm-checkin")
    def confirm_checkin(self, request, pk=None):
        booking = self.get_object()
        if booking.status != Booking.Status.PENDING:
            return Response({"detail": "Only pending bookings can be checked in."}, status=status.HTTP_400_BAD_REQUEST)
        if not booking.room_id:
            return Response({"detail": "Assign a room before check-in."}, status=status.HTTP_400_BAD_REQUEST)
        booking.status = Booking.Status.CHECKED_IN
        booking.check_in_at = booking.check_in_at or timezone.now()
        booking.save(update_fields=["status", "check_in_at", "updated_at"])

        Room.objects.filter(id=booking.room_id).update(status="OCCUPIED", updated_at=timezone.now())
        _emit_room_event(booking.branch_id, booking.room_id, "OCCUPIED")
        _emit_bookings_event(booking, "booking_update")
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)


@extend_schema(tags=["Customer"])
class CustomerBookingViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCustomerMember]
    http_method_names = ["get", "post"]

    def get_serializer_class(self):
        if self.action == "create":
            return CustomerBookingCreateSerializer
        return BookingSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Booking.objects.select_related("branch", "room").filter(customer=user).order_by("-created_at")
        booking_code = self.request.query_params.get("booking_code")
        if booking_code:
            qs = qs.filter(booking_code=str(booking_code).strip())
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save(customer=request.user, status=Booking.Status.PENDING, walk_in=False)
        _emit_bookings_event(booking, "booking_update")
        output = BookingSerializer(booking, context={"request": request})
        return Response(output.data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Reviews"])
class ReviewForumPostViewSet(viewsets.ModelViewSet):
    queryset = ReviewForumPost.objects.select_related("customer", "booking_ref").prefetch_related("liked_by").all()

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
        mine = str(self.request.query_params.get("mine") or "").strip().lower() in {"1", "true", "yes"}
        if mine:
            user = getattr(self.request, "user", None)
            if user and user.is_authenticated:
                qs = qs.filter(customer=user)
        if branch_id:
            qs = qs.filter(booking_ref__branch_id=branch_id)
        if hotel_name and room_name:
            scope_key = build_review_scope_key(hotel_name, room_name)
            qs = qs.filter(scope_key=scope_key)
        elif hotel_name:
            qs = qs.filter(hotel_name__icontains=hotel_name)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        booking_id = str(serializer.validated_data.get("booking_id") or "").strip()
        booking = None
        if booking_id:
            booking = Booking.objects.filter(customer=request.user, booking_code=booking_id).first()
        post = ReviewForumPost.objects.create(
            customer=request.user,
            booking_ref=booking,
            booking_id=booking_id,
            hotel_name=serializer.validated_data["hotel_name"],
            room_name=serializer.validated_data["room_name"],
            content=serializer.validated_data["content"],
            rating=serializer.validated_data.get("rating") or 0,
            image_url=str(serializer.validated_data.get("image_url") or ""),
        )
        try:
            branch_id = None
            if booking and getattr(booking, "branch_id", None):
                branch_id = str(booking.branch_id)
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "customer_global_role_CUSTOMER",
                {"type": "group_message", "message": {"type": "review_created", "branchId": branch_id, "reviewId": str(post.id)}, "sender_channel": None},
            )
        except Exception:
            pass
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

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["post"], url_path="assign-room-and-checkin")
    def assign_room_and_checkin(self, request, pk=None):
        booking = self.get_object()
        room_id = request.data.get("room_id") or request.data.get("room")
        if not room_id:
            return Response({"detail": "room_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if booking.status != Booking.Status.PENDING:
            return Response({"detail": "Only pending bookings can be assigned."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            room = Room.objects.get(id=room_id, branch_id=booking.branch_id)
        except Room.DoesNotExist:
            return Response({"detail": "Room not found for this branch."}, status=status.HTTP_400_BAD_REQUEST)

        booking.room = room
        booking.original_room_number = booking.original_room_number or ""
        booking.status = Booking.Status.CHECKED_IN
        booking.check_in_at = booking.check_in_at or timezone.now()
        booking.save(update_fields=["room", "status", "check_in_at", "updated_at", "original_room_number"])

        room.status = "OCCUPIED"
        room.save(update_fields=["status", "updated_at"])
        _emit_room_event(booking.branch_id, room.id, room.status)
        _emit_bookings_event(booking, "booking_update")
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["post"], url_path="switch-room")
    def switch_room(self, request, pk=None):
        booking = self.get_object()
        room_id = request.data.get("room_id") or request.data.get("room")
        if not room_id:
            return Response({"detail": "room_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if booking.status != Booking.Status.CHECKED_IN:
            return Response({"detail": "Only checked-in bookings can switch rooms."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            new_room = Room.objects.get(id=room_id, branch_id=booking.branch_id)
        except Room.DoesNotExist:
            return Response({"detail": "Room not found for this branch."}, status=status.HTTP_400_BAD_REQUEST)

        old_room_id = booking.room_id
        old_room_number = booking.room.room_number if booking.room else ""
        booking.original_room_number = old_room_number
        booking.room = new_room
        booking.room_change_note = f"Switched from {old_room_number or 'N/A'} to {new_room.room_number}"
        booking.save(update_fields=["room", "original_room_number", "room_change_note", "updated_at"])

        if old_room_id:
            Room.objects.filter(id=old_room_id).update(status="DIRTY", updated_at=timezone.now())
            _emit_room_event(booking.branch_id, old_room_id, "DIRTY")
        new_room.status = "OCCUPIED"
        new_room.save(update_fields=["status", "updated_at"])
        _emit_room_event(booking.branch_id, new_room.id, new_room.status)

        _emit_bookings_event(booking, "booking_update")
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["post"], url_path="checkout")
    def checkout(self, request, pk=None):
        booking = self.get_object()
        if booking.status not in {Booking.Status.CHECKED_IN}:
            return Response({"detail": "Only checked-in bookings can be checked out."}, status=status.HTTP_400_BAD_REQUEST)
        payment_method = request.data.get("payment_method") or ""
        booking.payment_method = str(payment_method)
        booking.status = Booking.Status.CHECKED_OUT
        booking.check_out_at = timezone.now()
        booking.save(update_fields=["payment_method", "status", "check_out_at", "updated_at"])

        if booking.room_id:
            Room.objects.filter(id=booking.room_id).update(status="DIRTY", updated_at=timezone.now())
            _emit_room_event(booking.branch_id, booking.room_id, "DIRTY")
        _emit_bookings_event(booking, "booking_update")
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Bookings"])
    @action(detail=True, methods=["post"], url_path="add-extra-service")
    def add_extra_service(self, request, pk=None):
        booking = self.get_object()
        service_id = request.data.get("service_id")
        summary = request.data.get("summary") or ""
        amount = request.data.get("amount") or 0
        if not service_id:
            return Response({"detail": "service_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        BookingExtraService.objects.create(
            booking=booking,
            service_key=str(service_id),
            summary=str(summary)[:255],
            amount=int(amount) if str(amount).isdigit() else 0,
        )
        booking.refresh_from_db()
        _emit_bookings_event(booking, "booking_update")
        return Response(self.get_serializer(booking).data, status=status.HTTP_200_OK)
