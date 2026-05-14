import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import React from "react";
import {Alert} from "react-native";

WebBrowser.maybeCompleteAuthSession();
export const useGoogleAuth = (config, discovery) => {
    const [request, response, promtAsync] = Google.useAuthRequest({
        androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
    })

    const [isLoading, setIsLoading] = React.useState(false)

    const login = async () => {
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