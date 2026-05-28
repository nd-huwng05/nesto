export function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseServiceDateLabel(value) {
    if (value instanceof Date && Number.isFinite(value.getTime())) {
        return startOfDay(value);
    }

    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'number') {
        return null;
    }

    const text = String(value || '').trim();
    if (!text || /^\d+$/.test(text)) {
        return null;
    }

    const parsedDirect = new Date(text);
    if (Number.isFinite(parsedDirect.getTime())) {
        return startOfDay(parsedDirect);
    }

    const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const day = Number.parseInt(slashMatch[1], 10);
        const month = Number.parseInt(slashMatch[2], 10) - 1;
        const year = Number.parseInt(slashMatch[3], 10);
        if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year) && month >= 0 && month <= 11) {
            return new Date(year, month, day);
        }
    }

    const textMatch = text.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    if (!textMatch) return null;

    const day = Number.parseInt(textMatch[1], 10);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames.findIndex((item) => item.toLowerCase() === textMatch[2].toLowerCase());
    const year = Number.parseInt(textMatch[3], 10);

    if (!Number.isFinite(day) || !Number.isFinite(year) || month < 0) return null;
    return new Date(year, month, day);
}

function pickFirstValidDate(candidates) {
    for (const candidate of candidates) {
        const parsed = parseServiceDateLabel(candidate);
        if (parsed) return parsed;
    }
    return null;
}

export function resolveBookingDateRange({
    bookingMinDateIso,
    bookingMaxDateIso,
    bookingStartDateIso,
    bookingEndDateIso,
    startDateIso,
    endDateIso,
    startDate,
    endDate,
    checkIn,
    checkOut,
}) {
    const rawBookingStartDate = pickFirstValidDate([
        bookingMinDateIso,
        bookingStartDateIso,
        startDateIso,
        startDate,
        checkIn,
    ]);

    const rawBookingEndDate = pickFirstValidDate([
        bookingMaxDateIso,
        bookingEndDateIso,
        endDateIso,
        endDate,
        checkOut,
    ]);

    let bookingStartDate = rawBookingStartDate ? startOfDay(rawBookingStartDate) : null;
    let bookingEndDate = rawBookingEndDate ? startOfDay(rawBookingEndDate) : null;

    // Defensive normalization: if upstream sends reversed dates, keep a valid bounded range.
    if (bookingStartDate && bookingEndDate && bookingEndDate < bookingStartDate) {
        const temp = bookingStartDate;
        bookingStartDate = bookingEndDate;
        bookingEndDate = temp;
    }

    const hasDateRange = Boolean(bookingStartDate && bookingEndDate);
    const minSelectableDate = bookingStartDate;
    const maxSelectableDate = bookingEndDate;

    return {
        bookingStartDate,
        bookingEndDate,
        hasDateRange,
        minSelectableDate,
        maxSelectableDate,
        resolvedBookingStartIso: minSelectableDate ? minSelectableDate.toISOString() : null,
        resolvedBookingEndIso: maxSelectableDate ? maxSelectableDate.toISOString() : null,
    };
}

export function parseServiceTimeToMinutes(value) {
    const text = String(value || '').trim();
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return (hour * 60) + minute;
}

function parseDurationMinutes(value) {
    const text = String(value || '').trim();
    const match = text.match(/(\d+)\s*min/i);
    if (!match) return null;

    const minutes = Number.parseInt(match[1], 10);
    if (!Number.isFinite(minutes) || minutes <= 0) return null;
    return minutes;
}

function inferServiceDurationMinutes(service) {
    if (!service || typeof service !== 'object') return 60;

    if (service.id === 'spa') {
        const details = Array.isArray(service.selectedSpaServices) ? service.selectedSpaServices : [];
        const total = details.reduce((sum, item) => {
            const parsed = parseDurationMinutes(item?.duration);
            return sum + (parsed || 0);
        }, 0);
        return total > 0 ? total : 60;
    }

    if (service.id === 'restaurant') {
        return 90;
    }

    if (service.id === 'airport_shuttle') {
        return 60;
    }

    return 60;
}

function toServiceTimeWindow(service) {
    const parsedDate = parseServiceDateLabel(service?.date);
    const startMinutes = parseServiceTimeToMinutes(service?.time);
    if (!parsedDate || startMinutes === null) return null;

    const start = startMinutes;
    const end = start + inferServiceDurationMinutes(service);

    return {
        id: String(service?.id || '').trim(),
        name: String(service?.name || 'Selected service').trim(),
        dateLabel: parsedDate.toISOString().slice(0, 10),
        start,
        end,
        rawDate: String(service?.date || '').trim(),
        rawTime: String(service?.time || '').trim(),
    };
}

export function findServiceScheduleConflict(services) {
    const valid = Array.isArray(services) ? services.filter((item) => item && typeof item === 'object') : [];

    for (let i = 0; i < valid.length; i += 1) {
        const first = toServiceTimeWindow(valid[i]);
        if (!first) continue;

        for (let j = i + 1; j < valid.length; j += 1) {
            const second = toServiceTimeWindow(valid[j]);
            if (!second) continue;
            if (first.dateLabel !== second.dateLabel) continue;

            const overlaps = first.start < second.end && second.start < first.end;
            if (!overlaps) continue;

            return {
                first,
                second,
            };
        }
    }

    return null;
}
