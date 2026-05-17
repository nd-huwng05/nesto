const PRIMARY_RGB = '130, 148, 255';

export const reportChartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${PRIMARY_RGB}, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    propsForBackgroundLines: {
        stroke: '#f1f5f9',
        strokeDasharray: '',
    },
    propsForLabels: {
        fontSize: 10,
    },
    barPercentage: 0.45,
};
