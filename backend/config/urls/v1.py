from django.urls import path, include
from drf_spectacular.views import SpectacularSwaggerView, SpectacularRedocView, SpectacularAPIView
from rooms.views.suggestion_views import SearchSuggestionsView
from core.urls import billing_urlpatterns, media_urlpatterns

urlpatterns = [
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('accounts/', include('accounts.urls')),
    path('businesses/', include('businesses.urls')),
    path('businesses/', include('staff.urls')),
    path('operations/', include('rooms.urls')),
    path('operations/', include('bookings.urls')),
    path('operations/', include('service_orders.urls')),
    path('billing/', include(billing_urlpatterns)),
    path('media/', include(media_urlpatterns)),
    path('payments/', include('payments.urls')),
    path('search/suggestions/', SearchSuggestionsView.as_view()),
]
