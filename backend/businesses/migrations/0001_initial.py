# Generated manually for businesses Hotel model

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Hotel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hotel_id', models.CharField(db_index=True, max_length=80, unique=True)),
                ('title', models.CharField(max_length=255)),
                ('city', models.CharField(blank=True, default='', max_length=255)),
                ('address', models.CharField(blank=True, default='', max_length=500)),
                ('description', models.TextField(blank=True, default='')),
                ('image_url', models.TextField(blank=True, default='')),
                ('price_per_night', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('rating', models.DecimalField(decimal_places=1, default=5, max_digits=3)),
                ('category', models.CharField(choices=[('Family', 'Family'), ('Business', 'Business')], db_index=True, default='Family', max_length=32)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'business_hotels',
                'ordering': ['title'],
                'indexes': [models.Index(fields=['category', 'is_active'], name='business_ho_categor_8f954d_idx'), models.Index(fields=['city'], name='business_ho_city_8ea2cf_idx')],
            },
        ),
    ]
