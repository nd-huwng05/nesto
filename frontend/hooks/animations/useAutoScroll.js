import {useEffect, useRef, useState} from "react";
import {Dimensions} from "react-native";

const {width: SCREEN_WIDTH} = Dimensions.get('window');

export function useAutoSlider(dataLength, intervalTime = 2000) {
    const flatListRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (dataLength <= 1) return;
        const interval = setInterval(() => {
            let nextIndex = currentIndex + 1;
            if (nextIndex >= dataLength) {
                nextIndex = 0;
            }
            setCurrentIndex(nextIndex)
            flatListRef.current?.scrollToIndex({
                index: nextIndex,
                animated: true,
            });
        }, intervalTime);
        return () => clearInterval(interval);
    }, [currentIndex, dataLength, intervalTime]);

    const onScroll = (event) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffsetX / SCREEN_WIDTH);
        if (index !== currentIndex) {
            setCurrentIndex(index);
        }
    };

    const getItemLayout = (_, index) => ({
        length: SCREEN_WIDTH,
        offset: SCREEN_WIDTH * index,
        index,
    })

    return {
        flatListRef,
        onScroll,
        getItemLayout,
        currentIndex
    };
}