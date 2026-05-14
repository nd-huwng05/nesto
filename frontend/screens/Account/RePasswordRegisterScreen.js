import { ActivityIndicator, Text, TextInput, View } from "react-native";
import React, { useRef, useState } from "react";
import { AccountLayout } from "../../layout/AccountLayout";
import { commonInputStyles } from "../../styles/TextInputStyles";
import { useRegister } from "../../hooks/account/useRegister";

export default function RePasswordRegisterScreen({ navigation, route }) {
    const inputRef = useRef(null);
    const { email, password: originalPassword } = route.params || {};

    const [confirmPassword, setConfirmPassword] = useState('');
    const { handleRegister, isLoading, error, setError } = useRegister();
    const isMatch = confirmPassword === originalPassword;

    const onSubmit = async () => {
        const result = await handleRegister(email, originalPassword);
        if (result.status === 'success') {
            navigation.replace('QuestionFlow');
        } else {
            setConfirmPassword('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }

    return (
        <AccountLayout
            navigation={navigation}
            title="Confirm your password"
            isValid={isMatch && !isLoading}
            onContinue={onSubmit}
        >
            <View className={`flex-row items-center bg-gray-50 border rounded-2xl px-4 h-10 ${
                error ? 'border-red-500' : (isMatch ? 'border-blue-500' : 'border-gray-100')
            }`}>
                <TextInput
                    ref={inputRef}
                    placeholder="Re-enter password"
                    secureTextEntry={true}
                    autoFocus={true}
                    textContentType="newPassword"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 font-sf-bold text-lg text-gray-900 h-full py-0"
                    value={confirmPassword}
                    style={commonInputStyles.baseInput}
                    onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (error) setError(null);
                    }}
                    editable={!isLoading}
                />
                {isLoading && <ActivityIndicator size="small" color="#2563eb"/>}
            </View>

            {error && (
                <View className="mt-2 px-1">
                    <Text className="text-red-500 font-sf-semi text-xs text-center">
                        {String(error)}
                    </Text>
                </View>
            )}
        </AccountLayout>
    );
}