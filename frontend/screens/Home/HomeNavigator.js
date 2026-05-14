import {createNativeStackNavigator} from "@react-navigation/native-stack";
import {HomeScreen} from "./HomeScreen";

const HomeStack = createNativeStackNavigator()
export default function HomeFlow() {
    return (
        <HomeStack.Navigator screenOptions={{headerShown: false}}>
            <HomeStack.Screen name={'HomeScreen'} component={HomeScreen}/>
        </HomeStack.Navigator>
    )
}