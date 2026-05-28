import {CustomerService} from './CustomerService';

const normalizeBookingId = (value) => String(value || '').trim().toUpperCase().replace(/^#/, '');

const parseDateToIso = (value) => {
    if (!value) return null;
    const text = String(value).trim();
    if (!text) return null;

    const slash = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
        const day = Number.parseInt(slash[1], 10);
        const month = Number.parseInt(slash[2], 10);
        const year = Number.parseInt(slash[3], 10);
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) {
        const year = Number.parseInt(iso[1], 10);
        const month = Number.parseInt(iso[2], 10);
        const day = Number.parseInt(iso[3], 10);
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return null;
    const year = parsed.getFullYear();
    const month = parsed.getMonth() + 1;
    const day = parsed.getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const getSnapshotId = (record, snapshotType) => {
    const bookingId = normalizeBookingId(record?.bookingId || record?.id);
    const hotelKey = String(record?.hotelName || record?.roomCode || 'HOTEL')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .slice(0, 24);

    if (bookingId) return `SNAP_${snapshotType.toUpperCase()}_${bookingId}`;
    return `SNAP_${snapshotType.toUpperCase()}_${hotelKey}`;
};

const amountValue = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Number(parsed.toFixed(2)));
};

export const syncBookingSnapshotRecord = async (record, snapshotType = 'upcoming') => {
    if (!record || typeof record !== 'object') return {success: false, reason: 'invalid-record'};

    const snapshotId = getSnapshotId(record, snapshotType);
    const checkInDateIso = parseDateToIso(record?.checkInDateIso || record?.checkInAt || record?.checkIn);
    const checkOutDateIso = parseDateToIso(record?.checkOutDateIso || record?.checkOutAt || record?.checkOut);

    const payload = {
        snapshot_id: snapshotId,
        snapshot_type: snapshotType,
        bookingId: String(record?.bookingId || '').trim(),
        hotelName: String(record?.hotelName || record?.roomCode || '').trim(),
        roomName: String(record?.roomName || '').trim(),
        checkIn: String(record?.checkInLabel || record?.checkIn || '').trim(),
        checkOut: String(record?.checkOutLabel || record?.checkOut || '').trim(),
        checkInDateIso: checkInDateIso,
        checkOutDateIso: checkOutDateIso,
        actionLabel: String(record?.actionLabel || '').trim(),
        actionColor: String(record?.actionColor || '').trim(),
        paymentStatus: String(record?.paymentStatus || '').trim(),
        paymentMethod: String(record?.paymentMethod || '').trim(),
        customerName: String(record?.customerName || record?.guestName || '').trim(),
        customerEmail: String(record?.customerEmail || '').trim().toLowerCase(),
        total_amount: amountValue(record?.totalAmount ?? record?.invoiceDetails?.totalAmount),
        paid_amount: amountValue(record?.paidAmount ?? record?.invoiceDetails?.paidAmount),
        remaining_amount: amountValue(record?.remainingAmount ?? record?.invoiceDetails?.remainingAmount),
        deposit_amount: amountValue(record?.depositAmount ?? record?.invoiceDetails?.depositAmount),
        subtotal_price: amountValue(record?.subtotalPrice ?? record?.invoiceDetails?.subtotalPrice),
        vat_amount: amountValue(record?.vatAmount ?? record?.invoiceDetails?.vatAmount),
        selectedServices: Array.isArray(record?.selectedServices) ? record.selectedServices : [],
        invoiceDetails: record?.invoiceDetails || null,
        paidAt: record?.paidAt || null,
        source: 'mobile-app',
    };

    return CustomerService.upsertBookingSnapshot(snapshotId, payload);
};
