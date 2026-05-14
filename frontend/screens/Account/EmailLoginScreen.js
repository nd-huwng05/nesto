import {Keyboard, Text, TextInput, Platform, TouchableOpacity, View} from "react-native";
import React from "react";
import {AntDesign} from "@expo/vector-icons";
import {REGEX_EMAIL, useValidation} from "../../hooks/validations/useFormValidation";
import {AccountLayout} from "../../layout/AccountLayout";
import {commonInputStyles} from "../../styles/TextInputStyles";
import {useGoogleAuth} from "../../hooks/account/useGoogleAuth";

export default function EmailLoginScreen({navigation}) {
    const {value: email, setValue: setEmail, isValid: isValidEmail} = useValidation('', REGEX_EMAIL)
    const { login, authResult } = useGoogleAuth();
    React.useEffect(() => {

    }, [authResult])
    return (
        <AccountLayout navigation={navigation} title={"What's your email?"} isValid={isValidEmail}
                       onContinue={() => navigation.navigate('PasswordScreen', {identifier: email, type: 'email'})}
                       footerText={
                           <Text className="text-[12px] font-bold text-gray-400 mb-4 text-center w-3/4">
                               By tapping Continue, you are agreeing to our
                               <Text className="text-gray-500"> Term or Service</Text> and
                               <Text className="text-gray-500"> Privacy Policy</Text>
                           </Text>
                       }>
            <View className="mb-4 mt-4">
                <View
                    className="flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 h-10">
                    <TextInput placeholder="Email address" placeholderTextColor="#9ca3af"
                               autoFocus={true}
                               autoCapitalize="none"
                               className="flex-1 font-sf-bold text-lg text-gray-900"
                               style={commonInputStyles.baseInput}
                               keyboardType="email-address" value={email} onChangeText={setEmail}/>
                </View>
            </View>

            <View>
                <TouchableOpacity
                    className="flex-row w-1/2 items-center bg-gray-100 px-2 py-1 rounded-full self-center"
                    onPress={() => {
                        Keyboard.dismiss();
                        navigation.replace('PhoneLoginScreen')
                    }}>
                    <AntDesign name="phone" size={20} color="gray"
                               style={{transform: [{rotate: '90deg'}]}}/>
                    <Text
                        className="flex-1 font-bold ml-2 items-center text-sx text-gray-500 py-0 text-center">Use
                        phone instead</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={login}
                    className="flex-row w-1/2 items-center bg-gray-100 px-2 py-1 rounded-full self-center mt-3">
                    <AntDesign name="google" size={20} color="gray"/>
                    <Text
                        className="flex-1 font-bold ml-2 items-center text-sx text-gray-500 py-0 text-center">Use
                        google instead</Text>
                </TouchableOpacity>
            </View>
        </AccountLayout>
    )
}