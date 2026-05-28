from rest_framework.routers import DefaultRouter

from staff.views import StaffProfileViewSet

router = DefaultRouter()
router.register(r"staff-profiles", StaffProfileViewSet, basename="staff-profiles")
router.register(r"staff", StaffProfileViewSet, basename="staff")

urlpatterns = router.urls

