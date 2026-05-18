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

export function toDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function parseStaffDisplayDate(str) {
    const match = String(str || '').match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    if (!match) return null;
    const month = MONTH_MAP[match[2].toLowerCase()];
    if (month === undefined) return null;
    return new Date(parseInt(match[3], 10), month, parseInt(match[1], 10));
}

export function getBookingArrivalKey(booking) {
    if (booking.arrivalDate) return booking.arrivalDate;
    if (booking.checkedInAt) return toDateKey(booking.checkedInAt);
    const parsed = parseStaffDisplayDate(booking.checkInTime);
    return parsed ? toDateKey(parsed) : null;
}

export function getBookingDepartureKey(booking) {
    if (booking.departureDate) return booking.departureDate;
    const parsed = parseStaffDisplayDate(booking.checkOutTime);
    return parsed ? toDateKey(parsed) : null;
}

export function bookingMatchesDate(booking, dateKey) {
    if (!dateKey) return true;
    const arrival = getBookingArrivalKey(booking);
    const departure = getBookingDepartureKey(booking);
    if (!arrival && !departure) return true;
    if (arrival === dateKey || departure === dateKey) return true;
    if (arrival && departure && arrival <= dateKey && dateKey <= departure) return true;
    return false;
}

export function getOperationalBadges(booking, dateKey) {
    const badges = [];
    const arrival = getBookingArrivalKey(booking);
    const departure = getBookingDepartureKey(booking);
    if (arrival === dateKey) badges.push('Check-in Today');
    if (departure === dateKey) badges.push('Check-out Today');
    return badges;
}

export function buildDateStripe(centerDate, radius = 3) {
    const days = [];
    const base = new Date(centerDate);
    base.setHours(12, 0, 0, 0);
    for (let offset = -radius; offset <= radius; offset += 1) {
        const d = new Date(base);
        d.setDate(base.getDate() + offset);
        days.push({
            key: toDateKey(d),
            date: d,
            weekday: d.toLocaleDateString('en-GB', {weekday: 'short'}),
            dayNum: d.getDate(),
            month: d.toLocaleDateString('en-GB', {month: 'short'}),
        });
    }
    return days;
}
