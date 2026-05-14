import {Platform, StyleSheet} from "react-native";

export const commonInputStyles = StyleSheet.create({
    baseInput: {
        height: Platform.OS === 'ios' ? 40 : '100%',
        paddingTop: 0,
        paddingBottom: 0,
        lineHeight: Platform.OS === 'ios' ? 22 : undefined,
        textAlignVertical: 'center',
    }
})