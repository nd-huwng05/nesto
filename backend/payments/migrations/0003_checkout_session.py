from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0002_model_hardening"),
    ]

    operations = [
        migrations.AddField(
            model_name="paymenttransaction",
            name="checkout_session_id",
            field=models.CharField(blank=True, db_index=True, default="", max_length=64),
        ),
        migrations.AlterField(
            model_name="paymenttransaction",
            name="booking",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="payment_transactions",
                to="bookings.booking",
            ),
        ),
        migrations.AddIndex(
            model_name="paymenttransaction",
            index=models.Index(fields=["checkout_session_id", "status"], name="payment_tra_checkou_9a1c2b_idx"),
        ),
    ]
