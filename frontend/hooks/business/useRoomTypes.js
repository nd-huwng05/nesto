import {useCallback, useState} from 'react';
import {Alert} from 'react-native';
import {
    createRoomType,
    deleteRoomType,
    fetchRoomTypes,
    updateRoomType,
} from '../../services/BranchService';
import {getErrorMessage} from '../../utils/authErrors';

export function useRoomTypes(branchId) {
    const [roomTypes, setRoomTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadList = useCallback(async () => {
        if (!branchId) return [];
        setIsLoading(true);
        try {
            const res = await fetchRoomTypes(branchId);
            if (res.status === 'success') {
                setRoomTypes(res.data);
                return res.data;
            }
            return [];
        } catch (err) {
            Alert.alert('Error', getErrorMessage(err, 'Unable to load room types.'));
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    const save = useCallback(
        async (payload, roomTypeId) => {
            setIsSaving(true);
            try {
                const res = roomTypeId
                    ? await updateRoomType(branchId, roomTypeId, payload)
                    : await createRoomType(branchId, payload);
                if (res.status === 'success') {
                    await loadList();
                    return res;
                }
                Alert.alert('Error', 'Failed to save room type.');
                return null;
            } catch (err) {
                Alert.alert('Error', getErrorMessage(err, 'Failed to save room type.'));
                return null;
            } finally {
                setIsSaving(false);
            }
        },
        [branchId, loadList]
    );

    const remove = useCallback(
        (roomTypeId, name) =>
            new Promise((resolve) => {
                Alert.alert('Delete Room Type', `Remove "${name}" from the catalog?`, [
                    {text: 'Cancel', style: 'cancel', onPress: () => resolve(false)},
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            setIsSaving(true);
                            try {
                                await deleteRoomType(branchId, roomTypeId);
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

    return {roomTypes, isLoading, isSaving, loadList, save, remove};
}
