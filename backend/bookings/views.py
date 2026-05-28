from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ReviewForumPost, build_review_scope_key
from .serializers import ReviewForumPostCreateSerializer, ReviewForumPostSerializer


class ReviewForumListCreateAPIView(APIView):
	permission_classes = [AllowAny]

	def get(self, request):
		hotel_name = str(request.query_params.get('hotel_name') or '').strip()
		room_name = str(request.query_params.get('room_name') or '').strip()

		if not hotel_name or not room_name:
			return Response({'results': []}, status=status.HTTP_200_OK)

		scope_key = build_review_scope_key(hotel_name, room_name)
		queryset = ReviewForumPost.objects.filter(scope_key=scope_key).select_related('customer').prefetch_related('liked_by')[:100]
		serializer = ReviewForumPostSerializer(queryset, many=True, context={'request': request})
		return Response({'results': serializer.data}, status=status.HTTP_200_OK)

	def post(self, request):
		serializer = ReviewForumPostCreateSerializer(data=request.data, context={'request': request})
		serializer.is_valid(raise_exception=True)
		post = serializer.save()

		output = ReviewForumPostSerializer(post, context={'request': request})
		return Response(output.data, status=status.HTTP_201_CREATED)


class ReviewForumToggleHeartAPIView(APIView):
	permission_classes = [AllowAny]

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
