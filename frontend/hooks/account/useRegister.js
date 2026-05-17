import {useState, useCallback} from 'react';
import {Alert} from 'react-native';
import {checkEmailExist, registerEmail, sendOTP} from '../../services/AuthService';
import {saveSession} from '../../utils/authStorage';
import {getErrorMessage} from '../../utils/authErrors';

export const useRegister = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);

    const checkEmailAvailable = useCallback(async (email) => {
        setIsCheckingEmail(true);
        try {
            await checkEmailExist(email);
            return {available: true};
        } catch (err) {
            const message = getErrorMessage(err, 'This email is already registered');
            return {available: false, message};
        } finally {
            setIsCheckingEmail(false);
        }
    }, []);

    const sendVerificationOtp = useCallback(async (email) => {
        setIsSendingOtp(true);
        try {
            await sendOTP(email);
            return {success: true};
        } catch (err) {
            const message = getErrorMessage(err, 'Failed to send verification code. Please try again.');
            Alert.alert('Verification error', message);
            return {success: false, message};
        } finally {
            setIsSendingOtp(false);
        }
    }, []);

    const handleRegister = useCallback(async (email, password, role) => {
        setIsLoading(true);
        try {
            const response = await registerEmail(email, password, role);
            const token = response?.data?.access_token;

            if (response?.status === 'success' && token) {
                await saveSession(token, response?.data?.user || role);
                return {status: 'success'};
            }

            const message = 'Registration failed. Please try again.';
            Alert.alert('Registration failed', message);
            return {status: 'error', message};
        } catch (err) {
            const message = getErrorMessage(err, 'Registration failed. Please try again.');
            Alert.alert('Registration failed', message);
            return {status: 'error', message};
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        checkEmailAvailable,
        sendVerificationOtp,
        handleRegister,
        isLoading,
        isCheckingEmail,
        isSendingOtp,
    };
};
