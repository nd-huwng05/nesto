import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("businesses", "0003_branch_lat_lng"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FavoriteBranch",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="favorited_by", to="businesses.branch")),
                ("customer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="favorite_branches", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "customer_favorite_branches",
                "unique_together": {("customer", "branch")},
            },
        ),
    ]

