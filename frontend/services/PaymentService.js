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

export const fetchInvoices = async (params = {}) => {
    try {
        const response = await api.get(endpoints['invoices'], {params});
        return ok(response, pickList(response.data));
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load invoices.');
    }
};

export const fetchInvoice = async (id) => {
    try {
        const response = await api.get(endpoints['invoice-detail'](id));
        return ok(response, response.data);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load invoice.');
    }
};

export const createInvoice = async (data) => {
    try {
        const response = await api.post(endpoints['invoices'], data);
        return ok(response, response.data);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to create invoice.');
    }
};

export const updateInvoice = async (id, data) => {
    try {
        const response = await api.patch(endpoints['invoice-detail'](id), data);
        return ok(response, response.data);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to update invoice.');
    }
};

export const fetchTransactions = async (params = {}) => {
    try {
        const response = await api.get(endpoints['transactions'], {params});
        return ok(response, pickList(response.data));
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load transactions.');
    }
};

export const createTransaction = async (data) => {
    try {
        const response = await api.post(endpoints['transactions'], data);
        return ok(response, response.data);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to create transaction.');
    }
};

export const initiateMomoPayment = async ({
    bookingId,
    bookingData,
    selectedServices = [],
    depositPercentage = 20,
    amount,
    orderInfo,
} = {}) => {
    try {
        const response = await api.post(endpoints['payments-momo'], {
            booking_id: bookingId,
            booking_data: bookingData,
            selected_services: selectedServices,
            deposit_percentage: depositPercentage,
            amount,
            order_info: orderInfo,
        });
        return ok(response, response.data);
    } catch (err) {
        return fail(err, 'Unable to start MoMo payment.');
    }
};

export const initiateZaloPayPayment = async ({
    bookingId,
    bookingData,
    selectedServices = [],
    depositPercentage = 20,
    amount,
    orderInfo,
} = {}) => {
    try {
        const response = await api.post(endpoints['payments-zalopay'], {
            booking_id: bookingId,
            booking_data: bookingData,
            selected_services: selectedServices,
            deposit_percentage: depositPercentage,
            amount,
            order_info: orderInfo,
        });
        return ok(response, response.data);
    } catch (err) {
        return fail(err, 'Unable to start ZaloPay payment.');
    }
};

export const fetchPaymentStatus = async (bookingId) => {
    try {
        const response = await api.get(endpoints['payment-status'](bookingId));
        return ok(response, response.data);
    } catch (err) {
        return fail(err, 'Unable to check payment status.');
    }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const pollPaymentUntilConfirmed = async (
    bookingId,
    {maxAttempts = 30, intervalMs = 2000} = {}
) => {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const result = await fetchPaymentStatus(bookingId);
        if (result.status === 'success' && result.data?.depositPaid) {
            return {confirmed: true, data: result.data};
        }
        if (attempt < maxAttempts - 1) {
            await sleep(intervalMs);
        }
    }
    return {confirmed: false, data: null};
};
