import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { checkEmailExist, registerEmail, sendOTP, checkOTP, saveRegisterToken } from '../../services/AuthService';
import { saveSession } from '../../utils/authStorage';

export const useRegister = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);

    const checkEmailAvailable = useCallback(async (email) => {
        setIsCheckingEmail(true);
        try {
            await checkEmailExist(email);
            return { available: true };
        } catch (err) {
            const message = err?.message || 'This email is already registered';
            return { available: false, message };
        } finally {
            setIsCheckingEmail(false);
        }
    }, []);

    const sendVerificationOtp = useCallback(async (email) => {
        setIsSendingOtp(true);
        try {
            await sendOTP(email);
            return { success: true };
        } catch (err) {
            const message = err?.message || 'Failed to send verification code. Please try again.';
            Alert.alert('Error', message);
            return { success: false, message };
        } finally {
            setIsSendingOtp(false);
        }
    }, []);

    const verifyOtpCode = useCallback(async (email, otpCode) => {
        try {
            const response = await checkOTP(email, otpCode);
            if (response.register_token) {
                await saveRegisterToken(response.register_token);
            }
            return { success: true, data: response };
        } catch (err) {
            const message = err?.message || 'Incorrect verification code';
            throw new Error(message);
        }
    }, []);

    const handleRegister = useCallback(async ({ email, password, confirmPassword, name, phone, role }) => {
        setIsLoading(true);
        try {
            const response = await registerEmail({
                email,
                password,
                confirmPassword,
                name,
                phone,
                role,
            });

            const token = response?.data?.access_token;
            const user = response?.data?.user;

            if (response?.status === 'success' && token) {
                await saveSession(token, user);
                return { status: 'success', data: response.data };
            }

            const message = 'Registration failed. Please try again.';
            Alert.alert('Registration failed', message);
            return { status: 'error', message };
        } catch (err) {
            const message = err?.message || 'Registration failed. Please try again.';
            Alert.alert('Registration failed', message);
            return { status: 'error', message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        checkEmailAvailable,
        sendVerificationOtp,
        verifyOtpCode,
        handleRegister,
        isLoading,
        isCheckingEmail,
        isSendingOtp,
    };
};
