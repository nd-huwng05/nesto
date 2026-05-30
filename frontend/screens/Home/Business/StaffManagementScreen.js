import {useCallback, useEffect, useMemo, useState} from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Plus, Users} from 'lucide-react-native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {FormDropdown} from '../../../components/common/FormDropdown';
import {StaffCard} from '../../../components/staff/StaffCard';
import {useStaffCRUD} from '../../../hooks/business/useStaffCRUD';
import {DEFAULT_STAFF_PASSWORD} from '../../../services/StaffService';
import {UI} from '../../../styles/uiTokens';
import {useBusinessPortfolioAccess} from '../../../hooks/business/useBusinessPortfolioAccess';

function getFirstBranchForBusiness(business) {
    const raw = business?.branches;
    const list = raw?.results ?? raw;
    return (Array.isArray(list) ? list : [])[0] || null;
}

export default function StaffManagementScreen({navigation}) {
    const insets = useSafeAreaInsets();
    const {canAccess: canManageStaff, isLoading: profileLoading} = useBusinessPortfolioAccess();
    const {staffList, businesses, isLoading, loadList, loadBusinesses} = useStaffCRUD();
    const safeBusinesses = Array.isArray(businesses) ? businesses : [];
    const safeStaffList = Array.isArray(staffList) ? staffList : [];

    const [refreshing, setRefreshing] = useState(false);
    const [businessFilter, setBusinessFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [openDropdown, setOpenDropdown] = useState(null);
    const [filtersInitialized, setFiltersInitialized] = useState(false);

    const businessOptions = useMemo(
        () => safeBusinesses.map((b) => ({value: b.id, label: b.name})),
        [safeBusinesses]
    );

    const selectedBusiness = useMemo(
        () => safeBusinesses.find((b) => b.id === businessFilter),
        [safeBusinesses, businessFilter]
    );

    const branchOptions = useMemo(() => {
        const raw = selectedBusiness?.branches;
        const branchesList = raw?.results ?? raw;
        const safeBranches = Array.isArray(branchesList) ? branchesList : [];
        return safeBranches
            .filter((br) => br?.id)
            .map((br) => ({value: br.id, label: br.name ?? '—'}));
    }, [selectedBusiness]);

    const listFilters = useMemo(
        () => ({
            businessId: businessFilter,
            branchId: branchFilter,
        }),
        [businessFilter, branchFilter]
    );

    const sortedStaff = useMemo(
        () => [...safeStaffList].sort((a, b) => a.name.localeCompare(b.name, 'vi')),
        [safeStaffList]
    );

    const canAddStaff = Boolean(businessFilter && branchFilter);

    const refreshList = useCallback(
        (filters = listFilters) => {
            if (!filters.businessId || !filters.branchId) return Promise.resolve();
            return loadList(filters);
        },
        [listFilters, loadList]
    );

    const refresh = useCallback(async () => {
        setRefreshing(true);
        await loadBusinesses();
        if (businessFilter && branchFilter) {
            await refreshList({businessId: businessFilter, branchId: branchFilter});
        }
        setRefreshing(false);
    }, [branchFilter, businessFilter, loadBusinesses, refreshList]);

    useFocusEffect(
        useCallback(() => {
            loadBusinesses();
            // Refresh staff list when returning to this tab/screen.
            if (filtersInitialized && businessFilter && branchFilter) {
                refreshList({businessId: businessFilter, branchId: branchFilter});
            }
        }, [loadBusinesses, filtersInitialized, businessFilter, branchFilter, refreshList])
    );

    useEffect(() => {
        if (!safeBusinesses.length) {
            setFiltersInitialized(false);
            return;
        }

        const firstBusiness = safeBusinesses[0];
        const firstBranch = getFirstBranchForBusiness(firstBusiness);

        const businessStillValid = safeBusinesses.some((b) => b.id === businessFilter);
        if (!businessStillValid) {
            setBusinessFilter(firstBusiness.id);
            const branch = getFirstBranchForBusiness(firstBusiness);
            setBranchFilter(branch?.id || '');
            setFiltersInitialized(true);
            return;
        }

        const raw = selectedBusiness?.branches;
        const branchesList = raw?.results ?? raw;
        const branches = Array.isArray(branchesList) ? branchesList : [];
        const branchStillValid = branches.some((br) => br?.id === branchFilter);
        if (!branchStillValid) {
            setBranchFilter(branches[0]?.id || '');
        }

        if (!filtersInitialized) {
            if (!businessFilter) setBusinessFilter(firstBusiness.id);
            if (!branchFilter) setBranchFilter(firstBranch?.id || '');
            setFiltersInitialized(true);
        }
    }, [branchFilter, businessFilter, safeBusinesses, filtersInitialized, selectedBusiness]);

    useEffect(() => {
        if (!filtersInitialized || !businessFilter || !branchFilter) return;
        refreshList(listFilters);
    }, [filtersInitialized, listFilters, refreshList, businessFilter, branchFilter]);

    const handleBusinessChange = (value) => {
        setBusinessFilter(value);
        const business = safeBusinesses.find((b) => b.id === value);
        const firstBranch = getFirstBranchForBusiness(business);
        setBranchFilter(firstBranch?.id || '');
        setOpenDropdown(null);
    };

    const handleBranchChange = (value) => {
        setBranchFilter(value);
        setOpenDropdown(null);
    };

    const openAddStaff = () => {
        if (!canAddStaff) return;
        navigation.navigate('StaffFormScreen', {
            branchId: branchFilter,
            businessId: businessFilter,
            lockAssignment: true,
        });
    };

    const closeDropdowns = () => setOpenDropdown(null);

    const footerBottomPad = Math.max(insets.bottom, 10);

    if (profileLoading) {
        return (
            <TabScreenLayout backgroundColor={UI.screenBg}>
                <ActivityIndicator size="large" color="#8294FF" style={{marginTop: 48}} />
            </TabScreenLayout>
        );
    }

    if (!canManageStaff) {
        return (
            <TabScreenLayout backgroundColor={UI.screenBg}>
                <View style={styles.empty}>
                    <Users size={48} color="#cbd5e1" />
                    <Text className="font-sf-bold text-lg text-slate-700 mt-4">Access restricted</Text>
                    <Text className="font-sf text-sm text-gray-500 text-center mt-2 px-6">
                        Your role does not have permission to manage staff.
                    </Text>
                </View>
            </TabScreenLayout>
        );
    }

    return (
        <TabScreenLayout backgroundColor={UI.screenBg}>
            <View style={styles.inner}>
                <View style={styles.header}>
                    <Text className="font-sf-bold text-2xl text-slate-800">Staff</Text>
                    <Text className="font-sf text-sm text-gray-500 mt-1">
                        Manage team members for a specific branch in your portfolio.
                    </Text>
                </View>

                {openDropdown ? (
                    <Pressable style={styles.dismissOverlay} onPress={closeDropdowns} />
                ) : null}

                {businesses.length === 0 && !isLoading ? (
                    <View style={styles.empty}>
                        <Users size={48} color="#cbd5e1" />
                        <Text className="font-sf-bold text-lg text-slate-700 mt-4">No businesses yet</Text>
                        <Text className="font-sf text-sm text-gray-500 text-center mt-2 px-6">
                            Create a business and branch on the Branch tab before adding staff.
                        </Text>
                    </View>
                ) : (
                    <View style={styles.content}>
                        <View style={styles.filters}>
                            <FormDropdown
                                compact
                                label="Select Business"
                                value={businessFilter}
                                options={businessOptions}
                                onSelect={handleBusinessChange}
                                placeholder="Select business"
                                disabled={businessOptions.length === 0}
                                isOpen={openDropdown === 'business'}
                                onOpenChange={(open) => setOpenDropdown(open ? 'business' : null)}
                                menuZIndex={60}
                            />
                            <FormDropdown
                                compact
                                label="Select Branch"
                                value={branchFilter}
                                options={branchOptions}
                                onSelect={handleBranchChange}
                                placeholder="Select branch"
                                disabled={!businessFilter || branchOptions.length === 0}
                                isOpen={openDropdown === 'branch'}
                                onOpenChange={(open) => setOpenDropdown(open ? 'branch' : null)}
                                menuZIndex={55}
                            />
                        </View>

                        {isLoading && staffList.length === 0 ? (
                            <View className="flex-1 items-center justify-center py-16">
                                <ActivityIndicator size="large" color="#8294FF" />
                            </View>
                        ) : (
                            <FlatList
                                style={styles.list}
                                data={sortedStaff}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.scrollContent}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={refresh}
                                        tintColor="#8294FF"
                                    />
                                }
                                renderItem={({item}) => (
                                    <StaffCard
                                        staff={item}
                                        showBranchLabel={false}
                                        onPress={() =>
                                            navigation.navigate('StaffFormScreen', {staffId: item.id})
                                        }
                                    />
                                )}
                                ListEmptyComponent={
                                    <View style={styles.empty}>
                                        <Users size={48} color="#cbd5e1" />
                                        <Text className="font-sf-bold text-lg text-slate-700 mt-4">
                                            No staff at this branch
                                        </Text>
                                        <Text className="font-sf text-sm text-gray-500 text-center mt-2 px-6">
                                            Tap Add staff below to invite your first team member.
                                        </Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                )}

                <View style={[styles.bottomBar, {paddingBottom: footerBottomPad}]}>
                    <Text className="font-sf text-sm text-gray-600 text-center mb-3 leading-5 px-1">
                        Leave blank on the add form to use default password {DEFAULT_STAFF_PASSWORD}
                    </Text>
                    <TouchableOpacity
                        onPress={openAddStaff}
                        activeOpacity={0.85}
                        disabled={!canAddStaff}
                        style={[styles.addBtn, !canAddStaff && styles.addBtnDisabled]}
                    >
                        <Plus size={22} color="#ffffff" strokeWidth={2.5} />
                        <Text className="font-sf-bold text-base text-white ml-2">Add staff</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TabScreenLayout>
    );
}

const styles = StyleSheet.create({
    inner: {
        flex: 1,
        position: 'relative',
    },
    header: {
        paddingTop: 8,
        paddingBottom: 4,
        paddingHorizontal: 20,
    },
    content: {
        flex: 1,
    },
    dismissOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
    },
    filters: {
        marginBottom: 8,
        zIndex: 10,
        position: 'relative',
        paddingHorizontal: 20,
    },
    list: {
        flex: 1,
        zIndex: 0,
        paddingHorizontal: 20,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 8,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    bottomBar: {
        paddingTop: 12,
        paddingHorizontal: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#e5e7eb',
        backgroundColor: UI.screenBg,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8294FF',
        borderRadius: 16,
        paddingVertical: 14,
        minHeight: 52,
    },
    addBtnDisabled: {
        backgroundColor: '#c7d2fe',
        opacity: 0.85,
    },
});
