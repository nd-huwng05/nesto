"""Branch-level access checks for WebSockets and reception APIs."""

from __future__ import annotations

from businesses.models import Branch
from staff.models import StaffProfile


class BranchAccessService:
    @staticmethod
    def staff_branch_id(user) -> str | None:
        if not user or not getattr(user, "is_authenticated", False):
            return None
        branch_id = StaffProfile.objects.filter(user=user).values_list("branch_id", flat=True).first()
        return str(branch_id) if branch_id else None

    @classmethod
    def can_access_branch(cls, user, branch_id: str) -> bool:
        if not user or not getattr(user, "is_authenticated", False) or not branch_id:
            return False

        role = getattr(user, "role", None)
        if role == "SUPER_ADMIN":
            return Branch.objects.filter(id=branch_id, is_active=True).exists()
        if role == "BUSINESS_OWNER":
            return Branch.objects.filter(
                id=branch_id,
                is_active=True,
                company__manager_id=user.id,
            ).exists()
        if role == "CUSTOMER":
            return False

        staff_branch_id = cls.staff_branch_id(user)
        return staff_branch_id is not None and staff_branch_id == str(branch_id)

    @classmethod
    def assert_branch_for_staff(cls, user, branch_id: str) -> tuple[bool, str]:
        if not branch_id:
            return False, "branch_id is required."
        if cls.can_access_branch(user, branch_id):
            return True, ""
        return False, "You do not have access to this branch."
