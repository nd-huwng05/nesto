from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0007_model_hardening'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='special_requests',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Guest special requests captured at booking time (diet, accessibility, etc.).',
            ),
        ),
    ]
