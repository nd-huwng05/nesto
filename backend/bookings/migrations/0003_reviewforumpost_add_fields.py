import django.db.models.deletion
from django.db import migrations, models


def add_review_fields_if_missing(apps, schema_editor):
    pass


def noop_reverse(apps, schema_editor):
    pass


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
