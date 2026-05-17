import {useState, useCallback} from 'react';
import {Alert} from 'react-native';
import {requestPasswordReset} from '../../services/AuthService';
import {getErrorMessage} from '../../utils/authErrors';

export const useForgotPassword = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const submitResetRequest = useCallback(async (email) => {
        setIsLoading(true);
        try {
            const response = await requestPasswordReset(email);
            setIsSubmitted(true);
            return {
                success: true,
                message:
                    response?.message ||
                    'If an account exists, a reset link has been sent to your email.',
            };
        } catch (err) {
            const message = getErrorMessage(err, 'Unable to process your request.');
            Alert.alert('Request failed', message);
            return {success: false, message};
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {submitResetRequest, isLoading, isSubmitted};
};
