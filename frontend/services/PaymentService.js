import Apis from '../configuration/Apis';
import { getPaymentErrorMessage, getErrorMessage } from '../utils/authErrors';

export const PaymentService = {
    async processPayment(paymentPayload) {
        try {
            const { bookingId, amount, currency = 'VND', paymentMethod, customerInfo = {} } =
                paymentPayload;

            if (!bookingId || !amount || !paymentMethod) {
                return { success: false, error: 'Missing required payment information' };
            }

            const payload = {
                bookingId,
                amount,
                currency,
                paymentMethod,
                customerEmail: customerInfo.email,
                customerPhone: customerInfo.phone,
                customerName: customerInfo.name,
                timestamp: new Date().toISOString(),
            };

            if (process.env.EXPO_PUBLIC_MOCK === 'true' || !process.env.EXPO_PUBLIC_BASE_URL) {
                await new Promise((resolve) => setTimeout(resolve, 1200));

                const isSuccess = Math.random() > 0.2;

                if (isSuccess) {
                    const mockResult = {
                        id: `payment-${Date.now()}`,
                        bookingId,
                        amount,
                        paymentMethod,
                        status: 'completed',
                        transactionId: `TXN${Math.random()
                            .toString(36)
                            .substr(2, 9)
                            .toUpperCase()}`,
                        processedAt: new Date().toISOString(),
                    };
                    return { success: true, data: mockResult };
                } else {
                    return { success: false, error: 'Payment processing failed. Please try again.' };
                }
            }

            const response = await Apis.post('/payment/process', payload);
            if (response.data?.status === 'success') {
                return { success: true, data: response.data.data };
            }

            return { success: false, error: response.data?.message || 'Payment processing failed' };
        } catch (err) {
            return {
                success: false,
                error: getPaymentErrorMessage(err, 'An error occurred while processing payment'),
            };
        }
    },

    async verifyPayment(transactionId) {
        try {
            if (process.env.EXPO_PUBLIC_MOCK === 'true' || !process.env.EXPO_PUBLIC_BASE_URL) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                return {
                    success: true,
                    data: {
                        transactionId,
                        status: 'completed',
                        verifiedAt: new Date().toISOString(),
                    },
                };
            }

            const response = await Apis.get(`/payment/verify/${transactionId}`);
            if (response.data?.status === 'success') {
                return { success: true, data: response.data.data };
            }

            return { success: false, error: 'Failed to verify payment' };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to verify payment') };
        }
    },

    async refundPayment(transactionId, reason = '') {
        try {
            if (process.env.EXPO_PUBLIC_MOCK === 'true' || !process.env.EXPO_PUBLIC_BASE_URL) {
                await new Promise((resolve) => setTimeout(resolve, 800));
                return {
                    success: true,
                    data: {
                        refundId: `REFUND-${Date.now()}`,
                        transactionId,
                        status: 'processed',
                        reason,
                    },
                };
            }

            const response = await Apis.post(`/payment/refund/${transactionId}`, { reason });
            if (response.data?.status === 'success') {
                return { success: true, data: response.data.data };
            }

            return { success: false, error: 'Failed to process refund' };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to process refund') };
        }
    },

    isValidPaymentMethod(paymentMethod) {
        const validMethods = ['momo', 'zalo', 'card', 'bank_transfer', 'cod'];
        return validMethods.includes(paymentMethod);
    },

    formatAmount(amount, currency = 'VND') {
        const formatter = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
        });
        return formatter.format(amount);
    },
};
