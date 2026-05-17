import {NavigationContainer} from "@react-navigation/native";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import {SafeAreaProvider} from "react-native-safe-area-context";
import Context from "./configuration/Context";
import {GlobalContext} from "./configuration/Context";
import {ManagerProfileProvider} from "./configuration/ManagerProfileContext";
import {useContext} from "react";
import OnboardingFlow from "./screens/Onboarding/OnboardingNavigator";
import AccountFlow from "./screens/Account/AccountNavigator";
import HomeFlow from "./screens/Home/HomeNavigator";

const Stack = createNativeStackNavigator()

function AppNavigator() {
    const {initialRoute} = useContext(GlobalContext)
    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName={initialRoute}>
                    <Stack.Screen name="OnboardingFlow" component={OnboardingFlow} />
                    <Stack.Screen name="AccountFlow" component={AccountFlow} />
                    <Stack.Screen name="HomeFlow" component={HomeFlow} />
                </Stack.Navigator>
            </NavigationContainer>
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