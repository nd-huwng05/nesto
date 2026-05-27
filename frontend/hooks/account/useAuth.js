import { useState, useCallback } from 'react';
import { Alert, Vibration } from 'react-native';
import { login as loginApi, loginWithGoogle as loginWithGoogleApi } from '../../services/AuthService';
import { saveSession } from '../../utils/authStorage';

export const useAuth = () => {
    const [isLoading, setIsLoading] = useState(false);

    const login = useCallback(async (email, password) => {
        setIsLoading(true);
        try {
            const response = await loginApi(email, password);
            const token = response?.data?.access_token;
            const user = response?.data?.user;

            if ((response?.status === 'success' || response?.status === 200) && token) {
                await saveSession(token, user);
                return { success: true, data: response.data, user };
            }

            const message = 'Login failed. Please check your credentials.';
            Alert.alert('Sign in failed', message);
            Vibration.vibrate([0, 100, 50, 100]);
            return { success: false, message };
        } catch (err) {
            const message = err?.message || 'Email or password is incorrect';
            Alert.alert('Sign in failed', message);
            Vibration.vibrate([0, 100, 50, 100]);
            return { success: false, message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loginWithGoogle = useCallback(async (idToken) => {
        setIsLoading(true);
        try {
            const response = await loginWithGoogleApi(idToken);
            const token = response?.data?.access_token;
            const user = response?.data?.user;

            if ((response?.status === 'success' || response?.status === 200) && token) {
                await saveSession(token, user);
                return { success: true, data: response.data, user };
            }

            const message = 'Google sign in failed.';
            Alert.alert('Sign in failed', message);
            Vibration.vibrate([0, 100, 50, 100]);
            return { success: false, message };
        } catch (err) {
            const message = err?.message || 'Google sign in failed. Please try again.';
            Alert.alert('Sign in failed', message);
            Vibration.vibrate([0, 100, 50, 100]);
            return { success: false, message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { login, loginWithGoogle, isLoading };
};
