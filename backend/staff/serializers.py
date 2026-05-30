from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.services.role_sync_service import RoleSyncService, staff_form_role_from_profile
from staff.models import StaffProfile

User = get_user_model()


class StaffProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="user.name")
    email = serializers.EmailField(source="user.email")
    phone = serializers.CharField(source="user.phone", required=False, allow_blank=True)
    role = serializers.SerializerMethodField()
    formRole = serializers.SerializerMethodField()
    branchId = serializers.UUIDField(source="branch_id", read_only=True)
    businessId = serializers.UUIDField(source="branch.company_id", read_only=True)
    serviceCategory = serializers.CharField(source="service_category", required=False, allow_blank=True)

    class Meta:
        model = StaffProfile
        fields = [
            "id",
            "user",
            "name",
            "email",
            "phone",
            "role",
            "formRole",
            "branch",
            "branchId",
            "businessId",
            "department",
            "service_category",
            "serviceCategory",
            "job_role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user"]

    def get_role(self, obj):
        return staff_form_role_from_profile(obj)

    def get_formRole(self, obj):
        return staff_form_role_from_profile(obj)

    def _apply_assignment(self, validated_data):
        form_role = self.initial_data.get("role") or self.initial_data.get("formRole") or validated_data.get("department")
        spec = RoleSyncService.sync_from_staff_form(
            self._pending_user,
            form_role=str(form_role or ""),
            department=str(validated_data.get("department") or ""),
            service_category=str(validated_data.get("service_category") or self.initial_data.get("serviceCategory") or ""),
            job_role=str(validated_data.get("job_role") or ""),
        )
        validated_data["department"] = spec["department"]
        validated_data["service_category"] = spec.get("service_category") or ""
        if not validated_data.get("job_role"):
            validated_data["job_role"] = spec.get("job_role") or ""
        return validated_data

    def create(self, validated_data):
        user_data = validated_data.pop("user")
        password = self.initial_data.get("password") or "Staff@123456"
        user = User.objects.create_user(
            email=user_data["email"],
            password=password,
            name=user_data.get("name", ""),
            phone=user_data.get("phone", ""),
            role="RECEPTIONIST",
        )
        self._pending_user = user
        validated_data = self._apply_assignment(validated_data)
        profile = StaffProfile.objects.create(user=user, **validated_data)
        return profile

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        self._pending_user = instance.user
        validated_data = self._apply_assignment(validated_data)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        user = instance.user
        for attr, value in user_data.items():
            if attr in {"name", "phone", "email"}:
                setattr(user, attr, value)
        password = self.initial_data.get("password")
        if password:
            user.set_password(password)
        user.save()
        return instance
