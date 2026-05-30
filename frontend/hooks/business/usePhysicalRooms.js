import {useCallback, useState} from 'react';
import {Alert} from 'react-native';
import {
    createPhysicalRoom,
    deletePhysicalRoom,
    fetchPhysicalRooms,
    updatePhysicalRoom,
} from '../../services/BranchService';
import {getErrorMessage} from '../../utils/authErrors';

export function usePhysicalRooms(branchId) {
    const [physicalRooms, setPhysicalRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadList = useCallback(async () => {
        if (!branchId) return [];
        setIsLoading(true);
        try {
            const res = await fetchPhysicalRooms(branchId);
            if (res.status === 'success') {
                setPhysicalRooms(res.data);
                return res.data;
            }
            return [];
        } catch (err) {
            Alert.alert('Error', getErrorMessage(err, 'Unable to load physical rooms.'));
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    const save = useCallback(
        async (payload, physicalRoomId) => {
            setIsSaving(true);
            try {
                const res = physicalRoomId
                    ? await updatePhysicalRoom(branchId, physicalRoomId, payload)
                    : await createPhysicalRoom(branchId, payload);
                if (res.status === 'success') {
                    await loadList();
                    return res;
                }
                Alert.alert('Error', 'Failed to save physical room.');
                return null;
            } catch (err) {
                Alert.alert('Error', getErrorMessage(err, 'Failed to save physical room.'));
                return null;
            } finally {
                setIsSaving(false);
            }
        },
        [branchId, loadList]
    );

    const remove = useCallback(
        (physicalRoomId, label) =>
            new Promise((resolve) => {
                Alert.alert('Delete Room', `Remove room "${label}" from inventory?`, [
                    {text: 'Cancel', style: 'cancel', onPress: () => resolve(false)},
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            setIsSaving(true);
                            try {
                                await deletePhysicalRoom(branchId, physicalRoomId);
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

    return {physicalRooms, isLoading, isSaving, loadList, save, remove};
}
