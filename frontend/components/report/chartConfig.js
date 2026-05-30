const PRIMARY_RGB = '130, 148, 255';

export const REPORT_CHART_COLORS = [
    `rgba(${PRIMARY_RGB}, 1)`,
    'rgba(124, 58, 237, 1)',
    'rgba(34, 197, 94, 1)',
    'rgba(245, 158, 11, 1)',
    'rgba(239, 68, 68, 1)',
    'rgba(14, 165, 233, 1)',
    'rgba(100, 116, 139, 1)',
];

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

export const reportLineChartConfig = {
    ...reportChartConfig,
    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
    propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: '#7c3aed',
    },
};

/** Stable colors keyed by backend status codes */
export const BOOKING_STATUS_COLORS = {
    PENDING: 'rgba(245, 158, 11, 1)',
    CONFIRMED: 'rgba(130, 148, 255, 1)',
    CHECKED_IN: 'rgba(34, 197, 94, 1)',
    CHECKED_OUT: 'rgba(100, 116, 139, 1)',
    CANCELLED: 'rgba(239, 68, 68, 1)',
    CANCELLED_NO_SHOW: 'rgba(239, 68, 68, 1)',
};

export const ROOM_STATUS_COLORS = {
    AVAILABLE: 'rgba(34, 197, 94, 1)',
    OCCUPIED: 'rgba(130, 148, 255, 1)',
    DIRTY: 'rgba(245, 158, 11, 1)',
    CLEANING: 'rgba(14, 165, 233, 1)',
    MAINTENANCE: 'rgba(124, 58, 237, 1)',
    OUT_OF_ORDER: 'rgba(239, 68, 68, 1)',
};
