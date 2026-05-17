import {StyleSheet, Text, View} from 'react-native';
import {UI, cardStyle} from '../../styles/uiTokens';

export function DetailSection({title, children}) {
    return (
        <View style={styles.wrap}>
            <Text className="font-sf-bold text-slate-700 text-sm mb-2 uppercase tracking-wide">
                {title}
            </Text>
            <View style={styles.card}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        marginBottom: UI.sectionGap,
    },
    card: {
        ...cardStyle,
    },
});

export function DetailRow({label, value}) {
    if (value === undefined || value === null || value === '') return null;
    return (
        <View className="mb-3 last:mb-0 pb-3 last:pb-0 border-b border-gray-50 last:border-0">
            <Text className="font-sf text-xs text-gray-400 mb-1">{label}</Text>
            <Text className="font-sf-semi text-slate-800 text-sm leading-5">{value}</Text>
        </View>
    );
}
