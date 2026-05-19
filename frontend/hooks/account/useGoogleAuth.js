import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import React from "react";
import {Alert, Platform} from "react-native";

WebBrowser.maybeCompleteAuthSession();
export const useGoogleAuth = (config, discovery) => {
    const androidClientId = process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID;
    const iosClientId = process.env.EXPO_PUBLIC_IOS_CLIENT_ID;
    const webClientId = process.env.EXPO_PUBLIC_WEB_CLIENT_ID;

    const hasAndroidClientId = Platform.OS !== 'android' || Boolean(androidClientId);
    const hasIosClientId = Platform.OS !== 'ios' || Boolean(iosClientId);
    const hasGoogleAuthConfig = hasAndroidClientId && hasIosClientId && Boolean(webClientId);

    const [request, response, promtAsync] = Google.useAuthRequest({
      
        androidClientId: androidClientId || "missing-android-client-id.apps.googleusercontent.com",
        iosClientId: iosClientId || "missing-ios-client-id.apps.googleusercontent.com",
        webClientId: webClientId || "missing-web-client-id.apps.googleusercontent.com",
    })

    const [isLoading, setIsLoading] = React.useState(false)

    const login = async () => {
        if (!hasGoogleAuthConfig) {
            const missing = [
                !androidClientId && "EXPO_PUBLIC_ANDROID_CLIENT_ID",
                !iosClientId && "EXPO_PUBLIC_IOS_CLIENT_ID",
                !webClientId && "EXPO_PUBLIC_WEB_CLIENT_ID",
            ].filter(Boolean);

            Alert.alert(
                'Google Auth config missing',
                `Please set ${missing.join(', ')} in frontend/.env and restart Expo.`
            );
            return;
        }

        setIsLoading(true);
        try {
            await promtAsync();
        } catch (error) {
            Alert.alert('Authentication', "Authenticate with google failed")
        } finally {
            setIsLoading(false)
        }
    }

    const getAuthResult = () => {
        if (response?.type === 'success') {
            return response.authentication;
        }
        return null;
    }

    return {login, authResult: getAuthResult(), isLoading, request};
}