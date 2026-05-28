from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ReviewForumPost',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('booking_id', models.CharField(blank=True, default='', max_length=64)),
                ('hotel_name', models.CharField(max_length=255)),
                ('room_name', models.CharField(max_length=255)),
                ('scope_key', models.CharField(db_index=True, max_length=600)),
                ('content', models.TextField()),
                ('customer', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='review_forum_posts', to=settings.AUTH_USER_MODEL)),
                ('liked_by', models.ManyToManyField(blank=True, related_name='liked_review_forum_posts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'review_forum_posts',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='reviewforumpost',
            index=models.Index(fields=['scope_key', 'created_at'], name='review_forum_scope_k_7c5aa9_idx'),
        ),
        migrations.AddIndex(
            model_name='reviewforumpost',
            index=models.Index(fields=['hotel_name', 'room_name'], name='review_forum_hotel_n_1b89e0_idx'),
        ),
    ]
