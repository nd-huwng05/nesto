import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0003_reviewforumpost_add_fields"),
        ("businesses", "0001_initial"),
        ("service_orders", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="deposit_amount",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="booking",
            name="deposit_percentage",
            field=models.PositiveSmallIntegerField(default=20),
        ),
        migrations.AddField(
            model_name="booking",
            name="hold_minutes",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="booking",
            name="late_hold_deadline_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="booking",
            name="room_price",
            field=models.IntegerField(default=0),
        ),
        migrations.CreateModel(
            name="BookingLineItem",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("service_key", models.CharField(blank=True, default="", max_length=64)),
                ("service_code", models.CharField(blank=True, default="", max_length=64)),
                ("line_no", models.PositiveSmallIntegerField(default=1)),
                ("summary", models.CharField(blank=True, default="", max_length=255)),
                ("amount", models.IntegerField(default=0)),
                ("category", models.CharField(default="ROOM_SERVICE", max_length=64)),
                ("status", models.CharField(db_index=True, default="PENDING", max_length=32)),
                ("source", models.CharField(default="CUSTOMER", max_length=32)),
                ("assigned_staff", models.CharField(blank=True, default="", max_length=255)),
                ("items", models.JSONField(blank=True, default=list)),
                ("room_number", models.CharField(blank=True, default="", max_length=32)),
                ("guest_name", models.CharField(blank=True, default="", max_length=255)),
                ("guest_phone", models.CharField(blank=True, default="", max_length=64)),
                (
                    "booking",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="line_items",
                        to="bookings.booking",
                    ),
                ),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="booking_line_items",
                        to="businesses.branch",
                    ),
                ),
                (
                    "extra_service",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="line_items",
                        to="service_orders.extraservice",
                    ),
                ),
            ],
            options={
                "db_table": "booking_line_items",
            },
        ),
    ]
