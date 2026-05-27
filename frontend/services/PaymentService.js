import Apis, {endpoints} from '../configuration/Apis';

const useMock = () => Boolean(process.env.EXPO_PRIVATE_MOCK);

const networkDelay = (ms = 1200) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const processPayment = async (payload) => {
    if (useMock()) {
        await networkDelay();
        const isSuccess = Math.random() > 0.2;
        if (isSuccess) {
            return {
                success: true,
                data: {
                    id: `payment-${Date.now()}`,
                    bookingId: payload.bookingId,
                    amount: payload.amount,
                    paymentMethod: payload.paymentMethod,
                    status: 'SUCCESS',
                    transactionId: `TXN${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    processedAt: new Date().toISOString(),
                },
            };
        }
        return {success: false, error: 'Payment processing failed. Please try again.'};
    }
    try {
        const response = await Apis.post(endpoints.process_payment, payload);
        if (response.data?.success) {
            return {success: true, data: response.data};
        }
        return {success: false, error: response.data?.message || 'Payment processing failed'};
    } catch (err) {
        return {success: false, error: err.response?.data?.message || err.message};
    }
};

export const verifyPayment = async (transactionId) => {
    if (useMock()) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {success: true, data: {transactionId, status: 'SUCCESS', verifiedAt: new Date().toISOString()}};
    }
    try {
        const response = await Apis.post(`${endpoints.verify_payment}/${transactionId}/verify/`);
        if (response.data?.status === 'SUCCESS') {
            return {success: true, data: response.data};
        }
        return {success: false, error: 'Failed to verify payment'};
    } catch (err) {
        return {success: false, error: err.response?.data?.message || err.message};
    }
};

export const refundPayment = async (transactionId, reason = '') => {
    if (useMock()) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return {success: true, data: {refundId: `REFUND-${Date.now()}`, transactionId, status: 'PROCESSED', reason}};
    }
    try {
        const response = await Apis.post(`${endpoints.refund_payment}/${transactionId}/refund/`, {reason});
        if (response.data?.status === 'REFUNDED') {
            return {success: true, data: response.data};
        }
        return {success: false, error: 'Failed to process refund'};
    } catch (err) {
        return {success: false, error: err.response?.data?.message || err.message};
    }
};

export const formatAmount = (amount) => {
    const formatter = new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND', minimumFractionDigits: 0});
    return formatter.format(amount);
};
