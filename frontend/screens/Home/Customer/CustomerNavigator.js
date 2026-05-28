import {StatusBar, View} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {UI} from '../../../styles/uiTokens';
import {HomeScreen} from './CustomerHomeScreen';
import {CustomerHomeDetailSceen} from './CustomerHomeDetailSceen';
import {HomeDetailScreen} from './CustomerRoomDetailScreen';
import CustomerRoomCardTestScreen from './CustomerRoomCardTestScreen';
import {CustomerProfileScreen} from './CustomerProfileScreen';
import CustomerBookingScreen from './CustomerBookingScreen';
import CustomerPaymentScreen from './CustomerPaymentScreen';
import CustomerBookingUpcomingScreen from './CustomerBookingUpcomingScreen';
import CustomerBookingHistoryScreen from './CustomerBookingHistoryScreen';
import CustomerLocketScreen from './CustomerLocketScreen';
import CustomerServiceScreen from './CustomerServiceScreen';
import CustomerAddPostScreen from './CustomerAddPostScreen';
import CustomerReviewScreen from './CustomerReviewScreen';
import CustomerNotificationsScreen from './CustomerNotificationsScreen';
import CustomerEditProfileScreen from './CustomerEditProfileScreen';

const CustomerStack = createNativeStackNavigator();

export default function CustomerNavigator() {
    return (
        <View style={{flex: 1, backgroundColor: UI.screenBg}}>
            <StatusBar animated barStyle="dark-content" backgroundColor={UI.screenBg} />
            <CustomerStack.Navigator screenOptions={{headerShown: false}}>
                <CustomerStack.Screen name="CustomerHomeScreen" component={HomeScreen} />
                <CustomerStack.Screen name="CustomerHomeDetailSceen" component={CustomerHomeDetailSceen} />
                <CustomerStack.Screen name="CustomerRoomCardTestScreen" component={CustomerRoomCardTestScreen} />
                <CustomerStack.Screen name="CustomerRoomDetailScreen" component={HomeDetailScreen} />
                <CustomerStack.Screen name="CustomerProfileScreen" component={CustomerProfileScreen} />
                <CustomerStack.Screen name="CustomerBookingUpcomingScreen" component={CustomerBookingUpcomingScreen} />
                <CustomerStack.Screen name="CustomerBookingHistoryScreen" component={CustomerBookingHistoryScreen} />
                <CustomerStack.Screen name="CustomerLocketScreen" component={CustomerLocketScreen} />
                <CustomerStack.Screen name="CustomerAddPostScreen" component={CustomerAddPostScreen} />
                <CustomerStack.Screen name="CustomerBookingScreen" component={CustomerBookingScreen} />
                <CustomerStack.Screen name="CustomerPaymentScreen" component={CustomerPaymentScreen} />
                <CustomerStack.Screen name="CustomerServiceScreen" component={CustomerServiceScreen} />
                <CustomerStack.Screen name="CustomerReviewScreen" component={CustomerReviewScreen} />
                <CustomerStack.Screen name="CustomerNotificationsScreen" component={CustomerNotificationsScreen} />
                <CustomerStack.Screen name="CustomerEditProfileScreen" component={CustomerEditProfileScreen} />
            </CustomerStack.Navigator>
        </View>
    );
}
