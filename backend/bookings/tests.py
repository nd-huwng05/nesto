from django.test import TestCase
from django.contrib.auth import get_user_model

from .models import BookingSequence
from .service import create_booking, next_booking_identity


class BookingIdentityTests(TestCase):
	def test_next_booking_identity_is_incremental(self):
		number1, code1 = next_booking_identity()
		number2, code2 = next_booking_identity()

		self.assertEqual(number1, 1)
		self.assertEqual(code1, 'BK-000001')
		self.assertEqual(number2, 2)
		self.assertEqual(code2, 'BK-000002')

		sequence = BookingSequence.objects.get(key='booking_id')
		self.assertEqual(sequence.last_value, 2)

	def test_create_booking_sets_generated_id(self):
		user = get_user_model().objects.create_user(email='customer@example.com', password='123456Aa!')

		booking = create_booking(
			customer=user,
			hotel_name='Sun Suites',
			room_name='VIP Room',
		)

		self.assertEqual(booking.booking_number, 1)
		self.assertEqual(booking.booking_id, 'BK-000001')
