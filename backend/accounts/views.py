import asgiref.sync
from channels.layers import get_channel_layer
from drf_spectacular.utils import extend_schema
import logging
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.serializers import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    GoogleAuthSerializer,
    ResetPasswordSerializer,
    SendBusinessContactOTPSerializer,
    SendOTPSerializer,
    UserRegistrationSerializer,
    UserSerializer,
    VerifyOTPSerializer,
)
from accounts.services.auth_service import AuthService
from accounts.services.otp_service import OTPService

logger = logging.getLogger(__name__)

@extend_schema(tags=['Authentication'])
class AuthenticationViewSet(viewsets.GenericViewSet):
    permission_classes = [permissions.AllowAny]
    serializer_class = SendOTPSerializer

    @extend_schema(tags=['Authentication'], request=SendOTPSerializer)
    @action(detail=False, methods=['post'])
    def send_otp(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        email = serializer.validated_data['email']
        OTPService.generate_and_send_otp(email, purpose='REGISTER')
        return Response({"detail": "OTP sent successfully. Please check your email."}, status=status.HTTP_200_OK)

    @extend_schema(tags=['Authentication'], request=VerifyOTPSerializer)
    @action(detail=False, methods=['post'])
    def verify_otp(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("verify_otp invalid payload: %s", serializer.errors)
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

    @extend_schema(tags=['Authentication'], request=SendBusinessContactOTPSerializer)
    @action(detail=False, methods=['post'], url_path='send_business_otp')
    def send_business_otp(self, request):
        serializer = SendBusinessContactOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        email = serializer.validated_data['email']
        OTPService.generate_and_send_otp(email, purpose='BUSINESS_CONTACT')
        return Response({"detail": "OTP sent successfully. Please check your email."}, status=status.HTTP_200_OK)

    @extend_schema(tags=['Authentication'], request=VerifyOTPSerializer)
    @action(detail=False, methods=['post'], url_path='verify_business_otp')
    def verify_business_otp(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("verify_business_otp invalid payload: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        email = serializer.validated_data['email']
        otp_code = serializer.validated_data['otp_code']
        is_valid = OTPService.verify_otp(email, purpose='BUSINESS_CONTACT', user_otp=otp_code)
        if not is_valid:
            return Response({"detail": "Invalid or expired OTP code."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "Business contact verified successfully.", "verified": True}, status=status.HTTP_200_OK)

    @extend_schema(tags=['Authentication'], request=UserRegistrationSerializer)
    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        user = serializer.save()
        tokens = AuthService.generate_tokens(user)
        return Response({"user": UserSerializer(user).data, **tokens}, status=status.HTTP_201_CREATED)

    @extend_schema(tags=['Authentication'], request=ChangePasswordSerializer)
    @action(detail=False, methods=['post'], url_path='change_password', permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        current_password = serializer.validated_data["current_password"]
        if not user.check_password(current_password):
            return Response({"detail": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)

    @extend_schema(tags=['Authentication'], request=GoogleAuthSerializer)
    @action(detail=False, methods=['post'], url_path='google')
    def google(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = AuthService.google_authenticate(serializer.validated_data["id_token"])
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        tokens = AuthService.generate_tokens(user)
        return Response({"user": UserSerializer(user).data, **tokens}, status=status.HTTP_200_OK)

    @extend_schema(tags=['Authentication'])
    @action(detail=False, methods=['post'])
    def forgot_password(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            return Response(AuthService.send_reset_password_email(serializer.validated_data['email']))
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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

    @extend_schema(tags=['User'])
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
