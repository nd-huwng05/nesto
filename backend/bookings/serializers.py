from rest_framework import serializers

from bookings.models import Booking, BookingLineItem, ReviewForumPost, build_display_code
from bookings.services.billing_service import build_booking_bill, build_final_bill
from core.services.cloudinary_service import CloudinaryMediaService
from core.services.serializer_mixins import CloudinaryRepresentationMixin


class BookingLineItemSerializer(serializers.ModelSerializer):
    display_code = serializers.SerializerMethodField()

    class Meta:
        model = BookingLineItem
        fields = [
            "id",
            "booking",
            "branch",
            "service_key",
            "service_code",
            "line_no",
            "display_code",
            "summary",
            "amount",
            "category",
            "status",
            "source",
            "assigned_staff",
            "assigned_to",
            "items",
            "room_number",
            "guest_name",
            "guest_phone",
            "created_at",
            "updated_at",
        ]

    def get_display_code(self, obj):
        return build_display_code(obj.service_code, obj.line_no)


class BookingImageMixin:
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

    def _resolve_hotel_image(self, obj):
        branch = getattr(obj, "branch", None)
        if not branch:
            return None
        url = self._first_image_url(getattr(branch, "images", None) or [])
        if url and CloudinaryMediaService.is_http_url(url):
            return url
        return CloudinaryMediaService.resolve_field_url(getattr(branch, "image", None))

    def _resolve_room_image(self, obj):
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
        return self._resolve_hotel_image(obj)


class BookingListSerializer(BookingImageMixin, CloudinaryRepresentationMixin, serializers.ModelSerializer):
    room_number = serializers.SerializerMethodField()
    status_label = serializers.SerializerMethodField()
    is_unassigned = serializers.SerializerMethodField()
    check_in_time = serializers.SerializerMethodField()
    check_out_time = serializers.SerializerMethodField()
    hero_image = serializers.SerializerMethodField()
    hotel_image = serializers.SerializerMethodField()
    room_image = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            "id",
            "branch",
            "branch_id",
            "room",
            "room_id",
            "room_category_id",
            "room_number",
            "room_type",
            "booking_code",
            "guest_name",
            "email",
            "phone",
            "status",
            "status_label",
            "is_unassigned",
            "walk_in",
            "check_in_time",
            "check_out_time",
            "check_in_at",
            "check_out_at",
            "expected_check_out_at",
            "hotel_name",
            "hotel_address",
            "original_room_number",
            "room_change_note",
            "special_requests",
            "hourly_rate",
            "base_price",
            "room_price",
            "deposit_percentage",
            "deposit_amount",
            "hold_minutes",
            "late_hold_deadline_at",
            "discount",
            "payment_method",
            "hero_image",
            "hotel_image",
            "room_image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "status",
            "booking_code",
            "base_price",
            "deposit_amount",
            "room_price",
            "check_in_at",
            "check_out_at",
            "expected_check_out_at",
        ]

    def get_room_number(self, obj):
        return obj.room.room_number if obj.room else ""

    def get_status_label(self, obj):
        return str(obj.status or "").replace("_", " ").title()

    def get_is_unassigned(self, obj):
        return obj.room_id is None

    @staticmethod
    def _format_dt(dt):
        if not dt:
            return ""
        return dt.strftime("%Hh%M' %d %b %Y")

    def get_check_in_time(self, obj):
        return self._format_dt(obj.check_in_at)

    def get_check_out_time(self, obj):
        checkout = obj.check_out_at or obj.expected_check_out_at
        return self._format_dt(checkout)

    def get_hotel_image(self, obj):
        return self._resolve_hotel_image(obj)

    def get_room_image(self, obj):
        return self._resolve_room_image(obj)

    def get_hero_image(self, obj):
        room_url = self.get_room_image(obj)
        if room_url:
            return room_url
        return self.get_hotel_image(obj)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not str(data.get("room_type") or "").strip():
            category = getattr(instance, "room_category", None)
            if category is None and getattr(instance, "room", None) is not None:
                category = getattr(instance.room, "category", None)
            if category is not None:
                data["room_type"] = str(getattr(category, "name", "") or "").strip()
        for key in ("hero_image", "hotel_image", "room_image"):
            value = data.get(key)
            if not value:
                data[key] = None
            elif not CloudinaryMediaService.is_http_url(str(value)):
                data[key] = CloudinaryMediaService.resolve_legacy_url(str(value))
        return data


class BookingDetailSerializer(BookingListSerializer):
    line_items = BookingLineItemSerializer(many=True, read_only=True)

    class Meta(BookingListSerializer.Meta):
        fields = BookingListSerializer.Meta.fields + ["line_items"]


class BookingBillSerializer(BookingDetailSerializer):
    services_total = serializers.SerializerMethodField()
    room_total = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    overtime_charge = serializers.SerializerMethodField()
    late_minutes = serializers.SerializerMethodField()
    is_overtime = serializers.SerializerMethodField()
    stay_nights = serializers.SerializerMethodField()
    stay_minutes = serializers.SerializerMethodField()
    stay_label = serializers.SerializerMethodField()
    nightly_rate = serializers.SerializerMethodField()
    pricing_tier = serializers.SerializerMethodField()
    duration_hours = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    final_bill = serializers.SerializerMethodField()

    class Meta(BookingDetailSerializer.Meta):
        fields = BookingDetailSerializer.Meta.fields + [
            "services_total",
            "room_total",
            "subtotal",
            "overtime_charge",
            "late_minutes",
            "is_overtime",
            "stay_nights",
            "stay_minutes",
            "stay_label",
            "nightly_rate",
            "pricing_tier",
            "duration_hours",
            "total_amount",
            "final_bill",
        ]

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

    def get_services_total(self, obj):
        return self._bill(obj)["services_total"]

    def get_room_total(self, obj):
        return self._bill(obj)["room_total"]

    def get_subtotal(self, obj):
        return self._bill(obj)["subtotal"]

    def get_overtime_charge(self, obj):
        return self._bill(obj)["overtime_charge"]

    def get_late_minutes(self, obj):
        return self._bill(obj)["late_minutes"]

    def get_is_overtime(self, obj):
        return self._bill(obj)["is_overtime"]

    def get_stay_nights(self, obj):
        return self._bill(obj)["stay_nights"]

    def get_stay_minutes(self, obj):
        return self._bill(obj)["stay_minutes"]

    def get_stay_label(self, obj):
        return self._bill(obj)["stay_label"]

    def get_nightly_rate(self, obj):
        return self._bill(obj)["nightly_rate"]

    def get_pricing_tier(self, obj):
        return self._bill(obj).get("pricing_tier", "")

    def get_duration_hours(self, obj):
        return self._bill(obj).get("duration_hours", 0)

    def get_total_amount(self, obj):
        return self._bill(obj)["total_amount"]

    def get_final_bill(self, obj):
        return build_final_bill(obj)


# Default serializer — detail view without bill computation on every field access.
BookingSerializer = BookingDetailSerializer


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
            "special_requests",
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


class BookingQuoteInputSerializer(serializers.Serializer):
    room_type_id = serializers.UUIDField(required=True)
    branch = serializers.UUIDField(required=True)
    branch_id = serializers.UUIDField(required=False)
    check_in_at = serializers.CharField(required=True)
    expected_check_out_at = serializers.CharField(required=True)
    deposit_percentage = serializers.IntegerField(required=False, default=20)

    def validate(self, attrs):
        branch_id = attrs.get("branch_id") or attrs.get("branch")
        if not branch_id:
            raise serializers.ValidationError({"branch": "branch is required."})
        attrs["branch_id"] = branch_id
        return attrs


class BookingCancelInputSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class BookingCancelOutputSerializer(serializers.Serializer):
    booking = BookingDetailSerializer()
    refund = serializers.DictField(required=False)


class ReviewForumPostSerializer(CloudinaryRepresentationMixin, serializers.ModelSerializer):
    booking_id = serializers.SerializerMethodField()
    author_name = serializers.SerializerMethodField()
    author_email = serializers.SerializerMethodField()
    author_avatar = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    branch_id = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    branch_address = serializers.SerializerMethodField()
    hearts_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()

    cloudinary_field_map = {"image_url": "image"}

    class Meta:
        model = ReviewForumPost
        fields = [
            "id",
            "booking_id",
            "branch_id",
            "branch_name",
            "branch_address",
            "hotel_name",
            "room_name",
            "content",
            "rating",
            "image_url",
            "created_at",
            "author_name",
            "author_email",
            "author_avatar",
            "hearts_count",
            "liked_by_me",
        ]

    def get_booking_id(self, obj):
        if obj.booking_ref_id:
            return str(obj.booking_ref_id)
        return ""

    def _author_user(self, obj):
        return getattr(obj, "customer", None)

    def get_author_name(self, obj):
        user = self._author_user(obj)
        return str(getattr(user, "name", "") or getattr(user, "email", "") or "Guest")

    def get_author_email(self, obj):
        user = self._author_user(obj)
        return str(getattr(user, "email", "") or "").strip().lower()

    def get_author_avatar(self, obj):
        user = self._author_user(obj)
        return CloudinaryMediaService.resolve_field_url(getattr(user, "avatar", None) if user else None)

    def get_branch_id(self, obj):
        if obj.branch_id:
            return str(obj.branch_id)
        booking = getattr(obj, "booking_ref", None)
        if booking and getattr(booking, "branch_id", None):
            return str(booking.branch_id)
        return ""

    def get_branch_name(self, obj):
        branch = getattr(obj, "branch", None)
        if branch:
            return str(branch.name or "")
        booking = getattr(obj, "booking_ref", None)
        if booking and getattr(booking, "branch", None):
            return str(booking.branch.name or "")
        return str(obj.hotel_name or "")

    def get_branch_address(self, obj):
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

    def get_liked_by_me(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            return False
        return obj.liked_by.filter(id=user.id).exists()

    def get_image_url(self, obj):
        url = CloudinaryMediaService.resolve_field_url(getattr(obj, "image", None))
        if url:
            return url
        return CloudinaryMediaService.resolve_legacy_url(getattr(obj, "image_url", ""))


class ReviewForumPostCreateSerializer(serializers.ModelSerializer):
    booking_id = serializers.CharField(required=False, allow_blank=True, write_only=True)
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
