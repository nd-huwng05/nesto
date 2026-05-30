import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_remove_manager_role"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserNotification",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=255)),
                ("message", models.TextField(blank=True, default="")),
                ("notification_type", models.CharField(db_index=True, default="general", max_length=64)),
                ("meta", models.JSONField(blank=True, default=dict)),
                ("read", models.BooleanField(db_index=True, default=False)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notifications",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "user_notifications",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["user", "read"], name="user_notifi_user_id_8a1b0d_idx"),
                    models.Index(fields=["user", "-created_at"], name="user_notifi_user_id_2c4e1a_idx"),
                ],
            },
        ),
    ]
