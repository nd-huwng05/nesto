import HomeBusinessScreen from "./HomeBusinessScreen";
import ProfileBusinessScreen from "./ProfileBusinessScreen";
import ReportBusinessScreen from "./ReportBusinessScreen";
import StaffManagementScreen from "./StaffManagementScreen";
import CreateBusinessWizard from "./CreateBusinessWizard";

import {createBottomTabNavigator} from "@react-navigation/bottom-tabs";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import {StatusBar, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {TaborBusiness} from "../../../components/business/TaborBusiness";
import React, {useMemo} from "react";
import CreateBranchWizard from "./CreateBranchWizard";
import BusinessDetailScreen from "./BusinessDetailScreen";
import BranchDetailScreen from "./BranchDetailScreen";
import EditBusinessScreen from "./EditBusinessScreen";
import EditBranchScreen from "./EditBranchScreen";
import RoomTypeFormScreen from "./RoomTypeFormScreen";
import RoomTypeDetailScreen from "./RoomTypeDetailScreen";
import ExtraServiceFormScreen from "./ExtraServiceFormScreen";
import EditBranchMediaScreen from "./EditBranchMediaScreen";
import PhysicalRoomFormScreen from "./PhysicalRoomFormScreen";
import EditProfileScreen from "./EditProfileScreen";
import ChangePasswordScreen from "../../Account/ChangePasswordScreen";
import StaffFormScreen from "./StaffFormScreen";
import {UI} from "../../../styles/uiTokens";

const BusinessTab = createBottomTabNavigator();
const BusinessStack = createNativeStackNavigator();

const tabBarBaseStyle = {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
    paddingTop: 10,
};

function BusinessTabComponent() {
    const insets = useSafeAreaInsets();
    const bottomPad = Math.max(insets.bottom, 6);

    const tabBarStyle = useMemo(
        () => ({
            ...tabBarBaseStyle,
            paddingBottom: 0,
            height: undefined,
        }),
        []
    );

    return (
        <BusinessTab.Navigator
            tabBar={(props) => <TaborBusiness {...props} bottomInset={bottomPad} />}
            screenOptions={{
                headerShown: false,
                tabBarStyle,
                unmountOnBlur: false,
            }}
        >
            <BusinessTab.Screen name="HomeBusinessMain" component={HomeBusinessScreen} />
            <BusinessTab.Screen name="ReportBusinessScreen" component={ReportBusinessScreen} />
            <BusinessTab.Screen name="StaffBusinessScreen" component={StaffManagementScreen} />
            <BusinessTab.Screen name="ProfileBusinessScreen" component={ProfileBusinessScreen} />
        </BusinessTab.Navigator>
    );
}

export default function BusinessNavigator() {
    return (
        <View style={{flex: 1, backgroundColor: UI.screenBg}}>
            <StatusBar animated barStyle="dark-content" backgroundColor={UI.screenBg} />

            <BusinessStack.Navigator screenOptions={{headerShown: false}}>
                <BusinessStack.Screen name="MainTabs" component={BusinessTabComponent} />
                <BusinessStack.Screen name="CreateBusinessWizard" component={CreateBusinessWizard} />
                <BusinessStack.Screen name="CreateBranchWizard" component={CreateBranchWizard} />
                <BusinessStack.Screen name="BusinessDetailScreen" component={BusinessDetailScreen} />
                <BusinessStack.Screen name="BranchDetailScreen" component={BranchDetailScreen} />
                <BusinessStack.Screen name="EditBusinessScreen" component={EditBusinessScreen} />
                <BusinessStack.Screen name="EditBranchScreen" component={EditBranchScreen} />
                <BusinessStack.Screen name="RoomTypeFormScreen" component={RoomTypeFormScreen} />
                <BusinessStack.Screen name="RoomTypeDetailScreen" component={RoomTypeDetailScreen} />
                <BusinessStack.Screen name="ExtraServiceFormScreen" component={ExtraServiceFormScreen} />
                <BusinessStack.Screen name="EditBranchMediaScreen" component={EditBranchMediaScreen} />
                <BusinessStack.Screen name="PhysicalRoomFormScreen" component={PhysicalRoomFormScreen} />
                <BusinessStack.Screen name="EditProfileScreen" component={EditProfileScreen} />
                <BusinessStack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
                <BusinessStack.Screen name="StaffFormScreen" component={StaffFormScreen} />
            </BusinessStack.Navigator>
        </View>
    );
}
