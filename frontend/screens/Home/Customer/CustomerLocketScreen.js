import React, {useCallback, useMemo, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import * as Location from 'expo-location';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {getSession} from '../../../utils/authStorage';
import {fetchLocketFeed} from '../../../services/ReviewService';
import {fetchMyBookings} from '../../../services/CustomerBookingService';
import {mapReviewsToLocketList} from '../../../utils/locketFeed';
import EmptyState from '../../../components/common/EmptyState';
import Avatar from '../../../components/common/Avatar';

const DEFAULT_WATCHLIST_IMAGE = STAFF_MEDIA.ROOM_IMAGE;

const resolveImageSource = (source) => {
    if (typeof source === 'number') return source;
    if (typeof source === 'string' && source.trim().length > 0) return {uri: source};
    return {uri: DEFAULT_WATCHLIST_IMAGE};
};

const normalizeBookingId = (value) => {
    const normalized = String(value || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!normalized) return '';
    return normalized.startsWith('#') ? normalized.slice(1) : normalized;
};

const formatTimeAgo = (createdAt, nowMs) => {
    const parsed = new Date(createdAt);
    if (!Number.isFinite(parsed.getTime())) return 'Just now';

    const diffMs = Math.max(0, nowMs - parsed.getTime());
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

    const years = Math.floor(days / 365);
    return `${years} year${years === 1 ? '' : 's'} ago`;
};

function LocketCard({item, nowMs}) {
    return (
        <View style={styles.gridCard}>
            <Image source={resolveImageSource(item.image)} style={styles.gridImage} resizeMode="cover"/>
            <View style={styles.gridOverlay}>
                <Text style={styles.gridHotel} numberOfLines={1}>{item.hotelName}</Text>
                <Text style={styles.gridRoom} numberOfLines={1}>{item.roomName}</Text>
            </View>
            <View style={styles.gridMeta}>
                <Text style={styles.gridTime}>{formatTimeAgo(item.createdAt, nowMs)}</Text>
                {item.rating > 0 ? (
                    <Text style={styles.gridRating}>{'★'.repeat(Math.min(5, item.rating))}</Text>
                ) : null}
                <Text style={styles.gridCaption} numberOfLines={2}>{String(item.description || '').trim()}</Text>
                <View style={styles.gridAuthorRow}>
                    <Avatar uri={String(item?.userAvatar || '').trim()} name={String(item?.userName || '').trim()} size={28} />
                    <Text style={styles.gridAuthorName} numberOfLines={1}>{String(item.userName || '').trim() || 'User'}</Text>
                </View>
            </View>
        </View>
    );
}

export default function CustomerLocketScreen({navigation}) {
    const [lockets, setLockets] = useState([]);
    const [feedMode, setFeedMode] = useState('personal');
    const [feedHint, setFeedHint] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterQuery, setFilterQuery] = useState('');
    const [bookingRecords, setBookingRecords] = useState([]);
    const [currentUser, setCurrentUser] = useState({name: 'Guest', email: ''});
    const [avatarUrl, setAvatarUrl] = useState('');
    const [nowMs, setNowMs] = useState(Date.now());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
        const timer = setInterval(() => setNowMs(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);

    const loadFeed = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const session = await getSession();
            const userName = String(session?.user?.name || session?.user?.full_name || 'Guest').trim() || 'Guest';
            const userEmail = String(session?.user?.email || '').trim().toLowerCase();
            setCurrentUser({name: userName, email: userEmail});
            setAvatarUrl(String(session?.user?.avatar || '').trim());

            let latitude = null;
            let longitude = null;
            let modeLabel = 'Showing Lockets from hotels you booked or favorited';

            const permission = await Location.requestForegroundPermissionsAsync();
            if (permission.status === 'granted') {
                try {
                    const position = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    latitude = position.coords.latitude;
                    longitude = position.coords.longitude;
                    modeLabel = 'Showing nearby hotel Lockets based on your location';
                } catch {
                    modeLabel = 'Location unavailable — showing your booked and favorited hotels';
                }
            }

            const [feedRes, bookingsRes] = await Promise.all([
                fetchLocketFeed(
                    latitude != null && longitude != null
                        ? {latitude, longitude}
                        : {}
                ),
                fetchMyBookings(),
            ]);

            const mode = feedRes.status === 'success' ? (feedRes.data?.mode || 'personal') : 'personal';
            setFeedMode(mode);
            setFeedHint(mode === 'nearby' ? modeLabel : modeLabel);

            const rows = feedRes.status === 'success' ? feedRes.data?.results : [];
            setLockets(mapReviewsToLocketList(rows));

            const bookingRows = bookingsRes.status === 'success' && Array.isArray(bookingsRes.data)
                ? bookingsRes.data
                : [];
            setBookingRecords(
                bookingRows
                    .map((booking) => ({
                        bookingId: booking?.bookingCode || booking?.booking_code || '',
                        hotelName: booking?.hotel_name || booking?.hotelName || 'Hotel',
                        roomName: booking?.room_type || booking?.roomType || booking?.roomNumber || 'Room',
                        branchId: booking?.branchId || booking?.branch_id || '',
                        status: booking?.status || '',
                    }))
                    .filter((row) => String(row.bookingId || '').trim())
            );
        } catch {
            setLockets([]);
            setBookingRecords([]);
            setFeedHint('Unable to load Lockets right now.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            setIsLoading(true);
            loadFeed();
        }, [loadFeed])
    );

    const filteredLockets = useMemo(() => {
        const mainKeyword = searchQuery.trim().toLowerCase();
        const detailKeyword = filterQuery.trim().toLowerCase();
        if (!mainKeyword && !detailKeyword) return lockets;

        return lockets.filter((item) => {
            const haystack = `${item?.hotelName || ''} ${item?.roomName || ''} ${item?.description || ''} ${item?.userName || ''} ${item?.branchAddress || ''}`.toLowerCase();
            if (mainKeyword && !haystack.includes(mainKeyword)) return false;
            if (detailKeyword && !haystack.includes(detailKeyword)) return false;
            return true;
        });
    }, [lockets, searchQuery, filterQuery]);

    const handleRefresh = useCallback(() => {
        loadFeed();
    }, [loadFeed]);

    const handleOpenComposer = () => {
        const latest =
            bookingRecords.find((row) => ['CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED'].includes(String(row.status || '').toUpperCase())) ||
            bookingRecords[0];
        if (!latest?.bookingId) {
            Alert.alert('Booking required', 'Complete a booking first to capture a Locket.');
            return;
        }
        navigation.navigate('CreateWatchlistModal', {
            hotelName: latest.hotelName,
            roomName: latest.roomName,
            hotelImage: DEFAULT_WATCHLIST_IMAGE,
            bookingId: latest.bookingId,
            branchId: latest.branchId,
        });
    };

    return (
        <SafeAreaView style={styles.page}>
            <View style={styles.headerRow}>
                <View style={styles.headerTextBlock}>
                    <Text style={styles.currentLabel}>Watch List</Text>
                    <Text style={styles.currentValue}>Locket memories</Text>
                    {feedHint ? <Text style={styles.feedHint}>{feedHint}</Text> : null}
                </View>
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('CustomerProfileScreen')} activeOpacity={0.85}>
                    <Ionicons name="person-circle-outline" size={34} color="#111827" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color="#9ca3af"/>
                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search memories"
                    placeholderTextColor="#9ca3af"
                    style={styles.searchInput}
                />
            </View>

            <View style={styles.filterPillBar}>
                <Ionicons name={feedMode === 'nearby' ? 'location' : 'heart'} size={16} color="#6a74ff"/>
                <TextInput
                    value={filterQuery}
                    onChangeText={setFilterQuery}
                    placeholder={feedMode === 'nearby' ? 'Filter nearby Lockets' : 'Filter booked & favorited hotels'}
                    placeholderTextColor="#9ca3af"
                    style={styles.filterInput}
                />
            </View>

            {isLoading ? (
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color="#5b79df"/>
                </View>
            ) : (
                <FlatList
                    data={filteredLockets}
                    keyExtractor={(item) => String(item?.id || Math.random())}
                    numColumns={2}
                    columnWrapperStyle={styles.gridRow}
                    contentContainerStyle={styles.gridContent}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#5b79df']} tintColor="#5b79df" />}
                    renderItem={({item}) => <LocketCard item={item} nowMs={nowMs} />}
                    ListEmptyComponent={
                        <EmptyState
                            icon="heart-dislike-outline"
                            title={feedMode === 'nearby' ? 'No nearby Lockets yet' : 'No Lockets from your hotels yet'}
                            subtitle="Post a memory after your stay, or explore hotels near you."
                        />
                    }
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={handleOpenComposer} activeOpacity={0.9}>
                <Ionicons name="camera" size={20} color="#ffffff"/>
            </TouchableOpacity>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {flex: 1, backgroundColor: '#fff'},
    headerRow: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
    },
    headerTextBlock: {flex: 1, paddingRight: 8},
    currentLabel: {fontFamily: 'SF-Regular', fontSize: 13, color: '#383838'},
    currentValue: {fontFamily: 'SF-Bold', fontSize: 20, lineHeight: 24, color: '#1b1b1b'},
    feedHint: {marginTop: 4, fontFamily: 'SF-Regular', fontSize: 12, color: '#6b7280', lineHeight: 16},
    headerIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBar: {
        marginTop: 6,
        marginHorizontal: 16,
        borderRadius: 16,
        height: 44,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        height: 40,
        fontFamily: 'SF-Regular',
        fontSize: 15,
        color: '#111827',
        paddingVertical: 0,
    },
    filterPillBar: {
        marginTop: 10,
        marginHorizontal: 16,
        borderRadius: 16,
        height: 44,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef2ff',
    },
    filterInput: {flex: 1, marginLeft: 8, fontFamily: 'SF-Regular', fontSize: 14, color: '#111827', paddingVertical: 0},
    loadingWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    gridContent: {paddingHorizontal: 16, paddingBottom: 120, paddingTop: 12},
    gridRow: {gap: 12},
    gridCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 10},
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
    },
    gridImage: {width: '100%', height: 160, backgroundColor: '#e5e7eb'},
    gridOverlay: {position: 'absolute', left: 10, right: 10, top: 10},
    gridHotel: {fontFamily: 'SF-Bold', fontSize: 16, lineHeight: 22, color: '#111111'},
    gridRoom: {marginTop: 2, fontFamily: 'SF-Regular', fontSize: 15, lineHeight: 22, color: '#333333'},
    gridMeta: {paddingHorizontal: 12, paddingVertical: 10},
    gridTime: {fontFamily: 'SF-SemiBold', fontSize: 15, lineHeight: 22, color: '#333333'},
    gridRating: {marginTop: 2, fontSize: 13, color: '#f59e0b'},
    gridCaption: {marginTop: 6, fontFamily: 'SF-Regular', fontSize: 15, lineHeight: 22, color: '#333333'},
    gridAuthorRow: {marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8},
    gridAuthorName: {flex: 1, fontFamily: 'SF-SemiBold', fontSize: 15, lineHeight: 22, color: '#111111'},
    fab: {
        position: 'absolute',
        right: 18,
        bottom: 106,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#5b79df',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 12},
        shadowOpacity: 0.22,
        shadowRadius: 18,
        elevation: 10,
    },
    modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
    modalKeyboardAvoid: {width: '100%'},
    modalCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
        maxHeight: '88%',
    },
    modalScrollContent: {paddingBottom: 8},
    modalHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
    modalTitle: {fontFamily: 'SF-Bold', fontSize: 22, color: '#1d1d1f'},
    modalFieldLabel: {fontFamily: 'SF-Bold', fontSize: 14, color: '#313131', marginBottom: 8},
    bookingInputRow: {flexDirection: 'row', gap: 8, marginBottom: 10},
    bookingInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#d8dbe6',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#1d1d1f',
    },
    verifyBtn: {borderRadius: 12, backgroundColor: '#1f4ec9', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14},
    verifyBtnText: {fontFamily: 'SF-Bold', fontSize: 13, color: '#fff'},
    verifiedCard: {
        borderWidth: 1,
        borderColor: '#cfe0ff',
        borderRadius: 12,
        backgroundColor: '#eef4ff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
    },
    verifiedTitle: {fontFamily: 'SF-Bold', fontSize: 13, color: '#1946b0', marginBottom: 4},
    verifiedLine: {fontFamily: 'SF-Regular', fontSize: 13, color: '#2b2f3a', marginBottom: 2},
    photoActionsRow: {flexDirection: 'row', gap: 8, marginBottom: 10},
    photoActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#c8d6ff',
        backgroundColor: '#edf2ff',
        paddingVertical: 10,
    },
    photoActionText: {fontFamily: 'SF-Bold', fontSize: 13, color: '#15398d'},
    previewBox: {
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#f2f2f2',
        height: 170,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    previewImage: {width: '100%', height: '100%'},
    previewPlaceholder: {fontFamily: 'SF-Regular', fontSize: 14, color: '#8d8d8d'},
    ratingRow: {flexDirection: 'row', gap: 6, marginBottom: 14},
    commentInput: {
        borderWidth: 1,
        borderColor: '#d8dbe6',
        borderRadius: 12,
        minHeight: 86,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#1d1d1f',
        marginBottom: 14,
    },
    submitBtn: {borderRadius: 999, backgroundColor: '#5b79df', alignItems: 'center', justifyContent: 'center', paddingVertical: 13},
    submitBtnDisabled: {opacity: 0.7},
    submitBtnText: {fontFamily: 'SF-Bold', fontSize: 15, color: '#fff'},
});
