from django.db import migrations, models


def _existing_columns(schema_editor, table_name):
    with schema_editor.connection.cursor() as cursor:
        return {
            col.name
            for col in schema_editor.connection.introspection.get_table_description(cursor, table_name)
        }


def add_location_fields_if_missing(apps, schema_editor):
    """Skip columns that already exist (common when DB was altered outside migrations)."""
    user_model = apps.get_model("accounts", "User")
    table = user_model._meta.db_table
    existing = _existing_columns(schema_editor, table)

    fields = [
        models.CharField(max_length=255, blank=True, default="", name="preferred_location"),
        models.FloatField(null=True, blank=True, name="preferred_latitude"),
        models.FloatField(null=True, blank=True, name="preferred_longitude"),
    ]

    for field in fields:
        if field.name in existing:
            continue
        field.set_attributes_from_name(field.name)
        schema_editor.add_field(user_model, field)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_alter_user_avatar"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_location_fields_if_missing, noop_reverse),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="user",
                    name="preferred_location",
                    field=models.CharField(blank=True, default="", max_length=255),
                ),
                migrations.AddField(
                    model_name="user",
                    name="preferred_latitude",
                    field=models.FloatField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name="user",
                    name="preferred_longitude",
                    field=models.FloatField(blank=True, null=True),
                ),
            ],
        ),
    ]
