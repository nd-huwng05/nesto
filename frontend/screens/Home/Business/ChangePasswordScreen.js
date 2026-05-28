import {useRef, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {FormScreenLayout} from '../../../components/common/FormScreenLayout';
import {DetailScreenHeader} from '../../../components/business/DetailScreenHeader';
import {changePassword} from '../../../services/AuthService';
import {commonInputStyles} from '../../../styles/TextInputStyles';
import {UI, cardStyle} from '../../../styles/uiTokens';

function PasswordInput({label, value, onChangeText, inputRef, onSubmitEditing, returnKeyType}) {
    return (
        <View className="mb-4">
            <Text className="font-sf text-xs text-gray-500 mb-1.5">{label}</Text>
            <TextInput
                ref={inputRef}
                value={value}
                onChangeText={onChangeText}
                secureTextEntry
                autoCapitalize="none"
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                className="font-sf text-base text-slate-800 rounded-xl px-4 border border-gray-100"
                style={[commonInputStyles.baseInput, styles.input]}
                returnKeyType={returnKeyType}
                onSubmitEditing={onSubmitEditing}
            />
        </View>
    );
}

export default function ChangePasswordScreen({navigation}) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const newRef = useRef(null);
    const confirmRef = useRef(null);

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
        const result = await changePassword({
            currentPassword,
            newPassword,
            confirmPassword,
        });
        setSaving(false);
        if (result.status === 'success') {
            Alert.alert('Password Updated', 'Your password has been changed successfully.', [
                {text: 'OK', onPress: () => navigation.goBack()},
            ]);
            return;
        }
        Alert.alert('Error', result.message || 'Unable to update password.');
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
                {saving ? 'Updating...' : 'Update Password'}
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
                    returnKeyType="next"
                    onSubmitEditing={() => newRef.current?.focus()}
                />
                <PasswordInput
                    label="New Password *"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    inputRef={newRef}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmRef.current?.focus()}
                />
                <PasswordInput
                    label="Confirm New Password *"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    inputRef={confirmRef}
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                />
                <Text className="font-sf text-xs text-gray-400 leading-5">
                    Use at least 8 characters with letters and numbers.
                </Text>
                {saving ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#8294FF" />
                        <Text className="font-sf text-xs text-gray-500 ml-2">Updating password...</Text>
                    </View>
                ) : null}
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
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
});
