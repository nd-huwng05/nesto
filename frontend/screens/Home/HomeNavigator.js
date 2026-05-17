import {useEffect, useState} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import BusinessFlow from './Business/BusinessNavigator';
import StaffFlow from './Staff/StaffNavigator';
import {getSession} from '../../utils/authStorage';
import {isSuperAdmin} from '../../constants/authRoles';

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

    const RootScreen = isSuperAdmin(resolvedRole) ? BusinessFlow : StaffFlow;

    return (
        <HomeStack.Navigator screenOptions={{headerShown: false}}>
            <HomeStack.Screen
                name={isSuperAdmin(resolvedRole) ? 'BusinessFlow' : 'StaffFlow'}
                component={RootScreen}
            />
        </HomeStack.Navigator>
    );
}
