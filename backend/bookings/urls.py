from django.urls import path

from .views import (
	BookingAddServiceAPIView,
	BookingCalendarAPIView,
	BookingCancelAPIView,
	BookingCheckInAPIView,
	BookingCheckOutAPIView,
	BookingConfirmAPIView,
	BookingDetailAPIView,
	BookingListCreateAPIView,
	BookingTodayAPIView,
	BookingUpcomingAPIView,
	ReviewForumListCreateAPIView,
	ReviewForumToggleHeartAPIView,
)


urlpatterns = [
	path('bookings/bookings/', BookingListCreateAPIView.as_view(), name='booking-list-create'),
	path('bookings/bookings/<str:booking_ref>/', BookingDetailAPIView.as_view(), name='booking-detail'),
	path('bookings/bookings/<str:booking_ref>/confirm/', BookingConfirmAPIView.as_view(), name='booking-confirm-detail-action'),
	path('bookings/bookings/<str:booking_ref>/cancel/', BookingCancelAPIView.as_view(), name='booking-cancel-detail-action'),
	path('bookings/bookings/<str:booking_ref>/check_in/', BookingCheckInAPIView.as_view(), name='booking-checkin-detail-action'),
	path('bookings/bookings/<str:booking_ref>/check_out/', BookingCheckOutAPIView.as_view(), name='booking-checkout-detail-action'),
	path('bookings/bookings/<str:booking_ref>/add_service/', BookingAddServiceAPIView.as_view(), name='booking-add-service'),

	path('bookings/bookings/confirm/<str:booking_ref>/confirm/', BookingConfirmAPIView.as_view(), name='booking-confirm-legacy-action'),
	path('bookings/bookings/cancel/<str:booking_ref>/cancel/', BookingCancelAPIView.as_view(), name='booking-cancel-legacy-action'),
	path('bookings/bookings/check_in/<str:booking_ref>/check_in/', BookingCheckInAPIView.as_view(), name='booking-checkin-legacy-action'),
	path('bookings/bookings/check_out/<str:booking_ref>/check_out/', BookingCheckOutAPIView.as_view(), name='booking-checkout-legacy-action'),

	path('bookings/bookings/upcoming/', BookingUpcomingAPIView.as_view(), name='booking-upcoming'),
	path('bookings/bookings/today/', BookingTodayAPIView.as_view(), name='booking-today'),
	path('bookings/bookings/calendar/', BookingCalendarAPIView.as_view(), name='booking-calendar'),

	path('reviews/forum', ReviewForumListCreateAPIView.as_view(), name='review-forum-list-create'),
	path('reviews/forum/<uuid:post_id>/toggle-heart', ReviewForumToggleHeartAPIView.as_view(), name='review-forum-toggle-heart'),
]