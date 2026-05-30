from django.contrib import admin

from bookings.models import Booking, ReviewForumPost


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ("id", "booking_code", "branch", "room", "guest_name", "phone", "status", "created_at")
    list_filter = ("status", "walk_in", "branch", "created_at")
    search_fields = ("id", "booking_code", "guest_name", "email", "phone", "room__room_number", "branch__name")
    ordering = ("-created_at",)


@admin.register(ReviewForumPost)
class ReviewForumPostAdmin(admin.ModelAdmin):
    list_display = ("id", "hotel_name", "room_name", "rating", "customer", "created_at")
    search_fields = ("hotel_name", "room_name", "content", "booking_id", "customer__email")
    list_filter = ("hotel_name", "room_name", "rating")
    ordering = ("-created_at",)
