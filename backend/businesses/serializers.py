from rest_framework import serializers

from .models import Hotel


class HotelSerializer(serializers.ModelSerializer):
    id = serializers.CharField(source='hotel_id', read_only=True)
    image = serializers.CharField(source='image_url', read_only=True)
    price = serializers.SerializerMethodField()

    class Meta:
        model = Hotel
        fields = (
            'id',
            'hotel_id',
            'title',
            'city',
            'address',
            'description',
            'image',
            'image_url',
            'price',
            'price_per_night',
            'rating',
            'category',
            'is_active',
        )

    def get_price(self, obj):
        amount = int(obj.price_per_night) if obj.price_per_night == int(obj.price_per_night) else float(obj.price_per_night)
        return f'${amount}'
