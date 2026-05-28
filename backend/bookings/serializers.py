from rest_framework import serializers

from bookings.models import Booking, BookingExtraService


class BookingExtraServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingExtraService
        fields = ["id", "service_key", "summary", "amount", "created_at", "updated_at"]


class BookingSerializer(serializers.ModelSerializer):
    guestName = serializers.CharField(source="guest_name", required=False, allow_blank=True)
    roomNumber = serializers.SerializerMethodField()
    roomType = serializers.CharField(source="room_type", required=False, allow_blank=True)
    bookingCode = serializers.CharField(source="booking_code", required=False)
    checkInTime = serializers.SerializerMethodField()
    checkOutTime = serializers.SerializerMethodField()
    originalRoomNumber = serializers.CharField(source="original_room_number", required=False, allow_blank=True)
    roomChangeNote = serializers.CharField(source="room_change_note", required=False, allow_blank=True)
    hourlyRate = serializers.IntegerField(source="hourly_rate", required=False)
    basePrice = serializers.IntegerField(source="base_price", required=False)
    extraServices = BookingExtraServiceSerializer(source="extra_services", many=True, read_only=True)
    statusLabel = serializers.SerializerMethodField()
    isUnassigned = serializers.SerializerMethodField()
    branchId = serializers.UUIDField(source="branch_id", read_only=True)
    roomId = serializers.UUIDField(source="room_id", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "branch",
            "branchId",
            "room",
            "roomId",
            "roomNumber",
            "roomType",
            "bookingCode",
            "guestName",
            "email",
            "phone",
            "status",
            "statusLabel",
            "isUnassigned",
            "walk_in",
            "checkInTime",
            "checkOutTime",
            "check_in_at",
            "check_out_at",
            "expected_check_out_at",
            "hotel_name",
            "hotel_address",
            "originalRoomNumber",
            "roomChangeNote",
            "hourlyRate",
            "basePrice",
            "discount",
            "payment_method",
            "extraServices",
            "created_at",
            "updated_at",
        ]

    def get_roomNumber(self, obj):
        return obj.room.room_number if obj.room else ""

    def get_statusLabel(self, obj):
        return str(obj.status or "").replace("_", " ").title()

    def get_isUnassigned(self, obj):
        return obj.room_id is None

    def _format_dt(self, dt):
        if not dt:
            return ""
        return dt.strftime("%Hh%M' %d %b %Y")

    def get_checkInTime(self, obj):
        return self._format_dt(obj.check_in_at)

    def get_checkOutTime(self, obj):
        return self._format_dt(obj.check_out_at)


class CustomerBookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = [
            "branch",
            "room_type",
            "hotel_name",
            "hotel_address",
            "guest_name",
            "email",
            "phone",
            "expected_check_out_at",
        ]

    def validate(self, attrs):
        if not attrs.get("branch"):
            raise serializers.ValidationError({"branch": "branch is required."})
        hotel_name = str(attrs.get("hotel_name") or "").strip()
        room_type = str(attrs.get("room_type") or "").strip()
        if not hotel_name:
            raise serializers.ValidationError({"hotel_name": "hotel_name is required."})
        if not room_type:
            raise serializers.ValidationError({"room_type": "room_type is required."})
        return attrs


from bookings.models import ReviewForumPost


class ReviewForumPostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_email = serializers.SerializerMethodField()
    hearts_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()

    class Meta:
        model = ReviewForumPost
        fields = [
            "id",
            "booking_id",
            "hotel_name",
            "room_name",
            "content",
            "rating",
            "image_url",
            "created_at",
            "author_name",
            "author_email",
            "hearts_count",
            "liked_by_me",
        ]

    def get_author_name(self, obj):
        user = getattr(obj, "customer", None)
        return str(getattr(user, "name", "") or getattr(user, "email", "") or "Guest")

    def get_author_email(self, obj):
        user = getattr(obj, "customer", None)
        return str(getattr(user, "email", "") or "").strip().lower()

    def get_hearts_count(self, obj):
        try:
            return obj.liked_by.count()
        except Exception:
            return 0

    def get_liked_by_me(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            return False
        return obj.liked_by.filter(id=user.id).exists()


class ReviewForumPostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewForumPost
        fields = ["booking_id", "hotel_name", "room_name", "content", "rating", "image_url"]

    def validate_hotel_name(self, value):
        text = str(value or "").strip()
        if not text:
            raise serializers.ValidationError("Hotel name is required.")
        return text

    def validate_room_name(self, value):
        text = str(value or "").strip()
        if not text:
            raise serializers.ValidationError("Room name is required.")
        return text

    def validate_rating(self, value):
        try:
            v = int(value)
        except Exception:
            raise serializers.ValidationError("Rating must be a number.")
        if v < 0 or v > 5:
            raise serializers.ValidationError("Rating must be between 0 and 5.")
        return v

    def validate_content(self, value):
        text = str(value or "").strip()
        if len(text) < 3:
            raise serializers.ValidationError("Content is too short.")
        return text
