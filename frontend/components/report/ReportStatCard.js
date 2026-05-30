import {StyleSheet, Text, View} from 'react-native';
import {BarChart3} from 'lucide-react-native';
import {UI, cardStyle} from '../../styles/uiTokens';
import {CsatStars} from './CsatStars';

export function ReportStatCard({
    label,
    value,
    hint,
    icon: Icon,
    accentClassName = 'bg-primary/10',
    iconColor = '#8294FF',
}) {
    return (
        <View style={styles.card}>
            {Icon ? (
                <View className={`w-9 h-9 rounded-xl items-center justify-center mb-3 ${accentClassName}`}>
                    <Icon size={18} color={iconColor} />
                </View>
            ) : null}
            <Text className="font-sf text-xs text-gray-400" numberOfLines={1}>
                {label}
            </Text>
            <Text className="font-sf-bold text-slate-800 text-lg mt-1" numberOfLines={2}>
                {value}
            </Text>
            {hint ? (
                <Text className="font-sf text-[10px] text-gray-400 mt-1" numberOfLines={2}>
                    {hint}
                </Text>
            ) : null}
        </View>
    );
}

export function ReportCsatCard({score}) {
    return (
        <View style={styles.card}>
            <View className="w-9 h-9 rounded-xl items-center justify-center mb-3 bg-amber-100">
                <BarChart3 size={18} color="#f59e0b" />
            </View>
            <Text className="font-sf text-xs text-gray-400" numberOfLines={1}>
                Guest Satisfaction
            </Text>
            <View style={styles.csatWrap}>
                <CsatStars score={score} compact />
            </View>
            <Text className="font-sf text-[10px] text-gray-400 mt-1">Average review score</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        ...cardStyle,
        minHeight: 112,
        width: '100%',
        justifyContent: 'flex-start',
    },
    csatWrap: {
        marginTop: 6,
        alignSelf: 'flex-start',
    },
});
