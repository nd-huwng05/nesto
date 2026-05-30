from django.db import migrations

from core.migration_utils import table_exists


def ensure_booking_extra_services(apps, schema_editor):
    if table_exists(schema_editor, "booking_extra_services"):
        return


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0004_booking_hold_fields_and_line_items"),
    ]

    operations = [
        migrations.RunPython(ensure_booking_extra_services, noop_reverse),
    ]
