from rest_framework import serializers

from .models import (
    CustomerBookingSnapshot,
    CustomerHotelRating,
    CustomerNotification,
    CustomerWatchlistPost,
)


def _trim(value):
    return str(value or '').strip()


def _as_mutable_dict(data):
    if hasattr(data, 'dict'):
        try:
            return data.dict()
        except Exception:
            pass
    return dict(data)


class CustomerBookingSnapshotSerializer(serializers.ModelSerializer):
    def to_internal_value(self, data):
        payload = _as_mutable_dict(data)
        if not payload.get('snapshot_id') and payload.get('id'):
            payload['snapshot_id'] = payload.get('id')

        alias_map = {
            'bookingId': 'booking_code',
            'hotelName': 'hotel_name',
            'roomName': 'room_name',
            'checkIn': 'check_in_label',
            'checkOut': 'check_out_label',
            'checkInDateIso': 'check_in_date',
            'checkOutDateIso': 'check_out_date',
            'actionLabel': 'action_label',
            'actionColor': 'action_color',
            'paymentStatus': 'payment_status',
            'paymentMethod': 'payment_method',
            'customerName': 'customer_name',
            'customerEmail': 'customer_email',
            'customerPhone': 'customer_phone',
            'selectedServices': 'selected_services',
            'invoiceDetails': 'invoice_details',
            'paidAt': 'paid_at',
        }
        for alias_key, model_key in alias_map.items():
            if model_key not in payload and alias_key in payload:
                payload[model_key] = payload.get(alias_key)

        return super().to_internal_value(payload)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['bookingId'] = data.get('booking_code')
        data['hotelName'] = data.get('hotel_name')
        data['roomName'] = data.get('room_name')
        data['checkIn'] = data.get('check_in_label')
        data['checkOut'] = data.get('check_out_label')
        data['checkInDateIso'] = data.get('check_in_date')
        data['checkOutDateIso'] = data.get('check_out_date')
        data['actionLabel'] = data.get('action_label')
        data['actionColor'] = data.get('action_color')
        data['paymentStatus'] = data.get('payment_status')
        data['paymentMethod'] = data.get('payment_method')
        data['customerName'] = data.get('customer_name')
        data['customerEmail'] = data.get('customer_email')
        data['customerPhone'] = data.get('customer_phone')
        data['selectedServices'] = data.get('selected_services')
        data['invoiceDetails'] = data.get('invoice_details')
        data['paidAt'] = data.get('paid_at')
        return data

    def validate_snapshot_id(self, value):
        text = _trim(value)
        if not text:
            raise serializers.ValidationError('snapshot_id is required.')
        queryset = CustomerBookingSnapshot.objects.filter(snapshot_id=text)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('snapshot_id already exists.')
        return text

    def validate_booking_code(self, value):
        return _trim(value)

    def validate_hotel_name(self, value):
        return _trim(value)

    def validate_room_name(self, value):
        return _trim(value)

    def validate(self, attrs):
        for amount_field in [
            'total_amount',
            'paid_amount',
            'remaining_amount',
            'deposit_amount',
            'subtotal_price',
            'vat_amount',
        ]:
            value = attrs.get(amount_field)
            if value is not None and value < 0:
                raise serializers.ValidationError({amount_field: 'Value cannot be negative.'})
        return attrs

    class Meta:
        model = CustomerBookingSnapshot
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'customer')


class CustomerNotificationSerializer(serializers.ModelSerializer):
    def to_internal_value(self, data):
        payload = _as_mutable_dict(data)
        if not payload.get('notification_id') and payload.get('id'):
            payload['notification_id'] = payload.get('id')

        alias_map = {
            'type': 'notification_type',
            'read': 'is_read',
        }
        for alias_key, model_key in alias_map.items():
            if model_key not in payload and alias_key in payload:
                payload[model_key] = payload.get(alias_key)

        return super().to_internal_value(payload)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['type'] = data.get('notification_type')
        data['read'] = data.get('is_read')
        data['createdAt'] = data.get('created_at')
        return data

    def validate_notification_id(self, value):
        text = _trim(value)
        if not text:
            raise serializers.ValidationError('notification_id is required.')
        queryset = CustomerNotification.objects.filter(notification_id=text)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('notification_id already exists.')
        return text

    def validate_title(self, value):
        text = _trim(value)
        if not text:
            raise serializers.ValidationError('title is required.')
        return text

    def validate_message(self, value):
        return _trim(value)

    def validate_notification_type(self, value):
        text = _trim(value)
        return text or 'general'

    class Meta:
        model = CustomerNotification
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'customer', 'read_at')


class CustomerWatchlistPostSerializer(serializers.ModelSerializer):
    def to_internal_value(self, data):
        payload = _as_mutable_dict(data)
        if not payload.get('post_id') and payload.get('id'):
            payload['post_id'] = payload.get('id')

        alias_map = {
            'bookingId': 'booking_code',
            'hotelName': 'hotel_name',
            'roomName': 'room_name',
            'image': 'image_url',
            'userName': 'posted_by_name',
            'customerEmail': 'posted_by_email',
        }
        for alias_key, model_key in alias_map.items():
            if model_key not in payload and alias_key in payload:
                payload[model_key] = payload.get(alias_key)

        return super().to_internal_value(payload)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['bookingId'] = data.get('booking_code')
        data['hotelName'] = data.get('hotel_name')
        data['roomName'] = data.get('room_name')
        data['image'] = data.get('image_url')
        data['userName'] = data.get('posted_by_name')
        data['customerEmail'] = data.get('posted_by_email')
        data['createdAt'] = data.get('created_at')
        return data

    def validate_post_id(self, value):
        text = _trim(value)
        if not text:
            raise serializers.ValidationError('post_id is required.')
        queryset = CustomerWatchlistPost.objects.filter(post_id=text)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('post_id already exists.')
        return text

    def validate_hotel_name(self, value):
        text = _trim(value)
        if not text:
            raise serializers.ValidationError('hotel_name is required.')
        return text

    def validate_room_name(self, value):
        return _trim(value)

    def validate_description(self, value):
        return _trim(value)

    def validate_image_url(self, value):
        return _trim(value)

    def validate_booking_code(self, value):
        return _trim(value)

    class Meta:
        model = CustomerWatchlistPost
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'customer')


class CustomerHotelRatingSerializer(serializers.ModelSerializer):
    def to_internal_value(self, data):
        payload = _as_mutable_dict(data)
        if not payload.get('rating_id') and payload.get('id'):
            payload['rating_id'] = payload.get('id')

        alias_map = {
            'bookingId': 'booking_code',
            'hotelName': 'hotel_name',
            'roomName': 'room_name',
            'customerName': 'customer_name',
            'customerEmail': 'customer_email',
        }
        for alias_key, model_key in alias_map.items():
            if model_key not in payload and alias_key in payload:
                payload[model_key] = payload.get(alias_key)

        return super().to_internal_value(payload)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['bookingId'] = data.get('booking_code')
        data['hotelName'] = data.get('hotel_name')
        data['roomName'] = data.get('room_name')
        data['customerName'] = data.get('customer_name')
        data['customerEmail'] = data.get('customer_email')
        data['createdAt'] = data.get('created_at')
        return data

    def validate_rating_id(self, value):
        text = _trim(value)
        if not text:
            raise serializers.ValidationError('rating_id is required.')
        queryset = CustomerHotelRating.objects.filter(rating_id=text)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('rating_id already exists.')
        return text

    def validate_hotel_name(self, value):
        text = _trim(value)
        if not text:
            raise serializers.ValidationError('hotel_name is required.')
        return text

    def validate_room_name(self, value):
        return _trim(value)

    def validate_booking_code(self, value):
        return _trim(value)

    def validate_source(self, value):
        text = _trim(value)
        return text or 'checkout'

    class Meta:
        model = CustomerHotelRating
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'customer')


class CustomerBookingSnapshotListResponseSerializer(serializers.Serializer):
    results = CustomerBookingSnapshotSerializer(many=True)


class CustomerBookingSnapshotInputSerializer(CustomerBookingSnapshotSerializer):
    class Meta(CustomerBookingSnapshotSerializer.Meta):
        fields = (
            'snapshot_id', 'booking_code', 'snapshot_type', 'hotel_name', 'room_name',
            'check_in_label', 'check_out_label', 'check_in_date', 'check_out_date',
            'action_label', 'action_color', 'payment_status', 'payment_method',
            'customer_name', 'customer_email', 'customer_phone',
            'total_amount', 'paid_amount', 'remaining_amount', 'deposit_amount',
            'subtotal_price', 'vat_amount', 'selected_services', 'invoice_details',
            'paid_at', 'source',
        )


class CustomerNotificationListResponseSerializer(serializers.Serializer):
    results = CustomerNotificationSerializer(many=True)


class CustomerNotificationInputSerializer(CustomerNotificationSerializer):
    class Meta(CustomerNotificationSerializer.Meta):
        fields = ('notification_id', 'title', 'message', 'notification_type', 'meta', 'is_read')


class CustomerWatchlistPostListResponseSerializer(serializers.Serializer):
    results = CustomerWatchlistPostSerializer(many=True)


class CustomerWatchlistPostPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerWatchlistPost
        fields = (
            'post_id',
            'booking_code',
            'hotel_name',
            'room_name',
            'description',
            'image_url',
            'rating',
            'posted_by_name',
            'created_at',
        )


class CustomerWatchlistPostPublicListResponseSerializer(serializers.Serializer):
    results = CustomerWatchlistPostPublicSerializer(many=True)


class CustomerWatchlistPostInputSerializer(CustomerWatchlistPostSerializer):
    class Meta(CustomerWatchlistPostSerializer.Meta):
        fields = ('post_id', 'booking_code', 'hotel_name', 'room_name', 'description', 'image_url', 'rating')


class CustomerHotelRatingListResponseSerializer(serializers.Serializer):
    results = CustomerHotelRatingSerializer(many=True)


class CustomerHotelRatingInputSerializer(CustomerHotelRatingSerializer):
    class Meta(CustomerHotelRatingSerializer.Meta):
        fields = ('rating_id', 'booking_code', 'hotel_name', 'room_name', 'rating', 'source')


class CustomerMarkAllReadResponseSerializer(serializers.Serializer):
    updated_count = serializers.IntegerField()


class CustomerHotelRatingStatsResponseSerializer(serializers.Serializer):
    hotel_name = serializers.CharField()
    avg_rating = serializers.FloatField()
    review_count = serializers.IntegerField()


class CustomerErrorResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class CustomerValidationErrorResponseSerializer(serializers.Serializer):
    errors = serializers.DictField(
        child=serializers.ListField(child=serializers.CharField())
    )
