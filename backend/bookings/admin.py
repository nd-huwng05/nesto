from django.contrib import admin

from .models import Booking, BookingSequence, ReviewForumPost


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
	list_display = ('booking_id', 'booking_number', 'customer', 'hotel_name', 'room_name', 'status', 'created_at')
	search_fields = ('booking_id', 'hotel_name', 'room_name', 'customer__email')
	list_filter = ('status', 'created_at')
	readonly_fields = ('booking_id', 'booking_number', 'created_at', 'updated_at')


@admin.register(BookingSequence)
class BookingSequenceAdmin(admin.ModelAdmin):
	list_display = ('key', 'last_value', 'updated_at')
	search_fields = ('key',)


@admin.register(ReviewForumPost)
class ReviewForumPostAdmin(admin.ModelAdmin):
	list_display = ('id', 'hotel_name', 'room_name', 'customer', 'created_at')
	search_fields = ('hotel_name', 'room_name', 'content', 'booking_id')
	list_filter = ('hotel_name', 'room_name')
