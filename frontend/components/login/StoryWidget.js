import {Image, Text, View} from "react-native";
import {LinearGradient} from "expo-linear-gradient";
import {Feather, Ionicons} from '@expo/vector-icons';

export function StoryWidget() {
    return (
        <View className={"w-[55%] h-[65%] rounded-[36px] border-2 p-3 border-extra bg-white rotate-[10deg]"}>
            <View className={"rounded-[30px] border-2 border-black w-full h-full overflow-hidden"}>
                <Image source={require('../../assets/images/onboarding/nesto_01.jpg')}
                       className={"absolute w-full h-full"} resizeMode="cover"/>
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)',]}
                                locations={[0, 0.3, 1]} className={"w-full h-[50%] absolute bottom-0 rounded-t-[30px]"}>
                    <View className={'flex-1 justify-end px-2 pb-4'}>
                        <Text className={"text-2xl font-bold text-white mb-2"}>Sophie Bennett</Text>
                        <Text className={"text-xm text-white mb-2"}>Hotel is very good</Text>
                        <View className={"flex-row items-center justify-between w-[80%]"}>
                            <View className="flex-row items-center">
                                <Ionicons name="people-outline" size={24} color="white" />
                                <Text className="text-xl font-semibold text-white pl-1">312</Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                                <Feather name="image" size={24} color="white" />
                                <Text className="text-white text-xl font-semibold">48</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        </View>
    )
}