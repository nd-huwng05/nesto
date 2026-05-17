import {Platform, StyleSheet} from 'react-native';

const INPUT_HEIGHT = 48;

export const commonInputStyles = StyleSheet.create({
    baseInput: {
        height: INPUT_HEIGHT,
        minHeight: INPUT_HEIGHT,
        maxHeight: INPUT_HEIGHT,
        paddingTop: Platform.OS === 'ios' ? 0 : 8,
        paddingBottom: Platform.OS === 'ios' ? 0 : 8,
        lineHeight: Platform.OS === 'ios' ? 22 : 20,
        textAlignVertical: 'center',
    },
    multilineInput: {
        height: undefined,
        minHeight: 96,
        maxHeight: 160,
        paddingTop: 12,
        paddingBottom: 12,
        textAlignVertical: 'top',
        lineHeight: 20,
    },
});
