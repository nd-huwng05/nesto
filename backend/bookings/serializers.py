from rest_framework import serializers

from .models import Booking, BookingStatus, ReviewForumPost


STATUS_ALIASES = {
    'CHECKED_OUT': BookingStatus.COMPLETED,
    'COMPLETED': BookingStatus.COMPLETED,
    'CANCELLED': BookingStatus.CANCELLED,
    'CONFIRMED': BookingStatus.CONFIRMED,
    'CHECKED_IN': BookingStatus.CHECKED_IN,
    'PENDING': BookingStatus.PENDING,
}


class BookingSerializer(serializers.ModelSerializer):
    customer_id = serializers.UUIDField(source='customer.id', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'booking_number',
            'booking_id',
            'customer_id',
            'hotel_name',
            'room_name',
            'check_in_date',
            'check_out_date',
            'status',
            'status_display',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'booking_number', 'booking_id', 'customer_id', 'created_at', 'updated_at']


class BookingCreateSerializer(serializers.Serializer):
    branch_id = serializers.CharField(required=False, allow_blank=True)
    customer_id = serializers.CharField(required=False, allow_blank=True)
    room_id = serializers.CharField(required=False, allow_blank=True)
    room_name = serializers.CharField(required=False, allow_blank=True)
    roomName = serializers.CharField(required=False, allow_blank=True)
    hotel_name = serializers.CharField(required=False, allow_blank=True)
    hotelName = serializers.CharField(required=False, allow_blank=True)
    check_in = serializers.DateField(required=False)
    check_out = serializers.DateField(required=False)
    checkInAt = serializers.DateTimeField(required=False)
    durationDays = serializers.IntegerField(required=False, min_value=1)
    walkIn = serializers.BooleanField(required=False)
    status = serializers.CharField(required=False, allow_blank=True)

    def validate_status(self, value):
        text = str(value or '').strip().upper()
        if not text:
            return BookingStatus.PENDING
        if text in STATUS_ALIASES:
            return STATUS_ALIASES[text]
        lowered = text.lower()
        valid_values = {item.value for item in BookingStatus}
        if lowered in valid_values:
            return lowered
        raise serializers.ValidationError('Invalid status value.')


class ReviewForumPostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_email = serializers.SerializerMethodField()
    hearts_count = serializers.SerializerMethodField()
    liked_by_me = serializers.SerializerMethodField()
    liked_by_ids = serializers.SerializerMethodField()

    class Meta:
        model = ReviewForumPost
        fields = [
            'id',
            'booking_id',
            'hotel_name',
            'room_name',
            'scope_key',
            'content',
            'created_at',
            'author_name',
            'author_email',
            'hearts_count',
            'liked_by_me',
            'liked_by_ids',
        ]

    def get_author_name(self, obj) -> str:
        return str(getattr(obj.customer, 'name', '') or getattr(obj.customer, 'email', '') or 'Guest')

    def get_author_email(self, obj) -> str:
        return str(getattr(obj.customer, 'email', '') or '').strip().lower()

    def get_hearts_count(self, obj) -> int:
        return obj.liked_by.count()

    def get_liked_by_me(self, obj) -> bool:
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return obj.liked_by.filter(id=user.id).exists()

    def get_liked_by_ids(self, obj) -> list[str]:
        return [str(pk) for pk in obj.liked_by.values_list('id', flat=True)]


class ReviewForumPostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewForumPost
        fields = ['booking_id', 'hotel_name', 'room_name', 'content']

    def validate_hotel_name(self, value):
        text = str(value or '').strip()
        if not text:
            raise serializers.ValidationError('Hotel name is required.')
        return text

    def validate_room_name(self, value):
        text = str(value or '').strip()
        if not text:
            raise serializers.ValidationError('Room type is required.')
        return text

    def validate_content(self, value):
        text = str(value or '').strip()
        if len(text) < 8:
            raise serializers.ValidationError('Review must be at least 8 characters.')
        return text

    def create(self, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return ReviewForumPost.objects.create(
            customer=user if user and user.is_authenticated else None,
            booking_id=str(validated_data.get('booking_id') or '').strip(),
            hotel_name=validated_data['hotel_name'],
            room_name=validated_data['room_name'],
            content=validated_data['content'],
        )
