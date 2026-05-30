from rest_framework.routers import DefaultRouter

from service_orders.views import ExtraServiceViewSet

router = DefaultRouter()
router.register(r"extra-services", ExtraServiceViewSet, basename="extra-services")

urlpatterns = router.urls
