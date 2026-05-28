from django.db.models import Q
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Hotel
from .serializers import HotelSerializer


class HotelListAPIView(APIView):
	permission_classes = [AllowAny]

	def get(self, request):
		queryset = Hotel.objects.filter(is_active=True).order_by('title')

		tab = str(request.query_params.get('tab') or '').strip().lower()
		category = str(request.query_params.get('category') or '').strip()
		search = str(request.query_params.get('search') or '').strip()

		if tab == 'family':
			queryset = queryset.filter(category__iexact='Family')
		elif tab == 'business':
			queryset = queryset.filter(category__iexact='Business')
		elif tab == 'featured':
			queryset = queryset.filter(rating__gte=4.7)
		elif tab == 'suite':
			queryset = queryset.filter(title__icontains='suite')

		if category:
			queryset = queryset.filter(category__iexact=category)

		if search:
			queryset = queryset.filter(Q(title__icontains=search) | Q(city__icontains=search))

		serializer = HotelSerializer(queryset, many=True)
		return Response({'results': serializer.data})
