from django.contrib import admin

from rooms.models import MaintenanceIssue, Room, RoomCategory


@admin.register(RoomCategory)
class RoomCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "branch", "base_price", "capacity", "created_at")
    list_filter = ("branch", "capacity", "created_at")
    search_fields = ("id", "name", "branch__name", "description")
    ordering = ("-created_at",)


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("id", "room_number", "branch", "category", "floor", "status", "created_at")
    list_filter = ("status", "branch", "category", "created_at")
    search_fields = ("id", "room_number", "branch__name", "category__name")
    ordering = ("-created_at",)


@admin.register(MaintenanceIssue)
class MaintenanceIssueAdmin(admin.ModelAdmin):
    list_display = ("id", "branch", "room_number", "issue_type", "is_resolved", "created_at")
    list_filter = ("is_resolved", "branch", "issue_type", "created_at")
    search_fields = ("id", "room_number", "issue_type", "description", "branch__name")
    ordering = ("-created_at",)

from django.contrib import admin

# Register your models here.
