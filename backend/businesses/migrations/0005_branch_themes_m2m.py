from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("businesses", "0004_favorite_branch"),
        ("rooms", "0003_roomtheme_icon"),
    ]

    operations = [
        migrations.AddField(
            model_name="branch",
            name="themes",
            field=models.ManyToManyField(blank=True, related_name="branches", through="rooms.BranchTheme", to="rooms.roomtheme"),
        ),
    ]

