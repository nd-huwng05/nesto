from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models import BaseAuditedModel


class BookingSequence(models.Model):
	key = models.CharField(max_length=64, unique=True)
	last_value = models.PositiveBigIntegerField(default=0)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		db_table = 'booking_sequences'

	def __str__(self):
		return f"{self.key}:{self.last_value}"


class BookingStatus(models.TextChoices):
	PENDING = 'pending', _('Pending')
	CONFIRMED = 'confirmed', _('Confirmed')
	CHECKED_IN = 'checked_in', _('Checked In')
	COMPLETED = 'completed', _('Completed')
	CANCELLED = 'cancelled', _('Cancelled')


class Booking(BaseAuditedModel):
	booking_number = models.PositiveBigIntegerField(unique=True, db_index=True, editable=False)
	booking_id = models.CharField(max_length=16, unique=True, db_index=True, editable=False)
	customer = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name='bookings',
		null=True,
		blank=True,
	)
	hotel_name = models.CharField(max_length=255, blank=True, default='')
	room_name = models.CharField(max_length=255, blank=True, default='')
	check_in_date = models.DateField(null=True, blank=True)
	check_out_date = models.DateField(null=True, blank=True)
	status = models.CharField(max_length=32, choices=BookingStatus.choices, default=BookingStatus.PENDING)

	class Meta:
		db_table = 'bookings'
		indexes = [
			models.Index(fields=['booking_id']),
			models.Index(fields=['booking_number']),
			models.Index(fields=['customer']),
			models.Index(fields=['status']),
		]

	def save(self, *args, **kwargs):
		if self._state.adding and (not self.booking_number or not self.booking_id):
			from .service import next_booking_identity

			booking_number, booking_id = next_booking_identity()
			self.booking_number = booking_number
			self.booking_id = booking_id

		super().save(*args, **kwargs)

	def __str__(self):
		return self.booking_id


def normalize_scope_part(value: str) -> str:
	return ' '.join(str(value or '').strip().lower().split())


def build_review_scope_key(hotel_name: str, room_name: str) -> str:
	return f"{normalize_scope_part(hotel_name)}::{normalize_scope_part(room_name)}"


class ReviewForumPost(BaseAuditedModel):
	customer = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		related_name='review_forum_posts',
		null=True,
		blank=True,
	)
	booking_id = models.CharField(max_length=64, blank=True, default='')
	hotel_name = models.CharField(max_length=255)
	room_name = models.CharField(max_length=255)
	scope_key = models.CharField(max_length=600, db_index=True)
	content = models.TextField()
	liked_by = models.ManyToManyField(
		settings.AUTH_USER_MODEL,
		related_name='liked_review_forum_posts',
		blank=True,
	)

	class Meta:
		db_table = 'review_forum_posts'
		indexes = [
			models.Index(fields=['scope_key', 'created_at']),
			models.Index(fields=['hotel_name', 'room_name']),
		]

	def save(self, *args, **kwargs):
		self.scope_key = build_review_scope_key(self.hotel_name, self.room_name)
		super().save(*args, **kwargs)

	def __str__(self):
		return f"{self.hotel_name} | {self.room_name} | {self.id}"



