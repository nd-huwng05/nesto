import {useState} from 'react';
import {Alert, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {FormScreenLayout} from '../../../components/common/FormScreenLayout';
import {DetailScreenHeader} from '../../../components/business/DetailScreenHeader';
import {commonInputStyles} from '../../../styles/TextInputStyles';
import {UI, cardStyle} from '../../../styles/uiTokens';

function PasswordInput({label, value, onChangeText}) {
    return (
        <View className="mb-4">
            <Text className="font-sf text-xs text-gray-500 mb-1.5">{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                secureTextEntry
                autoCapitalize="none"
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                className="font-sf text-base text-slate-800 rounded-xl px-4 border border-gray-100"
                style={[commonInputStyles.baseInput, styles.input]}
            />
        </View>
    );
}

export default function ChangePasswordScreen({navigation}) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!currentPassword.trim()) {
            Alert.alert('Validation', 'Enter your current password.');
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert('Validation', 'New password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Validation', 'New password and confirmation do not match.');
            return;
        }
        setSaving(true);
        await new Promise((r) => setTimeout(r, 500));
        setSaving(false);
        Alert.alert('Password Updated', 'Your password has been changed successfully.', [
            {text: 'OK', onPress: () => navigation.goBack()},
        ]);
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
            <Text className="text-white font-sf-bold text-base">
                {saving ? 'Updating…' : 'Update Password'}
            </Text>
        </TouchableOpacity>
    );

    return (
        <FormScreenLayout
            footer={saveButton}
            screenStyle={{backgroundColor: UI.screenBg}}
            footerBarStyle={{backgroundColor: UI.screenBg, borderTopColor: '#e5e7eb'}}
        >
            <DetailScreenHeader
                onBack={() => navigation.goBack()}
                title="Change Password"
                showDelete={false}
            />

            <View style={styles.formCard}>
                <PasswordInput
                    label="Current Password *"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                />
                <PasswordInput
                    label="New Password *"
                    value={newPassword}
                    onChangeText={setNewPassword}
                />
                <PasswordInput
                    label="Confirm New Password *"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />
                <Text className="font-sf text-xs text-gray-400 leading-5">
                    Use at least 8 characters with letters and numbers.
                </Text>
            </View>
        </FormScreenLayout>
    );
}

const styles = StyleSheet.create({
    formCard: {
        ...cardStyle,
    },
    input: {
        backgroundColor: '#f9fafb',
    },
});
