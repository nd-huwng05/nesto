import cloudinary.models
from django.db import migrations


def noop_forward(apps, schema_editor):
    """Image/logo columns already exist; only Django field type changes."""


class Migration(migrations.Migration):

    dependencies = [
        ("businesses", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(noop_forward, migrations.RunPython.noop),
            ],
            state_operations=[
                migrations.AlterField(
                    model_name="branch",
                    name="image",
                    field=cloudinary.models.CloudinaryField(
                        blank=True, max_length=255, null=True, verbose_name="branch_image"
                    ),
                ),
                migrations.AlterField(
                    model_name="company",
                    name="logo",
                    field=cloudinary.models.CloudinaryField(
                        blank=True, max_length=255, null=True, verbose_name="company_logo"
                    ),
                ),
            ],
        ),
    ]
