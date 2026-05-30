import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("bookings", "0004_booking_hold_fields_and_line_items"),
    ]

    operations = [
        migrations.CreateModel(
            name="PaymentTransaction",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "provider",
                    models.CharField(
                        choices=[("momo", "MoMo"), ("zalopay", "ZaloPay"), ("sandbox", "Sandbox")],
                        db_index=True,
                        max_length=16,
                    ),
                ),
                ("order_id", models.CharField(db_index=True, max_length=128)),
                ("amount", models.PositiveIntegerField(default=0)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending"),
                            ("SUCCESS", "Success"),
                            ("FAILED", "Failed"),
                            ("CANCELLED", "Cancelled"),
                        ],
                        db_index=True,
                        default="PENDING",
                        max_length=16,
                    ),
                ),
                ("provider_trans_id", models.CharField(blank=True, default="", max_length=128)),
                ("request_id", models.CharField(blank=True, default="", max_length=128)),
                ("pay_url", models.TextField(blank=True, default="")),
                ("raw_response", models.JSONField(blank=True, default=dict)),
                ("verified_at", models.DateTimeField(blank=True, null=True)),
                (
                    "booking",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="payment_transactions",
                        to="bookings.booking",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="payment_transactions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "payment_transactions",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["order_id", "provider"], name="payment_tra_order_i_6a0f0d_idx"),
                    models.Index(fields=["booking", "status"], name="payment_tra_booking_8b2c1a_idx"),
                ],
            },
        ),
    ]
