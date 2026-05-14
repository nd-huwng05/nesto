import {Dimensions, FlatList, Image, Text, View} from "react-native";
import {LinearGradient} from "expo-linear-gradient";
import {Feather, Ionicons} from '@expo/vector-icons';
import {useAutoSlider} from "../../hooks/animations/useAutoScroll";

const {width} = Dimensions.get('window');
const STORIES = [
    {
        id: '1',
        name: 'Sophie Bennett',
        comment: 'Hotel is very good',
        image: require('../../assets/images/onboarding/nesto_01.jpg')
    },
    {
        id: '2',
        name: 'John Doe',
        comment: 'View is successfully.',
        image: require('../../assets/images/onboarding/nesto_02.jpg')
    },
    {
        id: '3',
        name: 'Emma Wilson',
        comment: 'The food is very good',
        image: require('../../assets/images/onboarding/nesto_03.jpg')
    },
];

export function StoryWidget() {
    const {flatListRef, onScroll, getItemLayout, currentIndex} = useAutoSlider(STORIES.length, 3000);

    return (
        <View style={{flex: 1}}>
            <FlatList
                ref={flatListRef}
                data={STORIES}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled={false}
                snapToInterval={width}
                snapToAlignment="center"
                decelerationRate={0.85}
                scrollEventThrottle={16}
                onMomentumScrollEnd={onScroll}
                getItemLayout={getItemLayout}
                keyExtractor={(item) => item.id}
                renderItem={({item}) => (
                    <View style={{width: width}} className="items-center justify-center">
                        <View
                            className={"w-[55%] h-[65%] rounded-[36px] border-2 p-3 border-extra bg-white rotate-[10deg]"}>
                            <View className={"rounded-[30px] border-2 border-black w-full h-full overflow-hidden"}>
                                <Image source={item.image} className={"absolute w-full h-full"} resizeMode="cover"/>
                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
                                    locations={[0, 0.3, 1]}
                                    className={"w-full h-[50%] absolute bottom-0 rounded-t-[30px]"}
                                >
                                    <View className={'flex-1 justify-end px-2 pb-4'}>
                                        <Text className={"text-2xl font-bold text-white mb-2"}>{item.name}</Text>
                                        <Text className={"text-sm text-white mb-2"}>{item.comment}</Text>
                                        <View className={"flex-row items-center justify-between w-[80%]"}>
                                            <View className="flex-row items-center">
                                                <Ionicons name="people-outline" size={24} color="white"/>
                                                <Text className="text-xl font-semibold text-white pl-1">312</Text>
                                            </View>
                                            <View className="flex-row items-center gap-2">
                                                <Feather name="image" size={24} color="white"/>
                                                <Text className="text-white text-xl font-semibold">48</Text>
                                            </View>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </View>
                        </View>
                    </View>
                )}
            />

            <View className="flex-row justify-center absolute bottom-10 w-full">
                {STORIES.map((_, i) => {
                    const active = currentIndex === i;
                    return (
                        <View
                            key={i}
                            className={`h-1.5 rounded-full mx-1 ${
                                active ? "w-8 bg-primary" : "w-2 bg-gray-400"
                            }`}
                            style={{
                                opacity: active ? 1 : 0.5,
                            }}
                        />
                    );
                })}
            </View>
        </View>
    );
}