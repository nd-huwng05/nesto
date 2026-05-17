import {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {ChevronLeft} from 'lucide-react-native';
import {ScreenWrapper} from '../../../components/common/ScreenWrapper';
import {useBranchCRUD} from '../../../hooks/business/useBranchCRUD';
import {fetchAmenityOptions, fetchGuestSegments, fetchLodgingTypes} from '../../../services/BranchService';
import {commonInputStyles} from '../../../styles/TextInputStyles';

function FormField({label, value, onChangeText, ...props}) {
    return (
        <View className="mb-4">
            <Text className="font-sf text-xs text-gray-500 mb-1.5">{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-sf text-slate-800"
                style={commonInputStyles.baseInput}
                placeholderTextColor="#9ca3af"
                {...props}
            />
        </View>
    );
}

export default function EditBranchScreen({navigation, route}) {
    const {branchId} = route.params || {};
    const {loadDetail, update, isLoading, isSaving} = useBranchCRUD();
    const [form, setForm] = useState(null);
    const [lodgingTypes, setLodgingTypes] = useState([]);
    const [amenityOptions, setAmenityOptions] = useState([]);
    const [guestSegments, setGuestSegments] = useState([]);

    useEffect(() => {
        Promise.all([fetchLodgingTypes(), fetchAmenityOptions(), fetchGuestSegments()]).then(
            ([lt, am, gs]) => {
                if (lt.status === 'success') setLodgingTypes(lt.data);
                if (am.status === 'success') setAmenityOptions(am.data);
                if (gs.status === 'success') setGuestSegments(gs.data);
            }
        );
    }, []);

    useEffect(() => {
        (async () => {
            const data = await loadDetail(branchId);
            if (data) {
                setForm({
                    name: data.name || '',
                    lodgingType: data.lodgingType || '',
                    address: data.address || '',
                    phone: data.contact?.phone || '',
                    email: data.contact?.email || '',
                    amenities: data.amenities || [],
                    guestSegments: data.guestSegments || [],
                });
            }
        })();
    }, [branchId, loadDetail]);

    const toggleItem = (key, item) => {
        setForm((prev) => {
            const list = prev[key];
            const next = list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
            return {...prev, [key]: next};
        });
    };

    const handleSave = useCallback(async () => {
        if (!form?.name?.trim()) {
            Alert.alert('Validation', 'Branch name is required.');
            return;
        }
        const res = await update(branchId, {
            name: form.name.trim(),
            lodgingType: form.lodgingType,
            address: form.address.trim(),
            contact: {phone: form.phone.trim(), email: form.email.trim()},
            amenities: form.amenities,
            guestSegments: form.guestSegments,
        });
        if (res?.status === 'success') {
            Alert.alert('Saved', 'Branch updated successfully.', [
                {text: 'OK', onPress: () => navigation.goBack()},
            ]);
        }
    }, [branchId, form, navigation, update]);

    if (isLoading || !form) {
        return (
            <ScreenWrapper scrollable={false}>
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#8294FF" />
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper contentClassName="px-6">
            <View className="flex-row items-center justify-between mt-2 mb-4">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 border border-gray-200 rounded-full items-center justify-center"
                >
                    <ChevronLeft size={22} color="#1f2937" />
                </TouchableOpacity>
                <Text className="font-sf-bold text-lg text-slate-800">Edit Branch</Text>
                <View className="w-10" />
            </View>

            <FormField label="Branch Name *" value={form.name} onChangeText={(v) => setForm({...form, name: v})} />
            <Text className="font-sf text-xs text-gray-500 mb-2">Lodging Type</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
                {lodgingTypes.map((type) => (
                    <TouchableOpacity
                        key={type}
                        onPress={() => setForm({...form, lodgingType: type})}
                        className={`px-3 py-2 rounded-full border ${
                            form.lodgingType === type ? 'bg-primary/10 border-primary' : 'border-gray-200'
                        }`}
                    >
                        <Text className={`font-sf text-sm ${form.lodgingType === type ? 'text-primary' : 'text-gray-600'}`}>
                            {type}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <FormField label="Address" value={form.address} onChangeText={(v) => setForm({...form, address: v})} multiline />
            <FormField label="Phone" value={form.phone} onChangeText={(v) => setForm({...form, phone: v})} keyboardType="phone-pad" />
            <FormField label="Email" value={form.email} onChangeText={(v) => setForm({...form, email: v})} keyboardType="email-address" autoCapitalize="none" />

            <Text className="font-sf text-xs text-gray-500 mb-2">Amenities</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
                {amenityOptions.map((item) => (
                    <TouchableOpacity
                        key={item}
                        onPress={() => toggleItem('amenities', item)}
                        className={`px-3 py-2 rounded-full border ${
                            form.amenities.includes(item) ? 'bg-primary/10 border-primary' : 'border-gray-200'
                        }`}
                    >
                        <Text className={`font-sf text-xs ${form.amenities.includes(item) ? 'text-primary' : 'text-gray-600'}`}>
                            {item}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text className="font-sf text-xs text-gray-500 mb-2">Guest Segments</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
                {guestSegments.map((item) => (
                    <TouchableOpacity
                        key={item}
                        onPress={() => toggleItem('guestSegments', item)}
                        className={`px-3 py-2 rounded-full border ${
                            form.guestSegments.includes(item) ? 'bg-primary/10 border-primary' : 'border-gray-200'
                        }`}
                    >
                        <Text className={`font-sf text-xs ${form.guestSegments.includes(item) ? 'text-primary' : 'text-gray-600'}`}>
                            {item}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className={`py-4 rounded-full items-center ${isSaving ? 'bg-gray-300' : 'bg-primary'}`}
            >
                {isSaving ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text className="text-white font-sf-bold text-base">Save Changes</Text>
                )}
            </TouchableOpacity>
        </ScreenWrapper>
    );
}
