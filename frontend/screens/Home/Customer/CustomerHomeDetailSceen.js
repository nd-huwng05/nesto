import {useCallback, useEffect, useMemo, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {
    GalleryStrip,
    GuestMemoriesFeed,
    RatingRow,
} from '../../../components/customer/CustomerHotelDetailSections';
import BookingDateTimePicker from '../../../components/booking/BookingDateTimePicker';
import {fetchReviews} from '../../../services/ReviewService';
import {mapReviewsToLocketList} from '../../../utils/locketFeed';
import api, {endpoints} from '../../../configuration/Apis';
import RemoteImage from '../../../components/common/RemoteImage';
import ScreenHeader from '../../../components/common/ScreenHeader';
import {formatVnd} from '../../../utils/formatCurrency';
import {calculateTieredRoomPrice, formatDateTimeLabel, normalizeTierRates} from '../../../utils/roomPricing';
import {useFavorites} from '../../../hooks/customer/useFavorites';

const PRIMARY = '#5b79df';
const PRICE_ACCENT = '#059669';
const SCREEN_BG = '#F5F7FA';

const buildDefaultCheckIn = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0, 0);
};

const buildDefaultCheckOut = (checkIn) => {
    const base = checkIn || buildDefaultCheckIn();
    const next = new Date(base);
    next.setDate(next.getDate() + 1);
    next.setHours(12, 0, 0, 0);
    return next;
};

const cardShadow = Platform.select({
    ios: {
        shadowColor: '#0f172a',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    android: {
        elevation: 2,
    },
    default: {},
});

export function CustomerHomeDetailSceen({navigation, route}) {
    const params = route?.params ?? {};
    const room = params.room ?? {};
    const routeHotelName = params.hotelName ?? '';
    const heroImage = String(params.heroImage ?? room.image ?? '').trim();
    const rating = Number.isFinite(params.rating) ? params.rating : 0;
    const reviews = Number.isFinite(params.reviews) ? params.reviews : 0;

    const detailGallery = useMemo(() => {
        const raw = Array.isArray(params.gallery) ? params.gallery : [];
        const fallback = [room?.image, heroImage].map((x) => String(x || '').trim()).filter(Boolean);
        const merged = [...raw, ...fallback].map((x) => String(x || '').trim()).filter(Boolean);
        return Array.from(new Set(merged));
    }, [params.gallery, room?.image, heroImage]);

    const roomDescription = typeof room.description === 'string' ? room.description.trim() : '';
    const hotelDescription = typeof params.hotelDescription === 'string' ? params.hotelDescription.trim() : '';
    const detailDescription = roomDescription.length ? roomDescription : hotelDescription;
    const [reviewsList, setReviewsList] = useState([]);
    const [isReviewsLoading, setIsReviewsLoading] = useState(false);

    const hotelName = routeHotelName || room?.hotelName || 'Hotel';
    const branchId = params.branchId ?? room?.branchId ?? '';
    const {isFavorite, toggleFavorite} = useFavorites();
    const favorited = isFavorite(branchId);
    const hotelAddress = params.hotelAddress
        ?? params.location
        ?? room?.hotelAddress
        ?? '';

    const loadGuestMemories = useCallback(async () => {
        const safeBranchId = String(branchId || '').trim();
        if (!safeBranchId) {
            setReviewsList([]);
            return;
        }
        setIsReviewsLoading(true);
        try {
            const res = await fetchReviews({
                branchId: safeBranchId,
                hotelName: String(hotelName || '').trim() || undefined,
            });
            if (res?.status !== 'success') {
                setReviewsList([]);
                return;
            }
            const rows = Array.isArray(res?.data) ? res.data : [];
            setReviewsList(mapReviewsToLocketList(rows));
        } catch {
            setReviewsList([]);
        } finally {
            setIsReviewsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        loadGuestMemories();
    }, [loadGuestMemories]);

    const locketData = useMemo(() => reviewsList, [reviewsList]);

    const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
    const DESCRIPTION_PREVIEW_LENGTH = 130;
    const hasLongDescription = detailDescription.length > DESCRIPTION_PREVIEW_LENGTH;
    const previewDescription = hasLongDescription
        ? `${detailDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`
        : detailDescription;
    const [roomTypes, setRoomTypes] = useState([]);
    const [isRoomTypesLoading, setIsRoomTypesLoading] = useState(false);
    const [startDate, setStartDate] = useState(() => buildDefaultCheckIn());
    const [endDate, setEndDate] = useState(() => buildDefaultCheckOut(buildDefaultCheckIn()));
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadRoomTypes = async () => {
        const safeBranchId = String(branchId || '').trim();
        if (!safeBranchId) {
            setRoomTypes([]);
            return;
        }
        setIsRoomTypesLoading(true);
        try {
            const res = await api.get(endpoints['branch-room-types'], {params: {branch_id: safeBranchId}});
            const rows = res?.data?.results || res?.data || [];
            setRoomTypes(Array.isArray(rows) ? rows : []);
        } catch {
            setRoomTypes([]);
            Alert.alert('Rooms', 'Unable to load room types right now. Please try again.');
        } finally {
            setIsRoomTypesLoading(false);
        }
    };

    useEffect(() => {
        loadRoomTypes();
    }, [branchId]);

    const formatDateLabel = () => {
        const inLabel = formatDateTimeLabel(startDate);
        const outLabel = formatDateTimeLabel(endDate);
        return `${inLabel} → ${outLabel}`;
    };

    const bookingCheckIn = formatDateTimeLabel(startDate);
    const bookingCheckOut = formatDateTimeLabel(endDate);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([loadRoomTypes(), loadGuestMemories()]);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
            <ScreenHeader onBack={() => navigation.goBack()} icon="chevron-back" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={[PRIMARY]}
                        tintColor={PRIMARY}
                    />
                }
            >
                <RemoteImage uri={heroImage} style={styles.heroImage} resizeMode="cover" />

                <View style={[styles.sectionCard, styles.heroInfoCard]}>
                    <View style={styles.heroTitleRow}>
                        <View style={styles.heroTitleWrap}>
                            <Text style={styles.hotelTitle}>{hotelName}</Text>
                            <View style={styles.addressRow}>
                                <Feather name="map-pin" size={15} color="#9CA3AF" />
                                <Text style={styles.hotelAddress} numberOfLines={2}>
                                    {hotelAddress || 'Address unavailable'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.mapBtn}
                            activeOpacity={0.85}
                            onPress={async () => {
                                const result = await toggleFavorite({branchId});
                                if (!result?.success && result?.error) {
                                    Alert.alert('Favorite', result.error);
                                }
                            }}
                        >
                            <Ionicons
                                name={favorited ? 'heart' : 'heart-outline'}
                                size={22}
                                color={favorited ? '#ef4444' : PRIMARY}
                            />
                        </TouchableOpacity>
                    </View>
                    <RatingRow rating={rating} reviews={reviews} />
                </View>

                {detailDescription ? (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.sectionBody}>
                            {isDescriptionExpanded ? detailDescription : previewDescription}
                        </Text>
                        {hasLongDescription ? (
                            <TouchableOpacity onPress={() => setDescriptionExpanded((prev) => !prev)} activeOpacity={0.8}>
                                <Text style={styles.readMore}>
                                    {isDescriptionExpanded ? 'Read less' : 'Read more'}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                        {detailGallery.length ? (
                            <View style={styles.galleryWrap}>
                                <GalleryStrip gallery={detailGallery} />
                            </View>
                        ) : null}
                    </View>
                ) : detailGallery.length ? (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Gallery</Text>
                        <GalleryStrip gallery={detailGallery} />
                    </View>
                ) : null}

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Room types</Text>
                    <Text style={styles.sectionSubtitle}>
                        Choose a room type for your stay. Prices update based on your schedule.
                    </Text>

                    <TouchableOpacity style={styles.dateChip} onPress={() => setShowDatePicker(true)} activeOpacity={0.85}>
                        <Feather name="calendar" size={16} color={PRIMARY} />
                        <Text style={styles.dateChipText}>{formatDateLabel()}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                    </TouchableOpacity>

                    {isRoomTypesLoading ? (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="small" color={PRIMARY} />
                        </View>
                    ) : roomTypes.length ? (
                        <View style={styles.roomTypeList}>
                            {roomTypes.map((type) => {
                                const typeId = String(type?.id || '').trim();
                                const typeName = String(type?.name || '').trim() || 'Room type';
                                const tier = normalizeTierRates({
                                    pricePerHour: type?.pricePerHour,
                                    pricePerHalfDay: type?.pricePerHalfDay,
                                    pricePerDay: type?.pricePerDay || type?.basePrice,
                                });
                                const pricePerHour = tier.pricePerHour;
                                const pricePerHalfDay = tier.pricePerHalfDay;
                                const pricePerDay = tier.pricePerDay;
                                const previewQuote = calculateTieredRoomPrice(tier, startDate, endDate);
                                const available = Number(type?.available_count ?? type?.availableCount ?? 0);
                                const soldOut = !(available > 0);
                                const desc = String(type?.description || '').trim();
                                const amenities = Array.isArray(type?.roomAmenities)
                                    ? type.roomAmenities.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3).join(' • ')
                                    : '';
                                const image = (Array.isArray(type?.images) && type.images.length
                                    ? String(type.images[0] || '').trim()
                                    : '') || heroImage;

                                return (
                                    <View
                                        key={typeId || typeName}
                                        style={[styles.roomTypeCard, soldOut ? styles.roomTypeCardSoldOut : null]}
                                    >
                                        {image ? (
                                            <Image source={{uri: image}} style={styles.roomTypeImage} resizeMode="cover" />
                                        ) : null}
                                        <View style={styles.roomTypeBody}>
                                            <View style={styles.roomTypeHeader}>
                                                <Text style={styles.roomTypeName}>{typeName}</Text>
                                                <Text style={styles.roomTypePrice}>
                                                    {formatVnd(previewQuote.roomTotal || pricePerDay)}
                                                </Text>
                                            </View>
                                            <Text style={styles.roomTypeTier}>
                                                {formatVnd(pricePerHour)}/hr · {formatVnd(pricePerHalfDay)}/12h · {formatVnd(pricePerDay)}/day
                                            </Text>
                                            {amenities ? (
                                                <Text style={styles.roomTypeMeta} numberOfLines={1}>{amenities}</Text>
                                            ) : null}
                                            {desc ? (
                                                <Text style={styles.roomTypeDesc} numberOfLines={2}>{desc}</Text>
                                            ) : null}
                                            <View style={styles.roomTypeFooter}>
                                                <Text style={[styles.availabilityText, soldOut ? styles.availabilitySoldOut : null]}>
                                                    {soldOut ? 'Sold out' : `${available} rooms available`}
                                                </Text>
                                                <TouchableOpacity
                                                    disabled={soldOut || !typeId}
                                                    activeOpacity={0.88}
                                                    style={[styles.bookBtn, soldOut ? styles.bookBtnDisabled : null]}
                                                    onPress={() =>
                                                        navigation.navigate('CustomerRoomDetailScreen', {
                                                            branchId,
                                                            roomTypeId: typeId,
                                                            hotelId: branchId,
                                                            hotelName,
                                                            hotelAddress,
                                                            heroImage: image,
                                                            startDateIso: startDate.toISOString(),
                                                            endDateIso: endDate.toISOString(),
                                                            roomPrice: pricePerDay,
                                                            pricePerHour,
                                                            pricePerHalfDay,
                                                            pricePerDay,
                                                            reviews,
                                                            rating,
                                                            room: {
                                                                id: typeId,
                                                                roomTypeId: typeId,
                                                                branchId,
                                                                name: typeName,
                                                                description: desc,
                                                                image,
                                                                pricePerHour,
                                                                pricePerHalfDay,
                                                                pricePerDay,
                                                            },
                                                        })
                                                    }
                                                >
                                                    <Text style={styles.bookBtnText}>
                                                        {soldOut ? 'Unavailable' : 'View & book'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <Text style={styles.emptyRooms}>No room types available for this branch yet.</Text>
                    )}
                </View>

                {!isReviewsLoading && (locketData?.length ?? 0) > 0 ? (
                    <GuestMemoriesFeed memories={locketData} />
                ) : null}
            </ScrollView>

            <BookingDateTimePicker
                visible={showDatePicker}
                checkInDate={startDate}
                checkOutDate={endDate}
                onCancel={() => setShowDatePicker(false)}
                onConfirm={({checkIn, checkOut}) => {
                    setStartDate(checkIn);
                    setEndDate(checkOut);
                    setShowDatePicker(false);
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: SCREEN_BG,
    },
    scroll: {
        flex: 1,
        backgroundColor: SCREEN_BG,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    heroImage: {
        width: '100%',
        height: 240,
        backgroundColor: '#E5E7EB',
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 16,
        ...cardShadow,
    },
    heroInfoCard: {
        marginTop: -28,
    },
    heroTitleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    heroTitleWrap: {
        flex: 1,
        paddingRight: 12,
    },
    hotelTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.3,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: 6,
        gap: 6,
    },
    hotelAddress: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        color: '#6B7280',
    },
    mapBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        lineHeight: 20,
        color: '#6B7280',
        marginBottom: 12,
    },
    sectionBody: {
        fontSize: 15,
        lineHeight: 22,
        color: '#374151',
    },
    readMore: {
        marginTop: 8,
        fontSize: 14,
        fontWeight: '600',
        color: PRIMARY,
    },
    galleryWrap: {
        marginTop: 14,
    },
    dateChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 11,
        marginBottom: 14,
        gap: 8,
    },
    dateChipText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
    },
    loadingWrap: {
        paddingVertical: 24,
        alignItems: 'center',
    },
    roomTypeList: {
        gap: 12,
    },
    roomTypeCard: {
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
    },
    roomTypeCardSoldOut: {
        opacity: 0.55,
        backgroundColor: '#F9FAFB',
    },
    roomTypeImage: {
        width: '100%',
        height: 120,
        backgroundColor: '#E5E7EB',
    },
    roomTypeBody: {
        padding: 14,
    },
    roomTypeHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
    },
    roomTypeName: {
        flex: 1,
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
    },
    roomTypePrice: {
        fontSize: 17,
        fontWeight: '800',
        color: PRICE_ACCENT,
    },
    roomTypeTier: {
        marginTop: 4,
        fontSize: 12,
        color: '#6B7280',
    },
    roomTypeMeta: {
        marginTop: 8,
        fontSize: 13,
        color: '#4B5563',
    },
    roomTypeDesc: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 18,
        color: '#6B7280',
    },
    roomTypeFooter: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    availabilityText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: PRICE_ACCENT,
    },
    availabilitySoldOut: {
        color: '#9CA3AF',
    },
    bookBtn: {
        backgroundColor: PRIMARY,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    bookBtnDisabled: {
        backgroundColor: '#D1D5DB',
    },
    bookBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
    emptyRooms: {
        textAlign: 'center',
        paddingVertical: 20,
        fontSize: 14,
        color: '#6B7280',
    },
});
