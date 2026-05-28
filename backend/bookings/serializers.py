from rest_framework import serializers

from .models import ReviewForumPost


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

    def get_author_name(self, obj):
        return str(getattr(obj.customer, 'name', '') or getattr(obj.customer, 'email', '') or 'Guest')

    def get_author_email(self, obj):
        return str(getattr(obj.customer, 'email', '') or '').strip().lower()

    def get_hearts_count(self, obj):
        return obj.liked_by.count()

    def get_liked_by_me(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return obj.liked_by.filter(id=user.id).exists()

    def get_liked_by_ids(self, obj):
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
