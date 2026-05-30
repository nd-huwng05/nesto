"""BookingLineItem workflow — accept, start, complete, cancel."""

from __future__ import annotations

from dataclasses import dataclass

from django.db import transaction

from bookings.models import BookingLineItem
from service_orders.services.order_notification_service import OrderNotificationService


@dataclass
class LineItemWorkflowResult:
    ok: bool
    line_item: BookingLineItem | None = None
    detail: str = ""


class LineItemWorkflowService:
    @classmethod
    @transaction.atomic
    def accept(cls, line: BookingLineItem, *, actor) -> LineItemWorkflowResult:
        if line.status not in {BookingLineItem.Status.PENDING}:
            return LineItemWorkflowResult(ok=False, detail="Only pending tasks can be accepted.")
        line.status = BookingLineItem.Status.CONFIRMED
        line.assigned_to = actor
        line.assigned_staff = actor.name or actor.email
        line.save(update_fields=["status", "assigned_to", "assigned_staff", "updated_at"])
        OrderNotificationService.notify_line_item_updated(line)
        OrderNotificationService.notify_branch_task(line, event_type="task_updated")
        return LineItemWorkflowResult(ok=True, line_item=line)

    @classmethod
    @transaction.atomic
    def start(cls, line: BookingLineItem) -> LineItemWorkflowResult:
        if line.status not in {BookingLineItem.Status.CONFIRMED}:
            return LineItemWorkflowResult(ok=False, detail="Only confirmed tasks can be started.")
        line.status = BookingLineItem.Status.IN_PROGRESS
        line.save(update_fields=["status", "updated_at"])
        OrderNotificationService.notify_line_item_updated(line)
        OrderNotificationService.notify_branch_task(line, event_type="task_updated")
        return LineItemWorkflowResult(ok=True, line_item=line)

    @classmethod
    @transaction.atomic
    def complete(cls, line: BookingLineItem) -> LineItemWorkflowResult:
        if line.status not in {BookingLineItem.Status.IN_PROGRESS}:
            return LineItemWorkflowResult(ok=False, detail="Only in-progress tasks can be completed.")
        line.status = BookingLineItem.Status.COMPLETED
        line.save(update_fields=["status", "updated_at"])
        OrderNotificationService.notify_line_item_updated(line)
        OrderNotificationService.notify_branch_task(line, event_type="task_updated")
        return LineItemWorkflowResult(ok=True, line_item=line)

    @classmethod
    @transaction.atomic
    def cancel(cls, line: BookingLineItem) -> LineItemWorkflowResult:
        if line.status in {BookingLineItem.Status.COMPLETED, BookingLineItem.Status.CANCELLED}:
            return LineItemWorkflowResult(ok=False, detail="Task is already closed.")
        line.status = BookingLineItem.Status.CANCELLED
        line.save(update_fields=["status", "updated_at"])
        OrderNotificationService.notify_line_item_updated(line)
        OrderNotificationService.notify_branch_task(line, event_type="task_updated")
        return LineItemWorkflowResult(ok=True, line_item=line)
