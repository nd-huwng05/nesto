from rest_framework import serializers

from core.services.serializer_mixins import CloudinaryRepresentationMixin
from rooms.models import BranchTheme, HousekeepingTask, MaintenanceIssue, Room, RoomCategory, RoomTheme


class RoomCategorySerializer(CloudinaryRepresentationMixin, serializers.ModelSerializer):
    cloudinary_gallery_fields = ("images",)

    class Meta:
        model = RoomCategory
        fields = [
            "id",
            "branch",
            "name",
            "base_price",
            "price_per_hour",
            "price_per_half_day",
            "price_per_day",
            "max_guests",
            "description",
            "room_amenities",
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
        fields = [
            "id",
            "name",
            "slug",
            "icon",
            "description",
            "sort_order",
            "show_in_tabs",
            "is_active",
            "created_at",
            "updated_at",
        ]


class RoomSerializer(serializers.ModelSerializer):
    room_type_name = serializers.CharField(source="category.name", read_only=True)
    price_per_hour = serializers.IntegerField(source="category.price_per_hour", read_only=True)
    themes = RoomThemeSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = [
            "id",
            "branch",
            "room_number",
            "floor",
            "status",
            "category",
            "room_type_name",
            "price_per_hour",
            "themes",
            "created_at",
            "updated_at",
        ]


class MaintenanceIssueSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    room_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = MaintenanceIssue
        fields = [
            "id",
            "branch",
            "room",
            "room_id",
            "room_number",
            "issue_type",
            "description",
            "is_resolved",
            "created_at",
            "updated_at",
        ]


class HousekeepingTaskSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    room_status = serializers.CharField(source="room.status", read_only=True)
    room_type_name = serializers.CharField(source="room.category.name", read_only=True, default="")
    floor = serializers.IntegerField(source="room.floor", read_only=True, allow_null=True)
    branch_id = serializers.UUIDField(read_only=True)
    room_id = serializers.UUIDField(read_only=True)
    status_label = serializers.SerializerMethodField()

    class Meta:
        model = HousekeepingTask
        fields = [
            "id",
            "branch",
            "branch_id",
            "room",
            "room_id",
            "room_number",
            "room_status",
            "room_type_name",
            "floor",
            "assigned_to",
            "status",
            "status_label",
            "note",
            "completed_at",
            "created_at",
            "updated_at",
        ]

    def get_status_label(self, obj):
        return str(obj.status or "").replace("_", " ").title()


class BranchThemeSerializer(serializers.ModelSerializer):
    theme = RoomThemeSerializer(read_only=True)
    theme_id = serializers.UUIDField(write_only=True, required=False)
    branch_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = BranchTheme
        fields = ["id", "branch_id", "theme_id", "theme", "created_at", "updated_at"]
