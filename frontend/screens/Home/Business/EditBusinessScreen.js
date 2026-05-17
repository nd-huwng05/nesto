import {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {ChevronLeft} from 'lucide-react-native';
import {ScreenWrapper} from '../../../components/common/ScreenWrapper';
import {useBusinessCRUD} from '../../../hooks/business/useBusinessCRUD';
import {commonInputStyles} from '../../../styles/TextInputStyles';
import {REGEX_EMAIL} from '../../../hooks/validations/useFormValidation';

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

export default function EditBusinessScreen({navigation, route}) {
    const {businessId} = route.params || {};
    const {loadDetail, update, isLoading, isSaving} = useBusinessCRUD();
    const [form, setForm] = useState(null);

    useEffect(() => {
        (async () => {
            const data = await loadDetail(businessId);
            if (data) {
                setForm({
                    name: data.name || '',
                    legalName: data.legalName || '',
                    taxCode: data.taxCode || '',
                    businessType: data.businessType || '',
                    legalRepresentative: data.legalRepresentative || '',
                    email: data.contact?.email || '',
                    phone: data.contact?.phone || '',
                    headquartersAddress: data.contact?.headquartersAddress || '',
                });
            }
        })();
    }, [businessId, loadDetail]);

    const setField = (key, value) => setForm((prev) => ({...prev, [key]: value}));

    const handleSave = useCallback(async () => {
        if (!form?.name?.trim()) {
            Alert.alert('Validation', 'Business name is required.');
            return;
        }
        if (!form?.email?.trim() || !REGEX_EMAIL.test(form.email.trim())) {
            Alert.alert('Validation', 'A valid corporate email is required.');
            return;
        }
        const res = await update(businessId, {
            name: form.name.trim(),
            legalName: form.legalName.trim(),
            taxCode: form.taxCode.trim(),
            businessType: form.businessType.trim(),
            legalRepresentative: form.legalRepresentative.trim(),
            contact: {
                email: form.email.trim(),
                phone: form.phone.trim(),
                headquartersAddress: form.headquartersAddress.trim(),
            },
        });
        if (res?.status === 'success') {
            Alert.alert('Saved', 'Business updated successfully.', [
                {text: 'OK', onPress: () => navigation.goBack()},
            ]);
        }
    }, [businessId, form, navigation, update]);

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
                <Text className="font-sf-bold text-lg text-slate-800">Edit Business</Text>
                <View className="w-10" />
            </View>

            <FormField label="Display Name *" value={form.name} onChangeText={(v) => setField('name', v)} />
            <FormField label="Legal / Company Name" value={form.legalName} onChangeText={(v) => setField('legalName', v)} />
            <FormField label="Tax Registration Code" value={form.taxCode} onChangeText={(v) => setField('taxCode', v)} />
            <FormField label="Business Type" value={form.businessType} onChangeText={(v) => setField('businessType', v)} />
            <FormField label="Legal Representative" value={form.legalRepresentative} onChangeText={(v) => setField('legalRepresentative', v)} />
            <FormField label="Corporate Email *" value={form.email} onChangeText={(v) => setField('email', v)} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" />
            <FormField label="Corporate Phone" value={form.phone} onChangeText={(v) => setField('phone', v)} keyboardType="phone-pad" />
            <FormField label="Headquarters Address" value={form.headquartersAddress} onChangeText={(v) => setField('headquartersAddress', v)} multiline />

            <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                className={`mt-4 py-4 rounded-full items-center ${isSaving ? 'bg-gray-300' : 'bg-primary'}`}
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
