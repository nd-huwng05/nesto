from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0002_reviewforumpost"),
    ]

    operations = [
        migrations.AddField(
            model_name="reviewforumpost",
            name="image_url",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="reviewforumpost",
            name="rating",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="reviewforumpost",
            name="booking_ref",
            field=models.ForeignKey(
                to="bookings.booking",
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reviews",
            ),
        ),
    ]

