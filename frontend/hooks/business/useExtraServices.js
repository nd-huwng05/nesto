import {useCallback, useState} from 'react';
import {Alert} from 'react-native';
import {
    createExtraService,
    deleteExtraService,
    fetchExtraServices,
    updateExtraService,
} from '../../services/BranchService';
import {getErrorMessage} from '../../utils/authErrors';

export function useExtraServices(branchId) {
    const [extraServices, setExtraServices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadList = useCallback(async () => {
        if (!branchId) return [];
        setIsLoading(true);
        try {
            const res = await fetchExtraServices(branchId);
            if (res.status === 'success') {
                setExtraServices(res.data);
                return res.data;
            }
            return [];
        } catch (err) {
            Alert.alert('Error', getErrorMessage(err, 'Unable to load extra services.'));
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    const save = useCallback(
        async (payload, serviceId) => {
            setIsSaving(true);
            try {
                const res = serviceId
                    ? await updateExtraService(branchId, serviceId, payload)
                    : await createExtraService(branchId, payload);
                if (res.status === 'success') {
                    await loadList();
                    return res;
                }
                Alert.alert('Error', 'Failed to save extra service.');
                return null;
            } catch (err) {
                Alert.alert('Error', getErrorMessage(err, 'Failed to save extra service.'));
                return null;
            } finally {
                setIsSaving(false);
            }
        },
        [branchId, loadList]
    );

    const remove = useCallback(
        (serviceId, name) =>
            new Promise((resolve) => {
                Alert.alert('Delete Service', `Remove "${name}" from the catalog?`, [
                    {text: 'Cancel', style: 'cancel', onPress: () => resolve(false)},
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            setIsSaving(true);
                            try {
                                await deleteExtraService(branchId, serviceId);
                                await loadList();
                                resolve(true);
                            } catch (err) {
                                Alert.alert('Error', getErrorMessage(err, 'Failed to delete.'));
                                resolve(false);
                            } finally {
                                setIsSaving(false);
                            }
                        },
                    },
                ]);
            }),
        [branchId, loadList]
    );

    return {extraServices, isLoading, isSaving, loadList, save, remove};
}
