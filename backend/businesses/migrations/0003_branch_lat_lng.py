from django.db import migrations, models

from core.migration_utils import add_model_fields_if_missing


def add_branch_coordinates_if_missing(apps, schema_editor):
    branch_model = apps.get_model("businesses", "Branch")
    add_model_fields_if_missing(
        schema_editor,
        branch_model,
        [
            models.FloatField(blank=True, null=True, name="latitude"),
            models.FloatField(blank=True, null=True, name="longitude"),
        ],
    )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("businesses", "0002_alter_branch_image_alter_company_logo"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_branch_coordinates_if_missing, noop_reverse),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="branch",
                    name="latitude",
                    field=models.FloatField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="branch",
                    name="longitude",
                    field=models.FloatField(blank=True, null=True),
                ),
            ],
        ),
    ]
