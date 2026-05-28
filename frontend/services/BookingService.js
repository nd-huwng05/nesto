import api, {endpoints} from '../configuration/Apis';
import {extractApiErrorMessage} from '../utils/apiError';

const ok = (response, dataOverride = undefined) => ({
    status: 'success',
    data: dataOverride === undefined ? response?.data : dataOverride,
});

const fail = (err, fallback) => ({
    status: 'error',
    message: extractApiErrorMessage(err, fallback),
    data: err?.response?.data || null,
});

const pickList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export const fetchBookings = async (params = {}) => {
    try {
        const response = await api.get(endpoints['bookings'], {params});
        return ok(response, pickList(response.data));
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load bookings.');
    }
};

export const fetchBooking = async (id) => {
    try {
        const response = await api.get(endpoints['booking-detail'](id));
        return ok(response, response.data);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load booking.');
    }
};

export const createBooking = async (data) => {
    try {
        const response = await api.post(endpoints['bookings'], data);
        return ok(response, response.data);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to create booking.');
    }
};

export const updateBooking = async (id, data) => {
    try {
        const response = await api.patch(endpoints['booking-detail'](id), data);
        return ok(response, response.data);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to update booking.');
    }
};

export const deleteBooking = async (id) => {
    try {
        const response = await api.delete(endpoints['booking-detail'](id));
        return ok(response, null);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to delete booking.');
    }
};
