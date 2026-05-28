from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("rooms", "0002_room_themes"),
    ]

    operations = [
        migrations.AddField(
            model_name="roomtheme",
            name="icon",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]

