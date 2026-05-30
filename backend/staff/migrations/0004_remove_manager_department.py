from django.db import migrations, models


def remove_manager_staff_profiles(apps, schema_editor):
    StaffProfile = apps.get_model("staff", "StaffProfile")
    StaffProfile.objects.filter(department="MANAGER").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("staff", "0003_staffprofile_service_category"),
        ("accounts", "0005_remove_manager_role"),
    ]

    operations = [
        migrations.RunPython(remove_manager_staff_profiles, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="staffprofile",
            name="department",
            field=models.CharField(
                choices=[
                    ("RECEPTIONIST", "Receptionist"),
                    ("HOUSEKEEPING", "Housekeeping"),
                    ("SERVICE", "Service"),
                ],
                default="RECEPTIONIST",
                max_length=32,
            ),
        ),
    ]
