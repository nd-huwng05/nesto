import {StyleSheet, Text, View} from 'react-native';
import {formatTrendVndShort, getTrendMax, normalizeTrendRows} from './reportTrendUtils';

const PLOT_HEIGHT = 128;
const PLOT_HEIGHT_COMPACT = 108;
const BAR_COLOR = '#8294FF';

export function RevenueChart({monthlyRevenue = [], compact = false}) {
    const rows = normalizeTrendRows(monthlyRevenue, ['revenue', 'value']);
    const plotHeight = compact ? PLOT_HEIGHT_COMPACT : PLOT_HEIGHT;
    const maxValue = getTrendMax(rows);

    if (!rows.length) {
        return (
            <Text className="font-sf text-sm text-gray-400 text-center py-6">No revenue data available.</Text>
        );
    }

    return (
        <View style={styles.container}>
            <View style={[styles.plotRow, {height: plotHeight}]}>
                {rows.map((row) => {
                    const heightPct = maxValue > 0 ? (row.value / maxValue) * 100 : 0;

                    return (
                        <View key={row.key} style={styles.column}>
                            <Text style={styles.valueLabel} numberOfLines={1}>
                                {row.value > 0 ? formatTrendVndShort(row.value) : '0'}
                            </Text>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.barFill,
                                        {
                                            height: `${heightPct}%`,
                                            backgroundColor: BAR_COLOR,
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                    );
                })}
            </View>
            <View style={styles.labelRow}>
                {rows.map((row) => (
                    <Text key={`${row.key}-label`} style={styles.xLabel} numberOfLines={1}>
                        {row.label}
                    </Text>
                ))}
            </View>
            <Text className="font-sf text-[10px] text-gray-400 mt-2 text-center">
                Revenue by period (₫)
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    plotRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 6,
    },
    column: {
        flex: 1,
        minWidth: 0,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    valueLabel: {
        fontSize: 9,
        color: '#64748b',
        marginBottom: 4,
        textAlign: 'center',
    },
    barTrack: {
        width: '72%',
        flex: 1,
        borderRadius: 8,
        backgroundColor: '#f1f5f9',
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    barFill: {
        width: '100%',
        borderRadius: 8,
    },
    labelRow: {
        width: '100%',
        flexDirection: 'row',
        gap: 6,
        marginTop: 8,
    },
    xLabel: {
        flex: 1,
        minWidth: 0,
        fontSize: 10,
        color: '#64748b',
        textAlign: 'center',
    },
});
