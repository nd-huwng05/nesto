import { useState, useCallback } from 'react';
import { Alert, Vibration } from 'react-native';
import { login as loginApi } from '../../services/AuthService';

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
            console.error("API Error: ", err.response?.data || err.message);
            const message = err?.message || 'Email or password is incorrect.';
            Alert.alert('Sign in failed', message);
            Vibration.vibrate([0, 100, 50, 100]);
            return { success: false, message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { login, isLoading };
};
