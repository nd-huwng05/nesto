import React, {useMemo, useState} from 'react';
import {Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {getSession} from '../../../utils/authStorage';
import {fetchReviews, createReview} from '../../../services/ReviewService';
import {fetchMyBookings} from '../../../services/CustomerBookingService';
import EmptyState from '../../../components/common/EmptyState';
import Avatar from '../../../components/common/Avatar';

const HISTORY_BOOKINGS_KEY = 'customer_paid_history_bookings';
const UPCOMING_BOOKINGS_KEY = 'customer_paid_upcoming_bookings';
const WATCHLIST_CUSTOM_POSTS_KEY = 'customer_watchlist_custom_posts';
const DEFAULT_WATCHLIST_IMAGE = STAFF_MEDIA.ROOM_IMAGE;


const resolveImageSource = (source) => {
    if (typeof source === 'number') return source;
    if (typeof source === 'string' && source.trim().length > 0) return {uri: source};
    return {uri: STAFF_MEDIA.ROOM_IMAGE};
};

const normalizeBookingId = (value) => {
    const normalized = String(value || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!normalized) return '';
    return normalized.startsWith('#') ? normalized : `#${normalized}`;
};

const resolveHotelAvatar = (hotelName, fallbackImage) => {
    return fallbackImage || STAFF_MEDIA.HOTEL_AVATAR;
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
    const [searchQuery, setSearchQuery] = useState('');
    const [filterQuery, setFilterQuery] = useState('');
    const [bookingRecords, setBookingRecords] = useState([]);
    const [currentUser, setCurrentUser] = useState({name: 'Guest', email: ''});
    const [avatarUrl, setAvatarUrl] = useState('');
    const [showComposer, setShowComposer] = useState(false);
    const [bookingIdInput, setBookingIdInput] = useState('');
    const [matchedBooking, setMatchedBooking] = useState(null);
    const [draftImageUri, setDraftImageUri] = useState('');
    const [draftComment, setDraftComment] = useState('');
    const [nowMs, setNowMs] = useState(Date.now());
    const [isRefreshing, setIsRefreshing] = useState(false);

    React.useEffect(() => {
        const timer = setInterval(() => {
            setNowMs(Date.now());
        }, 30000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            let mounted = true;

            const loadWatchlistFromHistory = async () => {
                try {
                    const session = await getSession();
                    const userEmail = String(session?.user?.email || '').trim().toLowerCase();
                    const userName = String(session?.user?.name || session?.user?.full_name || 'Guest').trim() || 'Guest';
                    if (mounted) setCurrentUser({name: userName, email: userEmail});
                    if (mounted) setAvatarUrl(String(session?.user?.avatar || '').trim());

                    const [mineRes, globalRes, bookingsRes] = await Promise.all([
                        fetchReviews({mine: true}),
                        fetchReviews({}),
                        fetchMyBookings(),
                    ]);
                    const minePosts = mineRes.status === 'success' && Array.isArray(mineRes.data) ? mineRes.data : [];
                    const globalPosts = globalRes.status === 'success' && Array.isArray(globalRes.data) ? globalRes.data : [];
                    const unique = new Map();
                    [...minePosts, ...globalPosts].forEach((p) => {
                        const key = String(p?.id || '');
                        if (key && !unique.has(key)) unique.set(key, p);
                    });
                    const posts = Array.from(unique.values());
                    const mapped = posts.map((post) => {
                        const hotelName = String(post?.hotel_name || post?.hotelName || 'Hotel').trim();
                        const roomName = String(post?.room_name || post?.roomName || 'Room').trim();
                        const rawImage = String(post?.image_url || post?.imageUrl || '').trim();
                        return {
                            id: String(post?.id || ''),
                            hotelName,
                            roomName,
                            description: String(post?.content || '').trim(),
                            hotelAvatar: resolveHotelAvatar(hotelName, DEFAULT_WATCHLIST_IMAGE),
                            userAvatar: String(post?.author_avatar || post?.authorAvatar || post?.userAvatar || ''),
                            userName: String(post?.author_name || post?.authorName || 'Guest').trim() || 'Guest',
                            image: rawImage || DEFAULT_WATCHLIST_IMAGE,
                            createdAt: String(post?.created_at || post?.createdAt || new Date().toISOString()),
                        };
                    }).filter((row) => row.id);

                    const bookingRows = bookingsRes.status === 'success' && Array.isArray(bookingsRes.data)
                        ? bookingsRes.data
                        : [];
                    const records = bookingRows.map((booking) => ({
                        bookingId: booking?.bookingCode || booking?.booking_code || '',
                        hotelName: booking?.hotel_name || booking?.hotelName || 'Hotel',
                        roomName: booking?.room_type || booking?.roomType || booking?.roomNumber || 'Room',
                        status: booking?.status || '',
                    })).filter((row) => String(row.bookingId || '').trim());

                    if (mounted) {
                        setBookingRecords(records);
                        setLockets(mapped);
                    }
                } catch {
                    if (mounted) {
                        setBookingRecords([]);
                        setLockets([]);
                    }
                }
            };

            loadWatchlistFromHistory();

            return () => {
                mounted = false;
            };
        }, [])
    );

    const filteredLockets = useMemo(() => {
        const mainKeyword = searchQuery.trim().toLowerCase();
        const detailKeyword = filterQuery.trim().toLowerCase();

        if (!mainKeyword && !detailKeyword) return lockets;

        return lockets.filter((item) => {
            const haystack = `${item?.hotelName || ''} ${item?.roomName || ''} ${item?.description || ''} ${item?.userName || ''}`.toLowerCase();

            if (mainKeyword && !haystack.includes(mainKeyword)) return false;
            if (detailKeyword && !haystack.includes(detailKeyword)) return false;
            return true;
        });
    }, [lockets, searchQuery, filterQuery]);

    const handleRefresh = React.useCallback(() => {
        setIsRefreshing(true);
        setIsRefreshing(false);
    }, []);

    const handleOpenComposer = () => {
        setBookingIdInput('');
        setMatchedBooking(null);
        setDraftComment('');
        setDraftImageUri('');
        setShowComposer(true);
    };

    const handleCapturePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Camera permission required', 'Please allow camera permission to take a photo.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
            setDraftImageUri(result.assets[0].uri);
        }
    };

    const handleCloseComposer = () => {
        setShowComposer(false);
        setBookingIdInput('');
        setMatchedBooking(null);
        setDraftComment('');
        setDraftImageUri('');
    };

    const handleVerifyBookingId = () => {
        const normalized = normalizeBookingId(bookingIdInput);
        if (!normalized) {
            Alert.alert('Booking ID required', 'Please enter your Booking ID first.');
            return;
        }

        const found = bookingRecords.find((item) => normalizeBookingId(item?.bookingId) === normalized);
        if (!found) {
            setMatchedBooking(null);
            Alert.alert('Invalid Booking ID', 'Booking ID not found for your account.');
            return;
        }

        setMatchedBooking(found);
        setBookingIdInput(normalized);
    };

    const handleCreateWatchPost = async () => {
        const content = draftComment.trim();
        if (!matchedBooking) {
            Alert.alert('Verify Booking ID', 'Please verify a valid Booking ID before posting.');
            return;
        }
        if (!draftImageUri) {
            Alert.alert('Missing photo', 'Please take a photo or choose one from your gallery.');
            return;
        }
        if (content.length < 3) {
            Alert.alert('Missing comment', 'Please enter a short comment for your post.');
            return;
        }

        const id = `watch-custom-${Date.now()}`;
        const createdPost = {
            id,
            hotelName: matchedBooking.hotelName,
            roomName: matchedBooking.roomName,
            description: content,
            hotelAvatar: resolveHotelAvatar(matchedBooking.hotelName, draftImageUri),
            userAvatar: String(currentUser?.avatar || avatarUrl || ''),
            userName: currentUser.name || 'Guest',
            image: draftImageUri,
            createdAt: new Date().toISOString(),
        };

        setLockets((prev) => [createdPost, ...prev]);

        try {
            await createReview({
                bookingId: normalizeBookingId(matchedBooking.bookingId),
                hotelName: matchedBooking.hotelName,
                roomName: matchedBooking.roomName,
                content,
                rating: 5,
                imageUrl: draftImageUri,
            });
        } catch {
        }

        handleCloseComposer();
    };

    return (
        <SafeAreaView style={styles.page}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.currentLabel}>Watch List</Text>
                    <Text style={styles.currentValue}>Capture your memories</Text>
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
                <Ionicons name="sparkles" size={16} color="#6a74ff"/>
                <TextInput
                    value={filterQuery}
                    onChangeText={setFilterQuery}
                    placeholder="Search by hotel or city"
                    placeholderTextColor="#9ca3af"
                    style={styles.filterInput}
                />
            </View>

            <FlatList
                data={filteredLockets}
                keyExtractor={(item) => String(item?.id || Math.random())}
                numColumns={2}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.gridContent}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#5b79df']} tintColor="#5b79df" />}
                renderItem={({item}) => <LocketCard item={item} nowMs={nowMs} />}
                ListEmptyComponent={<EmptyState icon="heart-dislike-outline" title="No memories yet. Start capturing!" subtitle="Tap the camera button to take a live photo." />}
            />

            <TouchableOpacity style={styles.fab} onPress={handleOpenComposer} activeOpacity={0.9}>
                <Ionicons name="camera" size={20} color="#ffffff"/>
            </TouchableOpacity>

            <Modal
                visible={showComposer}
                transparent
                animationType="slide"
                onRequestClose={handleCloseComposer}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView
                        style={styles.modalKeyboardAvoid}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
                    >
                        <View style={styles.modalCard}>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={styles.modalScrollContent}
                            >
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Create Watchlist Post</Text>
                                    <TouchableOpacity onPress={handleCloseComposer}>
                                        <Ionicons name="close" size={24} color="#333"/>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.modalFieldLabel}>Booking ID</Text>
                                <View style={styles.bookingInputRow}>
                                    <TextInput
                                        value={bookingIdInput}
                                        onChangeText={(text) => {
                                            setBookingIdInput(text);
                                            setMatchedBooking(null);
                                        }}
                                        placeholder="Enter Booking ID (e.g. #BK862345)"
                                        placeholderTextColor="#9a9a9a"
                                        autoCapitalize="characters"
                                        style={styles.bookingInput}
                                    />
                                    <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyBookingId} activeOpacity={0.9}>
                                        <Text style={styles.verifyBtnText}>Verify</Text>
                                    </TouchableOpacity>
                                </View>
                                {bookingRecords.length === 0 ? <Text style={styles.modalHintText}>No booking found for this account.</Text> : null}

                                {matchedBooking ? (
                                    <View style={styles.verifiedCard}>
                                        <Text style={styles.verifiedTitle}>Booking Verified</Text>
                                        <Text style={styles.verifiedLine}>Booking ID: {normalizeBookingId(matchedBooking.bookingId) || 'N/A'}</Text>
                                        <Text style={styles.verifiedLine}>Hotel: {matchedBooking.hotelName}</Text>
                                        <Text style={styles.verifiedLine}>Room: {matchedBooking.roomName}</Text>
                                    </View>
                                ) : null}

                                <Text style={styles.modalFieldLabel}>Photo</Text>
                                <View style={styles.photoActionsRow}>
                                    <TouchableOpacity style={styles.photoActionBtn} onPress={handleCapturePhoto} activeOpacity={0.86}>
                                        <Ionicons name="camera-outline" size={18} color="#15398d"/>
                                        <Text style={styles.photoActionText}>Take photo</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.previewBox}>
                                    {draftImageUri ? (
                                        <Image source={{uri: draftImageUri}} style={styles.previewImage} resizeMode="cover"/>
                                    ) : (
                                        <Text style={styles.previewPlaceholder}>No photo selected</Text>
                                    )}
                                </View>

                                <Text style={styles.modalFieldLabel}>Comment</Text>
                                <TextInput
                                    value={draftComment}
                                    onChangeText={setDraftComment}
                                    placeholder="Share your room experience..."
                                    placeholderTextColor="#9a9a9a"
                                    style={styles.commentInput}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                />

                                <TouchableOpacity style={styles.submitBtn} onPress={handleCreateWatchPost} activeOpacity={0.9}>
                                    <Text style={styles.submitBtnText}>Post to Watchlist</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
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
        fontSize: 13,
        color: '#383838',
    },
    currentValue: {
        fontFamily: 'SF-Bold',
        fontSize: 20,
        lineHeight: 24,
        color: '#1b1b1b',
    },
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
        minHeight: 40,
        maxHeight: 40,
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 18,
        color: '#111827',
        paddingVertical: 0,
        includeFontPadding: false,
        textAlignVertical: 'center',
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
    filterInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#111827',
        paddingVertical: 0,
    },
    gridContent: {
        paddingHorizontal: 16,
        paddingBottom: 120,
        paddingTop: 12,
    },
    gridRow: {
        gap: 12,
    },
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
    gridImage: {
        width: '100%',
        height: 160,
        backgroundColor: '#e5e7eb',
    },
    gridOverlay: {
        position: 'absolute',
        left: 10,
        right: 10,
        top: 10,
    },
    gridHotel: {
        fontFamily: 'SF-Bold',
        fontSize: 16,
        lineHeight: 22,
        color: '#111111',
    },
    gridRoom: {
        marginTop: 2,
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
    },
    gridMeta: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    gridTime: {
        fontFamily: 'SF-SemiBold',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
    },
    gridCaption: {
        marginTop: 6,
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
    },
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
    watchListHeader: {
        marginTop: 16,
        marginHorizontal: 16,
        marginBottom: 14,
    },
    watchListTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 18,
        color: '#d4af37',
        marginBottom: 4,
    },
    watchListDesc: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        color: '#999999',
        marginBottom: 0,
    },
    addPostButton: {
        alignSelf: 'center',
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#d6e5ff',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    addPostButtonText: {
        fontFamily: 'SF-Bold',
        fontSize: 14,
        color: '#0f1b3f',
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
        fontSize: 14,
        color: '#1f1f1f',
        paddingVertical: 0,
    },
    darkSection: {
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
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 12,
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
    reviewBubble: {
        position: 'absolute',
        bottom: 14,
        alignSelf: 'center',
        backgroundColor: 'rgba(55, 55, 55, 0.86)',
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 8,
        maxWidth: '88%',
    },
    reviewBubbleText: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        color: '#f2f2f2',
        fontStyle: 'italic',
        fontWeight: '500',
        textAlign: 'center',
    },
    userInfoWrap: {
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#2a2a2a',
    },
    userIdentityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#f0f0f0',
    },
    userName: {
        marginLeft: 10,
        fontFamily: 'SF-Regular',
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    postTimeText: {
        marginBottom: 6,
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#aeb3c4',
        textAlign: 'center',
    },
    emptyText: {
        fontFamily: 'SF-Regular',
        color: '#9a9a9a',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalKeyboardAvoid: {
        width: '100%',
    },
    modalCard: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
        maxHeight: '88%',
    },
    modalScrollContent: {
        paddingBottom: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    modalTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 22,
        color: '#1d1d1f',
    },
    modalFieldLabel: {
        fontFamily: 'SF-Bold',
        fontSize: 14,
        color: '#313131',
        marginBottom: 8,
    },
    bookingInputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
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
    verifyBtn: {
        borderRadius: 12,
        backgroundColor: '#1f4ec9',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
    },
    verifyBtnText: {
        fontFamily: 'SF-Bold',
        fontSize: 13,
        color: '#fff',
    },
    verifiedCard: {
        borderWidth: 1,
        borderColor: '#cfe0ff',
        borderRadius: 12,
        backgroundColor: '#eef4ff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
    },
    verifiedTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 13,
        color: '#1946b0',
        marginBottom: 4,
    },
    verifiedLine: {
        fontFamily: 'SF-Regular',
        fontSize: 13,
        color: '#2b2f3a',
        marginBottom: 2,
    },
    modalHintText: {
        fontFamily: 'SF-Regular',
        fontSize: 13,
        color: '#8a8a8a',
        marginBottom: 12,
    },
    photoActionsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10,
    },
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
    photoActionText: {
        fontFamily: 'SF-Bold',
        fontSize: 13,
        color: '#15398d',
    },
    previewBox: {
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#f2f2f2',
        height: 170,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewPlaceholder: {
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#8d8d8d',
    },
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
    submitBtn: {
        borderRadius: 999,
        backgroundColor: '#5b79df',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
    },
    submitBtnText: {
        fontFamily: 'SF-Bold',
        fontSize: 15,
        color: '#fff',
    },
});
