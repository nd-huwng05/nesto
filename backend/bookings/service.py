from django.db import transaction

from .models import Booking, BookingSequence

BOOKING_SEQUENCE_KEY = 'booking_id'
BOOKING_PREFIX = 'BK'
BOOKING_PADDING = 6


def format_booking_id(number: int) -> str:
    return f"{BOOKING_PREFIX}-{number:0{BOOKING_PADDING}d}"


@transaction.atomic
def next_booking_identity() -> tuple[int, str]:
    sequence, _ = BookingSequence.objects.select_for_update().get_or_create(
        key=BOOKING_SEQUENCE_KEY,
        defaults={'last_value': 0},
    )
    sequence.last_value += 1
    sequence.save(update_fields=['last_value', 'updated_at'])

    return sequence.last_value, format_booking_id(sequence.last_value)


@transaction.atomic
def create_booking(**booking_fields) -> Booking:
    booking_number, booking_id = next_booking_identity()
    return Booking.objects.create(
        booking_number=booking_number,
        booking_id=booking_id,
        **booking_fields,
    )
