from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0004_merge_20260528_1938"),
    ]

    operations = [
        migrations.CreateModel(
            name="RoomThemeLink",
            fields=[
                ("id", models.UUIDField(primary_key=True, serialize=False, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "room",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="room_theme_links",
                        to="rooms.room",
                    ),
                ),
                (
                    "theme",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="room_theme_links",
                        to="rooms.roomtheme",
                    ),
                ),
            ],
            options={
                "db_table": "room_theme_links",
                "unique_together": {("room", "theme")},
            },
        ),
        migrations.AddIndex(
            model_name="roomthemelink",
            index=models.Index(fields=["room", "theme"], name="room_theme_links_room_theme_idx"),
        ),
        migrations.AddIndex(
            model_name="roomthemelink",
            index=models.Index(fields=["theme"], name="room_theme_links_theme_idx"),
        ),
        migrations.AddField(
            model_name="room",
            name="themes",
            field=models.ManyToManyField(blank=True, related_name="rooms", through="rooms.RoomThemeLink", to="rooms.roomtheme"),
        ),
    ]

