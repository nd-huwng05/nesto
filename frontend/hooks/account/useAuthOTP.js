import { useState, useCallback } from 'react';
import {sendBusinessOTP, sendOTP, verifyBusinessOtp, verifyOtp} from '../../services/AuthService';
import { getErrorMessage } from '../../utils/authErrors';

export const useAuthOTP = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSendOTP = useCallback(async (email) => {
        setLoading(true);
        setError(null);
        try {
            await sendOTP(email);
            return { success: true };
        } catch (err) {
            console.error("API Error: ", err.response?.data || err.message);
            const message = getErrorMessage(err, 'Failed to send verification code.');
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleVerifyOTP = useCallback(async (email, otpCode) => {
        setLoading(true);
        setError(null);
        try {
            await verifyOtp(email, otpCode);
            return { success: true };
        } catch (err) {
            console.error("API Error: ", err.response?.data || err.message);
            const message = getErrorMessage(err, 'Incorrect verification code.');
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSendBusinessOTP = useCallback(async (email) => {
        setLoading(true);
        setError(null);
        try {
            await sendBusinessOTP(email);
            return { success: true };
        } catch (err) {
            console.error('API Error: ', err.response?.data || err.message);
            const message = getErrorMessage(err, 'Failed to send verification code.');
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleVerifyBusinessOTP = useCallback(async (email, otpCode) => {
        setLoading(true);
        setError(null);
        try {
            await verifyBusinessOtp(email, otpCode);
            return { success: true };
        } catch (err) {
            console.error('API Error: ', err.response?.data || err.message);
            const message = getErrorMessage(err, 'Incorrect verification code.');
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        handleSendOTP,
        handleVerifyOTP,
        handleSendBusinessOTP,
        handleVerifyBusinessOTP,
        loading,
        error,
        setError,
    };
};
