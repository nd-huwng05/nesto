import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import React from 'react';
import { Alert, Platform } from 'react-native';
import { loginWithGoogle as loginWithGoogleApi } from '../../services/AuthService';

WebBrowser.maybeCompleteAuthSession();

export const useGoogleAuth = () => {
    const androidClientId = process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID;
    const iosClientId = process.env.EXPO_PUBLIC_IOS_CLIENT_ID;
    const webClientId = process.env.EXPO_PUBLIC_WEB_CLIENT_ID;

    const hasAndroidClientId = Platform.OS !== 'android' || Boolean(androidClientId);
    const hasIosClientId = Platform.OS !== 'ios' || Boolean(iosClientId);
    const hasGoogleAuthConfig = hasAndroidClientId && hasIosClientId && Boolean(webClientId);

    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: androidClientId || 'missing-android-client-id.apps.googleusercontent.com',
        iosClientId: iosClientId || 'missing-ios-client-id.apps.googleusercontent.com',
        webClientId: webClientId || 'missing-web-client-id.apps.googleusercontent.com',
    });

    const [isLoading, setIsLoading] = React.useState(false);

    const login = async () => {
        if (!hasGoogleAuthConfig) {
            const missing = [
                !androidClientId && 'EXPO_PUBLIC_ANDROID_CLIENT_ID',
                !iosClientId && 'EXPO_PUBLIC_IOS_CLIENT_ID',
                !webClientId && 'EXPO_PUBLIC_WEB_CLIENT_ID',
            ].filter(Boolean);

            Alert.alert(
                'Google Auth config missing',
                `Please set ${missing.join(', ')} in frontend/.env and restart Expo.`
            );
            return { success: false, error: 'Missing config' };
        }

        setIsLoading(true);
        try {
            const result = await promptAsync({ showInRecents: true });
            if (result?.type === 'success' && result?.authentication?.idToken) {
                const idToken = result.authentication.idToken;
                const apiResponse = await loginWithGoogleApi(idToken);

                if (apiResponse?.status === 'success' && apiResponse?.data?.access_token) {
                    Alert.alert('Sign in successful', 'Welcome back.');
                    return {
                        success: true,
                        data: apiResponse.data,
                        user: apiResponse.data.user,
                    };
                }
            }
            return { success: false, error: 'Authentication failed' };
        } catch (error) {
            console.error("API Error: ", error.response?.data || error.message);
            const message = error?.message || 'Google sign in failed. Please try again.';
            Alert.alert('Sign in failed', message);
            return { success: false, error: message };
        } finally {
            setIsLoading(false);
        }
    };

    return { login, isLoading, request, response };
};
