import {SafeAreaView} from "react-native-safe-area-context";
import {Image, Keyboard, KeyboardAvoidingView, ScrollView, Text, TouchableOpacity, View} from "react-native";
import {ChevronLeft} from "lucide-react-native";
import React from "react";

export const AccountLayout = ({navigation, title, children, onContinue, isValid, footerText}) => {
    return (
        <SafeAreaView className="flex-1">
            <Image source={require('../assets/images/decorator/decorate_02.png')}
                   className="absolute top-[-190px] right-[-80px] h-[1200px] w-[650px] -rotate-180"
                   resizeMode="contain"/>
            <KeyboardAvoidingView behavior="padding" className="flex-1">
                <ScrollView contentContainerStyle={{flexGrow: 1}} showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled" className="px-6">

                    <View className="mt-4">
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="w-10 h-10 border border-gray-200 rounded-full items-center justify-center">
                            <ChevronLeft size={24} color={"#1f2937"} strokeWidth={2}/>
                        </TouchableOpacity>
                    </View>


                    <View className='flex-1 justify-center'>
                        <Text className="text-3xl font-sf-bold text-center mb-3">{title}</Text>
                        {children}
                    </View>

                    <View className="mt-auto mb-3 items-center">
                        {footerText && footerText}
                        <TouchableOpacity
                            className={`${isValid ? 'bg-primary' : 'bg-gray-300'} w-full py-4 rounded-full self-center`}
                            disabled={!isValid}
                            onPress={() => {
                                Keyboard.dismiss();
                                onContinue();
                            }}
                        >
                            <Text className="text-white text-center font-sf-bold text-base">
                                Continue
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}