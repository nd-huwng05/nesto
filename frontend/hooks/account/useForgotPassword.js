import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { forgotPassword } from '../../services/AuthService';
import { getErrorMessage } from '../../utils/authErrors';

export const useForgotPassword = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const submitResetRequest = useCallback(async (email) => {
        setIsLoading(true);
        try {
            const response = await forgotPassword(email);
            setIsSubmitted(true);
            const message = response?.data?.message || response?.data?.detail || 'If an account exists, a reset link has been sent to your email.';
            Alert.alert('Request sent', message);
            return {
                success: true,
                message,
            };
        } catch (err) {
            console.error("API Error: ", err.response?.data || err.message);
            const message = getErrorMessage(err, 'Unable to process your request.');
            Alert.alert('Request failed', message);
            return { success: false, message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { submitResetRequest, isLoading, isSubmitted };
};
