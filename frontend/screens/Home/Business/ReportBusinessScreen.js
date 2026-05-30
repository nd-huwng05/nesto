import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import {CalendarCheck, Sparkles, Wallet} from 'lucide-react-native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {ReportBusinessFilter} from '../../../components/report/ReportBusinessFilter';
import {ReportBranchFilter} from '../../../components/report/ReportBranchFilter';
import {ReportPeriodFilter} from '../../../components/report/ReportPeriodFilter';
import {ReportStatCard, ReportCsatCard} from '../../../components/report/ReportStatCard';
import {ReportSection} from '../../../components/report/ReportSection';
import {ReportTrendsPanel} from '../../../components/report/ReportTrendsPanel';
import {ReportBreakdownSwitcher} from '../../../components/report/ReportBreakdownSwitcher';
import {OccupancyGauge} from '../../../components/report/OccupancyGauge';
import {useReportDashboard} from '../../../hooks/business/useReportDashboard';
import {REPORT_SCREEN_PADDING, REPORT_SECTION_GAP, REPORT_STAT_GAP} from '../../../components/report/reportLayout';
import {UI} from '../../../styles/uiTokens';
import {formatReportNumber, formatReportVnd} from '../../../utils/formatReport';
import {useBusinessPortfolioAccess} from '../../../hooks/business/useBusinessPortfolioAccess';

export default function ReportBusinessScreen() {
    const {canAccess: canViewReports, isLoading: profileLoading} = useBusinessPortfolioAccess();
    const {
        businessFilter,
        branchFilter,
        businessOptions,
        branchOptions,
        dashboard,
        isLoading,
        isRefreshing,
        periodFilter,
        selectBusiness,
        selectBranch,
        selectPeriod,
        refresh,
    } = useReportDashboard();

    const {width: windowWidth} = useWindowDimensions();
    const twoColumn = windowWidth >= 380;

    const safeDashboard = dashboard || {};
    const totalRevenue = Number(safeDashboard?.totalRevenue) || 0;
    const totalBookings = Number(safeDashboard?.totalBookings) || 0;
    const csatScore = Number(safeDashboard?.csatScore) || 0;
    const housekeepingRate = Number(safeDashboard?.housekeepingCompletionRate) || 0;
    const occupancyRate = Number(safeDashboard?.occupancyRate) || 0;
    const periodLabel = String(safeDashboard?.periodLabel || 'Last 6 months');

    const monthlyRevenueSafe = (Array.isArray(safeDashboard?.monthlyRevenue) ? safeDashboard.monthlyRevenue : [])
        .filter((row) => row && typeof row === 'object')
        .map((row) => ({
            label: String(row.label ?? ''),
            revenue: Number(row.revenue ?? row.value) || 0,
        }));

    const monthlyBookingsSafe = (Array.isArray(safeDashboard?.monthlyBookings) ? safeDashboard.monthlyBookings : [])
        .filter((row) => row && typeof row === 'object')
        .map((row) => ({
            label: String(row.label ?? ''),
            count: Number(row.count ?? row.value) || 0,
        }));

    const bookingStatusBreakdown = Array.isArray(safeDashboard?.bookingStatusBreakdown)
        ? safeDashboard.bookingStatusBreakdown
        : [];
    const roomStatusBreakdown = Array.isArray(safeDashboard?.roomStatusBreakdown)
        ? safeDashboard.roomStatusBreakdown
        : [];

    if (profileLoading) {
        return (
            <TabScreenLayout backgroundColor={UI.screenBg}>
                <ActivityIndicator size="large" color="#8294FF" style={{marginTop: 48}} />
            </TabScreenLayout>
        );
    }

    if (!canViewReports) {
        return (
            <TabScreenLayout backgroundColor={UI.screenBg}>
                <View style={styles.emptyCard}>
                    <Text className="font-sf-bold text-slate-700 text-base mb-2">Access restricted</Text>
                    <Text className="font-sf text-gray-500 text-center">
                        Your role does not have permission to view financial analytics.
                    </Text>
                </View>
            </TabScreenLayout>
        );
    }

    return (
        <TabScreenLayout backgroundColor={UI.screenBg}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="automatic"
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={refresh}
                        tintColor="#8294FF"
                        colors={['#8294FF']}
                    />
                }
            >
                <Text className="font-sf-bold text-2xl text-slate-800">Reports & Analytics</Text>
                <Text className="font-sf text-sm text-gray-500 mt-1">
                    Portfolio performance at a glance
                </Text>

                <View style={styles.filters}>
                    <ReportBusinessFilter
                        options={businessOptions}
                        selectedId={businessFilter}
                        onSelect={selectBusiness}
                    />
                    <ReportBranchFilter
                        options={branchOptions}
                        selectedId={branchFilter}
                        onSelect={selectBranch}
                    />
                    <ReportPeriodFilter selectedId={periodFilter} onSelect={selectPeriod} />
                </View>

                {isLoading && !dashboard ? (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#8294FF" />
                        <Text className="font-sf text-gray-400 text-sm mt-3">Loading dashboard…</Text>
                    </View>
                ) : dashboard ? (
                    <>
                        <View style={styles.metaRow}>
                            <Text className="font-sf text-xs text-primary">
                                {safeDashboard.filterLabel} · {periodLabel}
                            </Text>
                        </View>

                        <View style={styles.statGrid}>
                            <View style={styles.statHalf}>
                                <ReportStatCard
                                    label="Total Revenue"
                                    value={formatReportVnd(totalRevenue)}
                                    hint={periodLabel}
                                    icon={Wallet}
                                />
                            </View>
                            <View style={styles.statHalf}>
                                <ReportStatCard
                                    label="Total Bookings"
                                    value={formatReportNumber(totalBookings)}
                                    hint="All statuses"
                                    icon={CalendarCheck}
                                    accentClassName="bg-violet-100"
                                    iconColor="#7c3aed"
                                />
                            </View>
                            <View style={styles.statHalf}>
                                <ReportStatCard
                                    label="Housekeeping"
                                    value={`${housekeepingRate.toFixed(0)}%`}
                                    hint="Tasks completed"
                                    icon={Sparkles}
                                    accentClassName="bg-emerald-100"
                                    iconColor="#059669"
                                />
                            </View>
                            <View style={styles.statHalf}>
                                <ReportCsatCard score={csatScore} />
                            </View>
                        </View>

                        <ReportSection title="Trends" chartOverflow>
                            <ReportTrendsPanel
                                monthlyRevenue={monthlyRevenueSafe}
                                monthlyBookings={monthlyBookingsSafe}
                            />
                        </ReportSection>

                        <View style={styles.insightsRow}>
                            <View style={[styles.insightCell, twoColumn ? styles.insightHalf : styles.insightFull]}>
                                <ReportSection title="Occupancy">
                                    <OccupancyGauge rate={occupancyRate} />
                                </ReportSection>
                            </View>
                            <View style={[styles.insightCell, twoColumn ? styles.insightHalf : styles.insightFull]}>
                                <ReportSection title="Breakdown">
                                    <ReportBreakdownSwitcher
                                        bookingStatusBreakdown={bookingStatusBreakdown}
                                        roomStatusBreakdown={roomStatusBreakdown}
                                    />
                                </ReportSection>
                            </View>
                        </View>
                    </>
                ) : (
                    <View style={styles.emptyCard}>
                        <Text className="font-sf text-gray-500 text-center">
                            No report data available for this selection.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </TabScreenLayout>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: REPORT_SCREEN_PADDING,
        paddingTop: 8,
        paddingBottom: 32,
    },
    filters: {
        marginTop: 12,
        gap: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 12,
        gap: 8,
    },
    loading: {
        paddingVertical: 64,
        alignItems: 'center',
    },
    statGrid: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -(REPORT_STAT_GAP / 2),
        marginBottom: REPORT_SECTION_GAP,
    },
    statHalf: {
        width: '50%',
        paddingHorizontal: REPORT_STAT_GAP / 2,
        marginBottom: REPORT_STAT_GAP,
    },
    insightsRow: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -(REPORT_STAT_GAP / 2),
    },
    insightCell: {
        paddingHorizontal: REPORT_STAT_GAP / 2,
        marginBottom: REPORT_SECTION_GAP,
    },
    insightHalf: {
        width: '50%',
    },
    insightFull: {
        width: '100%',
    },
    emptyCard: {
        backgroundColor: UI.cardBg,
        borderRadius: UI.cardRadius,
        borderWidth: 1,
        borderColor: UI.cardBorder,
        padding: 32,
        alignItems: 'center',
    },
});
