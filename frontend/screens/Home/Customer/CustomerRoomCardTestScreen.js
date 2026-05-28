import {useMemo, useState} from 'react';
import {Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import CustomerBottomTabBar from '../../../components/customer/CustomerBottomTabBar';
import {RoomCard} from '../../../components/customer/CustomerHotelDetailSections';

const TEST_ROOMS = [
    {
        id: 'test-room-standard',
        name: 'Standard Room',
        description: 'Room card sample for testing View Detail and Book now buttons.',
        type: 'Family',
        view: 'Beach',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1200&q=80&fm=jpg',
        price: {amount: 175, currency: 'USD'},
    },
    {
        id: 'test-room-vip',
        name: 'VIP Room',
        description: 'Higher tier room sample for testing button behavior.',
        type: 'Business',
        view: 'City',
        image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?fit=crop&w=1200&q=80&fm=jpg',
        price: {amount: 235, currency: 'USD'},
    },
    {
        id: 'test-room-supervip',
        name: 'Super VIP Room',
        description: 'Premium room sample for testing booking flow buttons.',
        type: 'Suite',
        view: 'Ocean',
        image: 'https://images.unsplash.com/photo-1501117716987-c8e1ecb210d3?fit=crop&w=1200&q=80&fm=jpg',
        price: {amount: 340, currency: 'USD'},
    },
];

export default function CustomerRoomCardTestScreen({navigation}) {
    const [lastAction, setLastAction] = useState('No button pressed yet');

    const testRooms = useMemo(() => TEST_ROOMS, []);

    const handleViewDetail = (room) => {
        setLastAction(`View Detail: ${room.name}`);
        navigation.navigate('CustomerHomeDetailSceen', {
            room,
            hotelName: 'Room Card Test Hotel',
            hotelPrice: room.price?.amount,
            hotelAddress: 'Button test address',
            location: 'Button test address',
            hotelDescription: 'This screen is for testing room card buttons.',
            heroImage: room.image,
            rating: 4.8,
            reviews: 12,
        });
    };

    const handleBookNow = (room) => {
        setLastAction(`Book now: ${room.name}`);
        navigation.navigate('CustomerBookingScreen', {
            roomId: room.id,
            hotelName: 'Room Card Test Hotel',
            hotelAddress: 'Button test address',
            roomName: room.name,
            heroImage: room.image,
            roomPrice: room.price?.amount,
            checkIn: 'Test check-in',
            checkOut: 'Test check-out',
            rating: 4.8,
            reviews: 12,
        });
    };

    return (
        <SafeAreaView style={styles.page}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Room Card Test</Text>
                    <Text style={styles.subtitle}>Use this page to test the View Detail and Book now buttons.</Text>
                </View>

                <View style={styles.actionBox}>
                    <Ionicons name="flash-outline" size={18} color="#4d63e6" />
                    <Text style={styles.actionText}>{lastAction}</Text>
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.smallButton} onPress={() => Alert.alert('Test', 'This is a local test alert.')}>
                        <Text style={styles.smallButtonText}>Test Alert</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallButton, styles.secondaryButton]} onPress={() => navigation.goBack()}>
                        <Text style={[styles.smallButtonText, styles.secondaryButtonText]}>Go Back</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.cardList}>
                    {testRooms.map((room) => (
                        <RoomCard
                            key={room.id}
                            room={room}
                            onViewDetail={() => handleViewDetail(room)}
                            onBookNow={() => handleBookNow(room)}
                        />
                    ))}
                </View>
            </ScrollView>

            <CustomerBottomTabBar navigation={navigation} activeTab="Home"/>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#efefef',
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 112,
    },
    header: {
        marginBottom: 14,
    },
    title: {
        fontFamily: 'SF-Black',
        fontSize: 30,
        color: '#171717',
    },
    subtitle: {
        marginTop: 6,
        fontFamily: 'SF-Regular',
        fontSize: 14,
        lineHeight: 20,
        color: '#707070',
    },
    actionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f6f8ff',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
    },
    actionText: {
        flex: 1,
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#24315f',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    smallButton: {
        flex: 1,
        backgroundColor: '#4d63e6',
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: 'center',
    },
    secondaryButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#d8d8d8',
    },
    smallButtonText: {
        fontFamily: 'SF-Bold',
        fontSize: 14,
        color: '#ffffff',
    },
    secondaryButtonText: {
        color: '#343434',
    },
    cardList: {
        marginTop: 4,
    },
});