import {useMemo} from 'react';
import {ActivityIndicator, StatusBar, Text, View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StaffTabBar} from '../../../components/staff/StaffTabBar';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {AUTH_ROLES, STAFF_UI_FLOWS} from '../../../constants/authRoles';
import {UI} from '../../../styles/uiTokens';

import RoomGridScreen from './RoomGridScreen';
import BookingsScreen from './BookingsScreen';
import BookingDetailScreen from './BookingDetailScreen';
import StaffCreateBookingScreen from './StaffCreateBookingScreen';
import StaffAddServiceScreen from './StaffAddServiceScreen';
import HousekeepingTaskScreen from './HousekeepingTaskScreen';
import ServiceOrderScreen from './ServiceOrderScreen';
import StaffProfileScreen from './StaffProfileScreen';
import ReceptionQrScannerScreen from './ReceptionQrScannerScreen';
import RoomMaintenanceScreen from './RoomMaintenanceScreen';
import ChangePasswordScreen from '../../Account/ChangePasswordScreen';
import {StaffRoomLiveProvider} from '../../../contexts/StaffRoomLiveContext';

const StaffTab = createBottomTabNavigator();
const StaffStack = createNativeStackNavigator();

function ReceptionistTabs({bottomInset}) {
    return (
        <StaffTab.Navigator
            tabBar={(props) => <StaffTabBar {...props} bottomInset={bottomInset} flow="reception" />}
            screenOptions={{headerShown: false, unmountOnBlur: false}}
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
            tabBar={(props) => <StaffTabBar {...props} bottomInset={bottomInset} flow="housekeeping" />}
            screenOptions={{headerShown: false, unmountOnBlur: false}}
        >
            <StaffTab.Screen name="Tasks" component={HousekeepingTaskScreen} />
            <StaffTab.Screen name="Profile" component={StaffProfileScreen} />
        </StaffTab.Navigator>
    );
}

function ServiceTabs({bottomInset, serviceCategory}) {
    return (
        <StaffTab.Navigator
            tabBar={(props) => (
                <StaffTabBar {...props} bottomInset={bottomInset} flow="service" serviceCategory={serviceCategory} />
            )}
            screenOptions={{headerShown: false, unmountOnBlur: false}}
        >
            <StaffTab.Screen name="Orders" component={ServiceOrderScreen} />
            <StaffTab.Screen name="Profile" component={StaffProfileScreen} />
        </StaffTab.Navigator>
    );
}

function ReceptionistFlow({bottomInset}) {
    const {branchId} = useStaffSession();
    return (
        <StaffRoomLiveProvider branchId={branchId}>
            <StaffStack.Navigator screenOptions={{headerShown: false}}>
                <StaffStack.Screen name="ReceptionistMain">
                    {() => <ReceptionistTabs bottomInset={bottomInset} />}
                </StaffStack.Screen>
                <StaffStack.Screen name="BookingDetailScreen" component={BookingDetailScreen} />
                <StaffStack.Screen name="StaffAddServiceScreen" component={StaffAddServiceScreen} />
                <StaffStack.Screen name="StaffCreateBookingScreen" component={StaffCreateBookingScreen} />
                <StaffStack.Screen name="ReceptionQrScannerScreen" component={ReceptionQrScannerScreen} />
                <StaffStack.Screen name="RoomMaintenanceScreen" component={RoomMaintenanceScreen} />
                <StaffStack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
            </StaffStack.Navigator>
        </StaffRoomLiveProvider>
    );
}

function HousekeepingFlow({bottomInset}) {
    return (
        <StaffStack.Navigator screenOptions={{headerShown: false}}>
            <StaffStack.Screen name="HousekeepingMain">
                {() => <HousekeepingTabs bottomInset={bottomInset} />}
            </StaffStack.Screen>
            <StaffStack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
        </StaffStack.Navigator>
    );
}

function ServiceFlow({bottomInset, serviceCategory}) {
    return (
        <StaffStack.Navigator screenOptions={{headerShown: false}}>
            <StaffStack.Screen name="ServiceMain">
                {() => <ServiceTabs bottomInset={bottomInset} serviceCategory={serviceCategory} />}
            </StaffStack.Screen>
            <StaffStack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
        </StaffStack.Navigator>
    );
}

function resolveStaffFlow(staffUiFlow, role) {
    const flow = String(staffUiFlow || '').trim().toLowerCase();
    if (flow === STAFF_UI_FLOWS.HOUSEKEEPING) return 'housekeeping';
    if (flow === STAFF_UI_FLOWS.SERVICE) return 'service';
    if (flow === STAFF_UI_FLOWS.RECEPTION) return 'reception';

    const normalizedRole = String(role || '').trim().toUpperCase();
    if (normalizedRole === AUTH_ROLES.HOUSEKEEPING) return 'housekeeping';
    if (normalizedRole === AUTH_ROLES.SERVICE) return 'service';
    if (normalizedRole === AUTH_ROLES.RECEPTIONIST || normalizedRole === AUTH_ROLES.STAFF) return 'reception';
    return '';
}

export default function StaffNavigator() {
    const insets = useSafeAreaInsets();
    const {role, staffUiFlow, serviceCategory, isLoading} = useStaffSession();
    const bottomInset = Math.max(insets.bottom, 10);

    const flowKind = useMemo(() => resolveStaffFlow(staffUiFlow, role), [staffUiFlow, role]);

    if (isLoading) {
        return (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.screenBg}}>
                <ActivityIndicator size="large" color="#8294FF" />
            </View>
        );
    }

    if (!flowKind) {
        return (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.screenBg, padding: 24}}>
                <Text style={{fontSize: 16, color: '#64748B', textAlign: 'center'}}>
                    Unable to determine staff workspace for this account. Please contact your manager.
                </Text>
            </View>
        );
    }

    return (
        <View style={{flex: 1, backgroundColor: UI.screenBg}}>
            <StatusBar animated barStyle="dark-content" backgroundColor={UI.screenBg} />
            {flowKind === 'housekeeping' ? (
                <HousekeepingFlow bottomInset={bottomInset} />
            ) : flowKind === 'service' ? (
                <ServiceFlow bottomInset={bottomInset} serviceCategory={serviceCategory} />
            ) : (
                <ReceptionistFlow bottomInset={bottomInset} />
            )}
        </View>
    );
}
