import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { sendOTP, verifyOtp, register, getRegisterToken, clearRegisterToken } from '../../services/AuthService';
import { saveSession } from '../../utils/authStorage';

export const useRegister = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);

    const sendVerificationOtp = useCallback(async (email) => {
        setIsCheckingEmail(true);
        setIsSendingOtp(true);
        try {
            await sendOTP(email);
            return { success: true };
        } catch (err) {
            console.error("API Error: ", err.response?.data || err.message);
            const isConflict = err?.response?.status === 400;
            const message = isConflict
                ? 'This email is already registered.'
                : (err?.response?.data?.email?.[0] || err?.response?.data?.detail || 'Failed to send verification code. Please try again.');
            Alert.alert(isConflict ? 'Email taken' : 'Error', message);
            return { success: false, message, isConflict };
        } finally {
            setIsCheckingEmail(false);
            setIsSendingOtp(false);
        }
    }, []);

    const verifyOtpCode = useCallback(async (email, otpCode) => {
        try {
            const normalizedEmail = String(email || '').trim().toLowerCase();
            const normalizedOtpCode = String(otpCode || '').trim();
            const response = await verifyOtp(normalizedEmail, normalizedOtpCode);
            if (response.register_token) {
                await clearRegisterToken();
                const { saveRegisterToken } = await import('../../services/AuthService');
                await saveRegisterToken(response.register_token);
            }
            return { success: true, data: response };
        } catch (err) {
            console.error("API Error: ", err.response?.data || err.message);
            const message = err?.response?.data?.otp_code?.[0]
                || err?.response?.data?.detail
                || 'Incorrect verification code. Please try again.';
            throw new Error(message);
        }
    }, []);

    const handleRegister = useCallback(async ({ email, password, name, phone, role }) => {
        setIsLoading(true);
        try {
            const registerToken = await getRegisterToken();
            if (!registerToken) {
                throw new Error('Session expired. Please verify your email again.');
            }

            const response = await register({ email, password, name, phone, role, registerToken });
            const token = response?.access_token;
            const user = response?.user;

            if (token) {
                await saveSession(token, user);
                await clearRegisterToken();
                return { status: 'success', data: response };
            }

            throw new Error('Registration failed. Please try again.');
        } catch (err) {
            console.error("API Error: ", err.response?.data || err.message);
            const message = err?.message || 'Registration failed. Please try again.';
            Alert.alert('Registration failed', message);
            return { status: 'error', message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        checkEmailAvailable: sendVerificationOtp,
        sendVerificationOtp,
        verifyOtpCode,
        handleRegister,
        isLoading,
        isCheckingEmail,
        isSendingOtp,
    };
};
