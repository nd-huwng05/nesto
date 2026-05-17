import {StyleSheet, Text, View} from 'react-native';
import {UI, cardStyle} from '../../styles/uiTokens';

export function ProfileSettingsSection({title, children}) {
    return (
        <View style={styles.wrap}>
            {title ? (
                <Text className="font-sf-bold text-slate-700 text-sm mb-2 uppercase tracking-wide">
                    {title}
                </Text>
            ) : null}
            <View style={styles.card}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: '100%',
        marginBottom: UI.sectionGap,
    },
    card: {
        ...cardStyle,
        paddingVertical: 4,
        paddingHorizontal: UI.cardPadding,
    },
});
