from django.db import models


class HotelCategory(models.TextChoices):
	FAMILY = 'Family', 'Family'
	BUSINESS = 'Business', 'Business'


class Hotel(models.Model):
	hotel_id = models.CharField(max_length=80, unique=True, db_index=True)
	title = models.CharField(max_length=255)
	city = models.CharField(max_length=255, blank=True, default='')
	address = models.CharField(max_length=500, blank=True, default='')
	description = models.TextField(blank=True, default='')
	image_url = models.TextField(blank=True, default='')
	price_per_night = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	rating = models.DecimalField(max_digits=3, decimal_places=1, default=5)
	category = models.CharField(max_length=32, choices=HotelCategory.choices, default=HotelCategory.FAMILY, db_index=True)
	is_active = models.BooleanField(default=True, db_index=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = 'business_hotels'
		indexes = [
			models.Index(fields=['category', 'is_active']),
			models.Index(fields=['city']),
		]
		ordering = ['title']

	def __str__(self):
		return self.title
