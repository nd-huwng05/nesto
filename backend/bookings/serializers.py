from rest_framework import serializers

from bookings.billing import build_booking_bill
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
    servicesTotal = serializers.SerializerMethodField()
    roomTotal = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    overtimeCharge = serializers.SerializerMethodField()
    lateMinutes = serializers.SerializerMethodField()
    isOvertime = serializers.SerializerMethodField()
    stayNights = serializers.SerializerMethodField()
    stayMinutes = serializers.SerializerMethodField()
    stayLabel = serializers.SerializerMethodField()
    nightlyRate = serializers.SerializerMethodField()
    totalAmount = serializers.SerializerMethodField()
    heroImage = serializers.SerializerMethodField()
    guestEmail = serializers.EmailField(source="email", read_only=True)
    guestPhone = serializers.CharField(source="phone", read_only=True)
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
            "guestEmail",
            "guestPhone",
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
            "roomTotal",
            "servicesTotal",
            "subtotal",
            "overtimeCharge",
            "lateMinutes",
            "isOvertime",
            "stayNights",
            "stayMinutes",
            "stayLabel",
            "nightlyRate",
            "totalAmount",
            "heroImage",
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

    def _bill_cache(self):
        if not hasattr(self, "_booking_bill_cache"):
            self._booking_bill_cache = {}
        return self._booking_bill_cache

    def _bill(self, obj):
        cache = self._bill_cache()
        key = str(obj.pk)
        if key not in cache:
            cache[key] = build_booking_bill(obj)
        return cache[key]

    def get_servicesTotal(self, obj):
        return self._bill(obj)["servicesTotal"]

    def get_roomTotal(self, obj):
        return self._bill(obj)["roomTotal"]

    def get_subtotal(self, obj):
        return self._bill(obj)["subtotal"]

    def get_overtimeCharge(self, obj):
        return self._bill(obj)["overtimeCharge"]

    def get_lateMinutes(self, obj):
        return self._bill(obj)["lateMinutes"]

    def get_isOvertime(self, obj):
        return self._bill(obj)["isOvertime"]

    def get_stayNights(self, obj):
        return self._bill(obj)["stayNights"]

    def get_stayMinutes(self, obj):
        return self._bill(obj)["stayMinutes"]

    def get_stayLabel(self, obj):
        return self._bill(obj)["stayLabel"]

    def get_nightlyRate(self, obj):
        return self._bill(obj)["nightlyRate"]

    def get_totalAmount(self, obj):
        return self._bill(obj)["totalAmount"]

    def get_heroImage(self, obj):
        branch = getattr(obj, "branch", None)
        if not branch:
            return ""
        images = getattr(branch, "images", None) or []
        if isinstance(images, list) and images:
            first = images[0]
            if isinstance(first, str) and first.strip():
                return first.strip()
            if isinstance(first, dict):
                return str(first.get("url") or first.get("image") or "").strip()
        image = getattr(branch, "image", None)
        if not image:
            return ""
        return str(getattr(image, "url", image) or "").strip()

    def _format_dt(self, dt):
        if not dt:
            return ""
        return dt.strftime("%Hh%M' %d %b %Y")

    def get_checkInTime(self, obj):
        return self._format_dt(obj.check_in_at)

    def get_checkOutTime(self, obj):
        return self._format_dt(obj.check_out_at)


class CustomerBookingCreateSerializer(serializers.ModelSerializer):
    room_type_id = serializers.UUIDField(required=False, allow_null=True)
    service_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        default=list,
    )
    check_in_at = serializers.DateTimeField(required=False, allow_null=True)

    class Meta:
        model = Booking
        fields = [
            "branch",
            "room_type",
            "room_type_id",
            "hotel_name",
            "hotel_address",
            "guest_name",
            "email",
            "phone",
            "check_in_at",
            "expected_check_out_at",
            "service_ids",
        ]

    def validate(self, attrs):
        if not attrs.get("branch"):
            raise serializers.ValidationError({"branch": "branch is required."})
        hotel_name = str(attrs.get("hotel_name") or "").strip()
        room_type = str(attrs.get("room_type") or "").strip()
        room_type_id = attrs.get("room_type_id", None)
        if not hotel_name:
            raise serializers.ValidationError({"hotel_name": "hotel_name is required."})
        if not room_type and not room_type_id:
            raise serializers.ValidationError({"room_type": "room_type or room_type_id is required."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("room_type_id", None)
        validated_data.pop("service_ids", None)
        return super().create(validated_data)


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
