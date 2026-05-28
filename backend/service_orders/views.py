from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from drf_spectacular.utils import extend_schema
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsBusinessMember, IsServiceMember
from service_orders.models import ExtraService, ServiceOrder
from service_orders.serializers import ExtraServiceSerializer, ServiceOrderSerializer
from staff.models import StaffProfile


@extend_schema(tags=["Service Orders"])
class ExtraServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ExtraServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsBusinessMember()]

    def get_queryset(self):
        qs = ExtraService.objects.select_related("branch").order_by("-created_at")
        user = self.request.user
        role = getattr(user, "role", None)
        if role in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            qs = qs.filter(branch__company__manager=user)
        else:
            staff_branch_id = (
                StaffProfile.objects.filter(user=user).values_list("branch_id", flat=True).first()
            )
            if staff_branch_id:
                qs = qs.filter(branch_id=staff_branch_id)
            else:
                qs = qs.none()
        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs


@extend_schema(tags=["Service Orders"])
class ServiceOrderViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceOrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsServiceMember]

    def get_queryset(self):
        qs = ServiceOrder.objects.select_related("booking", "branch").order_by("-created_at")
        user = self.request.user
        role = getattr(user, "role", None)
        if role in {"SUPER_ADMIN", "BUSINESS_OWNER"}:
            qs = qs.filter(branch__company__manager=user)
        else:
            staff_branch_id = (
                StaffProfile.objects.filter(user=user).values_list("branch_id", flat=True).first()
            )
            if staff_branch_id:
                qs = qs.filter(branch_id=staff_branch_id)
            else:
                qs = qs.none()
        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs

    def _emit_order_event(self, order):
        channel_layer = get_channel_layer()
        groups = [
            f"services_branch_{order.branch_id}_role_SERVICE",
            f"services_branch_{order.branch_id}_role_MANAGER",
            f"services_branch_{order.branch_id}_role_BUSINESS_OWNER",
            f"services_branch_{order.branch_id}_role_SUPER_ADMIN",
        ]
        message = {
            "type": "service_update",
            "orderId": str(order.id),
            "status": order.status,
            "branchId": str(order.branch_id),
        }
        for group in groups:
            async_to_sync(channel_layer.group_send)(
                group,
                {
                    "type": "group_message",
                    "message": message,
                    "sender_channel": None,
                },
            )

    def perform_update(self, serializer):
        order = serializer.save()
        self._emit_order_event(order)

    @extend_schema(tags=["Service Orders"])
    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        order = self.get_object()
        if order.status not in {"PENDING"}:
            return Response({"detail": "Only pending orders can be accepted."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = "IN_PROGRESS"
        order.assigned_staff = request.user.name or request.user.email
        order.save(update_fields=["status", "assigned_staff", "updated_at"])
        self._emit_order_event(order)
        return Response(self.get_serializer(order).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Service Orders"])
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        order = self.get_object()
        if order.status not in {"IN_PROGRESS"}:
            return Response({"detail": "Only in-progress orders can be completed."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = "COMPLETED"
        order.save(update_fields=["status", "updated_at"])
        self._emit_order_event(order)
        return Response(self.get_serializer(order).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Service Orders"])
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status in {"COMPLETED", "CANCELLED"}:
            return Response({"detail": "Order is already closed."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = "CANCELLED"
        order.save(update_fields=["status", "updated_at"])
        self._emit_order_event(order)
        return Response(self.get_serializer(order).data, status=status.HTTP_200_OK)
