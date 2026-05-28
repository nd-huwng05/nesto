import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import {CalendarCheck, Wallet} from 'lucide-react-native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {ReportBusinessFilter} from '../../../components/report/ReportBusinessFilter';
import {ReportBranchFilter} from '../../../components/report/ReportBranchFilter';
import {ReportStatCard, ReportCsatCard} from '../../../components/report/ReportStatCard';
import {ReportSection} from '../../../components/report/ReportSection';
import {RevenueChart} from '../../../components/report/RevenueChart';
import {OccupancyGauge} from '../../../components/report/OccupancyGauge';
import {CsatStars} from '../../../components/report/CsatStars';
import {useReportDashboard} from '../../../hooks/business/useReportDashboard';
import {REPORT_SCREEN_PADDING, REPORT_SECTION_GAP, REPORT_STAT_GAP} from '../../../components/report/reportLayout';
import {UI} from '../../../styles/uiTokens';
import {formatReportNumber, formatReportVnd} from '../../../utils/formatReport';
import {useManagerProfile} from '../../../configuration/ManagerProfileContext';
import {AUTH_ROLES} from '../../../constants/authRoles';

export default function ReportBusinessScreen() {
    const {profile} = useManagerProfile();
    const groups = Array.isArray(profile?.groups) ? profile.groups : [];
    const canViewReports =
        [AUTH_ROLES.SUPER_ADMIN, AUTH_ROLES.BUSINESS_OWNER, AUTH_ROLES.MANAGER].includes(profile?.rawRole) ||
        groups.some((g) => ['Admin_Group', 'Business_Group', 'Manager_Group'].includes(g));
    const {
        businessFilter,
        branchFilter,
        businessOptions,
        branchOptions,
        dashboard,
        isLoading,
        isRefreshing,
        selectBusiness,
        selectBranch,
        refresh,
    } = useReportDashboard();

    const {width: windowWidth} = useWindowDimensions();
    const twoColumnInsights = windowWidth >= 400;

    const safeDashboard = dashboard || {};
    const totalRevenue = Number.isFinite(Number(safeDashboard?.totalRevenue)) ? Number(safeDashboard.totalRevenue) : 0;
    const totalBookings = Number.isFinite(Number(safeDashboard?.totalBookings)) ? Number(safeDashboard.totalBookings) : 0;
    const csatScore = Number.isFinite(Number(safeDashboard?.csatScore)) ? Number(safeDashboard.csatScore) : 0;
    const occupancyRate = Number.isFinite(Number(safeDashboard?.occupancyRate)) ? Number(safeDashboard.occupancyRate) : 0;
    const monthlyRevenue = Array.isArray(safeDashboard?.monthlyRevenue) ? safeDashboard.monthlyRevenue : [];
    const monthlyRevenueSafe = monthlyRevenue
        .filter((row) => row && typeof row === 'object')
        .map((row) => ({
            label: String(row.label ?? ''),
            revenue: Number.isFinite(Number(row.revenue)) ? Number(row.revenue) : 0,
        }));

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
                <Text className="font-sf text-sm text-gray-500 mt-1 mb-1">
                    Performance overview for your portfolio
                </Text>

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

                {isLoading && !dashboard ? (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" color="#8294FF" />
                        <Text className="font-sf text-gray-400 text-sm mt-3">Loading dashboard…</Text>
                    </View>
                ) : dashboard ? (
                    <>
                        <Text className="font-sf text-xs text-primary mb-4">
                            {safeDashboard.filterLabel} · {safeDashboard.periodLabel}
                        </Text>

                        {/* Stat cards: 2-column grid + full-width CSAT */}
                        <View style={styles.statGrid}>
                            <View style={styles.statHalf}>
                                <ReportStatCard
                                    label="Total Revenue"
                                    value={formatReportVnd(totalRevenue)}
                                    hint="Last 6 months"
                                    icon={Wallet}
                                />
                            </View>
                            <View style={styles.statHalf}>
                                <ReportStatCard
                                    label="Total Bookings"
                                    value={formatReportNumber(totalBookings)}
                                    hint="Confirmed stays"
                                    icon={CalendarCheck}
                                    accentClassName="bg-violet-100"
                                    iconColor="#7c3aed"
                                />
                            </View>
                            <View style={styles.statFull}>
                                <ReportCsatCard score={csatScore} />
                            </View>
                        </View>

                        <ReportSection title="Revenue Trend">
                            <RevenueChart monthlyRevenue={monthlyRevenueSafe} />
                        </ReportSection>

                        <View style={styles.insightsRow}>
                            <View
                                style={[
                                    styles.insightCell,
                                    twoColumnInsights ? styles.insightCellHalf : styles.insightCellFull,
                                ]}
                            >
                                <ReportSection>
                                    <OccupancyGauge rate={occupancyRate} />
                                </ReportSection>
                            </View>
                            <View
                                style={[
                                    styles.insightCell,
                                    twoColumnInsights ? styles.insightCellHalf : styles.insightCellFull,
                                ]}
                            >
                                <ReportSection>
                                    <Text className="font-sf-bold text-slate-700 text-sm text-center mb-3">
                                        Housekeeping Completion
                                    </Text>
                                    <CsatStars score={csatScore} centered />
                                    <Text className="font-sf text-xs text-gray-500 text-center mt-4 leading-5">
                                        Based on completed housekeeping tasks across the selected scope.
                                    </Text>
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
    statFull: {
        width: '100%',
        paddingHorizontal: REPORT_STAT_GAP / 2,
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
    insightCellHalf: {
        width: '50%',
    },
    insightCellFull: {
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
