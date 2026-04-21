import {View, Image, Animated} from "react-native";
import {useEffect, useRef, useState} from "react";

function SquareItem({ imageSource }) {
    return (
        <View className={`w-full aspect-square rounded-[24px] overflow-hidden bg-gray-200 mb-4`}>
            <Image source={imageSource} className="absolute w-[150%] h-[150%] top-[-25%] left-[-25%] -rotate-[45deg]" resizeMode="cover"/>
        </View>
    );
}

export function ImageGridDecorator() {
    const bgImages = [
        require('../../assets/images/onboarding/nesto_01.jpg'),
        require('../../assets/images/onboarding/nesto_02.jpg'),
        require('../../assets/images/onboarding/nesto_03.jpg'),
        require('../../assets/images/onboarding/nesto_04.jpg'),
        require('../../assets/images/onboarding/nesto_05.jpg'),
        require('../../assets/images/onboarding/nesto_06.jpg'),
        require('../../assets/images/onboarding/nesto_07.jpg'),
    ]

    return (
        <View className="flex-1 justify-center items-center">
            <View className="flex-row p-4 rotate-[45deg]">
                <View className="flex-1 flex-col justify-center pr-2">
                    <SquareItem imageSource={bgImages[0]}/>
                    <SquareItem imageSource={bgImages[1]}/>
                </View>

                <View className="flex-1 flex-col justify-center px-2">
                    <SquareItem imageSource={bgImages[2]}/>
                    <SquareItem imageSource={bgImages[3]}/>
                    <SquareItem imageSource={bgImages[4]}/>
                </View>

                <View className="flex-1 flex-col justify-center pl-2">
                    <SquareItem imageSource={bgImages[5]}/>
                    <SquareItem imageSource={bgImages[6]}/>
                </View>
            </View>
        </View>
    );
}