from django.http import HttpRequest
from rest_framework import permissions
from accounts.models import User, Role


class IsBusinessOwner(permissions.BasePermission):
    def has_permission(self, request: HttpRequest, view) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == Role.BUSINESS_OWNER
        )


class IsStaffMember(permissions.BasePermission):
    def has_permission(self, request: HttpRequest, view) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == Role.STAFF
        )


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request: HttpRequest, view) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == Role.SUPER_ADMIN
        )


class IsCustomer(permissions.BasePermission):
    def has_permission(self, request: HttpRequest, view) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == Role.CUSTOMER
        )


class IsBusinessOwnerOfCompany(permissions.BasePermission):
    def has_object_permission(self, request: HttpRequest, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == Role.SUPER_ADMIN:
            return True
        if hasattr(obj, 'company'):
            return obj.company.owner == request.user
        if hasattr(obj, 'business') and hasattr(obj.business, 'company'):
            return obj.business.company.owner == request.user
        if hasattr(obj, 'branch'):
            if hasattr(obj.branch, 'company'):
                return obj.branch.company.owner == request.user
            if hasattr(obj.branch, 'business') and hasattr(obj.branch.business, 'company'):
                return obj.branch.business.company.owner == request.user
        return False

    def has_permission(self, request: HttpRequest, view) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == Role.BUSINESS_OWNER
        )


class IsBusinessOwnerOfBranch(permissions.BasePermission):
    def has_object_permission(self, request: HttpRequest, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == Role.SUPER_ADMIN:
            return True
        branch = None
        if hasattr(obj, 'branch'):
            branch = obj.branch
        elif hasattr(obj, 'business'):
            branch = obj
        if branch:
            if hasattr(branch, 'company'):
                return branch.company.owner == request.user
            if hasattr(branch, 'business') and hasattr(branch.business, 'company'):
                return branch.business.company.owner == request.user
        return False

    def has_permission(self, request: HttpRequest, view) -> bool:
        return bool(request.user and request.user.is_authenticated)


class IsStaffOfBranch(permissions.BasePermission):
    def has_permission(self, request: HttpRequest, view) -> bool:
        return bool(
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'staff_profile')
        )

    def has_object_permission(self, request: HttpRequest, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if not hasattr(request.user, 'staff_profile'):
            return False
        if request.user.role == Role.SUPER_ADMIN:
            return True
        if request.user.role == Role.BUSINESS_OWNER:
            branch = None
            if hasattr(obj, 'branch'):
                branch = obj.branch
            elif hasattr(obj, 'business'):
                branch = obj
            if branch:
                if hasattr(branch, 'company'):
                    return branch.company.owner == request.user
                if hasattr(branch, 'business') and hasattr(branch.business, 'company'):
                    return branch.business.company.owner == request.user
            return False
        staff_branch = request.user.staff_profile.branch
        if hasattr(obj, 'branch'):
            return obj.branch == staff_branch
        if hasattr(obj, 'business'):
            return obj.business.branches.filter(id=staff_branch.id).exists()
        return False


class IsReceptionistOrAdmin(permissions.BasePermission):
    def has_permission(self, request: HttpRequest, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in [Role.SUPER_ADMIN, Role.BUSINESS_OWNER]:
            return True
        if not hasattr(request.user, 'staff_profile'):
            return False
        return request.user.staff_profile.role in ['ADMIN', 'RECEPTIONIST']


class IsHousekeepingOrAdmin(permissions.BasePermission):
    def has_permission(self, request: HttpRequest, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in [Role.SUPER_ADMIN, Role.BUSINESS_OWNER]:
            return True
        if not hasattr(request.user, 'staff_profile'):
            return False
        return request.user.staff_profile.role in ['ADMIN', 'HOUSEKEEPING']


class ReadOnlyOrAdmin(permissions.BasePermission):
    def has_permission(self, request: HttpRequest, view) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [Role.SUPER_ADMIN, Role.BUSINESS_OWNER]
        )
