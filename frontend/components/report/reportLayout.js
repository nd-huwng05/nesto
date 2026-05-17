import {Dimensions} from 'react-native';

/** Horizontal padding on ReportBusinessScreen ScrollView */
export const REPORT_SCREEN_PADDING = 20;

/** Inner padding on white cards (p-4) */
export const REPORT_CARD_PADDING = 16;

/** Vertical gap between dashboard sections */
export const REPORT_SECTION_GAP = 16;

/** Gap between stat cards in a row */
export const REPORT_STAT_GAP = 12;

export function getReportContentWidth(windowWidth = Dimensions.get('window').width) {
    return windowWidth - REPORT_SCREEN_PADDING * 2;
}

/** Usable width inside a DetailSection / white card */
export function getReportCardInnerWidth(windowWidth = Dimensions.get('window').width) {
    return getReportContentWidth(windowWidth) - REPORT_CARD_PADDING * 2;
}
