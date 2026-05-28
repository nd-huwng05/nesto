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

export const fetchBranches = async () => {
    try {
        const response = await api.get(endpoints['branches'], {params: {is_active: true}});
        return ok(response, pickList(response.data));
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load branches.');
    }
};

export const fetchBranch = async (id) => {
    try {
        const response = await api.get(endpoints['branch-detail'](id));
        return ok(response, response.data);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load branch.');
    }
};

export const fetchRoomTypes = async (branchId) => {
    try {
        const response = await api.get(endpoints['room-types'], {params: {branch_id: branchId}});
        return ok(response, pickList(response.data));
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load room types.');
    }
};

export const fetchBookings = async (customerId) => {
    try {
        const response = await api.get(endpoints['bookings'], {params: {customer: customerId}});
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
