import {StyleSheet, Text, View} from 'react-native';
import {UI, cardStyle} from '../../styles/uiTokens';
import {REPORT_SECTION_GAP} from './reportLayout';

export function ReportSection({title, children, style}) {
    return (
        <View style={[styles.section, style]}>
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
    section: {
        marginBottom: REPORT_SECTION_GAP,
        width: '100%',
    },
    card: {
        ...cardStyle,
        width: '100%',
    },
});
