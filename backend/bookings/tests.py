from django.test import TestCase

from bookings.services.billing_service import BillingService
from bookings.views import BookingViewSet, CustomerBookingViewSet, ReviewForumPostViewSet


class BookingsArchitectureTests(TestCase):
    def test_viewsets_and_services_are_importable(self):
        self.assertIsNotNone(BookingViewSet)
        self.assertIsNotNone(CustomerBookingViewSet)
        self.assertIsNotNone(ReviewForumPostViewSet)
        self.assertTrue(hasattr(BillingService, "build_booking_bill"))
