import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import CustomerBottomTabBar from '../../../components/customer/CustomerBottomTabBar';
import {
    listCustomerNotifications,
    markAllCustomerNotificationsRead,
    markCustomerNotificationRead,
} from '../../../services/NotificationService';

const formatRelativeTime = (isoTime) => {
    const timeMs = Date.parse(String(isoTime || ''));
    if (!Number.isFinite(timeMs)) return 'Just now';

    const diffSeconds = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return `${Math.floor(diffHours / 24)}d ago`;
};

export default function CustomerNotificationsScreen({navigation}) {
    const [notifications, setNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadNotifications = useCallback(async () => {
        try {
            const items = await listCustomerNotifications();
            setNotifications(Array.isArray(items) ? items : []);
        } catch (error) {
            setNotifications([]);
            Alert.alert('Notifications', 'Unable to load notifications. Please try again.');
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            let mounted = true;

            const run = async () => {
                setIsLoading(true);
                try {
                    const items = await listCustomerNotifications();
                    if (mounted) setNotifications(Array.isArray(items) ? items : []);
                } catch (error) {
                    if (mounted) {
                        setNotifications([]);
                        Alert.alert('Notifications', 'Unable to sync notifications right now.');
                    }
                } finally {
                    if (mounted) setIsLoading(false);
                }
            };

            run();
            return () => {
                mounted = false;
            };
        }, [])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    };

    const handleMarkAllRead = async () => {
        const items = await markAllCustomerNotificationsRead();
        setNotifications(Array.isArray(items) ? items : []);
    };

    const handleOpenNotification = async (item) => {
        if (!item?.read) {
            await markCustomerNotificationRead(item.id);
            setNotifications((current) =>
                current.map((row) => (row.id === item.id ? { ...row, read: true } : row))
            );
        }

        const bookingId = item?.meta?.bookingId || item?.meta?.booking_id;
        if (bookingId) {
            navigation.navigate('BookingDetailScreen', { bookingId });
        }
    };

    const unreadCount = notifications.reduce((count, item) => count + (item?.read ? 0 : 1), 0);

    return (
        <SafeAreaView style={styles.page}>
            <View style={styles.headerRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color="#1f2430" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 ? (
                    <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
                        <Text style={styles.markAllText}>Mark all read</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.backBtnGhost} />
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={['#5b79df']}
                        tintColor="#5b79df"
                    />
                }
            >
                {isLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#5b79df" />
                    </View>
                ) : notifications.length ? notifications.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.85}
                        onPress={() => handleOpenNotification(item)}
                        style={[styles.card, !item.read && styles.cardUnread]}
                    >
                        <View style={styles.cardTop}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardTime}>{formatRelativeTime(item.createdAt)}</Text>
                        </View>
                        <Text style={styles.cardMessage}>{item.message}</Text>
                    </TouchableOpacity>
                )) : (
                    <Text style={styles.emptyText}>No notifications yet.</Text>
                )}
            </ScrollView>

            <CustomerBottomTabBar navigation={navigation} activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f8',
    },
    backBtnGhost: {
        width: 72,
        height: 36,
    },
    markAllBtn: {
        minWidth: 72,
        height: 36,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    markAllText: {
        fontFamily: 'SF-SemiBold',
        fontSize: 12,
        color: '#5b79df',
    },
    headerTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 24,
        color: '#1a1b22',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 108,
        gap: 10,
    },
    loadingWrap: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e8ebf3',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    cardUnread: {
        borderColor: '#c7d2fe',
        backgroundColor: '#f8faff',
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    cardTitle: {
        flex: 1,
        fontFamily: 'SF-Bold',
        fontSize: 14,
        color: '#1f2430',
        marginRight: 8,
    },
    cardTime: {
        fontFamily: 'SF-Regular',
        fontSize: 11,
        color: '#7a8193',
    },
    cardMessage: {
        fontFamily: 'SF-Regular',
        fontSize: 13,
        lineHeight: 19,
        color: '#343b49',
    },
    emptyText: {
        marginTop: 24,
        textAlign: 'center',
        fontFamily: 'SF-Regular',
        fontSize: 13,
        color: '#7f8597',
    },
});
