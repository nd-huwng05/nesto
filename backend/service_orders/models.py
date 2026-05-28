from django.db import models
from django.conf import settings

from core.models import BaseAuditedModel


class ExtraService(BaseAuditedModel):
    class Meta:
        db_table = "extra_services"

    branch = models.ForeignKey("businesses.Branch", on_delete=models.CASCADE, related_name="extra_services")
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    price = models.IntegerField(default=0)
    icon = models.CharField(max_length=64, blank=True, default="sparkles-outline")
    category = models.CharField(max_length=64, default="RESTAURANT")

    def __str__(self) -> str:
        return self.name


class ServiceOrder(BaseAuditedModel):
    class Meta:
        db_table = "service_orders"

    booking = models.ForeignKey("bookings.Booking", on_delete=models.CASCADE, related_name="service_orders")
    branch = models.ForeignKey("businesses.Branch", on_delete=models.CASCADE, related_name="service_orders")

    category = models.CharField(max_length=64, default="ROOM_SERVICE")
    status = models.CharField(max_length=32, default="PENDING")

    room_number = models.CharField(max_length=32, blank=True, default="")
    guest_name = models.CharField(max_length=255, blank=True, default="")
    guest_phone = models.CharField(max_length=64, blank=True, default="")

    assigned_staff = models.CharField(max_length=255, blank=True, default="")
    items = models.JSONField(default=list, blank=True)
    amount = models.IntegerField(default=0)

    def __str__(self) -> str:
        return f"{self.category}:{self.booking_id}"
