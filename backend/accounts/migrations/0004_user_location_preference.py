from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_alter_user_avatar"),
    ]

    operations = [
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
    ]

