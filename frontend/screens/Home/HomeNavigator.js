import {useEffect, useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BusinessFlow from './Business/BusinessNavigator';
import StaffFlow from './Staff/StaffNavigator';
import CustomerFlow from './Customer/CustomerNavigator';
import {getSession} from '../../utils/authStorage';
import {isSuperAdmin, isBusinessOwner, isCustomer} from '../../constants/authRoles';

const HomeStack = createNativeStackNavigator();

export default function HomeFlow() {
    const [resolvedRole, setResolvedRole] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const {role} = await getSession();
            if (mounted) setResolvedRole(role);
        })();
        return () => {
            mounted = false;
        };
    }, []);

    if (!resolvedRole) {
        return (
            <View className="flex-1 items-center justify-center bg-gray-100">
                <ActivityIndicator size="large" color="#8294FF" />
            </View>
        );
    }

    const getRootScreen = () => {
        if (isSuperAdmin(resolvedRole) || isBusinessOwner(resolvedRole)) {
            return BusinessFlow;
        }
        if (isCustomer(resolvedRole)) {
            return CustomerFlow;
        }
        return StaffFlow;
    };

    const getRootScreenName = () => {
        if (isSuperAdmin(resolvedRole) || isBusinessOwner(resolvedRole)) {
            return 'BusinessFlow';
        }
        if (isCustomer(resolvedRole)) {
            return 'CustomerFlow';
        }
        return 'StaffFlow';
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
