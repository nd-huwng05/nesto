import {SafeAreaView} from 'react-native-safe-area-context';
import {Image, Pressable, Text, TouchableOpacity, View} from "react-native";
import {StoryWidget} from "../../components/login/StoryWidget";

export function AccountScreen({navigation}) {
    return (
        <SafeAreaView className={"flex-1 w-screen h-screen"}>
            <View className={"flex justify-center items-center h-[65%] w-screen"}>
                <StoryWidget/>
            </View>
            <View className={"flex h-[35%] w-screen items-center"}>
                <View className={"h-[50%]"}>
                    <View className={"flex-row items-center justify-between w-[52%]"}>
                        <Image source={require("../../assets/images/icon.png")}
                               className={"aspect-square w-[30%] rounded-xl"} resizeMode={"cover"}/>
                        <Text className={"text-6xl font-wendy text-logo"}>nesto</Text>
                    </View>
                    <Text className={"text-2xl font-wendy text-extra mt-3"}>Find your perfect nest</Text>
                </View>
                <View className={"flex items-center justify-center w-[52%] h-[40%]"}>
                    <TouchableOpacity onPress={() => navigation.navigate('RolesRegisterScreen')}
                        className="bg-primary py-3 pl-6 pr-6 rounded-full items-center justify-center shadow-md"
                        activeOpacity={0.7}>
                        <Text className="text-white text-lg font-sf-semi"> Create an account</Text>
                    </TouchableOpacity>
                    <Pressable activeOpacity={0.5} className="py-2 mt-3"
                               onPress={() => navigation.navigate('EmailLoginScreen')}>
                        <Text className="text-extra text-lg font-sf-semi"> Sign in </Text>
                    </Pressable>
                </View>
            </View>
        </SafeAreaView>
    )
}