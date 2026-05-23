"""
Main URL configuration for API v1.
Includes all module routes with proper RESTful structure.
"""
from django.urls import path, include
from drf_spectacular.views import SpectacularSwaggerView, SpectacularRedocView, SpectacularAPIView

urlpatterns = [
    # API Documentation
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='redoc'), name='redoc'),
    
    # Accounts module (auth & users)
    path('accounts/', include('accounts.urls')),
    
    # Business endpoints
    path('businesses/', include('businesses.urls')),
    
    # Branch endpoints
    path('branches/', include('businesses.urls_branch')),
    
    # Room Types endpoints
    path('room-types/', include('rooms.urls')),
    
    # Physical Rooms endpoints
    path('rooms/', include('rooms.urls_room')),
    
    # Booking endpoints (reception)
    path('reception/', include('reception.urls')),
    
    # Services endpoints
    path('services/', include('services.urls')),
    
    # Payment endpoints
    path('payments/', include('payments.urls')),
    
    # Staff endpoints
    path('staff/', include('staff.urls')),
    
    # Report endpoints
    path('reports/', include('reports.urls')),
    
    # Reference data endpoints
    path('reference/', include('core.urls')),
]
