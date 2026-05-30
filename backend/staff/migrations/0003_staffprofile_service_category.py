from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("staff", "0002_alter_staffprofile_department"),
    ]

    operations = [
        migrations.AddField(
            model_name="staffprofile",
            name="service_category",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Task filter for SERVICE staff: SPA, RESTAURANT, TRANSPORT, ROOM_SERVICE",
                max_length=32,
            ),
        ),
    ]
