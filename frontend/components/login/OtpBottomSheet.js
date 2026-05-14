import {Text, TextInput, TouchableOpacity, View, ActivityIndicator} from "react-native";
import React, {useState, useRef, useEffect} from "react";
import {AntDesign} from "@expo/vector-icons";
import Modal from "react-native-modal";
import {useAuthOTP} from "../../hooks/account/useAuthOTP";


export default function OtpBottomSheet({isVisible, onClose, onSuccess, email}) {
    const {handleSendOTP, handleVerifyOTP, loading, error, setError} = useAuthOTP()
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [countdown, setCountdown] = useState(60);
    const inputRefs = useRef([]);

    useEffect(() => {
        let timer;
        if (isVisible && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isVisible, countdown]);

    useEffect(() => {
        if (isVisible) {
            setOtp(['', '', '', '', '', '']);
            setError(null)
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 300);
        }
    }, [isVisible]);

    useEffect(() => {
        const isOtpComplete = otp.every((digit) => digit !== '');
        if (isOtpComplete && !loading) {
            verifyOtpAction(otp.join(''));
        }
    }, [otp]);

    const handleOtpChange = (value, index) => {
        setError(null);
        const newOtp = [...otp];
        newOtp[index] = value;
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

    const verifyOtpAction = async (otpString) => {
        try {
            await handleVerifyOTP(otpString);
            onSuccess();
        } catch (err) {
            setOtp(['', '', '', '', '', '']);
            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 200);
        }
    };

    const handleResendOtp = async () => {
        if (countdown === 0 && !loading) {
           try {
               await handleSendOTP(email);
               setCountdown(60)
               setOtp(['', '', '', '', '', ''])
               setError(null)
               setTimeout(() => inputRefs.current[0]?.focus(), 100);
           } catch (err) {}
        }
    };

    return (
        <Modal isVisible={isVisible} onBackdropPress={onClose} onSwipeComplete={onClose}
               swipeDirection={['down']} avoidKeyboard={true} className="justify-end m-0">
            <View className="bg-white rounded-t-3xl pt-4 pb-12 shadow-xl">
                <View className="items-center mb-4">
                    <View className="w-12 h-1.5 bg-gray-300 rounded-full"/>
                </View>

                <View className="px-6 mb-4 flex-row justify-between items-center">
                    <Text className="text-xl font-bold text-blue-900">Digital OTP</Text>
                    <TouchableOpacity onPress={onClose}>
                        <AntDesign name="close" size={24} color="#374151"/>
                    </TouchableOpacity>
                </View>

                <Text className="text-gray-500 mb-6 px-6 text-center">
                    OTP have send to your email
                </Text>

                {error ? (
                    <Text className="text-red-500 text-center mb-2 font-bold">{error}</Text>
                ) : null}

                {loading ? (
                    <ActivityIndicator size="large" color="#2563eb" className="mb-8"/>
                ) : (
                    <>
                        <View className="flex-row justify-center space-x-3 mb-4 px-4"
                              pointerEvents={loading ? "none" : "auto"}>
                            {otp.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => (inputRefs.current[index] = ref)}
                                    className={`w-12 h-14 bg-gray-50 border rounded-xl text-center text-2xl font-bold text-gray-900 ${
                                        error ? 'border-red-500' : (digit ? 'border-blue-600' : 'border-gray-300')
                                    }`}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    value={digit}
                                    onChangeText={(value) => handleOtpChange(value, index)}
                                    onKeyPress={(e) => handleKeyPress(e, index)}
                                    editable={!loading}
                                />
                            ))}
                        </View>
                        <View className="flex-row justify-center items-center mt-6">
                            <Text className="text-gray-500 text-base">Didn't receive the code? </Text>
                            <TouchableOpacity
                                onPress={handleResendOtp}
                                disabled={countdown > 0}
                            >
                                <Text
                                    className={`text-base font-bold ${countdown > 0 ? 'text-gray-400' : 'text-blue-600'}`}>
                                    Resend {countdown > 0 ? `(${countdown}s)` : ''}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}