from django.contrib.auth import get_user_model
from rest_framework import serializers

from staff.models import StaffProfile

User = get_user_model()


def normalize_staff_role(value: str) -> str:
    raw = str(value or "").strip()
    mapped = {
        "Manager": "MANAGER",
        "Receptionist": "RECEPTIONIST",
        "Housekeeping": "HOUSEKEEPING",
        "Service": "SERVICE",
    }
    return mapped.get(raw, raw.upper() or "RECEPTIONIST")


def normalize_staff_department(value: str) -> str:
    raw = str(value or "").strip().upper()
    allowed = {
        StaffProfile.Department.RECEPTIONIST,
        StaffProfile.Department.HOUSEKEEPING,
        StaffProfile.Department.MANAGER,
        StaffProfile.Department.SERVICE,
    }
    return raw if raw in allowed else StaffProfile.Department.RECEPTIONIST


class StaffProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="user.name")
    email = serializers.EmailField(source="user.email")
    phone = serializers.CharField(source="user.phone", required=False, allow_blank=True)
    role = serializers.CharField(source="user.role")
    branchId = serializers.UUIDField(source="branch_id", read_only=True)
    businessId = serializers.UUIDField(source="branch.company_id", read_only=True)

    class Meta:
        model = StaffProfile
        fields = [
            "id",
            "user",
            "name",
            "email",
            "phone",
            "role",
            "branch",
            "branchId",
            "businessId",
            "department",
            "job_role",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user"]

    def create(self, validated_data):
        user_data = validated_data.pop("user")
        validated_data["department"] = normalize_staff_department(validated_data.get("department"))
        password = self.initial_data.get("password") or "Staff@123456"
        user = User.objects.create_user(
            email=user_data["email"],
            password=password,
            name=user_data.get("name", ""),
            phone=user_data.get("phone", ""),
            role=normalize_staff_role(user_data.get("role", "RECEPTIONIST")),
        )
        profile = StaffProfile.objects.create(user=user, **validated_data)
        return profile

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if "department" in validated_data:
            validated_data["department"] = normalize_staff_department(validated_data.get("department"))
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        user = instance.user
        for attr, value in user_data.items():
            if attr == "role":
                value = normalize_staff_role(value)
            setattr(user, attr, value)
        password = self.initial_data.get("password")
        if password:
            user.set_password(password)
        user.save()
        return instance

