from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import BaseAuditedModel


class SnapshotType(models.TextChoices):
	UPCOMING = 'upcoming', 'Upcoming'
	HISTORY = 'history', 'History'
	PAYMENT = 'payment', 'Payment'


class CustomerBookingSnapshot(BaseAuditedModel):
	snapshot_id = models.CharField(max_length=80, unique=True, db_index=True)
	customer = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name='booking_snapshots',
		null=True,
		blank=True,
	)
	booking_code = models.CharField(max_length=64, blank=True, default='', db_index=True)
	snapshot_type = models.CharField(max_length=16, choices=SnapshotType.choices, db_index=True)
	hotel_name = models.CharField(max_length=255, blank=True, default='')
	room_name = models.CharField(max_length=255, blank=True, default='')
	check_in_label = models.CharField(max_length=64, blank=True, default='')
	check_out_label = models.CharField(max_length=64, blank=True, default='')
	check_in_date = models.DateField(null=True, blank=True)
	check_out_date = models.DateField(null=True, blank=True)
	action_label = models.CharField(max_length=64, blank=True, default='')
	action_color = models.CharField(max_length=16, blank=True, default='')
	payment_status = models.CharField(max_length=32, blank=True, default='', db_index=True)
	payment_method = models.CharField(max_length=32, blank=True, default='')
	customer_name = models.CharField(max_length=255, blank=True, default='')
	customer_email = models.EmailField(blank=True, default='', db_index=True)
	customer_phone = models.CharField(max_length=32, blank=True, default='')
	total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	remaining_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	subtotal_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	vat_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	selected_services = models.JSONField(null=True, blank=True)
	invoice_details = models.JSONField(null=True, blank=True)
	paid_at = models.DateTimeField(null=True, blank=True)
	source = models.CharField(max_length=32, blank=True, default='mobile-app')

	class Meta:
		db_table = 'customer_booking_snapshots'
		indexes = [
			models.Index(fields=['customer', 'snapshot_type', 'created_at']),
			models.Index(fields=['booking_code', 'snapshot_type']),
			models.Index(fields=['hotel_name', 'room_name']),
		]

	def __str__(self):
		return f"{self.snapshot_id} | {self.snapshot_type}"


class CustomerNotification(BaseAuditedModel):
	notification_id = models.CharField(max_length=80, unique=True, db_index=True)
	customer = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name='customer_notifications',
		null=True,
		blank=True,
	)
	title = models.CharField(max_length=255)
	message = models.TextField(blank=True, default='')
	notification_type = models.CharField(max_length=64, blank=True, default='general', db_index=True)
	meta = models.JSONField(null=True, blank=True)
	is_read = models.BooleanField(default=False, db_index=True)
	read_at = models.DateTimeField(null=True, blank=True)

	class Meta:
		db_table = 'customer_notifications'
		indexes = [
			models.Index(fields=['customer', 'is_read', 'created_at']),
			models.Index(fields=['notification_type', 'created_at']),
		]

	def __str__(self):
		return f"{self.notification_id} | {self.notification_type}"


class CustomerWatchlistPost(BaseAuditedModel):
	post_id = models.CharField(max_length=80, unique=True, db_index=True)
	customer = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name='watchlist_posts',
		null=True,
		blank=True,
	)
	booking_code = models.CharField(max_length=64, blank=True, default='', db_index=True)
	hotel_name = models.CharField(max_length=255)
	room_name = models.CharField(max_length=255, blank=True, default='')
	description = models.TextField(blank=True, default='')
	image_url = models.TextField(blank=True, default='')
	rating = models.PositiveSmallIntegerField(
		validators=[MinValueValidator(1), MaxValueValidator(5)],
		default=5,
	)
	posted_by_name = models.CharField(max_length=255, blank=True, default='')
	posted_by_email = models.EmailField(blank=True, default='', db_index=True)
	is_active = models.BooleanField(default=True, db_index=True)

	class Meta:
		db_table = 'customer_watchlist_posts'
		indexes = [
			models.Index(fields=['customer', 'created_at']),
			models.Index(fields=['booking_code']),
			models.Index(fields=['hotel_name', 'room_name']),
		]

	def __str__(self):
		return f"{self.post_id} | {self.hotel_name}"


class CustomerHotelRating(BaseAuditedModel):
	rating_id = models.CharField(max_length=80, unique=True, db_index=True)
	customer = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name='hotel_ratings',
		null=True,
		blank=True,
	)
	booking_code = models.CharField(max_length=64, blank=True, default='', db_index=True)
	hotel_name = models.CharField(max_length=255)
	room_name = models.CharField(max_length=255, blank=True, default='')
	rating = models.DecimalField(
		max_digits=2,
		decimal_places=1,
		validators=[MinValueValidator(1), MaxValueValidator(5)],
	)
	customer_name = models.CharField(max_length=255, blank=True, default='')
	customer_email = models.EmailField(blank=True, default='', db_index=True)
	source = models.CharField(max_length=32, blank=True, default='checkout')

	class Meta:
		db_table = 'customer_hotel_ratings'
		indexes = [
			models.Index(fields=['customer', 'created_at']),
			models.Index(fields=['booking_code']),
			models.Index(fields=['hotel_name', 'room_name', 'created_at']),
		]

	def __str__(self):
		return f"{self.rating_id} | {self.hotel_name} | {self.rating}"
