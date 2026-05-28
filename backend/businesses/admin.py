from django.contrib import admin

from businesses.models import Branch, Company, Department


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "manager", "business_type", "lodging_type", "contact_email", "contact_phone", "created_at")
    list_filter = ("business_type", "lodging_type", "created_at")
    search_fields = ("id", "name", "legal_name", "tax_code", "contact_email", "contact_phone")
    ordering = ("-created_at",)


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "lodging_type", "phone", "email", "is_active", "created_at")
    list_filter = ("is_active", "lodging_type", "company", "created_at")
    search_fields = ("id", "name", "address", "phone", "email", "company__name")
    ordering = ("-created_at",)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ("id", "code", "label", "created_at")
    list_filter = ("created_at",)
    search_fields = ("id", "code", "label")
    ordering = ("-created_at",)

from django.contrib import admin

# Register your models here.
