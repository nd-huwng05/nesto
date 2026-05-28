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
import CustomerBookingUpcomingScreen from './CustomerBookingUpcomingScreen';
import CustomerBookingHistoryScreen from './CustomerBookingHistoryScreen';
import CustomerLocketScreen from './CustomerLocketScreen';
import CustomerServiceScreen from './CustomerServiceScreen';
import CustomerAddPostScreen from './CustomerAddPostScreen';
import CustomerReviewScreen from './CustomerReviewScreen';
import CustomerNotificationsScreen from './CustomerNotificationsScreen';

const CustomerStack = createNativeStackNavigator();
const CustomerTab = createBottomTabNavigator();

function CustomerTabs() {
    const insets = useSafeAreaInsets();
    const bottomPad = Math.max(insets.bottom, 25);
    return (
        <CustomerTab.Navigator
            screenOptions={{
                headerShown: false,
                unmountOnBlur: false,
                tabBarHideOnKeyboard: true,
                tabBarStyle: {
                    height: 85 + bottomPad,
                    paddingBottom: bottomPad,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb',
                    backgroundColor: '#ffffff',
                },
                tabBarActiveTintColor: '#8294FF',
                tabBarInactiveTintColor: '#8f8f8f',
                tabBarLabelStyle: {fontSize: 12, fontFamily: 'SF-Regular', marginTop: 4},
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
                component={CustomerBookingUpcomingScreen}
                options={{
                    title: 'Booking',
                    tabBarIcon: ({color, size}) => (
                        <MaterialCommunityIcons name="map-marker-radius-outline" size={size ?? 22} color={color} />
                    ),
                }}
            />
            <CustomerTab.Screen
                name="WatchlistTab"
                component={CustomerLocketScreen}
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
                <CustomerStack.Screen name="CustomerBookingHistoryScreen" component={CustomerBookingHistoryScreen} />
                <CustomerStack.Screen name="CustomerAddPostScreen" component={CustomerAddPostScreen} />
                <CustomerStack.Screen name="CustomerBookingScreen" component={CustomerBookingScreen} />
                <CustomerStack.Screen name="CustomerPaymentScreen" component={CustomerPaymentScreen} />
                <CustomerStack.Screen name="CustomerServiceScreen" component={CustomerServiceScreen} />
                <CustomerStack.Screen name="CustomerReviewScreen" component={CustomerReviewScreen} />
                <CustomerStack.Screen name="CustomerNotificationsScreen" component={CustomerNotificationsScreen} />
            </CustomerStack.Navigator>
        </View>
    );
}
