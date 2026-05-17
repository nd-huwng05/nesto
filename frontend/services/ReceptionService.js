import Apis, {endpoints} from '../configuration/Apis';
import {staffPortalMockStore} from './staffPortalMockStore';

const useMock = () => Boolean(process.env.EXPO_PRIVATE_MOCK);

const networkDelay = (minMs = 500, maxMs = 800) => {
    const ms = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const fetchBookingDetails = async (bookingId) => {
    await networkDelay();

    if (useMock()) {
        const data = await staffPortalMockStore.getBookingDetails(bookingId);
        if (!data) return {status: 'error', message: 'Booking not found'};
        return {status: 'success', data};
    }

    try {
        const response = await Apis.get(`${endpoints['get_booking']}/${bookingId}`);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load booking'};
    }
};

export const confirmCheckIn = async (bookingId) => {
    await networkDelay();

    if (useMock()) {
        try {
            const data = await staffPortalMockStore.confirmCheckIn(bookingId);
            return {status: 'success', data, message: 'Guest checked in successfully'};
        } catch (err) {
            return {status: 'error', message: err.message || 'Check-in failed'};
        }
    }

    try {
        const response = await Apis.post(`${endpoints['check_in_booking']}/${bookingId}/check-in`);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Check-in failed'};
    }
};

export const processPaymentAndCheckOut = async (bookingId, method) => {
    await networkDelay();

    if (useMock()) {
        try {
            const data = await staffPortalMockStore.processPaymentAndCheckOut(bookingId, method);
            return {status: 'success', data, message: 'Payment processed. Guest checked out.'};
        } catch (err) {
            return {status: 'error', message: err.message || 'Checkout failed'};
        }
    }

    try {
        const response = await Apis.post(
            `${endpoints['check_in_booking']}/${bookingId}/check-out`,
            {paymentMethod: method}
        );
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Checkout failed'};
    }
};

export const createStaffBooking = async (payload) => {
    await networkDelay();

    if (useMock()) {
        try {
            const data = await staffPortalMockStore.createBooking(payload);
            return {status: 'success', data, message: 'Booking created'};
        } catch (err) {
            return {status: 'error', message: err.message || 'Unable to create booking'};
        }
    }

    try {
        const response = await Apis.post(endpoints['create_booking'] || '/reception/bookings', payload);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to create booking'};
    }
};

export const addBookingExtraService = async (bookingId, serviceKey) => {
    await networkDelay(300, 500);

    if (useMock()) {
        try {
            const data = await staffPortalMockStore.addExtraService(bookingId, serviceKey);
            return {status: 'success', data};
        } catch (err) {
            return {status: 'error', message: err.message || 'Unable to add service'};
        }
    }

    try {
        const response = await Apis.post(
            `${endpoints['get_booking']}/${bookingId}/services`,
            {serviceKey}
        );
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to add service'};
    }
};

/** @deprecated Use confirmCheckIn / processPaymentAndCheckOut */
export const processPaymentAndCheckIn = processPaymentAndCheckOut;
