import { Keyboard, Text, TextInput, TouchableOpacity, View} from "react-native";
import React from "react";
import {AntDesign} from "@expo/vector-icons";
import {REGEX_PHONE, useValidation} from "../../hooks/validations/useFormValidation";
import {AccountLayout} from "../../layout/AccountLayout";
import {commonInputStyles} from "../../styles/TextInputStyles";

export default function PhoneLoginScreen({navigation}) {
    const {value: phone, setValue: setPhone, isValid: isValidPhone} = useValidation('', REGEX_PHONE)
    return (
        <AccountLayout navigation={navigation} title={"What's your phone number?"} isValid={isValidPhone}
                       onContinue={() => navigation.navigate('PasswordScreen', {identifier:phone, type: 'phone'})} footerText={
            <Text className="text-[12px] font-bold text-gray-400 mb-4 text-center w-3/4">
                By tapping Continue, you are agreeing to our
                <Text className="text-gray-500"> Term or Service</Text> and
                <Text className="text-gray-500"> Privacy Policy</Text>
            </Text>
        }>
            <View className="mb-4 mt-4">
                <View
                    className="flex-row items-center bg-gray-50 border border-gray-100 rounded-2xl px-4 h-10">
                    <TextInput placeholder="Phone number" placeholderTextColor="#9ca3af"
                               autoFocus={true}
                               autoCapitalize={"none"}
                               style={commonInputStyles.baseInput}
                               className="flex-1 font-sf-bold items-center text-lg text-gray-900 h-full py-0"
                               keyboardType="phone-pad" value={phone} onChangeText={setPhone}/>
                </View>
            </View>

            <View>
                <TouchableOpacity
                    className="flex-row w-1/2 items-center bg-gray-100 px-2 py-1 rounded-full self-center"
                    onPress={() => {
                        Keyboard.dismiss();
                        navigation.replace('EmailLoginScreen')
                    }}>
                    <AntDesign name="mail" size={20} color="gray"/>
                    <Text
                        className="flex-1 font-bold ml-2 items-center text-sx text-gray-500 py-0 text-center">Use
                        email instead</Text>
                </TouchableOpacity>
                <TouchableOpacity
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