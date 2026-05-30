"""Geocode branch addresses to latitude/longitude."""

from __future__ import annotations

import json
import urllib.parse
import urllib.request


class GeocodeService:
    USER_AGENT = "NestoApp/1.0 (hotel catalog)"

    @classmethod
    def geocode_address(cls, address: str) -> tuple[float, float] | None:
        query = str(address or "").strip()
        if len(query) < 5:
            return None

        params = urllib.parse.urlencode({"q": query, "format": "json", "limit": 1})
        url = f"https://nominatim.openstreetmap.org/search?{params}"
        request = urllib.request.Request(url, headers={"User-Agent": cls.USER_AGENT})
        try:
            with urllib.request.urlopen(request, timeout=8) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except Exception:
            return None

        if not isinstance(payload, list) or not payload:
            return None

        row = payload[0] or {}
        try:
            lat = float(row.get("lat"))
            lng = float(row.get("lon"))
        except (TypeError, ValueError):
            return None

        if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
            return None
        return lat, lng

    @classmethod
    def apply_branch_coordinates(cls, branch, *, address: str | None = None) -> bool:
        coords = cls.geocode_address(address or getattr(branch, "address", ""))
        if not coords:
            return False
        branch.latitude, branch.longitude = coords
        branch.save(update_fields=["latitude", "longitude", "updated_at"])
        return True
