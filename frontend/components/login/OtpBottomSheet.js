import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import Modal from 'react-native-modal';
import {AntDesign} from '@expo/vector-icons';
import {useAuthOTP} from '../../hooks/account/useAuthOTP';
import {OtpCodeInput} from '../auth/OtpCodeInput';

export default function OtpBottomSheet({isVisible, onClose, onSuccess, email, variant = 'register'}) {
    const {
        handleSendOTP,
        handleVerifyOTP,
        handleSendBusinessOTP,
        handleVerifyBusinessOTP,
        loading,
        error,
        setError,
    } = useAuthOTP();
    const isBusinessFlow = variant === 'business';
    const sendOtp = isBusinessFlow ? handleSendBusinessOTP : handleSendOTP;
    const verifyOtp = isBusinessFlow ? handleVerifyBusinessOTP : handleVerifyOTP;
    const [verifying, setVerifying] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [verified, setVerified] = useState(false);
    const safeEmail = useMemo(() => String(email || '').trim().toLowerCase(), [email]);

    useEffect(() => {
        if (!isVisible) return;
        setError(null);
        setVerifying(false);
        setIsSending(false);
        setVerified(false);
    }, [isVisible, setError]);

    const handleComplete = async (otpCode) => {
        if (!safeEmail || verified) {
            return;
        }
        setVerifying(true);
        try {
            await verifyOtp(safeEmail, otpCode);
            setVerified(true);
            onSuccess?.();
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        if (!safeEmail) {
            setError('Missing email address.');
            return;
        }
        setIsSending(true);
        try {
            await sendOtp(safeEmail);
        } finally {
            setIsSending(false);
        }
    };

    const isBusy = loading || verifying || isSending;

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            avoidKeyboard
            className="justify-end m-0"
        >
            <View className="bg-white rounded-t-3xl pt-4 pb-12 shadow-xl">
                <View className="items-center mb-4">
                    <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
                </View>

                <View className="px-6 mb-3 flex-row justify-between items-center">
                    <Text className="text-xl font-sf-bold text-slate-800">Verification code</Text>
                    <TouchableOpacity onPress={onClose} hitSlop={12}>
                        <AntDesign name="close" size={22} color="#374151" />
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-500 mb-5 px-6 text-center font-sf text-sm">
                    Enter the 6-digit code sent to {safeEmail || 'your email'}.
                </Text>

                {isBusy ? (
                    <ActivityIndicator size="large" color="#8294FF" className="mb-6" />
                ) : null}

                <View className="px-6">
                    {verified ? (
                        <Text className="text-center text-emerald-600 font-sf-semi mb-4">
                            Email verified successfully.
                        </Text>
                    ) : (
                        <OtpCodeInput
                            verifying={verifying || loading}
                            isSending={isSending}
                            error={error}
                            onClearError={() => setError(null)}
                            onComplete={handleComplete}
                            onResend={handleResend}
                            resendCooldown={60}
                            autoFocus
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}