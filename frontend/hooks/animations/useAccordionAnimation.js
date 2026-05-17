import { useState, useRef } from "react";
import { Animated } from "react-native";

export function useAccordionAnimation(initialDuration = 200) {
    const [isOpen, setIsOpen] = useState(false);
    const [measuredHeight, setMeasuredHeight] = useState(200);

    const rotateAnim = useRef(new Animated.Value(0)).current;
    const expandAnim = useRef(new Animated.Value(0)).current;

    const toggleOpen = () => {
        Animated.parallel([
            Animated.timing(rotateAnim, {
                toValue: isOpen ? 0 : 1,
                duration: initialDuration,
                useNativeDriver: true,
            }),
            Animated.timing(expandAnim, {
                toValue: isOpen ? 0 : 1,
                duration: initialDuration,
                useNativeDriver: false,
            })
        ]).start();

        setIsOpen(!isOpen);
    };

    const rotateArrow = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '90deg']
    });

    const contentHeight = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, measuredHeight]
    });

    const contentOpacity = expandAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1]
    });

    const handleLayout = (event) => {
        const { height } = event.nativeEvent.layout;
        if (height > 0 && height !== measuredHeight) {
            setMeasuredHeight(height);
        }
    };

    return {
        isOpen,
        toggleOpen,
        rotateArrow,
        contentHeight,
        contentOpacity,
        handleLayout
    };
}