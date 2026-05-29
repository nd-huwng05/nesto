import {useEffect, useMemo, useState} from 'react';
import {Alert, Image, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {getSession, clearSession} from '../../../utils/authStorage';
import {resetToAccountFlow} from '../../../utils/navigation';
import {useCustomerProfile} from '../../../hooks/customer/useCustomerProfile';

function SettingsRow({icon, label, value, danger = false, isLast = false, onPress, rightElement}) {
    return (
        <TouchableOpacity
            style={[styles.row, !isLast ? styles.rowSeparator : null]}
            activeOpacity={0.85}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={styles.rowIconWrap}>{icon}</View>
            <Text style={[styles.rowText, danger ? styles.rowTextDanger : null]} numberOfLines={1}>{label}</Text>
            {rightElement ? rightElement : null}
            {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
            {onPress ? <Ionicons name="chevron-forward" size={18} color="#C7C7CC" /> : null}
        </TouchableOpacity>
    );
}

export function CustomerProfileScreen({navigation}) {
    const {profile, isLoading, loadProfile, getStats} = useCustomerProfile();
    const [account, setAccount] = useState({name: '', username: '', email: '', role: '', phone: ''});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDarkTheme, setIsDarkTheme] = useState(true);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    onPress: () => {},
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    onPress: async () => {
                        try {
                            await clearSession();
                            resetToAccountFlow(navigation);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to logout. Please try again.');
                        }
                    },
                    style: 'destructive',
                },
            ],
            {cancelable: false}
        );
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const session = await getSession();
                const user = session?.user ?? {};
                if (!mounted) return;
                setAccount({
                    name: String(profile?.name || user?.name || user?.full_name || '').trim(),
                    username: String(user?.username || '').trim(),
                    email: String(profile?.email || user?.email || '').trim() || 'N/A',
                    role: String(profile?.role || user?.role || session?.role || 'CUSTOMER').toLowerCase(),
                    phone: String(profile?.phone || user?.phone || '').trim() || 'N/A',
                });
            } catch {
            }
        })();
        return () => {
            mounted = false;
        };
    }, [profile?.email, profile?.name, profile?.phone, profile?.role]);

    const displayName = useMemo(() => {
        const value = String(account.name || '').trim();
        if (!value) return 'Guest';
        return value
            .split(' ')
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }, [account.name]);

    const capitalizeFirst = (value) => {
        const text = String(value || '').trim();
        if (!text) return text;
        return text.charAt(0).toUpperCase() + text.slice(1);
    };

    const initials = useMemo(() => {
        const base = String(displayName || '').trim();
        return base ? base.charAt(0).toUpperCase() : 'U';
    }, [displayName]);

    const email = String(account.email || '').trim();
    const phone = String(account.phone || '').trim();
    const roleLabel = capitalizeFirst(account.role) || 'Customer';

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadProfile().finally(() => setIsRefreshing(false));
    };

    return (
        <SafeAreaView style={styles.page}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={['#5b79df']}
                        tintColor="#5b79df"
                    />
                }
            >
                <View style={styles.userCard}>
                    <View style={styles.avatarShell}>
                        {String(profile?.avatar || '').trim() ? (
                            <Image source={{uri: String(profile?.avatar || '').trim()}} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarFallbackText}>{initials}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.userMeta}>
                        <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
                        {email && email !== 'N/A' ? <Text style={styles.userSub} numberOfLines={1}>{email}</Text> : null}
                        {phone && phone !== 'N/A' ? <Text style={styles.userSub} numberOfLines={1}>{phone}</Text> : null}
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
                        </View>
                    </View>
                </View>

                <Text style={styles.sectionLabel}>General</Text>
                <View style={styles.card}>
                    <SettingsRow
                        icon={<Feather name="user" size={20} color="#717171" />}
                        label="Update profile"
                        onPress={() => navigation.navigate('CustomerEditProfileScreen')}
                    />
                    <SettingsRow
                        icon={<Ionicons name="lock-closed-outline" size={20} color="#717171" />}
                        label="Forgot password"
                        onPress={() => navigation.navigate('ForgotPasswordScreen', {email: account.email})}
                    />
                    <SettingsRow
                        icon={<Feather name="phone" size={20} color="#717171" />}
                        label="Change phone number"
                        onPress={() => navigation.navigate('CustomerEditProfileScreen')}
                    />
                    <SettingsRow
                        icon={<Ionicons name="navigate-outline" size={20} color="#717171" />}
                        label="Location preference"
                        value={String(profile?.preferredLocation || '').trim() || 'Not set'}
                        onPress={() => navigation.navigate('CustomerEditProfileScreen')}
                        isLast
                    />
                </View>

                <Text style={styles.sectionLabel}>Other</Text>
                <View style={styles.card}>
                    <SettingsRow
                        icon={<Ionicons name="language-outline" size={20} color="#717171" />}
                        label="Language"
                        value="English"
                        onPress={() => {}}
                    />
                    <SettingsRow
                        icon={<Ionicons name="moon-outline" size={20} color="#717171" />}
                        label="Dark theme"
                        rightElement={
                            <Switch
                                value={isDarkTheme}
                                onValueChange={setIsDarkTheme}
                                thumbColor="#ffffff"
                                trackColor={{false: '#c6c6c6', true: '#8294FF'}}
                            />
                        }
                        isLast
                    />
                </View>

                <View style={styles.logoutCard}>
                    <SettingsRow
                        icon={<MaterialCommunityIcons name="logout" size={20} color="#FF3B30" />}
                        label="Logout"
                        danger
                        onPress={handleLogout}
                        isLast
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#F5F7FA',
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    scrollContent: {
        paddingBottom: 98,
    },
    userCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 4,
        marginBottom: 18,
    },
    avatarShell: {
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        marginRight: 14,
        backgroundColor: '#8294FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {width: 64, height: 64, borderRadius: 32},
    avatarFallback: {width: 64, height: 64, borderRadius: 32, backgroundColor: '#8294FF', justifyContent: 'center', alignItems: 'center'},
    avatarFallbackText: {fontSize: 22, fontWeight: 'bold', color: '#FFFFFF'},
    userMeta: {flex: 1},
    userName: {fontSize: 22, fontWeight: '700', color: '#1A1A1A'},
    userSub: {fontSize: 14, color: '#717171', marginTop: 4},
    roleBadge: {alignSelf: 'flex-start', backgroundColor: '#E8F0FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8},
    roleBadgeText: {color: '#2F6FD6', fontSize: 12, fontWeight: '600'},
    sectionLabel: {fontSize: 16, fontWeight: '600', color: '#717171', marginBottom: 8, marginLeft: 8},
    card: {backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 24},
    logoutCard: {backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 24},
    row: {height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16},
    rowSeparator: {borderBottomWidth: 1, borderBottomColor: '#F0F0F0'},
    rowIconWrap: {width: 28, alignItems: 'center', justifyContent: 'center'},
    rowText: {fontSize: 16, color: '#1A1A1A', marginLeft: 12, flex: 1},
    rowTextDanger: {color: '#FF3B30', fontWeight: '600'},
    rowValue: {fontSize: 14, color: '#8E8E93', marginRight: 8},
});
