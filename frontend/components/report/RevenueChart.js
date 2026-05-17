import {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {BarChart} from 'react-native-chart-kit';
import {reportChartConfig} from './chartConfig';

const CHART_HEIGHT = 200;
/** chart-kit reserves space for Y-axis labels on the left */
const Y_AXIS_GUTTER = 4;

export function RevenueChart({monthlyRevenue = []}) {
    const [containerWidth, setContainerWidth] = useState(0);

    if (!monthlyRevenue.length) {
        return (
            <Text className="font-sf text-sm text-gray-400 text-center py-6">No revenue data available.</Text>
        );
    }

    const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);
    const unit = maxRevenue >= 1_000_000_000 ? 1_000_000_000 : 1_000_000;
    const unitLabel = unit === 1_000_000_000 ? 'B' : 'M';

    const labels = monthlyRevenue.map((m) => m.label);
    const data = monthlyRevenue.map((m) => Math.round((m.revenue / unit) * 10) / 10);

    const chartWidth = Math.max(containerWidth - Y_AXIS_GUTTER, 0);

    return (
        <View
            style={styles.container}
            onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0 && Math.abs(w - containerWidth) > 1) {
                    setContainerWidth(w);
                }
            }}
        >
            {chartWidth > 0 ? (
                <View style={styles.chartClip}>
                    <BarChart
                        data={{
                            labels,
                            datasets: [{data}],
                        }}
                        width={chartWidth}
                        height={CHART_HEIGHT}
                        yAxisLabel=""
                        yAxisSuffix={unitLabel}
                        chartConfig={reportChartConfig}
                        style={styles.chart}
                        fromZero
                        showValuesOnTopOfBars={false}
                        withInnerLines
                    />
                </View>
            ) : (
                <View style={{height: CHART_HEIGHT}} />
            )}
            <Text className="font-sf text-[10px] text-gray-400 mt-2 text-center">
                Revenue ({unitLabel} ₫)
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
    },
    chartClip: {
        width: '100%',
        overflow: 'hidden',
        alignItems: 'flex-start',
    },
    chart: {
        borderRadius: 12,
        marginLeft: -4,
    },
});
