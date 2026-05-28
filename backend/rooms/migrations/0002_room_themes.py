from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="RoomTheme",
            fields=[
                ("id", models.UUIDField(primary_key=True, serialize=False, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=64, unique=True)),
            ],
            options={
                "db_table": "room_themes",
            },
        ),
        migrations.CreateModel(
            name="BranchTheme",
            fields=[
                ("id", models.UUIDField(primary_key=True, serialize=False, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "branch",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="branch_themes",
                        to="businesses.branch",
                    ),
                ),
                (
                    "theme",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="branch_themes",
                        to="rooms.roomtheme",
                    ),
                ),
            ],
            options={
                "db_table": "branch_themes",
                "unique_together": {("branch", "theme")},
            },
        ),
        migrations.AddIndex(
            model_name="roomtheme",
            index=models.Index(fields=["name"], name="room_themes_name_idx"),
        ),
        migrations.AddIndex(
            model_name="branchtheme",
            index=models.Index(fields=["branch", "theme"], name="branch_themes_branch_theme_idx"),
        ),
        migrations.AddIndex(
            model_name="branchtheme",
            index=models.Index(fields=["theme"], name="branch_themes_theme_idx"),
        ),
    ]

