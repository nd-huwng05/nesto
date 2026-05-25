import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from accounts.models import Role, User

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
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'name', 'avatar', 'role', 'role_display', 'is_active']
        read_only_fields = ['id', 'email']


class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("This email is already registered.")
        return email


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp_code = serializers.CharField(max_length=6, required=True)
    session_id = serializers.CharField(required=False, allow_blank=True)


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
        return User.objects.create_user(**validated_data)


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
