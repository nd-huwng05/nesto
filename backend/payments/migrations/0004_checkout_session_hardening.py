from django.db import migrations

from core.migration_utils import add_db_index_if_missing, existing_columns


def sync_checkout_session_columns(apps, schema_editor):
    table = "payment_transactions"
    present = existing_columns(schema_editor, table)
    if "checkout_session_id" not in present:
        quoted = schema_editor.quote_name(table)
        quoted_col = schema_editor.quote_name("checkout_session_id")
        if schema_editor.connection.vendor == "mysql":
            schema_editor.execute(
                f"ALTER TABLE {quoted} ADD COLUMN {quoted_col} VARCHAR(64) NOT NULL DEFAULT ''"
            )
        else:
            schema_editor.execute(
                f"ALTER TABLE {quoted} ADD COLUMN {quoted_col} varchar(64) NOT NULL DEFAULT ''"
            )

    add_db_index_if_missing(
        schema_editor,
        table,
        "payment_tra_checkou_9a1c2b_idx",
        ["checkout_session_id", "status"],
    )


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0003_checkout_session"),
    ]

    operations = [
        migrations.RunPython(sync_checkout_session_columns, migrations.RunPython.noop),
    ]
