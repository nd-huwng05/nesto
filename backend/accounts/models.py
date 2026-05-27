from django.db import models
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin, Group

from core.models import BaseAuditedModel


class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", Role.SUPER_ADMIN)
        return self._create_user(email, password, **extra_fields)


class Role(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
    CUSTOMER = "CUSTOMER", "Customer"
    BUSINESS_OWNER = "BUSINESS_OWNER", "Business_Owner"
    STAFF = "STAFF", "Staff"


class User(AbstractBaseUser, PermissionsMixin, BaseAuditedModel):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, blank=True, default="", db_index=True)
    name = models.CharField(max_length=255, blank=True, default="")
    avatar = models.URLField(max_length=500, blank=True, null=True)
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.CUSTOMER)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    objects = CustomUserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["phone"]),
        ]

    def __str__(self):
        return self.name or self.email

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            if self.role == Role.SUPER_ADMIN:
                admin_group, _ = Group.objects.get_or_create(name='Admin')
                self.groups.add(admin_group)
            elif self.role == Role.BUSINESS_OWNER:
                business_group, _ = Group.objects.get_or_create(name='Business')
                self.groups.add(business_group)
            elif self.role == Role.STAFF:
                staff_group, _ = Group.objects.get_or_create(name='Staff')
                self.groups.add(staff_group)


class Provider(models.TextChoices):
    EMAIL = "EMAIL", "Email"
    PHONE = "PHONE", "Phone"
    GOOGLE = "GOOGLE", "Google"


class UserAuthMethod(BaseAuditedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="auth_methods")
    provider = models.CharField(max_length=32, choices=Provider.choices)
    provider_user_id = models.CharField(max_length=255)
    is_verified = models.BooleanField(default=False)
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = "user_auth_methods"
        unique_together = (("provider", "provider_user_id"),)
        indexes = [
            models.Index(fields=["provider", "provider_user_id"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.provider}"
