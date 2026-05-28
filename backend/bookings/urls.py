from rest_framework.routers import DefaultRouter

from bookings.views import BookingViewSet, CustomerBookingViewSet, ReviewForumPostViewSet

router = DefaultRouter()
router.register(r"bookings", BookingViewSet, basename="bookings")
router.register(r"customer-bookings", CustomerBookingViewSet, basename="customer-bookings")
router.register(r"reviews", ReviewForumPostViewSet, basename="reviews")

urlpatterns = router.urls

