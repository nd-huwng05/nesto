import {NavigationContainer} from "@react-navigation/native";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import OnboardingScreen from "./screens/OnboardingScreen";
import Context from "./configuration/Context";
import {AccountScreen} from "./screens/AccountScreen";
import {GlobalContext} from "./configuration/Context";
import {useContext} from "react";

const Stack = createNativeStackNavigator()

function AppNavigator() {
    const {initialRoute} = useContext(GlobalContext)
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName={initialRoute}>
                <Stack.Screen name="OnboardingScreen" component={OnboardingScreen}/>
                <Stack.Screen name="AccountScreen" component={AccountScreen}/>
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <Context>
            <AppNavigator/>
        </Context>
    );
}