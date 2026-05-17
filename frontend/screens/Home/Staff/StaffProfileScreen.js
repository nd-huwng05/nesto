import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {LogOut, MapPin} from 'lucide-react-native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {StaffUserAvatarLarge} from '../../../components/staff/StaffUserAvatar';
import {getStaffBranchInfo} from '../../../constants/staffBranchInfo';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {clearSession} from '../../../utils/authStorage';
import {UI} from '../../../styles/uiTokens';

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
    const roleStyle = roleConfig[role] || {
        label: user?.jobRole || 'Staff',
        bg: '#f1f5f9',
        color: '#475569',
    };

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
                    <StaffUserAvatarLarge user={user} size={96} />
                    <Text style={styles.userName}>{user?.name || 'Team Member'}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
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
                    {user?.phone ? (
                        <Text style={styles.branchMeta}>Contact: {user.phone}</Text>
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
