from django.contrib import admin

from service_orders.models import ExtraService


@admin.register(ExtraService)
class ExtraServiceAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "branch", "category", "price", "created_at")
    list_filter = ("category", "branch", "created_at")
    search_fields = ("id", "name", "description", "branch__name")
    ordering = ("-created_at",)
