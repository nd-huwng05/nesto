import { useState, useCallback } from 'react';
import { Alert, Vibration } from 'react-native';
import { login as loginApi } from '../../services/AuthService';
import { extractApiErrorMessage, getApiErrorAlertTitle } from '../../utils/apiError';

export const useAuth = () => {
    const [isLoading, setIsLoading] = useState(false);

    const login = useCallback(async (email, password) => {
        setIsLoading(true);
        try {
            const result = await loginApi(email, password);
            if (result.success && result.user) {
                return { success: true, user: result.user, token: result.token };
            }
            Alert.alert('Sign in failed', 'Unable to sign in. Please try again.');
            Vibration.vibrate([0, 100, 50, 100]);
            return { success: false, message: 'Login failed.' };
        } catch (err) {
            const message = extractApiErrorMessage(err, 'Email or password is incorrect.');
            console.error('API Error: ', err.response?.data || message);
            Alert.alert(getApiErrorAlertTitle(err, 'Sign in failed'), message);
            Vibration.vibrate([0, 100, 50, 100]);
            return { success: false, message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { login, isLoading };
};
