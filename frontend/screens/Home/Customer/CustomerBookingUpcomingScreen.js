import React, {useMemo, useState} from 'react';
import {Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {STAFF_MEDIA} from '../../../constants/staffMedia';

const UPCOMING_BOOKINGS = [
    {
        id: 'upcoming-1',
        hotelName: 'Sun Suites Hotel',
        roomName: 'Room 101',
        checkIn: '15/04/2026',
        checkOut: '17/04/2026',
        bookingId: '#AQRZO01',
        actionLabel: 'Online Check-in',
        actionColor: '#8294FF',
        image: require('../../../assets/images/hotels/sun-suites-business.jpg'),
    },
    {
        id: 'upcoming-2',
        hotelName: 'Sun Suites Hotel',
        roomName: 'Room 101',
        checkIn: '15/04/2026',
        checkOut: '17/04/2026',
        bookingId: '#AQRZO01',
        actionLabel: 'Payment',
        actionColor: '#2aa8b9',
        image: require('../../../assets/images/hotels/sun-suites-business.jpg'),
    },
];

function BookingCard({item}) {
    const showQrIcon = item.actionLabel !== 'Payment';

    return (
        <View style={styles.bookingCardWrap}>
            <Image source={item.image} style={styles.bookingImage} resizeMode="cover"/>
            <View style={styles.bookingBody}>
                <Text style={styles.bookingHotelName}>{item.hotelName}</Text>
                <Text style={styles.bookingRoomTitle}>{item.roomName}</Text>

                <View style={styles.dateRow}>
                    <View style={styles.dateCol}>
                        <Text style={styles.dateLabel}>Check-in:</Text>
                        <Text style={styles.dateValue}>{item.checkIn}</Text>
                    </View>
                    <View style={styles.dateCol}>
                        <Text style={styles.dateLabel}>Check-out:</Text>
                        <Text style={styles.dateValue}>{item.checkOut}</Text>
                    </View>
                </View>

                <View style={styles.bookingIdRow}>
                    <Text style={styles.bookingIdLabel}>Booking ID: </Text>
                    <Text style={styles.bookingIdValue}>{item.bookingId}</Text>
                </View>

                <View style={styles.actionSection}>
                    <TouchableOpacity style={[styles.actionBtn, {backgroundColor: item.actionColor}]}>
                        <View style={styles.actionBtnMainRow}>
                            {showQrIcon ? <MaterialCommunityIcons name="qrcode-scan" size={22} color="#f3f6ff"/> : null}
                            <Text style={[styles.actionBtnText, !showQrIcon ? styles.actionBtnTextNoIcon : null]}>{item.actionLabel}</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.noticeBar}>
                        <Text style={styles.noticeText}>Smart Key will be available at 12:00 PM</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

export default function CustomerBookingUpcomingScreen({navigation}) {
    const bookings = useMemo(() => UPCOMING_BOOKINGS, []);
    const [activeTab, setActiveTab] = useState('Upcoming');
    const [searchQuery, setSearchQuery] = useState('');
    const bottomNavIconSize = 22;

    return (
        <SafeAreaView style={styles.page}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.currentLabel}>Current Location</Text>
                    <Text style={styles.currentValue}>Labuan Bajo, INA</Text>
                </View>
                <View style={styles.headerActions}>
                    <View style={styles.bellWrap}>
                        <Ionicons name="notifications" size={19} color="#1f1f1f"/>
                        <View style={styles.alertDot}/>
                    </View>
                    <Image source={{uri: STAFF_MEDIA.USER_PLACEHOLDER}} style={styles.avatar}/>
                </View>
            </View>

            <View style={styles.searchWrap}>
                <Image source={require('../../../assets/images/hotels/icon.png')} style={styles.aiSearchIcon}/>
                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="AI will find room you want"
                    placeholderTextColor="#999"
                    style={styles.searchInput}
                />
            </View>

            <View style={styles.tabRow}>
                {['Upcoming', 'History'].map((tab) => {
                    const active = tab === activeTab;
                    return (
                        <TouchableOpacity 
                            key={tab} 
                            style={styles.tabBtn} 
                            onPress={() => {
                                if (tab === 'History') {
                                    navigation.navigate('CustomerBookingHistoryScreen');
                                } else {
                                    setActiveTab(tab);
                                }
                            }}
                        >
                            <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{tab}</Text>
                            {active ? <View style={styles.tabUnderline}/> : <View style={styles.tabUnderlineGhost}/>}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {activeTab === 'Upcoming'
                    ? bookings.map((item) => <BookingCard key={item.id} item={item}/>)
                    : <Text style={styles.emptyText}>No booking history yet.</Text>}
            </ScrollView>

            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.bottomItem} onPress={() => navigation.navigate('CustomerHomeScreen')}>
                    <Ionicons name="home-outline" size={bottomNavIconSize} color="#8f8f8f"/>
                    <Text style={styles.bottomLabel}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomItem}>
                    <MaterialCommunityIcons name="map-marker-radius" size={bottomNavIconSize} color="#8294FF"/>
                    <Text style={[styles.bottomLabel, styles.bottomLabelActive]}>Booking</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomItem} onPress={() => navigation.navigate('CustomerLocketScreen')}>
                    <Ionicons name="heart-outline" size={bottomNavIconSize} color="#8f8f8f"/>
                    <Text style={styles.bottomLabel}>Watchlist</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomItem} onPress={() => navigation.navigate('CustomerProfileScreen')}>
                    <Feather name="user" size={bottomNavIconSize} color="#8f8f8f"/>
                    <Text style={styles.bottomLabel}>Profile</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#efefef',
    },
    headerRow: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    currentLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#383838',
    },
    currentValue: {
        fontFamily: 'SF-Bold',
        fontSize: 32,
        lineHeight: 36,
        color: '#1b1b1b',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bellWrap: {
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 15,
    },
    alertDot: {
        width: 7,
        height: 7,
        borderRadius: 999,
        backgroundColor: '#ff3b30',
        position: 'absolute',
        top: 4,
        right: 2,
        borderWidth: 1,
        borderColor: '#f2f2f2',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    searchWrap: {
        marginTop: 16,
        marginHorizontal: 16,
        borderWidth: 1.2,
        borderColor: '#3f3f3f',
        borderRadius: 16,
        height: 40,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#efefef',
    },
    aiSearchIcon: {
        width: 22,
        height: 22,
        resizeMode: 'contain',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: 'SF-Regular',
        fontSize: 15,
        color: '#1f1f1f',
        paddingVertical: 0,
    },
    tabRow: {
        marginTop: 20,
        marginHorizontal: 16,
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#d5d5d5',
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
    },
    tabText: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        color: '#9a9a9a',
        marginBottom: 8,
    },
    tabTextActive: {
        color: '#8294FF',
    },
    tabUnderline: {
        height: 2,
        width: '100%',
        backgroundColor: '#8294FF',
    },
    tabUnderlineGhost: {
        height: 2,
        width: '100%',
        backgroundColor: 'transparent',
    },
    scrollContent: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 108,
    },
    bookingCardWrap: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        marginBottom: 28,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#d9d9d9',
    },
    bookingImage: {
        width: '100%',
        height: 72,
    },
    bookingBody: {
        backgroundColor: '#fff',
        marginTop: -14,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 0,
    },
    bookingHotelName: {
        fontFamily: 'SF-Bold',
        fontSize: 24,
        lineHeight: 30,
        color: '#121212',
        marginBottom: 4,
    },
    bookingRoomTitle: {
        fontFamily: 'SF-Semibold',
        fontSize: 18,
        lineHeight: 24,
        color: '#4f4f4f',
        marginBottom: 10,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateCol: {
        width: '48%',
    },
    dateLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        color: '#4b4b4b',
    },
    dateValue: {
        marginTop: 2,
        fontFamily: 'SF-Bold',
        fontSize: 17,
        color: '#202020',
    },
    bookingIdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 12,
    },
    bookingIdLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        color: '#333',
    },
    bookingIdValue: {
        fontFamily: 'SF-Bold',
        fontSize: 16,
        color: '#202020',
    },
    actionSection: {
        marginTop: 0,
    },
    actionBtn: {
        borderRadius: 28,
        minHeight: 56,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        marginLeft: 8,
        fontFamily: 'SF-Semibold',
        fontSize: 17,
        color: '#fff',
    },
    actionBtnTextNoIcon: {
        marginLeft: 0,
    },
    noticeBar: {
        marginTop: 20,
        marginHorizontal: -18,
        marginBottom: 0,
        borderTopWidth: 1,
        borderTopColor: '#c4ccff',
        backgroundColor: '#e7ebff',
        paddingVertical: 2,
        paddingHorizontal: 12,
    },
    noticeText: {
        textAlign: 'center',
        fontFamily: 'SF-Regular',
        fontSize: 10,
        lineHeight: 14,
        color: '#1b1b1b',
    },
    emptyText: {
        fontFamily: 'SF-Regular',
        color: '#8f8f8f',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 30,
    },
    bottomNav: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderColor: '#d8d8d8',
        backgroundColor: '#f2f2f2',
        paddingTop: 8,
        paddingBottom: 9,
    },
    bottomItem: {
        alignItems: 'center',
        minWidth: 64,
    },
    bottomLabel: {
        marginTop: 3,
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#8f8f8f',
    },
    bottomLabelActive: {
        color: '#8294FF',
    },
});