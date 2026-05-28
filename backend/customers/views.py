from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from django.db.models import Avg, Count
from django.utils import timezone
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiResponse, OpenApiTypes, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
	CustomerBookingSnapshot,
	CustomerHotelRating,
	CustomerNotification,
	CustomerWatchlistPost,
)
from .serializers import (
	CustomerBookingSnapshotSerializer,
	CustomerBookingSnapshotListResponseSerializer,
	CustomerBookingSnapshotInputSerializer,
	CustomerErrorResponseSerializer,
	CustomerHotelRatingSerializer,
	CustomerHotelRatingInputSerializer,
	CustomerHotelRatingListResponseSerializer,
	CustomerHotelRatingStatsResponseSerializer,
	CustomerMarkAllReadResponseSerializer,
	CustomerNotificationSerializer,
	CustomerNotificationInputSerializer,
	CustomerNotificationListResponseSerializer,
	CustomerValidationErrorResponseSerializer,
	CustomerWatchlistPostSerializer,
	CustomerWatchlistPostPublicSerializer,
	CustomerWatchlistPostInputSerializer,
	CustomerWatchlistPostPublicListResponseSerializer,
)


BOOKING_SNAPSHOT_REQUEST_EXAMPLE = {
	'snapshot_id': 'SNAP_20260528_001',
	'booking_code': 'BK862345',
	'snapshot_type': 'upcoming',
	'hotel_name': 'Nesto Ho Chi Minh Center',
	'room_name': 'Standard Room 01',
	'check_in_date': '2026-06-01',
	'check_out_date': '2026-06-02',
	'payment_status': 'partial',
	'total_amount': '120.00',
	'paid_amount': '50.00',
	'remaining_amount': '70.00',
	'source': 'mobile-app',
}

NOTIFICATION_REQUEST_EXAMPLE = {
	'notification_id': 'NOTI_20260528_001',
	'title': 'Booking payment confirmed',
	'message': 'Your payment for BK862345 has been confirmed.',
	'notification_type': 'booking-payment',
	'meta': {'booking_code': 'BK862345'},
	'is_read': False,
}

WATCHLIST_REQUEST_EXAMPLE = {
	'post_id': 'WATCH_20260528_001',
	'booking_code': 'BK862345',
	'hotel_name': 'Nesto Ho Chi Minh Center',
	'room_name': 'Standard Room 01',
	'description': 'Beautiful city view and clean room.',
	'image_url': 'https://cdn.example.com/reviews/room-standard-01.jpg',
	'rating': 5,
}

RATING_REQUEST_EXAMPLE = {
	'rating_id': 'RATE_20260528_001',
	'booking_code': 'BK862345',
	'hotel_name': 'Nesto Ho Chi Minh Center',
	'room_name': 'Standard Room 01',
	'rating': '4.5',
	'source': 'checkout',
}

VALIDATION_ERROR_EXAMPLE = {
	'errors': {
		'snapshot_id': ['snapshot_id already exists.'],
	}
}

UNAUTHORIZED_ERROR_EXAMPLE = {'detail': 'Authentication credentials were not provided.'}
NOT_FOUND_ERROR_EXAMPLE = {'detail': 'Resource not found.'}


def _validation_error_response(serializer):
	return Response({'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


def _to_mutable_payload(data):
	if hasattr(data, 'dict'):
		try:
			return data.dict()
		except Exception:
			pass
	return dict(data)


class CustomerBookingSnapshotListCreateAPIView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		tags=['Customers'],
		summary='List my booking snapshots',
		description='Return booking snapshots of the authenticated customer, optionally filtered by snapshot type and booking code.',
		parameters=[
			OpenApiParameter('snapshot_type', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by type', enum=['upcoming', 'history', 'payment']),
			OpenApiParameter('booking_code', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by booking code'),
		],
		responses={
			200: OpenApiResponse(
				response=CustomerBookingSnapshotListResponseSerializer,
				examples=[
					OpenApiExample(
						'Booking snapshots response',
						value={'results': [BOOKING_SNAPSHOT_REQUEST_EXAMPLE]},
					),
				],
			),
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
		},
	)
	def get(self, request):
		queryset = CustomerBookingSnapshot.objects.filter(customer=request.user)

		snapshot_type = str(request.query_params.get('snapshot_type') or '').strip()
		booking_code = str(request.query_params.get('booking_code') or '').strip()

		if snapshot_type:
			queryset = queryset.filter(snapshot_type=snapshot_type)
		if booking_code:
			queryset = queryset.filter(booking_code=booking_code)

		serializer = CustomerBookingSnapshotSerializer(queryset.order_by('-created_at'), many=True)
		return Response({'results': serializer.data}, status=status.HTTP_200_OK)

	@extend_schema(
		tags=['Customers'],
		summary='Create a booking snapshot',
		description='Create a new booking snapshot for the authenticated customer.',
		request=CustomerBookingSnapshotInputSerializer,
		examples=[
			OpenApiExample('Create booking snapshot payload', value=BOOKING_SNAPSHOT_REQUEST_EXAMPLE, request_only=True),
		],
		responses={
			201: CustomerBookingSnapshotSerializer,
			400: OpenApiResponse(
				response=CustomerValidationErrorResponseSerializer,
				description='Invalid request payload.',
				examples=[OpenApiExample('Validation error', value=VALIDATION_ERROR_EXAMPLE)],
			),
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
		},
	)
	def post(self, request):
		payload = _to_mutable_payload(request.data)
		if not payload.get('snapshot_id') and not payload.get('id'):
			payload['snapshot_id'] = f"SNAP_{uuid4().hex[:12].upper()}"

		serializer = CustomerBookingSnapshotSerializer(data=payload)
		if not serializer.is_valid():
			return _validation_error_response(serializer)
		payload = serializer.validated_data
		payload.setdefault('customer_name', str(getattr(request.user, 'name', '') or '').strip())
		payload.setdefault('customer_email', str(getattr(request.user, 'email', '') or '').strip().lower())
		payload.setdefault('customer_phone', str(getattr(request.user, 'phone', '') or '').strip())
		snapshot = CustomerBookingSnapshot.objects.create(customer=request.user, **payload)
		output = CustomerBookingSnapshotSerializer(snapshot)
		return Response(output.data, status=status.HTTP_201_CREATED)


class CustomerBookingSnapshotDetailAPIView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		tags=['Customers'],
		summary='Replace a booking snapshot',
		description='Fully update an existing booking snapshot by snapshot_id for the authenticated customer.',
		request=CustomerBookingSnapshotInputSerializer,
		examples=[
			OpenApiExample('Replace booking snapshot payload', value=BOOKING_SNAPSHOT_REQUEST_EXAMPLE, request_only=True),
		],
		responses={
			200: CustomerBookingSnapshotSerializer,
			400: OpenApiResponse(
				response=CustomerValidationErrorResponseSerializer,
				description='Invalid request payload.',
				examples=[OpenApiExample('Validation error', value=VALIDATION_ERROR_EXAMPLE)],
			),
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
			404: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Snapshot not found.',
				examples=[OpenApiExample('Not found', value={'detail': 'Snapshot not found.'})],
			),
		},
	)
	def put(self, request, snapshot_id):
		snapshot = CustomerBookingSnapshot.objects.filter(snapshot_id=snapshot_id, customer=request.user).first()
		if not snapshot:
			create_payload = _to_mutable_payload(request.data)
			if not create_payload.get('snapshot_id'):
				create_payload['snapshot_id'] = snapshot_id
			create_serializer = CustomerBookingSnapshotSerializer(data=create_payload)
			if not create_serializer.is_valid():
				return _validation_error_response(create_serializer)
			create_data = create_serializer.validated_data
			create_data.setdefault('customer_name', str(getattr(request.user, 'name', '') or '').strip())
			create_data.setdefault('customer_email', str(getattr(request.user, 'email', '') or '').strip().lower())
			create_data.setdefault('customer_phone', str(getattr(request.user, 'phone', '') or '').strip())
			created_snapshot = CustomerBookingSnapshot.objects.create(customer=request.user, **create_data)
			output = CustomerBookingSnapshotSerializer(created_snapshot)
			return Response(output.data, status=status.HTTP_201_CREATED)

		serializer = CustomerBookingSnapshotSerializer(snapshot, data=request.data)
		if not serializer.is_valid():
			return _validation_error_response(serializer)
		serializer.save(customer=request.user)
		return Response(serializer.data, status=status.HTTP_200_OK)

	@extend_schema(
		tags=['Customers'],
		summary='Partially update a booking snapshot',
		description='Partially update an existing booking snapshot by snapshot_id for the authenticated customer.',
		request=CustomerBookingSnapshotInputSerializer,
		examples=[
			OpenApiExample('Partial booking snapshot payload', value={'payment_status': 'paid', 'paid_amount': '120.00', 'remaining_amount': '0.00'}, request_only=True),
		],
		responses={
			200: CustomerBookingSnapshotSerializer,
			400: OpenApiResponse(
				response=CustomerValidationErrorResponseSerializer,
				description='Invalid request payload.',
				examples=[OpenApiExample('Validation error', value=VALIDATION_ERROR_EXAMPLE)],
			),
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
			404: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Snapshot not found.',
				examples=[OpenApiExample('Not found', value={'detail': 'Snapshot not found.'})],
			),
		},
	)
	def patch(self, request, snapshot_id):
		snapshot = CustomerBookingSnapshot.objects.filter(snapshot_id=snapshot_id, customer=request.user).first()
		if not snapshot:
			return Response({'detail': 'Snapshot not found.'}, status=status.HTTP_404_NOT_FOUND)

		serializer = CustomerBookingSnapshotSerializer(snapshot, data=request.data, partial=True)
		if not serializer.is_valid():
			return _validation_error_response(serializer)
		serializer.save(customer=request.user)
		return Response(serializer.data, status=status.HTTP_200_OK)


class CustomerNotificationListCreateAPIView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		tags=['Customers'],
		summary='List my notifications',
		description='Return notifications of the authenticated customer, with optional filters for read status and type.',
		parameters=[
			OpenApiParameter('is_read', OpenApiTypes.BOOL, OpenApiParameter.QUERY, description='Filter by read status'),
			OpenApiParameter('type', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by notification type'),
		],
		responses={
			200: OpenApiResponse(
				response=CustomerNotificationListResponseSerializer,
				examples=[
					OpenApiExample('Notifications response', value={'results': [NOTIFICATION_REQUEST_EXAMPLE]}),
				],
			),
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
		},
	)
	def get(self, request):
		queryset = CustomerNotification.objects.filter(customer=request.user)

		is_read = request.query_params.get('is_read')
		notification_type = str(request.query_params.get('type') or '').strip()

		if is_read is not None:
			normalized = str(is_read).strip().lower()
			queryset = queryset.filter(is_read=normalized in {'1', 'true', 'yes', 'on'})

		if notification_type:
			queryset = queryset.filter(notification_type=notification_type)

		serializer = CustomerNotificationSerializer(queryset.order_by('-created_at'), many=True)
		return Response({'results': serializer.data}, status=status.HTTP_200_OK)

	@extend_schema(
		tags=['Customers'],
		summary='Create a notification',
		description='Create a notification for the authenticated customer.',
		request=CustomerNotificationInputSerializer,
		examples=[
			OpenApiExample('Create notification payload', value=NOTIFICATION_REQUEST_EXAMPLE, request_only=True),
		],
		responses={
			201: CustomerNotificationSerializer,
			400: OpenApiResponse(
			response=CustomerValidationErrorResponseSerializer,
			description='Invalid request payload.',
			examples=[OpenApiExample('Validation error', value={'errors': {'title': ['title is required.']}})],
			),
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
		},
	)
	def post(self, request):
		payload = _to_mutable_payload(request.data)
		if not payload.get('notification_id') and not payload.get('id'):
			payload['notification_id'] = f"NOTI_{uuid4().hex[:12].upper()}"

		serializer = CustomerNotificationSerializer(data=payload)
		if not serializer.is_valid():
			return _validation_error_response(serializer)
		payload = serializer.validated_data
		if payload.get('is_read'):
			payload['read_at'] = timezone.now()
		notification = CustomerNotification.objects.create(customer=request.user, **payload)
		output = CustomerNotificationSerializer(notification)
		return Response(output.data, status=status.HTTP_201_CREATED)


class CustomerNotificationMarkAllReadAPIView(APIView):
	permission_classes = [IsAuthenticated]
	serializer_class = CustomerMarkAllReadResponseSerializer

	@extend_schema(
		tags=['Customers'],
		summary='Mark all notifications as read',
		description='Mark all unread notifications of the authenticated customer as read.',
		examples=[
			OpenApiExample('Mark all as read response', value={'updated_count': 3}, response_only=True),
		],
		responses={
			200: CustomerMarkAllReadResponseSerializer,
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
		},
	)
	def post(self, request):
		now = timezone.now()
		updated = CustomerNotification.objects.filter(customer=request.user, is_read=False).update(
			is_read=True,
			read_at=now,
		)
		return Response({'updated_count': updated}, status=status.HTTP_200_OK)


class CustomerNotificationMarkReadAPIView(APIView):
	permission_classes = [IsAuthenticated]
	serializer_class = CustomerNotificationSerializer

	@extend_schema(
		tags=['Customers'],
		summary='Mark one notification as read',
		description='Mark one notification as read by notification_id for the authenticated customer.',
		responses={
			200: CustomerNotificationSerializer,
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
			404: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Notification not found.',
				examples=[OpenApiExample('Not found', value={'detail': 'Notification not found.'})],
			),
		},
	)
	def post(self, request, notification_id):
		item = CustomerNotification.objects.filter(
			customer=request.user,
			notification_id=notification_id,
		).first()
		if not item:
			return Response({'detail': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)

		if not item.is_read:
			item.is_read = True
			item.read_at = timezone.now()
			item.save(update_fields=['is_read', 'read_at', 'updated_at'])

		serializer = CustomerNotificationSerializer(item)
		return Response(serializer.data, status=status.HTTP_200_OK)


class CustomerWatchlistPostListCreateAPIView(APIView):
	permission_classes = [AllowAny]

	def get_permissions(self):
		if self.request.method == 'POST':
			return [IsAuthenticated()]
		return [AllowAny()]

	@extend_schema(
		tags=['Customers'],
		summary='List watchlist posts',
		description='Return active watchlist posts. Supports filters by hotel_name, booking_code, and mine=true for the current user.',
		auth=[],
		parameters=[
			OpenApiParameter('hotel_name', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by hotel name'),
			OpenApiParameter('booking_code', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Filter by booking code'),
			OpenApiParameter('mine', OpenApiTypes.BOOL, OpenApiParameter.QUERY, description='When true, return only current user posts'),
		],
		responses={
			200: OpenApiResponse(
				response=CustomerWatchlistPostPublicListResponseSerializer,
				examples=[
					OpenApiExample('Watchlist response', value={'results': [WATCHLIST_REQUEST_EXAMPLE]}),
				],
			),
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication required when mine=true.',
				examples=[OpenApiExample('Unauthorized', value={'detail': 'Authentication required for mine=true.'})],
			),
		},
	)
	def get(self, request):
		queryset = CustomerWatchlistPost.objects.filter(is_active=True)

		hotel_name = str(request.query_params.get('hotel_name') or '').strip()
		booking_code = str(request.query_params.get('booking_code') or '').strip()
		mine = str(request.query_params.get('mine') or '').strip().lower() in {'1', 'true', 'yes', 'on'}

		if hotel_name:
			queryset = queryset.filter(hotel_name__icontains=hotel_name)
		if booking_code:
			queryset = queryset.filter(booking_code=booking_code)
		if mine:
			if not request.user or not request.user.is_authenticated:
				return Response({'detail': 'Authentication required for mine=true.'}, status=status.HTTP_401_UNAUTHORIZED)
			queryset = queryset.filter(customer=request.user)

		serializer = CustomerWatchlistPostPublicSerializer(queryset.order_by('-created_at'), many=True)
		return Response({'results': serializer.data}, status=status.HTTP_200_OK)

	@extend_schema(
		tags=['Customers'],
		summary='Create a watchlist post',
		description='Create a new watchlist post for the authenticated customer.',
		request=CustomerWatchlistPostInputSerializer,
		examples=[
			OpenApiExample('Create watchlist payload', value=WATCHLIST_REQUEST_EXAMPLE, request_only=True),
		],
		responses={
			201: CustomerWatchlistPostSerializer,
			400: OpenApiResponse(
				response=CustomerValidationErrorResponseSerializer,
				description='Invalid request payload.',
				examples=[OpenApiExample('Validation error', value={'errors': {'hotel_name': ['hotel_name is required.']}})],
			),
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
		},
	)
	def post(self, request):
		payload = _to_mutable_payload(request.data)
		if not payload.get('post_id') and not payload.get('id'):
			payload['post_id'] = f"WATCH_{uuid4().hex[:12].upper()}"

		serializer = CustomerWatchlistPostSerializer(data=payload)
		if not serializer.is_valid():
			return _validation_error_response(serializer)
		payload = serializer.validated_data
		payload.setdefault('posted_by_name', str(getattr(request.user, 'name', '') or '').strip())
		payload.setdefault('posted_by_email', str(getattr(request.user, 'email', '') or '').strip().lower())
		item = CustomerWatchlistPost.objects.create(customer=request.user, **payload)
		output = CustomerWatchlistPostSerializer(item)
		return Response(output.data, status=status.HTTP_201_CREATED)


class CustomerWatchlistPostDetailAPIView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		tags=['Customers'],
		summary='Soft delete a watchlist post',
		description='Soft delete a watchlist post by post_id for the authenticated customer by setting is_active=false.',
		responses={
			204: OpenApiResponse(description='Watchlist post soft-deleted successfully.'),
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
			404: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Watchlist post not found.',
				examples=[OpenApiExample('Not found', value={'detail': 'Watchlist post not found.'})],
			),
		},
	)
	def delete(self, request, post_id):
		item = CustomerWatchlistPost.objects.filter(post_id=post_id, customer=request.user, is_active=True).first()
		if not item:
			return Response({'detail': 'Watchlist post not found.'}, status=status.HTTP_404_NOT_FOUND)

		item.is_active = False
		item.save(update_fields=['is_active', 'updated_at'])
		return Response(status=status.HTTP_204_NO_CONTENT)


class CustomerHotelRatingListCreateAPIView(APIView):
	permission_classes = [IsAuthenticated]

	@extend_schema(
		tags=['Customers'],
		summary='List my hotel ratings',
		description='Return hotel ratings of the authenticated customer.',
		responses={
			200: OpenApiResponse(
				response=CustomerHotelRatingListResponseSerializer,
				examples=[
					OpenApiExample('Hotel ratings response', value={'results': [RATING_REQUEST_EXAMPLE]}),
				],
			),
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
		},
	)
	def get(self, request):
		queryset = CustomerHotelRating.objects.filter(customer=request.user).order_by('-created_at')
		serializer = CustomerHotelRatingSerializer(queryset, many=True)
		return Response({'results': serializer.data}, status=status.HTTP_200_OK)

	@extend_schema(
		tags=['Customers'],
		summary='Create a hotel rating',
		description='Create a hotel rating for the authenticated customer.',
		request=CustomerHotelRatingInputSerializer,
		examples=[
			OpenApiExample('Create hotel rating payload', value=RATING_REQUEST_EXAMPLE, request_only=True),
		],
		responses={
			201: CustomerHotelRatingSerializer,
			400: OpenApiResponse(
				response=CustomerValidationErrorResponseSerializer,
				description='Invalid request payload.',
				examples=[OpenApiExample('Validation error', value={'errors': {'rating_id': ['rating_id already exists.']}})],
			),
			401: OpenApiResponse(
				response=CustomerErrorResponseSerializer,
				description='Authentication credentials were not provided.',
				examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
			),
		},
	)
	def post(self, request):
		payload = _to_mutable_payload(request.data)
		if not payload.get('rating_id') and not payload.get('id'):
			payload['rating_id'] = f"RATE_{uuid4().hex[:12].upper()}"

		serializer = CustomerHotelRatingSerializer(data=payload)
		if not serializer.is_valid():
			return _validation_error_response(serializer)
		payload = serializer.validated_data
		payload.setdefault('customer_name', str(getattr(request.user, 'name', '') or '').strip())
		payload.setdefault('customer_email', str(getattr(request.user, 'email', '') or '').strip().lower())
		item = CustomerHotelRating.objects.create(customer=request.user, **payload)
		output = CustomerHotelRatingSerializer(item)
		return Response(output.data, status=status.HTTP_201_CREATED)


class CustomerHotelRatingStatsAPIView(APIView):
	permission_classes = [AllowAny]

	@extend_schema(
		tags=['Customers'],
		summary='Get hotel rating statistics',
		description='Return average rating and review count for a hotel. Name can come from hotel_slug path or hotel_name query param.',
		auth=[],
		parameters=[
			OpenApiParameter('hotel_name', OpenApiTypes.STR, OpenApiParameter.QUERY, description='Optional explicit hotel name override'),
		],
		responses={
			200: OpenApiResponse(
				response=CustomerHotelRatingStatsResponseSerializer,
				examples=[
					OpenApiExample(
						'Hotel rating stats response',
						value={'hotel_name': 'Nesto Ho Chi Minh Center', 'avg_rating': 4.7, 'review_count': 123},
					),
				],
			),
			400: OpenApiResponse(response=CustomerErrorResponseSerializer, description='hotel name is required.'),
		},
	)
	def get(self, request, hotel_slug):
		explicit_hotel_name = str(request.query_params.get('hotel_name') or '').strip()
		normalized_name = explicit_hotel_name or str(hotel_slug or '').replace('-', ' ').strip()

		if not normalized_name:
			return Response({'detail': 'hotel name is required.'}, status=status.HTTP_400_BAD_REQUEST)

		queryset = CustomerHotelRating.objects.filter(hotel_name__iexact=normalized_name)
		if not queryset.exists():
			queryset = CustomerHotelRating.objects.filter(hotel_name__icontains=normalized_name)

		aggregate = queryset.aggregate(avg_rating=Avg('rating'), review_count=Count('id'))
		avg_rating = aggregate['avg_rating']
		review_count = int(aggregate['review_count'] or 0)

		if avg_rating is None:
			avg_value = Decimal('0.0')
		else:
			avg_value = Decimal(str(avg_rating)).quantize(Decimal('0.1'), rounding=ROUND_HALF_UP)

		return Response(
			{
				'hotel_name': normalized_name,
				'avg_rating': float(avg_value),
				'review_count': review_count,
			},
			status=status.HTTP_200_OK,
		)
