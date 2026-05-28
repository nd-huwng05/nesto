import {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Text, TextInput, TouchableOpacity, View} from 'react-native';

export function OtpCodeInput({
    onComplete,
    onResend,
    verifying = false,
    isSending = false,
    error,
    onClearError,
    resendCooldown = 60,
    autoFocus = true,
}) {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [countdown, setCountdown] = useState(resendCooldown);
    const inputRefs = useRef([]);
    const safeOtp = Array.isArray(otp) && otp.length === 6 ? otp : ['', '', '', '', '', ''];

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
        const digits = String(value || '').replace(/\D/g, '');
        if (digits.length > 1) {
            const newOtp = [...safeOtp];
            const pasted = digits.slice(0, 6);
            for (let i = 0; i < pasted.length && index + i < 6; i += 1) {
                newOtp[index + i] = pasted[i];
            }
            setOtp(newOtp);
            const nextIndex = Math.min(index + pasted.length, 5);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        const newOtp = [...safeOtp];
        newOtp[index] = digits.slice(-1);
        setOtp(newOtp);

        if (digits.length !== 0 && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = ({nativeEvent}, index) => {
        if (nativeEvent.key !== 'Backspace') return;
        const newOtp = [...safeOtp];
        if (safeOtp[index] !== '') {
            newOtp[index] = '';
            setOtp(newOtp);
            return;
        }
        if (index > 0) {
            const newOtp = [...safeOtp];
            newOtp[index - 1] = '';
            setOtp(newOtp);
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = ({nativeEvent}, index) => {
        const pastedText = nativeEvent?.text;
        if (!pastedText) return;
        handleOtpChange(pastedText, index);
    };

    const resetOtp = () => {
        setOtp(['', '', '', '', '', '']);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
    };

    const handleResend = async () => {
        if (countdown > 0 || isSending) return;
        try {
            await onResend?.();
            setCountdown(resendCooldown);
            resetOtp();
            onClearError?.();
        } catch {
        }
    };

    const otpString = safeOtp.join('');
    const isComplete = safeOtp.every((digit) => digit !== '');
    const verifyingRef = useRef(false);
    const lastSubmittedRef = useRef('');
    const verifiedRef = useRef(false);

    useEffect(() => {
        if (error) {
            setOtp(['', '', '', '', '', '']);
            lastSubmittedRef.current = '';
            verifiedRef.current = false;
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [error]);

    useEffect(() => {
        if (!isComplete || verifying || isSending || verifyingRef.current || verifiedRef.current) {
            return;
        }
        if (lastSubmittedRef.current === otpString) {
            return;
        }

        lastSubmittedRef.current = otpString;
        verifyingRef.current = true;
        Promise.resolve(onComplete?.(otpString))
            .then(() => {
                verifiedRef.current = true;
            })
            .catch(() => {
                lastSubmittedRef.current = '';
            })
            .finally(() => {
                verifyingRef.current = false;
            });
    }, [otpString, isComplete, verifying, isSending, onComplete]);

    const isLoading = verifying || isSending;

    return (
        <View>
            {error ? (
                <Text className="text-red-500 font-sf-semi text-xs text-center mb-3">{error}</Text>
            ) : null}

            {isLoading ? (
                <ActivityIndicator size="large" color="#8294FF" className="mb-6" />
            ) : (
                <>
                    <View className="flex-row justify-between mb-2 px-1">
                        {safeOtp.map((digit, index) => (
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
                                onPaste={(e) => handlePaste(e, index)}
                                editable={!isLoading}
                                selectTextOnFocus
                                autoComplete="one-time-code"
                                textContentType="oneTimeCode"
                            />
                        ))}
                    </View>

                    <View className="flex-row justify-center items-center mt-4">
                        <Text className="text-gray-500 font-sf text-sm">Didn't receive the code? </Text>
                        <TouchableOpacity onPress={handleResend} disabled={countdown > 0 || isSending}>
                            <Text
                                className={`font-sf-semi text-sm ${
                                    countdown > 0 || isSending ? 'text-gray-400' : 'text-primary'
                                }`}
                            >
                                {isSending ? 'Sending...' : `Resend${countdown > 0 ? ` (${countdown}s)` : ''}`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}
