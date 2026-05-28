import {useEffect, useMemo, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {FormScreenLayout} from '../../../components/common/FormScreenLayout';
import {DetailScreenHeader} from '../../../components/business/DetailScreenHeader';
import {useManagerProfile} from '../../../configuration/ManagerProfileContext';
import api, {endpoints} from '../../../configuration/Apis';
import {commonInputStyles} from '../../../styles/TextInputStyles';
import {UI, cardStyle} from '../../../styles/uiTokens';

export default function EditProfileScreen({navigation}) {
    const {profile, updateProfile, reloadProfile, isLoading} = useManagerProfile();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatar, setAvatar] = useState('');
    const [saving, setSaving] = useState(false);
    const email = useMemo(() => String(profile?.email || '').trim(), [profile?.email]);

    useEffect(() => {
        setName(String(profile?.name || ''));
        setPhone(String(profile?.phone || ''));
        setAvatar(String(profile?.avatar || ''));
    }, [profile?.name, profile?.phone, profile?.avatar]);

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation', 'Name is required.');
            return;
        }
        if (avatar.trim() && !/^https?:\/\//i.test(avatar.trim())) {
            Alert.alert('Validation', 'Avatar must be a valid http(s) URL.');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: name.trim(),
                phone: phone.trim(),
                avatar: avatar.trim() || null,
            };
            const response = await api.patch(endpoints['current-user'], payload);
            const updated = response.data || {};
            updateProfile({
                name: String(updated.name || ''),
                email: String(updated.email || email),
                phone: String(updated.phone || ''),
                avatar: String(updated.avatar || ''),
                role: String(updated.role_display || updated.role || profile?.role || ''),
            });
            await reloadProfile();
            Alert.alert('Saved', 'Your profile has been updated.', [
                {text: 'OK', onPress: () => navigation.goBack()},
            ]);
        } catch (error) {
            console.error('API Error: ', error.response?.data || error.message);
            Alert.alert('Error', 'Could not update profile.');
        } finally {
            setSaving(false);
        }
    };

    const saveButton = (
        <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
            className={`py-4 rounded-full items-center min-h-[52px] justify-center ${
                saving ? 'bg-gray-300' : 'bg-primary'
            }`}
        >
            <Text className="text-white font-sf-bold text-base">{saving ? 'Saving...' : 'Save Profile'}</Text>
        </TouchableOpacity>
    );

    return (
        <FormScreenLayout
            footer={saveButton}
            screenStyle={{backgroundColor: UI.screenBg}}
            footerBarStyle={{backgroundColor: UI.screenBg, borderTopColor: '#e5e7eb'}}
        >
            <DetailScreenHeader onBack={() => navigation.goBack()} title="Edit Profile" showDelete={false} />

            {isLoading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#8294FF" />
                </View>
            ) : null}

            <View style={[styles.fieldCard, styles.fieldGap]}>
                <Text className="font-sf text-xs text-gray-500 mb-1.5">Full Name *</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor="#94a3b8"
                    className="font-sf text-base text-slate-800"
                    style={commonInputStyles.baseInput}
                />
            </View>

            <View style={[styles.fieldCard, styles.fieldGap]}>
                <Text className="font-sf text-xs text-gray-500 mb-1.5">Email *</Text>
                <TextInput
                    value={email}
                    editable={false}
                    placeholderTextColor="#94a3b8"
                    className="font-sf text-base text-slate-800"
                    style={commonInputStyles.baseInput}
                />
            </View>

            <View style={styles.fieldCard}>
                <Text className="font-sf text-xs text-gray-500 mb-1.5">Phone</Text>
                <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="Phone number"
                    placeholderTextColor="#94a3b8"
                    className="font-sf text-base text-slate-800"
                    style={commonInputStyles.baseInput}
                />
            </View>

            <View style={[styles.fieldCard, styles.fieldGap]}>
                <Text className="font-sf text-xs text-gray-500 mb-1.5">Avatar URL</Text>
                <TextInput
                    value={avatar}
                    onChangeText={setAvatar}
                    autoCapitalize="none"
                    keyboardType="url"
                    placeholder="https://cdn.example.com/avatar.jpg"
                    placeholderTextColor="#94a3b8"
                    className="font-sf text-base text-slate-800"
                    style={commonInputStyles.baseInput}
                />
            </View>
        </FormScreenLayout>
    );
}

const styles = StyleSheet.create({
    fieldCard: {
        ...cardStyle,
    },
    fieldGap: {
        marginBottom: 16,
    },
    loadingWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
});
