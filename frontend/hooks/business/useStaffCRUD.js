import {useCallback, useState} from 'react';
import {Alert} from 'react-native';
import {fetchBusinessList, fetchBranchList} from '../../services/BranchService';
import {
    createStaff,
    deleteStaff,
    fetchStaffBranchOptions,
    fetchStaffById,
    fetchStaffList,
    updateStaff,
} from '../../services/StaffService';
import {getErrorMessage} from '../../utils/authErrors';

export function useStaffCRUD() {
    const [staffList, setStaffList] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [branchOptions, setBranchOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadBusinesses = useCallback(async () => {
        try {
            const res = await fetchBusinessList();
            if (res.status === 'success') {
                const baseList = Array.isArray(res.data) ? res.data : [];
                const enriched = await Promise.all(
                    baseList.map(async (biz) => {
                        try {
                            const brRes = await fetchBranchList(biz?.id);
                            const branches = Array.isArray(brRes?.data) ? brRes.data : [];
                            return {...biz, branches};
                        } catch (e) {
                            return {...biz, branches: Array.isArray(biz?.branches) ? biz.branches : []};
                        }
                    })
                );
                setBusinesses(enriched);
            }
        } catch (err) {
            Alert.alert('Error', getErrorMessage(err, 'Unable to load businesses.'));
        }
    }, []);

    const loadBranchOptions = useCallback(async () => {
        try {
            const res = await fetchStaffBranchOptions();
            if (res.status === 'success') {
                setBranchOptions(Array.isArray(res?.data) ? res.data : []);
            }
        } catch (err) {
            Alert.alert('Error', getErrorMessage(err, 'Unable to load branches.'));
        }
    }, []);

    const loadList = useCallback(
        async (filters = {}) => {
            setIsLoading(true);
            try {
                const res = await fetchStaffList(filters);
                if (res.status === 'success') {
                    setStaffList(Array.isArray(res?.data) ? res.data : []);
                } else {
                    setStaffList([]);
                    Alert.alert('Error', res.message || 'Unable to load staff.');
                }
            } catch (err) {
                setStaffList([]);
                Alert.alert('Error', getErrorMessage(err, 'Unable to load staff.'));
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const loadStaff = useCallback(
        async (staffId) => {
            const res = await fetchStaffById(staffId);
            if (res.status === 'success') return res.data;
            Alert.alert('Error', res.message || 'Staff member not found.');
            return null;
        },
        []
    );

    const create = useCallback(
        async (payload) => {
            setIsSaving(true);
            try {
                const res = await createStaff(payload);
                if (res.status === 'success') {
                    await loadList();
                    return res;
                }
                console.log('API ERROR:', res?.data);
                Alert.alert('Error', res.message || 'Unable to create staff.');
                return res;
            } catch (err) {
                console.log('API ERROR:', err?.response?.data);
                Alert.alert('Error', getErrorMessage(err, 'Unable to create staff.'));
                return {status: 'error'};
            } finally {
                setIsSaving(false);
            }
        },
        [loadList]
    );

    const update = useCallback(
        async (staffId, payload) => {
            setIsSaving(true);
            try {
                const res = await updateStaff(staffId, payload);
                if (res.status === 'success') {
                    await loadList();
                    return res;
                }
                console.log('API ERROR:', res?.data);
                Alert.alert('Error', res.message || 'Unable to update staff.');
                return res;
            } catch (err) {
                console.log('API ERROR:', err?.response?.data);
                Alert.alert('Error', getErrorMessage(err, 'Unable to update staff.'));
                return {status: 'error'};
            } finally {
                setIsSaving(false);
            }
        },
        [loadList]
    );

    const remove = useCallback(
        async (staffId) => {
            setIsSaving(true);
            try {
                const res = await deleteStaff(staffId);
                if (res.status === 'success') {
                    await loadList();
                    return res;
                }
                Alert.alert('Error', res.message || 'Unable to delete staff.');
                return res;
            } catch (err) {
                Alert.alert('Error', getErrorMessage(err, 'Unable to delete staff.'));
                return {status: 'error'};
            } finally {
                setIsSaving(false);
            }
        },
        [loadList]
    );

    return {
        staffList,
        businesses,
        branchOptions,
        isLoading,
        isSaving,
        loadList,
        loadBusinesses,
        loadBranchOptions,
        loadStaff,
        create,
        update,
        remove,
    };
}
