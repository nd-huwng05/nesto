"""Create and enrich customer-facing bookings (PENDING + line items)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.utils import timezone

from bookings.models import Booking, BookingLineItem
from bookings.services.booking_capacity_service import assert_category_available, prepare_category_availability
from bookings.services.booking_quote_service import normalize_deposit_percentage
from bookings.services.hold_service import (
    apply_late_hold_deadline,
    apply_payment_hold_deadline,
    calculate_deposit_amount,
    enforce_payment_hold_expiry,
)
from bookings.services.line_item_service import add_catalog_services_to_booking
from bookings.serializers import BookingSerializer
from rooms.models import RoomCategory
from rooms.services.pricing_service import calculate_tiered_room_price
from service_orders.models import ExtraService


@dataclass(frozen=True)
class CustomerBookingCreateResult:
    ok: bool
    booking: Booking | None = None
    response_data: dict[str, Any] | None = None
    detail: str = ""
    http_status: int = 400


class CustomerBookingService:
    @staticmethod
    def create_pending(
        *,
        user,
        serializer,
        raw_deposit_percentage=None,
        request=None,
    ) -> CustomerBookingCreateResult:
        data = serializer.validated_data
        branch = data.get("branch")
        room_type_id = data.get("room_type_id")
        room_type = str(data.get("room_type") or "").strip()
        deposit_percentage = normalize_deposit_percentage(raw_deposit_percentage)

        selected_category = None
        if room_type_id:
            selected_category = RoomCategory.objects.filter(id=room_type_id, branch=branch).first()
            if not selected_category:
                return CustomerBookingCreateResult(
                    ok=False,
                    detail="Room type not found for this branch.",
                )
            room_type = str(selected_category.name or "").strip() or room_type

        check_in_at = data.get("check_in_at") or timezone.now()
        expected_check_out_at = data.get("expected_check_out_at")
        if not expected_check_out_at:
            return CustomerBookingCreateResult(ok=False, detail="expected_check_out_at is required.")
        if expected_check_out_at <= check_in_at:
            return CustomerBookingCreateResult(ok=False, detail="Check-out must be after check-in.")

        if selected_category:
            prepare_category_availability(
                customer_id=getattr(user, "id", None),
                branch_id=branch.id,
                room_category_id=selected_category.id,
                check_in_at=check_in_at,
                expected_check_out_at=expected_check_out_at,
            )
            try:
                assert_category_available(
                    branch_id=branch.id,
                    room_category_id=selected_category.id,
                    check_in_at=check_in_at,
                    expected_check_out_at=expected_check_out_at,
                )
            except ValueError as exc:
                return CustomerBookingCreateResult(ok=False, detail=str(exc), http_status=409)

        pricing = (
            calculate_tiered_room_price(selected_category, check_in_at, expected_check_out_at)
            if selected_category
            else {"room_total": 0, "duration_minutes": 0}
        )
        room_total = int(pricing.get("room_total") or pricing.get("roomTotal") or 0)
        hourly_rate = int((pricing.get("price_per_hour") or pricing.get("pricePerHour") or 0) or 0)

        service_ids = [str(sid) for sid in (data.get("service_ids") or [])]
        services_qs = list(ExtraService.objects.filter(id__in=service_ids, branch=branch)) if service_ids else []
        if service_ids and len(services_qs) != len(set(service_ids)):
            return CustomerBookingCreateResult(
                ok=False,
                detail="One or more services are invalid for this branch.",
            )
        services_total = sum(int(svc.price or 0) for svc in services_qs)
        deposit_amount = calculate_deposit_amount(room_total, deposit_percentage)

        special_requests = str(data.get("special_requests") or "").strip()
        booking = serializer.save(
            customer=user,
            status=Booking.Status.PENDING,
            walk_in=False,
            special_requests=special_requests,
            room_category=selected_category,
            room=None,
            room_type=room_type,
            check_in_at=check_in_at,
            expected_check_out_at=expected_check_out_at,
            room_price=room_total,
            base_price=room_total + services_total,
            hourly_rate=hourly_rate,
            deposit_percentage=deposit_percentage,
            deposit_amount=deposit_amount,
        )
        apply_payment_hold_deadline(booking)
        booking.save(
            update_fields=[
                "hold_minutes",
                "late_hold_deadline_at",
                "deposit_percentage",
                "deposit_amount",
                "updated_at",
            ]
        )

        if services_qs:
            add_catalog_services_to_booking(
                booking,
                services_qs,
                source=BookingLineItem.Source.CUSTOMER,
                initial_status=BookingLineItem.Status.PENDING,
            )

        output = BookingSerializer(booking, context={"request": request} if request else None)
        response_data = dict(output.data)
        response_data.update(
            {
                "room_total": room_total,
                "services_total": services_total,
                "total_amount": room_total + services_total,
                "deposit_amount": deposit_amount,
                "deposit_percentage": deposit_percentage,
                "hold_minutes": booking.hold_minutes,
                "late_hold_deadline_at": (
                    booking.late_hold_deadline_at.isoformat() if booking.late_hold_deadline_at else None
                ),
                "payment_hold_minutes": booking.hold_minutes,
                "pricing_tier": pricing.get("pricing_tier") or pricing.get("pricingTier"),
                "service_ids": [str(svc.id) for svc in services_qs],
            }
        )
        return CustomerBookingCreateResult(
            ok=True,
            booking=booking,
            response_data=response_data,
            http_status=201,
        )

    @staticmethod
    def create_confirmed_from_checkout(
        *,
        user,
        checkout_payload: dict,
        payment_method: str,
        deposit_amount: int,
        request=None,
    ) -> CustomerBookingCreateResult:
        """Create a CONFIRMED booking after successful payment (no PENDING hold)."""
        from bookings.services.booking_notification_service import BookingNotificationService
        from bookings.services.realtime_service import (
            emit_booking_live_bill,
            emit_branch_availability_changed,
        )
        from businesses.models import Branch
        from businesses.services.branch_customer_service import register_branch_customer
        from payments.services.payment_service import normalize_payment_method

        payload = checkout_payload or {}
        branch_id = payload.get("branch_id") or payload.get("branchId") or payload.get("branch")
        room_type_id = payload.get("room_type_id") or payload.get("roomTypeId")
        room_type = str(payload.get("room_type") or payload.get("roomType") or "").strip()
        deposit_percentage = normalize_deposit_percentage(
            payload.get("deposit_percentage") or payload.get("depositPercentage")
        )

        branch = Branch.objects.filter(id=branch_id).first()
        if not branch:
            return CustomerBookingCreateResult(ok=False, detail="Branch not found.")

        selected_category = None
        if room_type_id:
            selected_category = RoomCategory.objects.filter(id=room_type_id, branch=branch).first()
            if not selected_category:
                return CustomerBookingCreateResult(
                    ok=False,
                    detail="Room type not found for this branch.",
                )
            room_type = str(selected_category.name or "").strip() or room_type

        check_in_raw = payload.get("check_in_at") or payload.get("checkInAt")
        check_out_raw = payload.get("expected_check_out_at") or payload.get("expectedCheckOutAt")
        if not check_in_raw or not check_out_raw:
            return CustomerBookingCreateResult(ok=False, detail="Check-in and check-out are required.")

        from django.utils.dateparse import parse_datetime

        check_in_at = parse_datetime(str(check_in_raw)) if not hasattr(check_in_raw, "isoformat") else check_in_raw
        expected_check_out_at = (
            parse_datetime(str(check_out_raw)) if not hasattr(check_out_raw, "isoformat") else check_out_raw
        )
        if not check_in_at or not expected_check_out_at:
            return CustomerBookingCreateResult(ok=False, detail="Invalid check-in or check-out time.")
        if expected_check_out_at <= check_in_at:
            return CustomerBookingCreateResult(ok=False, detail="Check-out must be after check-in.")

        if selected_category:
            try:
                assert_category_available(
                    branch_id=branch.id,
                    room_category_id=selected_category.id,
                    check_in_at=check_in_at,
                    expected_check_out_at=expected_check_out_at,
                )
            except ValueError as exc:
                return CustomerBookingCreateResult(ok=False, detail=str(exc), http_status=409)

        pricing = (
            calculate_tiered_room_price(selected_category, check_in_at, expected_check_out_at)
            if selected_category
            else {"room_total": 0, "duration_minutes": 0}
        )
        room_total = int(pricing.get("room_total") or pricing.get("roomTotal") or 0)
        hourly_rate = int((pricing.get("price_per_hour") or pricing.get("pricePerHour") or 0) or 0)

        raw_service_ids = payload.get("service_ids") or payload.get("serviceIds") or []
        service_ids = [str(sid) for sid in raw_service_ids if str(sid).strip()]
        services_qs = list(ExtraService.objects.filter(id__in=service_ids, branch=branch)) if service_ids else []
        if service_ids and len(services_qs) != len(set(service_ids)):
            return CustomerBookingCreateResult(
                ok=False,
                detail="One or more services are invalid for this branch.",
            )
        services_total = sum(int(svc.price or 0) for svc in services_qs)
        resolved_deposit = int(deposit_amount or 0) or calculate_deposit_amount(room_total, deposit_percentage)

        special_requests = str(payload.get("special_requests") or payload.get("specialRequests") or "").strip()
        guest_name = str(payload.get("guest_name") or payload.get("guestName") or getattr(user, "name", "") or "").strip()
        email = str(payload.get("email") or getattr(user, "email", "") or "").strip()
        phone = str(payload.get("phone") or getattr(user, "phone", "") or "").strip()
        hotel_name = str(payload.get("hotel_name") or payload.get("hotelName") or branch.name or "").strip()
        hotel_address = str(
            payload.get("hotel_address") or payload.get("hotelAddress") or branch.address or ""
        ).strip()

        booking = Booking.objects.create(
            customer=user,
            branch=branch,
            status=Booking.Status.CONFIRMED,
            walk_in=False,
            guest_name=guest_name,
            email=email,
            phone=phone,
            special_requests=special_requests,
            hotel_name=hotel_name,
            hotel_address=hotel_address,
            room_category=selected_category,
            room=None,
            room_type=room_type,
            check_in_at=check_in_at,
            expected_check_out_at=expected_check_out_at,
            room_price=room_total,
            base_price=room_total + services_total,
            hourly_rate=hourly_rate,
            deposit_percentage=deposit_percentage,
            deposit_amount=resolved_deposit,
            payment_method=normalize_payment_method(payment_method),
        )
        apply_late_hold_deadline(booking, deposit_percentage)
        booking.save(
            update_fields=[
                "hold_minutes",
                "late_hold_deadline_at",
                "deposit_percentage",
                "deposit_amount",
                "updated_at",
            ]
        )

        if services_qs:
            add_catalog_services_to_booking(
                booking,
                services_qs,
                source=BookingLineItem.Source.CUSTOMER,
                initial_status=BookingLineItem.Status.CONFIRMED,
            )

        register_branch_customer(booking)
        BookingNotificationService.on_confirmed(booking)
        emit_booking_live_bill(booking, request=request)
        if booking.branch_id:
            emit_branch_availability_changed(booking.branch_id, booking.room_category_id)

        output = BookingSerializer(booking, context={"request": request} if request else None)
        response_data = dict(output.data)
        response_data.update(
            {
                "room_total": room_total,
                "services_total": services_total,
                "total_amount": room_total + services_total,
                "deposit_amount": resolved_deposit,
                "deposit_percentage": deposit_percentage,
                "deposit_paid": True,
            }
        )
        return CustomerBookingCreateResult(
            ok=True,
            booking=booking,
            response_data=response_data,
            http_status=201,
        )
