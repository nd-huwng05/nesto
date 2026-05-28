import {useCallback, useMemo, useState} from 'react';
import {Alert, Image, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {useFocusEffect} from '@react-navigation/native';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {clearSession} from '../../../utils/authStorage';
import CustomerBottomTabBar from '../../../components/customer/CustomerBottomTabBar';
import {useCustomerProfile} from '../../../hooks/customer/useCustomerProfile';

function SectionRow({icon, label, value, valueColor = '#8294FF', danger = false, showSeparator = false, onPress}) {
    return (
        <TouchableOpacity style={styles.rowItem} activeOpacity={0.85} onPress={onPress}>
            {showSeparator ? <View style={styles.rowDivider} /> : null}
            <View style={styles.rowLeft}>
                {icon}
                <Text style={[styles.rowLabel, danger ? styles.rowLabelDanger : null]}>{label}</Text>
            </View>
            {value ? <Text style={[styles.rowValue, {color: valueColor}]}>{value}</Text> : null}
        </TouchableOpacity>
    );
}

export function CustomerProfileScreen({navigation}) {
    const {profile, loadProfile} = useCustomerProfile();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadProfile();
            return undefined;
        }, [loadProfile])
    );

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
                            navigation.reset({
                                index: 0,
                                routes: [{name: 'AccountFlow'}],
                            });
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

    const account = useMemo(() => {
        const rawName = String(profile?.name || '').trim();
        const role = String(profile?.role || 'CUSTOMER').toLowerCase();
        const usernameSource = String(profile?.email || '').split('@')[0];
        const shouldUseDefaultName = rawName.toLowerCase() === 'nesto customer' || rawName.length === 0;

        return {
            name: shouldUseDefaultName ? 'Nguyen Ngoc Lan' : rawName,
            username: usernameSource || 'lannguyen',
            email: String(profile?.email || '').trim() || 'N/A',
            role,
            phone: String(profile?.phone || '').trim() || 'N/A',
            avatar: String(profile?.avatar || '').trim() || STAFF_MEDIA.USER_PLACEHOLDER,
        };
    }, [profile]);

    const displayName = useMemo(() => {
        const value = String(account.name || '').trim();
        if (!value) return 'Nguyen Ngoc Lan';
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

    const handleRefresh = () => {
        setIsRefreshing(true);
        Promise.resolve(loadProfile()).finally(() => {
            setIsRefreshing(false);
        });
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
                <View style={styles.headerDecorWrap}>
                    <View style={styles.decorCircleOne} />
                    <View style={styles.decorCircleTwo} />
                    <View style={styles.profileCard}>
                        <Image source={{uri: account.avatar}} style={styles.profileAvatar} />
                        <View style={styles.profileInfoWrap}>
                            <Text style={styles.profileName}>{displayName}</Text>
                            <Text style={styles.profileMeta}>Username: {account.username}</Text>
                            <Text style={styles.profileMeta}>Email: {account.email}</Text>
                            <Text style={styles.profileMeta}>Role: {capitalizeFirst(account.role)}</Text>
                            <Text style={styles.profileMeta}>Phone number: {account.phone}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>General</Text>
                    <SectionRow
                        icon={<Feather name="user" size={17} color="#2f2f2f" />}
                        label="Update profile"
                        showSeparator={false}
                        onPress={() => navigation.navigate('CustomerEditProfileScreen')}
                    />
                    <SectionRow
                        icon={<Ionicons name="lock-closed-outline" size={17} color="#2f2f2f" />}
                        label="Forgot password"
                        showSeparator
                    />
                    <SectionRow
                        icon={<Feather name="phone" size={17} color="#2f2f2f" />}
                        label="Change phone number"
                        showSeparator
                    />
                </View>

                <View style={[styles.sectionCard, styles.sectionCardSpaced]}>
                    <Text style={styles.sectionTitle}>Other</Text>
                    <SectionRow
                        icon={<Ionicons name="language-outline" size={17} color="#2f2f2f" />}
                        label="Language"
                        value="English"
                        showSeparator={false}
                    />
                    <View style={styles.rowItem}>
                        <View style={styles.rowDivider} />
                        <View style={styles.rowLeft}>
                            <Ionicons name="color-wand-outline" size={17} color="#2f2f2f" />
                            <Text style={styles.rowLabel}>Theme dark</Text>
                        </View>
                        <Switch
                            value
                            thumbColor="#ffffff"
                            trackColor={{false: '#c6c6c6', true: '#8294FF'}}
                        />
                    </View>
                    <SectionRow
                        icon={<MaterialCommunityIcons name="logout" size={18} color="#ff2f2f" />}
                        label="Logout"
                        danger
                        showSeparator
                        onPress={handleLogout}
                    />
                </View>
            </ScrollView>

            <CustomerBottomTabBar navigation={navigation} activeTab="Profile"/>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#f4f4f4',
        paddingHorizontal: 14,
        paddingTop: 8,
    },
    scrollContent: {
        paddingBottom: 98,
    },
    headerDecorWrap: {
        position: 'relative',
        borderRadius: 24,
        overflow: 'hidden',
        paddingTop: 36,
        paddingHorizontal: 12,
        paddingBottom: 12,
        marginBottom: 10,
        backgroundColor: '#d5e7ef',
    },
    decorCircleOne: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 999,
        backgroundColor: '#8eb6c6',
        top: -80,
        left: -50,
        opacity: 0.75,
    },
    decorCircleTwo: {
        position: 'absolute',
        width: 210,
        height: 210,
        borderRadius: 999,
        backgroundColor: '#c9d8ea',
        top: -120,
        right: -60,
        opacity: 0.85,
    },
    profileCard: {
        backgroundColor: '#fbfbfb',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 6},
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 8,
    },
    profileAvatar: {
        width: 82,
        height: 82,
        borderRadius: 41,
        marginRight: 14,
    },
    profileInfoWrap: {
        flex: 1,
    },
    profileName: {
        fontFamily: 'SF-Bold',
        fontSize: 28,
        color: '#161616',
        marginBottom: 3,
    },
    profileMeta: {
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#1f1f1f',
        marginTop: 1,
    },
    sectionCard: {
        backgroundColor: '#fbfbfb',
        borderRadius: 14,
        marginTop: 14,
        borderWidth: 1,
        borderColor: '#e4e4e4',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 6},
        shadowOpacity: 0.18,
        shadowRadius: 9,
        elevation: 7,
    },
    sectionCardSpaced: {
        marginTop: 18,
        marginBottom: 92,
    },
    sectionTitle: {
        fontFamily: 'SF-Regular',
        fontSize: 24,
        color: '#a2a2a2',
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 6,
    },
    rowItem: {
        position: 'relative',
        minHeight: 46,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'transparent',
    },
    rowDivider: {
        position: 'absolute',
        top: 0,
        left: 52,
        right: 12,
        borderTopWidth: 1,
        borderTopColor: '#d0d0d0',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rowLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 18,
        color: '#1e1e1e',
    },
    rowLabelDanger: {
        color: '#ff2f2f',
    },
    rowValue: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
    },
});
