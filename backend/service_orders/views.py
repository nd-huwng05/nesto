from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.services.permissions import IsBusinessMember, IsServiceMember
from accounts.services.tenant_queryset import TenantQuerysetService
from service_orders.models import ExtraService, ServiceOrder
from service_orders.serializers import ExtraServiceSerializer, ServiceOrderSerializer
from service_orders.services.order_notification_service import OrderNotificationService
@extend_schema(tags=["Service Orders"])
class ExtraServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ExtraServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsBusinessMember()]

    def get_queryset(self):
        qs = ExtraService.objects.select_related("branch", "branch__company").order_by("name")
        user = self.request.user
        role = getattr(user, "role", None)
        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")

        if role == "CUSTOMER":
            if branch_id:
                return qs.filter(branch_id=branch_id, branch__is_active=True)
            return qs.none()

        qs = TenantQuerysetService.filter_by_branch_membership(qs, user)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs


@extend_schema(tags=["Service Orders"])
class ServiceOrderViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceOrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsServiceMember]

    def get_queryset(self):
        qs = ServiceOrder.objects.select_related("booking", "branch").order_by("-created_at")
        qs = TenantQuerysetService.filter_by_branch_membership(qs, self.request.user)
        branch_id = self.request.query_params.get("branch_id") or self.request.query_params.get("branch")
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs

    def perform_create(self, serializer):
        order = serializer.save()
        OrderNotificationService.notify_order_updated(order)
        OrderNotificationService.notify_branch_task(order, event_type="task_created")

    def perform_update(self, serializer):
        order = serializer.save()
        OrderNotificationService.notify_order_updated(order)
        OrderNotificationService.notify_branch_task(order, event_type="task_updated")

    @extend_schema(tags=["Service Orders"])
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def accept(self, request, pk=None):
        order = self.get_object()
        if order.status not in {"PENDING"}:
            return Response({"detail": "Only pending orders can be accepted."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = "CONFIRMED"
        order.assigned_staff = request.user.name or request.user.email
        order.save(update_fields=["status", "assigned_staff", "updated_at"])
        OrderNotificationService.notify_order_updated(order)
        OrderNotificationService.notify_branch_task(order, event_type="task_updated")
        return Response(self.get_serializer(order).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Service Orders"])
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def start(self, request, pk=None):
        order = self.get_object()
        if order.status not in {"CONFIRMED"}:
            return Response({"detail": "Only confirmed orders can be started."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = "IN_PROGRESS"
        order.save(update_fields=["status", "updated_at"])
        OrderNotificationService.notify_order_updated(order)
        OrderNotificationService.notify_branch_task(order, event_type="task_updated")
        return Response(self.get_serializer(order).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Service Orders"])
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def complete(self, request, pk=None):
        order = self.get_object()
        if order.status not in {"IN_PROGRESS"}:
            return Response({"detail": "Only in-progress orders can be completed."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = "COMPLETED"
        order.save(update_fields=["status", "updated_at"])
        OrderNotificationService.notify_order_updated(order)
        OrderNotificationService.notify_branch_task(order, event_type="task_updated")
        return Response(self.get_serializer(order).data, status=status.HTTP_200_OK)

    @extend_schema(tags=["Service Orders"])
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def cancel(self, request, pk=None):
        order = self.get_object()
        if order.status in {"COMPLETED", "CANCELLED"}:
            return Response({"detail": "Order is already closed."}, status=status.HTTP_400_BAD_REQUEST)
        order.status = "CANCELLED"
        order.save(update_fields=["status", "updated_at"])
        OrderNotificationService.notify_order_updated(order)
        OrderNotificationService.notify_branch_task(order, event_type="task_updated")
        return Response(self.get_serializer(order).data, status=status.HTTP_200_OK)
