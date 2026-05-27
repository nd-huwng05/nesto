import { authClient, apiClient, endpoints, CLIENT_ID } from '../configuration/Apis';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const REGISTER_TOKEN_KEY = 'register_token';
const USER_KEY = 'user';

const saveTokens = async (accessToken, refreshToken) => {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
};

const saveUser = async (user) => {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
};

const extractErrorMessage = (error) => {
    if (error.response?.data) {
        const data = error.response.data;
        return data.error_description || data.detail || data.message || JSON.stringify(data);
    }
    return error.message || 'Network Error or Unknown Error';
};

const logBackendError = (context, error) => {
    if (error.response?.data) {
        console.error(`[Backend Error - ${context}]:\n`, JSON.stringify(error.response.data, null, 2));
    } else {
        console.error(`[Axios Error - ${context}]:`, error.message);
    }
};

export const login = async (email, password) => {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', email.trim().toLowerCase());
    params.append('password', password);
    params.append('client_id', CLIENT_ID);

    try {
        const response = await authClient.post(endpoints.token, params.toString());
        await saveTokens(response.data.access_token, response.data.refresh_token);

        const userResponse = await apiClient.get(endpoints.me);
        await saveUser(userResponse.data);

        return {
            data: {
                access_token: response.data.access_token,
                user: userResponse.data,
            },
            status: 'success',
        };
    } catch (error) {
        logBackendError('Login', error);
        throw new Error(extractErrorMessage(error));
    }
};

export const loginWithGoogle = async (idToken) => {
    const params = new URLSearchParams();
    params.append('grant_type', 'google');
    params.append('access_token', idToken);
    params.append('client_id', CLIENT_ID);

    try {
        const response = await authClient.post(endpoints.login, params.toString());
        await saveTokens(response.data.access_token, response.data.refresh_token);

        const userResponse = await apiClient.get(endpoints.user_me);
        await saveUser(userResponse.data);

        return {
            data: {
                access_token: response.data.access_token,
                user: userResponse.data,
            },
            status: 'success',
        };
    } catch (error) {
        logBackendError('GoogleLogin', error);
        throw new Error(extractErrorMessage(error));
    }
};

export const logout = async () => {
    try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
            const params = new URLSearchParams();
            params.append('token', refreshToken);
            params.append('client_id', CLIENT_ID);
            await authClient.post(endpoints.revoke_token, params.toString());
        }
    } catch (error) {
        logBackendError('Logout', error);
    } finally {
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, REGISTER_TOKEN_KEY]);
    }
};

export const checkEmailExist = async (email) => {
    try {
        await apiClient.post(endpoints.send_otp, { email });
    } catch (error) {
        logBackendError('CheckEmail', error);
        if (error.response?.status === 400) {
            const detail = error.response?.data?.detail || '';
            if (detail.toLowerCase().includes('already') || detail.toLowerCase().includes('registered')) {
                throw new Error('This email is already registered');
            }
            throw new Error(extractErrorMessage(error));
        }
        throw new Error(extractErrorMessage(error));
    }
};

export const sendOTP = async (email) => {
    try {
        const response = await apiClient.post(endpoints.send_otp, { email });
        return response.data;
    } catch (error) {
        logBackendError('SendOTP', error);
        throw new Error(extractErrorMessage(error));
    }
};

export const checkOTP = async (email, otpCode) => {
    try {
        const response = await apiClient.post(endpoints.verify_otp, {
            email,
            otp_code: otpCode,
        });

        if (response.data.register_token) {
            await AsyncStorage.setItem(REGISTER_TOKEN_KEY, response.data.register_token);
        }

        return response.data;
    } catch (error) {
        logBackendError('CheckOTP', error);
        throw new Error(extractErrorMessage(error));
    }
};

export const registerEmail = async ({ email, password, confirmPassword, role, name, phone }) => {
    const registerToken = await AsyncStorage.getItem(REGISTER_TOKEN_KEY);

    const payload = {
        email,
        password,
        confirm_password: confirmPassword || password,
        register_token: registerToken,
    };

    if (role) payload.role = role;
    if (name) payload.name = name;
    if (phone) payload.phone = phone;

    try {
        const response = await apiClient.post(endpoints.register, payload);

        const { user, access_token, refresh_token } = response.data;

        await saveTokens(access_token, refresh_token);
        await saveUser(user);
        await AsyncStorage.removeItem(REGISTER_TOKEN_KEY);

        return {
            status: 'success',
            data: {
                access_token,
                user,
            },
        };
    } catch (error) {
        logBackendError('Register', error);
        throw new Error(extractErrorMessage(error));
    }
};

export const requestPasswordReset = async (email) => {
    try {
        const response = await apiClient.post(endpoints.forgot_password, { email });
        return response.data;
    } catch (error) {
        logBackendError('RequestPasswordReset', error);
        throw new Error(extractErrorMessage(error));
    }
};

export const saveRegisterToken = async (token) => {
    await AsyncStorage.setItem(REGISTER_TOKEN_KEY, token);
};

export const getCurrentUser = async () => {
    try {
        const userStr = await AsyncStorage.getItem(USER_KEY);
        if (userStr) {
            return JSON.parse(userStr);
        }
        const response = await apiClient.get(endpoints.user_me);
        await saveUser(response.data);
        return response.data;
    } catch (error) {
        logBackendError('GetCurrentUser', error);
        return null;
    }
};
