from rest_framework import serializers

from service_orders.models import ExtraService


class ExtraServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtraService
        fields = [
            "id",
            "branch",
            "name",
            "description",
            "price",
            "icon",
            "category",
            "created_at",
            "updated_at",
        ]
