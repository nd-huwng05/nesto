"""Core API URL routes — media uploads and billing."""
from django.urls import path
from rest_framework.routers import DefaultRouter

from core.views import (
    BillingInvoiceViewSet,
    BillingReportViewSet,
    BillingTransactionViewSet,
    CloudinaryImageUploadView,
)

media_urlpatterns = [
    path("cloudinary-upload/", CloudinaryImageUploadView.as_view(), name="cloudinary-upload"),
]

_billing_router = DefaultRouter()
_billing_router.register(r"transactions", BillingTransactionViewSet, basename="billing-transactions")
_billing_router.register(r"invoices", BillingInvoiceViewSet, basename="billing-invoices")
_billing_router.register(r"reports", BillingReportViewSet, basename="billing-reports")
billing_urlpatterns = _billing_router.urls
