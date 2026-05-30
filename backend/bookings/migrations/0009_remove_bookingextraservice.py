from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0008_booking_special_requests"),
    ]

    operations = [
        migrations.DeleteModel(
            name="BookingExtraService",
        ),
    ]
