from django.contrib import admin

from .models import (
	CustomerBookingSnapshot,
	CustomerHotelRating,
	CustomerNotification,
	CustomerWatchlistPost,
)


@admin.register(CustomerBookingSnapshot)
class CustomerBookingSnapshotAdmin(admin.ModelAdmin):
	list_display = ('snapshot_id', 'snapshot_type', 'booking_code', 'hotel_name', 'customer', 'created_at')
	list_filter = ('snapshot_type', 'payment_status', 'created_at')
	search_fields = ('snapshot_id', 'booking_code', 'hotel_name', 'room_name', 'customer_email')
	readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(CustomerNotification)
class CustomerNotificationAdmin(admin.ModelAdmin):
	list_display = ('notification_id', 'notification_type', 'title', 'is_read', 'customer', 'created_at')
	list_filter = ('notification_type', 'is_read', 'created_at')
	search_fields = ('notification_id', 'title', 'message', 'customer__email')
	readonly_fields = ('id', 'created_at', 'updated_at', 'read_at')


@admin.register(CustomerWatchlistPost)
class CustomerWatchlistPostAdmin(admin.ModelAdmin):
	list_display = ('post_id', 'hotel_name', 'room_name', 'rating', 'is_active', 'customer', 'created_at')
	list_filter = ('is_active', 'rating', 'created_at')
	search_fields = ('post_id', 'hotel_name', 'room_name', 'booking_code', 'posted_by_email')
	readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(CustomerHotelRating)
class CustomerHotelRatingAdmin(admin.ModelAdmin):
	list_display = ('rating_id', 'hotel_name', 'room_name', 'rating', 'customer', 'created_at')
	list_filter = ('source', 'rating', 'created_at')
	search_fields = ('rating_id', 'hotel_name', 'room_name', 'booking_code', 'customer_email')
	readonly_fields = ('id', 'created_at', 'updated_at')
