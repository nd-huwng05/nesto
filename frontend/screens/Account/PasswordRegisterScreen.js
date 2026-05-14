import { Text, TextInput, View } from "react-native";
import React, { useEffect, useRef } from "react";
import { useValidation, VALIDATE_PASSWORD } from "../../hooks/validations/useFormValidation";
import { AccountLayout } from "../../layout/AccountLayout";
import { commonInputStyles } from "../../styles/TextInputStyles";

export default function PasswordRegisterScreen({ navigation, route }) {
    const inputRef = useRef(null);
    const { email } = route.params || {};

    const { value: password, setValue: setPassword, isValid: isValidPassword } = useValidation('', VALIDATE_PASSWORD);

    useEffect(() => {
        const timer = setTimeout(() => inputRef.current?.focus(), 300);
        return () => clearTimeout(timer);
    }, []);

    const handleContinue = () => {
        navigation.navigate('RePasswordRegisterScreen', {
            email: email,
            password: password
        });
    }

    return (
        <AccountLayout
            navigation={navigation}
            title="Create a password"
            isValid={isValidPassword}
            onContinue={handleContinue}
        >
            <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 h-10">
                <TextInput
                    ref={inputRef}
                    placeholder="Password"
                    secureTextEntry={true}
                    autoFocus={true}
                    textContentType="newPassword"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 font-sf-bold text-lg text-gray-900 h-full py-0"
                    value={password}
                    style={commonInputStyles.baseInput}
                    onChangeText={setPassword} // Đúng hàm setPassword
                />
            </View>
            <View className="mt-3 px-1">
                <Text className="text-gray-500 font-sf-regular text-xs">
                    Your password must have at least 8 characters.
                </Text>
            </View>
        </AccountLayout>
    );
}