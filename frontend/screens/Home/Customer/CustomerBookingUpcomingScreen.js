import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {fetchMyUpcomingBookings, fetchMyPastBookings} from '../../../services/CustomerService';
import {wsManager} from '../../../services/WebSocketService';
import {getSession} from '../../../utils/authStorage';

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
        image: '../../../assets/images/hotels/sun-suites-business.jpg',
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
        image: '../../../assets/images/hotels/sun-suites-business.jpg',
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

function CustomerBookingCard({item, onPress}) {
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('vi-VN');
        } catch {
            return dateStr;
        }
    };

    return (
        <TouchableOpacity style={styles.bookingCardWrap} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.bookingBody}>
                <View style={styles.bookingTopRow}>
                    <Text style={styles.bookingHotelName}>{item.branch_name || 'Hotel'}</Text>
                    <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
                        <Text style={[styles.statusBadgeText, {color: getStatusBadgeStyle(item.status).textColor}]}>
                            {item.status || 'PENDING'}
                        </Text>
                    </View>
                </View>

                <View style={styles.dateRow}>
                    <View style={styles.dateCol}>
                        <Text style={styles.dateLabel}>Check-in:</Text>
                        <Text style={styles.dateValue}>{formatDate(item.check_in)}</Text>
                    </View>
                    <View style={styles.dateCol}>
                        <Text style={styles.dateLabel}>Check-out:</Text>
                        <Text style={styles.dateValue}>{formatDate(item.check_out)}</Text>
                    </View>
                </View>

                <View style={styles.bookingIdRow}>
                    <Text style={styles.bookingIdLabel}>Booking ID: </Text>
                    <Text style={styles.bookingIdValue}>#{item.id?.slice(0, 8).toUpperCase() || 'N/A'}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function getStatusBadgeStyle(status) {
    switch (status) {
        case 'CONFIRMED':
            return {backgroundColor: '#dcfce7', textColor: '#166534'};
        case 'CHECKED_IN':
            return {backgroundColor: '#dbeafe', textColor: '#1d4ed8'};
        case 'CHECKED_OUT':
            return {backgroundColor: '#f1f5f9', textColor: '#475569'};
        case 'CANCELLED':
            return {backgroundColor: '#fee2e2', textColor: '#991b1b'};
        default:
            return {backgroundColor: '#fef3c7', textColor: '#92400e'};
    }
}

export default function CustomerBookingUpcomingScreen({navigation}) {
    const [activeTab, setActiveTab] = useState('Upcoming');
    const [searchQuery, setSearchQuery] = useState('');
    const [upcomingBookings, setUpcomingBookings] = useState([]);
    const [pastBookings, setPastBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [customerId, setCustomerId] = useState(null);
    const bottomNavIconSize = 22;

    useEffect(() => {
        (async () => {
            const session = await getSession();
            if (session?.user?.customer_id) {
                setCustomerId(session.user.customer_id);
            }
        })();
    }, []);

    useEffect(() => {
        if (!customerId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        (async () => {
            const upcoming = await fetchMyUpcomingBookings(customerId);
            if (upcoming.status === 'success') {
                setUpcomingBookings(upcoming.data || []);
            }
            const past = await fetchMyPastBookings(customerId);
            if (past.status === 'success') {
                setPastBookings(past.data || []);
            }
            setIsLoading(false);
        })();
    }, [customerId]);

    useEffect(() => {
        if (!customerId) return;
        const unsubscribe = wsManager.subscribe(`bookings_notifications_${customerId}`, (data) => {
            if (data.type === 'booking') {
                setUpcomingBookings((prev) => {
                    const exists = prev.find((b) => b.id === data.booking_id);
                    if (!exists) {
                        return [{...data, branch_name: data.branch_name}, ...prev];
                    }
                    return prev.map((b) => b.id === data.booking_id ? {...b, ...data} : b);
                });
            }
        });
        return unsubscribe;
    }, [customerId]);

    const displayedBookings = useMemo(() => {
        const list = activeTab === 'Upcoming' ? upcomingBookings : pastBookings;
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter((b) =>
            (b.branch_name || '').toLowerCase().includes(q) ||
            (b.guest_name || '').toLowerCase().includes(q)
        );
    }, [activeTab, upcomingBookings, pastBookings, searchQuery]);

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
                <Image source={require('../../../assets/images/icon.png')} style={styles.aiSearchIcon}/>
                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search by hotel or guest name"
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
                                    setActiveTab('History');
                                } else {
                                    setActiveTab('Upcoming');
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
                {isLoading ? (
                    <ActivityIndicator size="large" color="#8294FF" style={{marginTop: 40}}/>
                ) : displayedBookings.length > 0 ? (
                    displayedBookings.map((item) => (
                        <CustomerBookingCard
                            key={item.id}
                            item={item}
                            onPress={() => navigation.navigate('CustomerBookingScreen', {bookingId: item.id})}
                        />
                    ))
                ) : (
                    <Text style={styles.emptyText}>
                        {activeTab === 'Upcoming'
                            ? 'No upcoming bookings found.'
                            : 'No booking history yet.'}
                    </Text>
                )}
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
        backgroundColor: '#fff',
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
    bookingTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
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