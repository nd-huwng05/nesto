from django.urls import path

from .views import ReviewForumListCreateAPIView, ReviewForumToggleHeartAPIView


urlpatterns = [
	path('reviews/forum', ReviewForumListCreateAPIView.as_view(), name='review-forum-list-create'),
	path('reviews/forum/<uuid:post_id>/toggle-heart', ReviewForumToggleHeartAPIView.as_view(), name='review-forum-toggle-heart'),
]