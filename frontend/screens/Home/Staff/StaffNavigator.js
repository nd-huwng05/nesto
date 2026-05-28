import {useMemo} from 'react';
import {ActivityIndicator, StatusBar, View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StaffTabBar} from '../../../components/staff/StaffTabBar';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {AUTH_ROLES} from '../../../constants/authRoles';
import {UI} from '../../../styles/uiTokens';
import CustomerNavigator from '../Customer/CustomerNavigator';

import RoomGridScreen from './RoomGridScreen';
import BookingsScreen from './BookingsScreen';
import BookingDetailScreen from './BookingDetailScreen';
import StaffCreateBookingScreen from './StaffCreateBookingScreen';
import StaffAddServiceScreen from './StaffAddServiceScreen';
import HousekeepingTaskScreen from './HousekeepingTaskScreen';
import ServiceOrderScreen from './ServiceOrderScreen';
import StaffProfileScreen from './StaffProfileScreen';

const StaffTab = createBottomTabNavigator();
const StaffStack = createNativeStackNavigator();

function ReceptionistTabs({bottomInset}) {
    return (
        <StaffTab.Navigator
            tabBar={(props) => <StaffTabBar {...props} bottomInset={bottomInset} />}
            screenOptions={{headerShown: false}}
        >
            <StaffTab.Screen name="RoomGrid" component={RoomGridScreen} />
            <StaffTab.Screen name="Bookings" component={BookingsScreen} />
            <StaffTab.Screen name="Profile" component={StaffProfileScreen} />
        </StaffTab.Navigator>
    );
}

function HousekeepingTabs({bottomInset}) {
    return (
        <StaffTab.Navigator
            tabBar={(props) => <StaffTabBar {...props} bottomInset={bottomInset} />}
            screenOptions={{headerShown: false}}
        >
            <StaffTab.Screen name="Tasks" component={HousekeepingTaskScreen} />
            <StaffTab.Screen name="Profile" component={StaffProfileScreen} />
        </StaffTab.Navigator>
    );
}

function ServiceTabs({bottomInset}) {
    return (
        <StaffTab.Navigator
            tabBar={(props) => <StaffTabBar {...props} bottomInset={bottomInset} />}
            screenOptions={{headerShown: false}}
        >
            <StaffTab.Screen name="Orders" component={ServiceOrderScreen} />
            <StaffTab.Screen name="Profile" component={StaffProfileScreen} />
        </StaffTab.Navigator>
    );
}

function ReceptionistFlow({bottomInset}) {
    return (
        <StaffStack.Navigator screenOptions={{headerShown: false}}>
            <StaffStack.Screen name="ReceptionistMain">
                {() => <ReceptionistTabs bottomInset={bottomInset} />}
            </StaffStack.Screen>
            <StaffStack.Screen name="BookingDetailScreen" component={BookingDetailScreen} />
            <StaffStack.Screen name="StaffAddServiceScreen" component={StaffAddServiceScreen} />
            <StaffStack.Screen name="StaffCreateBookingScreen" component={StaffCreateBookingScreen} />
        </StaffStack.Navigator>
    );
}

function HousekeepingFlow({bottomInset}) {
    return (
        <StaffStack.Navigator screenOptions={{headerShown: false}}>
            <StaffStack.Screen name="HousekeepingMain">
                {() => <HousekeepingTabs bottomInset={bottomInset} />}
            </StaffStack.Screen>
        </StaffStack.Navigator>
    );
}

function ServiceFlow({bottomInset}) {
    return (
        <StaffStack.Navigator screenOptions={{headerShown: false}}>
            <StaffStack.Screen name="ServiceMain">
                {() => <ServiceTabs bottomInset={bottomInset} />}
            </StaffStack.Screen>
        </StaffStack.Navigator>
    );
}

export default function StaffNavigator() {
    const insets = useSafeAreaInsets();
    const {role, isLoading, isHousekeeping, isService, isCustomer} = useStaffSession();
    const bottomInset = Math.max(insets.bottom, 10);

    const Flow = useMemo(() => {
        if (isHousekeeping || role === AUTH_ROLES.HOUSEKEEPING) {
            return HousekeepingFlow;
        }
        if (isService || role === AUTH_ROLES.SERVICE) {
            return ServiceFlow;
        }
        return ReceptionistFlow;
    }, [isHousekeeping, isService, role]);

    if (isLoading) {
        return (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.screenBg}}>
                <ActivityIndicator size="large" color="#8294FF" />
            </View>
        );
    }

    if (isCustomer || role === AUTH_ROLES.CUSTOMER) {
        return <CustomerNavigator />;
    }

    return (
        <View style={{flex: 1, backgroundColor: UI.screenBg}}>
            <StatusBar animated barStyle="dark-content" backgroundColor={UI.screenBg} />
            <Flow bottomInset={bottomInset} />
        </View>
    );
}
