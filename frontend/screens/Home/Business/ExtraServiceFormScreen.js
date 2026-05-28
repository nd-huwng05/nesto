import {useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {Utensils, Flower2, Car, Bell as ConciergeBell} from 'lucide-react-native';
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
    const [category, setCategory] = useState('RESTAURANT');
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        if (!isEdit) {
            setLoading(false);
            return;
        }
        (async () => {
            try {
                const res = await fetchExtraServices(branchId);
                const list = res?.status === 'success' ? res?.data : [];
                const safeList = Array.isArray(list) ? list : [];
                const found = safeList.find((s) => s?.id === serviceId);
                if (found) {
                    setName(found?.name || '');
                    setDescription(found?.description || '');
                    setPrice(found?.price === undefined || found?.price === null ? '' : String(found.price));
                    setCategory(found?.category || 'RESTAURANT');
                } else {
                    Alert.alert('Not found', 'This extra service is no longer available.');
                }
            } catch (err) {
                Alert.alert(
                    'Error',
                    err?.response?.data?.detail || err?.message || 'Could not load extra service.'
                );
            } finally {
                setLoading(false);
            }
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
            {
                name: name.trim(),
                description: description.trim(),
                price: priceNum,
                category: category || 'RESTAURANT',
            },
            serviceId
        );

        if (res?.status === 'success') {
            Alert.alert('Saved', 'Extra service saved successfully.', [
                {text: 'OK', onPress: () => navigation.goBack()},
            ]);
            return;
        }
        Alert.alert('Error', res?.message || 'Could not save extra service.');
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

                <Text style={{marginBottom: 8, fontSize: 14, color: '#64748B'}}>Category</Text>
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%', marginBottom: 12}}>
                    {[
                        {key: 'RESTAURANT', labelText: 'Restaurant', Icon: Utensils},
                        {key: 'SPA', labelText: 'Spa', Icon: Flower2},
                        {key: 'TRANSPORT', labelText: 'Transport', Icon: Car},
                        {key: 'ROOM_SERVICE', labelText: 'Room Service', Icon: ConciergeBell},
                    ].map((opt) => {
                        const selected = category === opt.key;
                        return (
                            <TouchableOpacity
                                key={opt.key}
                                onPress={() => setCategory(opt.key)}
                                activeOpacity={0.85}
                                style={{
                                    paddingVertical: 10,
                                    paddingHorizontal: 16,
                                    borderRadius: 100,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: selected ? '#8294FF' : '#FFFFFF',
                                    borderWidth: selected ? 0 : 1,
                                    borderColor: selected ? 'transparent' : '#E2E8F0',
                                }}
                            >
                                <opt.Icon size={16} color={selected ? '#FFFFFF' : '#64748B'} />
                                <Text style={{marginLeft: 10, color: selected ? '#FFFFFF' : '#64748B', fontWeight: selected ? '700' : '600'}}>
                                    {opt.labelText}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

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
