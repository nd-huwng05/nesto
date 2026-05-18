import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import Apis from '../configuration/Apis';
import { getPaymentErrorMessage, getErrorMessage } from '../utils/authErrors';

export const usePayment = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null);

    /**
     * Process payment for booking
     * @param {Object} paymentPayload - Payment details
     * @returns {Object} - {success, data, error}
     */
    const processPayment = useCallback(async (paymentPayload) => {
        setIsLoading(true);
        try {
            const {
                bookingId,
                amount,
                currency = 'VND',
                paymentMethod,
                customerInfo = {},
            } = paymentPayload;

            if (!bookingId || !amount || !paymentMethod) {
                return {
                    success: false,
                    error: 'Missing required payment information',
                };
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

            // Mock payment processing
            if (process.env.EXPO_PUBLIC_MOCK === 'true' || !process.env.EXPO_PUBLIC_BASE_URL) {
                await new Promise((resolve) => setTimeout(resolve, 1200));

                // Simulate payment success (80% success rate for demo)
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
                    setPaymentStatus('completed');
                    return { success: true, data: mockResult };
                } else {
                    setPaymentStatus('failed');
                    return {
                        success: false,
                        error: 'Payment processing failed. Please try again.',
                    };
                }
            }

            // Real API call
            const response = await Apis.post('/payment/process', payload);
            if (response.data?.status === 'success') {
                setPaymentStatus('completed');
                return { success: true, data: response.data.data };
            }

            setPaymentStatus('failed');
            return {
                success: false,
                error: response.data?.message || 'Payment processing failed',
            };
        } catch (err) {
            setPaymentStatus('failed');
            const errorMessage = getPaymentErrorMessage(
                err,
                'An error occurred while processing payment'
            );
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Verify payment status
     * @param {string} transactionId - Transaction ID to verify
     * @returns {Object} - {success, data, error}
     */
    const verifyPayment = useCallback(async (transactionId) => {
        setIsLoading(true);
        try {
            // Mock verification
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
                setPaymentStatus(response.data.data?.status || 'completed');
                return { success: true, data: response.data.data };
            }

            return { success: false, error: 'Failed to verify payment' };
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to verify payment');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Refund a payment
     * @param {string} transactionId - Transaction ID to refund
     * @param {string} reason - Reason for refund
     * @returns {Object} - {success, data, error}
     */
    const refundPayment = useCallback(async (transactionId, reason = '') => {
        setIsLoading(true);
        try {
            // Mock refund
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
                setPaymentStatus('refunded');
                return { success: true, data: response.data.data };
            }

            return { success: false, error: 'Failed to process refund' };
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to process refund');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Validate payment method
     * @param {string} paymentMethod - Payment method to validate
     * @returns {boolean}
     */
    const isValidPaymentMethod = (paymentMethod) => {
        const validMethods = ['momo', 'zalo', 'card', 'bank_transfer', 'cod'];
        return validMethods.includes(paymentMethod);
    };

    /**
     * Format amount with currency
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code
     * @returns {string}
     */
    const formatAmount = (amount, currency = 'VND') => {
        const formatter = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
        });
        return formatter.format(amount);
    };

    /**
     * Reset payment status
     */
    const resetPaymentStatus = useCallback(() => {
        setPaymentStatus(null);
    }, []);

    return {
        isLoading,
        paymentStatus,
        processPayment,
        verifyPayment,
        refundPayment,
        isValidPaymentMethod,
        formatAmount,
        resetPaymentStatus,
    };
};
