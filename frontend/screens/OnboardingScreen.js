import React from 'react';
import {Image, View, Text, TouchableOpacity} from "react-native";
import {SafeAreaView} from 'react-native-safe-area-context';
import {ImageGridDecorator} from "../components/onboarding/ImageGridDecorator";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function OnboardingScreen({navigation}) {
    const appearWellcome = async () => {
        try {
            await AsyncStorage.setItem('hasWellcome', 'true')
            navigation.replace('AccountScreen')
        } catch (error) {
            console.error("Error save status onboarding")
        }
    }

    return (
        <>
            <View className="flex-1 bg-white w-screen h-screen">
                <Image source={require('../assets/images/decorator/decorate_01.png')}
                       className="absolute top-[-90px] right-[-20px] h-[1200px] w-[650px]" resizeMode="contain"/>
                <SafeAreaView className="flex-1 justify-between pt-20">
                    <View className="flex w-full h-[70%] ">
                        <ImageGridDecorator/>
                    </View>
                    <View className="flex w-full self-center justify-between h-[30%]">
                        <View>
                            <Text className=" text-[34px] font-wendy text-center mb-3">
                                Find Your Dream Stay
                            </Text>
                            <Text className="text-[16px] pl-10 pr-10 font-sf text-extra text-center leading-5">
                                Discover thousands of beautiful hotels and homestays at the best prices for your next
                                vacation.
                            </Text>
                        </View>

                        <TouchableOpacity className="bg-primary w-[85%] py-4 rounded-2xl self-center" onPress={appearWellcome}>
                            <Text className="text-white text-center font-sf-semi text-base">
                                Get Started
                            </Text>
                        </TouchableOpacity>
                    </View>

                </SafeAreaView>
            </View>
        </>
    )
}