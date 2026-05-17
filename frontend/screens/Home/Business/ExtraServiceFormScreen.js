import {useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {FormScreenLayout} from '../../../components/common/FormScreenLayout';
import {DetailScreenHeader} from '../../../components/business/DetailScreenHeader';
import {useExtraServices} from '../../../hooks/business/useExtraServices';
import {fetchExtraServices} from '../../../services/BranchService';
import {commonInputStyles} from '../../../styles/TextInputStyles';

export default function ExtraServiceFormScreen({navigation, route}) {
    const {branchId, serviceId} = route.params || {};
    const isEdit = Boolean(serviceId);
    const {save, isSaving} = useExtraServices(branchId);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        if (!isEdit) {
            setLoading(false);
            return;
        }
        (async () => {
            const res = await fetchExtraServices(branchId);
            const found = res.data?.find((s) => s.id === serviceId);
            if (found) {
                setName(found.name);
                setDescription(found.description || '');
                setPrice(String(found.price));
            }
            setLoading(false);
        })();
    }, [branchId, isEdit, serviceId]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation', 'Service name is required.');
            return;
        }
        const priceNum = price.trim() === '' ? 0 : Number(price);
        if (Number.isNaN(priceNum) || priceNum < 0) {
            Alert.alert('Validation', 'Enter a valid price (0 for included).');
            return;
        }

        const res = await save(
            {name: name.trim(), description: description.trim(), price: priceNum},
            serviceId
        );

        if (res?.status === 'success') {
            Alert.alert('Saved', 'Extra service saved successfully.', [
                {text: 'OK', onPress: () => navigation.goBack()},
            ]);
        }
    };

    const saveButton = (
        <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
            className={`py-4 rounded-full items-center min-h-[52px] justify-center ${
                isSaving ? 'bg-gray-300' : 'bg-primary'
            }`}
        >
            {isSaving ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text className="text-white font-sf-bold text-base">Save Service</Text>
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
                title={isEdit ? 'Edit Extra Service' : 'Add Extra Service'}
                showDelete={false}
            />

            <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
                <Text className="font-sf text-xs text-gray-500 mb-1.5">Name *</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Spa, Airport Transfer"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 font-sf text-slate-800 mb-4"
                    style={commonInputStyles.baseInput}
                />

                <Text className="font-sf text-xs text-gray-500 mb-1.5">Description</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe the service..."
                    multiline
                    numberOfLines={4}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 font-sf text-slate-800 mb-4"
                    style={[commonInputStyles.baseInput, commonInputStyles.multilineInput]}
                />

                <Text className="font-sf text-xs text-gray-500 mb-1.5">Price (VND)</Text>
                <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="number-pad"
                    placeholder="0 = included in stay"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 font-sf text-slate-800"
                    style={commonInputStyles.baseInput}
                />
                <Text className="font-sf text-xs text-gray-400 mt-2">
                    Enter 0 if this amenity is included at no extra charge.
                </Text>
            </View>
        </FormScreenLayout>
    );
}
