from rest_framework.routers import DefaultRouter

from core.views import InvoiceViewSet, ReportViewSet, TransactionViewSet

router = DefaultRouter()
router.register(r"reports", ReportViewSet, basename="reports")
router.register(r"invoices", InvoiceViewSet, basename="invoices")
router.register(r"transactions", TransactionViewSet, basename="transactions")

urlpatterns = router.urls

