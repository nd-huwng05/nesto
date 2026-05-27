import {useCallback, useState, useEffect, useRef} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {TabScreenLayout} from '../../components/common/TabScreenLayout';
import {StaffBranchHeader} from '../../components/staff/StaffBranchHeader';
import {UI} from '../../styles/uiTokens';
import {bookingService} from '../../services/HotelService';
import {useStaffSession} from '../../hooks/staff/useStaffSession';

const STATUS_CONFIG = {
    PENDING: {bg: '#fef9c3', text: '#854d0e', label: 'Pending'},
    CONFIRMED: {bg: '#dbeafe', text: '#1e40af', label: 'Confirmed'},
    CHECKED_IN: {bg: '#dcfce7', text: '#166534', label: 'Checked In'},
    CHECKED_OUT: {bg: '#f3f4f6', text: '#6b7280', label: 'Checked Out'},
    CANCELLED: {bg: '#fee2e2', text: '#991b1b', label: 'Cancelled'},
};

export default function StaffBookingsScreen({navigation}) {
    const {user, branchId} = useStaffSession();
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('upcoming');
    const wsRef = useRef(null);

    const loadBookings = useCallback(async () => {
        if (!branchId) {
            setBookings([]);
            setIsLoading(false);
            return;
        }
        try {
            let response;
            if (activeTab === 'upcoming') {
                response = await bookingService.upcoming();
            } else if (activeTab === 'today') {
                response = await bookingService.today();
            } else {
                response = await bookingService.list({branch_id: branchId});
            }
            setBookings(Array.isArray(response) ? response : response.results || []);
        } catch (error) {
            console.error('Load bookings error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [branchId, activeTab]);

    const connectWebSocket = useCallback(() => {
        if (!branchId) return;
        const WS_URL = `${process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/bookings/${branchId}/`;
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('Booking WebSocket connected');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'booking') {
                loadBookings();
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('Booking WebSocket disconnected');
        };

        wsRef.current = ws;
    }, [branchId, loadBookings]);

    useEffect(() => {
        loadBookings();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [loadBookings]);

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            loadBookings();
            connectWebSocket();
        }, [loadBookings, connectWebSocket])
    );

    const refresh = async () => {
        setRefreshing(true);
        await loadBookings();
        setRefreshing(false);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleBookingPress = (booking) => {
        navigation.navigate('BookingDetailScreen', {
            bookingId: booking.id,
        });
    };

    const handleCheckIn = async (booking) => {
        try {
            await bookingService.checkIn(booking.id);
            loadBookings();
        } catch (error) {
            console.error('Check-in error:', error);
        }
    };

    const renderBooking = ({item}) => {
        const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;

        return (
            <TouchableOpacity
                style={styles.bookingCard}
                onPress={() => handleBookingPress(item)}
            >
                <View style={styles.bookingHeader}>
                    <View style={styles.bookingInfo}>
                        <Text style={styles.guestName}>{item.guest_name}</Text>
                        <Text style={styles.guestContact}>
                            {item.guest_phone} • {item.guest_email}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, {backgroundColor: statusConfig.bg}]}>
                        <Text style={[styles.statusText, {color: statusConfig.text}]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.bookingDetails}>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Check-in</Text>
                        <Text style={styles.detailValue}>
                            {formatDate(item.check_in)} {formatTime(item.check_in)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Check-out</Text>
                        <Text style={styles.detailValue}>
                            {formatDate(item.check_out)} {formatTime(item.check_out)}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Guests</Text>
                        <Text style={styles.detailValue}>
                            {item.adult_count || 1} adult{(item.adult_count || 1) > 1 ? 's' : ''}
                            {item.children_count ? `, ${item.children_count} child${item.children_count > 1 ? 'ren' : ''}` : ''}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Total</Text>
                        <Text style={styles.detailValuePrice}>
                            {Number(item.total_price || 0).toLocaleString('vi-VN')} VND
                        </Text>
                    </View>
                </View>

                {item.status === 'CONFIRMED' && (
                    <TouchableOpacity
                        style={styles.checkInBtn}
                        onPress={() => handleCheckIn(item)}
                    >
                        <Text style={styles.checkInBtnText}>Check In</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <TabScreenLayout backgroundColor={UI.screenBg}>
            <View style={styles.inner}>
                <View style={styles.headerPad}>
                    <StaffBranchHeader user={user} />
                    <Text style={styles.title}>Bookings</Text>
                    <Text style={styles.subtitle}>
                        Manage reservations for today
                    </Text>
                </View>

                <View style={styles.tabRow}>
                    {['upcoming', 'today', 'all'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab === 'upcoming' ? 'Upcoming' : tab === 'today' ? 'Today' : 'All'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#8294FF" />
                    </View>
                ) : (
                    <FlatList
                        data={bookings}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8294FF" />
                        }
                        renderItem={renderBooking}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No bookings found</Text>
                            </View>
                        }
                    />
                )}

                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('StaffCreateBookingScreen')}
                >
                    <Text style={styles.fabText}>+</Text>
                </TouchableOpacity>
            </View>
        </TabScreenLayout>
    );
}

const styles = StyleSheet.create({
    inner: {
        flex: 1,
    },
    headerPad: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0f172a',
        marginTop: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
        marginBottom: 16,
    },
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
    },
    tabActive: {
        backgroundColor: '#8294FF',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
    },
    tabTextActive: {
        color: '#ffffff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    bookingCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    bookingInfo: {
        flex: 1,
    },
    guestName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    guestContact: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    bookingDetails: {
        gap: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailLabel: {
        fontSize: 13,
        color: '#94a3b8',
    },
    detailValue: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '500',
    },
    detailValuePrice: {
        fontSize: 14,
        color: '#059669',
        fontWeight: '700',
    },
    checkInBtn: {
        backgroundColor: '#dcfce7',
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: 'center',
        marginTop: 12,
    },
    checkInBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#166534',
    },
    emptyState: {
        padding: 48,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: '#94a3b8',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 30,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#8294FF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#8294FF',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    fabText: {
        fontSize: 28,
        fontWeight: '600',
        color: '#ffffff',
    },
});
