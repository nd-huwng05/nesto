import {NavigationContainer, useNavigationContainerRef} from "@react-navigation/native";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import {SafeAreaProvider} from "react-native-safe-area-context";
import Context from "./configuration/Context";
import {GlobalContext} from "./configuration/Context";
import {ManagerProfileProvider} from "./configuration/ManagerProfileContext";
import {useContext, useEffect} from "react";
import OnboardingFlow from "./screens/Onboarding/OnboardingNavigator";
import AccountFlow from "./screens/Account/AccountNavigator";
import HomeFlow from "./screens/Home/HomeNavigator";
import {ErrorBoundary} from "./components/common/ErrorBoundary";
import {onAuthFailure} from "./configuration/Apis";
import {resetToAccountFlow} from "./utils/navigation";

const Stack = createNativeStackNavigator()

const linking = {
    prefixes: ['nesto://'],
    config: {
        screens: {
            AccountFlow: {
                screens: {
                    ResetPasswordScreen: {
                        path: 'reset-password',
                        parse: {
                            uid: (uid) => String(uid || ''),
                            token: (token) => String(token || ''),
                        },
                    },
                },
            },
        },
    },
};

function AppNavigator() {
    const {initialRoute} = useContext(GlobalContext)
    const navigationRef = useNavigationContainerRef();

    useEffect(() => {
        return onAuthFailure(() => {
            if (navigationRef.isReady()) {
                resetToAccountFlow(navigationRef);
            }
        });
    }, [navigationRef]);

    return (
        <SafeAreaProvider>
            <ErrorBoundary>
                <NavigationContainer ref={navigationRef} linking={linking}>
                    <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName={initialRoute}>
                        <Stack.Screen name="OnboardingFlow" component={OnboardingFlow} />
                        <Stack.Screen name="AccountFlow" component={AccountFlow} />
                        <Stack.Screen name="HomeFlow" component={HomeFlow} />
                    </Stack.Navigator>
                </NavigationContainer>
            </ErrorBoundary>
        </SafeAreaProvider>
    );
}

export default function App() {
    return (
        <Context>
            <ManagerProfileProvider>
                <AppNavigator />
            </ManagerProfileProvider>
        </Context>
    );
}