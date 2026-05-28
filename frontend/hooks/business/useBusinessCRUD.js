import {useCallback, useState} from 'react';
import {Alert} from 'react-native';
import {
    MANAGER_ID,
    createBusiness,
    deleteBusiness,
    fetchBusinessDetail,
    fetchBusinessList,
    fetchBranchList,
    updateBusiness,
} from '../../services/BranchService';
import {getErrorMessage} from '../../utils/authErrors';

export function useBusinessCRUD(managerId = MANAGER_ID) {
    const [businesses, setBusinesses] = useState([]);
    const [businessDetail, setBusinessDetail] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadList = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetchBusinessList(managerId);
            if (res.status === 'success') {
                const baseList = Array.isArray(res.data) ? res.data : [];

                // Attach branches per business because business list may not include nested branches.
                const enriched = await Promise.all(
                    baseList.map(async (biz) => {
                        try {
                            const brRes = await fetchBranchList(biz?.id);
                            const branchData = brRes?.data?.results || brRes?.data;
                            const branches = Array.isArray(branchData) ? branchData : [];
                            return {...biz, branches};
                        } catch (e) {
                            return {...biz, branches: Array.isArray(biz?.branches) ? biz.branches : []};
                        }
                    })
                );

                setBusinesses(enriched);
                return enriched;
            }
            Alert.alert('Error', 'Unable to load businesses.');
            return [];
        } catch (err) {
            Alert.alert('Error', getErrorMessage(err, 'Unable to load businesses.'));
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [managerId]);

    const loadDetail = useCallback(
        async (businessId) => {
            setIsLoading(true);
            try {
                const res = await fetchBusinessDetail(businessId, managerId);
                if (res.status === 'success') {
                    setBusinessDetail(res.data);
                    return res.data;
                }
                Alert.alert('Error', res.message || 'Business not found.');
                return null;
            } catch (err) {
                Alert.alert('Error', getErrorMessage(err, 'Unable to load business details.'));
                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [managerId]
    );

    const create = useCallback(
        async (payload) => {
            setIsSaving(true);
            try {
                const res = await createBusiness(payload, managerId);
                if (res.status === 'success') return res;
                Alert.alert('Error', res.message || 'Failed to create business.');
                return null;
            } catch (err) {
                Alert.alert('Error', getErrorMessage(err, 'Failed to create business.'));
                return null;
            } finally {
                setIsSaving(false);
            }
        },
        [managerId]
    );

    const update = useCallback(
        async (businessId, updates) => {
            setIsSaving(true);
            try {
                const res = await updateBusiness(businessId, updates, managerId);
                if (res.status === 'success') {
                    setBusinessDetail(res.data);
                    return res;
                }
                Alert.alert('Error', res.message || 'Failed to update business.');
                return null;
            } catch (err) {
                Alert.alert('Error', getErrorMessage(err, 'Failed to update business.'));
                return null;
            } finally {
                setIsSaving(false);
            }
        },
        [managerId]
    );

    const remove = useCallback(
        async (businessId, businessName) => {
            return new Promise((resolve) => {
                Alert.alert(
                    'Delete Business',
                    `Delete "${businessName}"? All branches under this business will also be removed.`,
                    [
                        {text: 'Cancel', style: 'cancel', onPress: () => resolve(false)},
                        {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                                setIsSaving(true);
                                try {
                                    const res = await deleteBusiness(businessId, managerId);
                                    if (res.status === 'success') {
                                        Alert.alert('Deleted', 'Business removed successfully.');
                                        resolve(true);
                                    } else {
                                        Alert.alert('Error', res.message || 'Failed to delete.');
                                        resolve(false);
                                    }
                                } catch (err) {
                                    Alert.alert('Error', getErrorMessage(err, 'Failed to delete business.'));
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
        businesses,
        businessDetail,
        isLoading,
        isSaving,
        loadList,
        loadDetail,
        create,
        update,
        remove,
    };
}
