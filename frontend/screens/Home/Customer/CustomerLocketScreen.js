import React, {useMemo, useState} from 'react';
import {Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {STAFF_MEDIA} from '../../../constants/staffMedia';

const LOCKET_ITEMS = [
    {
        id: 'locket-1',
        hotelName: 'Swiss Hotel',
        roomNumber: 'Room 121',
        description: 'The view is very beautiful',
        userAvatar: STAFF_MEDIA.USER_PLACEHOLDER,
        userName: 'Ngọc Lam',
        image: require('../../../assets/images/hotels/sun-suites-business.jpg'),
    },
    {
        id: 'locket-2',
        hotelName: 'Marina Bay Resort',
        roomNumber: 'Room 305',
        description: 'Stunning ocean view with private balcony',
        userAvatar: STAFF_MEDIA.USER_PLACEHOLDER,
        userName: 'Linh Đặng',
        image: require('../../../assets/images/hotels/sun-suites-business.jpg'),
    },
    {
        id: 'locket-3',
        hotelName: 'Sunset Paradise',
        roomNumber: 'Room 502',
        description: 'Luxurious suite with modern amenities',
        userAvatar: STAFF_MEDIA.USER_PLACEHOLDER,
        userName: 'Hoa Trần',
        image: require('../../../assets/images/hotels/sun-suites-business.jpg'),
    },
];

function LocketCard({item}) {
    return (
        <View style={styles.cardWrap}>
            <View style={styles.imageSection}>
                <Image source={item.image} style={styles.cardImage} resizeMode="cover"/>
                <View style={styles.hotelInfoOverlay}>
                    <Image source={{uri: item.userAvatar}} style={styles.hotelIcon}/>
                    <View>
                        <Text style={styles.hotelNameOverlay}>{item.hotelName}</Text>
                        <Text style={styles.roomNumberOverlay}>{item.roomNumber}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.descriptionWrap}>
                <Text style={styles.descriptionText}>{item.description}</Text>
            </View>

            <View style={styles.userInfoWrap}>
                <Image source={{uri: item.userAvatar}} style={styles.userAvatar}/>
                <Text style={styles.userName}>{item.userName}</Text>
            </View>
        </View>
    );
}

export default function CustomerLocketScreen({navigation}) {
    const lockets = useMemo(() => LOCKET_ITEMS, []);
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

            <View style={styles.darkSection}>
                <View style={styles.watchListHeader}>
                    <Text style={styles.watchListTitle}>Watch List</Text>
                    <Text style={styles.watchListDesc}>Here have image of customer about room and hotel</Text>
                </View>

                <View style={styles.filterSearchWrap}>
                    <Ionicons name="search" size={18} color="#1f1f1f"/>
                    <TextInput
                        placeholder="You can find by hotel or provice"
                        placeholderTextColor="#999"
                        style={styles.filterSearchInput}
                    />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {lockets.map((item) => <LocketCard key={item.id} item={item}/>)}
                </ScrollView>
            </View>

            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.bottomItem} onPress={() => navigation.navigate('CustomerHomeScreen')}>
                    <Ionicons name="home-outline" size={bottomNavIconSize} color="#8f8f8f"/>
                    <Text style={styles.bottomLabel}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomItem} onPress={() => navigation.navigate('CustomerBookingUpcomingScreen')}>
                    <MaterialCommunityIcons name="map-marker-radius" size={bottomNavIconSize} color="#8f8f8f"/>
                    <Text style={styles.bottomLabel}>Booking</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomItem}>
                    <Ionicons name="heart" size={bottomNavIconSize} color="#8294FF"/>
                    <Text style={[styles.bottomLabel, styles.bottomLabelActive]}>Watchlist</Text>
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
        backgroundColor: '#fff',
    },
    headerRow: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
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
        borderColor: '#fff',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    searchWrap: {
        marginTop: 16,
        marginHorizontal: 16,
        marginBottom: 0,
        borderWidth: 2,
        borderColor: '#1a1a1a',
        borderRadius: 20,
        height: 44,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    aiSearchIcon: {
        width: 26,
        height: 26,
        resizeMode: 'contain',
        tintColor: '#1a1a1a',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: 'SF-Regular',
        fontSize: 20,
        color: '#1f1f1f',
        paddingVertical: 0,
    },
    watchListHeader: {
        marginTop: 16,
        marginHorizontal: 16,
        marginBottom: 14,
    },
    watchListTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 28,
        color: '#d4af37',
        marginBottom: 4,
    },
    watchListDesc: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        color: '#999999',
    },
    filterSearchWrap: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1.2,
        borderColor: '#fff',
        borderRadius: 20,
        height: 40,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    filterSearchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: 'SF-Regular',
        fontSize: 18,
        color: '#1f1f1f',
        paddingVertical: 0,
    },
    darkSection: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        marginTop: 12,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 15,
    },
    cardWrap: {
        marginBottom: 24,
        borderRadius: 28,
        overflow: 'hidden',
        backgroundColor: '#2a2a2a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    imageSection: {
        position: 'relative',
        width: '100%',
        height: 280,
        backgroundColor: '#f0f0f0',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    hotelInfoOverlay: {
        position: 'absolute',
        top: 14,
        left: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(45, 120, 200, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 16,
    },
    hotelIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
    },
    hotelNameOverlay: {
        fontFamily: 'SF-Bold',
        fontSize: 18,
        color: '#fff',
        fontWeight: '600',
    },
    roomNumberOverlay: {
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#e0e0e0',
        marginTop: 2,
    },
    descriptionWrap: {
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#3a3a3a',
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    descriptionText: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        color: '#b0b0b0',
        fontStyle: 'italic',
        fontWeight: '400',
    },
    userInfoWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
        backgroundColor: '#2a2a2a',
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#f0f0f0',
    },
    userName: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
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
        borderTopColor: '#e0e0e0',
        backgroundColor: '#fff',
        paddingVertical: 12,
    },
    bottomItem: {
        alignItems: 'center',
        gap: 6,
    },
    bottomLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        color: '#666',
    },
    bottomLabelActive: {
        color: '#8294FF',
    },
});
