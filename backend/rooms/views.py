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
from service_orders.models import ExtraService
from rooms.models import BranchTheme, HousekeepingTask, MaintenanceIssue, Room, RoomCategory, RoomTheme
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

        def haversine_km(lat1, lon1, lat2, lon2):
            r = 6371.0
            phi1 = math.radians(lat1)
            phi2 = math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlambda = math.radians(lon2 - lon1)
            a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
            return 2 * r * math.asin(math.sqrt(a))

        qs = Branch.objects.filter(is_active=True).select_related("company")
        has_coords = user_lat is not None and user_lng is not None
        if not has_coords:
            qs = qs.defer("latitude", "longitude").order_by("-created_at")
        else:
            qs = qs.order_by("-created_at")
        try:
            branches = list(qs)
        except OperationalError:
            branches = list(Branch.objects.filter(is_active=True).select_related("company").defer("latitude", "longitude").order_by("-created_at"))
            has_coords = False
        theme_rows = BranchTheme.objects.select_related("theme").values("branch_id", "theme__name")
        theme_map = {}
        for row in theme_rows:
            bid = str(row.get("branch_id") or "")
            name = str(row.get("theme__name") or "").strip()
            if not bid or not name:
                continue
            theme_map.setdefault(bid, []).append(name)

        ratings = (
            ReviewForumPost.objects.values("hotel_name")
            .annotate(avg_rating=Avg("rating"), review_count=Count("id"))
        )
        rating_map = {
            str(row.get("hotel_name") or ""): {
                "avg": float(row.get("avg_rating") or 0),
                "count": int(row.get("review_count") or 0),
            }
            for row in ratings
        }
        payload = []
        for b in branches:
            rm = rating_map.get(b.name, {"avg": 0.0, "count": 0})
            themes = theme_map.get(str(b.id), [])
            image_url = ""
            try:
                image_url = b.image.url if getattr(b, "image", None) else ""
            except Exception:
                image_url = ""
            if not image_url:
                images = getattr(b, "images", None)
                if isinstance(images, list) and images:
                    first = images[0]
                    image_url = str(first or "")
            payload.append(
                {
                    "id": str(b.id),
                    "branchId": str(b.id),
                    "companyId": str(getattr(b, "company_id", "") or ""),
                    "title": str(b.name or ""),
                    "address": str(b.address or ""),
                    "city": str(b.address or "").split(",")[0].strip() if b.address else "",
                    "image": image_url,
                    "description": "",
                    "lodgingType": str(b.lodging_type or ""),
                    "rating": rm["avg"],
                    "reviewCount": rm["count"],
                    "themes": themes,
                    "distanceKm": (
                        haversine_km(user_lat, user_lng, float(b.latitude), float(b.longitude))
                        if has_coords and b.latitude is not None and b.longitude is not None
                        else None
                    ),
                }
            )
        if has_coords:
            payload.sort(key=lambda row: (row.get("distanceKm") is None, row.get("distanceKm") or 0, str(row.get("title") or "")))
        return Response({"results": payload}, status=status.HTTP_200_OK)


@extend_schema(tags=["Customer"])
class AISearchViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCustomerMember]

    def list(self, request):
        q = str(request.query_params.get("q") or "").strip()
        if not q:
            return Response({"results": {"branches": [], "rooms": [], "services": []}}, status=status.HTTP_200_OK)

        lat_raw = request.query_params.get("latitude")
        lng_raw = request.query_params.get("longitude")
        try:
            user_lat = float(lat_raw) if lat_raw is not None else None
            user_lng = float(lng_raw) if lng_raw is not None else None
        except Exception:
            user_lat, user_lng = None, None
        has_coords = user_lat is not None and user_lng is not None

        def haversine_km(lat1, lon1, lat2, lon2):
            r = 6371.0
            phi1 = math.radians(lat1)
            phi2 = math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlambda = math.radians(lon2 - lon1)
            a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
            return 2 * r * math.asin(math.sqrt(a))

        qs = Branch.objects.filter(is_active=True).filter(models.Q(name__icontains=q) | models.Q(address__icontains=q))
        if not has_coords:
            qs = qs.defer("latitude", "longitude").order_by("-created_at")
        else:
            qs = qs.order_by("-created_at")
        try:
            branches = list(qs[:20])
        except OperationalError:
            branches = list(Branch.objects.filter(is_active=True).filter(models.Q(name__icontains=q) | models.Q(address__icontains=q)).defer("latitude", "longitude").order_by("-created_at")[:20])
            has_coords = False
        branch_payload = []
        for b in branches:
            image_url = ""
            try:
                image_url = b.image.url if getattr(b, "image", None) else ""
            except Exception:
                image_url = ""
            if not image_url:
                images = getattr(b, "images", None)
                if isinstance(images, list) and images:
                    image_url = str(images[0] or "")
            branch_payload.append(
                {
                    "id": str(b.id),
                    "branchId": str(b.id),
                    "title": str(b.name or ""),
                    "address": str(b.address or ""),
                    "image": image_url,
                    "distanceKm": (
                        haversine_km(user_lat, user_lng, float(b.latitude), float(b.longitude))
                        if has_coords and b.latitude is not None and b.longitude is not None
                        else None
                    ),
                }
            )
        if has_coords:
            branch_payload.sort(key=lambda row: (row.get("distanceKm") is None, row.get("distanceKm") or 0, str(row.get("title") or "")))

        rooms = (
            Room.objects.select_related("branch", "category")
            .filter(branch__is_active=True)
            .filter(models.Q(room_number__icontains=q) | models.Q(category__name__icontains=q) | models.Q(branch__name__icontains=q))
            .order_by("branch__name", "room_number")[:30]
        )
        room_payload = [
            {
                "id": str(r.id),
                "room_number": str(r.room_number or ""),
                "category": str(getattr(r.category, "name", "") or ""),
                "branch_id": str(r.branch_id),
                "branch_name": str(getattr(r.branch, "name", "") or ""),
                "status": str(r.status or ""),
            }
            for r in rooms
        ]

        services = (
            ExtraService.objects.select_related("branch")
            .filter(branch__is_active=True)
            .filter(models.Q(name__icontains=q) | models.Q(branch__name__icontains=q))
            .order_by("branch__name", "name")[:30]
        )
        service_payload = [
            {
                "id": str(s.id),
                "name": str(s.name or ""),
                "price": float(s.price or 0),
                "branch_id": str(s.branch_id),
                "branch_name": str(getattr(s.branch, "name", "") or ""),
            }
            for s in services
        ]

        return Response(
            {"results": {"branches": branch_payload, "rooms": room_payload, "services": service_payload}},
            status=status.HTTP_200_OK,
        )


@extend_schema(tags=["Customer"])
class FavoriteBranchViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCustomerMember]

    def list(self, request):
        qs = FavoriteBranch.objects.select_related("branch").filter(customer=request.user).order_by("-created_at")
        payload = []
        for fav in qs:
            b = fav.branch
            image_url = ""
            try:
                image_url = b.image.url if getattr(b, "image", None) else ""
            except Exception:
                image_url = ""
            if not image_url:
                images = getattr(b, "images", None)
                if isinstance(images, list) and images:
                    image_url = str(images[0] or "")
            payload.append(
                {
                    "id": str(fav.id),
                    "branchId": str(b.id),
                    "title": str(b.name or ""),
                    "address": str(b.address or ""),
                    "image": image_url,
                    "createdAt": fav.created_at.isoformat() if getattr(fav, "created_at", None) else "",
                }
            )
        return Response({"results": payload}, status=status.HTTP_200_OK)

    def create(self, request):
        branch_id = request.data.get("branchId") or request.data.get("branch_id") or request.data.get("branch")
        if not branch_id:
            return Response({"detail": "branchId is required."}, status=status.HTTP_400_BAD_REQUEST)
        branch = Branch.objects.filter(id=branch_id, is_active=True).first()
        if not branch:
            return Response({"detail": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)
        fav, _ = FavoriteBranch.objects.get_or_create(customer=request.user, branch=branch)
        return Response({"id": str(fav.id), "branchId": str(branch.id)}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="toggle")
    def toggle(self, request):
        branch_id = request.data.get("branchId") or request.data.get("branch_id") or request.data.get("branch")
        if not branch_id:
            return Response({"detail": "branchId is required."}, status=status.HTTP_400_BAD_REQUEST)
        fav = FavoriteBranch.objects.filter(customer=request.user, branch_id=branch_id).first()
        if fav:
            fav.delete()
            return Response({"favorited": False, "branchId": str(branch_id)}, status=status.HTTP_200_OK)
        branch = Branch.objects.filter(id=branch_id, is_active=True).first()
        if not branch:
            return Response({"detail": "Branch not found."}, status=status.HTTP_404_NOT_FOUND)
        FavoriteBranch.objects.create(customer=request.user, branch=branch)
        return Response({"favorited": True, "branchId": str(branch_id)}, status=status.HTTP_200_OK)


@extend_schema(tags=["Customer"])
class BranchRoomTypesAvailabilityViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated, IsCustomerMember]

    def list(self, request):
        branch_id = str(request.query_params.get("branch_id") or request.query_params.get("branchId") or "").strip()
        if not branch_id:
            return Response({"detail": "branch_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        qs = (
            RoomCategory.objects.filter(branch_id=branch_id)
            .annotate(
                available_count=Count(
                    "rooms",
                    filter=Q(rooms__status="AVAILABLE"),
                    distinct=True,
                )
            )
            .order_by("name")
        )
        data = RoomCategoryAvailabilitySerializer(qs, many=True, context={"request": request}).data
        return Response({"results": data}, status=status.HTTP_200_OK)


@extend_schema(tags=["Themes"])
class RoomThemeViewSet(viewsets.ModelViewSet):
    serializer_class = RoomThemeSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post"]

    def get_queryset(self):
        return RoomTheme.objects.all().order_by("name")

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
        user = self.request.user
        role = getattr(user, "role", None)
        if role in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            qs = qs.filter(branch__company__manager=user)
        else:
            staff_branch_id = (
                StaffProfile.objects.filter(user=user).values_list("branch_id", flat=True).first()
            )
            if staff_branch_id:
                qs = qs.filter(branch_id=staff_branch_id)
            else:
                qs = qs.none()
        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        room_id = self.request.query_params.get("id")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        if room_id:
            qs = qs.filter(id=room_id)
        return qs

    def perform_update(self, serializer):
        room = serializer.save()
        if str(room.status).upper() in {"DIRTY", "CLEANING"}:
            HousekeepingTask.objects.get_or_create(
                branch_id=room.branch_id,
                room_id=room.id,
                status=HousekeepingTask.Status.PENDING,
                defaults={"note": "Auto-created from room status."},
            )
        channel_layer = get_channel_layer()
        groups = [
            f"rooms_branch_{room.branch_id}_role_HOUSEKEEPING",
            f"rooms_branch_{room.branch_id}_role_RECEPTIONIST",
            f"rooms_branch_{room.branch_id}_role_MANAGER",
            f"rooms_branch_{room.branch_id}_role_BUSINESS_OWNER",
            f"rooms_branch_{room.branch_id}_role_SUPER_ADMIN",
        ]
        message = {
            "type": "room_status",
            "roomId": str(room.id),
            "status": room.status,
            "branchId": str(room.branch_id),
        }
        for group in groups:
            async_to_sync(channel_layer.group_send)(
                group,
                {
                    "type": "group_message",
                    "message": message,
                    "sender_channel": None,
                },
            )


@extend_schema(tags=["Rooms"])
class HousekeepingTaskViewSet(viewsets.ModelViewSet):
    serializer_class = HousekeepingTaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsHousekeepingMember]
    http_method_names = ["get", "patch", "post"]

    def get_queryset(self):
        qs = HousekeepingTask.objects.select_related("room", "branch").order_by("-created_at")
        user = self.request.user
        role = getattr(user, "role", None)
        if role in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            qs = qs.filter(branch__company__manager=user)
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
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=str(status_param).upper())
        return qs

    @extend_schema(tags=["Rooms"])
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()
        if task.status in {HousekeepingTask.Status.COMPLETED, HousekeepingTask.Status.CANCELLED}:
            return Response({"detail": "Task is already closed."}, status=status.HTTP_400_BAD_REQUEST)
        room = task.room
        if str(room.status).upper() not in {"DIRTY", "CLEANING"}:
            return Response(
                {"detail": f"Room is not cleanable from status {room.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        task.status = HousekeepingTask.Status.COMPLETED
        task.completed_at = timezone.now()
        task.save(update_fields=["status", "completed_at", "updated_at"])
        room.status = "AVAILABLE"
        room.save(update_fields=["status", "updated_at"])
        channel_layer = get_channel_layer()
        groups = [
            f"rooms_branch_{room.branch_id}_role_HOUSEKEEPING",
            f"rooms_branch_{room.branch_id}_role_RECEPTIONIST",
            f"rooms_branch_{room.branch_id}_role_MANAGER",
            f"rooms_branch_{room.branch_id}_role_BUSINESS_OWNER",
            f"rooms_branch_{room.branch_id}_role_SUPER_ADMIN",
        ]
        message = {
            "type": "room_status",
            "roomId": str(room.id),
            "status": room.status,
            "branchId": str(room.branch_id),
        }
        for group in groups:
            async_to_sync(channel_layer.group_send)(
                group,
                {
                    "type": "group_message",
                    "message": message,
                    "sender_channel": None,
                },
            )
        return Response(self.get_serializer(task).data, status=status.HTTP_200_OK)

@extend_schema(tags=["Rooms"])
class MaintenanceIssueViewSet(viewsets.ModelViewSet):
    serializer_class = MaintenanceIssueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsBusinessMember()]

    def get_queryset(self):
        qs = MaintenanceIssue.objects.select_related("branch").order_by("-created_at")
        user = self.request.user
        role = getattr(user, "role", None)
        if role in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            qs = qs.filter(branch__company__manager=user)
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
