import {useCallback, useState} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    Dimensions,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {TabScreenLayout} from '../../components/common/TabScreenLayout';
import {UI} from '../../styles/uiTokens';
import {
    companyService,
    branchService,
    reportService,
    roomService,
} from '../../services/HotelService';

const {width} = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2;

export default function BusinessDashboardScreen({navigation, route}) {
    const [company, setCompany] = useState(null);
    const [branches, setBranches] = useState([]);
    const [dashboard, setDashboard] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [companies, reports] = await Promise.all([
                companyService.list(),
                reportService.dashboard(),
            ]);
            if (companies.results && companies.results.length > 0) {
                const companyData = companies.results[0];
                setCompany(companyData);
                const branchData = await companyService.branches(companyData.id);
                setBranches(Array.isArray(branchData) ? branchData : []);
            }
            setDashboard(reports);
        } catch (error) {
            console.error('Dashboard error:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const formatCurrency = (amount) => {
        return `${Number(amount || 0).toLocaleString('vi-VN')} VND`;
    };

    const formatPercent = (value) => {
        return `${Number(value || 0).toFixed(1)}%`;
    };

    if (isLoading) {
        return (
            <TabScreenLayout backgroundColor={UI.screenBg}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8294FF" />
                </View>
            </TabScreenLayout>
        );
    }

    return (
        <TabScreenLayout backgroundColor={UI.screenBg}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8294FF" />
                }
            >
                <View style={styles.header}>
                    <Text style={styles.greeting}>
                        Welcome back, {company?.name || 'Business Owner'}
                    </Text>
                    <Text style={styles.subtitle}>
                        Here's your business overview
                    </Text>
                </View>

                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, styles.statCardWide]}>
                        <Text style={styles.statLabel}>Total Branches</Text>
                        <Text style={styles.statValue}>{branches.length}</Text>
                        <Text style={styles.statSubtext}>
                            {branches.filter(b => b.is_active).length} active
                        </Text>
                    </View>

                    <View style={[styles.statCard, {width: CARD_WIDTH}]}>
                        <Text style={styles.statLabel}>Occupancy Rate</Text>
                        <Text style={[styles.statValue, styles.statValueGreen]}>
                            {formatPercent(dashboard?.occupancy_rate)}
                        </Text>
                    </View>

                    <View style={[styles.statCard, {width: CARD_WIDTH}]}>
                        <Text style={styles.statLabel}>Total Rooms</Text>
                        <Text style={styles.statValue}>{dashboard?.total_rooms || 0}</Text>
                        <Text style={styles.statSubtext}>
                            {dashboard?.occupied_rooms || 0} occupied
                        </Text>
                    </View>

                    <View style={[styles.statCard, {width: CARD_WIDTH}]}>
                        <Text style={styles.statLabel}>Monthly Revenue</Text>
                        <Text style={[styles.statValue, styles.statValueGreen]}>
                            {formatCurrency(dashboard?.monthly_revenue)}
                        </Text>
                    </View>

                    <View style={[styles.statCard, {width: CARD_WIDTH}]}>
                        <Text style={styles.statLabel}>Today Check-ins</Text>
                        <Text style={[styles.statValue, styles.statValueBlue]}>
                            {dashboard?.today_checkins || 0}
                        </Text>
                    </View>

                    <View style={[styles.statCard, {width: CARD_WIDTH}]}>
                        <Text style={styles.statLabel}>Pending Bookings</Text>
                        <Text style={[styles.statValue, styles.statValueOrange]}>
                            {dashboard?.pending_bookings || 0}
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Branches Overview</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('CreateBranchWizard')}
                        >
                            <Text style={styles.sectionAction}>+ Add Branch</Text>
                        </TouchableOpacity>
                    </View>

                    {branches.map((branch) => (
                        <TouchableOpacity
                            key={branch.id}
                            style={styles.branchCard}
                            onPress={() =>
                                navigation.navigate('BranchDetailScreen', {
                                    branchId: branch.id,
                                })
                            }
                        >
                            <View style={styles.branchInfo}>
                                <Text style={styles.branchName}>{branch.name}</Text>
                                <Text style={styles.branchAddress}>{branch.address}</Text>
                            </View>
                            <View style={styles.branchStats}>
                                <View style={styles.branchStatItem}>
                                    <Text style={styles.branchStatValue}>
                                        {branch.room_count || 0}
                                    </Text>
                                    <Text style={styles.branchStatLabel}>Rooms</Text>
                                </View>
                                <View style={styles.branchStatItem}>
                                    <Text style={styles.branchStatValue}>
                                        {branch.staff_count || 0}
                                    </Text>
                                    <Text style={styles.branchStatLabel}>Staff</Text>
                                </View>
                            </View>
                            <View style={[
                                styles.branchStatus,
                                branch.is_active ? styles.branchStatusActive : styles.branchStatusInactive
                            ]}>
                                <Text style={[
                                    styles.branchStatusText,
                                    branch.is_active ? styles.branchStatusTextActive : styles.branchStatusTextInactive
                                ]}>
                                    {branch.is_active ? 'Active' : 'Inactive'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {branches.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No branches yet</Text>
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('CreateBusinessWizard')}
                        >
                            <View style={[styles.actionIcon, styles.actionIconPurple]}>
                                <Text style={styles.actionIconText}>+</Text>
                            </View>
                            <Text style={styles.actionLabel}>Add Business</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('StaffBusinessScreen')}
                        >
                            <View style={[styles.actionIcon, styles.actionIconBlue]}>
                                <Text style={styles.actionIconText}>👥</Text>
                            </View>
                            <Text style={styles.actionLabel}>Manage Staff</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('ReportBusinessScreen')}
                        >
                            <View style={[styles.actionIcon, styles.actionIconGreen]}>
                                <Text style={styles.actionIconText}>📊</Text>
                            </View>
                            <Text style={styles.actionLabel}>View Reports</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={() => navigation.navigate('EditBusinessScreen')}
                        >
                            <View style={[styles.actionIcon, styles.actionIconOrange]}>
                                <Text style={styles.actionIconText}>⚙️</Text>
                            </View>
                            <Text style={styles.actionLabel}>Settings</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </TabScreenLayout>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
    },
    greeting: {
        fontSize: 28,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
        color: '#64748b',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    statCardWide: {
        width: '100%',
    },
    statLabel: {
        fontSize: 13,
        color: '#64748b',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 32,
        fontWeight: '700',
        color: '#0f172a',
    },
    statValueGreen: {
        color: '#059669',
    },
    statValueBlue: {
        color: '#2563eb',
    },
    statValueOrange: {
        color: '#ea580c',
    },
    statSubtext: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
    },
    sectionAction: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8294FF',
    },
    branchCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    branchInfo: {
        marginBottom: 12,
    },
    branchName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0f172a',
    },
    branchAddress: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    branchStats: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 12,
    },
    branchStatItem: {
        alignItems: 'center',
    },
    branchStatValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
    },
    branchStatLabel: {
        fontSize: 11,
        color: '#94a3b8',
    },
    branchStatus: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    branchStatusActive: {
        backgroundColor: '#dcfce7',
    },
    branchStatusInactive: {
        backgroundColor: '#fee2e2',
    },
    branchStatusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    branchStatusTextActive: {
        color: '#166534',
    },
    branchStatusTextInactive: {
        color: '#991b1b',
    },
    emptyState: {
        padding: 24,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    actionCard: {
        width: (width - 52) / 2,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionIconPurple: {
        backgroundColor: '#f3f0ff',
    },
    actionIconBlue: {
        backgroundColor: '#eff6ff',
    },
    actionIconGreen: {
        backgroundColor: '#dcfce7',
    },
    actionIconOrange: {
        backgroundColor: '#fff7ed',
    },
    actionIconText: {
        fontSize: 20,
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    },
});
