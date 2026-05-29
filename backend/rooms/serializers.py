from rest_framework import serializers

from core.services.serializer_mixins import CloudinaryRepresentationMixin
from rooms.models import BranchTheme, HousekeepingTask, MaintenanceIssue, Room, RoomCategory, RoomTheme


class RoomCategorySerializer(CloudinaryRepresentationMixin, serializers.ModelSerializer):
    basePrice = serializers.IntegerField(source="base_price")
    pricePerHour = serializers.IntegerField(source="price_per_hour", required=False)
    pricePerHalfDay = serializers.IntegerField(source="price_per_half_day", required=False)
    pricePerDay = serializers.IntegerField(source="price_per_day", required=False)
    roomAmenities = serializers.ListField(source="room_amenities", child=serializers.CharField(), required=False)

    cloudinary_gallery_fields = ("images",)

    class Meta:
        model = RoomCategory
        fields = [
            "id",
            "branch",
            "name",
            "basePrice",
            "pricePerHour",
            "pricePerHalfDay",
            "pricePerDay",
            "capacity",
            "description",
            "roomAmenities",
            "images",
            "created_at",
            "updated_at",
        ]


class RoomCategoryAvailabilitySerializer(RoomCategorySerializer):
    available_count = serializers.IntegerField(read_only=True)

    class Meta(RoomCategorySerializer.Meta):
        fields = RoomCategorySerializer.Meta.fields + ["available_count"]


class RoomThemeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomTheme
        fields = ["id", "name", "icon", "created_at", "updated_at"]


class RoomSerializer(serializers.ModelSerializer):
    roomNumber = serializers.CharField(source="room_number")
    roomTypeId = serializers.UUIDField(source="category_id", allow_null=True, required=False)
    roomTypeName = serializers.CharField(source="category.name", read_only=True)
    room_type_name = serializers.CharField(source="category.name", read_only=True)
    themes = RoomThemeSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = [
            "id",
            "branch",
            "roomNumber",
            "floor",
            "status",
            "roomTypeId",
            "roomTypeName",
            "room_type_name",
            "themes",
            "created_at",
            "updated_at",
        ]


class MaintenanceIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceIssue
        fields = [
            "id",
            "branch",
            "room_number",
            "issue_type",
            "description",
            "is_resolved",
            "created_at",
            "updated_at",
        ]


class HousekeepingTaskSerializer(serializers.ModelSerializer):
    roomNumber = serializers.CharField(source="room.room_number", read_only=True)
    branchId = serializers.UUIDField(source="branch_id", read_only=True)
    roomId = serializers.UUIDField(source="room_id", read_only=True)

    class Meta:
        model = HousekeepingTask
        fields = [
            "id",
            "branch",
            "branchId",
            "room",
            "roomId",
            "roomNumber",
            "status",
            "note",
            "completed_at",
            "created_at",
            "updated_at",
        ]


class BranchThemeSerializer(serializers.ModelSerializer):
    theme = RoomThemeSerializer(read_only=True)
    themeId = serializers.UUIDField(source="theme_id", write_only=True, required=False)
    branchId = serializers.UUIDField(source="branch_id", write_only=True, required=False)

    class Meta:
        model = BranchTheme
        fields = ["id", "branchId", "themeId", "theme", "created_at", "updated_at"]

