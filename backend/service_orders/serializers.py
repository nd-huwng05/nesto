from rest_framework import serializers

from service_orders.models import ExtraService, ServiceOrder


class ExtraServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExtraService
        fields = [
            "id",
            "branch",
            "name",
            "description",
            "price",
            "category",
            "created_at",
            "updated_at",
        ]


class ServiceOrderSerializer(serializers.ModelSerializer):
    roomNumber = serializers.CharField(source="room_number", read_only=True)
    branchId = serializers.UUIDField(source="branch_id", read_only=True)
    guestName = serializers.CharField(source="guest_name", read_only=True)
    guestPhone = serializers.CharField(source="guest_phone", read_only=True)
    assignedStaff = serializers.CharField(source="assigned_staff", read_only=True)
    timestamp = serializers.SerializerMethodField()

    class Meta:
        model = ServiceOrder
        fields = [
            "id",
            "booking",
            "branch",
            "branchId",
            "category",
            "status",
            "roomNumber",
            "guestName",
            "guestPhone",
            "assignedStaff",
            "items",
            "amount",
            "timestamp",
            "created_at",
            "updated_at",
        ]

    def get_timestamp(self, obj):
        return obj.created_at.strftime("%H:%M %d/%m/%Y")

