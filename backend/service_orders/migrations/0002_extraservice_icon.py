from django.db import migrations, models

from core.migration_utils import add_model_fields_if_missing


def add_extra_service_icon_if_missing(apps, schema_editor):
    extra_service_model = apps.get_model("service_orders", "ExtraService")
    add_model_fields_if_missing(
        schema_editor,
        extra_service_model,
        [
            models.CharField(blank=True, default="sparkles-outline", max_length=64, name="icon"),
        ],
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("service_orders", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_extra_service_icon_if_missing, noop_reverse),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="extraservice",
                    name="icon",
                    field=models.CharField(blank=True, default="sparkles-outline", max_length=64),
                ),
            ],
        ),
    ]
