import {createNativeStackNavigator} from "@react-navigation/native-stack";
import OnboardingScreen from "./OnboardingScreen";

const OnboardingStack = createNativeStackNavigator()
export default function OnboardingFlow() {
    return (
        <OnboardingStack.Navigator screenOptions={{headerShown: false}}>
           <OnboardingStack.Screen name="OnboardingScreen" component={OnboardingScreen} />

        </OnboardingStack.Navigator>
    )
}