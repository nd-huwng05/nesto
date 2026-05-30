from django.conf import settings

from django.db import migrations, models

from django.db.models import Count



from core.migration_utils import (
    add_unique_constraint_if_missing,
    drop_index_if_exists,
    existing_columns,
    index_exists,
    rename_index_if_exists,
)





def dedupe_payment_transactions(apps, schema_editor):

    PaymentTransaction = apps.get_model("payments", "PaymentTransaction")

    table = PaymentTransaction._meta.db_table

    present = existing_columns(schema_editor, table)

    if "order_id" not in present or "provider" not in present:

        return

    dupes = (

        PaymentTransaction.objects.values("order_id", "provider")

        .annotate(total=Count("id"))

        .filter(total__gt=1)

    )

    for row in dupes:

        qs = PaymentTransaction.objects.filter(

            order_id=row["order_id"],

            provider=row["provider"],

        ).order_by("-created_at", "-id")

        for extra in qs[1:]:

            extra.delete()





def sync_payments_0002_database(apps, schema_editor):

    table = "payment_transactions"

    legacy_index = "payment_tra_order_i_6a0f0d_idx"
    drop_index_if_exists(schema_editor, table, legacy_index)



    rename_index_if_exists(

        schema_editor,

        table,

        "payment_tra_booking_8b2c1a_idx",

        "payment_tra_booking_5f2a73_idx",

    )





def add_payment_unique_constraint(apps, schema_editor):

    add_unique_constraint_if_missing(

        schema_editor,

        "payment_transactions",

        "uniq_payment_order_provider",

        ["order_id", "provider"],

    )





class Migration(migrations.Migration):

    atomic = False



    dependencies = [

        ('bookings', '0007_model_hardening'),

        ('payments', '0001_payment_transaction'),

        migrations.swappable_dependency(settings.AUTH_USER_MODEL),

    ]



    operations = [

        migrations.RunPython(sync_payments_0002_database, migrations.RunPython.noop),

        migrations.SeparateDatabaseAndState(

            database_operations=[],

            state_operations=[

                migrations.RemoveIndex(

                    model_name='paymenttransaction',

                    name='payment_tra_order_i_6a0f0d_idx',

                ),

                migrations.RenameIndex(

                    model_name='paymenttransaction',

                    new_name='payment_tra_booking_5f2a73_idx',

                    old_name='payment_tra_booking_8b2c1a_idx',

                ),

            ],

        ),

        migrations.RunPython(dedupe_payment_transactions, migrations.RunPython.noop),

        migrations.RunPython(add_payment_unique_constraint, migrations.RunPython.noop),

        migrations.SeparateDatabaseAndState(

            database_operations=[],

            state_operations=[

                migrations.AddConstraint(

                    model_name='paymenttransaction',

                    constraint=models.UniqueConstraint(fields=('order_id', 'provider'), name='uniq_payment_order_provider'),

                ),

            ],

        ),

    ]


