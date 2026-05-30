import {useCallback, useEffect, useMemo, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {Eye, EyeOff} from 'lucide-react-native';
import {DEFAULT_STAFF_PASSWORD} from '../../../services/StaffService';
import {STAFF_ROLE_PERMISSIONS} from '../../../constants/staffRolePermissions';
import {FormDropdown} from '../../../components/common/FormDropdown';
import {DetailScreenHeader} from '../../../components/business/DetailScreenHeader';
import {useStaffCRUD} from '../../../hooks/business/useStaffCRUD';
import {STAFF_FORM_ROLES, STAFF_ROLE_LABELS, buildStaffProfilePayload} from '../../../constants/staffRoleMapping';
import {fetchBranchList} from '../../../services/BranchService';
import {commonInputStyles} from '../../../styles/TextInputStyles';
import {UI, cardStyle} from '../../../styles/uiTokens';

function FormSection({title, subtitle, children}) {
    return (
        <View style={[cardStyle, styles.sectionCard]}>
            <Text className="font-sf-bold text-base text-slate-800">{title}</Text>
            {subtitle ? (
                <Text className="font-sf text-xs text-gray-500 mt-1 mb-3">{subtitle}</Text>
            ) : (
                <View style={{height: 12}} />
            )}
            {children}
        </View>
    );
}

function RoleSegment({value, onChange}) {
    const permissionText = STAFF_ROLE_PERMISSIONS[value] || '';

    return (
        <View>
            <View className="flex-row flex-wrap gap-2">
                {STAFF_FORM_ROLES.map((role) => {
                    const active = value === role;
                    return (
                        <TouchableOpacity
                            key={role}
                            onPress={() => onChange(role)}
                            activeOpacity={0.8}
                            className={`px-4 py-2.5 rounded-full border ${
                                active ? 'bg-primary border-primary' : 'bg-gray-50 border-gray-200'
                            }`}
                        >
                            <Text
                                className={`font-sf text-sm ${
                                    active ? 'text-white font-semibold' : 'text-slate-600'
                                }`}
                            >
                                {STAFF_ROLE_LABELS[role] || role}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            {permissionText ? (
                <View style={styles.permissionBox}>
                    <Text className="font-sf text-xs text-gray-500 leading-5">{permissionText}</Text>
                </View>
            ) : null}
        </View>
    );
}

export default function StaffFormScreen({navigation, route}) {
    const {
        staffId,
        branchId: presetBranchId,
        businessId: presetBusinessId,
        lockAssignment = false,
    } = route.params || {};
    const isEdit = Boolean(staffId);
    const assignmentLocked = lockAssignment && !isEdit;
    const {loadStaff, loadBusinesses, businesses, create, update, remove, isSaving} = useStaffCRUD();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('RECEPTIONIST');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [businessId, setBusinessId] = useState(presetBusinessId || '');
    const [branchId, setBranchId] = useState(presetBranchId || '');
    const [loading, setLoading] = useState(isEdit);
    const [branches, setBranches] = useState([]);
    const [isBranchesLoading, setIsBranchesLoading] = useState(false);
    const [branchesError, setBranchesError] = useState('');

    const loadBranchOptions = useCallback(
        async (nextBusinessId) => {
            if (!nextBusinessId) {
                setBranches([]);
                setBranchesError('');
                return;
            }
            setIsBranchesLoading(true);
            try {
                const res = await fetchBranchList(nextBusinessId);
                if (res?.status !== 'success') {
                    setBranches([]);
                    setBranchesError(res?.message || 'Unable to load branches.');
                    return;
                }
                const branchData = res.data?.results || res.data;
                setBranches(Array.isArray(branchData) ? branchData : []);
                setBranchesError('');
            } catch (err) {
                setBranches([]);
                setBranchesError('Unable to load branches.');
            } finally {
                setIsBranchesLoading(false);
            }
        },
        []
    );

    useFocusEffect(
        useCallback(() => {
            loadBusinesses();
            if (businessId) {
                loadBranchOptions(businessId);
            }
            return () => {};
        }, [businessId, loadBusinesses, loadBranchOptions])
    );

    useEffect(() => {
        if (assignmentLocked && presetBusinessId && presetBranchId) {
            setBusinessId(presetBusinessId);
            setBranchId(presetBranchId);
        }
    }, [assignmentLocked, presetBranchId, presetBusinessId]);

    useEffect(() => {
        loadBranchOptions(businessId);
    }, [businessId, loadBranchOptions]);

    useEffect(() => {
        if (assignmentLocked) return;
        if (isEdit) return;
        if (branchId) return;
        if (Array.isArray(branches) && branches.length > 0) {
            setBranchId(branches[0]?.id || '');
        }
    }, [assignmentLocked, isEdit, branchId, branches]);

    useEffect(() => {
        if (!isEdit) {
            setLoading(false);
        }
    }, [isEdit]);

    useEffect(() => {
        if (!isEdit) return;
        (async () => {
            const row = await loadStaff(staffId);
            if (row) {
                setName(row.name);
                setEmail(row.email);
                setPhone(row.phone || '');
                setRole(row.formRole || row.role || 'RECEPTIONIST');
                setBusinessId(row.businessId || '');
                setBranchId(row.branchId);
            }
            setLoading(false);
        })();
    }, [isEdit, loadStaff, staffId]);

    const businessOptions = useMemo(
        () => businesses.map((b) => ({value: b.id, label: b.name})),
        [businesses]
    );

    const branchOptions = useMemo(
        () =>
            (Array.isArray(branches) ? branches : [])
                .filter((br) => br?.id)
                .map((br) => ({value: br.id, label: br?.name ?? '—'})),
        [branches]
    );

    const handleBusinessChange = (nextBusinessId) => {
        setBusinessId(nextBusinessId);
        setBranchId('');
    };

    const handleSave = async () => {
        if (!businessId) {
            Alert.alert('Validation', 'Please select a business.');
            return;
        }
        if (!branchId) {
            Alert.alert('Validation', 'Please select a branch.');
            return;
        }
        if (!name.trim()) {
            Alert.alert('Validation', 'Name is required.');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Validation', 'Email is required.');
            return;
        }
        if (password.trim() && password.trim().length < 8) {
            Alert.alert('Validation', 'Password must be at least 8 characters.');
            return;
        }

        const payload = buildStaffProfilePayload({
            name,
            email,
            phone,
            formRole: role,
            branchId,
            password: password.trim() || DEFAULT_STAFF_PASSWORD,
        });
        try {
            const res = isEdit
                ? await update(staffId, payload)
                : await create(payload);
            if (res?.status === 'success') {
                Alert.alert('Saved', isEdit ? 'Staff updated.' : 'Staff member added.', [
                    {text: 'OK', onPress: () => navigation.goBack()},
                ]);
                return;
            }
            Alert.alert('Error', res?.message || (typeof res?.data === 'object' ? JSON.stringify(res.data) : 'Unable to save staff.'));
        } catch (error) {
            const data = error?.response?.data;
            const msg =
                data?.detail ||
                (data && typeof data === 'object' ? Object.values(data).flat().join('\n') : '') ||
                error?.message ||
                'Unable to save staff.';
            Alert.alert('Error', msg);
        }
    };

    const handleDelete = () => {
        Alert.alert('Delete Staff', 'Remove this staff member from your portfolio?', [
            {text: 'Cancel', style: 'cancel'},
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const res = await remove(staffId);
                    if (res?.status === 'success') {
                        navigation.goBack();
                    }
                },
            },
        ]);
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
                <Text className="text-white font-sf-bold text-base">
                    {isEdit ? 'Save Changes' : 'Add Staff Member'}
                </Text>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#8294FF" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                style={styles.keyboardRoot}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    showsVerticalScrollIndicator={false}
                >
                    <DetailScreenHeader
                        onBack={() => navigation.goBack()}
                        title={isEdit ? 'Edit Staff' : 'Add Staff'}
                        showDelete={isEdit}
                        onDelete={isEdit ? handleDelete : undefined}
                    />

                    <FormSection
                        title="Assignment"
                        subtitle={
                            assignmentLocked
                                ? 'This staff member is assigned to the branch you selected.'
                                : 'Select the business and branch where this team member works.'
                        }
                    >
                        {assignmentLocked ? (
                            <View className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                                <Text className="font-sf text-xs text-gray-500">Business</Text>
                                <Text className="font-sf-semi text-slate-800 mt-0.5">
                                    {businesses.find((b) => b.id === businessId)?.name || '—'}
                                </Text>
                                <Text className="font-sf text-xs text-gray-500 mt-3">Branch</Text>
                                <Text className="font-sf-semi text-slate-800 mt-0.5">
                                    {branches.find((br) => br.id === branchId)?.name || '—'}
                                </Text>
                            </View>
                        ) : (
                            <>
                                <FormDropdown
                                    label="Select Business *"
                                    value={businessId}
                                    options={businessOptions}
                                    onSelect={handleBusinessChange}
                                    placeholder="Choose a business"
                                />
                                {isBranchesLoading ? (
                                    <View className="mt-1">
                                        <ActivityIndicator size="small" color="#8294FF" />
                                    </View>
                                ) : (
                                    <FormDropdown
                                        label="Select Branch *"
                                        value={branchId}
                                        options={branchOptions}
                                        onSelect={setBranchId}
                                        placeholder={businessId ? 'Choose a branch' : 'Select a business first'}
                                        disabled={!businessId || branchOptions.length === 0}
                                    />
                                )}
                                {branchesError ? (
                                    <Text className="font-sf text-xs text-red-500 -mt-2">{branchesError}</Text>
                                ) : null}
                                {businessId && !isBranchesLoading && branchOptions.length === 0 ? (
                                    <Text className="font-sf text-sm text-amber-600 -mt-2">
                                        No branches found for this business. Create a branch first.
                                    </Text>
                                ) : null}
                            </>
                        )}
                    </FormSection>

                    <FormSection title="Personal Info" subtitle="Contact details for this staff member.">
                        <Text className="font-sf text-xs text-gray-500 mb-1.5">Full Name *</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Nguyễn Văn A"
                            className="bg-gray-50 border border-gray-100 rounded-xl px-4 font-sf text-slate-800 mb-4"
                            style={commonInputStyles.baseInput}
                        />

                        <Text className="font-sf text-xs text-gray-500 mb-1.5">Email *</Text>
                        <TextInput
                            value={email}
                            onChangeText={setEmail}
                            placeholder="staff@hotel.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            className="bg-gray-50 border border-gray-100 rounded-xl px-4 font-sf text-slate-800 mb-4"
                            style={commonInputStyles.baseInput}
                        />

                        <Text className="font-sf text-xs text-gray-500 mb-1.5">Phone</Text>
                        <TextInput
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="09xx xxx xxx"
                            keyboardType="phone-pad"
                            className="bg-gray-50 border border-gray-100 rounded-xl px-4 font-sf text-slate-800"
                            style={commonInputStyles.baseInput}
                        />
                    </FormSection>

                    <FormSection
                        title="Account Info"
                        subtitle="Role and login credentials for the staff app."
                    >
                        <Text className="font-sf text-xs text-gray-500 mb-2">Role *</Text>
                        <RoleSegment value={role} onChange={setRole} />

                        <Text className="font-sf-bold text-sm text-slate-800 mt-5 mb-1">Login Credentials</Text>
                        <Text className="font-sf text-xs text-gray-500 mb-1.5">Password</Text>
                        <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-xl px-4 mb-1">
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder={isEdit ? 'Leave blank to keep current' : 'Optional custom password'}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                className="flex-1 font-sf text-slate-800 py-3"
                                style={commonInputStyles.baseInput}
                            />
                            <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={12}>
                                {showPassword ? (
                                    <EyeOff size={20} color="#9ca3af" />
                                ) : (
                                    <Eye size={20} color="#9ca3af" />
                                )}
                            </TouchableOpacity>
                        </View>
                        <Text className="font-sf text-xs text-gray-400">
                            Leave blank to use default: {DEFAULT_STAFF_PASSWORD}
                        </Text>
                    </FormSection>
                </ScrollView>

                <View style={styles.footer}>{saveButton}</View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: UI.screenBg,
    },
    loadingWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: UI.screenBg,
    },
    keyboardRoot: {
        flex: 1,
        backgroundColor: UI.screenBg,
    },
    scroll: {
        flex: 1,
        paddingHorizontal: 20,
        backgroundColor: UI.screenBg,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 120,
        paddingTop: 8,
        backgroundColor: UI.screenBg,
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'android' ? 20 : 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#e5e7eb',
        backgroundColor: UI.screenBg,
    },
    sectionCard: {
        marginBottom: UI.sectionGap,
    },
    permissionBox: {
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
});
