from django.urls import path
from rest_framework.routers import DefaultRouter

from accounts.views import AuthenticationViewSet, UserNotificationViewSet, UserViewSet

router = DefaultRouter()
router.register(r'auth', AuthenticationViewSet, basename='auth')
router.register(r'users', UserViewSet, basename='user')
router.register(r'notifications', UserNotificationViewSet, basename='notification')

urlpatterns = router.urls
