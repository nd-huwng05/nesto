from django.contrib import admin

from service_orders.models import ExtraService, ServiceOrder


@admin.register(ExtraService)
class ExtraServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "branch", "category", "price", "created_at")
    list_filter = ("category", "branch", "created_at")
    search_fields = ("id", "name", "description", "branch__name")
    ordering = ("-created_at",)


@admin.register(ServiceOrder)
class ServiceOrderAdmin(admin.ModelAdmin):
    list_display = ("id", "booking", "branch", "category", "status", "assigned_staff", "created_at")
    list_filter = ("status", "category", "branch", "created_at")
    search_fields = ("id", "booking__booking_code", "guest_name", "guest_phone", "room_number", "assigned_staff")
    ordering = ("-created_at",)
