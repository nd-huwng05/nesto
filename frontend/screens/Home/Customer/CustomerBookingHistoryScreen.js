import React, {useMemo, useState} from 'react';
import {Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {STAFF_MEDIA} from '../../../constants/staffMedia';

const HISTORY_BOOKINGS = [
    {
        id: 'history-1',
        roomName: 'Room 301',
        roomCode: 'Ocean View Suite',
        bookingId: '#AQRZO01',
        stayDate: 'Mar 10-12, 2026',
        status: 'Complete',
        image: require('../../../assets/images/hotels/sun-suites-business.jpg'),
    },
    {
        id: 'history-2',
        roomName: 'Room 302',
        roomCode: 'Deluxe Room',
        bookingId: '#AQRZO02',
        stayDate: 'Mar 10-12, 2026',
        status: 'Complete',
        image: require('../../../assets/images/hotels/sun-suites-business.jpg'),
    },
    {
        id: 'history-3',
        roomName: 'Room 303',
        roomCode: 'Premium Suite',
        bookingId: '#AQRZO03',
        stayDate: 'Mar 10-12, 2026',
        status: 'Complete',
        image: require('../../../assets/images/hotels/sun-suites-business.jpg'),
    },
];

function HistoryBookingCard({item}) {
    return (
        <View style={styles.bookingCardWrap}>
            <View style={styles.imageSection}>
                <Image source={item.image} style={styles.bookingImage} resizeMode="cover"/>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.infoSection}>
                <Text style={styles.roomCode}>{item.roomCode}</Text>
                <Text style={styles.roomName}>{item.roomName}</Text>
                <Text style={styles.bookingIdText}>Booking ID: {item.bookingId}</Text>
                <Text style={styles.stayDateText}>Stay: {item.stayDate}</Text>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtnSecondary}>
                    <Text style={styles.actionBtnSecondaryText}>Review</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtnPrimary}>
                    <Text style={styles.actionBtnPrimaryText}>Book again</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function CustomerBookingHistoryScreen({navigation}) {
    const bookings = useMemo(() => HISTORY_BOOKINGS, []);
    const [activeTab, setActiveTab] = useState('History');
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
                <Image source={'../../../assets/images/hotels/icon.png'} style={styles.aiSearchIcon}/>
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
                                if (tab === 'Upcoming') {
                                    navigation.navigate('CustomerBookingUpcomingScreen');
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
                {activeTab === 'History'
                    ? bookings.map((item) => <HistoryBookingCard key={item.id} item={item}/>)
                    : <Text style={styles.emptyText}>No upcoming bookings.</Text>}
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
        fontSize: 17,
        color: '#383838',
    },
    currentValue: {
        fontFamily: 'SF-Bold',
        fontSize: 37,
        lineHeight: 41,
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
        marginBottom: 16,
        borderWidth: 1.2,
        borderColor: '#3f3f3f',
        borderRadius: 16,
        height: 40,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#efefef',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: -3},
        elevation: 5,
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
        fontSize: 20,
        color: '#1f1f1f',
        paddingVertical: 0,
    },
    tabRow: {
        marginTop: 0,
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
        fontSize: 20,
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
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 108,
    },
    bookingCardWrap: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#fff',
        marginBottom: 22,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    imageSection: {
        position: 'relative',
        width: '100%',
        height: 150,
        backgroundColor: '#f0f0f0',
    },
    bookingImage: {
        width: '100%',
        height: '100%',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    statusBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#c6e9d8',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        zIndex: 10,
    },
    statusText: {
        fontFamily: 'SF-Semibold',
        fontSize: 17,
        color: '#1e7e34',
        fontWeight: '600',
    },
    infoSection: {
        paddingHorizontal: 16,
        paddingVertical: 22,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    roomCode: {
        fontFamily: 'SF-Regular',
        fontSize: 17,
        color: '#999999',
        marginBottom: 12,
        textTransform: 'capitalize',
    },
    roomName: {
        fontFamily: 'SF-Bold',
        fontSize: 23,
        lineHeight: 27,
        color: '#121212',
        marginBottom: 16,
    },
    bookingIdText: {
        fontFamily: 'SF-Bold',
        fontSize: 18,
        color: '#666666',
        marginBottom: 10,
        fontWeight: '700',
    },
    stayDateText: {
        fontFamily: 'SF-Regular',
        fontSize: 18,
        color: '#666666',
    },
    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 16,
    },
    actionBtnSecondary: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#333',
        borderRadius: 24,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnSecondaryText: {
        fontFamily: 'SF-Semibold',
        fontSize: 20,
        color: '#333',
    },
    actionBtnPrimary: {
        flex: 1,
        backgroundColor: '#8294FF',
        borderRadius: 24,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnPrimaryText: {
        fontFamily: 'SF-Semibold',
        fontSize: 20,
        color: '#fff',
    },
    emptyText: {
        fontFamily: 'SF-Regular',
        color: '#8f8f8f',
        fontSize: 20,
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
