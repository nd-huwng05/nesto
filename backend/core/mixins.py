from rest_framework import serializers
from django.db.models import Q


class BranchFilterMixin:
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()
        if user.role == 'SUPER_ADMIN':
            return queryset
        if user.role == 'BUSINESS_OWNER':
            return queryset.filter(
                Q(branch__company__manager=user) |
                Q(company__manager=user)
            )
        if hasattr(user, 'staff_profile'):
            staff_branch = user.staff_profile.branch
            return queryset.filter(
                Q(branch=staff_branch) |
                Q(branch__business__in=staff_branch.business_id and [staff_branch.business])
            )
        return queryset.none()


class CompanyFilterMixin:
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()
        if user.role == 'SUPER_ADMIN':
            return queryset
        if user.role == 'BUSINESS_OWNER':
            return queryset.filter(manager=user)
        if hasattr(user, 'staff_profile'):
            staff_branch = user.staff_profile.branch
            if staff_branch.company:
                return queryset.filter(id=staff_branch.company.id)
            if staff_branch.business:
                return queryset.filter(businesses__branches__id=staff_branch.id)
        return queryset.none()


class TenantFilterMixin:
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return queryset.none()
        if user.role == 'SUPER_ADMIN':
            return queryset
        if hasattr(user, 'staff_profile'):
            staff_branch = user.staff_profile.branch
            if staff_branch.company:
                return queryset.filter(tenant=staff_branch.company)
            if staff_branch.business:
                company = staff_branch.business.company
                if company:
                    return queryset.filter(tenant=company)
        if user.role == 'BUSINESS_OWNER':
            return queryset.filter(company__manager=user)
        return queryset.none()


class AuditFieldsMixin:
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)


class ValidateBranchMixin:
    def validate(self, data):
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Authentication required")
        user = request.user
        branch = data.get('branch')
        if branch:
            if user.role == 'BUSINESS_OWNER':
                is_owner = (
                    branch.company and branch.company.owner == user or
                    branch.business and branch.business.owner == user
                )
                if not is_owner:
                    raise serializers.ValidationError("You don't have access to this branch")
            elif hasattr(user, 'staff_profile'):
                if user.staff_profile.branch != branch:
                    raise serializers.ValidationError("You can only access your assigned branch")
        return data


class CacheKeyMixin:
    def get_cache_key(self, prefix, *args):
        parts = [prefix]
        user = self.request.user if hasattr(self, 'request') else None
        if user and user.is_authenticated:
            parts.append(f"user_{user.id}")
        branch_id = self.request.query_params.get('branch_id')
        if branch_id:
            parts.append(f"branch_{branch_id}")
        return ':'.join(parts)


class NestedBranchMixin:
    def get_queryset(self):
        queryset = super().get_queryset()
        branch_id = self.kwargs.get('branch_id')
        if branch_id:
            return queryset.filter(branch_id=branch_id)
        return queryset
