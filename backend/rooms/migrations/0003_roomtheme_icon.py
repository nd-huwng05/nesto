from django.db import migrations, models

from core.migration_utils import add_model_fields_if_missing


def add_room_theme_icon_if_missing(apps, schema_editor):
    theme_model = apps.get_model("rooms", "RoomTheme")
    add_model_fields_if_missing(
        schema_editor,
        theme_model,
        [
            models.CharField(blank=True, default="", max_length=64, name="icon"),
        ],
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0002_room_themes"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_room_theme_icon_if_missing, noop_reverse),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="roomtheme",
                    name="icon",
                    field=models.CharField(blank=True, default="", max_length=64),
                ),
            ],
        ),
    ]
