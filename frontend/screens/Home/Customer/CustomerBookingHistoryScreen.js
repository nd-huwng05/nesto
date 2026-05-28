import React, {useEffect, useMemo, useState} from 'react';
import {Alert, Animated, Image, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';
import {LinearGradient} from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {getSession} from '../../../utils/authStorage';
import {displayBookingId} from '../../../utils/bookingId';
import {getUnreadCustomerNotificationCount, pushCustomerNotification} from '../../../services/NotificationService';
import {fetchMyBookings} from '../../../services/CustomerBookingService';
import {createReview, fetchReviews, toggleReviewHeart} from '../../../services/ReviewService';
import Avatar from '../../../components/common/Avatar';

const HISTORY_BOOKINGS_KEY = 'customer_paid_history_bookings';
const UPCOMING_BOOKINGS_KEY = 'customer_paid_upcoming_bookings';
const HOTEL_RATINGS_KEY = 'customer_hotel_ratings';
const REVIEW_FORUM_KEY = 'customer_room_review_forum_posts';
const BOOKING_TEST_RESET_FLAG = 'customer_booking_test_reset_done_v4';
const DEFAULT_BOOKING_IMAGE = STAFF_MEDIA.ROOM_IMAGE;
const ANDROID_REFRESH_TOP_OFFSET = -170;
const formatUsd = (amount) => Number(amount || 0).toLocaleString('en-US');

const normalizeBookingId = (value) => String(value || '').trim().toUpperCase().replace(/^#/, '');
const FORCE_REMOVED_BOOKING_IDS = new Set(['BK296489']);

const normalizeReviewScopePart = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const buildReviewScope = (item) => {
    const hotelName = String(item?.hotelName || item?.roomCode || '').trim();
    const roomName = String(item?.roomName || '').trim();
    const scopeKey = `${normalizeReviewScopePart(hotelName)}::${normalizeReviewScopePart(roomName)}`;

    return {
        hotelName,
        roomName,
        scopeKey,
    };
};

const formatRelativeTime = (isoTime, nowMs) => {
    const timeMs = Date.parse(String(isoTime || ''));
    if (!Number.isFinite(timeMs)) return 'Just now';

    const diffSeconds = Math.max(0, Math.floor((nowMs - timeMs) / 1000));
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
};

const normalizeReviewPost = (post) => {
    const likedByIds = Array.isArray(post?.liked_by_ids)
        ? post.liked_by_ids
        : Array.isArray(post?.likedBy)
        ? post.likedBy
        : [];

    return {
        id: String(post?.id || ''),
        bookingId: String(post?.booking_id || post?.bookingId || '').trim(),
        scopeKey: String(post?.scope_key || post?.scopeKey || '').trim(),
        hotelName: String(post?.hotel_name || post?.hotelName || '').trim(),
        roomName: String(post?.room_name || post?.roomName || '').trim(),
        content: String(post?.content || '').trim(),
        authorName: String(post?.author_name || post?.authorName || 'Guest').trim() || 'Guest',
        authorEmail: String(post?.author_email || post?.authorEmail || '').trim().toLowerCase(),
        createdAt: String(post?.created_at || post?.createdAt || new Date().toISOString()),
        likedBy: likedByIds.map((value) => String(value || '').trim()).filter(Boolean),
        heartsCount: Number(post?.hearts_count ?? post?.heartsCount ?? likedByIds.length) || 0,
        likedByMe: Boolean(post?.liked_by_me ?? post?.likedByMe ?? false),
    };
};

const readAmountIfPresent = (source, key) => {
    if (!source || typeof source !== 'object' || !(key in source)) return null;

    const parsed = Number(source[key]);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(0, parsed);
};

const deriveRemainingAmountFromRecords = (records) => {
    if (!Array.isArray(records) || records.length === 0) return 0;

    const snapshots = records
        .map((record) => {
            if (!record || typeof record !== 'object') return null;

            const explicitRemaining =
                readAmountIfPresent(record, 'remainingAmount') ??
                readAmountIfPresent(record?.invoiceDetails, 'remainingAmount');
            const totalAmount =
                readAmountIfPresent(record, 'totalAmount') ??
                readAmountIfPresent(record?.invoiceDetails, 'totalAmount');
            const paidAmount =
                readAmountIfPresent(record, 'paidAmount') ??
                readAmountIfPresent(record?.invoiceDetails, 'paidAmount');

            const computedRemaining =
                totalAmount !== null ? Math.max(0, Number((totalAmount - (paidAmount || 0)).toFixed(2))) : null;

            const resolvedRemaining = explicitRemaining !== null ? explicitRemaining : computedRemaining;
            if (resolvedRemaining === null) return null;

            const sortTime = Date.parse(
                record?.paidAt ||
                record?.updatedAt ||
                record?.checkedOutAt ||
                record?.createdAt ||
                0
            ) || 0;

            return {
                sortTime,
                remainingAmount: Math.max(0, Number(resolvedRemaining || 0)),
            };
        })
        .filter(Boolean)
        .sort((left, right) => right.sortTime - left.sortTime);

    if (!snapshots.length) return 0;
    return snapshots[0].remainingAmount;
};

const resolveImageSource = (image) => {
    if (typeof image === 'number') return image;
    if (typeof image === 'string' && image.trim().length > 0) return {uri: image};
    if (image && typeof image === 'object' && typeof image.uri === 'string') {
        return {uri: image.uri};
    }
    return DEFAULT_BOOKING_IMAGE;
};

const toImageUri = (image) => {
    if (typeof image === 'string' && image.trim().length > 0) return image;
    if (typeof image === 'number') return Image.resolveAssetSource(image)?.uri || '';
    if (image && typeof image === 'object' && typeof image.uri === 'string') return image.uri;
    return '';
};

const parseDateFromAny = (value) => {
    if (!value) return null;

    if (value instanceof Date && Number.isFinite(value.getTime())) {
        return value;
    }

    const text = String(value).trim();
    if (!text) return null;

    const ddmmyyyy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
        const day = Number.parseInt(ddmmyyyy[1], 10);
        const month = Number.parseInt(ddmmyyyy[2], 10) - 1;
        const year = Number.parseInt(ddmmyyyy[3], 10);
        const parsed = new Date(year, month, day);
        return Number.isFinite(parsed.getTime()) ? parsed : null;
    }

    const shortMonth = text.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    if (shortMonth) {
        const monthMap = {
            jan: 0,
            feb: 1,
            mar: 2,
            apr: 3,
            may: 4,
            jun: 5,
            jul: 6,
            aug: 7,
            sep: 8,
            oct: 9,
            nov: 10,
            dec: 11,
        };

        const day = Number.parseInt(shortMonth[1], 10);
        const month = monthMap[String(shortMonth[2]).toLowerCase()];
        const year = Number.parseInt(shortMonth[3], 10);
        if (Number.isInteger(month)) {
            const parsed = new Date(year, month, day);
            return Number.isFinite(parsed.getTime()) ? parsed : null;
        }
    }

    const isoParsed = new Date(text);
    return Number.isFinite(isoParsed.getTime()) ? isoParsed : null;
};

const toIsoFromDateLike = (value) => {
    const parsed = parseDateFromAny(value);
    if (!parsed) return '';
    return parsed.toISOString();
};

const getIsoFromHistoryItem = (item, kind) => {
    const isStart = kind === 'start';
    const isoKey = isStart ? 'checkInDateIso' : 'checkOutDateIso';
    const labelKey = isStart ? 'checkInLabel' : 'checkOutLabel';
    const rawKey = isStart ? 'checkIn' : 'checkOut';

    const directIso = toIsoFromDateLike(item?.[isoKey]);
    if (directIso) return directIso;

    const fromLabel = toIsoFromDateLike(item?.[labelKey]);
    if (fromLabel) return fromLabel;

    const fromRaw = toIsoFromDateLike(item?.[rawKey]);
    if (fromRaw) return fromRaw;

    const stayDate = String(item?.stayDate || '').trim();
    if (stayDate.includes('-')) {
        const [left, right] = stayDate.split('-').map((part) => part.trim());
        const fromStay = toIsoFromDateLike(isStart ? left : right);
        if (fromStay) return fromStay;
    }

    return '';
};

const formatDateLabel = (dateValue) => {
    const parsed = parseDateFromAny(dateValue);
    if (!parsed) return 'N/A';

    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
};

const deriveStatusType = (startDate, endDate, rawStatus, forceComplete) => {
    if (forceComplete) return 'complete';

    const statusText = String(rawStatus || '').trim().toLowerCase();
    if (statusText.includes('checked out')) return 'complete';

    return 'staying';
};

function HistoryBookingCard({item, onCopyBookingId, onReviewPress, onPrimaryPress}) {
    const overlayTag = String(item?.roomCode || 'Reservation').trim();
    const overlayTitle = String(item?.roomName || 'Room').trim();
    const isComplete = item?.statusType === 'complete';
    const primaryLabel = isComplete ? 'Book again' : 'Check out';

    return (
        <View style={styles.bookingCardWrap}>
            <View style={styles.imageSection}>
                <Image source={resolveImageSource(item.image)} style={styles.bookingImage} resizeMode="cover"/>
                <LinearGradient
                    colors={['rgba(5, 12, 25, 0.03)', 'rgba(5, 12, 25, 0.72)']}
                    start={{x: 0.5, y: 0.2}}
                    end={{x: 0.5, y: 1}}
                    style={styles.imageGradient}
                />
                <View style={styles.imageOverlayTextWrap}>
                    <Text style={styles.imageOverlayTag}>{overlayTag}</Text>
                    <Text style={styles.imageOverlayTitle} numberOfLines={1}>{overlayTitle}</Text>
                </View>
                <View style={[styles.statusBadge, !isComplete ? styles.statusBadgeStaying : null]}>
                    <Text style={[styles.statusText, !isComplete ? styles.statusTextStaying : null]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.infoSection}>
                <Text style={styles.roomCode}>{item.roomCode}</Text>
                <Text style={styles.roomName}>{item.roomName}</Text>
                <TouchableOpacity
                    style={styles.metaRow}
                    activeOpacity={0.9}
                    onLongPress={() => onCopyBookingId?.(item?.bookingId)}
                    delayLongPress={220}
                >
                    <Text style={styles.metaLabel}>Booking ID: </Text>
                    <Text style={styles.metaValue}>{displayBookingId(item.bookingId)}</Text>
                </TouchableOpacity>
                <Text style={styles.stayDateText}>Stay: {item.stayDate}</Text>
            </View>

            <View style={styles.actionRow}>
                <AnimatedActionButton variant="secondary" label="Review" onPress={() => onReviewPress?.(item)}/>
                <AnimatedActionButton variant="primary" label={primaryLabel} onPress={() => onPrimaryPress?.(item)}/>
            </View>
        </View>
    );
}

function AnimatedActionButton({variant, label, onPress}) {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const animateTo = (value) => {
        Animated.spring(scaleAnim, {
            toValue: value,
            speed: 25,
            bounciness: 4,
            useNativeDriver: true,
        }).start();
    };

    const isPrimary = variant === 'primary';

    return (
        <Animated.View style={[styles.actionBtnAnimatedWrap, {transform: [{scale: scaleAnim}]}]}>
            <TouchableOpacity
                style={isPrimary ? styles.actionBtnPrimary : styles.actionBtnSecondary}
                activeOpacity={0.92}
                onPressIn={() => animateTo(0.96)}
                onPressOut={() => animateTo(1)}
                onPress={onPress}
            >
                <Text style={isPrimary ? styles.actionBtnPrimaryText : styles.actionBtnSecondaryText}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function CustomerBookingHistoryScreen({navigation}) {
    const [bookings, setBookings] = useState([]);
    const [activeTab, setActiveTab] = useState('History');
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
    const [checkoutRating, setCheckoutRating] = useState(0);
    const [pendingCheckoutItem, setPendingCheckoutItem] = useState(null);
    const [thankYouModalVisible, setThankYouModalVisible] = useState(false);
    const [paymentRequiredModalVisible, setPaymentRequiredModalVisible] = useState(false);
    const [paymentRequiredAmount, setPaymentRequiredAmount] = useState(0);
    const [paymentRequiredBooking, setPaymentRequiredBooking] = useState(null);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarName, setAvatarName] = useState('');
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [reviewTargetScope, setReviewTargetScope] = useState(null);
    const [reviewDraft, setReviewDraft] = useState('');
    const [reviewPosts, setReviewPosts] = useState([]);
    const [reviewViewer, setReviewViewer] = useState({
        id: '',
        name: 'Guest',
        email: '',
    });
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewNow, setReviewNow] = useState(Date.now());

    useEffect(() => {
        if (!reviewModalVisible) return undefined;

        const timer = setInterval(() => {
            setReviewNow(Date.now());
        }, 30000);

        return () => clearInterval(timer);
    }, [reviewModalVisible]);

    const loadReviewPostsByScope = async (scope) => {
        const scopeKey = String(scope?.scopeKey || '').trim();
        if (!scopeKey) return [];

        try {
            const res = await fetchReviews({hotelName: scope.hotelName, roomName: scope.roomName});
            const remotePosts = res.status === 'success' && Array.isArray(res.data) ? res.data : [];
            const normalizedRemote = remotePosts
                .map(normalizeReviewPost)
                .filter((post) => post.scopeKey === scopeKey)
                .sort((left, right) => (Date.parse(right?.createdAt || 0) || 0) - (Date.parse(left?.createdAt || 0) || 0));
            return normalizedRemote;
        } catch {
            return [];
        }
    };

    useEffect(() => {
        if (!reviewModalVisible || !reviewTargetScope?.scopeKey) return undefined;

        let mounted = true;
        const refresh = async () => {
            try {
                const scopedPosts = await loadReviewPostsByScope(reviewTargetScope);
                if (mounted) setReviewPosts(scopedPosts);
            } catch {
                if (mounted) setReviewPosts([]);
            }
        };

        refresh();
        const timer = setInterval(refresh, 20000);

        return () => {
            mounted = false;
            clearInterval(timer);
        };
    }, [reviewModalVisible, reviewTargetScope]);

    const handleRefresh = React.useCallback(() => {
        setIsRefreshing(true);
        setIsRefreshing(false);
    }, []);

    const handleCopyBookingId = async (bookingId) => {
        const value = String(bookingId || '').trim();
        if (!value) return;

        try {
            await Clipboard.setStringAsync(value);
            Alert.alert('Copied', `You have saved ${value} to clipboard cache.`);
        } catch {
            Alert.alert('Copy failed', 'Unable to copy Booking ID. Please try again.');
        }
    };

    const closeReviewModal = () => {
        setReviewModalVisible(false);
        setReviewDraft('');
        setReviewPosts([]);
        setReviewTargetScope(null);
    };

    const handleReviewPress = async (item) => {
        const nextScope = buildReviewScope(item);
        if (!nextScope.scopeKey || !nextScope.hotelName || !nextScope.roomName) {
            Alert.alert('Review', 'Unable to open review forum for this booking.');
            return;
        }

        navigation.navigate('CustomerReviewScreen', {
            hotelName: nextScope.hotelName,
            roomName: nextScope.roomName,
            roomCode: String(item?.roomCode || '').trim(),
            bookingId: String(item?.bookingId || '').trim(),
        });
    };

    const handleSubmitReview = async () => {
        const scope = reviewTargetScope;
        const content = reviewDraft.trim();

        if (!scope?.scopeKey) {
            Alert.alert('Review', 'Review scope is missing. Please try again.');
            return;
        }
        if (content.length < 8) {
            Alert.alert('Review', 'Please write at least 8 characters for your review.');
            return;
        }

        try {
            const res = await createReview({
                bookingId: '',
                hotelName: scope.hotelName,
                roomName: scope.roomName,
                content,
                rating: 5,
                imageUrl: '',
            });
            if (res.status !== 'success') {
                Alert.alert('Review', res.message || 'Unable to submit your review right now. Please try again.');
                return;
            }
            setReviewDraft('');
            setReviewNow(Date.now());
            setReviewPosts(await loadReviewPostsByScope(scope));
        } catch (error) {
            Alert.alert('Review', String(error?.message || 'Unable to submit your review right now. Please try again.'));
        }
    };

    const handleToggleReviewLike = async (postId) => {
        const scope = reviewTargetScope;
        if (!scope?.scopeKey || !postId) return;

        try {
            const res = await toggleReviewHeart(postId);
            if (res.status !== 'success') {
                Alert.alert('Review', res.message || 'Unable to update reaction right now. Please try again.');
                return;
            }
            const normalizedPost = normalizeReviewPost(res.data || {});

            setReviewPosts((prev) => prev.map((post) => (
                String(post?.id) === String(postId) ? normalizedPost : post
            )));
        } catch (error) {
            Alert.alert('Review', String(error?.message || 'Unable to update reaction right now. Please try again.'));
        }
    };

    const getOutstandingAmountByBookingId = async (bookingId) => {
        return 0;
    };

    const persistCheckoutComplete = async (bookingId, bookingFallback = null) => {
        return;
    };

    const closeCheckoutModal = () => {
        setCheckoutModalVisible(false);
        setCheckoutRating(0);
        setPendingCheckoutItem(null);
    };

    const openPaymentRequiredModal = (item, amount) => {
        setPaymentRequiredBooking(item || null);
        setPaymentRequiredAmount(Math.max(0, Number(amount || 0)));
        setPaymentRequiredModalVisible(true);
    };

    const closePaymentRequiredModal = () => {
        setPaymentRequiredModalVisible(false);
        setPaymentRequiredAmount(0);
        setPaymentRequiredBooking(null);
    };

    const handleGoToPaymentFromModal = () => {
        const item = paymentRequiredBooking;
        if (!item) {
            closePaymentRequiredModal();
            return;
        }

        const bookingId = String(item?.bookingId || '').trim();
        closePaymentRequiredModal();

        navigation.navigate('CustomerBookingUpcomingScreen', {
            openPaymentForm: true,
            openPaymentBookingId: bookingId,
            openPaymentBooking: {
                id: bookingId ? `${bookingId}-payment` : `payment-${Date.now()}`,
                bookingId,
                hotelName: item?.hotelName || item?.roomCode,
                roomName: item?.roomName,
                image: toImageUri(item?.image),
                checkIn: item?.checkInLabel || item?.checkIn || '',
                checkOut: item?.checkOutLabel || item?.checkOut || '',
                checkInDateIso: item?.checkInDateIso || '',
                checkOutDateIso: item?.checkOutDateIso || '',
                actionType: 'payment',
                actionLabel: 'Payment',
                paymentStatus: paymentRequiredAmount > 0 ? 'pending' : 'completed',
                paymentMethod: item?.paymentMethod || 'momo',
                totalAmount: Number(item?.totalAmount || 0),
                paidAmount: Number(item?.paidAmount || 0),
                remainingAmount: Math.max(0, Number(paymentRequiredAmount || item?.remainingAmount || 0)),
                depositAmount: Number(item?.depositAmount || 0),
                subtotalPrice: Number(item?.subtotalPrice || 0),
                vatAmount: Number(item?.vatAmount || 0),
                selectedService: item?.selectedService || null,
                selectedServices: Array.isArray(item?.selectedServices) ? item.selectedServices : [],
                invoiceDetails: item?.invoiceDetails || null,
            },
        });
    };

    const persistHotelRating = async () => {
        return;
    };

    const handleSubmitCheckoutRating = async () => {
        const item = pendingCheckoutItem;
        if (!item) {
            closeCheckoutModal();
            return;
        }

        if (checkoutRating <= 0) {
            Alert.alert('Rating required', 'Please choose a star rating before checkout.');
            return;
        }

        try {
            await persistHotelRating(item, checkoutRating);
        } catch {
            Alert.alert('Rating', 'Unable to save your rating right now. Please try again.');
            return;
        }

        try {
            await persistCheckoutComplete(item?.bookingId, item);
        } catch {
            Alert.alert('Check out', 'Unable to update checkout status right now. Please try again.');
            return;
        }

        setBookings((prev) => prev.map((booking) => {
            if (String(booking?.bookingId || '') !== String(item?.bookingId || '')) return booking;
            return {
                ...booking,
                statusType: 'complete',
                status: 'Complete',
            };
        }));

        await pushCustomerNotification({
            title: 'Checked out successfully',
            type: 'checkout',
            message: `You checked out booking ${String(item?.bookingId || '').trim()} at ${String(item?.hotelName || item?.roomCode || 'Hotel')} - ${String(item?.roomName || 'Room')}.`,
            meta: {
                bookingId: String(item?.bookingId || '').trim(),
                hotelName: String(item?.hotelName || item?.roomCode || '').trim(),
                roomName: String(item?.roomName || '').trim(),
            },
        });
        setUnreadNotificationCount(await getUnreadCustomerNotificationCount());

        closeCheckoutModal();
        setThankYouModalVisible(true);
    };

    const handlePrimaryPress = async (item) => {
        if (item?.statusType === 'complete') {
            const startDateIso = getIsoFromHistoryItem(item, 'start');
            const endDateIso = getIsoFromHistoryItem(item, 'end');
            const selectedServices = Array.isArray(item?.selectedServices) ? item.selectedServices : [];

            navigation.push('CustomerBookingScreen', {
                syncToken: `rebook-${Date.now()}`,
                hotelName: item?.hotelName || item?.roomCode || 'Hotel',
                roomName: item?.roomName || 'Room',
                heroImage: toImageUri(item?.image),
                startDateIso,
                endDateIso,
                checkIn: item?.checkInLabel || item?.checkIn || '',
                checkOut: item?.checkOutLabel || item?.checkOut || '',
                hotelAddress: item?.hotelAddress || '',
                selectedService: item?.selectedService || selectedServices[0] || null,
                selectedServices,
                totalAmount: Number(item?.totalAmount || 0),
                depositAmount: Number(item?.depositAmount || 0),
                subtotalPrice: Number(item?.subtotalPrice || 0),
                vatAmount: Number(item?.vatAmount || 0),
            });
            return;
        }

        let remainingAmount = Math.max(0, Number(item?.remainingAmount || 0));
        try {
            const outstandingAmount = await getOutstandingAmountByBookingId(item?.bookingId);
            if (Number.isFinite(outstandingAmount)) {
                remainingAmount = Math.max(0, Number(outstandingAmount || 0));
            }
        } catch {
            // Keep fallback value from UI state when storage read fails.
        }

        if (remainingAmount > 0) {
            openPaymentRequiredModal(item, remainingAmount);
            return;
        }

        setPendingCheckoutItem(item);
        setCheckoutRating(0);
        setCheckoutModalVisible(true);
    };

    useFocusEffect(
        React.useCallback(() => {
            let mounted = true;

            const loadHistoryBookings = async () => {
                try {
                    const res = await fetchMyBookings();
                    const apiRows = res.status === 'success' && Array.isArray(res.data) ? res.data : [];
                    const mergedBookings = apiRows.map((b, index) => {
                        const bookingId = String(b?.bookingCode || '');
                        const hotelName = String(b?.hotel_name || 'Hotel');
                        const roomName = String(b?.roomType || 'Room');
                        const checkInIso = String(b?.check_in_at || '');
                        const checkOutIso = String(b?.check_out_at || b?.expected_check_out_at || '');
                        const statusRaw = String(b?.status || '').toUpperCase();
                        const statusType = statusRaw === 'CHECKED_OUT' ? 'complete' : 'staying';
                        return {
                            id: `history-api-${bookingId || b?.id || index}`,
                            bookingId,
                            hotelName,
                            roomCode: hotelName,
                            roomName,
                            image: DEFAULT_BOOKING_IMAGE,
                            checkInLabel: formatDateLabel(checkInIso),
                            checkOutLabel: formatDateLabel(checkOutIso),
                            checkInDateIso: checkInIso,
                            checkOutDateIso: checkOutIso,
                            stayDate: `${formatDateLabel(checkInIso)} - ${formatDateLabel(checkOutIso)}`,
                            checkoutCompleted: statusRaw === 'CHECKED_OUT',
                            statusType,
                            status: statusType === 'complete' ? 'Complete' : 'Staying',
                            remainingAmount: 0,
                            totalAmount: Number(b?.basePrice || 0),
                            depositAmount: 0,
                            subtotalPrice: Number(b?.basePrice || 0),
                            vatAmount: 0,
                            selectedServices: [],
                            selectedService: null,
                            sortTime: Date.parse(String(b?.updated_at || b?.created_at || '')) || 0,
                        };
                    }).filter((item) => !FORCE_REMOVED_BOOKING_IDS.has(normalizeBookingId(item?.bookingId)));

                    const orderedItems = [...mergedBookings].sort((left, right) => right.sortTime - left.sortTime);

                    if (mounted) {
                        setBookings(orderedItems);
                        const unreadCount = await getUnreadCustomerNotificationCount();
                        setUnreadNotificationCount(unreadCount);
                    }
                } catch {
                    if (mounted) {
                        setBookings([]);
                        setUnreadNotificationCount(0);
                    }
                }
            };

            loadHistoryBookings();
            getSession()
                .then((session) => {
                    setAvatarUrl(String(session?.user?.avatar || '').trim());
                    setAvatarName(String(session?.user?.name || session?.user?.full_name || session?.user?.email || '').trim());
                })
                .catch(() => {
                    setAvatarUrl('');
                    setAvatarName('');
                });

            return () => {
                mounted = false;
            };
        }, [])
    );

    const filteredBookings = useMemo(() => {
        const keyword = searchQuery.trim().toLowerCase();
        if (!keyword) return bookings;

        return bookings.filter((item) => {
            const haystack = `${item?.roomName || ''} ${item?.roomCode || ''} ${item?.bookingId || ''} ${item?.stayDate || ''} ${item?.status || ''}`.toLowerCase();
            return haystack.includes(keyword);
        });
    }, [bookings, searchQuery]);

    return (
        <SafeAreaView style={styles.page}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.currentLabel}>Current Location</Text>
                    <Text style={styles.currentValue}>Unknown location</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.bellWrap} onPress={() => navigation.navigate('CustomerNotificationsScreen')}>
                        <Ionicons name="notifications" size={19} color="#1f1f1f"/>
                        {unreadNotificationCount > 0 ? (
                            <View style={styles.alertBadge}>
                                <Text style={styles.alertBadgeText}>{`+${Math.min(unreadNotificationCount, 99)}`}</Text>
                            </View>
                        ) : null}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('CustomerProfileScreen')}>
                        <Avatar uri={avatarUrl} name={avatarName} size={30} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchWrap}>
                <View style={styles.aiIconWrap}>
                    <Ionicons name="sparkles" size={16} color="#6a74ff"/>
                </View>
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

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={['#5b79df']}
                        tintColor="#5b79df"
                        progressViewOffset={Platform.OS === 'android' ? ANDROID_REFRESH_TOP_OFFSET : 0}
                    />
                }
            >
                {activeTab === 'History'
                    ? filteredBookings.length
                        ? filteredBookings.map((item) => (
                            <HistoryBookingCard
                                key={item.id}
                                item={item}
                                onCopyBookingId={handleCopyBookingId}
                                onReviewPress={handleReviewPress}
                                onPrimaryPress={handlePrimaryPress}
                            />
                        ))
                        : <Text style={styles.emptyText}>{searchQuery.trim() ? 'No booking history matches your keyword.' : 'No booking history yet. Your paid bookings will appear here.'}</Text>
                    : <Text style={styles.emptyText}>No upcoming bookings.</Text>}
            </ScrollView>

            <Modal
                visible={checkoutModalVisible}
                transparent
                animationType="fade"
                onRequestClose={closeCheckoutModal}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Confirm check out</Text>
                        <Text style={styles.modalMessage}>
                            Are you sure you want to check out {String(pendingCheckoutItem?.roomName || 'this room')}?
                        </Text>

                        <Text style={styles.ratingLabel}>Rate your stay</Text>
                        <View style={styles.ratingRow}>
                            {[1, 2, 3, 4, 5].map((star) => {
                                const selected = star <= checkoutRating;
                                return (
                                    <TouchableOpacity
                                        key={star}
                                        onPress={() => setCheckoutRating(star)}
                                        style={styles.ratingStarBtn}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons
                                            name={selected ? 'star' : 'star-outline'}
                                            size={28}
                                            color={selected ? '#f6b100' : '#b9beca'}
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={closeCheckoutModal}>
                                <Text style={styles.modalCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalSubmitBtn, checkoutRating <= 0 ? styles.modalSubmitBtnDisabled : null]}
                                onPress={handleSubmitCheckoutRating}
                                disabled={checkoutRating <= 0}
                            >
                                <Text style={styles.modalSubmitBtnText}>Submit rating & Check out</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={paymentRequiredModalVisible}
                transparent
                animationType="fade"
                onRequestClose={closePaymentRequiredModal}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.paymentRequiredCard}>
                        <Text style={styles.paymentRequiredTitle}>Payment required</Text>
                        <Text style={styles.paymentRequiredMessage}>
                            Customer has not fully paid. Remaining amount: {formatUsd(paymentRequiredAmount)} USD.
                        </Text>

                        <View style={styles.paymentRequiredActions}>
                            <TouchableOpacity
                                style={styles.paymentRequiredCancelBtn}
                                onPress={closePaymentRequiredModal}
                                activeOpacity={0.88}
                            >
                                <Text style={styles.paymentRequiredCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.paymentRequiredGoBtn}
                                onPress={handleGoToPaymentFromModal}
                                activeOpacity={0.88}
                            >
                                <Text style={styles.paymentRequiredGoText}>Go to payment</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={thankYouModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setThankYouModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.thankYouCard}>
                        <View style={styles.thankYouIconWrap}>
                            <Ionicons name="checkmark-circle" size={58} color="#26a269"/>
                        </View>
                        <Text style={styles.thankYouTitle}>Thank you!</Text>
                        <Text style={styles.thankYouMessage}>
                            Thank you for using our service. We hope to see you again soon!
                        </Text>
                        <TouchableOpacity
                            style={styles.thankYouBtn}
                            onPress={() => setThankYouModalVisible(false)}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.thankYouBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={reviewModalVisible}
                transparent
                animationType="slide"
                onRequestClose={closeReviewModal}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.reviewModalCard}>
                        <View style={styles.reviewHeaderRow}>
                            <View style={styles.reviewHeaderTextWrap}>
                                <Text style={styles.reviewTitle}>Review Forum</Text>
                                <Text style={styles.reviewSubtitle} numberOfLines={2}>
                                    {String(reviewTargetScope?.hotelName || 'Hotel')} • {String(reviewTargetScope?.roomName || 'Room')}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.reviewCloseBtn} onPress={closeReviewModal}>
                                <Ionicons name="close" size={18} color="#4f5568"/>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.reviewScopeHint}>
                            Only guests who booked this same hotel and room type can view and interact with these reviews.
                        </Text>

                        <View style={styles.reviewComposerWrap}>
                            <TextInput
                                value={reviewDraft}
                                onChangeText={setReviewDraft}
                                style={styles.reviewComposerInput}
                                placeholder="Share your experience, for example: clean room, friendly staff, tasty food..."
                                placeholderTextColor="#9398a8"
                                multiline
                                textAlignVertical="top"
                            />
                            <TouchableOpacity
                                style={[styles.reviewSubmitBtn, reviewDraft.trim().length < 8 ? styles.reviewSubmitBtnDisabled : null]}
                                onPress={handleSubmitReview}
                                disabled={reviewDraft.trim().length < 8}
                                activeOpacity={0.9}
                            >
                                <Text style={styles.reviewSubmitBtnText}>Post Review</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.reviewList}
                            contentContainerStyle={styles.reviewListContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {reviewLoading ? (
                                <Text style={styles.reviewEmptyText}>Loading reviews...</Text>
                            ) : reviewPosts.length ? reviewPosts.map((post) => {
                                const likedBy = Array.isArray(post?.likedBy) ? post.likedBy : [];
                                const isLiked = Boolean(post?.likedByMe) || likedBy.includes(String(reviewViewer?.id || '').trim().toLowerCase());
                                const heartsCount = Number(post?.heartsCount ?? likedBy.length) || 0;

                                return (
                                    <View key={post.id} style={styles.reviewPostCard}>
                                        <View style={styles.reviewPostTopRow}>
                                            <Text style={styles.reviewPostAuthor}>{post?.authorName || 'Guest'}</Text>
                                            <Text style={styles.reviewPostTime}>{formatRelativeTime(post?.createdAt, reviewNow)}</Text>
                                        </View>
                                        <Text style={styles.reviewPostContent}>{String(post?.content || '').trim()}</Text>
                                        <TouchableOpacity
                                            style={styles.reviewLikeBtn}
                                            onPress={() => handleToggleReviewLike(post?.id)}
                                            activeOpacity={0.85}
                                        >
                                            <Ionicons
                                                name={isLiked ? 'heart' : 'heart-outline'}
                                                size={18}
                                                color={isLiked ? '#ef4d7a' : '#6e7486'}
                                            />
                                            <Text style={[styles.reviewLikeText, isLiked ? styles.reviewLikeTextActive : null]}>
                                                {heartsCount} {heartsCount === 1 ? 'heart' : 'hearts'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            }) : (
                                <Text style={styles.reviewEmptyText}>No reviews yet for this hotel and room type. Be the first to share!</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

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
        fontSize: 12,
        color: '#383838',
    },
    currentValue: {
        fontFamily: 'SF-Bold',
        fontSize: 20,
        lineHeight: 24,
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
    alertBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ff3b30',
        position: 'absolute',
        top: 1,
        right: -2,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f2f2f2',
    },
    alertBadgeText: {
        fontFamily: 'SF-Bold',
        fontSize: 9,
        color: '#fff',
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
    aiIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 12,
        backgroundColor: 'rgba(130,148,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: 'SF-Regular',
        fontSize: 14,
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
        fontSize: 15,
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
        marginBottom: 14,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: {width: 0, height: 4},
        elevation: 4,
        borderWidth: 1,
        borderColor: '#e9e9ee',
    },
    imageSection: {
        position: 'relative',
        width: '100%',
        height: 132,
        backgroundColor: '#f0f0f0',
    },
    bookingImage: {
        width: '100%',
        height: '100%',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
    },
    imageGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    imageOverlayTextWrap: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
    },
    imageOverlayTag: {
        fontFamily: 'SF-Semibold',
        fontSize: 11,
        color: '#d7e7ff',
        marginBottom: 2,
        letterSpacing: 0.4,
    },
    imageOverlayTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 16,
        color: '#ffffff',
        textShadowColor: 'rgba(0, 0, 0, 0.45)',
        textShadowOffset: {width: 0, height: 1},
        textShadowRadius: 3,
    },
    statusBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: '#d2f2e3',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        zIndex: 10,
    },
    statusText: {
        fontFamily: 'SF-Semibold',
        fontSize: 13,
        color: '#1e7e34',
        letterSpacing: 0.2,
    },
    statusBadgeStaying: {
        backgroundColor: '#ffe9c7',
    },
    statusTextStaying: {
        color: '#c76a00',
    },
    infoSection: {
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#efeff4',
    },
    roomCode: {
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#94949c',
        marginBottom: 8,
        textTransform: 'capitalize',
    },
    roomName: {
        fontFamily: 'SF-Bold',
        fontSize: 18,
        lineHeight: 23,
        color: '#121212',
        marginBottom: 10,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    metaLabel: {
        fontFamily: 'SF-Semibold',
        fontSize: 14,
        color: '#5f5f66',
    },
    metaValue: {
        fontFamily: 'SF-Bold',
        fontSize: 14,
        color: '#4a4a50',
    },
    stayDateText: {
        fontFamily: 'SF-Regular',
        fontSize: 13,
        lineHeight: 18,
        color: '#66666d',
    },
    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 10,
    },
    actionBtnAnimatedWrap: {
        flex: 1,
    },
    actionBtnSecondary: {
        borderWidth: 1.4,
        borderColor: '#3f3f45',
        borderRadius: 18,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnSecondaryText: {
        fontFamily: 'SF-Semibold',
        fontSize: 14,
        color: '#3f3f45',
    },
    actionBtnPrimary: {
        flex: 1,
        backgroundColor: '#8294FF',
        borderRadius: 18,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnPrimaryText: {
        fontFamily: 'SF-Semibold',
        fontSize: 14,
        color: '#fff',
    },
    emptyText: {
        fontFamily: 'SF-Regular',
        color: '#8f8f8f',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 30,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 22,
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 16,
    },
    modalTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 23,
        color: '#171717',
        marginBottom: 8,
    },
    modalMessage: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#50505a',
        marginBottom: 14,
    },
    ratingLabel: {
        fontFamily: 'SF-Semibold',
        fontSize: 16,
        color: '#1f1f28',
        marginBottom: 8,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    ratingStarBtn: {
        marginRight: 6,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    modalCancelBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        borderWidth: 1.2,
        borderColor: '#4a4a50',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelBtnText: {
        fontFamily: 'SF-Semibold',
        fontSize: 14,
        color: '#4a4a50',
    },
    modalSubmitBtn: {
        flex: 1.4,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#8294FF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    modalSubmitBtnDisabled: {
        opacity: 0.55,
    },
    modalSubmitBtnText: {
        fontFamily: 'SF-Semibold',
        fontSize: 13,
        color: '#fff',
        textAlign: 'center',
    },
    thankYouCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 18,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 18,
        alignItems: 'center',
    },
    thankYouIconWrap: {
        width: 78,
        height: 78,
        borderRadius: 999,
        backgroundColor: '#ebf8f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    thankYouTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 26,
        color: '#1a1a1f',
        marginBottom: 8,
    },
    thankYouMessage: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#5c5c67',
        textAlign: 'center',
        marginBottom: 16,
    },
    thankYouBtn: {
        width: '100%',
        height: 46,
        borderRadius: 12,
        backgroundColor: '#8294FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    thankYouBtnText: {
        fontFamily: 'SF-Semibold',
        fontSize: 15,
        color: '#fff',
    },
    reviewModalCard: {
        width: '100%',
        maxHeight: '88%',
        backgroundColor: '#fff',
        borderRadius: 18,
        overflow: 'hidden',
    },
    reviewHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    reviewHeaderTextWrap: {
        flex: 1,
        paddingRight: 12,
    },
    reviewTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 22,
        color: '#191b22',
    },
    reviewSubtitle: {
        marginTop: 4,
        fontFamily: 'SF-Semibold',
        fontSize: 13,
        color: '#5f6678',
    },
    reviewCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3f4f8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    reviewScopeHint: {
        marginTop: 2,
        marginHorizontal: 16,
        marginBottom: 10,
        fontFamily: 'SF-Regular',
        fontSize: 12,
        lineHeight: 17,
        color: '#747b8f',
    },
    reviewComposerWrap: {
        marginHorizontal: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e7e9f2',
        borderRadius: 14,
        padding: 10,
        backgroundColor: '#fafbff',
    },
    reviewComposerInput: {
        minHeight: 88,
        fontFamily: 'SF-Regular',
        fontSize: 14,
        color: '#20242e',
        marginBottom: 10,
    },
    reviewSubmitBtn: {
        height: 40,
        borderRadius: 11,
        backgroundColor: '#8294FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    reviewSubmitBtnDisabled: {
        opacity: 0.5,
    },
    reviewSubmitBtnText: {
        fontFamily: 'SF-Semibold',
        fontSize: 14,
        color: '#fff',
    },
    reviewList: {
        flex: 1,
    },
    reviewListContent: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 16,
        gap: 10,
    },
    reviewPostCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e8ebf3',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    reviewPostTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    reviewPostAuthor: {
        fontFamily: 'SF-Bold',
        fontSize: 14,
        color: '#212530',
    },
    reviewPostTime: {
        fontFamily: 'SF-Regular',
        fontSize: 12,
        color: '#7a8193',
    },
    reviewPostContent: {
        fontFamily: 'SF-Regular',
        fontSize: 14,
        lineHeight: 20,
        color: '#333945',
        marginBottom: 10,
    },
    reviewLikeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingVertical: 2,
    },
    reviewLikeText: {
        fontFamily: 'SF-Semibold',
        fontSize: 12,
        color: '#6e7486',
    },
    reviewLikeTextActive: {
        color: '#ef4d7a',
    },
    reviewEmptyText: {
        marginTop: 22,
        fontFamily: 'SF-Regular',
        fontSize: 13,
        lineHeight: 19,
        color: '#7f8597',
        textAlign: 'center',
    },
    paymentRequiredCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 14,
    },
    paymentRequiredTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 23,
        color: '#1a1a1f',
        marginBottom: 8,
    },
    paymentRequiredMessage: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: '#4e4e58',
        marginBottom: 14,
    },
    paymentRequiredActions: {
        flexDirection: 'row',
        gap: 10,
    },
    paymentRequiredCancelBtn: {
        flex: 1,
        height: 44,
        borderRadius: 12,
        borderWidth: 1.2,
        borderColor: '#4a4a50',
        alignItems: 'center',
        justifyContent: 'center',
    },
    paymentRequiredCancelText: {
        fontFamily: 'SF-Semibold',
        fontSize: 14,
        color: '#4a4a50',
    },
    paymentRequiredGoBtn: {
        flex: 1.3,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#8294FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    paymentRequiredGoText: {
        fontFamily: 'SF-Semibold',
        fontSize: 14,
        color: '#fff',
    },
});
