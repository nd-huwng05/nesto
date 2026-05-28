import {useCallback, useState} from 'react';
import {getErrorMessage} from '../../utils/authErrors';
import {createTransaction, fetchTransactions} from '../../services/PaymentService';

export const usePayment = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null);

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

            const res = await createTransaction(payload);
            if (res?.status === 'success') {
                setPaymentStatus('completed');
                return {success: true, data: res.data};
            }

            setPaymentStatus('failed');
            return {
                success: false,
                error: res?.message || 'Payment processing failed',
            };
        } catch (err) {
            setPaymentStatus('failed');
            return {success: false, error: getErrorMessage(err, 'An error occurred while processing payment')};
        } finally {
            setIsLoading(false);
        }
    }, []);

    const verifyPayment = useCallback(async (transactionId) => {
        setIsLoading(true);
        try {
            const res = await fetchTransactions({transactionId});
            if (res?.status !== 'success') return {success: false, error: res?.message || 'Failed to verify payment'};
            const row = Array.isArray(res.data) ? res.data[0] : null;
            const status = String(row?.status || 'completed');
            setPaymentStatus(status);
            return {success: true, data: row || {transactionId, status}};
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to verify payment');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const refundPayment = useCallback(async (transactionId, reason = '') => {
        setIsLoading(true);
        try {
            setPaymentStatus('failed');
            return {success: false, error: 'Refund is not supported by this backend.'};
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to process refund');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const isValidPaymentMethod = (paymentMethod) => {
        const validMethods = ['momo', 'zalo', 'card', 'bank_transfer', 'cod'];
        return validMethods.includes(paymentMethod);
    };

    const formatAmount = (amount, currency = 'VND') => {
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
        });
        return formatter.format(amount);
    };

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
