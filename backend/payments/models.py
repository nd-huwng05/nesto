from django.conf import settings
from django.db import models

from core.models import BaseAuditedModel


class PaymentTransaction(BaseAuditedModel):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"

    class Provider(models.TextChoices):
        MOMO = "momo", "MoMo"
        ZALOPAY = "zalopay", "ZaloPay"
        SANDBOX = "sandbox", "Sandbox"

    booking = models.ForeignKey(
        "bookings.Booking",
        on_delete=models.CASCADE,
        related_name="payment_transactions",
        null=True,
        blank=True,
    )
    checkout_session_id = models.CharField(max_length=64, blank=True, default="", db_index=True)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_transactions",
    )
    provider = models.CharField(max_length=16, choices=Provider.choices, db_index=True)
    order_id = models.CharField(max_length=128, db_index=True)
    amount = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    provider_trans_id = models.CharField(max_length=128, blank=True, default="")
    request_id = models.CharField(max_length=128, blank=True, default="")
    pay_url = models.TextField(blank=True, default="")
    raw_response = models.JSONField(default=dict, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "payment_transactions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["booking", "status"]),
            models.Index(fields=["checkout_session_id", "status"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["order_id", "provider"], name="uniq_payment_order_provider"),
        ]

    def __str__(self) -> str:
        return f"{self.provider}:{self.order_id}:{self.status}"
