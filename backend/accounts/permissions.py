from rest_framework.permissions import BasePermission


class IsInAnyGroup(BasePermission):
    required_groups = ()

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if not self.required_groups:
            return True
        return user.groups.filter(name__in=self.required_groups).exists()


class IsBusinessMember(IsInAnyGroup):
    required_groups = ("Business_Group", "Admin_Group")

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        # Allow primary business roles even if Groups got out of sync.
        role = getattr(user, "role", None)
        if role in {"SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER"}:
            return True
        return super().has_permission(request, view)


class IsReceptionistMember(IsInAnyGroup):
    required_groups = ("Receptionist_Group", "Manager_Group", "Business_Group", "Admin_Group")

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        role = getattr(user, "role", None)
        if role in {"SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER", "RECEPTIONIST"}:
            return True
        return super().has_permission(request, view)


class IsHousekeepingMember(IsInAnyGroup):
    required_groups = ("Housekeeping_Group", "Manager_Group", "Business_Group", "Admin_Group")

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        role = getattr(user, "role", None)
        if role in {"SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER", "HOUSEKEEPING", "RECEPTIONIST"}:
            return True
        return super().has_permission(request, view)


class IsServiceMember(IsInAnyGroup):
    required_groups = ("Service_Group", "Manager_Group", "Business_Group", "Admin_Group")

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        role = getattr(user, "role", None)
        if role in {"SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER", "SERVICE"}:
            return True
        return super().has_permission(request, view)


class IsCustomerMember(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return getattr(user, "role", None) == "CUSTOMER"
