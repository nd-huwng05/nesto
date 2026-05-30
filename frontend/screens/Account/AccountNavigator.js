import {createNativeStackNavigator} from "@react-navigation/native-stack";
import {AccountScreen} from "./AccountScreen";
import EmailLoginScreen from "./EmailLoginScreen";
import PasswordScreen from "./PasswordScreen";
import EmailRegisterScreen from "./EmailRegisterScreen";
import OtpRegisterScreen from "./OtpRegisterScreen";
import PasswordRegisterScreen from "./PasswordRegisterScreen";
import RePasswordRegisterScreen from "./RePasswordRegisterScreen";
import RolesRegisterScreen from "./RolesRegisterScreen";
import ProfileRegisterScreen from "./ProfileRegisterScreen";
import ForgotPasswordScreen from "./ForgotPasswordScreen";
import ResetPasswordScreen from "./ResetPasswordScreen";

const AccountStack = createNativeStackNavigator()
export default function AccountFlow() {
    return (
        <AccountStack.Navigator screenOptions={{headerShown: false}}>
            <AccountStack.Screen name={"AccountScreen"} component={AccountScreen}/>
            <AccountStack.Screen name={"EmailLoginScreen"} component={EmailLoginScreen}/>
            <AccountStack.Screen name={"PasswordScreen"} component={PasswordScreen}/>
            <AccountStack.Screen name={"ForgotPasswordScreen"} component={ForgotPasswordScreen}/>
            <AccountStack.Screen name={"ResetPasswordScreen"} component={ResetPasswordScreen}/>

            <AccountStack.Screen name={"RolesRegisterScreen"} component={RolesRegisterScreen}/>
            <AccountStack.Screen name={"EmailRegisterScreen"} component={EmailRegisterScreen}/>
            <AccountStack.Screen name={"OtpRegisterScreen"} component={OtpRegisterScreen}/>
            <AccountStack.Screen name={"PasswordRegisterScreen"} component={PasswordRegisterScreen}/>
            <AccountStack.Screen name={"RePasswordRegisterScreen"} component={RePasswordRegisterScreen}/>
            <AccountStack.Screen name={"ProfileRegisterScreen"} component={ProfileRegisterScreen}/>

        </AccountStack.Navigator>
    )
}
