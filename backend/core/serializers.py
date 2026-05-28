from rest_framework import serializers


class InvoiceSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    status = serializers.CharField(required=False, allow_blank=True, default="DRAFT")
    amount = serializers.IntegerField(required=False, default=0)
    currency = serializers.CharField(required=False, allow_blank=True, default="VND")
    note = serializers.CharField(required=False, allow_blank=True, default="")
    created_at = serializers.DateTimeField(read_only=True, required=False)
    updated_at = serializers.DateTimeField(read_only=True, required=False)

