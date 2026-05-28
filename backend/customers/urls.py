from django.urls import path

from .views import (
    CustomerBookingSnapshotDetailAPIView,
    CustomerBookingSnapshotListCreateAPIView,
    CustomerHotelRatingListCreateAPIView,
    CustomerHotelRatingStatsAPIView,
    CustomerNotificationListCreateAPIView,
    CustomerNotificationMarkAllReadAPIView,
    CustomerNotificationMarkReadAPIView,
    CustomerWatchlistPostDetailAPIView,
    CustomerWatchlistPostListCreateAPIView,
)

urlpatterns = [
    path('me/booking-snapshots', CustomerBookingSnapshotListCreateAPIView.as_view(), name='customer-booking-snapshot-list-create'),
    path('me/booking-snapshots/<str:snapshot_id>', CustomerBookingSnapshotDetailAPIView.as_view(), name='customer-booking-snapshot-detail'),

    path('me/notifications', CustomerNotificationListCreateAPIView.as_view(), name='customer-notification-list-create'),
    path('me/notifications/mark-all-read', CustomerNotificationMarkAllReadAPIView.as_view(), name='customer-notification-mark-all-read'),
    path('me/notifications/<str:notification_id>/read', CustomerNotificationMarkReadAPIView.as_view(), name='customer-notification-mark-read'),

    path('watchlist/posts', CustomerWatchlistPostListCreateAPIView.as_view(), name='customer-watchlist-post-list-create'),
    path('watchlist/posts/<str:post_id>', CustomerWatchlistPostDetailAPIView.as_view(), name='customer-watchlist-post-detail'),

    path('me/hotel-ratings', CustomerHotelRatingListCreateAPIView.as_view(), name='customer-hotel-rating-list-create'),
    path('hotels/<slug:hotel_slug>/rating-stats', CustomerHotelRatingStatsAPIView.as_view(), name='customer-hotel-rating-stats'),
]
