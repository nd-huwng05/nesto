from rest_framework import serializers

from bookings.services.billing_service import build_booking_bill, build_final_bill
from bookings.models import Booking, BookingExtraService
from core.services.serializer_mixins import CloudinaryRepresentationMixin
from core.services.cloudinary_service import CloudinaryMediaService


class BookingExtraServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookingExtraService
        fields = ["id", "service_key", "summary", "amount", "created_at", "updated_at"]


class BookingSerializer(CloudinaryRepresentationMixin, serializers.ModelSerializer):
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
    roomPrice = serializers.IntegerField(source="room_price", read_only=True)
    depositPercentage = serializers.IntegerField(source="deposit_percentage", read_only=True)
    depositAmount = serializers.IntegerField(source="deposit_amount", read_only=True)
    holdMinutes = serializers.IntegerField(source="hold_minutes", read_only=True)
    lateHoldDeadlineAt = serializers.DateTimeField(source="late_hold_deadline_at", read_only=True)
    pricingTier = serializers.SerializerMethodField()
    durationHours = serializers.SerializerMethodField()
    totalAmount = serializers.SerializerMethodField()
    heroImage = serializers.SerializerMethodField()
    hotel_image = serializers.SerializerMethodField()
    room_image = serializers.SerializerMethodField()
    hotelImage = serializers.SerializerMethodField()
    roomImage = serializers.SerializerMethodField()
    guestEmail = serializers.EmailField(source="email", read_only=True)
    guestPhone = serializers.CharField(source="phone", read_only=True)
    statusLabel = serializers.SerializerMethodField()
    isUnassigned = serializers.SerializerMethodField()
    branchId = serializers.UUIDField(source="branch_id", read_only=True)
    roomId = serializers.UUIDField(source="room_id", read_only=True)
    roomCategoryId = serializers.UUIDField(source="room_category_id", read_only=True)
    finalBill = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "branch",
            "branchId",
            "room",
            "roomId",
            "roomCategoryId",
            "finalBill",
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
            "roomPrice",
            "depositPercentage",
            "depositAmount",
            "holdMinutes",
            "lateHoldDeadlineAt",
            "pricingTier",
            "durationHours",
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
            "hotel_image",
            "room_image",
            "hotelImage",
            "roomImage",
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

    def get_pricingTier(self, obj):
        return self._bill(obj).get("pricingTier", "")

    def get_durationHours(self, obj):
        return self._bill(obj).get("durationHours", 0)

    def get_totalAmount(self, obj):
        return self._bill(obj)["totalAmount"]

    def get_finalBill(self, obj):
        return build_final_bill(obj)

    @staticmethod
    def _first_image_url(images):
        if not isinstance(images, list) or not images:
            return ""
        first = images[0]
        if isinstance(first, str) and first.strip():
            return first.strip()
        if isinstance(first, dict):
            return str(first.get("url") or first.get("image") or "").strip()
        return ""

    def get_hotel_image(self, obj):
        return self.get_hotelImage(obj)

    def get_hotelImage(self, obj):
        branch = getattr(obj, "branch", None)
        if not branch:
            return None
        url = self._first_image_url(getattr(branch, "images", None) or [])
        if url and CloudinaryMediaService.is_http_url(url):
            return url
        return CloudinaryMediaService.resolve_field_url(getattr(branch, "image", None))

    def get_room_image(self, obj):
        return self.get_roomImage(obj)

    def get_roomImage(self, obj):
        room = getattr(obj, "room", None)
        if room is not None:
            category = getattr(room, "category", None)
            if category is not None:
                url = self._first_image_url(getattr(category, "images", None) or [])
                if url:
                    return url
        room_category = getattr(obj, "room_category", None)
        if room_category is not None:
            url = self._first_image_url(getattr(room_category, "images", None) or [])
            if url:
                return url
        return self.get_hotelImage(obj)

    def get_heroImage(self, obj):
        room_url = self.get_roomImage(obj)
        if room_url:
            return room_url
        return self.get_hotelImage(obj)

    def _format_dt(self, dt):
        if not dt:
            return ""
        return dt.strftime("%Hh%M' %d %b %Y")

    def get_checkInTime(self, obj):
        return self._format_dt(obj.check_in_at)

    def get_checkOutTime(self, obj):
        return self._format_dt(obj.check_out_at)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        for key in ("heroImage", "hotelImage", "roomImage", "hotel_image", "room_image"):
            value = data.get(key)
            if not value:
                data[key] = None
            elif not CloudinaryMediaService.is_http_url(str(value)):
                data[key] = CloudinaryMediaService.resolve_legacy_url(str(value))
        return data


class CustomerBookingCreateSerializer(serializers.ModelSerializer):
    room_type_id = serializers.UUIDField(required=False, allow_null=True)
    service_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
        default=list,
    )
    check_in_at = serializers.DateTimeField(required=False, allow_null=True)
    deposit_percentage = serializers.IntegerField(required=False, default=20, min_value=20, max_value=100)

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
            "deposit_percentage",
        ]

    def validate_deposit_percentage(self, value):
        pct = int(value or 20)
        if pct not in {20, 50, 100}:
            raise serializers.ValidationError("deposit_percentage must be 20, 50, or 100.")
        return pct

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
        validated_data.pop("deposit_percentage", None)
        return super().create(validated_data)


from bookings.models import ReviewForumPost


class ReviewForumPostSerializer(CloudinaryRepresentationMixin, serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_email = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()
    authorAvatar = serializers.SerializerMethodField()
    authorName = serializers.SerializerMethodField()
    hotelName = serializers.CharField(source="hotel_name", read_only=True)
    roomName = serializers.CharField(source="room_name", read_only=True)
    imageUrl = serializers.SerializerMethodField()
    branchId = serializers.SerializerMethodField()
    branchName = serializers.SerializerMethodField()
    branchAddress = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    hearts_count = serializers.SerializerMethodField()
    heartsCount = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    likedByMe = serializers.SerializerMethodField()

    cloudinary_field_map = {"imageUrl": "image"}

    class Meta:
        model = ReviewForumPost
        fields = [
            "id",
            "booking_id",
            "branchId",
            "branchName",
            "branchAddress",
            "hotel_name",
            "hotelName",
            "room_name",
            "roomName",
            "content",
            "rating",
            "image_url",
            "imageUrl",
            "created_at",
            "createdAt",
            "author_name",
            "authorName",
            "author_email",
            "author_avatar",
            "authorAvatar",
            "hearts_count",
            "heartsCount",
            "liked_by_me",
            "likedByMe",
        ]

    def _author_user(self, obj):
        return getattr(obj, "customer", None)

    def get_author_name(self, obj):
        user = self._author_user(obj)
        return str(getattr(user, "name", "") or getattr(user, "email", "") or "Guest")

    def get_authorName(self, obj):
        return self.get_author_name(obj)

    def get_author_email(self, obj):
        user = self._author_user(obj)
        return str(getattr(user, "email", "") or "").strip().lower()

    def get_author_avatar(self, obj):
        user = self._author_user(obj)
        return CloudinaryMediaService.resolve_field_url(getattr(user, "avatar", None) if user else None)

    def get_authorAvatar(self, obj):
        return self.get_author_avatar(obj)

    def get_branchId(self, obj):
        if obj.branch_id:
            return str(obj.branch_id)
        booking = getattr(obj, "booking_ref", None)
        if booking and getattr(booking, "branch_id", None):
            return str(booking.branch_id)
        return ""

    def get_branchName(self, obj):
        branch = getattr(obj, "branch", None)
        if branch:
            return str(branch.name or "")
        booking = getattr(obj, "booking_ref", None)
        if booking and getattr(booking, "branch", None):
            return str(booking.branch.name or "")
        return str(obj.hotel_name or "")

    def get_branchAddress(self, obj):
        branch = getattr(obj, "branch", None)
        if branch:
            return str(branch.address or "")
        booking = getattr(obj, "booking_ref", None)
        if booking and getattr(booking, "branch", None):
            return str(booking.branch.address or "")
        return ""

    def get_hearts_count(self, obj):
        try:
            return obj.liked_by.count()
        except Exception:
            return 0

    def get_heartsCount(self, obj):
        return self.get_hearts_count(obj)

    def get_liked_by_me(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            return False
        return obj.liked_by.filter(id=user.id).exists()

    def get_likedByMe(self, obj):
        return self.get_liked_by_me(obj)

    def get_imageUrl(self, obj):
        url = CloudinaryMediaService.resolve_field_url(getattr(obj, "image", None))
        if url:
            return url
        return CloudinaryMediaService.resolve_legacy_url(getattr(obj, "image_url", ""))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        image_url = self.get_imageUrl(instance)
        data["imageUrl"] = image_url
        data["image_url"] = image_url
        data["authorAvatar"] = data.get("author_avatar")
        return data


class ReviewForumPostCreateSerializer(serializers.ModelSerializer):
    branch_id = serializers.UUIDField(required=False, allow_null=True, write_only=True)
    image_url = serializers.URLField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = ReviewForumPost
        fields = ["booking_id", "branch_id", "hotel_name", "room_name", "content", "rating", "image_url"]

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

    def create(self, validated_data):
        image_url = str(validated_data.pop("image_url", "") or "").strip()
        if image_url and CloudinaryMediaService.is_http_url(image_url):
            public_id = CloudinaryMediaService.ingest_url(image_url, folder="nesto/lockets")
            if public_id:
                validated_data["image"] = public_id
            validated_data["image_url"] = image_url
        return super().create(validated_data)
