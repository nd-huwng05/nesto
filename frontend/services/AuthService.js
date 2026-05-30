import AsyncStorage from '@react-native-async-storage/async-storage';

import axios from 'axios';

import api, { endpoints } from '../configuration/Apis';

import { saveTokens, clearSession, REFRESH_TOKEN_KEY, saveLastLoginIdentifier, TOKEN_KEY } from '../utils/authStorage';

import {extractApiErrorMessage} from '../utils/apiError';

import {

    OAUTH_CLIENT_ID,

    OAUTH_CLIENT_SECRET,

    OAUTH_URL,

    OAUTH_USE_CLIENT_SECRET,

} from '../utils/oauthConfig';

import {hydrateSession} from '../utils/sessionBootstrap';



const REGISTER_TOKEN_KEY = 'register_token';



const persistAuthTokens = async (tokenData = {}) => {

    await saveTokens({

        accessToken: tokenData.access_token,

        refreshToken: tokenData.refresh_token,

        role: tokenData.role,

        uiFlow: tokenData.ui_flow,

    });

};



export const login = async (identifier, password) => {

    const params = new URLSearchParams();

    params.append('grant_type', 'password');

    params.append('username', String(identifier || '').trim().toLowerCase());

    params.append('password', String(password || ''));

    params.append('client_id', OAUTH_CLIENT_ID);

    if (OAUTH_USE_CLIENT_SECRET && OAUTH_CLIENT_SECRET) {

        params.append('client_secret', OAUTH_CLIENT_SECRET);

    }



    let tokenData;

    try {

        const tokenRes = await axios.post(

            `${OAUTH_URL}${endpoints['login']}`,

            params.toString(),

            { headers: {'Content-Type': 'application/x-www-form-urlencoded'} }

        );

        tokenData = tokenRes.data || {};

    } catch (error) {
        const errorMessage = extractApiErrorMessage(error, 'Login failed. Please try again.');
        console.error('API Error: ', error.response?.data || errorMessage);
        throw new Error(errorMessage);
    }



    await persistAuthTokens(tokenData);

    await saveLastLoginIdentifier(identifier);

    const hydrated = await hydrateSession({

        accessToken: tokenData.access_token,

        refreshToken: tokenData.refresh_token,

        notifyOnFailure: true,

    });



    if (!hydrated.ok || !hydrated.user) {

        throw new Error('Signed in but unable to load your profile. Please try again.');

    }



    return { success: true, user: hydrated.user, token: tokenData.access_token };

};



export const logout = async () => {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    const accessToken = await AsyncStorage.getItem(TOKEN_KEY);
    const tokenToRevoke = refreshToken || accessToken;

    if (tokenToRevoke) {
        try {
            const params = new URLSearchParams();
            params.append('token', tokenToRevoke);
            params.append('client_id', OAUTH_CLIENT_ID);
            if (OAUTH_USE_CLIENT_SECRET && OAUTH_CLIENT_SECRET) {
                params.append('client_secret', OAUTH_CLIENT_SECRET);
            }
            await axios.post(
                `${OAUTH_URL}/revoke_token/`,
                params.toString(),
                { headers: {'Content-Type': 'application/x-www-form-urlencoded'}, timeout: 10000 }
            );
        } catch (error) {
            console.warn('Token revoke failed (local session will still be cleared):', error?.message || error);
        }
    }

    await clearSession();
};



export const getCurrentUser = async () => {

    try {

        const response = await api.get(endpoints['current-user']);

        return response.data;

    } catch (error) {

        console.error("API Error: ", error.response?.data || error.message);

        return null;

    }

};



export const saveRegisterToken = async (token) => {

    await AsyncStorage.setItem(REGISTER_TOKEN_KEY, token);

};



export const getRegisterToken = async () => {

    return await AsyncStorage.getItem(REGISTER_TOKEN_KEY);

};



export const clearRegisterToken = async () => {

    await AsyncStorage.removeItem(REGISTER_TOKEN_KEY);

};



export const sendOTP = async (email) => {

    const payload = { email: String(email || '').trim().toLowerCase() };

    try {

        const response = await api.post(endpoints['send-otp'], payload);

        return response.data;

    } catch (error) {

        console.error('API Error: ', error.response?.data || error.message);

        throw new Error(extractApiErrorMessage(error, 'Unable to send OTP.'));

    }

};



export const sendBusinessOTP = async (email) => {

    const payload = { email: String(email || '').trim().toLowerCase() };

    try {

        const response = await api.post(endpoints['send-business-otp'], payload);

        return response.data;

    } catch (error) {

        console.error('API Error: ', error.response?.data || error.message);

        throw new Error(extractApiErrorMessage(error, 'Unable to send business OTP.'));

    }

};



export const verifyOtp = async (email, otpCode) => {

    const payload = {

        email: String(email || '').trim().toLowerCase(),

        otp_code: String(otpCode || '').trim(),

    };

    try {

        const response = await api.post(endpoints['verify-otp'], payload);

        return response.data;

    } catch (error) {

        console.error('API Error: ', error.response?.data || error.message);

        throw new Error(extractApiErrorMessage(error, 'Unable to verify OTP.'));

    }

};



export const verifyBusinessOtp = async (email, otpCode) => {

    const payload = {

        email: String(email || '').trim().toLowerCase(),

        otp_code: String(otpCode || '').trim(),

    };

    try {

        const response = await api.post(endpoints['verify-business-otp'], payload);

        return response.data;

    } catch (error) {

        console.error('API Error: ', error.response?.data || error.message);

        throw new Error(extractApiErrorMessage(error, 'Unable to verify business OTP.'));

    }

};



export const checkOTP = verifyOtp;



export const register = async ({ email, password, name, phone, role, registerToken }) => {

    try {

        const response = await api.post(endpoints['register'], {

            email,

            password,

            confirm_password: password,

            name,

            phone: phone || '',

            role: role || 'CUSTOMER',

            register_token: registerToken,

        });

        return response.data;

    } catch (error) {

        console.error('API Error: ', error.response?.data || error.message);

        throw new Error(extractApiErrorMessage(error, 'Unable to register.'));

    }

};



export const loginWithGoogle = async (idToken) => {

    const payload = { id_token: String(idToken || '').trim() };

    try {

        const response = await api.post(endpoints['google-auth'], payload);

        const data = response.data || {};

        if (!data.access_token) {

            return { status: 'error', message: 'Google login failed.', data: null };

        }



        await persistAuthTokens(data);

        const hydrated = await hydrateSession({

            accessToken: data.access_token,

            refreshToken: data.refresh_token,

            notifyOnFailure: true,

        });



        if (!hydrated.ok || !hydrated.user) {

            return {status: 'error', message: 'Signed in but unable to load your profile.', data: null};

        }

        if (hydrated.user?.email) {
            await saveLastLoginIdentifier(hydrated.user.email);
        }

        return { status: 'success', data: { ...data, user: hydrated.user } };

    } catch (error) {

        console.error('API Error: ', error.response?.data || error.message);

        return {status: 'error', message: extractApiErrorMessage(error, 'Google login failed.'), data: null};

    }

};



export const forgotPassword = async (email) => {

    const payload = { email: String(email || '').trim().toLowerCase() };

    try {

        const response = await api.post(endpoints['forgot-password'], payload);

        return {status: 'success', data: response.data};

    } catch (error) {

        console.error('API Error: ', error.response?.data || error.message);

        return {status: 'error', message: extractApiErrorMessage(error, 'Unable to process request.'), data: null};

    }

};



export const resetPassword = async (data) => {

    try {

        const payload = {
            token: String(data?.token || '').trim(),
            new_password: data?.new_password,
            confirm_password: data?.confirm_password,
            uid: data?.uid,
        };
        const response = await api.post(endpoints['reset-password'], payload, {
            params: data?.uid ? { uid: data.uid } : undefined,
        });

        return {status: 'success', data: response.data};

    } catch (error) {

        console.error('API Error: ', error.response?.data || error.message);

        return {status: 'error', message: extractApiErrorMessage(error, 'Unable to reset password.'), data: null};

    }

};



export const changePassword = async ({currentPassword, newPassword, confirmPassword}) => {

    const payload = {

        current_password: String(currentPassword || ''),

        new_password: String(newPassword || ''),

        confirm_password: String(confirmPassword || ''),

    };

    try {

        const response = await api.post(endpoints['change-password'], payload);

        return {status: 'success', data: response.data};

    } catch (error) {

        console.error('API Error: ', error.response?.data || error.message);

        const data = error.response?.data;

        const message =

            data?.detail ||

            (typeof data === 'object' ? Object.values(data).flat().join('\n') : '') ||

            error.message ||

            'Unable to update password.';

        return {status: 'error', message, data: data || null};

    }

};



export const authApi = async (identifier, password) => {

    return login(identifier, password);

};


