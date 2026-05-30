from rest_framework import serializers


class BranchCatalogSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    branch_id = serializers.UUIDField()
    company_id = serializers.UUIDField(allow_null=True, required=False)
    title = serializers.CharField()
    address = serializers.CharField(allow_blank=True)
    city = serializers.CharField(allow_blank=True)
    image = serializers.CharField(allow_blank=True)
    description = serializers.CharField(allow_blank=True)
    lodging_type = serializers.CharField(allow_blank=True)
    rating = serializers.FloatField()
    review_count = serializers.IntegerField()
    themes = serializers.ListField(child=serializers.CharField(), allow_empty=True)
    min_price_hour = serializers.IntegerField(allow_null=True, required=False)
    distance_km = serializers.FloatField(allow_null=True, required=False)


class BranchSearchResultSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    branch_id = serializers.UUIDField()
    title = serializers.CharField()
    address = serializers.CharField(allow_blank=True)
    image = serializers.CharField(allow_blank=True)
    distance_km = serializers.FloatField(allow_null=True, required=False)


class FavoriteBranchSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    branch_id = serializers.UUIDField()
    title = serializers.CharField()
    address = serializers.CharField(allow_blank=True)
    image = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField(allow_null=True, required=False)
