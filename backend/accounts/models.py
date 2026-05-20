from cloudinary.models import CloudinaryField
from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models

from core.constant import Role, Provider
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
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, BaseAuditedModel):
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, blank=True, default="", db_index=True)
    name = models.CharField(max_length=255, blank=True, default="")
    avatar = CloudinaryField("avatar", null=True)
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.CUSTOMER)

    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    objects = CustomUserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["phone"]),
        ]

    def __str__(self):
        return self.name or self.email


class UserAuthMethod(BaseAuditedModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="auth_methods")
    provider = models.CharField(max_length=32, choices=Provider.choices)
    provider_user_id = models.CharField(max_length=255)
    is_verified = models.BooleanField(default=False)
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        unique_together = (("provider", "provider_user_id"),)
        indexes = [
            models.Index(fields=["provider", "provider_user_id"]),
            models.Index(fields=["user"]),
            models.Index(fields=["provider", "is_verified"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.provider}:{self.provider_user_id}"