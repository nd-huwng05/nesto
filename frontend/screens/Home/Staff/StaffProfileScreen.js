import {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {LogOut, MapPin} from 'lucide-react-native';
import {useFocusEffect} from '@react-navigation/native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {getStaffBranchInfo} from '../../../constants/staffBranchInfo';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {clearSession} from '../../../utils/authStorage';
import {UI} from '../../../styles/uiTokens';
import api, {endpoints} from '../../../configuration/Apis';

const roleConfig = {
    RECEPTIONIST: {label: 'Receptionist', bg: '#dcfce7', color: '#166534'},
    HOUSEKEEPING: {label: 'Housekeeping', bg: '#fef3c7', color: '#92400e'},
    SERVICE: {label: 'Service / F&B', bg: '#dbeafe', color: '#1e40af'},
    MANAGER: {label: 'Branch Manager', bg: '#ede9fe', color: '#5b21b6'},
};

function resetToAccountFlow(navigation) {
    let root = navigation;
    while (root.getParent?.()) {
        root = root.getParent();
    }
    root.reset({index: 0, routes: [{name: 'AccountFlow'}]});
}

export default function StaffProfileScreen({navigation}) {
    const {user, role, branchId} = useStaffSession();
    const branch = getStaffBranchInfo(branchId);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasLoadError, setHasLoadError] = useState(false);
    const roleStyle = roleConfig[role] || {
        label: user?.jobRole || 'Staff',
        bg: '#f1f5f9',
        color: '#475569',
    };
    const initials = useMemo(() => {
        const fullName = String(profile?.name || user?.name || '').trim();
        if (!fullName) return 'U';
        return fullName
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() || '')
            .join('');
    }, [profile?.name, user?.name]);
    const normalizedAvatar = useMemo(() => {
        const raw = String(profile?.avatar || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        const base = String(process.env.EXPO_PUBLIC_API_URL || '').replace(/\/api\/v1\/?$/, '');
        return base ? `${base}${raw.startsWith('/') ? raw : `/${raw}`}` : raw;
    }, [profile?.avatar]);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            const loadProfile = async () => {
                setIsLoading(true);
                setHasLoadError(false);
                try {
                    const response = await api.get(endpoints['current-user']);
                    if (active) {
                        setProfile(response.data || {});
                    }
                } catch (error) {
                    console.error('API Error: ', error.response?.data || error.message);
                    if (active) {
                        setProfile(null);
                        setHasLoadError(true);
                        Alert.alert(
                            'Could not load profile',
                            error?.response?.data?.detail || error?.message || 'Please try again.'
                        );
                    }
                } finally {
                    if (active) {
                        setIsLoading(false);
                    }
                }
            };
            loadProfile();
            return () => {
                active = false;
            };
        }, [])
    );

    const handleLogout = () => {
        Alert.alert('Log out', 'Sign out of your staff account?', [
            {text: 'Cancel', style: 'cancel'},
            {
                text: 'Log out',
                style: 'destructive',
                onPress: async () => {
                    await clearSession();
                    resetToAccountFlow(navigation);
                },
            },
        ]);
    };

    return (
        <TabScreenLayout backgroundColor={UI.screenBg}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.profileHero}>
                    {isLoading ? (
                        <View style={styles.avatarLoadingWrap}>
                            <ActivityIndicator size="large" color="#8294FF" />
                        </View>
                    ) : normalizedAvatar ? (
                        <Image source={{uri: normalizedAvatar}} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarFallback]}>
                            <Text style={styles.avatarFallbackText}>{initials}</Text>
                        </View>
                    )}
                    <Text style={styles.userName}>{profile?.name || user?.name || 'Team Member'}</Text>
                    <Text style={styles.userEmail}>{profile?.email || user?.email || 'No email'}</Text>
                    <View style={[styles.roleBadge, {backgroundColor: roleStyle.bg}]}>
                        <Text style={[styles.roleBadgeText, {color: roleStyle.color}]}>
                            {roleStyle.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.branchCard}>
                    <View style={styles.branchCardHeader}>
                        <MapPin size={18} color="#8294FF" />
                        <Text style={styles.branchCardTitle}>Assigned branch</Text>
                    </View>
                    <Text style={styles.branchName}>{branch.name}</Text>
                    <Text style={styles.branchAddress}>{branch.address}</Text>
                    {(profile?.phone || user?.phone) ? (
                        <Text style={styles.branchMeta}>Contact: {profile?.phone || user?.phone}</Text>
                    ) : null}
                </View>

                <View style={styles.spacer} />

                <TouchableOpacity
                    onPress={handleLogout}
                    activeOpacity={0.88}
                    style={styles.logoutBtn}
                >
                    <LogOut size={20} color="#ef4444" />
                    <Text style={styles.logoutBtnText}>Log out</Text>
                </TouchableOpacity>
            </ScrollView>
        </TabScreenLayout>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 32,
    },
    profileHero: {
        alignItems: 'center',
        marginBottom: 28,
    },
    avatarLoadingWrap: {
        width: 96,
        height: 96,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#e2e8f0',
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#cbd5e1',
    },
    avatarFallbackText: {
        color: '#0f172a',
        fontSize: 28,
        fontWeight: '700',
    },
    userName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0f172a',
        marginTop: 16,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 14,
    },
    roleBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 24,
    },
    roleBadgeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    branchCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 6},
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 4,
    },
    branchCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    branchCardTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    branchName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#8294FF',
        marginBottom: 6,
    },
    branchAddress: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
    },
    branchMeta: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: 12,
    },
    spacer: {
        flex: 1,
        minHeight: 32,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#ef4444',
        borderRadius: 16,
        paddingVertical: 16,
        gap: 10,
    },
    logoutBtnText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '700',
    },
});
