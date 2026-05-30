from django.db import migrations, models

from core.migration_utils import add_model_fields_if_missing


def add_tier_pricing_fields_if_missing(apps, schema_editor):
    category_model = apps.get_model("rooms", "RoomCategory")
    add_model_fields_if_missing(
        schema_editor,
        category_model,
        [
            models.IntegerField(default=0, name="price_per_hour"),
            models.IntegerField(default=0, name="price_per_half_day"),
            models.IntegerField(default=0, name="price_per_day"),
        ],
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("rooms", "0005_room_theme_links"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_tier_pricing_fields_if_missing, noop_reverse),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="roomcategory",
                    name="price_per_hour",
                    field=models.IntegerField(default=0),
                ),
                migrations.AddField(
                    model_name="roomcategory",
                    name="price_per_half_day",
                    field=models.IntegerField(default=0),
                ),
                migrations.AddField(
                    model_name="roomcategory",
                    name="price_per_day",
                    field=models.IntegerField(default=0),
                ),
            ],
        ),
    ]
