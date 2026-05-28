import {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {ChevronLeft} from 'lucide-react-native';
import {ScreenWrapper} from '../../../components/common/ScreenWrapper';
import {useBranchCRUD} from '../../../hooks/business/useBranchCRUD';
import {fetchAmenityOptions, fetchGuestSegments, fetchLodgingTypes} from '../../../services/BranchService';
import {commonInputStyles} from '../../../styles/TextInputStyles';
import api, {endpoints} from '../../../configuration/Apis';

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
    const [themes, setThemes] = useState([]);
    const [branchThemes, setBranchThemes] = useState([]);
    const [newThemeName, setNewThemeName] = useState('');

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [lt, am, gs] = await Promise.all([
                    fetchLodgingTypes(),
                    fetchAmenityOptions(),
                    fetchGuestSegments(),
                ]);
                if (!alive) return;
                if (lt?.status === 'success') setLodgingTypes(Array.isArray(lt.data) ? lt.data : []);
                if (am?.status === 'success') setAmenityOptions(Array.isArray(am.data) ? am.data : []);
                if (gs?.status === 'success') setGuestSegments(Array.isArray(gs.data) ? gs.data : []);
                const [themesRes, branchThemesRes] = await Promise.all([
                    api.get(endpoints['themes']),
                    api.get(endpoints['branch-themes'], {params: {branch_id: branchId}}),
                ]);
                const themeRows = themesRes?.data?.results || themesRes?.data || [];
                const btRows = branchThemesRes?.data?.results || [];
                if (alive) {
                    setThemes(Array.isArray(themeRows) ? themeRows : []);
                    setBranchThemes(Array.isArray(btRows) ? btRows : []);
                }
            } catch (err) {
                if (!alive) return;
                Alert.alert(
                    'Error',
                    err?.response?.data?.detail || err?.message || 'Could not load branch options.'
                );
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const data = await loadDetail(branchId);
                if (data) {
                    setForm({
                        name: data?.name || '',
                        lodgingType: data?.lodgingType || '',
                        address: data?.address || '',
                        phone: data?.contact?.phone || '',
                        email: data?.contact?.email || '',
                        amenities: Array.isArray(data?.amenities) ? data.amenities : [],
                        guestSegments: Array.isArray(data?.guestSegments) ? data.guestSegments : [],
                    });
                } else {
                    Alert.alert('Error', 'Could not load branch details.');
                }
            } catch (err) {
                Alert.alert(
                    'Error',
                    err?.response?.data?.detail || err?.message || 'Could not load branch details.'
                );
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
            return;
        }
        Alert.alert('Error', res?.message || 'Could not update branch.');
    }, [branchId, form, navigation, update]);

    const isThemeEnabled = useCallback((theme) => {
        const id = String(theme?.id || '');
        return branchThemes.some((t) => String(t?.theme?.id || t?.themeId || '') === id);
    }, [branchThemes]);

    const reloadBranchThemes = useCallback(async () => {
        const res = await api.get(endpoints['branch-themes'], {params: {branch_id: branchId}});
        const btRows = res?.data?.results || [];
        setBranchThemes(Array.isArray(btRows) ? btRows : []);
    }, [branchId]);

    const toggleTheme = useCallback(async (theme) => {
        try {
            await api.post(endpoints['branch-theme-toggle'], {branchId, themeId: theme?.id});
            await reloadBranchThemes();
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.detail || err?.message || 'Could not update themes.');
        }
    }, [branchId, reloadBranchThemes]);

    const createTheme = useCallback(async () => {
        const name = String(newThemeName || '').trim();
        if (!name) return;
        try {
            await api.post(endpoints['themes'], {name});
            setNewThemeName('');
            const themesRes = await api.get(endpoints['themes']);
            const themeRows = themesRes?.data?.results || themesRes?.data || [];
            setThemes(Array.isArray(themeRows) ? themeRows : []);
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.detail || err?.message || 'Could not create theme.');
        }
    }, [newThemeName]);

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

            <Text className="font-sf text-xs text-gray-500 mb-2">Themes</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
                {themes.map((t) => {
                    const active = isThemeEnabled(t);
                    return (
                        <TouchableOpacity
                            key={String(t?.id || t?.name)}
                            onPress={() => toggleTheme(t)}
                            className={`px-3 py-2 rounded-full border ${active ? 'bg-primary/10 border-primary' : 'border-gray-200'}`}
                        >
                            <Text className={`font-sf text-xs ${active ? 'text-primary' : 'text-gray-600'}`}>{t?.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <View className="flex-row items-center gap-2 mb-6">
                <TextInput
                    value={newThemeName}
                    onChangeText={setNewThemeName}
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-sf text-slate-800"
                    style={commonInputStyles.baseInput}
                    placeholder="Create a new theme"
                    placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity onPress={createTheme} className="px-4 py-3 rounded-xl bg-primary">
                    <Text className="text-white font-sf-bold">Add</Text>
                </TouchableOpacity>
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
