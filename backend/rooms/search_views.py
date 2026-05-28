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
        if not q:
            return Response({"results": []}, status=status.HTTP_200_OK)

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

        branch_qs = Branch.objects.filter(is_active=True).filter(models.Q(name__icontains=q) | models.Q(address__icontains=q))
        if not has_coords:
            branch_qs = branch_qs.defer("latitude", "longitude").order_by("-created_at")
        else:
            branch_qs = branch_qs.order_by("-created_at")
        try:
            branches = list(branch_qs[:12])
        except OperationalError:
            branches = list(Branch.objects.filter(is_active=True).filter(models.Q(name__icontains=q) | models.Q(address__icontains=q)).defer("latitude", "longitude").order_by("-created_at")[:12])
            has_coords = False

        results = []
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
            dist = None
            if has_coords and b.latitude is not None and b.longitude is not None:
                dist = haversine_km(user_lat, user_lng, float(b.latitude), float(b.longitude))
            results.append(
                {
                    "type": "branch",
                    "id": str(b.id),
                    "title": str(b.name or ""),
                    "subtitle": str(b.address or ""),
                    "image": image_url,
                    "distanceKm": dist,
                }
            )

        room_rows = (
            Room.objects.select_related("branch", "category")
            .filter(branch__is_active=True)
            .filter(models.Q(room_number__icontains=q) | models.Q(category__name__icontains=q) | models.Q(branch__name__icontains=q))
            .order_by("-created_at")[:8]
        )
        for r in room_rows:
            results.append(
                {
                    "type": "room",
                    "id": str(r.id),
                    "title": f"Room {str(r.room_number or '').strip()}",
                    "subtitle": str(getattr(r.branch, "name", "") or ""),
                    "image": "",
                    "distanceKm": None,
                }
            )

        svc_rows = (
            ExtraService.objects.select_related("branch")
            .filter(branch__is_active=True)
            .filter(models.Q(name__icontains=q) | models.Q(branch__name__icontains=q))
            .order_by("-created_at")[:8]
        )
        for s in svc_rows:
            results.append(
                {
                    "type": "service",
                    "id": str(s.id),
                    "title": str(s.name or ""),
                    "subtitle": str(getattr(s.branch, "name", "") or ""),
                    "image": "",
                    "distanceKm": None,
                }
            )

        if has_coords:
            results.sort(key=lambda row: (row.get("distanceKm") is None, row.get("distanceKm") or 0))
        return Response({"results": results}, status=status.HTTP_200_OK)

