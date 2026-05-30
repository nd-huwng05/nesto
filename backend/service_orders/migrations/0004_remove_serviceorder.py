from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("service_orders", "0003_model_hardening"),
    ]

    operations = [
        migrations.DeleteModel(
            name="ServiceOrder",
        ),
    ]
