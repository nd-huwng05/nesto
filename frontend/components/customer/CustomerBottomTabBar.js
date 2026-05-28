import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';

const ICON_SIZE = 22;

export default function CustomerBottomTabBar({navigation, activeTab = 'Home'}) {
    const isActive = (tab) => activeTab === tab;

    return (
        <View style={styles.bottomNav}>
            <TouchableOpacity
                style={styles.bottomItem}
                onPress={() => navigation.navigate('MainTabs', {screen: 'HomeTab'})}
            >
                <Ionicons name="home" size={ICON_SIZE} color={isActive('Home') ? '#8294FF' : '#8f8f8f'}/>
                <Text style={[styles.bottomLabel, isActive('Home') ? styles.bottomLabelActive : null]}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.bottomItem}
                onPress={() => navigation.navigate('MainTabs', {screen: 'BookingTab'})}
            >
                <MaterialCommunityIcons
                    name="map-marker-radius-outline"
                    size={ICON_SIZE}
                    color={isActive('Booking') ? '#8294FF' : '#8f8f8f'}
                />
                <Text style={[styles.bottomLabel, isActive('Booking') ? styles.bottomLabelActive : null]}>Booking</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.bottomItem}
                onPress={() => navigation.navigate('MainTabs', {screen: 'WatchlistTab'})}
            >
                <Ionicons name="heart-outline" size={ICON_SIZE} color={isActive('Watchlist') ? '#8294FF' : '#8f8f8f'}/>
                <Text style={[styles.bottomLabel, isActive('Watchlist') ? styles.bottomLabelActive : null]}>Watchlist</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.bottomItem}
                onPress={() => navigation.navigate('MainTabs', {screen: 'ProfileTab'})}
            >
                <Feather name="user" size={ICON_SIZE} color={isActive('Profile') ? '#8294FF' : '#8f8f8f'}/>
                <Text style={[styles.bottomLabel, isActive('Profile') ? styles.bottomLabelActive : null]}>Profile</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    bottomNav: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 76,
        borderTopWidth: 1,
        borderTopColor: '#d6d6d6',
        backgroundColor: '#f6f6f6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: 6,
    },
    bottomItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    bottomLabel: {
        marginTop: 4,
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#8f8f8f',
    },
    bottomLabelActive: {
        color: '#8294FF',
    },
});
