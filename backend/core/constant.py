from django.db import models

class Role(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
    ADMIN = "ADMIN", "Admin"
    BUSINESS = "BUSINESS", "Business"
    STAFF = "STAFF", "Staff"
    CUSTOMER = "CUSTOMER", "Customer"

DEFAULT_ROLE = Role.CUSTOMER

class Provider(models.TextChoices):
    EMAIL = "EMAIL", "Email"
    PHONE = "PHONE", "Phone"
    GOOGLE = "GOOGLE", "Google"

OTP_LENGTH = 6
OTP_TTL_SECONDS = 300
OTP_MAX_ATTEMPTS = 5
OTP_COOLDOWN_SECONDS = 60

class Message:
    FieldRequest = 'This field is required.'