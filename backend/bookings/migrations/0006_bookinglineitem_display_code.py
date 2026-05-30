from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0005_ensure_booking_extra_services"),
    ]

    operations = [
        migrations.AddField(
            model_name="bookinglineitem",
            name="display_code",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
