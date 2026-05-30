"""Shared DRF serializer utilities."""

from rest_framework import serializers


class TimestampedModelSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
