import {StyleSheet} from 'react-native';

/** Shared pill chips for report filters */
export const reportChipStyles = StyleSheet.create({
    scrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingRight: 4,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        borderWidth: 1,
        maxWidth: 240,
    },
    chipActive: {
        backgroundColor: '#8294FF',
        borderColor: '#8294FF',
    },
    chipIdle: {
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
    },
    chipText: {
        fontSize: 14,
    },
    chipTextActive: {
        color: '#ffffff',
        fontWeight: '600',
    },
    chipTextIdle: {
        color: '#475569',
    },
});
