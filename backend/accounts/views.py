import asgiref.sync
from channels.layers import get_channel_layer
from drf_spectacular.utils import OpenApiExample, OpenApiResponse, extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.serializers import (
    ForgotPasswordSerializer, ResetPasswordSerializer, SendOTPSerializer,
    UserRegistrationSerializer, UserSerializer, VerifyOTPSerializer,
)
from accounts.services.auth_service import AuthService
from accounts.services.otp_service import OTPService

UNAUTHORIZED_ERROR_EXAMPLE = {'detail': 'Authentication credentials were not provided.'}
BAD_REQUEST_ERROR_EXAMPLE = {'detail': 'Invalid request payload.'}

@extend_schema(tags=['Auth'])
class AuthenticationViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = SendOTPSerializer

    @extend_schema(
        tags=['Auth'],
        summary='Send OTP for registration',
        request=SendOTPSerializer,
        responses={
            200: OpenApiResponse(description='OTP sent successfully.'),
            400: OpenApiResponse(
                description='Invalid request payload.',
                examples=[OpenApiExample('Bad request', value=BAD_REQUEST_ERROR_EXAMPLE)],
            ),
        },
    )
    @action(detail=False, methods=['post'])
    def send_otp(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        email = serializer.validated_data['email']
        OTPService.generate_and_send_otp(email, purpose='REGISTER')
        return Response({"detail": "OTP sent successfully. Please check your email."}, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['Auth'],
        summary='Verify OTP code',
        request=VerifyOTPSerializer,
        responses={
            200: OpenApiResponse(description='OTP verified successfully.'),
            400: OpenApiResponse(
                description='Invalid or expired OTP code.',
                examples=[OpenApiExample('Bad request', value={'detail': 'Invalid or expired OTP code.'})],
            ),
        },
    )
    @action(detail=False, methods=['post'])
    def verify_otp(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp_code']
        session_id = serializer.validated_data.get('session_id')

        is_valid = OTPService.verify_otp(email, purpose='REGISTER', user_otp=otp_code)
        if not is_valid:
            return Response({"detail": "Invalid or expired OTP code."}, status=status.HTTP_400_BAD_REQUEST)

        register_token = OTPService.generate_register_token(email)
        if session_id:
            channel_layer = get_channel_layer()
            asgiref.sync.async_to_sync(channel_layer.group_send)(
                f"auth_{session_id}",
                {"type": "auth_notification", "data": {"status": "success", "message": "Email verified.", "register_token": register_token}}
            )
        return Response({"message": "Email verified successfully.", "register_token": register_token}, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['Auth'],
        summary='Register user account',
        request=UserRegistrationSerializer,
        responses={
            201: OpenApiResponse(description='Registration successful.'),
            400: OpenApiResponse(
                description='Invalid request payload.',
                examples=[OpenApiExample('Bad request', value=BAD_REQUEST_ERROR_EXAMPLE)],
            ),
        },
    )
    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        
        # FIX QUAN TRỌNG Ở ĐÂY: Gọi staticmethod
        tokens = AuthService.generate_tokens(user)
        
        return Response({"user": UserSerializer(user).data, **tokens}, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=['Auth'],
        summary='Request password reset',
        request=ForgotPasswordSerializer,
        responses={
            200: OpenApiResponse(description='Password reset email sent.'),
            400: OpenApiResponse(
                description='Invalid request payload.',
                examples=[OpenApiExample('Bad request', value=BAD_REQUEST_ERROR_EXAMPLE)],
            ),
        },
    )
    @action(detail=False, methods=['post'])
    def forgot_password(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            return Response(AuthService.send_reset_password_email(serializer.validated_data['email']))
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        tags=['Auth'],
        summary='Reset password',
        request=ResetPasswordSerializer,
        responses={
            200: OpenApiResponse(description='Password reset successful.'),
            400: OpenApiResponse(
                description='Invalid token, uid, or payload.',
                examples=[OpenApiExample('Bad request', value=BAD_REQUEST_ERROR_EXAMPLE)],
            ),
        },
    )
    @action(detail=False, methods=['post'])
    def reset_password(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        token = serializer.validated_data['token']
        uid = request.query_params.get('uid') or request.data.get('uid')
        if not uid:
            return Response({"detail": "uid is required"}, status=status.HTTP_400_BAD_REQUEST)
        result = AuthService.reset_password(token, uid, serializer.validated_data['new_password'])
        if not result.get('success'):
            return Response({"detail": result.get('message')}, status=status.HTTP_400_BAD_REQUEST)
        return Response(result)

@extend_schema(tags=['Users'])
class UserViewSet(viewsets.GenericViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'post']

    def get_object(self):
        return self.request.user

    @extend_schema(
        tags=['Users'],
        summary='Get or update current user profile',
        responses={
            200: UserSerializer,
            401: OpenApiResponse(
                description='Authentication credentials were not provided.',
                examples=[OpenApiExample('Unauthorized', value=UNAUTHORIZED_ERROR_EXAMPLE)],
            ),
        },
    )
    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        instance = self.get_object()
        if request.method == 'GET':
            return Response(self.get_serializer(instance).data)
        elif request.method == 'PATCH':
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
