import {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Text, TextInput, TouchableOpacity, View} from 'react-native';

export function OtpCodeInput({
    onComplete,
    onResend,
    loading = false,
    error,
    onClearError,
    resendCooldown = 60,
    autoFocus = true,
}) {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [countdown, setCountdown] = useState(resendCooldown);
    const inputRefs = useRef([]);

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    useEffect(() => {
        if (autoFocus) {
            const t = setTimeout(() => inputRefs.current[0]?.focus(), 300);
            return () => clearTimeout(t);
        }
    }, [autoFocus]);

    const handleOtpChange = (value, index) => {
        onClearError?.();
        const newOtp = [...otp];
        newOtp[index] = value.replace(/\D/g, '').slice(-1);
        setOtp(newOtp);

        if (value.length !== 0 && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = ({nativeEvent}, index) => {
        if (nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
            inputRefs.current[index - 1]?.focus();
            const newOtp = [...otp];
            newOtp[index - 1] = '';
            setOtp(newOtp);
        }
    };

    const resetOtp = () => {
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
    };

    const handleResend = async () => {
        if (countdown > 0 || loading) return;
        try {
            await onResend?.();
            setCountdown(resendCooldown);
            resetOtp();
            onClearError?.();
        } catch {
            // Caller handles Alert for send failures
        }
    };

    const otpString = otp.join('');
    const isComplete = otp.every((digit) => digit !== '');
    const verifyingRef = useRef(false);

    useEffect(() => {
        if (error) {
            setOtp(['', '', '', '', '', '']);
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [error]);

    useEffect(() => {
        if (!isComplete || loading || verifyingRef.current) return;

        verifyingRef.current = true;
        Promise.resolve(onComplete?.(otpString)).finally(() => {
            verifyingRef.current = false;
        });
    }, [otpString, isComplete, loading]);

    return (
        <View>
            {error ? (
                <Text className="text-red-500 font-sf-semi text-xs text-center mb-3">{error}</Text>
            ) : null}

            {loading ? (
                <ActivityIndicator size="large" color="#8294FF" className="mb-6" />
            ) : (
                <>
                    <View className="flex-row justify-between mb-2 px-1">
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => {
                                    inputRefs.current[index] = ref;
                                }}
                                className={`w-12 h-14 bg-gray-50 border rounded-xl text-center text-2xl font-sf-bold text-gray-900 ${
                                    error
                                        ? 'border-red-400'
                                        : digit
                                          ? 'border-primary'
                                          : 'border-gray-200'
                                }`}
                                keyboardType="number-pad"
                                maxLength={1}
                                value={digit}
                                onChangeText={(value) => handleOtpChange(value, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                editable={!loading}
                                selectTextOnFocus
                            />
                        ))}
                    </View>

                    <View className="flex-row justify-center items-center mt-4">
                        <Text className="text-gray-500 font-sf text-sm">Didn't receive the code? </Text>
                        <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || loading}>
                            <Text
                                className={`font-sf-semi text-sm ${
                                    countdown > 0 ? 'text-gray-400' : 'text-primary'
                                }`}
                            >
                                Resend{countdown > 0 ? ` (${countdown}s)` : ''}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}
