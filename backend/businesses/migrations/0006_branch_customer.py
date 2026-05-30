from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("businesses", "0005_branch_themes_m2m"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BranchCustomer",
            fields=[
                ("id", models.UUIDField(editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("guest_name", models.CharField(blank=True, default="", max_length=255)),
                ("email", models.EmailField(blank=True, default="", max_length=255)),
                ("phone", models.CharField(blank=True, default="", max_length=64)),
                ("booking_count", models.PositiveIntegerField(default=0)),
                ("total_spent", models.PositiveIntegerField(default=0)),
                ("last_booking_at", models.DateTimeField(blank=True, null=True)),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="branch_customers",
                        to="businesses.branch",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="branch_customer_profiles",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "branch_customers",
            },
        ),
        migrations.AddIndex(
            model_name="branchcustomer",
            index=models.Index(fields=["branch", "last_booking_at"], name="branch_cust_branch__a8f3d1_idx"),
        ),
        migrations.AlterUniqueTogether(
            name="branchcustomer",
            unique_together={("branch", "user")},
        ),
    ]
