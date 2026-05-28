import React, {useMemo, useState} from 'react';
import {Alert, Image, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useFocusEffect} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {getSession} from '../../../utils/authStorage';
import CustomerBottomTabBar from '../../../components/customer/CustomerBottomTabBar';
import {CustomerService} from '../../../services/CustomerService';

const HISTORY_BOOKINGS_KEY = 'customer_paid_history_bookings';
const UPCOMING_BOOKINGS_KEY = 'customer_paid_upcoming_bookings';
const WATCHLIST_CUSTOM_POSTS_KEY = 'customer_watchlist_custom_posts';
const DEFAULT_WATCHLIST_IMAGE = require('../../../assets/images/hotels/sun-suites-business.jpg');
const HOTEL_AVATAR_BY_NAME = {
    'sun suites': require('../../../assets/images/hotels/sun-suites-business.jpg'),
    'royal resort': require('../../../assets/images/hotels/royal-resort-business.jpg'),
    'swiss hotel': require('../../../assets/images/hotels/royal-resort-business.jpg'),
    'marina bay resort': require('../../../assets/images/hotels/sun-suites-business.jpg'),
    'sunset paradise': require('../../../assets/images/hotels/royal-resort-family.jpg'),
};


const resolveImageSource = (source) => {
    if (typeof source === 'number') return source;
    if (typeof source === 'string' && source.trim().length > 0) return {uri: source};
    return {uri: STAFF_MEDIA.USER_PLACEHOLDER};
};

const normalizeBookingId = (value) => {
    const normalized = String(value || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!normalized) return '';
    return normalized.startsWith('#') ? normalized : `#${normalized}`;
};

const resolveHotelAvatar = (hotelName, fallbackImage) => {
    const normalized = String(hotelName || '').trim().toLowerCase();
    if (normalized && HOTEL_AVATAR_BY_NAME[normalized]) {
        return HOTEL_AVATAR_BY_NAME[normalized];
    }

    const matchedKey = Object.keys(HOTEL_AVATAR_BY_NAME).find((key) => normalized.includes(key));
    if (matchedKey) {
        return HOTEL_AVATAR_BY_NAME[matchedKey];
    }

    return fallbackImage || DEFAULT_WATCHLIST_IMAGE;
};

const formatTimeAgo = (createdAt, nowMs) => {
    const parsed = new Date(createdAt);
    if (!Number.isFinite(parsed.getTime())) return 'Vừa xong';

    const diffMs = Math.max(0, nowMs - parsed.getTime());
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} ngày trước`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} tuần trước`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} tháng trước`;

    const years = Math.floor(days / 365);
    return `${years} năm trước`;
};

function LocketCard({item, nowMs}) {
    return (
        <View style={styles.cardWrap}>
            <View style={styles.imageSection}>
                <Image source={resolveImageSource(item.image)} style={styles.cardImage} resizeMode="cover"/>
                <View style={styles.hotelInfoOverlay}>
                    <Image source={resolveImageSource(item.hotelAvatar)} style={styles.hotelIcon}/>
                    <View>
                        <Text style={styles.hotelNameOverlay}>{item.hotelName}</Text>
                        <Text style={styles.roomNumberOverlay}>{item.roomName}</Text>
                    </View>
                </View>

                <View style={styles.reviewBubble}>
                    <Text style={styles.reviewBubbleText}>{item.description}</Text>
                </View>
            </View>

            <View style={styles.userInfoWrap}>
                <Text style={styles.postTimeText}>{formatTimeAgo(item.createdAt, nowMs)}</Text>
                <View style={styles.userIdentityRow}>
                    <Image source={resolveImageSource(item.userAvatar)} style={styles.userAvatar}/>
                    <Text style={styles.userName}>{item.userName}</Text>
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
                    const [session, rawHistory, rawUpcoming, rawCustomPosts, remoteWatchlist] = await Promise.all([
                        getSession(),
                        AsyncStorage.getItem(HISTORY_BOOKINGS_KEY),
                        AsyncStorage.getItem(UPCOMING_BOOKINGS_KEY),
                        AsyncStorage.getItem(WATCHLIST_CUSTOM_POSTS_KEY),
                        CustomerService.listWatchlistPosts(),
                    ]);

                    const userEmail = String(session?.user?.email || '').trim().toLowerCase();
                    const userName = String(session?.user?.name || session?.user?.full_name || 'Guest').trim() || 'Guest';
                    if (mounted) {
                        setCurrentUser({name: userName, email: userEmail});
                    }

                    const parsed = rawHistory ? JSON.parse(rawHistory) : [];
                    const parsedUpcoming = rawUpcoming ? JSON.parse(rawUpcoming) : [];
                    const parsedCustomPosts = rawCustomPosts ? JSON.parse(rawCustomPosts) : [];
                    const allItems = Array.isArray(parsed)
                        ? parsed.filter((item) => item && typeof item === 'object' && item.id)
                        : [];
                    const allUpcoming = Array.isArray(parsedUpcoming)
                        ? parsedUpcoming.filter((item) => item && typeof item === 'object' && item.id)
                        : [];
                    // Shared watchlist: every account sees the same feed.
                    const scopedItems = allItems;
                    const scopedUpcoming = allUpcoming;
                    const remotePosts = remoteWatchlist?.success
                        ? (Array.isArray(remoteWatchlist?.data?.results) ? remoteWatchlist.data.results : Array.isArray(remoteWatchlist?.data) ? remoteWatchlist.data : [])
                        : [];
                    const preferredPosts = remotePosts.length ? remotePosts : parsedCustomPosts;
                    const scopedCustomPosts = Array.isArray(preferredPosts)
                        ? preferredPosts.filter((item) => item && typeof item === 'object')
                        : [];

                    if (remotePosts.length) {
                        await AsyncStorage.setItem(WATCHLIST_CUSTOM_POSTS_KEY, JSON.stringify(remotePosts));
                    }

                    const dedupeRoomMap = new Map();
                    [...scopedItems, ...scopedUpcoming].forEach((item) => {
                        const hotelName = String(item?.roomCode || item?.hotelName || 'Hotel').trim();
                        const roomName = String(item?.roomName || 'Room').trim();
                        const bookingId = normalizeBookingId(item?.bookingId);
                        const key = bookingId || `${hotelName}::${roomName}`;
                        if (!dedupeRoomMap.has(key)) {
                            dedupeRoomMap.set(key, {
                                bookingId,
                                hotelName,
                                roomName,
                                image: item?.image || DEFAULT_WATCHLIST_IMAGE,
                            });
                        }
                    });

                    const nextBookingRecords = Array.from(dedupeRoomMap.values());
                    if (mounted) {
                        setBookingRecords(nextBookingRecords);
                    }

                    const mapped = scopedItems.map((item, index) => {
                        const hotelName = String(item?.roomCode || item?.hotelName || 'Hotel').trim();
                        const roomName = String(item?.roomName || 'Room').trim();
                        const rawImage = item?.image || DEFAULT_WATCHLIST_IMAGE;

                        return {
                            id: `watch-${item?.id || index}`,
                            hotelName,
                            roomName,
                            description: 'The view is very beautiful',
                            hotelAvatar: resolveHotelAvatar(hotelName, rawImage),
                            userAvatar: STAFF_MEDIA.USER_PLACEHOLDER,
                            userName: String(item?.customerName || 'Guest').trim() || 'Guest',
                            image: rawImage,
                            createdAt: item?.paidAt || item?.createdAt || new Date().toISOString(),
                        };
                    });

                    const mappedCustomPosts = scopedCustomPosts.map((item, index) => {
                        const hotelName = String(item?.hotelName || 'Hotel').trim();
                        const roomName = String(item?.roomName || 'Room').trim();
                        const rawImage = item?.image || DEFAULT_WATCHLIST_IMAGE;

                        return {
                            id: String(item?.id || `custom-watch-${index}`),
                            hotelName,
                            roomName,
                            description: String(item?.description || '').trim() || 'The view is very beautiful',
                            hotelAvatar: item?.hotelAvatar || resolveHotelAvatar(hotelName, rawImage),
                            userAvatar: STAFF_MEDIA.USER_PLACEHOLDER,
                            userName: String(item?.userName || userName).trim(),
                            image: rawImage,
                            createdAt: item?.createdAt || new Date().toISOString(),
                        };
                    });

                    const merged = [...mappedCustomPosts, ...mapped];

                    if (mounted) {
                        setLockets(merged);
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
        setTimeout(() => {
            setIsRefreshing(false);
        }, 600);
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

    const handlePickFromLibrary = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Library permission required', 'Please allow photo library permission to choose an image.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
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
            userAvatar: STAFF_MEDIA.USER_PLACEHOLDER,
            userName: currentUser.name || 'Guest',
            image: draftImageUri,
            createdAt: new Date().toISOString(),
        };

        setLockets((prev) => [createdPost, ...prev]);

        try {
            const rawCustomPosts = await AsyncStorage.getItem(WATCHLIST_CUSTOM_POSTS_KEY);
            const parsedCustomPosts = rawCustomPosts ? JSON.parse(rawCustomPosts) : [];
            const safeCustomPosts = Array.isArray(parsedCustomPosts)
                ? parsedCustomPosts.filter((item) => item && typeof item === 'object')
                : [];

            const persistedPost = {
                id,
                bookingId: normalizeBookingId(matchedBooking.bookingId),
                hotelName: matchedBooking.hotelName,
                roomName: matchedBooking.roomName,
                description: content,
                hotelAvatar: resolveHotelAvatar(matchedBooking.hotelName, draftImageUri),
                image: draftImageUri,
                userName: currentUser.name || 'Guest',
                customerEmail: currentUser.email || '',
                createdAt: new Date().toISOString(),
            };

            await CustomerService.createWatchlistPost(persistedPost);

            await AsyncStorage.setItem(WATCHLIST_CUSTOM_POSTS_KEY, JSON.stringify([persistedPost, ...safeCustomPosts]));
        } catch {
            // Keep optimistic UI even if local persistence fails.
        }

        handleCloseComposer();
    };

    return (
        <SafeAreaView style={styles.page}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.pageScrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={['#5b79df']}
                        tintColor="#5b79df"
                    />
                }
            >
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
                    <Image source={require('../../../assets/images/hotels/Logo-AI.png')} style={styles.aiSearchIcon}/>
                    <TextInput
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="AI will find room you want"
                        placeholderTextColor="#8e8e8e"
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
                            value={filterQuery}
                            onChangeText={setFilterQuery}
                            placeholder="You can find by hotel or provice"
                            placeholderTextColor="#999"
                            style={styles.filterSearchInput}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.addPostButton}
                        onPress={() => navigation.navigate('CustomerAddPostScreen')}
                        activeOpacity={0.88}
                    >
                        <Ionicons name="camera" size={17} color="#0f1b3f"/>
                        <Text style={styles.addPostButtonText}>Add post</Text>
                    </TouchableOpacity>

                    <View style={styles.scrollContent}>
                        {filteredLockets.length
                            ? filteredLockets.map((item) => <LocketCard key={item.id} item={item} nowMs={nowMs}/>)
                            : <Text style={styles.emptyText}>No watchlist item matches your keyword.</Text>}
                    </View>
                </View>
            </ScrollView>

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
                                    <TouchableOpacity style={styles.photoActionBtn} onPress={handlePickFromLibrary} activeOpacity={0.86}>
                                        <Ionicons name="images-outline" size={18} color="#15398d"/>
                                        <Text style={styles.photoActionText}>Choose photo</Text>
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

            <CustomerBottomTabBar navigation={navigation} activeTab="Watchlist"/>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#fff',
    },
    pageScrollContent: {
        paddingBottom: 98,
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
        width: 30,
        height: 30,
        resizeMode: 'contain',
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
        color: '#8e8e8e',
        paddingVertical: 0,
        includeFontPadding: false,
        textAlignVertical: 'center',
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
