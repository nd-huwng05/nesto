import re

from rest_framework import serializers
from accounts.models import User
from core.constant import Provider, Message


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "phone", "name", "avatar", "role", "is_active"]
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=Provider.choices)
    email = serializers.EmailField(required=False)
    phone = serializers.CharField(required=False, allow_blank=False)
    password = serializers.CharField(required=False, write_only=True, trim_whitespace=False)
    id_token = serializers.CharField(required=False, write_only=True)

    PROVIDER_REQUIRED_FIELDS = {
        Provider.EMAIL: ["email", "password"],
        Provider.PHONE: ["phone", "password"],
        Provider.GOOGLE: ["id_token"],
    }

    def validate_phone(self, value):
        if not value:
            return value
        value = re.sub(r"^\+?[1-9]\d{7,14}$", "", value)
        return value

    def validate(self, attrs):
        provider = attrs.get("provider")
        required_fields = self.PROVIDER_REQUIRED_FIELDS.get(provider)

        if not required_fields:
            raise serializers.ValidationError({"provider": "Unsupported provider."})

        errors = {}
        for field in required_fields:
            if not attrs.get(field):
                errors[field] = Message.FieldRequest

        if errors:
            raise serializers.ValidationError(errors)

        clean_attrs = {"provider": provider}
        for field in required_fields:
            clean_attrs[field] = attrs.get(field)

        return clean_attrs