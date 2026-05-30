from rest_framework.routers import DefaultRouter

from staff.views import StaffProfileViewSet

router = DefaultRouter()
router.register(r"staff-profiles", StaffProfileViewSet, basename="staff-profiles")

urlpatterns = router.urls

