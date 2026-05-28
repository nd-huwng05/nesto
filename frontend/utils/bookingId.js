import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_BOOKING_SEQUENCE_KEY = 'customer_booking_id_sequence_v1';
const CANONICAL_BOOKING_ID_PATTERN = /^BK-\d{6}$/i;
const LEGACY_BOOKING_ID_PATTERN = /^#?BK[-\s]?(\d{1,12})$/i;
const NUMERIC_BOOKING_ID_PATTERN = /^\d+$/;

const formatBookingNumber = (numberText) => {
    const digits = String(numberText || '').replace(/\D/g, '');
    if (!digits) return '';

    const minLength = Math.max(6, digits.length);
    return `BK-${digits.padStart(minLength, '0')}`;
};

export const normalizeBookingId = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '';

    if (CANONICAL_BOOKING_ID_PATTERN.test(raw)) {
        return raw.toUpperCase();
    }

    const legacy = raw.match(LEGACY_BOOKING_ID_PATTERN);
    if (legacy) {
        return formatBookingNumber(legacy[1]);
    }

    if (NUMERIC_BOOKING_ID_PATTERN.test(raw)) {
        return formatBookingNumber(raw);
    }

    return '';
};

export const displayBookingId = (value) => {
    const normalized = normalizeBookingId(value);
    if (normalized) return normalized;
    return String(value || '').trim();
};

export const nextLocalBookingId = async () => {
    const raw = await AsyncStorage.getItem(LOCAL_BOOKING_SEQUENCE_KEY);
    const current = Number.parseInt(String(raw || '0'), 10);
    const nextValue = Number.isFinite(current) && current > 0 ? current + 1 : 1;

    await AsyncStorage.setItem(LOCAL_BOOKING_SEQUENCE_KEY, String(nextValue));
    return `BK-${String(nextValue).padStart(6, '0')}`;
};
