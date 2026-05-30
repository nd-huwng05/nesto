import React from 'react';
import { Alert } from 'react-native';
import { loginWithGoogle } from '../../services/AuthService';
import {
    isNativeGoogleSignInAvailable,
    signInWithGoogleNative,
} from '../../services/GoogleSignInService';
import { resetToHomeFlow } from '../../utils/navigation';

export const GOOGLE_SIGNIN_ENABLED =
    Boolean(process.env.EXPO_PUBLIC_WEB_CLIENT_ID) && isNativeGoogleSignInAvailable();

export const useGoogleAuth = (navigation) => {
    const [isLoading, setIsLoading] = React.useState(false);

    const login = async () => {
        if (!GOOGLE_SIGNIN_ENABLED) {
            Alert.alert(
                'Google Sign-In',
                'Tính năng đăng nhập Google cần build app dev (npx expo run:android / run:ios), không dùng Expo Go.'
            );
            return { success: false, error: 'not_supported' };
        }

        setIsLoading(true);
        try {
            const idToken = await signInWithGoogleNative();
            const result = await loginWithGoogle(idToken);
            if (result.status === 'success') {
                if (navigation) {
                    resetToHomeFlow(navigation);
                }
                return { success: true, data: result.data };
            }

            Alert.alert('Google Sign-In failed', result.message || 'Unable to sign in with Google.');
            return { success: false, error: result.message };
        } catch (error) {
            if (error?.code === 'cancelled') {
                return { success: false, error: 'cancelled' };
            }
            Alert.alert('Google Sign-In failed', error?.message || 'Unable to sign in with Google.');
            return { success: false, error: error?.message };
        } finally {
            setIsLoading(false);
        }
    };

    return { login, isLoading, googleTemporarilyDisabled: !GOOGLE_SIGNIN_ENABLED };
};
