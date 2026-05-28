from rest_framework.routers import DefaultRouter

from rooms.views import AISearchViewSet, BranchRoomTypesAvailabilityViewSet, BranchThemeViewSet, CustomerCatalogViewSet, FavoriteBranchViewSet, HousekeepingTaskViewSet, MaintenanceIssueViewSet, RoomCategoryViewSet, RoomThemeViewSet, RoomViewSet

router = DefaultRouter()
router.register(r"room-types", RoomCategoryViewSet, basename="room-types")
router.register(r"rooms", RoomViewSet, basename="rooms")
router.register(r"maintenance-rooms", MaintenanceIssueViewSet, basename="maintenance-rooms")
router.register(r"housekeeping-tasks", HousekeepingTaskViewSet, basename="housekeeping-tasks")
router.register(r"customer-catalog", CustomerCatalogViewSet, basename="customer-catalog")
router.register(r"ai-search", AISearchViewSet, basename="ai-search")
router.register(r"favorites", FavoriteBranchViewSet, basename="favorites")
router.register(r"branch-room-types", BranchRoomTypesAvailabilityViewSet, basename="branch-room-types")
router.register(r"themes", RoomThemeViewSet, basename="themes")
router.register(r"branch-themes", BranchThemeViewSet, basename="branch-themes")

urlpatterns = router.urls

