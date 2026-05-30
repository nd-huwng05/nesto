"""Central role / group sync and staff assignment resolution."""

from __future__ import annotations

from django.contrib.auth.models import Group

from accounts.models import ROLE_GROUPS_MAP, Role

SERVICE_CATEGORIES = frozenset({"SPA", "RESTAURANT", "TRANSPORT", "ROOM_SERVICE"})

# UI / form labels → persisted staff assignment
STAFF_FORM_SPECS = {
    "RECEPTIONIST": {
        "user_role": Role.RECEPTIONIST,
        "department": "RECEPTIONIST",
        "service_category": "",
        "ui_flow": "reception",
        "job_role": "Receptionist",
    },
    "HOUSEKEEPING": {
        "user_role": Role.HOUSEKEEPING,
        "department": "HOUSEKEEPING",
        "service_category": "",
        "ui_flow": "housekeeping",
        "job_role": "Housekeeper",
    },
    "SPA": {
        "user_role": Role.SERVICE,
        "department": "SERVICE",
        "service_category": "SPA",
        "ui_flow": "service",
        "job_role": "Spa Staff",
    },
    "RESTAURANT": {
        "user_role": Role.SERVICE,
        "department": "SERVICE",
        "service_category": "RESTAURANT",
        "ui_flow": "service",
        "job_role": "Restaurant Staff",
    },
    "DRIVER": {
        "user_role": Role.SERVICE,
        "department": "SERVICE",
        "service_category": "TRANSPORT",
        "ui_flow": "service",
        "job_role": "Driver",
    },
    "TRANSPORT": {
        "user_role": Role.SERVICE,
        "department": "SERVICE",
        "service_category": "TRANSPORT",
        "ui_flow": "service",
        "job_role": "Driver",
    },
    "ROOM_SERVICE": {
        "user_role": Role.SERVICE,
        "department": "SERVICE",
        "service_category": "ROOM_SERVICE",
        "ui_flow": "service",
        "job_role": "Room Service",
    },
    "SERVICE": {
        "user_role": Role.SERVICE,
        "department": "SERVICE",
        "service_category": "ROOM_SERVICE",
        "ui_flow": "service",
        "job_role": "Service Staff",
    },
    "STAFF": {
        "user_role": Role.RECEPTIONIST,
        "department": "RECEPTIONIST",
        "service_category": "",
        "ui_flow": "reception",
        "job_role": "Staff",
    },
}


def normalize_service_category(value: str | None) -> str:
    raw = str(value or "").strip().upper()
    if raw == "DRIVER":
        return "TRANSPORT"
    return raw if raw in SERVICE_CATEGORIES else ""


def resolve_staff_form_role(
    *,
    form_role: str = "",
    department: str = "",
    service_category: str = "",
    job_role: str = "",
) -> dict:
    """Map business staff form values to user role + staff profile fields."""
    form_key = str(form_role or "").strip().upper()
    if form_key in STAFF_FORM_SPECS:
        spec = dict(STAFF_FORM_SPECS[form_key])
        if job_role:
            spec["job_role"] = str(job_role).strip()
        return spec

    dept = str(department or "").strip().upper()
    category = normalize_service_category(service_category)
    if not category and job_role:
        category = normalize_service_category(job_role)

    if dept == "SERVICE" or category:
        spec = dict(STAFF_FORM_SPECS["SERVICE"])
        if category:
            spec["service_category"] = category
            spec["job_role"] = str(job_role or category.title()).strip()
        return spec
    if dept in STAFF_FORM_SPECS:
        spec = dict(STAFF_FORM_SPECS[dept])
        if job_role:
            spec["job_role"] = str(job_role).strip()
        return spec

    return dict(STAFF_FORM_SPECS["RECEPTIONIST"])


def resolve_ui_flow(user) -> str:
    role = str(getattr(user, "role", "") or "").upper()
    if role in {Role.SUPER_ADMIN, Role.BUSINESS_OWNER}:
        return "business"
    if role == Role.CUSTOMER:
        return "customer"

    profile = getattr(user, "staff_profile", None)
    if profile is not None:
        dept = str(getattr(profile, "department", "") or "").upper()
        if dept == "HOUSEKEEPING":
            return "housekeeping"
        if dept == "SERVICE" or role == Role.SERVICE:
            return "service"
        if dept == "RECEPTIONIST" or role in {Role.RECEPTIONIST, Role.STAFF}:
            return "reception"

    if role == Role.HOUSEKEEPING:
        return "housekeeping"
    if role == Role.SERVICE:
        return "service"
    if role in {Role.RECEPTIONIST, Role.STAFF}:
        return "reception"
    return ""


def staff_form_role_from_profile(profile) -> str:
    if profile is None:
        return ""
    dept = str(getattr(profile, "department", "") or "").upper()
    category = normalize_service_category(getattr(profile, "service_category", ""))
    if dept == "SERVICE" and category == "TRANSPORT":
        return "DRIVER"
    if dept == "SERVICE" and category:
        return category
    return dept or "RECEPTIONIST"


class RoleSyncService:
    @staticmethod
    def sync_user_groups(user) -> None:
        if not user or not getattr(user, "id", None):
            return
        known_groups = set().union(*ROLE_GROUPS_MAP.values())
        user.groups.remove(*user.groups.filter(name__in=known_groups))
        target_groups = ROLE_GROUPS_MAP.get(getattr(user, "role", None), set())
        for group_name in target_groups:
            group, _ = Group.objects.get_or_create(name=group_name)
            user.groups.add(group)

    @staticmethod
    def apply_staff_profile(user, profile) -> None:
        if not user or not profile:
            return

        dept = str(getattr(profile, "department", "") or "").upper()
        category = normalize_service_category(getattr(profile, "service_category", ""))

        if dept == "HOUSEKEEPING":
            user.role = Role.HOUSEKEEPING
        elif dept == "SERVICE":
            user.role = Role.SERVICE
            if not category:
                profile.service_category = "ROOM_SERVICE"
                profile.save(update_fields=["service_category", "updated_at"])
        elif dept == "RECEPTIONIST":
            user.role = Role.RECEPTIONIST
        elif getattr(user, "role", None) == Role.STAFF:
            user.role = Role.RECEPTIONIST

        user.save(update_fields=["role", "updated_at"])
        RoleSyncService.sync_user_groups(user)

    @staticmethod
    def sync_from_staff_form(user, *, form_role: str = "", department: str = "", service_category: str = "", job_role: str = "") -> dict:
        spec = resolve_staff_form_role(
            form_role=form_role,
            department=department,
            service_category=service_category,
            job_role=job_role,
        )
        user.role = spec["user_role"]
        user.save(update_fields=["role", "updated_at"])
        RoleSyncService.sync_user_groups(user)
        return spec
