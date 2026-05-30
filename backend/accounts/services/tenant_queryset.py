"""Reusable tenant-scoped queryset filters for branch-bound models."""

from __future__ import annotations

from accounts.services.branch_access_service import BranchAccessService


class TenantQuerysetService:
    """Central place for role-based queryset scoping."""

    @staticmethod
    def _role(user):
        return getattr(user, "role", None) if user and getattr(user, "is_authenticated", False) else None

    @staticmethod
    def filter_companies(qs, user):
        """Companies visible to SUPER_ADMIN (all) or BUSINESS_OWNER (managed only)."""
        role = TenantQuerysetService._role(user)
        if role == "SUPER_ADMIN":
            return qs
        if role == "BUSINESS_OWNER":
            return qs.filter(manager=user)
        return qs.none()

    @staticmethod
    def filter_branches(qs, user):
        """Branches visible by role; staff users see only their assigned branch."""
        role = TenantQuerysetService._role(user)
        if role == "SUPER_ADMIN":
            return qs
        if role == "BUSINESS_OWNER":
            return qs.filter(company__manager=user)
        staff_branch_id = BranchAccessService.staff_branch_id(user)
        if staff_branch_id:
            return qs.filter(id=staff_branch_id)
        return qs.none()

    @staticmethod
    def filter_by_branch_membership(qs, user, *, branch_lookup: str = "branch"):
        """Restrict queryset to branches the user may access."""
        role = TenantQuerysetService._role(user)
        if not role:
            return qs.none()
        if role == "SUPER_ADMIN":
            return qs
        if role == "BUSINESS_OWNER":
            return qs.filter(**{f"{branch_lookup}__company__manager": user})
        staff_branch_id = BranchAccessService.staff_branch_id(user)
        if staff_branch_id:
            return qs.filter(**{f"{branch_lookup}_id": staff_branch_id})
        return qs.none()

    @staticmethod
    def filter_staff_profiles(qs, user):
        role = TenantQuerysetService._role(user)
        if not role:
            return qs.none()
        if role == "SUPER_ADMIN":
            return qs
        if role == "BUSINESS_OWNER":
            return qs.filter(branch__company__manager=user)
        staff_branch_id = BranchAccessService.staff_branch_id(user)
        if staff_branch_id:
            return qs.filter(branch_id=staff_branch_id)
        return qs.none()

    @staticmethod
    def filter_branch_customers(qs, user):
        return TenantQuerysetService.filter_by_branch_membership(qs, user, branch_lookup="branch")
