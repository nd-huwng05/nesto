import React from 'react';
import { Alert } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { loginWithGoogle } from '../../services/AuthService';
import {
    isExpoGo,
    isNativeGoogleSignInAvailable,
    signInWithGoogleNative,
} from '../../services/GoogleSignInService';
import { resetToHomeFlow } from '../../utils/navigation';

WebBrowser.maybeCompleteAuthSession();

const webClientId = process.env.EXPO_PUBLIC_WEB_CLIENT_ID || '';
const androidClientId = process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID || webClientId;
const iosClientId = process.env.EXPO_PUBLIC_IOS_CLIENT_ID || webClientId;

export const GOOGLE_SIGNIN_ENABLED =
    Boolean(webClientId) && (isExpoGo() || isNativeGoogleSignInAvailable());

export const useGoogleAuth = (navigation) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [expoRequest, , expoPromptAsync] = Google.useIdTokenAuthRequest({
        webClientId,
        androidClientId,
        iosClientId,
    });

    const loginWithExpoGoogle = async () => {
        if (!expoRequest) {
            Alert.alert(
                'Google Sign-In',
                'Chưa sẵn sàng. Kiểm tra EXPO_PUBLIC_WEB_CLIENT_ID trong frontend/.env và reload app (nhấn r).'
            );
            return { success: false, error: 'not_ready' };
        }

        const result = await expoPromptAsync();
        if (result?.type === 'cancel' || result?.type === 'dismiss') {
            return { success: false, error: 'cancelled' };
        }
        if (result?.type !== 'success') {
            Alert.alert('Google Sign-In', 'Đăng nhập Google không thành công. Thử lại hoặc dùng email/mật khẩu.');
            return { success: false, error: result?.type || 'failed' };
        }

        const idToken = result.params?.id_token;
        if (!idToken) {
            Alert.alert(
                'Google Sign-In',
                'Không nhận được token từ Google. Thêm redirect URI Expo vào Google Cloud Console (xem frontend/.env.example).'
            );
            return { success: false, error: 'no_token' };
        }

        const loginResult = await loginWithGoogle(idToken);
        if (loginResult.status === 'success') {
            if (navigation) {
                resetToHomeFlow(navigation);
            }
            return { success: true, data: loginResult.data };
        }

        Alert.alert('Google Sign-In failed', loginResult.message || 'Unable to sign in with Google.');
        return { success: false, error: loginResult.message };
    };

    const login = async () => {
        if (!GOOGLE_SIGNIN_ENABLED) {
            Alert.alert(
                'Google Sign-In',
                'Cấu hình EXPO_PUBLIC_WEB_CLIENT_ID trong frontend/.env để dùng Google.'
            );
            return { success: false, error: 'not_supported' };
        }

        setIsLoading(true);
        try {
            if (isExpoGo()) {
                return await loginWithExpoGoogle();
            }

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

    const googleTemporarilyDisabled = !GOOGLE_SIGNIN_ENABLED;

    return { login, isLoading, googleTemporarilyDisabled };
};
