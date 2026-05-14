import {ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View} from "react-native";
import React, {useEffect, useRef} from "react";
import {useValidation, VALIDATE_PASSWORD} from "../../hooks/validations/useFormValidation";
import {AccountLayout} from "../../layout/AccountLayout";
import {useAuth} from "../../hooks/account/useAuth";
import {commonInputStyles} from "../../styles/TextInputStyles";

export default function PasswordScreen({navigation, route}) {
    const {identifier} = route.params
    const inputRef = useRef(null)
    const {value: password, setValue: setPassword, isValid: isValidPassword} = useValidation('', VALIDATE_PASSWORD)
    const {login, isLoading, error, setError} = useAuth()
    const handleLogin = async () => {
        const result = await login(identifier, password);
        if (result.success) navigation.replace('HomeFlow')
        else {
            setPassword('')
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }
    return (
        <AccountLayout navigation={navigation} title="What's your password?" isValid={isValidPassword && !isLoading}
                       onContinue={() => handleLogin()}>
            <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 h-10">
                <TextInput
                    ref={inputRef}
                    placeholder="Password"
                    secureTextEntry={true}
                    autoFocus={true}
                    textContentType="password"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1 font-sf-bold text-lg text-gray-900 h-full py-0"
                    value={password}
                    style={commonInputStyles.baseInput}
                    onChangeText={(text) => {
                        setPassword(text);
                        if (error) setError(null);
                    }}
                    editable={!isLoading}
                />
                {isLoading && <ActivityIndicator size="small" color="#8294FF"/>}
            </View>
            {error && (
                <View className="mt-2">
                    <Text className="text-red-500 text-center font-sf-semi text-xs">
                        {String(error)}
                    </Text>
                </View>
            )}
            <TouchableOpacity className="bg-gray-100 px-3 py-1 rounded-full self-center mt-3">
                <Text className="font-bold text-gray-900">Forgot password</Text>
            </TouchableOpacity>
        </AccountLayout>
    );
}