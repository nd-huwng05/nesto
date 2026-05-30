from rest_framework.routers import DefaultRouter

from businesses.views import (
    BranchCustomerViewSet,
    BranchViewSet,
    BusinessAnalyticsViewSet,
    BusinessMetadataViewSet,
    CompanyViewSet,
    DepartmentViewSet,
)

router = DefaultRouter()
router.register(r"companies", CompanyViewSet, basename="companies")
router.register(r"branches", BranchViewSet, basename="branches")
router.register(r"branch-customers", BranchCustomerViewSet, basename="branch-customers")
router.register(r"departments", DepartmentViewSet, basename="departments")
router.register(r"metadata", BusinessMetadataViewSet, basename="business-metadata")
router.register(r"analytics", BusinessAnalyticsViewSet, basename="business-analytics")

urlpatterns = router.urls

