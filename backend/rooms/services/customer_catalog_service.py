"""Customer-facing branch catalog listing."""

from __future__ import annotations

from django.db.models import Avg, Count
from django.db.utils import OperationalError

from bookings.models import ReviewForumPost
from bookings.services.geo_service import haversine_km
from businesses.models import Branch
from core.services.cloudinary_service import CloudinaryMediaService
from rooms.models import BranchTheme, RoomCategory


def _load_active_branches(*, has_coords: bool):
    qs = Branch.objects.filter(is_active=True).select_related("company")
    if not has_coords:
        qs = qs.defer("latitude", "longitude").order_by("-created_at")
    else:
        qs = qs.order_by("-created_at")
    try:
        return list(qs), has_coords
    except OperationalError:
        fallback = list(
            Branch.objects.filter(is_active=True)
            .select_related("company")
            .defer("latitude", "longitude")
            .order_by("-created_at")
        )
        return fallback, False


def _theme_map() -> dict[str, list[str]]:
    theme_rows = BranchTheme.objects.select_related("theme").values("branch_id", "theme__name")
    theme_map: dict[str, list[str]] = {}
    for row in theme_rows:
        bid = str(row.get("branch_id") or "")
        name = str(row.get("theme__name") or "").strip()
        if not bid or not name:
            continue
        theme_map.setdefault(bid, []).append(name)
    return theme_map


def _rating_map() -> dict[str, dict]:
    ratings = ReviewForumPost.objects.values("hotel_name").annotate(
        avg_rating=Avg("rating"),
        review_count=Count("id"),
    )
    return {
        str(row.get("hotel_name") or ""): {
            "avg": float(row.get("avg_rating") or 0),
            "count": int(row.get("review_count") or 0),
        }
        for row in ratings
    }


def _min_price_map(branch_ids) -> dict[str, int]:
    min_price_map: dict[str, int] = {}
    for row in RoomCategory.objects.filter(branch_id__in=branch_ids).values(
        "branch_id", "price_per_hour", "base_price"
    ):
        bid = str(row.get("branch_id") or "")
        if not bid:
            continue
        hour = int(row.get("price_per_hour") or 0)
        base = int(row.get("base_price") or 0)
        candidate = hour if hour > 0 else (max(1, base // 24) if base > 0 else 0)
        if candidate <= 0:
            continue
        current = min_price_map.get(bid)
        min_price_map[bid] = min(current, candidate) if current else candidate
    return min_price_map


def _branch_image_url(branch) -> str:
    image_url = CloudinaryMediaService.resolve_field_url(getattr(branch, "image", None)) or ""
    if not image_url:
        gallery = CloudinaryMediaService.resolve_json_gallery(getattr(branch, "images", None) or [])
        image_url = gallery[0] if gallery else ""
    return image_url


def _branch_description(branch) -> str:
    amenities = getattr(branch, "amenities", None)
    if isinstance(amenities, list) and amenities:
        return ", ".join(str(item).strip() for item in amenities if str(item or "").strip())[:240]
    return ""


def build_branch_catalog_row(branch, *, rating_map, theme_map, min_price_map, user_lat=None, user_lng=None, has_coords=False):
    rm = rating_map.get(branch.name, {"avg": 0.0, "count": 0})
    themes = theme_map.get(str(branch.id), [])
    distance_km = None
    if has_coords and user_lat is not None and user_lng is not None and branch.latitude is not None and branch.longitude is not None:
        distance_km = haversine_km(user_lat, user_lng, float(branch.latitude), float(branch.longitude))
    return {
        "id": str(branch.id),
        "branch_id": str(branch.id),
        "company_id": str(getattr(branch, "company_id", "") or ""),
        "title": str(branch.name or ""),
        "address": str(branch.address or ""),
        "city": str(branch.address or "").split(",")[0].strip() if branch.address else "",
        "image": _branch_image_url(branch),
        "description": _branch_description(branch),
        "lodging_type": str(branch.lodging_type or ""),
        "rating": rm["avg"],
        "review_count": rm["count"],
        "themes": themes,
        "min_price_hour": min_price_map.get(str(branch.id)),
        "distance_km": distance_km,
    }


class CustomerCatalogService:
    @classmethod
    def list_branches(cls, *, user_lat=None, user_lng=None) -> list[dict]:
        has_coords = user_lat is not None and user_lng is not None
        branches, has_coords = _load_active_branches(has_coords=has_coords)
        theme_map = _theme_map()
        rating_map = _rating_map()
        min_price_map = _min_price_map([b.id for b in branches])

        payload = [
            build_branch_catalog_row(
                branch,
                rating_map=rating_map,
                theme_map=theme_map,
                min_price_map=min_price_map,
                user_lat=user_lat,
                user_lng=user_lng,
                has_coords=has_coords,
            )
            for branch in branches
        ]
        if has_coords:
            payload.sort(
                key=lambda row: (
                    row.get("distance_km") is None,
                    row.get("distance_km") or 0,
                    str(row.get("title") or ""),
                )
            )
        return payload
