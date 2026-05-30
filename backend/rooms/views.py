"""
API Views cho app rooms — TAT CA view nam trong file nay.

Nhom chinh:
  - CustomerCatalogViewSet: danh sach khach san cho app khach
  - BranchRoomTypesAvailabilityViewSet: loai phong + so phong trong
  - RoomViewSet / HousekeepingTaskViewSet: quan ly phong vat ly
  - AISearchViewSet / SearchSuggestionsView: tim kiem
"""
# === CATALOG KHACH ===
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from drf_spectacular.utils import extend_schema
from django.db import models
from django.db.models import Avg, Count, Q
from django.utils import timezone
import math
from django.db.utils import OperationalError
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsBusinessMember, IsCustomerMember, IsHousekeepingMember
from bookings.models import ReviewForumPost
from businesses.models import Branch, FavoriteBranch
from core.services.cloudinary_service import CloudinaryMediaService
from service_orders.models import ExtraService
from rooms.models import BranchTheme, HousekeepingTask, MaintenanceIssue, READY_ROOM_STATUSES, Room, RoomCategory, RoomTheme
from rooms.services.housekeeping_task_service import (
    close_stale_housekeeping_tasks,
    collapse_duplicate_active_tasks,
    ensure_housekeeping_task_for_dirty_room,
)
from staff.services.ws_events_service import emit_branch_task
from rooms.serializers import (
    BranchThemeSerializer,
    HousekeepingTaskSerializer,
    MaintenanceIssueSerializer,
    RoomCategorySerializer,
    RoomCategoryAvailabilitySerializer,
    RoomSerializer,
    RoomThemeSerializer,
)
from staff.models import StaffProfile


@extend_schema(tags=["Customer"])
class CustomerCatalogViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        lat_raw = request.query_params.get("latitude")
        lng_raw = request.query_params.get("longitude")
        try:
            user_lat = float(lat_raw) if lat_raw is not None else None
            user_lng = float(lng_raw) if lng_raw is not None else None
        except Exception:
            user_lat, user_lng = None, None

        from rooms.services.customer_catalog_service import CustomerCatalogService
        from rooms.serializers.catalog import BranchCatalogSerializer

        payload = CustomerCatalogService.list_branches(user_lat=user_lat, user_lng=user_lng)
        data = BranchCatalogSerializer(payload, many=True).data
        return Response({"results": data}, status=status.HTTP_200_OK)


# === PHONG / HOUSEKEEPING / THEME ===
from django.db import transaction
from drf_spectacular.utils import extend_schema
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import models
from django.db.models import Avg, Count, Q
from django.utils import timezone
import math
from django.db.utils import OperationalError
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsBusinessMember, IsReceptionistMember, IsCustomerMember, IsHousekeepingMember
from accounts.services.tenant_queryset import TenantQuerysetService
from bookings.models import ReviewForumPost
from bookings.services.realtime_service import emit_room_status
from businesses.models import Branch, FavoriteBranch
from service_orders.models import ExtraService
from rooms.models import BranchTheme, HousekeepingTask, MaintenanceIssue, READY_ROOM_STATUSES, Room, RoomCategory, RoomTheme
from rooms.services.housekeeping_task_service import (
    close_stale_housekeeping_tasks,
    collapse_duplicate_active_tasks,
    ensure_housekeeping_task_for_dirty_room,
)
from staff.services.ws_events_service import emit_branch_task
from rooms.serializers import (
    BranchThemeSerializer,
    HousekeepingTaskSerializer,
    MaintenanceIssueSerializer,
    RoomCategorySerializer,
    RoomCategoryAvailabilitySerializer,
    RoomSerializer,
    RoomThemeSerializer,
)
from staff.models import StaffProfile


class BranchRoomTypesAvailabilityViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCustomerMember]

    def list(self, request):
        from bookings.services.booking_capacity_service import count_bookable_rooms_for_period
        from django.utils.dateparse import parse_datetime

        branch_id = str(request.query_params.get("branch_id") or request.query_params.get("branchId") or "").strip()
        if not branch_id:
            return Response({"detail": "branch_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        check_in_raw = (
            request.query_params.get("check_in_at")
            or request.query_params.get("checkInAt")
            or request.query_params.get("check_in")
        )
        check_out_raw = (
            request.query_params.get("expected_check_out_at")
            or request.query_params.get("expectedCheckOutAt")
            or request.query_params.get("check_out")
        )
        check_in_at = parse_datetime(str(check_in_raw)) if check_in_raw else None
        check_out_at = parse_datetime(str(check_out_raw)) if check_out_raw else None
        if check_in_at and timezone.is_naive(check_in_at):
            check_in_at = timezone.make_aware(check_in_at, timezone.get_current_timezone())
        if check_out_at and timezone.is_naive(check_out_at):
            check_out_at = timezone.make_aware(check_out_at, timezone.get_current_timezone())

        qs = RoomCategory.objects.filter(branch_id=branch_id).order_by("name")
        use_date_availability = bool(check_in_at and check_out_at and check_out_at > check_in_at)

        if not use_date_availability:
            qs = qs.annotate(
                available_count=Count(
                    "rooms",
                    filter=Q(rooms__status__in=list(READY_ROOM_STATUSES)),
                    distinct=True,
                )
            )
            data = RoomCategoryAvailabilitySerializer(qs, many=True, context={"request": request}).data
            return Response({"results": data}, status=status.HTTP_200_OK)

        results = []
        for category in qs:
            row = RoomCategoryAvailabilitySerializer(category, context={"request": request}).data
            row["available_count"] = count_bookable_rooms_for_period(
                branch_id=branch_id,
                room_category_id=category.id,
                check_in_at=check_in_at,
                expected_check_out_at=check_out_at,
            )
            results.append(row)
        return Response({"results": results}, status=status.HTTP_200_OK)


@extend_schema(tags=["Themes"])
class RoomThemeViewSet(viewsets.ModelViewSet):
    serializer_class = RoomThemeSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post"]

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsBusinessMember()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = RoomTheme.objects.filter(is_active=True).order_by("sort_order", "name")
        show_in_tabs = self.request.query_params.get("show_in_tabs")
        if show_in_tabs is not None and str(show_in_tabs).lower() in {"1", "true", "yes"}:
            qs = qs.filter(show_in_tabs=True)
        return qs

    def create(self, request, *args, **kwargs):
        name = str(request.data.get("name") or "").strip()
        if not name:
            return Response({"detail": "name is required."}, status=status.HTTP_400_BAD_REQUEST)
        theme, _ = RoomTheme.objects.get_or_create(name=name)
        return Response(self.get_serializer(theme).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Themes"])
class BranchThemeViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]

    def list(self, request):
        branch_id = request.query_params.get("branch_id") or request.query_params.get("branchId") or request.query_params.get("branch")
        qs = BranchTheme.objects.select_related("theme", "branch").order_by("theme__name")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        data = BranchThemeSerializer(qs, many=True).data
        return Response({"results": data}, status=status.HTTP_200_OK)

    def create(self, request):
        branch_id = request.data.get("branchId") or request.data.get("branch_id") or request.data.get("branch")
        theme_id = request.data.get("themeId") or request.data.get("theme_id") or request.data.get("theme")
        if not branch_id or not theme_id:
            return Response({"detail": "branchId and themeId are required."}, status=status.HTTP_400_BAD_REQUEST)
        row, _ = BranchTheme.objects.get_or_create(branch_id=branch_id, theme_id=theme_id)
        return Response(BranchThemeSerializer(row).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="toggle")
    def toggle(self, request):
        branch_id = request.data.get("branchId") or request.data.get("branch_id") or request.data.get("branch")
        theme_id = request.data.get("themeId") or request.data.get("theme_id") or request.data.get("theme")
        if not branch_id or not theme_id:
            return Response({"detail": "branchId and themeId are required."}, status=status.HTTP_400_BAD_REQUEST)
        existing = BranchTheme.objects.filter(branch_id=branch_id, theme_id=theme_id).first()
        if existing:
            existing.delete()
            favorited = False
        else:
            BranchTheme.objects.create(branch_id=branch_id, theme_id=theme_id)
            favorited = True
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "customer_global_role_CUSTOMER",
            {"type": "group_message", "message": {"type": "theme_update", "branchId": str(branch_id)}, "sender_channel": None},
        )
        return Response({"enabled": favorited, "branchId": str(branch_id), "themeId": str(theme_id)}, status=status.HTTP_200_OK)


@extend_schema(tags=["Rooms"])
class RoomCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = RoomCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsBusinessMember]

    def get_queryset(self):
        qs = RoomCategory.objects.select_related("branch").order_by("-created_at")
        qs = TenantQuerysetService.filter_by_branch_membership(qs, self.request.user)
        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs


@extend_schema(tags=["Rooms"])
class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated, IsHousekeepingMember]

    def get_queryset(self):
        qs = Room.objects.select_related("branch", "category").order_by("room_number")
        qs = TenantQuerysetService.filter_by_branch_membership(qs, self.request.user)
        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        room_id = self.request.query_params.get("id")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        if room_id:
            qs = qs.filter(id=room_id)
        return qs

    def perform_update(self, serializer):
        room = serializer.save()
        if str(room.status).upper() in {Room.Status.DIRTY, Room.Status.CLEANING}:
            ensure_housekeeping_task_for_dirty_room(
                room.id,
                branch_id=room.branch_id,
                note="Auto-created from room status.",
            )
        emit_room_status(room.branch_id, room.id, room.status)


@extend_schema(tags=["Rooms"])
class HousekeepingTaskViewSet(viewsets.ModelViewSet):
    serializer_class = HousekeepingTaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsHousekeepingMember]
    http_method_names = ["get", "patch", "post"]

    def perform_create(self, serializer):
        task = serializer.save()
        emit_branch_task(task.branch_id, self.get_serializer(task).data, event_type="task_created")

    def perform_update(self, serializer):
        task = serializer.save()
        emit_branch_task(task.branch_id, self.get_serializer(task).data, event_type="task_updated")

    def get_queryset(self):
        qs = HousekeepingTask.objects.select_related("room", "room__category", "branch").order_by("-created_at")
        qs = TenantQuerysetService.filter_by_branch_membership(qs, self.request.user)
        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=str(status_param).upper())
        active = str(self.request.query_params.get("active") or "").lower()
        if active in {"1", "true", "yes", "on"}:
            qs = qs.exclude(
                status__in={HousekeepingTask.Status.COMPLETED, HousekeepingTask.Status.CANCELLED}
            )
        return qs

    def list(self, request, *args, **kwargs):
        active = str(request.query_params.get("active") or "").lower()
        branch_id = request.query_params.get("branch_id") or request.query_params.get("branch")
        if branch_id and active in {"1", "true", "yes", "on"}:
            dirty_rooms = Room.objects.filter(
                branch_id=branch_id,
                status__in={Room.Status.DIRTY, Room.Status.CLEANING},
            ).only("id", "branch_id", "status")
            for room in dirty_rooms:
                ensure_housekeeping_task_for_dirty_room(
                    room.id,
                    branch_id=branch_id,
                    note="Post checkout — full clean",
                )
            collapse_duplicate_active_tasks(branch_id=branch_id)
            close_stale_housekeeping_tasks(branch_id=branch_id)
        return super().list(request, *args, **kwargs)

    @extend_schema(tags=["Rooms"])
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def start(self, request, pk=None):
        task = self.get_object()
        if task.status not in {HousekeepingTask.Status.PENDING}:
            return Response(
                {"detail": "Only pending tasks can be started."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        room = task.room
        task.status = HousekeepingTask.Status.IN_PROGRESS
        task.assigned_to = request.user if request.user.is_authenticated else task.assigned_to
        task.save(update_fields=["status", "assigned_to", "updated_at"])
        if str(room.status).upper() == Room.Status.DIRTY:
            room.status = Room.Status.CLEANING
            room.save(update_fields=["status", "updated_at"])
            emit_room_status(room.branch_id, room.id, room.status)
        emit_branch_task(
            task.branch_id,
            HousekeepingTaskSerializer(task).data,
            event_type="task_updated",
        )
        return Response(self.get_serializer(task).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Rooms"])
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def complete(self, request, pk=None):
        task = self.get_object()
        if task.status == HousekeepingTask.Status.COMPLETED:
            return Response(self.get_serializer(task).data, status=status.HTTP_200_OK)
        if task.status != HousekeepingTask.Status.IN_PROGRESS:
            return Response({"detail": "Start the task before marking it complete."}, status=status.HTTP_400_BAD_REQUEST)

        room = task.room
        room_status = str(room.status or "").upper()
        allowed_room_statuses = {
            Room.Status.DIRTY,
            Room.Status.CLEANING,
            Room.Status.OCCUPIED,
            Room.Status.AVAILABLE,
        }
        if room_status not in allowed_room_statuses:
            return Response(
                {"detail": f"Room is not cleanable from status {room.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task.status = HousekeepingTask.Status.COMPLETED
        task.completed_at = timezone.now()
        task.save(update_fields=["status", "completed_at", "updated_at"])
        emit_branch_task(
            task.branch_id,
            HousekeepingTaskSerializer(task).data,
            event_type="task_updated",
        )

        if room_status in {Room.Status.DIRTY, Room.Status.CLEANING}:
            room.status = Room.Status.AVAILABLE
            room.save(update_fields=["status", "updated_at"])
            emit_room_status(room.branch_id, room.id, room.status, room_number=room.room_number)

        return Response(self.get_serializer(task).data, status=status.HTTP_200_OK)

@extend_schema(tags=["Rooms"])
class MaintenanceIssueViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceIssueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), (IsBusinessMember | IsReceptionistMember)()]

    def get_queryset(self):
        qs = MaintenanceIssue.objects.select_related("branch").order_by("-created_at")
        qs = TenantQuerysetService.filter_by_branch_membership(qs, self.request.user)
        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs

# === AI SEARCH / FAVORITE ===
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from drf_spectacular.utils import extend_schema
from django.db import models
from django.db.models import Avg, Count, Q
from django.utils import timezone
import math
from django.db.utils import OperationalError
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsBusinessMember, IsCustomerMember, IsHousekeepingMember
from bookings.models import ReviewForumPost
from businesses.models import Branch, FavoriteBranch
from core.services.cloudinary_service import CloudinaryMediaService
from service_orders.models import ExtraService
from rooms.models import BranchTheme, HousekeepingTask, MaintenanceIssue, READY_ROOM_STATUSES, Room, RoomCategory, RoomTheme
from rooms.services.housekeeping_task_service import (
    close_stale_housekeeping_tasks,
    collapse_duplicate_active_tasks,
    ensure_housekeeping_task_for_dirty_room,
)
from staff.services.ws_events_service import emit_branch_task
from rooms.serializers import (
    BranchThemeSerializer,
    HousekeepingTaskSerializer,
    MaintenanceIssueSerializer,
    RoomCategorySerializer,
    RoomCategoryAvailabilitySerializer,
    RoomSerializer,
    RoomThemeSerializer,
)
from staff.models import StaffProfile


@extend_schema(tags=["Customer"])
class AISearchViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCustomerMember]

    def list(self, request):
        q = str(request.query_params.get("q") or "").strip()
        lat_raw = request.query_params.get("latitude")
        lng_raw = request.query_params.get("longitude")
        try:
            user_lat = float(lat_raw) if lat_raw is not None else None
            user_lng = float(lng_raw) if lng_raw is not None else None
        except Exception:
            user_lat, user_lng = None, None

        from rooms.services.search_service import SearchService
        from rooms.serializers.catalog import BranchSearchResultSerializer

        results = SearchService.ai_search(query=q, user_lat=user_lat, user_lng=user_lng)
        branches = BranchSearchResultSerializer(results.get("branches") or [], many=True).data
        return Response(
            {"results": {"branches": branches, "rooms": results.get("rooms") or [], "services": results.get("services") or []}},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Customer"])
class FavoriteBranchViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCustomerMember]

    def list(self, request):
        from rooms.serializers.catalog import FavoriteBranchSerializer

        qs = FavoriteBranch.objects.select_related("branch").filter(customer=request.user).order_by("-created_at")
        payload = []
        for fav in qs:
            b = fav.branch
            image_url = CloudinaryMediaService.resolve_field_url(getattr(b, "image", None)) or ""
            if not image_url:
                gallery = CloudinaryMediaService.resolve_json_gallery(getattr(b, "images", None) or [])
                image_url = gallery[0] if gallery else ""
            payload.append(
                {
                    "id": str(fav.id),
                    "branch_id": str(b.id),
                    "title": str(b.name or ""),
                    "address": str(b.address or ""),
                    "image": image_url,
                    "created_at": fav.created_at,
                }
            )
        data = FavoriteBranchSerializer(payload, many=True).data
        return Response({"results": data}, status=status.HTTP_200_OK)

    def create(self, request):
        branch_id = request.data.get("branch_id") or request.data.get("branchId") or request.data.get("branch")
        if not branch_id:
            return Response({"detail": "branch_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        branch = Branch.objects.filter(id=branch_id, is_active=True).first()
        if not branch:
            return Response({"detail": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)
        fav, _ = FavoriteBranch.objects.get_or_create(customer=request.user, branch=branch)
        return Response({"id": str(fav.id), "branch_id": str(branch.id)}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="toggle")
    def toggle(self, request):
        branch_id = request.data.get("branch_id") or request.data.get("branchId") or request.data.get("branch")
        if not branch_id:
            return Response({"detail": "branch_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        fav = FavoriteBranch.objects.filter(customer=request.user, branch_id=branch_id).first()
        if fav:
            fav.delete()
            return Response({"favorited": False, "branch_id": str(branch_id)}, status=status.HTTP_200_OK)
        branch = Branch.objects.filter(id=branch_id, is_active=True).first()
        if not branch:
            return Response({"detail": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)
        FavoriteBranch.objects.create(customer=request.user, branch=branch)
        return Response({"favorited": True, "branch_id": str(branch_id)}, status=status.HTTP_200_OK)

# === GOI Y TIM KIEM ===
import math
from django.db import models
from django.db.utils import OperationalError
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCustomerMember
from businesses.models import Branch
from rooms.models import Room
from service_orders.models import ExtraService


class SearchSuggestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomerMember]

    def get(self, request):
        q = str(request.query_params.get("q") or "").strip()
        lat_raw = request.query_params.get("latitude")
        lng_raw = request.query_params.get("longitude")
        try:
            user_lat = float(lat_raw) if lat_raw is not None else None
            user_lng = float(lng_raw) if lng_raw is not None else None
        except Exception:
            user_lat, user_lng = None, None

        from rooms.services.search_service import SearchService

        results = SearchService.suggestions(query=q, user_lat=user_lat, user_lng=user_lng)
        return Response({"results": results}, status=status.HTTP_200_OK)


__all__ = [
    "CustomerCatalogViewSet",
    "BranchRoomTypesAvailabilityViewSet",
    "RoomThemeViewSet",
    "BranchThemeViewSet",
    "RoomCategoryViewSet",
    "RoomViewSet",
    "HousekeepingTaskViewSet",
    "MaintenanceIssueViewSet",
    "AISearchViewSet",
    "FavoriteBranchViewSet",
    "SearchSuggestionsView",
]
