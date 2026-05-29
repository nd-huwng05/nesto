import {parseStaffDisplayDate} from './staffBookingOps';

const MONTH_MAP = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
};

/** Parse "15h00' 10 Jul 2026" → Date */
export function parseStaffDisplayDateTime(str) {
    const withTime = String(str || '').match(
        /(\d{1,2})h(\d{2})'\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/
    );
    if (withTime) {
        const month = MONTH_MAP[withTime[4].toLowerCase()];
        if (month !== undefined) {
            return new Date(
                parseInt(withTime[5], 10),
                month,
                parseInt(withTime[3], 10),
                parseInt(withTime[1], 10),
                parseInt(withTime[2], 10),
                0,
                0
            );
        }
    }
    const dateOnly = parseStaffDisplayDate(str);
    return dateOnly;
}

export function getExpectedCheckOutDate(booking) {
    if (booking?.expectedCheckOutAt) {
        const d = new Date(booking.expectedCheckOutAt);
        if (!Number.isNaN(d.getTime())) return d;
    }
    return parseStaffDisplayDateTime(booking?.checkOutTime);
}

export function getHourlyRateForBooking(booking) {
    const rate = Number(booking?.hourlyRate);
    if (rate > 0) return rate;
    return 50_000;
}

/**
 * Overtime rounded up to the nearest 0.5 hour (standard hotel rule).
 */
export function calculateOvertimeCharge(booking, asOf = new Date()) {
    const expected = getExpectedCheckOutDate(booking);
    if (!expected) {
        return {hours: 0, amount: 0, hoursLabel: ''};
    }

    const now = asOf instanceof Date ? asOf : new Date(asOf);
    if (now.getTime() <= expected.getTime()) {
        return {hours: 0, amount: 0, hoursLabel: ''};
    }

    const diffMs = now.getTime() - expected.getTime();
    const rawHours = diffMs / (1000 * 60 * 60);
    const overtimeHours = Math.ceil(rawHours * 2) / 2;
    const hourlyRate = getHourlyRateForBooking(booking);
    const amount = Math.round(overtimeHours * hourlyRate);
    const hoursLabel =
        overtimeHours === 0.5
            ? '0.5 hour'
            : overtimeHours === 1
              ? '1 hour'
              : `${overtimeHours} hours`;

    return {hours: overtimeHours, amount, hoursLabel};
}

export function computeCheckoutTotals({
    roomSubtotal,
    serviceTotal = 0,
    overtimeAmount = 0,
    depositPaid = 0,
}) {
    const grossTotal = roomSubtotal + serviceTotal + overtimeAmount;
    const finalPayment = Math.max(0, grossTotal - depositPaid);

    return {
        subtotal: grossTotal,
        grossTotal,
        depositPaid,
        finalPayment,
    };
}
