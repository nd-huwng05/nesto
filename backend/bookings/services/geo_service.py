import math

from businesses.models import Branch


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(min(1.0, a)))


def nearby_branch_ids(latitude: float, longitude: float, radius_km: float = 30.0):
    lat = float(latitude)
    lng = float(longitude)
    radius = max(1.0, float(radius_km))
    rows = Branch.objects.filter(is_active=True, latitude__isnull=False, longitude__isnull=False).only(
        "id", "latitude", "longitude"
    )
    matched = []
    for branch in rows:
        try:
            distance = haversine_km(lat, lng, branch.latitude, branch.longitude)
        except (TypeError, ValueError):
            continue
        if distance <= radius:
            matched.append(branch.id)
    return matched


class GeoService:
    """Branch proximity lookup."""

    haversine_km = staticmethod(haversine_km)
    nearby_branch_ids = staticmethod(nearby_branch_ids)
