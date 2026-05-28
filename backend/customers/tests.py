from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import CustomerNotification, CustomerWatchlistPost


class CustomerApiTests(APITestCase):
	def setUp(self):
		user_model = get_user_model()
		self.user = user_model.objects.create_user(
			email='customer-test@nesto.vn',
			password='StrongPass123!'
		)
		self.client.force_authenticate(self.user)

	def test_create_and_list_booking_snapshots(self):
		url = reverse('customer-booking-snapshot-list-create')
		payload = {
			'snapshot_id': 'SNAP_001',
			'snapshot_type': 'upcoming',
			'booking_code': 'BK001',
			'hotel_name': 'Nesto Hotel',
			'room_name': 'Deluxe Room',
			'check_in_date': '2025-01-01',
			'check_out_date': '2025-01-02',
			'total_amount': '100.00',
			'paid_amount': '50.00',
			'remaining_amount': '50.00',
			'payment_status': 'partial',
		}

		create_response = self.client.post(url, payload, format='json')
		self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

		list_response = self.client.get(url)
		self.assertEqual(list_response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(list_response.data['results']), 1)
		self.assertEqual(list_response.data['results'][0]['snapshot_id'], 'SNAP_001')

	def test_booking_snapshot_put_upsert_with_fe_alias_payload(self):
		url = reverse('customer-booking-snapshot-detail', kwargs={'snapshot_id': 'SNAP_FE_001'})
		payload = {
			'bookingId': '#BK862345',
			'snapshot_type': 'upcoming',
			'hotelName': 'Swiss Hotel',
			'roomName': 'Room 121',
			'checkIn': '01/06/2026',
			'checkOut': '02/06/2026',
			'checkInDateIso': '2026-06-01',
			'checkOutDateIso': '2026-06-02',
			'paymentStatus': 'pending',
			'total_amount': '120.00',
			'paid_amount': '0.00',
			'remaining_amount': '120.00',
		}

		response = self.client.put(url, payload, format='json')

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['snapshot_id'], 'SNAP_FE_001')
		self.assertEqual(response.data['booking_code'], '#BK862345')
		self.assertEqual(response.data['hotel_name'], 'Swiss Hotel')
		self.assertEqual(response.data['room_name'], 'Room 121')
		self.assertEqual(response.data['bookingId'], '#BK862345')
		self.assertEqual(response.data['hotelName'], 'Swiss Hotel')
		self.assertEqual(response.data['roomName'], 'Room 121')

	def test_mark_notification_as_read(self):
		notification = CustomerNotification.objects.create(
			customer=self.user,
			notification_id='NOTI_001',
			notification_type='booking',
			title='Booking Updated',
			message='Your booking changed',
			is_read=False,
		)

		url = reverse('customer-notification-mark-read', kwargs={'notification_id': notification.notification_id})
		response = self.client.post(url, {}, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		notification.refresh_from_db()
		self.assertTrue(notification.is_read)
		self.assertIsNotNone(notification.read_at)

	def test_create_notification_with_fe_alias_payload(self):
		url = reverse('customer-notification-list-create')
		payload = {
			'id': 'notif-fe-001',
			'title': 'Booking payment confirmed',
			'message': 'Your payment was successful.',
			'type': 'booking-payment',
			'read': False,
		}

		response = self.client.post(url, payload, format='json')
		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['notification_id'], 'notif-fe-001')
		self.assertEqual(response.data['type'], 'booking-payment')
		self.assertFalse(response.data['read'])

	def test_mark_all_notifications_as_read(self):
		CustomerNotification.objects.create(
			customer=self.user,
			notification_id='NOTI_002',
			notification_type='general',
			title='Welcome',
			message='Hello',
			is_read=False,
		)
		CustomerNotification.objects.create(
			customer=self.user,
			notification_id='NOTI_003',
			notification_type='general',
			title='Promo',
			message='Promo details',
			is_read=False,
		)

		url = reverse('customer-notification-mark-all-read')
		response = self.client.post(url, {}, format='json')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['updated_count'], 2)
		self.assertEqual(
			CustomerNotification.objects.filter(customer=self.user, is_read=True).count(),
			2,
		)

	def test_watchlist_soft_delete(self):
		post = CustomerWatchlistPost.objects.create(
			customer=self.user,
			post_id='POST_001',
			hotel_name='Nesto Hotel',
			room_name='Suite',
			rating=5,
			is_active=True,
		)

		url = reverse('customer-watchlist-post-detail', kwargs={'post_id': post.post_id})
		response = self.client.delete(url)
		self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

		post.refresh_from_db()
		self.assertFalse(post.is_active)

	def test_rating_stats_endpoint(self):
		ratings_url = reverse('customer-hotel-rating-list-create')
		payloads = [
			{
				'rating_id': 'RATING_001',
				'booking_code': 'BK001',
				'hotel_name': 'Nesto Hotel',
				'room_name': 'Deluxe',
				'rating': 4,
			},
			{
				'rating_id': 'RATING_002',
				'booking_code': 'BK002',
				'hotel_name': 'Nesto Hotel',
				'room_name': 'Deluxe',
				'rating': 5,
			},
		]

		for payload in payloads:
			response = self.client.post(ratings_url, payload, format='json')
			self.assertEqual(response.status_code, status.HTTP_201_CREATED)

		self.client.force_authenticate(user=None)
		stats_url = reverse('customer-hotel-rating-stats', kwargs={'hotel_slug': 'nesto-hotel'})
		stats_response = self.client.get(stats_url, {'hotel_name': 'Nesto Hotel'})

		self.assertEqual(stats_response.status_code, status.HTTP_200_OK)
		self.assertEqual(stats_response.data['review_count'], 2)
		self.assertEqual(float(stats_response.data['avg_rating']), 4.5)


