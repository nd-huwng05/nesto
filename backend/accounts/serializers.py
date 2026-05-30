import re
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from accounts.models import Role, User, UserNotification
import cloudinary.uploader

User = get_user_model()

class PhoneValidationMixin:
    def validate_phone(self, value):
        if not value:
            return value
        normalized = re.sub(r'[\s\-\(\)]+', '', str(value).strip())
        if len(normalized) < 8:
            raise serializers.ValidationError("Phone number must be at least 8 digits.")
        return normalized

class UserSerializer(PhoneValidationMixin, serializers.ModelSerializer):
    """Authenticated profile — sole source of user metadata for clients."""

    role_display = serializers.CharField(source='get_role_display', read_only=True)
    groups = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    branchId = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    jobRole = serializers.SerializerMethodField()
    serviceCategory = serializers.SerializerMethodField()
    uiFlow = serializers.SerializerMethodField()
    preferredLocation = serializers.CharField(source="preferred_location", required=False, allow_blank=True)
    preferredLatitude = serializers.FloatField(source="preferred_latitude", required=False, allow_null=True)
    preferredLongitude = serializers.FloatField(source="preferred_longitude", required=False, allow_null=True)

    def get_groups(self, obj):
        return [group.name for group in obj.groups.all()]

    def get_avatar(self, obj):
        try:
            return obj.avatar.url if getattr(obj, "avatar", None) else ""
        except Exception:
            return ""

    def get_branchId(self, obj):
        sp = getattr(obj, "staff_profile", None)
        if sp and getattr(sp, "branch_id", None):
            return str(sp.branch_id)
        return ""

    def get_department(self, obj):
        sp = getattr(obj, "staff_profile", None)
        return str(getattr(sp, "department", "") or "") if sp else ""

    def get_jobRole(self, obj):
        sp = getattr(obj, "staff_profile", None)
        return str(getattr(sp, "job_role", "") or "") if sp else ""

    def get_serviceCategory(self, obj):
        sp = getattr(obj, "staff_profile", None)
        return str(getattr(sp, "service_category", "") or "") if sp else ""

    def get_uiFlow(self, obj):
        from accounts.services.role_sync_service import resolve_ui_flow

        return resolve_ui_flow(obj)

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'phone',
            'name',
            'avatar',
            'role',
            'role_display',
            'groups',
            'branchId',
            'department',
            'jobRole',
            'serviceCategory',
            'uiFlow',
            'preferredLocation',
            'preferredLatitude',
            'preferredLongitude',
        ]
        read_only_fields = ['id', 'email', 'role', 'role_display', 'groups', 'branchId', 'department', 'jobRole', 'serviceCategory', 'uiFlow']

class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.lower().strip()


class SendBusinessContactOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        return value.lower().strip()


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp_code = serializers.CharField(max_length=6, required=True)
    session_id = serializers.CharField(required=False, allow_blank=True)


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(required=True)

class UserRegistrationSerializer(PhoneValidationMixin, serializers.ModelSerializer):
    confirm_password = serializers.CharField(required=True, write_only=True)
    register_token = serializers.CharField(required=True, write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'confirm_password', 'name', 'phone', 'role', 'register_token']
        extra_kwargs = {
            'password': {'write_only': True},
            'phone': {'required': False},
            'role': {'required': False}
        }

    def validate_role(self, value):
        if not value:
            return Role.CUSTOMER
        allowed_roles = [Role.CUSTOMER, Role.BUSINESS_OWNER]
        if value not in [r.value for r in allowed_roles]:
            raise serializers.ValidationError("Cannot register with this role.")
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})

        fake_user = User(
            email=data.get('email', ''),
            name=data.get('name', ''),
            phone=data.get('phone', '')
        )
        try:
            validate_password(data['password'], user=fake_user)
        except Exception as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        from accounts.services.otp_service import OTPService
        is_valid = OTPService.verify_register_token(data['email'], data['register_token'])
        if not is_valid:
            raise serializers.ValidationError("Registration token is invalid or expired. Please verify your email again.")

        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        validated_data.pop('register_token')
        validated_data['is_active'] = True
        user = User.objects.create_user(**validated_data)
        from accounts.services.role_sync_service import RoleSyncService
        RoleSyncService.sync_user_groups(user)
        return user

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        try:
            validate_password(data['new_password'])
        except Exception as e:
            raise serializers.ValidationError({"new_password": list(e.messages)})
        return data


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        user = self.context["request"].user if self.context.get("request") else None
        try:
            validate_password(data["new_password"], user=user)
        except Exception as exc:
            raise serializers.ValidationError({"new_password": list(getattr(exc, "messages", [str(exc)]))})
        return data


class UserNotificationSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    type = serializers.CharField(source="notification_type", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = UserNotification
        fields = ["id", "title", "message", "type", "notification_type", "meta", "read", "createdAt", "created_at"]
        read_only_fields = fields
