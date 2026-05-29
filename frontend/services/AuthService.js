import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api, { endpoints } from '../configuration/Apis';
import { saveTokens, clearSession } from '../utils/authStorage';
import {extractApiErrorMessage} from '../utils/apiError';

const REGISTER_TOKEN_KEY = 'register_token';
const OAUTH_URL = process.env.EXPO_PUBLIC_OAUTH_URL || 'http://localhost:8000/o';
const CLIENT_ID = process.env.EXPO_PUBLIC_CLIENT_ID || '';
const CLIENT_SECRET = process.env.EXPO_PRIVATE_CLIENT_SECRET || '';
const USE_CLIENT_SECRET = process.env.EXPO_PUBLIC_OAUTH_USE_CLIENT_SECRET === 'true';

export const login = async (identifier, password) => {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', String(identifier || '').trim().toLowerCase());
    params.append('password', String(password || ''));
    params.append('client_id', CLIENT_ID);
    if (USE_CLIENT_SECRET && CLIENT_SECRET) {
        params.append('client_secret', CLIENT_SECRET);
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
        console.error("API Error: ", error.response?.data || error.message);
        const errorData = error.response?.data;
        let errorMessage = 'Login failed. Please try again.';
        if (errorData?.error === 'invalid_grant') errorMessage = 'Email or password is incorrect.';
        if (errorData?.error === 'invalid_client') errorMessage = 'Application is not configured. Please contact support.';
        throw new Error(errorMessage || extractApiErrorMessage(error, errorMessage));
    }

    // Prefer injected payload from /o/token (CustomTokenView).
    let profile = tokenData?.user || null;

    await saveTokens({
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        user: profile,
        role: profile?.role || tokenData?.role,
    });

    try {
        const profileResponse = await api.get(endpoints['current-user']);
        profile = profileResponse.data || profile;
        await saveTokens({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            user: profile,
            role: profile?.role || tokenData?.role,
        });
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        if (!profile) {
            profile = {
                email: String(identifier || '').trim().toLowerCase(),
                role: tokenData?.role || tokenData?.user?.role || 'CUSTOMER',
                name: '',
                groups: Array.isArray(tokenData?.user?.groups) ? tokenData.user.groups : [],
            };
            await saveTokens({
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                user: profile,
                role: profile?.role || tokenData?.role,
            });
        }
    }

    if (!profile?.role && tokenData?.role) {
        profile.role = tokenData.role;
    }

    return { success: true, user: profile, token: tokenData.access_token };
};

export const logout = async () => {
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
        const profile = data.user || null;
        if (data.access_token) {
            await saveTokens({
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                user: profile,
                role: profile?.role,
            });
        }
        return { status: 'success', data };
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
        const response = await api.post(endpoints['reset-password'], data);
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
