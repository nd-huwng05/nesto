"""Customer search — branches, rooms, services, and suggestions."""

from __future__ import annotations

from django.db import models
from django.db.utils import OperationalError

from bookings.services.geo_service import haversine_km
from businesses.models import Branch
from core.services.cloudinary_service import CloudinaryMediaService
from rooms.models import Room
from rooms.services.customer_catalog_service import _branch_image_url
from service_orders.models import ExtraService


def _parse_coords(lat_raw, lng_raw):
    try:
        user_lat = float(lat_raw) if lat_raw is not None else None
        user_lng = float(lng_raw) if lng_raw is not None else None
    except Exception:
        user_lat, user_lng = None, None
    has_coords = user_lat is not None and user_lng is not None
    return user_lat, user_lng, has_coords


def _search_branches(query: str, *, user_lat=None, user_lng=None, has_coords=False, limit=20):
    qs = Branch.objects.filter(is_active=True).filter(
        models.Q(name__icontains=query) | models.Q(address__icontains=query)
    )
    if not has_coords:
        qs = qs.defer("latitude", "longitude").order_by("-created_at")
    else:
        qs = qs.order_by("-created_at")
    try:
        branches = list(qs[:limit])
    except OperationalError:
        branches = list(
            Branch.objects.filter(is_active=True)
            .filter(models.Q(name__icontains=query) | models.Q(address__icontains=query))
            .defer("latitude", "longitude")
            .order_by("-created_at")[:limit]
        )
        has_coords = False

    payload = []
    for branch in branches:
        distance_km = None
        if has_coords and branch.latitude is not None and branch.longitude is not None:
            distance_km = haversine_km(user_lat, user_lng, float(branch.latitude), float(branch.longitude))
        payload.append(
            {
                "id": str(branch.id),
                "branch_id": str(branch.id),
                "title": str(branch.name or ""),
                "address": str(branch.address or ""),
                "image": _branch_image_url(branch),
                "distance_km": distance_km,
            }
        )
    if has_coords:
        payload.sort(
            key=lambda row: (
                row.get("distance_km") is None,
                row.get("distance_km") or 0,
                str(row.get("title") or ""),
            )
        )
    return payload


def _search_rooms(query: str, limit=30):
    rooms = (
        Room.objects.select_related("branch", "category")
        .filter(branch__is_active=True)
        .filter(
            models.Q(room_number__icontains=query)
            | models.Q(category__name__icontains=query)
            | models.Q(branch__name__icontains=query)
        )
        .order_by("branch__name", "room_number")[:limit]
    )
    return [
        {
            "id": str(room.id),
            "room_number": str(room.room_number or ""),
            "category": str(getattr(room.category, "name", "") or ""),
            "branch_id": str(room.branch_id),
            "branch_name": str(getattr(room.branch, "name", "") or ""),
            "status": str(room.status or ""),
        }
        for room in rooms
    ]


def _search_services(query: str, limit=30):
    services = (
        ExtraService.objects.select_related("branch")
        .filter(branch__is_active=True)
        .filter(models.Q(name__icontains=query) | models.Q(branch__name__icontains=query))
        .order_by("branch__name", "name")[:limit]
    )
    return [
        {
            "id": str(service.id),
            "name": str(service.name or ""),
            "price": float(service.price or 0),
            "branch_id": str(service.branch_id),
            "branch_name": str(getattr(service.branch, "name", "") or ""),
        }
        for service in services
    ]


class SearchService:
    @classmethod
    def ai_search(cls, *, query: str, user_lat=None, user_lng=None) -> dict:
        q = str(query or "").strip()
        if not q:
            return {"branches": [], "rooms": [], "services": []}
        user_lat, user_lng, has_coords = _parse_coords(user_lat, user_lng)
        return {
            "branches": _search_branches(q, user_lat=user_lat, user_lng=user_lng, has_coords=has_coords),
            "rooms": _search_rooms(q),
            "services": _search_services(q),
        }

    @classmethod
    def suggestions(cls, *, query: str, user_lat=None, user_lng=None) -> list[dict]:
        q = str(query or "").strip()
        if not q:
            return []
        user_lat, user_lng, has_coords = _parse_coords(user_lat, user_lng)

        branch_rows = _search_branches(q, user_lat=user_lat, user_lng=user_lng, has_coords=has_coords, limit=12)
        results = [
            {
                "type": "branch",
                "id": row["id"],
                "title": row["title"],
                "subtitle": row["address"],
                "image": row["image"],
                "distance_km": row.get("distance_km"),
            }
            for row in branch_rows
        ]

        for room in _search_rooms(q, limit=8):
            results.append(
                {
                    "type": "room",
                    "id": room["id"],
                    "title": f"Room {str(room.get('room_number') or '').strip()}",
                    "subtitle": room.get("branch_name") or "",
                    "image": "",
                    "distance_km": None,
                }
            )

        for service in _search_services(q, limit=8):
            results.append(
                {
                    "type": "service",
                    "id": service["id"],
                    "title": service.get("name") or "",
                    "subtitle": service.get("branch_name") or "",
                    "image": "",
                    "distance_km": None,
                }
            )

        if has_coords:
            results.sort(key=lambda row: (row.get("distance_km") is None, row.get("distance_km") or 0))
        return results
