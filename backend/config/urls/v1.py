from django.urls import path, include
from drf_spectacular.views import SpectacularSwaggerView, SpectacularRedocView, SpectacularAPIView
from rooms.search_views import SearchSuggestionsView

urlpatterns = [
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='redoc'), name='redoc'),
    path('accounts/', include('accounts.urls')),
    path('businesses/', include('businesses.urls')),
    path('businesses/', include('staff.urls')),
    path('operations/', include('rooms.urls')),
    path('operations/', include('bookings.urls')),
    path('operations/', include('service_orders.urls')),
    path('billing/', include('core.billing_urls')),
    path('search/suggestions/', SearchSuggestionsView.as_view()),
]
