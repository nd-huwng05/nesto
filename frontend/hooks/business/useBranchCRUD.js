import {useCallback, useState} from 'react';
import {Alert} from 'react-native';
import {
    MANAGER_ID,
    createBranch,
    deleteBranch,
    fetchBranchDetail,
    updateBranch,
} from '../../services/BranchService';
import {getErrorMessage} from '../../utils/authErrors';

export function useBranchCRUD(managerId = MANAGER_ID) {
    const [branchDetail, setBranchDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadDetail = useCallback(
        async (branchId) => {
            setIsLoading(true);
            try {
                const res = await fetchBranchDetail(branchId, managerId);
                if (res.status === 'success') {
                    setBranchDetail(res.data);
                    return res.data;
                }
                Alert.alert('Error', res.message || 'Branch not found.');
                return null;
            } catch (err) {
                Alert.alert('Error', getErrorMessage(err, 'Unable to load branch details.'));
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [managerId]
    );

    const create = useCallback(
        async (businessId, payload) => {
            setIsSaving(true);
            try {
                const res = await createBranch(businessId, payload, managerId);
                if (res.status === 'success') return res;
                Alert.alert('Error', res.message || 'Failed to create branch.');
                return null;
            } catch (err) {
                Alert.alert('Error', getErrorMessage(err, 'Failed to create branch.'));
                return null;
            } finally {
                setIsSaving(false);
            }
        },
        [managerId]
    );

    const update = useCallback(
        async (branchId, updates) => {
            setIsSaving(true);
            try {
                const res = await updateBranch(branchId, updates, managerId);
                if (res.status === 'success') {
                    setBranchDetail(res.data);
                    return res;
                }
                Alert.alert('Error', res.message || 'Failed to update branch.');
                return null;
            } catch (err) {
                Alert.alert('Error', getErrorMessage(err, 'Failed to update branch.'));
                return null;
            } finally {
                setIsSaving(false);
            }
        },
        [managerId]
    );

    const remove = useCallback(
        async (branchId, branchName) => {
            return new Promise((resolve) => {
                Alert.alert(
                    'Delete Branch',
                    `Delete "${branchName}"? This action cannot be undone.`,
                    [
                        {text: 'Cancel', style: 'cancel', onPress: () => resolve(false)},
                        {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                                setIsSaving(true);
                                try {
                                    const res = await deleteBranch(branchId, managerId);
                                    if (res.status === 'success') {
                                        Alert.alert('Deleted', 'Branch removed successfully.');
                                        resolve(true);
                                    } else {
                                        Alert.alert('Error', res.message || 'Failed to delete.');
                                        resolve(false);
                                    }
                                } catch (err) {
                                    Alert.alert('Error', getErrorMessage(err, 'Failed to delete branch.'));
                                    resolve(false);
                                } finally {
                                    setIsSaving(false);
                                }
                            },
                        },
                    ]
                );
            });
        },
        [managerId]
    );

    return {
        branchDetail,
        isLoading,
        isSaving,
        loadDetail,
        create,
        update,
        remove,
    };
}
