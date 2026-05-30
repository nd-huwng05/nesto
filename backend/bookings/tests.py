from unittest.mock import patch

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from bookings.models import Booking, BookingLineItem
from bookings.services.billing_service import build_booking_bill, build_final_bill
from bookings.services.booking_operations_service import BookingOperationsService
from bookings.services.line_item_workflow_service import LineItemWorkflowService
from bookings.views import BookingViewSet, CustomerBookingViewSet
from businesses.models import Branch, Company
from rooms.models import READY_ROOM_STATUSES, Room
from service_orders.models import ExtraService

User = get_user_model()


class BookingFlowSmokeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = User.objects.create_user(
            email="owner-flow@test.com",
            password="Test@1234",
            name="Owner",
            role="BUSINESS_OWNER",
        )
        cls.service_staff = User.objects.create_user(
            email="service-flow@test.com",
            password="Test@1234",
            name="Service Staff",
            role="SERVICE",
        )
        cls.company = Company.objects.create(name="Flow Hotel Co", manager=cls.owner)
        cls.branch = Branch.objects.create(
            company=cls.company,
            name="Flow Central",
            address="1 Test St",
            phone="0900000000",
            email="flow@test.com",
        )
        cls.room = Room.objects.create(
            branch=cls.branch,
            room_number="501",
            status=Room.Status.AVAILABLE,
        )
        cls.extra = ExtraService.objects.create(
            branch=cls.branch,
            name="Breakfast",
            price=100_000,
            category="RESTAURANT",
        )

    def test_ready_room_statuses_only_available(self):
        self.assertEqual(READY_ROOM_STATUSES, frozenset({Room.Status.AVAILABLE}))

    def test_billing_service_returns_snake_case(self):
        check_in = timezone.now() + timedelta(days=1)
        check_out = check_in + timedelta(hours=5)
        booking = Booking.objects.create(
            branch=self.branch,
            guest_name="Guest",
            email="guest@test.com",
            status=Booking.Status.PENDING,
            check_in_at=check_in,
            expected_check_out_at=check_out,
            hotel_name=self.branch.name,
            room_type="Standard",
            base_price=250_000,
            room_price=250_000,
            deposit_amount=50_000,
            deposit_percentage=20,
        )
        bill = build_booking_bill(booking)
        self.assertIn("room_total", bill)
        self.assertIn("services_total", bill)
        self.assertIn("total_amount", bill)
        self.assertNotIn("roomTotal", bill)

        final = build_final_bill(booking)
        self.assertIn("deposit_paid", final)
        self.assertIn("amount_due", final)

    def test_line_item_workflow_accept_complete(self):
        booking = Booking.objects.create(
            branch=self.branch,
            guest_name="Guest",
            status=Booking.Status.CHECKED_IN,
            check_in_at=timezone.now(),
            expected_check_out_at=timezone.now() + timedelta(hours=4),
            hotel_name=self.branch.name,
            room_type="Standard",
        )
        line = BookingLineItem.objects.create(
            booking=booking,
            branch=self.branch,
            extra_service=self.extra,
            summary=self.extra.name,
            amount=self.extra.price,
            category=self.extra.category,
            status=BookingLineItem.Status.PENDING,
            room_number="501",
            guest_name="Guest",
        )

        accept = LineItemWorkflowService.accept(line, actor=self.service_staff)
        self.assertTrue(accept.ok)
        line.refresh_from_db()
        self.assertEqual(line.status, BookingLineItem.Status.CONFIRMED)

        start = LineItemWorkflowService.start(line)
        self.assertTrue(start.ok)
        line.refresh_from_db()
        self.assertEqual(line.status, BookingLineItem.Status.IN_PROGRESS)

        complete = LineItemWorkflowService.complete(line)
        self.assertTrue(complete.ok)
        line.refresh_from_db()
        self.assertEqual(line.status, BookingLineItem.Status.COMPLETED)

    @patch("bookings.services.booking_operations_service.emit_booking_live_bill")
    @patch("bookings.services.booking_operations_service.emit_room_status")
    def test_reception_switch_room(self, _mock_room_status, _mock_live_bill):
        room_b = Room.objects.create(
            branch=self.branch,
            room_number="502",
            status=Room.Status.AVAILABLE,
        )
        booking = Booking.objects.create(
            branch=self.branch,
            room=self.room,
            guest_name="Guest",
            status=Booking.Status.CHECKED_IN,
            check_in_at=timezone.now(),
            expected_check_out_at=timezone.now() + timedelta(hours=4),
            hotel_name=self.branch.name,
            room_type="Standard",
            original_room_number=self.room.room_number,
        )
        self.room.status = Room.Status.OCCUPIED
        self.room.save(update_fields=["status"])

        result = BookingOperationsService.switch_room(
            booking,
            new_room_id=str(room_b.id),
            note="Guest request",
            actor=self.owner,
        )
        self.assertTrue(result.ok)
        booking.refresh_from_db()
        self.assertEqual(booking.room_id, room_b.id)

    def test_viewsets_use_list_serializer_for_list_action(self):
        view = BookingViewSet()
        view.action = "list"
        self.assertEqual(view.get_serializer_class().__name__, "BookingListSerializer")

        customer_view = CustomerBookingViewSet()
        customer_view.action = "list"
        self.assertEqual(customer_view.get_serializer_class().__name__, "BookingListSerializer")

    def test_service_tasks_api_requires_auth(self):
        client = APIClient()
        response = client.get("/api/v1/operations/service-tasks/")
        self.assertIn(response.status_code, {401, 403})
