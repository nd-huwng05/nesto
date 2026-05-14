import { ActivityIndicator, Keyboard, TextInput, View, Text } from "react-native";
import React, { useState } from "react";
import { REGEX_EMAIL, useValidation } from "../../hooks/validations/useFormValidation";
import { AccountLayout } from "../../layout/AccountLayout";
import { commonInputStyles } from "../../styles/TextInputStyles";
import OtpBottomSheet from "../../components/login/OtpBottomSheet";
import { useAuthOTP } from "../../hooks/account/useAuthOTP";
import { checkEmailExist } from "../../services/AuthService";

export default function EmailRegisterScreen({navigation}) {
    const {value: email, setValue: setEmail, isValid: isValidEmail} = useValidation('', REGEX_EMAIL);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [emailError, setEmailError] = useState(null);
    const { handleSendOTP } = useAuthOTP();

    const handleContinue = async () => {
        setIsLoading(true);
        setEmailError(null);
        try {
            await checkEmailExist(email);
            await handleSendOTP(email);
            setShowOtpModal(true);

        } catch (error) {
            const errorMsg = error.response?.message || "Email existed";
            setEmailError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpSuccess = () => {
        setShowOtpModal(false);
        Keyboard.dismiss();
        setTimeout(() => {
                navigation.navigate('PasswordRegisterScreen', {email: email})
            }, 500
        )
    };

    return (
        <View className="flex-1">
            <AccountLayout
                navigation={navigation}
                title={"What's your email?"}
                isValid={isValidEmail && !isLoading} // Khóa nút khi đang load
                onContinue={handleContinue}
            >
                <View className="mb-4 mt-4">
                    <View className={`flex-row items-center bg-gray-50 border rounded-2xl px-4 h-10 ${emailError ? 'border-red-500' : 'border-gray-100'}`}>
                        <TextInput
                            placeholder="Email address"
                            placeholderTextColor="#9ca3af"
                            autoFocus={true}
                            autoCapitalize="none"
                            className="flex-1 font-sf-bold text-lg text-gray-900"
                            style={commonInputStyles.baseInput}
                            keyboardType="email-address"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (emailError) setEmailError(null);
                            }}
                            editable={!isLoading}
                        />
                        {isLoading && <ActivityIndicator size="small" color="#2563eb" />}
                    </View>
                    {emailError && (
                        <Text className="text-red-500 text-xs font-sf-semi text-center mt-2 px-1">
                            {emailError}
                        </Text>
                    )}
                </View>
            </AccountLayout>

            <OtpBottomSheet
                isVisible={showOtpModal}
                onClose={() => setShowOtpModal(false)}
                onSuccess={handleOtpSuccess}
                email={email}
            />
        </View>
    );
}