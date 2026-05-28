import {useEffect, useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BusinessFlow from './Business/BusinessNavigator';
import StaffFlow from './Staff/StaffNavigator';
import CustomerFlow from './Customer/CustomerNavigator';
import {getSession, clearSession} from '../../utils/authStorage';
import {AUTH_ROLES, isSuperAdmin, isBusinessOwner, isCustomer} from '../../constants/authRoles';

const HomeStack = createNativeStackNavigator();

export default function HomeFlow() {
    const [resolvedRole, setResolvedRole] = useState(null);
    const [isInvalidRole, setIsInvalidRole] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const {role} = await getSession();
            const normalized = String(role || '').trim().toUpperCase();
            if (!mounted) return;
            if (!normalized) {
                setIsInvalidRole(true);
                setResolvedRole('');
                return;
            }
            setResolvedRole(normalized);
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

    const getRootScreen = () => {
        if (isInvalidRole) return InvalidRoleScreen;
        if (isSuperAdmin(resolvedRole) || isBusinessOwner(resolvedRole) || resolvedRole === AUTH_ROLES.MANAGER) {
            return BusinessFlow;
        }
        if (isCustomer(resolvedRole)) {
            return CustomerFlow;
        }
        if (resolvedRole === AUTH_ROLES.RECEPTIONIST || resolvedRole === AUTH_ROLES.HOUSEKEEPING || resolvedRole === AUTH_ROLES.SERVICE) {
            return StaffFlow;
        }
        return InvalidRoleScreen;
    };

    const getRootScreenName = () => {
        if (isInvalidRole) return 'InvalidRole';
        if (isSuperAdmin(resolvedRole) || isBusinessOwner(resolvedRole) || resolvedRole === AUTH_ROLES.MANAGER) {
            return 'BusinessFlow';
        }
        if (isCustomer(resolvedRole)) {
            return 'CustomerFlow';
        }
        if (resolvedRole === AUTH_ROLES.RECEPTIONIST || resolvedRole === AUTH_ROLES.HOUSEKEEPING || resolvedRole === AUTH_ROLES.SERVICE) {
            return 'StaffFlow';
        }
        return 'InvalidRole';
    };

    return (
        <HomeStack.Navigator screenOptions={{headerShown: false}}>
            <HomeStack.Screen
                name={getRootScreenName()}
                component={getRootScreen()}
            />
        </HomeStack.Navigator>
    );
}

function InvalidRoleScreen() {
    useEffect(() => {
        clearSession().catch(() => {});
    }, []);
    return (
        <View className="flex-1 items-center justify-center bg-gray-100 px-6">
            <ActivityIndicator size="large" color="#8294FF" />
        </View>
    );
}
