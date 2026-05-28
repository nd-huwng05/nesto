import {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, Text, TouchableOpacity, View} from 'react-native';
import {FormScreenLayout} from '../../../components/common/FormScreenLayout';
import {DetailScreenHeader} from '../../../components/business/DetailScreenHeader';
import {MultiImagePicker} from '../../../components/business/MultiImagePicker';
import {useBranchCRUD} from '../../../hooks/business/useBranchCRUD';
import {fetchBranchDetail, updateBranch} from '../../../services/BranchService';

export default function EditBranchMediaScreen({navigation, route}) {
    const {branchId} = route.params || {};
    const {isSaving} = useBranchCRUD();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetchBranchDetail(branchId);
                if (!alive) return;
                if (res?.status === 'success') {
                    const rawImages = Array.isArray(res?.data?.images) ? res.data.images : [];
                    const cover = res?.data?.image ? [res.data.image] : [];
                    const gallery = (rawImages.length ? rawImages : cover).filter(Boolean);
                    setImages(gallery);
                } else {
                    setImages([]);
                    Alert.alert('Error', res?.message || 'Could not load branch photos.');
                }
            } catch (err) {
                if (alive) {
                    setImages([]);
                    Alert.alert(
                        'Error',
                        err?.response?.data?.detail || err?.message || 'Could not load branch photos.'
                    );
                }
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [branchId]);

    const handleSave = async () => {
        if (images.length === 0) {
            Alert.alert('Validation', 'Add at least one photo for this branch.');
            return;
        }
        setSaving(true);
        try {
            const res = await updateBranch(branchId, {images, image: images[0]});
            if (res.status === 'success') {
                Alert.alert('Saved', 'Branch photos updated.', [
                    {text: 'OK', onPress: () => navigation.goBack()},
                ]);
            } else {
                Alert.alert('Error', res.message || 'Failed to update photos.');
            }
        } catch {
            Alert.alert('Error', 'Failed to update photos.');
        } finally {
            setSaving(false);
        }
    };

    const busy = saving || isSaving;

    const saveButton = (
        <TouchableOpacity
            onPress={handleSave}
            disabled={busy}
            activeOpacity={0.85}
            className={`py-4 rounded-full items-center min-h-[52px] justify-center ${
                busy ? 'bg-gray-300' : 'bg-primary'
            }`}
        >
            {busy ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text className="text-white font-sf-bold text-base">Save Photos</Text>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <FormScreenLayout>
                <View className="flex-1 items-center justify-center py-20">
                    <ActivityIndicator size="large" color="#8294FF" />
                </View>
            </FormScreenLayout>
        );
    }

    return (
        <FormScreenLayout footer={saveButton}>
            <DetailScreenHeader
                onBack={() => navigation.goBack()}
                title="Update Photos"
                showDelete={false}
            />

            <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
                <Text className="font-sf text-xs text-gray-500 mb-3 text-center">
                    First image is used as the cover in listings and branch detail.
                </Text>
                <MultiImagePicker
                    images={images}
                    onChange={setImages}
                    label="Facade, lobby, rooms, and surroundings"
                />
            </View>
        </FormScreenLayout>
    );
}
