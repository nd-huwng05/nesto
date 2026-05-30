"""Business portfolio analytics aggregation."""

from __future__ import annotations

import logging
from datetime import date, datetime, time

from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone

from bookings.models import Booking, BookingLineItem, ReviewForumPost
from businesses.models import Branch, Company
from rooms.models import HousekeepingTask, Room
from staff.models import StaffProfile

logger = logging.getLogger(__name__)

BOOKING_STATUS_LABELS = {
    "PENDING": "Pending",
    "CONFIRMED": "Confirmed",
    "CHECKED_IN": "In house",
    "CHECKED_OUT": "Checked out",
    "CANCELLED": "Cancelled",
    "CANCELLED_NO_SHOW": "No-show",
}

ROOM_STATUS_LABELS = {
    "AVAILABLE": "Available",
    "OCCUPIED": "Occupied",
    "DIRTY": "Dirty",
    "CLEANING": "Cleaning",
    "MAINTENANCE": "Maintenance",
    "OUT_OF_ORDER": "Out of order",
}

PAYMENT_METHOD_LABELS = {
    "momo": "MoMo",
    "zalopay": "ZaloPay",
    "cash": "Cash",
    "card": "Card",
    "": "Unspecified",
}


class BusinessAnalyticsService:
    @staticmethod
    def _month_label(month_date: date) -> str:
        return f"{month_date.month:02d}/{str(month_date.year)[-2:]}"

    @staticmethod
    def _shift_month(month_date: date, delta: int) -> date:
        year = month_date.year
        month = month_date.month + delta
        while month > 12:
            month -= 12
            year += 1
        while month < 1:
            month += 12
            year -= 1
        return date(year, month, 1)

    @staticmethod
    def _current_month_start() -> date:
        return timezone.now().date().replace(day=1)

    @staticmethod
    def _month_range(months: int) -> list[date]:
        end = BusinessAnalyticsService._current_month_start()
        start = BusinessAnalyticsService._shift_month(end, -(months - 1))
        rows: list[date] = []
        cursor = start
        while cursor <= end:
            rows.append(cursor)
            cursor = BusinessAnalyticsService._shift_month(cursor, 1)
        return rows

    @staticmethod
    def _series_start_date(months: int) -> date:
        return BusinessAnalyticsService._shift_month(
            BusinessAnalyticsService._current_month_start(),
            -(months - 1),
        )

    @staticmethod
    def _month_bucket_key(dt) -> date | None:
        if not dt:
            return None
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        local = timezone.localtime(dt)
        return local.date().replace(day=1)

    @staticmethod
    def _collect_revenue_buckets(bookings_qs, start) -> dict[date, int]:
        """Recognize revenue from checkout bills, successful payments, deposits, and in-house stays."""
        from bookings.services.billing_service import build_final_bill
        from payments.models import PaymentTransaction

        buckets: dict[date, int] = {}
        checkout_booking_ids: set = set()

        def add(dt, amount: int) -> None:
            if not dt or amount <= 0:
                return
            if timezone.is_naive(dt):
                dt = timezone.make_aware(dt, timezone.get_current_timezone())
            if dt < start:
                return
            key = BusinessAnalyticsService._month_bucket_key(dt)
            if not key:
                return
            buckets[key] = buckets.get(key, 0) + int(amount)

        try:
            checkout_bookings = (
                bookings_qs.filter(
                    status=Booking.Status.CHECKED_OUT,
                    check_out_at__isnull=False,
                    check_out_at__gte=start,
                )
                .select_related("room", "room_category")
                .prefetch_related("line_items")
            )
            for booking in checkout_bookings:
                checkout_booking_ids.add(booking.id)
                bill = build_final_bill(booking)
                add(booking.check_out_at, int(bill.get("gross_total") or 0))
        except Exception as exc:
            logger.exception("Analytics checkout revenue failed: %s", exc)

        payment_booking_ids: set = set()
        try:
            payment_rows = PaymentTransaction.objects.filter(
                booking__in=bookings_qs,
                status=PaymentTransaction.Status.SUCCESS,
            ).filter(Q(verified_at__gte=start) | Q(verified_at__isnull=True, created_at__gte=start))
            for txn in payment_rows.only("amount", "verified_at", "created_at", "booking_id"):
                if txn.booking_id in checkout_booking_ids:
                    continue
                payment_booking_ids.add(txn.booking_id)
                add(txn.verified_at or txn.created_at, int(txn.amount or 0))
        except Exception as exc:
            logger.exception("Analytics payment revenue failed: %s", exc)

        try:
            open_bookings = (
                bookings_qs.filter(status__in=(Booking.Status.CONFIRMED, Booking.Status.CHECKED_IN))
                .exclude(id__in=checkout_booking_ids)
                .exclude(id__in=payment_booking_ids)
                .select_related("room", "room_category")
                .prefetch_related("line_items")
            )
            for booking in open_bookings:
                deposit = int(booking.deposit_amount or 0)
                payment_method = str(booking.payment_method or "").strip()
                if deposit > 0 and payment_method:
                    event_at = booking.check_in_at or booking.updated_at or booking.created_at
                    now = timezone.now()
                    if booking.check_in_at and booking.check_in_at > now:
                        event_at = booking.updated_at or booking.created_at
                    add(event_at, deposit)
                    continue

                if booking.status == Booking.Status.CHECKED_IN and booking.check_in_at:
                    bill = build_final_bill(booking)
                    add(booking.check_in_at, int(bill.get("gross_total") or 0))
        except Exception as exc:
            logger.exception("Analytics in-house revenue failed: %s", exc)

        return buckets

    @staticmethod
    def _build_period_labels(period_key: str, months: int, start: date) -> list[tuple[str, date | tuple[int, int] | int]]:
        if period_key == "quarter":
            quarterly: dict[tuple[int, int], int] = {}
            cursor = start.replace(day=1)
            end_cursor = timezone.now().date().replace(day=1)
            while cursor <= end_cursor:
                quarter = ((cursor.month - 1) // 3) + 1
                key = (cursor.year, quarter)
                quarterly[key] = quarterly.get(key, 0)
                cursor_year = cursor.year + (cursor.month // 12)
                cursor_month = (cursor.month % 12) + 1
                cursor = date(cursor_year, cursor_month, 1)
            keys = sorted(quarterly.keys())[-4:]
            return [(f"Q{quarter}/{str(year)[-2:]}", key) for year, quarter in keys]

        if period_key == "year":
            yearly: dict[int, int] = {}
            cursor = start.replace(day=1)
            end_cursor = timezone.now().date().replace(day=1)
            while cursor <= end_cursor:
                yearly[cursor.year] = yearly.get(cursor.year, 0)
                cursor_year = cursor.year + (cursor.month // 12)
                cursor_month = (cursor.month % 12) + 1
                cursor = date(cursor_year, cursor_month, 1)
            keys = sorted(yearly.keys())[-3:]
            return [(str(year), year) for year in keys]

        labels: list[tuple[str, date]] = []
        for month_date in BusinessAnalyticsService._month_range(months):
            labels.append((BusinessAnalyticsService._month_label(month_date), month_date))
        return labels

    @staticmethod
    def _series_from_buckets(
        buckets: dict,
        period_key: str,
        months: int,
        start: date,
        *,
        default=0,
    ) -> list[dict]:
        rows = []
        for label, key in BusinessAnalyticsService._build_period_labels(period_key, months, start):
            if period_key == "quarter":
                value = buckets.get(key, default)
            elif period_key == "year":
                value = buckets.get(key, default)
            else:
                value = buckets.get(key, default)
            rows.append({"label": label, "value": int(value or 0)})
        return rows

    @staticmethod
    def build_dashboard(
        user,
        business_id: str = "all",
        branch_id: str = "all",
        months: int = 6,
        period: str = "month",
    ) -> dict:
        period_key = str(period or "month").strip().lower()
        if period_key == "quarter":
            months = 12
        elif period_key == "year":
            months = 36
        else:
            period_key = "month"
        months = max(1, min(int(months or 6), 36))
        total_revenue = 0
        total_bookings = 0
        occupancy_rate = 0.0
        task_completion_rate = 0.0
        average_review_rating = 0.0
        monthly_revenue = []
        monthly_bookings = []
        booking_status_breakdown: list[dict] = []
        payment_method_breakdown: list[dict] = []
        room_status_breakdown: list[dict] = []
        revenue_mix = {"roomRevenue": 0, "serviceRevenue": 0, "roomShare": 0.0, "serviceShare": 0.0}
        rating_distribution: list[dict] = []
        business_filters = [{"id": "all", "name": "All Businesses"}]
        branch_filters = [{"id": "all", "name": "All Branches", "businessId": "all"}]

        end = timezone.now()
        series_start_date = BusinessAnalyticsService._series_start_date(months)
        start = timezone.make_aware(datetime.combine(series_start_date, time.min))

        try:
            companies_qs = Company.objects.filter(manager=user)
            if not companies_qs.exists():
                companies_qs = Company.objects.filter(branches__staff_profiles__user=user)
            companies_qs = companies_qs.distinct()
            if business_id and business_id != "all":
                companies_qs = companies_qs.filter(id=business_id)

            try:
                business_filters = [{"id": "all", "name": "All Businesses"}] + [
                    {"id": str(cp.id), "name": cp.name} for cp in companies_qs.order_by("name")
                ]
            except Exception as exc:
                logger.exception("Analytics business options failed: %s", exc)

            branches_qs = Branch.objects.filter(company__in=companies_qs)
            if branch_id and branch_id != "all":
                branches_qs = branches_qs.filter(id=branch_id)

            try:
                branch_filters = [{"id": "all", "name": "All Branches", "businessId": "all"}] + [
                    {"id": str(br.id), "name": br.name, "businessId": str(br.company_id)}
                    for br in branches_qs.order_by("name")
                ]
            except Exception as exc:
                logger.exception("Analytics branch options failed: %s", exc)

            rooms_qs = Room.objects.none()
            total_rooms = 0
            try:
                rooms_qs = Room.objects.filter(branch__in=branches_qs)
                total_rooms = rooms_qs.count()
            except Exception as exc:
                logger.exception("Analytics rooms query failed: %s", exc)
                rooms_qs = Room.objects.none()
                total_rooms = 0

            try:
                bookings_qs = Booking.objects.filter(branch__in=branches_qs)
                total_bookings = bookings_qs.count()
                checked_in = bookings_qs.filter(status="CHECKED_IN").count()
                occupancy_rate = round((checked_in / total_rooms * 100) if total_rooms else 0, 1)
            except Exception as exc:
                logger.exception("Analytics bookings query failed: %s", exc)
                bookings_qs = None
                total_bookings = 0
                occupancy_rate = 0.0

            by_month = {}
            if bookings_qs is not None:
                try:
                    by_month = BusinessAnalyticsService._collect_revenue_buckets(bookings_qs, start)
                except Exception as exc:
                    logger.exception("Analytics revenue aggregation failed: %s", exc)
                    by_month = {}

            revenue_series = BusinessAnalyticsService._series_from_buckets(
                by_month, period_key, months, start.date()
            )
            monthly_revenue = [{"label": row["label"], "revenue": row["value"]} for row in revenue_series]
            total_revenue = int(sum(item["revenue"] for item in monthly_revenue))

            bookings_by_month: dict = {}
            if bookings_qs is not None:
                try:
                    booking_rows = (
                        bookings_qs.filter(created_at__gte=start)
                        .annotate(month=TruncMonth("created_at"))
                        .values("month")
                        .annotate(bookings=Count("id"))
                        .order_by("month")
                    )
                    bookings_by_month = {
                        row["month"].date(): int(row["bookings"] or 0)
                        for row in booking_rows
                        if row.get("month")
                    }
                except Exception as exc:
                    logger.exception("Analytics booking trend failed: %s", exc)

            if period_key == "quarter":
                quarterly_bookings: dict[tuple[int, int], int] = {}
                for month_date, count in bookings_by_month.items():
                    quarter = ((month_date.month - 1) // 3) + 1
                    key = (month_date.year, quarter)
                    quarterly_bookings[key] = quarterly_bookings.get(key, 0) + int(count or 0)
                booking_buckets = quarterly_bookings
            elif period_key == "year":
                yearly_bookings: dict[int, int] = {}
                for month_date, count in bookings_by_month.items():
                    yearly_bookings[month_date.year] = yearly_bookings.get(month_date.year, 0) + int(count or 0)
                booking_buckets = yearly_bookings
            else:
                booking_buckets = bookings_by_month

            booking_series = BusinessAnalyticsService._series_from_buckets(
                booking_buckets, period_key, months, start.date()
            )
            monthly_bookings = [{"label": row["label"], "count": row["value"]} for row in booking_series]

            if bookings_qs is not None:
                try:
                    for row in bookings_qs.values("status").annotate(count=Count("id")).order_by("-count"):
                        status_key = str(row.get("status") or "")
                        if not status_key:
                            continue
                        booking_status_breakdown.append(
                            {
                                "key": status_key,
                                "label": BOOKING_STATUS_LABELS.get(status_key, status_key.replace("_", " ").title()),
                                "count": int(row.get("count") or 0),
                            }
                        )
                except Exception as exc:
                    logger.exception("Analytics booking status breakdown failed: %s", exc)

                try:
                    checkout_qs = bookings_qs.filter(
                        status="CHECKED_OUT",
                        check_out_at__isnull=False,
                        check_out_at__gte=start,
                    )
                    room_revenue = int(
                        checkout_qs.aggregate(total=Coalesce(Sum("room_price"), 0)).get("total") or 0
                    )
                    if room_revenue <= 0:
                        room_revenue = int(
                            checkout_qs.aggregate(total=Coalesce(Sum("base_price"), 0)).get("total") or 0
                        )
                    service_revenue = int(
                        BookingLineItem.objects.filter(
                            booking__in=checkout_qs,
                            status="COMPLETED",
                        ).aggregate(total=Coalesce(Sum("amount"), 0)).get("total")
                        or 0
                    )
                    mix_total = room_revenue + service_revenue
                    revenue_mix = {
                        "roomRevenue": room_revenue,
                        "serviceRevenue": service_revenue,
                        "roomShare": round((room_revenue / mix_total * 100) if mix_total else 0, 1),
                        "serviceShare": round((service_revenue / mix_total * 100) if mix_total else 0, 1),
                    }

                    payment_rows = (
                        checkout_qs.values("payment_method")
                        .annotate(revenue=Coalesce(Sum("base_price"), 0), count=Count("id"))
                        .order_by("-revenue")
                    )
                    for row in payment_rows:
                        method_key = str(row.get("payment_method") or "").strip().lower()
                        payment_method_breakdown.append(
                            {
                                "key": method_key or "other",
                                "label": PAYMENT_METHOD_LABELS.get(method_key, method_key.title() or "Other"),
                                "value": int(row.get("revenue") or 0),
                                "count": int(row.get("count") or 0),
                            }
                        )
                except Exception as exc:
                    logger.exception("Analytics revenue mix / payments failed: %s", exc)

            if total_rooms:
                try:
                    for row in rooms_qs.values("status").annotate(count=Count("id")).order_by("-count"):
                        status_key = str(row.get("status") or "")
                        if not status_key:
                            continue
                        room_status_breakdown.append(
                            {
                                "key": status_key,
                                "label": ROOM_STATUS_LABELS.get(status_key, status_key.replace("_", " ").title()),
                                "count": int(row.get("count") or 0),
                            }
                        )
                except Exception as exc:
                    logger.exception("Analytics room status breakdown failed: %s", exc)

            try:
                tasks_qs = HousekeepingTask.objects.filter(branch__in=branches_qs)
                completed_tasks = tasks_qs.filter(status="COMPLETED").count()
                total_tasks = tasks_qs.exclude(status="CANCELLED").count()
                task_completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks else 0, 1)
            except Exception as exc:
                logger.exception("Analytics housekeeping query failed: %s", exc)
                task_completion_rate = 0.0

            try:
                review_qs = ReviewForumPost.objects.filter(branch__in=branches_qs, rating__gt=0)
                avg_rating = review_qs.aggregate(avg=Avg("rating")).get("avg")
                average_review_rating = round(float(avg_rating or 0), 1)
                for rating in range(5, 0, -1):
                    count = review_qs.filter(rating=rating).count()
                    rating_distribution.append(
                        {
                            "rating": rating,
                            "label": f"{rating}★",
                            "count": int(count),
                        }
                    )
            except Exception as exc:
                logger.exception("Analytics review query failed: %s", exc)
                average_review_rating = 0.0

        except Exception as exc:
            logger.exception("Analytics dashboard failed: %s", exc)

        return {
            "businessFilter": business_id or "all",
            "branchFilter": branch_id or "all",
            "businessOptions": business_filters,
            "branchOptions": branch_filters,
            "totalRevenue": int(total_revenue or 0),
            "totalBookings": int(total_bookings or 0),
            "csatScore": float(average_review_rating or 0),
            "housekeepingCompletionRate": float(task_completion_rate or 0),
            "monthlyRevenue": monthly_revenue,
            "monthlyBookings": monthly_bookings,
            "bookingStatusBreakdown": booking_status_breakdown,
            "paymentMethodBreakdown": payment_method_breakdown,
            "roomStatusBreakdown": room_status_breakdown,
            "revenueMix": revenue_mix,
            "ratingDistribution": rating_distribution,
            "occupancyRate": float(occupancy_rate or 0),
            "filterLabel": "Portfolio",
            "period": period_key,
            "periodLabel": (
                "Last 4 quarters"
                if period_key == "quarter"
                else "Last 3 years"
                if period_key == "year"
                else f"Last {months} months"
            ),
        }
