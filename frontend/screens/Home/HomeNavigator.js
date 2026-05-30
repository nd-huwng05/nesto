import {useEffect, useState} from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import BusinessFlow from './Business/BusinessNavigator';
import StaffFlow from './Staff/StaffNavigator';
import CustomerFlow from './Customer/CustomerNavigator';
import {getSession} from '../../utils/authStorage';
import {resetToAccountFlow} from '../../utils/navigation';
import {hydrateSession} from '../../utils/sessionBootstrap';
import {logout} from '../../services/AuthService';
import {
    isBusinessRole,
    isCustomer,
    isOperationalStaffRole,
    resolveStaffUiFlow,
    STAFF_UI_FLOWS,
} from '../../constants/authRoles';

const HomeStack = createNativeStackNavigator();

function resolveFlowForRole(role, user = null) {
    const normalized = String(role || '').trim().toUpperCase();
    if (!normalized) return null;

    const uiFlow = resolveStaffUiFlow(user || {}, normalized);
    if (uiFlow === STAFF_UI_FLOWS.BUSINESS) return 'business';
    if (uiFlow === STAFF_UI_FLOWS.CUSTOMER) return 'customer';
    if (
        uiFlow === STAFF_UI_FLOWS.RECEPTION ||
        uiFlow === STAFF_UI_FLOWS.HOUSEKEEPING ||
        uiFlow === STAFF_UI_FLOWS.SERVICE
    ) {
        return 'staff';
    }

    if (isBusinessRole(normalized)) return 'business';
    if (isCustomer(normalized)) return 'customer';
    if (isOperationalStaffRole(normalized)) return 'staff';
    return null;
}

function buildRoutingUser(session, hydratedUser) {
    if (hydratedUser) return hydratedUser;
    if (session?.user) return session.user;
    if (session?.role || session?.uiFlow) {
        return {
            role: session.role,
            uiFlow: session.uiFlow,
        };
    }
    return null;
}

export default function HomeFlow() {
    const [resolvedRole, setResolvedRole] = useState(null);
    const [resolvedUser, setResolvedUser] = useState(null);
    const [flowKind, setFlowKind] = useState(null);
    const [bootstrapError, setBootstrapError] = useState('');

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const session = await getSession();
                let role = session.role;
                let user = session.user;
                const token = session.token;

                if (token) {
                    const hydrated = await hydrateSession({
                        accessToken: token,
                        notifyOnFailure: false,
                    });

                    if (hydrated.ok) {
                        role = hydrated.user?.role || role;
                        user = hydrated.user || user;
                    } else if (!role && !session.uiFlow) {
                        if (!mounted) return;
                        setBootstrapError('expired');
                        setResolvedRole('');
                        setFlowKind(null);
                        return;
                    }
                } else if (!role && !session.uiFlow) {
                    if (!mounted) return;
                    setBootstrapError('expired');
                    setResolvedRole('');
                    setFlowKind(null);
                    return;
                }

                const routingUser = buildRoutingUser(session, user);
                const normalized = String(role || routingUser?.role || '').trim().toUpperCase();

                if (!mounted) return;

                setResolvedRole(normalized);
                setResolvedUser(routingUser);
                setFlowKind(resolveFlowForRole(normalized, routingUser));
            } catch (error) {
                console.error('Home bootstrap error:', error?.message || error);
                if (!mounted) return;

                const session = await getSession();
                const routingUser = buildRoutingUser(session, session.user);
                const normalized = String(session.role || routingUser?.role || '').trim().toUpperCase();

                setResolvedRole(normalized || '');
                setResolvedUser(routingUser);
                setFlowKind(normalized ? resolveFlowForRole(normalized, routingUser) : null);
            }
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

    if (bootstrapError === 'expired') {
        return <SessionExpiredScreen />;
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

function SessionExpiredScreen() {
    const navigation = useNavigation();

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await logout();
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
                Session expired. Returning to sign in…
            </Text>
        </View>
    );
}

function InvalidRoleScreen({role}) {
    const navigation = useNavigation();

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await logout();
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
                    : 'Unable to resolve account role. Returning to sign in…'}
            </Text>
        </View>
    );
}
