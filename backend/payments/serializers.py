from rest_framework import serializers


class PaymentInitSerializer(serializers.Serializer):
    booking_id = serializers.CharField(required=False, allow_blank=True)
    booking_data = serializers.DictField(required=False)
    selected_services = serializers.ListField(child=serializers.DictField(), required=False, allow_empty=True)
    deposit_percentage = serializers.IntegerField(min_value=20, max_value=100, default=20)
    amount = serializers.IntegerField(min_value=1, required=False)
    order_info = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate_deposit_percentage(self, value):
        allowed = {20, 50, 100}
        if int(value) not in allowed:
            raise serializers.ValidationError("deposit_percentage must be 20, 50, or 100.")
        return int(value)


class PaymentTransactionStatusSerializer(serializers.Serializer):
    id = serializers.UUIDField(required=False, allow_null=True)
    provider = serializers.CharField(required=False, allow_blank=True)
    order_id = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.IntegerField(required=False)
    status = serializers.CharField(required=False, allow_blank=True)
    provider_trans_id = serializers.CharField(required=False, allow_blank=True)
    verified_at = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class PaymentStatusSerializer(serializers.Serializer):
    checkout_session_id = serializers.CharField(required=False, allow_blank=True)
    booking_id = serializers.UUIDField(required=False, allow_null=True)
    booking_code = serializers.CharField(required=False, allow_blank=True)
    booking_status = serializers.CharField(required=False, allow_blank=True)
    deposit_paid = serializers.BooleanField()
    payment_method = serializers.CharField(allow_blank=True, required=False)
    deposit_amount = serializers.IntegerField()
    transaction = PaymentTransactionStatusSerializer(allow_null=True, required=False)
