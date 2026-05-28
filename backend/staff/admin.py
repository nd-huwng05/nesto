from django.contrib import admin

from staff.models import StaffProfile


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "branch", "job_role", "department", "created_at")
    list_filter = ("job_role", "department", "branch", "created_at")
    search_fields = ("id", "user__email", "user__name", "user__phone", "branch__name")
    ordering = ("-created_at",)

from django.contrib import admin

# Register your models here.
