"""
Main URL configuration for API v1.
Includes all module routes with proper RESTful structure.
"""
from django.urls import path, include
from drf_spectacular.views import SpectacularSwaggerView, SpectacularRedocView, SpectacularAPIView
from config.urls.customer_compat import (
    BranchDetailAPIView,
    BranchListAPIView,
    ExtraServiceListAPIView,
    RoomAvailabilityAPIView,
    RoomTypeListAPIView,
    ServiceCategoryListAPIView,
)

urlpatterns = [
    # API Documentation
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='redoc'), name='redoc'),
    path('accounts/', include('accounts.urls')),
    path('customers/', include('customers.urls')),
    path('business/', include('businesses.urls')),
    path('business/branches/', BranchListAPIView.as_view(), name='compat-branch-list'),
    path('business/branches/<str:branch_id>/', BranchDetailAPIView.as_view(), name='compat-branch-detail'),
    path('rooms/room-types/', RoomTypeListAPIView.as_view(), name='compat-room-type-list'),
    path('rooms/rooms/availability/', RoomAvailabilityAPIView.as_view(), name='compat-room-availability'),
    path('services/extra-services/', ExtraServiceListAPIView.as_view(), name='compat-extra-service-list'),
    path('services/service-categories/', ServiceCategoryListAPIView.as_view(), name='compat-service-category-list'),
]
