import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useEffect, useState} from 'react';
import {useNavigation} from '@react-navigation/native';
import {LogOut} from 'lucide-react-native';
import {getSession, clearSession} from '../../../utils/authStorage';
import {UI, cardStyle} from '../../../styles/uiTokens';

const roleLabels = {
    RECEPTIONIST: 'Reception',
    HOUSEKEEPING: 'Housekeeping',
    MANAGER: 'Branch Manager',
};

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

export default function StaffHomeScreen() {
    const navigation = useNavigation();
    const [user, setUser] = useState(null);

    useEffect(() => {
        getSession().then(({user: stored}) => setUser(stored));
    }, []);

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

    const roleLabel = roleLabels[user?.role] || user?.jobRole || 'Staff';

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text className="font-sf-bold text-2xl text-slate-800">Staff Home</Text>
                <Text className="font-sf text-sm text-gray-500 mt-1 mb-6">
                    {roleLabel} workspace — operational tools will appear here in a future release.
                </Text>

                <View style={cardStyle}>
                    <Text className="font-sf-bold text-lg text-slate-800">{user?.name || 'Team Member'}</Text>
                    <Text className="font-sf text-sm text-gray-500 mt-1">{user?.email}</Text>
                    <View style={styles.badge}>
                        <Text className="font-sf-semi text-primary text-xs">{roleLabel}</Text>
                    </View>
                    {user?.branchId ? (
                        <Text className="font-sf text-xs text-gray-400 mt-3">Branch ID: {user.branchId}</Text>
                    ) : null}
                </View>

                <View style={[cardStyle, styles.placeholder]}>
                    <Text className="font-sf-semi text-slate-700">Coming soon</Text>
                    <Text className="font-sf text-sm text-gray-500 mt-2 leading-5">
                        Check-ins, room status, and task queues for {roleLabel.toLowerCase()} staff will be built in
                        the next phase.
                    </Text>
                </View>

                <TouchableOpacity onPress={handleLogout} activeOpacity={0.85} style={styles.logoutBtn}>
                    <LogOut size={18} color="#ef4444" />
                    <Text className="font-sf-semi text-red-500 ml-2">Log out</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: UI.screenBg,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 32,
    },
    badge: {
        alignSelf: 'flex-start',
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 24,
        backgroundColor: '#eef2ff',
    },
    placeholder: {
        marginTop: UI.sectionGap,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        paddingVertical: 14,
    },
});
