import {useState} from 'react';
import {Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {
    Bell,
    CircleHelp,
    FileText,
    Globe,
    KeyRound,
    LogOut,
    Pencil,
    Shield,
} from 'lucide-react-native';
import {ProfileSettingsRow} from '../../../components/profile/ProfileSettingsRow';
import {ProfileSettingsSection} from '../../../components/profile/ProfileSettingsSection';
import {useManagerProfile} from '../../../configuration/ManagerProfileContext';
import {UI, cardStyle} from '../../../styles/uiTokens';
import {clearSession} from '../../../utils/authStorage';

function resetToAccountFlow(navigation) {
    let root = navigation;
    while (root.getParent?.()) {
        root = root.getParent();
    }
    root.reset({
        index: 0,
        routes: [{name: 'AccountFlow'}],
    });
}

export default function ProfileBusinessScreen({navigation}) {
    const {profile} = useManagerProfile();
    const [language, setLanguage] = useState('English');
    const [pushEnabled, setPushEnabled] = useState(true);

    const stackNav = () => navigation.getParent();

    const handleLogout = () => {
        Alert.alert('Log out', 'Are you sure you want to sign out?', [
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

    const cycleLanguage = () => {
        setLanguage((prev) => (prev === 'English' ? 'Vietnamese' : 'English'));
    };

    const showComingSoon = (title) => {
        Alert.alert(title, 'This feature will be available in a future update.');
    };

    return (
        <TabScreenLayout backgroundColor={UI.screenBg}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="automatic"
            >
                <Text className="font-sf-bold text-2xl text-slate-800 mb-1">Profile</Text>
                <Text className="font-sf text-sm text-gray-500 mb-4">Manager account & app settings</Text>

                <View style={styles.profileHeader}>
                    <View style={styles.avatarRing}>
                        <Image source={{uri: profile.avatar}} style={styles.avatar} />
                    </View>
                    <Text className="font-sf-bold text-xl text-slate-800 mt-4">{profile.name}</Text>
                    <Text className="font-sf text-sm text-gray-500 mt-1">{profile.email}</Text>
                    <View style={styles.roleBadge}>
                        <Shield size={14} color="#8294FF" />
                        <Text className="font-sf-semi text-primary text-xs ml-1.5">{profile.role}</Text>
                    </View>
                </View>

                <ProfileSettingsSection title="Account Settings">
                    <ProfileSettingsRow
                        icon={Pencil}
                        label="Edit Profile"
                        onPress={() => stackNav()?.navigate('EditProfileScreen')}
                    />
                    <ProfileSettingsRow
                        icon={KeyRound}
                        label="Change Password"
                        onPress={() => stackNav()?.navigate('ChangePasswordScreen')}
                        isLast
                    />
                </ProfileSettingsSection>

                <ProfileSettingsSection title="App Settings">
                    <ProfileSettingsRow
                        icon={Globe}
                        label="Language"
                        value={language}
                        onPress={cycleLanguage}
                    />
                    <ProfileSettingsRow
                        icon={Bell}
                        label="Push Notifications"
                        isSwitch
                        switchValue={pushEnabled}
                        onSwitchChange={setPushEnabled}
                        showChevron={false}
                        isLast
                    />
                </ProfileSettingsSection>

                <ProfileSettingsSection title="About & Support">
                    <ProfileSettingsRow
                        icon={CircleHelp}
                        label="Help Center"
                        onPress={() => showComingSoon('Help Center')}
                    />
                    <ProfileSettingsRow
                        icon={FileText}
                        label="Terms of Service"
                        onPress={() => showComingSoon('Terms of Service')}
                        isLast
                    />
                </ProfileSettingsSection>

                <TouchableOpacity onPress={handleLogout} activeOpacity={0.85} style={styles.logoutBtn}>
                    <LogOut size={20} color="#dc2626" />
                    <Text className="text-red-600 font-sf-bold text-base ml-2">Log out</Text>
                </TouchableOpacity>
            </ScrollView>
        </TabScreenLayout>
    );
}

const styles = StyleSheet.create({
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 32,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: UI.sectionGap + 4,
        paddingVertical: 8,
    },
    avatarRing: {
        padding: 4,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: '#e0e7ff',
        backgroundColor: '#ffffff',
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#e5e7eb',
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(130, 148, 255, 0.12)',
    },
    logoutBtn: {
        ...cardStyle,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        marginTop: 4,
    },
});
