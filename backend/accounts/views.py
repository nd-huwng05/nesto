import asgiref.sync
from channels.layers import get_channel_layer
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.serializers import (
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    SendOTPSerializer,
    UserRegistrationSerializer,
    UserSerializer,
    VerifyOTPSerializer,
)
from accounts.services.auth_service import AuthService
from accounts.services.otp_service import OTPService


@extend_schema(tags=['Authentication'])
class AuthenticationViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=['Authentication'],
        request=SendOTPSerializer,
        responses={200: {"description": "OTP sent successfully"}}
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
        tags=['Authentication'],
        request=VerifyOTPSerializer,
        responses={200: {"description": "Email verified, register token returned"}}
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
                {
                    "type": "auth_notification",
                    "data": {
                        "status": "success",
                        "message": "Email verified successfully.",
                        "register_token": register_token
                    }
                }
            )

        return Response({
            "message": "Email verified successfully.",
            "register_token": register_token
        }, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['Authentication'],
        request=UserRegistrationSerializer,
        responses={201: {"description": "Registration successful with OAuth2 tokens"}}
    )
    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()

        auth_svc = AuthService()
        tokens = auth_svc.generate_tokens(user)

        return Response({
            "user": UserSerializer(user).data,
            **tokens,
        }, status=status.HTTP_201_CREATED)

    @extend_schema(tags=['Authentication'])
    @action(detail=False, methods=['post'])
    def forgot_password(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        result = AuthService.send_reset_password_email(serializer.validated_data['email'])
        return Response(result)

    @extend_schema(tags=['Authentication'])
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


@extend_schema(tags=['User'])
class UserViewSet(viewsets.GenericViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'patch', 'post']

    def get_object(self):
        return self.request.user

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        instance = self.get_object()

        if request.method == 'GET':
            serializer = self.get_serializer(instance)
            return Response(serializer.data)

        elif request.method == 'PATCH':
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
