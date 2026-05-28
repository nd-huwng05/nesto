import {useCallback, useMemo, useState, useEffect} from 'react';
import {
    ActivityIndicator,
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
import {Calendar, ChevronLeft, ChevronRight, Search} from 'lucide-react-native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {StaffBranchHeader} from '../../../components/staff/StaffBranchHeader';
import {getStaffBranchInfo} from '../../../constants/staffBranchInfo';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {fetchBookingsForDay} from '../../../services/ReceptionService';
import {buildDateStripe, toDateKey} from '../../../utils/staffBookingOps';
import {connectBookingUpdates} from '../../../services/WebSocketService';
import {UI, cardStyle} from '../../../styles/uiTokens';
import AsyncStorage from '@react-native-async-storage/async-storage';

function badgeStyle(status) {
    const key = String(status || '').trim().toUpperCase();
    if (key === 'CHECKED_IN') return styles.badgeInHouse;
    if (key === 'CHECKED_OUT') return styles.badgeDone;
    return styles.badgePending;
}

function matchesSearch(booking, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    const name = String(booking.guestName || '').toLowerCase();
    const phone = String(booking.phone || '').replace(/\s/g, '');
    const phoneQuery = query.replace(/\s/g, '');
    return name.includes(q) || phone.includes(phoneQuery);
}

function shiftDateKey(dateKey, days) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const next = new Date(y, m - 1, d);
    next.setDate(next.getDate() + days);
    return toDateKey(next);
}

export default function BookingsScreen({navigation}) {
    const {user, branchId} = useStaffSession();
    const branch = getStaffBranchInfo(branchId);
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
            setErrorMessage(result.message || 'Unable to load bookings.');
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
            const token = await AsyncStorage.getItem('access_token');
            unsubscribe = await connectBookingUpdates(branchId, {
                token,
                onMessage: (data) => {
                    if (data.type === 'booking' || data.type === 'booking_update') {
                        loadBookings();
                    }
                },
            });
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
                        branchName={branch.name}
                        branchAddress={branch.address}
                    />
                    <Text className="font-sf-bold text-2xl text-slate-800">Bookings</Text>
                    <Text className="font-sf text-sm text-gray-500 mt-1 mb-2">
                        Filter by day · see room readiness before guests arrive.
                    </Text>

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
                            placeholder="Search by guest name or phone"
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
                        keyExtractor={(item) => item.id}
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
                                <View style={[cardStyle, styles.bookingCard]}>
                                    <View style={styles.bookingTop}>
                                        <Text className="font-sf-bold text-base text-slate-800">
                                            {item.guestName}
                                        </Text>
                                        <View style={[styles.badge, badgeStyle(item.status)]}>
                                            <Text style={styles.badgeText}>{item.statusLabel}</Text>
                                        </View>
                                    </View>

                                    <Text className="font-sf text-sm text-gray-600 mt-2">
                                        {item.phone || '—'}
                                    </Text>
                                    <Text className="font-sf text-sm text-gray-600 mt-1">
                                        {item.isUnassigned || !item.roomNumber
                                            ? `Unassigned · Type: ${item.roomType || '—'}`
                                            : `Room ${item.roomNumber}`}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text className="font-sf text-center text-gray-500 py-12">
                                {searchQuery.trim()
                                    ? 'No bookings match your search.'
                                    : 'No bookings for this day.'}
                            </Text>
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
    bookingCard: {marginBottom: UI.sectionGap},
    bookingTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    badge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12},
    badgePending: {backgroundColor: '#fef3c7'},
    badgeInHouse: {backgroundColor: '#dbeafe'},
    badgeDone: {backgroundColor: '#dcfce7'},
    badgeText: {fontSize: 10, fontWeight: '600', color: '#475569'},
});
