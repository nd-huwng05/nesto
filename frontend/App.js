import {NavigationContainer} from "@react-navigation/native";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import Context from "./configuration/Context";
import {GlobalContext} from "./configuration/Context";
import {useContext} from "react";
import OnboardingFlow from "./screens/Onboarding/OnboardingNavigator";
import AccountFlow from "./screens/Account/AccountNavigator";
import HomeFlow from "./screens/Home/HomeNavigator";
import QuestionFlow from "./screens/Question/QuestionNavigator";

const Stack = createNativeStackNavigator()

function AppNavigator() {
    const {initialRoute} = useContext(GlobalContext)
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
                <Stack.Screen name="OnboardingFlow" component={OnboardingFlow} />
                <Stack.Screen name="AccountFlow" component={AccountFlow} />
                <Stack.Screen name="HomeFlow" component={HomeFlow}/>
                <Stack.Screen name="QuestionFlow" component={QuestionFlow}/>

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