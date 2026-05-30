import api, {endpoints} from '../configuration/Apis';
import {extractApiErrorMessage} from '../utils/apiError';
import {pickResults} from '../utils/apiShape';

const ok = (response, dataOverride = undefined) => ({
    status: 'success',
    data: dataOverride === undefined ? response?.data : dataOverride,
});

const fail = (err, fallback) => ({
    status: 'error',
    message: extractApiErrorMessage(err, fallback),
    data: err?.response?.data || null,
});

const pickList = pickResults;

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
        return ok(response, normalizePaymentGatewayData(response.data));
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
        return ok(response, normalizePaymentGatewayData(response.data));
    } catch (err) {
        return fail(err, 'Unable to start ZaloPay payment.');
    }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizePaymentGatewayData = (data = {}) => ({
    sandbox: Boolean(data.sandbox),
    pay_url: String(data.pay_url || data.payUrl || '').trim(),
    return_url: String(data.return_url || data.returnUrl || '').trim(),
    deposit_paid: Boolean(data.deposit_paid ?? data.depositPaid),
    checkout_session_id: String(data.checkout_session_id || data.checkoutSessionId || '').trim(),
    booking_id: String(data.booking_id || data.bookingId || '').trim(),
    order_id: String(data.order_id || data.orderId || '').trim(),
    amount: Number(data.amount || 0),
    provider: String(data.provider || '').trim(),
});

export const completeCheckoutPayment = async (checkoutSessionId, {amount, payment_method} = {}) => {
    try {
        const response = await api.post(endpoints['payment-checkout-complete'](checkoutSessionId), {
            amount,
            payment_method: payment_method || 'sandbox',
        });
        return ok(response, response.data);
    } catch (err) {
        return fail(err, 'Unable to complete checkout payment.');
    }
};

export const fetchPaymentStatus = async (sessionId) => {
    try {
        const response = await api.get(endpoints['payment-status'](sessionId));
        return ok(response, response.data);
    } catch (err) {
        return fail(err, 'Unable to check payment status.');
    }
};

export const syncBookingPayment = async (sessionId) => {
    try {
        const response = await api.post(endpoints['payment-sync'](sessionId));
        return ok(response, response.data);
    } catch (err) {
        return fail(err, 'Unable to sync payment with the server.');
    }
};

export const pollPaymentUntilConfirmed = async (
    sessionId,
    {maxAttempts = 30, intervalMs = 2000} = {}
) => {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const result = await fetchPaymentStatus(sessionId);
        if (result.status === 'success' && result.data?.deposit_paid) {
            return {confirmed: true, data: result.data};
        }
        if (attempt < maxAttempts - 1) {
            await sleep(intervalMs);
        }
    }
    return {confirmed: false, data: null};
};
