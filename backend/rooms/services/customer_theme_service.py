"""Seed and assign customer-facing catalog themes (Family, Couples, …)."""

from __future__ import annotations

from businesses.models import Branch
from rooms.models import BranchTheme, RoomTheme

CUSTOMER_THEME_SPECS: list[dict] = [
    {
        "name": "Featured",
        "slug": "featured",
        "icon": "star",
        "description": "Highlighted stays picked for guests",
        "sort_order": 10,
    },
    {
        "name": "Family",
        "slug": "family",
        "icon": "people",
        "description": "Spacious rooms for families and groups",
        "sort_order": 20,
    },
    {
        "name": "Couples",
        "slug": "couples",
        "icon": "heart",
        "description": "Romantic stays for two",
        "sort_order": 30,
    },
    {
        "name": "Business",
        "slug": "business",
        "icon": "briefcase",
        "description": "Work-friendly locations with business amenities",
        "sort_order": 40,
    },
    {
        "name": "Suite",
        "slug": "suite",
        "icon": "bed",
        "description": "Premium suites and upgraded rooms",
        "sort_order": 50,
    },
    {
        "name": "Luxury",
        "slug": "luxury",
        "icon": "diamond",
        "description": "High-end luxury experiences",
        "sort_order": 60,
    },
    {
        "name": "Budget",
        "slug": "budget",
        "icon": "pricetag",
        "description": "Affordable stays with great value",
        "sort_order": 70,
    },
    {
        "name": "AI ✨",
        "slug": "ai",
        "icon": "sparkles",
        "description": "AI-curated recommendations",
        "sort_order": 80,
    },
]


def ensure_customer_themes() -> list[RoomTheme]:
    rows: list[RoomTheme] = []
    for spec in CUSTOMER_THEME_SPECS:
        defaults = {
            "icon": spec.get("icon", ""),
            "slug": spec.get("slug", ""),
            "description": spec.get("description", ""),
            "sort_order": int(spec.get("sort_order") or 0),
            "is_active": True,
            "show_in_tabs": True,
        }
        theme, created = RoomTheme.objects.get_or_create(name=spec["name"], defaults=defaults)
        if not created:
            changed = False
            for field, value in defaults.items():
                if getattr(theme, field) != value and value not in ("", 0):
                    setattr(theme, field, value)
                    changed = True
            if changed:
                theme.save()
        rows.append(theme)
    return rows


def assign_branch_themes(branch, theme_ids: list | None = None) -> int:
    ids = [str(item).strip() for item in (theme_ids or []) if str(item or "").strip()]
    if not ids:
        return 0

    linked = 0
    valid = RoomTheme.objects.filter(id__in=ids, is_active=True)
    for theme in valid:
        _, created = BranchTheme.objects.get_or_create(branch=branch, theme=theme)
        if created:
            linked += 1
    return linked


def assign_themes_to_branches(*, themes: list[RoomTheme] | None = None, min_per_branch: int = 3) -> int:
    theme_rows = themes or ensure_customer_themes()
    if not theme_rows:
        return 0

    linked = 0
    branches = list(Branch.objects.filter(is_active=True).order_by("created_at"))
    pick_count = max(1, min(min_per_branch, len(theme_rows)))

    for index, branch in enumerate(branches):
        if BranchTheme.objects.filter(branch=branch).exists():
            continue
        picks = [theme_rows[(index + offset) % len(theme_rows)] for offset in range(pick_count)]
        for theme in picks:
            _, created = BranchTheme.objects.get_or_create(branch=branch, theme=theme)
            if created:
                linked += 1
    return linked


def seed_customer_catalog_themes(*, min_per_branch: int = 3) -> dict[str, int]:
    from businesses.services.geocode_service import GeocodeService

    themes = ensure_customer_themes()
    linked = assign_themes_to_branches(themes=themes, min_per_branch=min_per_branch)
    geocoded = 0
    for branch in Branch.objects.filter(is_active=True, latitude__isnull=True):
        if GeocodeService.apply_branch_coordinates(branch):
            geocoded += 1
    return {
        "themes": len(themes),
        "branches": Branch.objects.filter(is_active=True).count(),
        "links_created": linked,
        "geocoded": geocoded,
    }
