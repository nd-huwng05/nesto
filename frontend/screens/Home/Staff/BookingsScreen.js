import {useCallback, useMemo, useState, useEffect} from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Calendar, ChevronLeft, ChevronRight, QrCode, Search} from 'lucide-react-native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import EmptyState from '../../../components/common/EmptyState';
import {StaffBranchHeader} from '../../../components/staff/StaffBranchHeader';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {useStaffBranch} from '../../../hooks/staff/useStaffBranch';
import {fetchBookingsForDay} from '../../../services/ReceptionService';
import {buildDateStripe, toDateKey} from '../../../utils/staffBookingOps';
import {connectBookingUpdates} from '../../../services/WebSocketService';
import {UI} from '../../../styles/uiTokens';
import AsyncStorage from '@react-native-async-storage/async-storage';

function formatVnd(amount) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return '';
    return `${value.toLocaleString('en-US')} VND`;
}

function getBookingStatusBadge(status, statusLabel) {
    const key = String(status || '').trim().toUpperCase();
    const label = String(statusLabel || '').trim() || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (key === 'CHECKED_IN') {
        return {label, badgeStyle: styles.badgeBlue, textStyle: styles.badgeTextBlue};
    }
    if (key === 'CHECKED_OUT') {
        return {label, badgeStyle: styles.badgeGreen, textStyle: styles.badgeTextGreen};
    }
    if (key === 'CONFIRMED') {
        return {label, badgeStyle: styles.badgeGreen, textStyle: styles.badgeTextGreen};
    }
    if (key === 'CANCELLED' || key === 'CANCELLED_NO_SHOW') {
        return {label, badgeStyle: styles.badgeRed, textStyle: styles.badgeTextRed};
    }
    return {label, badgeStyle: styles.badgeYellow, textStyle: styles.badgeTextYellow};
}

function matchesSearch(booking, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    const name = String(booking.guest_name || booking.guestName || '').toLowerCase();
    const phone = String(booking.phone || '').replace(/\s/g, '');
    const phoneQuery = query.replace(/\s/g, '');
    const code = String(booking.booking_code || booking.bookingCode || '').toLowerCase();
    const roomType = String(booking.room_type || booking.roomType || '').toLowerCase();
    return name.includes(q) || phone.includes(phoneQuery) || code.includes(q) || roomType.includes(q);
}

function BookingListCard({item}) {
    const roomType = item.room_type || item.roomType || '—';
    const roomNumber = item.room_number || item.roomNumber || '';
    const isUnassigned = item.is_unassigned ?? item.isUnassigned ?? !roomNumber;
    const roomCharge = formatVnd(item.room_total ?? item.roomCharge);
    const duration = item.duration || '';
    const checkIn = item.check_in_time || item.checkInTime || '';
    const statusBadge = getBookingStatusBadge(item.status, item.status_label || item.statusLabel);
    const scheduleHint = [checkIn ? `In ${checkIn}` : '', duration].filter(Boolean).join(' · ');

    return (
        <View style={styles.bookingCard}>
            <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                    <Text style={styles.guestName} numberOfLines={1}>
                        {item.guest_name || item.guestName || 'Guest'}
                    </Text>
                    <Text style={styles.roomType}>{roomType}</Text>
                    <Text className="font-sf text-sm text-indigo-600 mt-1">
                        {item.booking_code || item.bookingCode || '—'}
                    </Text>
                    <Text style={styles.metaLine}>{item.phone || '—'}</Text>
                    {scheduleHint ? <Text style={styles.metaLine}>{scheduleHint}</Text> : null}
                    {item.walk_in || item.walkIn ? (
                        <Text style={styles.walkInHint}>Walk-in guest</Text>
                    ) : null}
                </View>
                <View style={[styles.statusBadge, statusBadge.badgeStyle]}>
                    <Text style={[styles.statusBadgeText, statusBadge.textStyle]}>
                        {statusBadge.label}
                    </Text>
                </View>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.priceText}>{roomCharge || '—'}</Text>
                <Text style={[styles.footerHint, isUnassigned && styles.footerHintAction]}>
                    {isUnassigned ? 'Tap to assign room' : `Room ${roomNumber}`}
                </Text>
            </View>
        </View>
    );
}

function shiftDateKey(dateKey, days) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const next = new Date(y, m - 1, d);
    next.setDate(next.getDate() + days);
    return toDateKey(next);
}

export default function BookingsScreen({navigation}) {
    const {user, branchId} = useStaffSession();
    const {branch} = useStaffBranch(branchId);
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

    const dateStripe = useMemo(() => buildDateStripe(new Date(selectedDateKey), 3), [selectedDateKey]);

    const loadBookings = useCallback(async () => {
        if (!branchId) {
            setBookings([]);
            setIsLoading(false);
            return;
        }
        const result = await fetchBookingsForDay(branchId, selectedDateKey);
        if (result.status === 'success') {
            setBookings(result.data || []);
            setErrorMessage('');
        } else {
            setBookings([]);
            const message = result.message || 'Unable to load bookings.';
            setErrorMessage(message);
            Alert.alert('Bookings unavailable', message);
        }
        setIsLoading(false);
    }, [branchId, selectedDateKey]);

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            loadBookings();
        }, [loadBookings])
    );

    useEffect(() => {
        let unsubscribe = () => {};
        if (!branchId) return;
        (async () => {
            try {
                const token = await AsyncStorage.getItem('access_token');
                if (!token) return;
                unsubscribe = await connectBookingUpdates(branchId, {
                    token,
                    onMessage: (data) => {
                        if (
                            data.type === 'booking' ||
                            data.type === 'booking_update' ||
                            data.type === 'update_booking'
                        ) {
                            loadBookings();
                        }
                    },
                });
            } catch (error) {
                console.error('Booking updates unavailable:', error?.message || error);
            }
        })();
        return () => unsubscribe();
    }, [branchId, loadBookings]);

    const filteredBookings = useMemo(
        () => bookings.filter((item) => matchesSearch(item, searchQuery.trim())),
        [bookings, searchQuery]
    );

    const refresh = async () => {
        setRefreshing(true);
        await loadBookings();
        setRefreshing(false);
    };

    const selectedLabel = useMemo(() => {
        const [y, m, d] = selectedDateKey.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    }, [selectedDateKey]);

    const isToday = selectedDateKey === toDateKey(new Date());

    return (
        <TabScreenLayout backgroundColor={UI.screenBg}>
            <View style={styles.inner}>
                <View style={styles.headerPad}>
                    <StaffBranchHeader
                        user={user}
                        branchName={branch?.name}
                        branchAddress={branch?.address}
                        branchImage={branch?.image}
                    />
                    <View style={styles.titleRow}>
                        <View style={styles.titleBlock}>
                            <Text className="font-sf-bold text-2xl text-slate-800">Bookings</Text>
                            <Text className="font-sf text-sm text-gray-500 mt-1">
                                Filter by day · see room readiness before guests arrive.
                            </Text>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => navigation.navigate('ReceptionQrScannerScreen')}
                            style={styles.scanBtn}
                        >
                            <QrCode size={22} color="#ffffff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.dateNavRow}>
                        <TouchableOpacity
                            hitSlop={10}
                            onPress={() => setSelectedDateKey((k) => shiftDateKey(k, -1))}
                            style={styles.dateNavBtn}
                        >
                            <ChevronLeft size={20} color="#64748b" />
                        </TouchableOpacity>
                        <View style={styles.dateNavCenter}>
                            <Calendar size={16} color="#8294FF" />
                            <Text style={styles.dateNavLabel}>{selectedLabel}</Text>
                        </View>
                        <TouchableOpacity
                            hitSlop={10}
                            onPress={() => setSelectedDateKey((k) => shiftDateKey(k, 1))}
                            style={styles.dateNavBtn}
                        >
                            <ChevronRight size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.dateStripe}
                    >
                        {dateStripe.map((day) => {
                            const active = day.key === selectedDateKey;
                            return (
                                <TouchableOpacity
                                    key={day.key}
                                    onPress={() => setSelectedDateKey(day.key)}
                                    style={[styles.dateCell, active && styles.dateCellActive]}
                                >
                                    <Text style={[styles.dateWeekday, active && styles.dateCellTextActive]}>
                                        {day.weekday}
                                    </Text>
                                    <Text style={[styles.dateDayNum, active && styles.dateCellTextActive]}>
                                        {day.dayNum}
                                    </Text>
                                    <Text style={[styles.dateMonth, active && styles.dateCellTextActive]}>
                                        {day.month}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {!isToday ? (
                        <View style={styles.todayRow}>
                            <TouchableOpacity
                                onPress={() => setSelectedDateKey(toDateKey(new Date()))}
                                style={styles.todayChip}
                            >
                                <Text style={styles.todayChipText}>Jump to today</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    <View style={styles.searchBar}>
                        <Search size={18} color="#94a3b8" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search by name, phone, or booking code"
                            placeholderTextColor="#94a3b8"
                            style={styles.searchInput}
                            autoCorrect={false}
                            clearButtonMode="while-editing"
                        />
                    </View>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color="#8294FF" style={{marginTop: 40}} />
                ) : (
                    <FlatList
                        data={filteredBookings}
                        keyExtractor={(item, index) => String(item?.id ?? `booking-${index}`)}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8294FF" />
                        }
                        renderItem={({item}) => (
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() =>
                                    navigation.navigate('BookingDetailScreen', {bookingId: item.id})
                                }
                            >
                                <BookingListCard item={item} />
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <EmptyState
                                icon="calendar-outline"
                                title={
                                    searchQuery.trim()
                                        ? 'No matching bookings'
                                        : 'No bookings for this day'
                                }
                                subtitle={
                                    searchQuery.trim()
                                        ? 'Try another guest name or phone number.'
                                        : 'Walk-ins and check-ins for this date will appear here.'
                                }
                            />
                        }
                    />
                )}
                {!isLoading && !!errorMessage ? (
                    <Text className="font-sf text-center text-red-500 px-6 pb-4">{errorMessage}</Text>
                ) : null}
            </View>
        </TabScreenLayout>
    );
}

const styles = StyleSheet.create({
    inner: {flex: 1},
    headerPad: {paddingHorizontal: 20, paddingTop: 8},
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 8,
        gap: 12,
    },
    titleBlock: {
        flex: 1,
    },
    scanBtn: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#8294FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    dateNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    dateNavBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateNavCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 8,
    },
    dateNavLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#334155',
    },
    dateStripe: {
        gap: 8,
        paddingBottom: 4,
    },
    todayRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 12,
        marginTop: 4,
    },
    todayChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#eef2ff',
    },
    todayChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8294FF',
    },
    dateCell: {
        width: 56,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
    },
    dateCellActive: {
        backgroundColor: '#8294FF',
        borderColor: '#8294FF',
    },
    dateWeekday: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94a3b8',
    },
    dateDayNum: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
        marginTop: 2,
    },
    dateMonth: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 2,
    },
    dateCellTextActive: {
        color: '#ffffff',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#0f172a',
        paddingVertical: 0,
    },
    listContent: {paddingHorizontal: 20, paddingBottom: 24},
    bookingCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: UI.sectionGap,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12},
    cardLeft: {flex: 1, minWidth: 0},
    guestName: {fontSize: 18, fontWeight: '800', color: '#0f172a'},
    roomType: {fontSize: 15, fontWeight: '600', color: '#475569', marginTop: 4},
    metaLine: {fontSize: 12, color: '#94a3b8', marginTop: 2},
    walkInHint: {fontSize: 12, fontWeight: '600', color: '#8294FF', marginTop: 6},
    statusBadge: {paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexShrink: 0},
    statusBadgeText: {fontSize: 11, fontWeight: '700'},
    badgeGreen: {backgroundColor: '#dcfce7'},
    badgeTextGreen: {color: '#166534'},
    badgeYellow: {backgroundColor: '#fef9c3'},
    badgeTextYellow: {color: '#854d0e'},
    badgeRed: {backgroundColor: '#fee2e2'},
    badgeTextRed: {color: '#991b1b'},
    badgeBlue: {backgroundColor: '#dbeafe'},
    badgeTextBlue: {color: '#1d4ed8'},
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    priceText: {fontSize: 14, fontWeight: '700', color: '#059669'},
    footerHint: {fontSize: 12, fontWeight: '600', color: '#64748b'},
    footerHintAction: {color: '#8294FF'},
});
