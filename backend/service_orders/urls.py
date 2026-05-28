from rest_framework.routers import DefaultRouter

from service_orders.views import ExtraServiceViewSet, ServiceOrderViewSet

router = DefaultRouter()
router.register(r"extra-services", ExtraServiceViewSet, basename="extra-services")
router.register(r"service-orders", ServiceOrderViewSet, basename="service-orders")

urlpatterns = router.urls

