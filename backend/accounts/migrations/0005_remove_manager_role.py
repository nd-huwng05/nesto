from django.db import migrations, models


def migrate_manager_users(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(role="MANAGER").update(role="BUSINESS_OWNER")
    User.objects.filter(email__iexact="manager@nesto.com").update(is_active=False)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_user_location_preference"),
    ]

    operations = [
        migrations.RunPython(migrate_manager_users, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("SUPER_ADMIN", "Super Admin"),
                    ("CUSTOMER", "Customer"),
                    ("BUSINESS_OWNER", "Business_Owner"),
                    ("RECEPTIONIST", "Receptionist"),
                    ("HOUSEKEEPING", "Housekeeping"),
                    ("SERVICE", "Service"),
                    ("STAFF", "Staff"),
                ],
                default="CUSTOMER",
                max_length=32,
            ),
        ),
    ]
