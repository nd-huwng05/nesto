import {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {ProgressChart} from 'react-native-chart-kit';
import {reportChartConfig} from './chartConfig';

const MAX_GAUGE = 132;
const MIN_GAUGE = 100;

export function OccupancyGauge({rate = 0}) {
    const [containerWidth, setContainerWidth] = useState(0);
    const value = Math.min(100, Math.max(0, Math.round(rate)));
    const progress = value / 100;

    const gaugeSize = containerWidth
        ? Math.min(Math.max(containerWidth - 8, MIN_GAUGE), MAX_GAUGE)
        : MIN_GAUGE;
    const radius = Math.round(gaugeSize * 0.36);
    const strokeWidth = Math.max(8, Math.round(gaugeSize * 0.07));

    return (
        <View
            style={styles.root}
            onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0) setContainerWidth(w);
            }}
        >
            <View style={[styles.gaugeWrap, {width: gaugeSize, height: gaugeSize}]}>
                {containerWidth > 0 ? (
                    <ProgressChart
                        data={{data: [progress]}}
                        width={gaugeSize}
                        height={gaugeSize}
                        strokeWidth={strokeWidth}
                        radius={radius}
                        chartConfig={reportChartConfig}
                        hideLegend
                        style={styles.chart}
                    />
                ) : null}
                <View style={styles.centerLabel} pointerEvents="none">
                    <Text className="font-sf-bold text-2xl text-slate-800">{value}%</Text>
                    <Text className="font-sf text-[10px] text-gray-400 mt-0.5">Occupied</Text>
                </View>
            </View>
            <Text className="font-sf-semi text-slate-700 text-sm mt-3 text-center">Occupancy Rate</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 4,
    },
    gaugeWrap: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    chart: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    centerLabel: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
