from rest_framework import serializers


class BillingTransactionSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    transaction_id = serializers.UUIDField()
    booking_id = serializers.UUIDField()
    status = serializers.CharField()
    amount = serializers.IntegerField()
    currency = serializers.CharField()
    payment_method = serializers.CharField(allow_blank=True)
    branch_id = serializers.UUIDField(allow_null=True)
    branch_name = serializers.CharField(allow_blank=True)
    customer_name = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class BillingInvoiceSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    status = serializers.CharField()
    amount = serializers.IntegerField()
    currency = serializers.CharField()
    note = serializers.CharField(allow_blank=True)
    booking_id = serializers.UUIDField()
    branch_id = serializers.UUIDField(allow_null=True)
    payment_method = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class BillingReportSerializer(serializers.Serializer):
    id = serializers.CharField()
    title = serializers.CharField()
    total_revenue = serializers.IntegerField()
    total_bookings = serializers.IntegerField()
    currency = serializers.CharField()
    generated_at = serializers.DateTimeField()
