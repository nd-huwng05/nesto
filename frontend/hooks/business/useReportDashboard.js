import {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert} from 'react-native';
import {
    MANAGER_ID,
    fetchReportBranchFilters,
    fetchReportBusinessFilters,
    fetchReportDashboard,
} from '../../services/ReportService';
import {getErrorMessage} from '../../utils/authErrors';

export function useReportDashboard(managerId = MANAGER_ID) {
    const [businessFilter, setBusinessFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('all');
    const [businessOptions, setBusinessOptions] = useState([{id: 'all', name: 'All Businesses'}]);
    const [allBranchOptions, setAllBranchOptions] = useState([{id: 'all', name: 'All Branches', businessId: 'all'}]);
    const [dashboard, setDashboard] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const branchOptions = useMemo(() => {
        if (businessFilter === 'all') {
            return allBranchOptions;
        }
        const scoped = allBranchOptions.filter(
            (br) => br.id === 'all' || br.businessId === businessFilter
        );
        if (scoped.length <= 1) {
            return [{id: 'all', name: 'All Branches', businessId: businessFilter}];
        }
        return scoped;
    }, [allBranchOptions, businessFilter]);

    const loadFilters = useCallback(async () => {
        try {
            const [bizRes, brRes] = await Promise.all([
                fetchReportBusinessFilters(managerId),
                fetchReportBranchFilters(managerId),
            ]);
            if (bizRes.status === 'success' && bizRes.data?.length) {
                setBusinessOptions(bizRes.data);
            }
            if (brRes.status === 'success' && brRes.data?.length) {
                setAllBranchOptions(brRes.data);
            }
        } catch (err) {
            Alert.alert('Error', getErrorMessage(err, 'Unable to load report filters.'));
        }
    }, [managerId]);

    const loadDashboard = useCallback(
        async (businessId = businessFilter, branchId = branchFilter, {silent = false} = {}) => {
            if (!silent) setIsLoading(true);
            else setIsRefreshing(true);
            try {
                const res = await fetchReportDashboard(businessId, branchId, managerId);
                if (res.status === 'success') {
                    setDashboard(res.data);
                } else {
                    setDashboard(null);
                    Alert.alert('Error', res.message || 'Unable to load report data.');
                }
            } catch (err) {
                setDashboard(null);
                Alert.alert('Error', getErrorMessage(err, 'Unable to load report data.'));
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [branchFilter, businessFilter, managerId]
    );

    const selectBusiness = useCallback((businessId) => {
        setBusinessFilter(businessId);
        setBranchFilter('all');
    }, []);

    const selectBranch = useCallback((branchId) => {
        setBranchFilter(branchId);
    }, []);

    useEffect(() => {
        loadFilters();
    }, [loadFilters]);

    useEffect(() => {
        const validIds = branchOptions.map((b) => b.id);
        if (!validIds.includes(branchFilter)) {
            setBranchFilter('all');
        }
    }, [branchOptions, branchFilter]);

    useEffect(() => {
        loadDashboard(businessFilter, branchFilter);
    }, [businessFilter, branchFilter, loadDashboard]);

    const refresh = useCallback(
        () => loadDashboard(businessFilter, branchFilter, {silent: true}),
        [businessFilter, branchFilter, loadDashboard]
    );

    return {
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
    };
}
