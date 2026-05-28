from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="HousekeepingTask",
            fields=[
                ("id", models.UUIDField(editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(choices=[("PENDING", "Pending"), ("IN_PROGRESS", "In Progress"), ("COMPLETED", "Completed"), ("CANCELLED", "Cancelled")], db_index=True, default="PENDING", max_length=32)),
                ("note", models.TextField(blank=True, default="")),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="housekeeping_tasks", to="businesses.branch")),
                ("room", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="housekeeping_tasks", to="rooms.room")),
            ],
            options={
                "db_table": "housekeeping_tasks",
            },
        ),
        migrations.AddIndex(
            model_name="housekeepingtask",
            index=models.Index(fields=["branch", "status"], name="housekeepin_branch__c9b2d9_idx"),
        ),
        migrations.AddIndex(
            model_name="housekeepingtask",
            index=models.Index(fields=["room", "status"], name="housekeepin_room__caef1d_idx"),
        ),
    ]

