from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("businesses", "0002_alter_branch_image_alter_company_logo"),
    ]

    operations = [
        migrations.AddField(
            model_name="branch",
            name="latitude",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="branch",
            name="longitude",
            field=models.FloatField(blank=True, null=True),
        ),
    ]

