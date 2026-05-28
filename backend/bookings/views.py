from datetime import date, timedelta
from uuid import UUID

from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema

from .models import Booking, BookingStatus, ReviewForumPost, build_review_scope_key
from .serializers import BookingCreateSerializer, BookingSerializer, ReviewForumPostCreateSerializer, ReviewForumPostSerializer

UNAUTHORIZED_ERROR_EXAMPLE = {'detail': 'Authentication credentials were not provided.'}
NOT_FOUND_ERROR_EXAMPLE = {'detail': 'Resource not found.'}


def _parse_bool(value):
	return str(value or '').strip().lower() in {'1', 'true', 'yes', 'on'}


def _as_date(value):
	if isinstance(value, date):
		return value
	if not value:
		return None
	text = str(value).strip()
	if not text:
		return None
	if 'T' in text:
		text = text.split('T', 1)[0]
	try:
		parts = text.split('-')
		if len(parts) == 3:
			year, month, day = [int(item) for item in parts]
			return date(year, month, day)
	except Exception:
		return None
	return None


def _booking_by_lookup(raw_value):
	text = str(raw_value or '').strip()
	if not text:
		return None
	query = Q(booking_id__iexact=text)
	try:
		uuid_value = UUID(text)
		query = query | Q(id=uuid_value)
	except Exception:
		pass
	return Booking.objects.filter(query).select_related('customer').first()


class BookingListCreateAPIView(APIView):
	permission_classes = [AllowAny]
	serializer_class = BookingSerializer

	@extend_schema(
		tags=['Bookings'],
		summary='List bookings',
		description='List bookings with optional filters by customer, status, date, and branch.',
		parameters=[
			OpenApiParameter('customer', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Customer user id'),
			OpenApiParameter('status', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Booking status filter'),
			OpenApiParameter('date', OpenApiTypes.DATE, OpenApiParameter.QUERY, description='Filter bookings active on date'),
			OpenApiParameter('branch', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Branch filter (mapped to hotel_name contains)'),
		],
		auth=[],
		responses={200: BookingSerializer(many=True)},
	)
	def get(self, request):
		queryset = Booking.objects.select_related('customer').all().order_by('-created_at')

		customer = str(request.query_params.get('customer') or '').strip()
		status_value = str(request.query_params.get('status') or '').strip().lower()
		branch = str(request.query_params.get('branch') or '').strip()
		target_date = _as_date(request.query_params.get('date'))

		if customer:
			queryset = queryset.filter(customer_id=customer)

		if status_value:
			status_alias = {
				'checked_out': BookingStatus.COMPLETED,
				'completed': BookingStatus.COMPLETED,
				'cancelled': BookingStatus.CANCELLED,
				'confirmed': BookingStatus.CONFIRMED,
				'checked_in': BookingStatus.CHECKED_IN,
				'pending': BookingStatus.PENDING,
			}
			queryset = queryset.filter(status=status_alias.get(status_value, status_value))

		if branch:
			queryset = queryset.filter(hotel_name__icontains=branch)

		if target_date:
			queryset = queryset.filter(
				Q(check_in_date__isnull=True) |
				Q(check_in_date__lte=target_date, check_out_date__gte=target_date)
			)

		serializer = BookingSerializer(queryset, many=True)
		return Response(serializer.data, status=status.HTTP_200_OK)

	@extend_schema(
		tags=['Bookings'],
		summary='Create booking',
		description='Create a booking from customer or reception payload.',
		request=BookingCreateSerializer,
		auth=[],
		responses={201: BookingSerializer, 400: OpenApiResponse(description='Invalid request payload.')},
	)
	def post(self, request):
		serializer = BookingCreateSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		payload = serializer.validated_data

		hotel_name = str(payload.get('hotel_name') or payload.get('hotelName') or payload.get('branch_id') or '').strip()
		room_name = str(payload.get('room_name') or payload.get('roomName') or payload.get('room_id') or '').strip()
		check_in = payload.get('check_in')
		if not check_in and payload.get('checkInAt'):
			check_in = payload.get('checkInAt').date()
		check_out = payload.get('check_out')
		if not check_out and check_in and payload.get('durationDays'):
			check_out = check_in + timedelta(days=int(payload.get('durationDays')))
		if not check_out and check_in:
			check_out = check_in + timedelta(days=1)

		status_value = payload.get('status') or (BookingStatus.CHECKED_IN if _parse_bool(payload.get('walkIn')) else BookingStatus.PENDING)

		booking = Booking.objects.create(
			customer=request.user if request.user and request.user.is_authenticated else None,
			hotel_name=hotel_name,
			room_name=room_name,
			check_in_date=check_in,
			check_out_date=check_out,
			status=status_value,
		)

		output = BookingSerializer(booking)
		return Response(output.data, status=status.HTTP_201_CREATED)


class BookingDetailAPIView(APIView):
	permission_classes = [AllowAny]
	serializer_class = BookingSerializer

	@extend_schema(tags=['Bookings'], summary='Get booking detail', auth=[], responses={200: BookingSerializer, 404: OpenApiResponse(description='Booking not found.')})
	def get(self, request, booking_ref):
		booking = _booking_by_lookup(booking_ref)
		if not booking:
			return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)
		return Response(BookingSerializer(booking).data, status=status.HTTP_200_OK)


class BookingStatusActionAPIView(APIView):
	permission_classes = [AllowAny]
	serializer_class = BookingSerializer
	action_status = BookingStatus.PENDING

	def post(self, request, booking_ref):
		booking = _booking_by_lookup(booking_ref)
		if not booking:
			return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

		booking.status = self.action_status
		booking.save(update_fields=['status', 'updated_at'])
		return Response(BookingSerializer(booking).data, status=status.HTTP_200_OK)


class BookingConfirmAPIView(BookingStatusActionAPIView):
	action_status = BookingStatus.CONFIRMED


class BookingCancelAPIView(BookingStatusActionAPIView):
	action_status = BookingStatus.CANCELLED


class BookingCheckInAPIView(BookingStatusActionAPIView):
	action_status = BookingStatus.CHECKED_IN


class BookingCheckOutAPIView(BookingStatusActionAPIView):
	action_status = BookingStatus.COMPLETED


class BookingUpcomingAPIView(APIView):
	permission_classes = [AllowAny]
	serializer_class = BookingSerializer

	@extend_schema(tags=['Bookings'], summary='List upcoming bookings', auth=[], responses={200: BookingSerializer(many=True)})
	def get(self, request):
		today = date.today()
		queryset = Booking.objects.filter(check_in_date__gte=today).exclude(status__in=[BookingStatus.COMPLETED, BookingStatus.CANCELLED])

		customer = str(request.query_params.get('customer') or '').strip()
		if customer:
			queryset = queryset.filter(customer_id=customer)

		return Response(BookingSerializer(queryset.order_by('check_in_date'), many=True).data, status=status.HTTP_200_OK)


class BookingTodayAPIView(APIView):
	permission_classes = [AllowAny]
	serializer_class = BookingSerializer

	def get(self, request):
		today = date.today()
		queryset = Booking.objects.filter(check_in_date__lte=today, check_out_date__gte=today)
		return Response(BookingSerializer(queryset.order_by('check_in_date'), many=True).data, status=status.HTTP_200_OK)


class BookingCalendarAPIView(APIView):
	permission_classes = [AllowAny]
	serializer_class = BookingSerializer

	def get(self, request):
		queryset = Booking.objects.all().order_by('-check_in_date')
		return Response(BookingSerializer(queryset, many=True).data, status=status.HTTP_200_OK)


class BookingAddServiceAPIView(APIView):
	permission_classes = [AllowAny]
	serializer_class = BookingSerializer

	@extend_schema(
		tags=['Bookings'],
		summary='Add service to booking (compat)',
		description='Compatibility endpoint for FE. Accepts service_id and quantity and returns acceptance payload.',
		auth=[],
		request=OpenApiTypes.OBJECT,
		responses={
			200: OpenApiResponse(
				response=OpenApiTypes.OBJECT,
				examples=[
					OpenApiExample(
						'Add service response',
						value={'booking_id': 'BK-000001', 'service_id': 'airport_shuttle', 'quantity': 1, 'detail': 'Service line accepted.'},
					),
				],
			),
			404: OpenApiResponse(description='Booking not found.'),
		},
	)

	def post(self, request, booking_ref):
		booking = _booking_by_lookup(booking_ref)
		if not booking:
			return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)
		return Response(
			{
				'booking_id': booking.booking_id,
				'service_id': request.data.get('service_id'),
				'quantity': request.data.get('quantity', 1),
				'detail': 'Service line accepted.',
			},
			status=status.HTTP_200_OK,
		)


class ReviewForumListCreateAPIView(APIView):
	permission_classes = [AllowAny]
	serializer_class = ReviewForumPostSerializer

	@extend_schema(
		tags=['Reviews'],
		summary='List review forum posts',
		description='Return review posts by hotel and room scope.',
		auth=[],
		parameters=[
			OpenApiParameter('hotel_name', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Hotel name filter'),
			OpenApiParameter('room_name', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Room name filter'),
		],
		responses={
			200: OpenApiResponse(
				response=OpenApiTypes.OBJECT,
				description='List of review forum posts.',
				examples=[
					OpenApiExample(
						'Review forum response',
						value={
							'results': [
								{
									'id': 'a53d7d8b-9ca8-49da-a2f9-30f1848e7e7f',
									'booking_id': 'BK862345',
									'hotel_name': 'Swiss Hotel',
									'room_name': 'Room 121',
									'scope_key': 'swiss-hotel|room-121',
									'content': 'Great room and service.',
									'created_at': '2026-05-28T10:00:00Z',
									'author_name': 'Customer A',
									'author_email': 'customer@nesto.vn',
									'hearts_count': 3,
									'liked_by_me': False,
									'liked_by_ids': [],
								}
							],
						},
					),
				],
			),
		},
	)

	def get(self, request):
		hotel_name = str(request.query_params.get('hotel_name') or '').strip()
		room_name = str(request.query_params.get('room_name') or '').strip()

		if not hotel_name or not room_name:
			return Response({'results': []}, status=status.HTTP_200_OK)

		scope_key = build_review_scope_key(hotel_name, room_name)
		queryset = ReviewForumPost.objects.filter(scope_key=scope_key).select_related('customer').prefetch_related('liked_by')[:100]
		serializer = ReviewForumPostSerializer(queryset, many=True, context={'request': request})
		return Response({'results': serializer.data}, status=status.HTTP_200_OK)

	@extend_schema(
		tags=['Reviews'],
		summary='Create review forum post',
		description='Create a new review forum post. Authentication is optional, but authenticated users are linked as authors.',
		request=ReviewForumPostCreateSerializer,
		auth=[],
		examples=[
			OpenApiExample(
				'Create review payload',
				value={
					'booking_id': 'BK862345',
					'hotel_name': 'Swiss Hotel',
					'room_name': 'Room 121',
					'content': 'Great room and service.',
				},
				request_only=True,
			),
		],
		responses={
			201: ReviewForumPostSerializer,
			400: OpenApiResponse(description='Validation error.'),
		},
	)
	def post(self, request):
		serializer = ReviewForumPostCreateSerializer(data=request.data, context={'request': request})
		serializer.is_valid(raise_exception=True)
		post = serializer.save()

		output = ReviewForumPostSerializer(post, context={'request': request})
		return Response(output.data, status=status.HTTP_201_CREATED)


class ReviewForumToggleHeartAPIView(APIView):
	permission_classes = [AllowAny]
	serializer_class = ReviewForumPostSerializer

	@extend_schema(
		tags=['Reviews'],
		summary='Toggle heart reaction',
		description='Toggle heart reaction for current authenticated user on a review post.',
		auth=[],
		responses={
			200: ReviewForumPostSerializer,
			401: OpenApiResponse(
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
			404: OpenApiResponse(
				description='Review post not found.',
				examples=[OpenApiExample('Not found', value={'detail': 'Review post not found.'})],
			),
		},
	)

	def post(self, request, post_id):
		post = ReviewForumPost.objects.filter(id=post_id).prefetch_related('liked_by').first()
		if not post:
			return Response({'detail': 'Review post not found.'}, status=status.HTTP_404_NOT_FOUND)

		user = request.user
		if not user or not user.is_authenticated:
			return Response({'detail': 'Please sign in to react with heart.'}, status=status.HTTP_401_UNAUTHORIZED)

		is_liked = post.liked_by.filter(id=user.id).exists()

		if is_liked:
			post.liked_by.remove(user)
		else:
			post.liked_by.add(user)

		output = ReviewForumPostSerializer(post, context={'request': request})
		return Response(output.data, status=status.HTTP_200_OK)
