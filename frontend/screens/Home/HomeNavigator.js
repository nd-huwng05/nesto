import {useEffect, useState} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import BusinessFlow from './Business/BusinessNavigator';
import StaffFlow from './Staff/StaffNavigator';
import CustomerFlow from './Customer/CustomerNavigator';
import {getSession, clearSession} from '../../utils/authStorage';
import {resetToAccountFlow} from '../../utils/navigation';
import {
    AUTH_ROLES,
    isSuperAdmin,
    isBusinessOwner,
    isCustomer,
    isStaffRole,
} from '../../constants/authRoles';

const HomeStack = createNativeStackNavigator();

function resolveFlowForRole(role) {
    const normalized = String(role || '').trim().toUpperCase();
    if (!normalized) return null;
    if (isSuperAdmin(normalized) || isBusinessOwner(normalized) || normalized === AUTH_ROLES.MANAGER) {
        return 'business';
    }
    if (isCustomer(normalized)) {
        return 'customer';
    }
    if (isStaffRole(normalized)) {
        return 'staff';
    }
    return null;
}

export default function HomeFlow() {
    const [resolvedRole, setResolvedRole] = useState(null);
    const [flowKind, setFlowKind] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const {role} = await getSession();
            const normalized = String(role || '').trim().toUpperCase();
            if (!mounted) return;
            setResolvedRole(normalized);
            setFlowKind(resolveFlowForRole(normalized));
        })();
        return () => {
            mounted = false;
        };
    }, []);

    if (resolvedRole === null) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-100">
                <ActivityIndicator size="large" color="#8294FF" />
            </View>
        );
    }

    if (!flowKind) {
        return <InvalidRoleScreen role={resolvedRole} />;
    }

    const screenName =
        flowKind === 'business' ? 'BusinessFlow' : flowKind === 'customer' ? 'CustomerFlow' : 'StaffFlow';
    const ScreenComponent =
        flowKind === 'business' ? BusinessFlow : flowKind === 'customer' ? CustomerFlow : StaffFlow;

    return (
        <HomeStack.Navigator screenOptions={{headerShown: false}}>
            <HomeStack.Screen name={screenName} component={ScreenComponent} />
        </HomeStack.Navigator>
    );
}

function InvalidRoleScreen({role}) {
    const navigation = useNavigation();

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await clearSession();
            if (!cancelled) {
                resetToAccountFlow(navigation);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [navigation]);

    return (
        <View className="flex-1 items-center justify-center bg-gray-100 px-6">
            <ActivityIndicator size="large" color="#8294FF" />
            <Text className="mt-4 text-center text-base text-gray-600">
                {role
                    ? `Role "${role}" is not supported. Returning to sign in…`
                    : 'Session expired. Returning to sign in…'}
            </Text>
        </View>
    );
}
