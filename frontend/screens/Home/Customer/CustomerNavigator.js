import {StatusBar, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Ionicons, MaterialCommunityIcons, Feather} from '@expo/vector-icons';
import {UI} from '../../../styles/uiTokens';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {HomeScreen} from './CustomerHomeScreen';
import {CustomerHomeDetailSceen} from './CustomerHomeDetailSceen';
import {HomeDetailScreen} from './CustomerRoomDetailScreen';
import {CustomerProfileScreen} from './CustomerProfileScreen';
import CustomerEditProfileScreen from './CustomerEditProfileScreen';
import CustomerBookingScreen from './CustomerBookingScreen';
import CustomerPaymentScreen from './CustomerPaymentScreen';
import CustomerBookingsHubScreen from './CustomerBookingsHubScreen';
import BookingDetailScreen from './BookingDetailScreen';
import WatchlistScreen from './WatchlistScreen';
import ServiceSelectionScreen from './ServiceSelectionScreen';
import CustomerAddPostScreen from './CustomerAddPostScreen';
import CreateWatchlistModal from '../../../components/customer/CreateWatchlistModal';
import CustomerReviewScreen from './CustomerReviewScreen';
import CustomerNotificationsScreen from './CustomerNotificationsScreen';
import ChangePasswordScreen from '../../Account/ChangePasswordScreen';

const CustomerStack = createNativeStackNavigator();
const CustomerTab = createBottomTabNavigator();

function CustomerTabs() {
    const insets = useSafeAreaInsets();
    const bottomPad = Math.max(insets.bottom, 6);
    return (
        <CustomerTab.Navigator
            screenOptions={{
                headerShown: false,
                unmountOnBlur: false,
                tabBarHideOnKeyboard: true,
                tabBarStyle: {
                    paddingBottom: bottomPad,
                    paddingTop: 6,
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb',
                    backgroundColor: '#ffffff',
                },
                tabBarActiveTintColor: '#8294FF',
                tabBarInactiveTintColor: '#8f8f8f',
                tabBarLabelStyle: {fontSize: 11, fontFamily: 'SF-Regular', marginTop: 2, marginBottom: 2},
            }}
        >
            <CustomerTab.Screen
                name="HomeTab"
                component={HomeScreen}
                options={{
                    title: 'Home',
                    tabBarIcon: ({color, size}) => <Ionicons name="home" size={size ?? 22} color={color} />,
                }}
            />
            <CustomerTab.Screen
                name="BookingTab"
                component={CustomerBookingsHubScreen}
                options={{
                    title: 'Booking',
                    tabBarIcon: ({color, size}) => (
                        <MaterialCommunityIcons name="map-marker-radius-outline" size={size ?? 22} color={color} />
                    ),
                }}
            />
            <CustomerTab.Screen
                name="WatchlistTab"
                component={WatchlistScreen}
                options={{
                    title: 'Watchlist',
                    tabBarIcon: ({color, size}) => <Ionicons name="heart-outline" size={size ?? 22} color={color} />,
                }}
            />
            <CustomerTab.Screen
                name="ProfileTab"
                component={CustomerProfileScreen}
                options={{
                    title: 'Profile',
                    tabBarIcon: ({color, size}) => <Feather name="user" size={size ?? 22} color={color} />,
                }}
            />
        </CustomerTab.Navigator>
    );
}

export default function CustomerNavigator() {
    return (
        <View style={{flex: 1, backgroundColor: UI.screenBg}}>
            <StatusBar animated barStyle="dark-content" backgroundColor={UI.screenBg} />
            <CustomerStack.Navigator screenOptions={{headerShown: false}}>
                <CustomerStack.Screen name="MainTabs" component={CustomerTabs} />
                <CustomerStack.Screen name="CustomerHomeDetailSceen" component={CustomerHomeDetailSceen} />
                <CustomerStack.Screen name="CustomerRoomDetailScreen" component={HomeDetailScreen} />
                <CustomerStack.Screen name="CustomerEditProfileScreen" component={CustomerEditProfileScreen} />
                <CustomerStack.Screen name="BookingDetailScreen" component={BookingDetailScreen} />
                <CustomerStack.Screen name="CustomerAddPostScreen" component={CustomerAddPostScreen} />
                <CustomerStack.Screen
                    name="CreateWatchlistModal"
                    component={CreateWatchlistModal}
                    options={{
                        animation: 'slide_from_bottom',
                        presentation: 'fullScreenModal',
                        headerShown: false,
                        contentStyle: {backgroundColor: '#000000'},
                        statusBarStyle: 'light',
                    }}
                />
                <CustomerStack.Screen name="CustomerBookingScreen" component={CustomerBookingScreen} />
                <CustomerStack.Screen name="CustomerPaymentScreen" component={CustomerPaymentScreen} />
                <CustomerStack.Screen name="ServiceSelectionScreen" component={ServiceSelectionScreen} />
                <CustomerStack.Screen name="CustomerReviewScreen" component={CustomerReviewScreen} />
                <CustomerStack.Screen name="CustomerNotificationsScreen" component={CustomerNotificationsScreen} />
                <CustomerStack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
            </CustomerStack.Navigator>
        </View>
    );
}
