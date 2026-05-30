import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, FlatList, PanResponder} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {Ionicons, MaterialIcons} from '@expo/vector-icons';
import Avatar from '../common/Avatar';
import RemoteImage from '../common/RemoteImage';

const LOCKET_CARD_WIDTH = 220;
const LOCKET_CARD_HEIGHT = 280;
const LOCKET_CARD_GAP = 16;

const ROOM_TYPE_COLORS = {
    standard: '#2f6fd6',
    vip: '#c58a00',
    superVip: '#a33dc7',
    default: '#101010',
};

function getRoomTypeColor(roomName) {
    const key = String(roomName || '').trim().toLowerCase();
    if (key.includes('super vip')) return ROOM_TYPE_COLORS.superVip;
    if (key.includes('vip')) return ROOM_TYPE_COLORS.vip;
    if (key.includes('standard')) return ROOM_TYPE_COLORS.standard;
    return ROOM_TYPE_COLORS.default;
}

export function formatMoney(amount, currency) {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `${safeAmount.toLocaleString('en-US')} ${currency ?? ''}`.trim();
}

export function FilterPill({icon, label, light = false, selected = false, onPress}) {
    const bgClass = selected ? 'bg-[#dfe4ff]' : light ? 'bg-[#eef0ff]' : 'bg-[#efefef]';
    const textClass = selected ? 'text-primary' : light ? 'text-primary' : 'text-extra';

    return (
        <TouchableOpacity
            className={`rounded-full px-4 py-3 mr-3 flex-row items-center ${bgClass}`}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityRole="button">
            {icon}
            <Text className={`text-sm font-sf ${textClass} ${icon ? 'ml-2' : ''}`}>{label}</Text>
        </TouchableOpacity>
    );
}

export function GalleryStrip({gallery}) {
    const items = (Array.isArray(gallery) ? gallery : [])
        .map((uri) => String(uri || '').trim())
        .filter(Boolean);

    if (!items.length) return null;

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5" contentContainerStyle={styles.galleryRow}>
            {items.map((uri, index) => (
                <RemoteImage
                    key={`${uri}-${index}`}
                    uri={uri}
                    style={{width: 112, height: 96, borderRadius: 18, marginRight: 16}}
                    resizeMode="cover"
                />
            ))}
        </ScrollView>
    );
}

export function RatingRow({rating, reviews}) {
    const safeRating = Number.isFinite(rating) ? rating : 0;
    const safeReviews = Number.isFinite(reviews) ? reviews : 0;
    const displayRating = Math.max(0, Math.min(5, safeRating)).toFixed(1);

    const stars = Array.from({length: 5}, (_, index) => {
        const filled = safeRating >= index + 1;
        const halfFilled = !filled && safeRating >= index + 0.5;

        if (filled) {
            return <MaterialIcons key={`star-${index}`} name="star" size={18} color="#f5c542" style={styles.starIcon}/>;
        }

        if (halfFilled) {
            return <MaterialIcons key={`star-${index}`} name="star-half" size={18} color="#f5c542" style={styles.starIcon}/>;
        }

        return <MaterialIcons key={`star-${index}`} name="star-border" size={18} color="#e2e2e2" style={styles.starIcon}/>;
    });

    return (
        <View className="flex-row items-center mt-4 flex-wrap">
            <View className="flex-row items-center mr-3">{stars}</View>
            <Text className="font-sf-bold text-[17px] text-black mr-1">{displayRating}</Text>
            <Text className="font-sf text-[17px] text-[#c7c7c7]">-{safeReviews.toLocaleString('en-US')} Reviews</Text>
        </View>
    );
}

export function RoomCard({room, onViewDetail, onBookNow}) {
    const priceAmount = room?.price?.amount;
    const priceCurrency = room?.price?.currency ?? 'VND';
    const roomNameColor = getRoomTypeColor(room?.name);
    const roomImage = String(room?.image || '').trim();

    return (
        <View className="rounded-[24px] bg-white p-5 mb-5 flex-row" style={styles.cardShadow}>
            <View style={styles.roomMediaColumn}>
                <RemoteImage uri={roomImage} style={{width: '100%', height: 150, borderRadius: 16}} resizeMode="cover" />
            </View>

            <View style={styles.roomInfoColumn}>
                <View>
                    <View style={styles.roomHeaderRow}>
                        <Text
                            style={[styles.roomNameInline, {color: roomNameColor}]}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >
                            {room.name}
                        </Text>
                        <Text style={styles.priceText}>{formatMoney(priceAmount, priceCurrency)}</Text>
                    </View>

                    <Text style={styles.roomDescription} numberOfLines={2}>
                        {room.description}
                    </Text>

                    <View style={styles.metaWrap}>
                        <Text style={styles.metaLine}>Type: <Text style={styles.metaValue}>{room.type}</Text></Text>
                        <Text style={styles.metaLine}>Feature: <Text style={styles.metaValue}>{room.view}</Text></Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity 
                        onPress={onViewDetail} 
                        activeOpacity={0.7}
                        className="px-3 py-2 rounded-full border border-[#ddd] bg-[#f9f9f9]"
                        style={styles.actionButton}
                    >
                        <Text className="font-sf-semi text-[13px] text-[#333]">View Detail</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        className="px-4 py-2 rounded-full bg-primary"
                        style={styles.actionButton}
                        onPress={() => {
                            if (typeof onBookNow === 'function') {
                                onBookNow(room);
                            }
                        }}
                    >
                        <Text className="text-white font-sf-semi text-[13px]">Book now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

export function PaginationRow({currentFloor = 1, totalFloors = 1, onPrev, onNext}) {
    const isPrevDisabled = currentFloor <= 1;
    const isNextDisabled = currentFloor >= totalFloors;

    return (
        <View className="flex-row justify-between mt-1 mb-3 px-4">
            <PaginationPill label="Prev" onPress={onPrev} disabled={isPrevDisabled}/>
            <PaginationPill label={`Floor ${currentFloor}`} disabled/>
            <PaginationPill label="Next" onPress={onNext} disabled={isNextDisabled}/>
        </View>
    );
}

function PaginationPill({label, onPress, disabled = false}) {
    return (
        <TouchableOpacity
            className={`rounded-full px-8 py-3 ${disabled ? 'bg-[#cfd6ff]' : 'bg-primary'}`}
            onPress={onPress}
            activeOpacity={0.85}
            disabled={disabled}
        >
            <Text className="text-white font-sf text-base">{label}</Text>
        </TouchableOpacity>
    );
}

export function FeaturedTag({label, onRemove}) {
    return (
        <TouchableOpacity
            className="mt-1 mb-4 flex-row items-center self-start rounded-full bg-[#eef0ff] px-4 py-2"
            onPress={onRemove}
            activeOpacity={0.85}
            accessibilityRole="button">
            <Text className="font-sf text-[14px] text-primary mr-2">{label}</Text>
            <Ionicons name="close" size={18} color="#8294FF"/>
        </TouchableOpacity>
    );
}

function GuestMemoryCard({item}) {
    const imageUri = String(item?.image || item?.imageUrl || '').trim();
    const note = String(item?.description || item?.review || '').trim();
    const userName = String(item?.userName || item?.reviewer || 'Guest').trim() || 'Guest';
    const userAvatar = String(item?.userAvatar || item?.avatar || '').trim();

    return (
        <View style={styles.locketCard}>
            <RemoteImage uri={imageUri} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.75)']}
                style={styles.locketGradient}
            />
            <View style={styles.locketAvatarWrap}>
                <Avatar uri={userAvatar} name={userName} size={36} />
            </View>
            {note ? (
                <Text style={styles.locketNote} numberOfLines={3}>
                    {note}
                </Text>
            ) : null}
        </View>
    );
}

export function GuestMemoriesFeed({memories = []}) {
    const data = useMemo(() => {
        if (!Array.isArray(memories) || memories.length === 0) return [];
        return memories.filter((row) => String(row?.image || row?.imageUrl || '').trim());
    }, [memories]);

    const renderItem = useCallback(
        ({item}) => <GuestMemoryCard item={item} />,
        []
    );

    const keyExtractor = useCallback((item, index) => String(item?.id || `memory-${index}`), []);

    const getItemLayout = useCallback(
        (_, index) => ({
            length: LOCKET_CARD_WIDTH + LOCKET_CARD_GAP,
            offset: (LOCKET_CARD_WIDTH + LOCKET_CARD_GAP) * index,
            index,
        }),
        []
    );

    if (!data.length) {
        return null;
    }

    return (
        <View style={styles.memoriesSection}>
            <Text style={styles.memoriesTitle}>Guest Memories</Text>
            <FlatList
                data={data}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                getItemLayout={getItemLayout}
                initialNumToRender={4}
                maxToRenderPerBatch={6}
                windowSize={5}
                removeClippedSubviews
                decelerationRate="fast"
                snapToInterval={LOCKET_CARD_WIDTH + LOCKET_CARD_GAP}
                snapToAlignment="start"
                contentContainerStyle={styles.memoriesListContent}
            />
        </View>
    );
}

export function WatchlistCard({watchlist, reviews = []}) {
    const reviewList = Array.isArray(reviews) && reviews.length > 0 ? reviews : (watchlist ? [watchlist] : []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [failedImages, setFailedImages] = useState({});
    const [failedAvatars, setFailedAvatars] = useState({});
    const currentIndexRef = useRef(0);

    useEffect(() => {
        if (!reviewList.length) {
            setCurrentIndex(0);
            currentIndexRef.current = 0;
            return;
        }

        if (currentIndex > reviewList.length - 1) {
            const nextIndex = reviewList.length - 1;
            setCurrentIndex(nextIndex);
            currentIndexRef.current = nextIndex;
        }
    }, [currentIndex, reviewList.length]);

    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    const panResponder = useMemo(
        () => PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                const absDx = Math.abs(gestureState.dx);
                const absDy = Math.abs(gestureState.dy);
                return absDx > 12 && absDx > absDy;
            },
            onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                const absDx = Math.abs(gestureState.dx);
                const absDy = Math.abs(gestureState.dy);
                return absDx > 12 && absDx > absDy;
            },
            onPanResponderRelease: (_, gestureState) => {
                const distance = gestureState.dx;
                const threshold = 50;

                if (distance > threshold && currentIndexRef.current > 0) {
                    setCurrentIndex(currentIndexRef.current - 1);
                }

                if (distance < -threshold && currentIndexRef.current < reviewList.length - 1) {
                    setCurrentIndex(currentIndexRef.current + 1);
                }
            },
            onPanResponderTerminationRequest: () => false,
        }),
        [reviewList.length]
    );

    if (!reviewList.length) {
        return null;
    }

    const activeReview = reviewList[currentIndex] || reviewList[0];
    const reviewKey = String(activeReview?.id ?? currentIndex);
    const activeImage = failedImages[reviewKey] ? '' : String(activeReview?.image || '').trim();
    const activeAvatar = failedAvatars[reviewKey] ? '' : String(activeReview?.avatar || activeReview?.userAvatar || '').trim();
    const reviewerName = String(activeReview?.reviewer || activeReview?.userName || 'Guest').trim() || 'Guest';

    const handleImageError = () => {
        setFailedImages((prev) => ({...prev, [reviewKey]: true}));
    };

    const handleAvatarError = () => {
        setFailedAvatars((prev) => ({...prev, [reviewKey]: true}));
    };

    return (
        <View className="rounded-[26px] bg-black p-4 mt-2 mb-8">
            <Text className="font-wendy text-[23px] text-[#e4ef27]">{activeReview?.title || watchlist?.title}</Text>
            <Text className="text-white text-[14px] mt-1">{activeReview?.subtitle || watchlist?.subtitle}</Text>

            <View className="mt-4 rounded-[24px] overflow-hidden" {...panResponder.panHandlers}>
                <RemoteImage uri={activeImage} style={{width: '100%', height: 360}} resizeMode="cover" />
                <View style={styles.reviewBubble}>
                    <Text className="text-white text-[14px]">{activeReview?.review}</Text>
                </View>
            </View>

            <View className="flex-row items-center justify-center mt-4">
                <Avatar uri={activeAvatar} name={reviewerName} size={24} />
                <Text className="text-white text-[15px] ml-3">{reviewerName}</Text>
            </View>

            {reviewList.length > 1 ? (
                <Text className="text-white text-[12px] text-center mt-2">{currentIndex + 1} / {reviewList.length}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    cardShadow: {
        shadowColor: '#000000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 6,
    },
    galleryRow: {
        paddingRight: 8,
    },
    roomMediaColumn: {
        width: '42%',
    },
    roomInfoColumn: {
        flex: 1,
        marginLeft: 14,
        minWidth: 0,
        justifyContent: 'space-between',
    },
    roomHeaderRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        minHeight: 44,
    },
    roomNameInline: {
        flex: 1,
        fontSize: 17,
        lineHeight: 22,
        fontFamily: 'SF-Bold',
        fontWeight: '700',
    },
    priceText: {
        fontSize: 14,
        color: '#11b825',
        fontFamily: 'SF-Bold',
        fontWeight: '700',
        marginTop: 1,
    },
    roomDescription: {
        fontSize: 12,
        lineHeight: 20,
        color: '#7e7e7e',
        fontFamily: 'SF-Regular',
        marginTop: 6,
    },
    metaWrap: {
        marginTop: 10,
        gap: 4,
    },
    metaLine: {
        fontSize: 12,
        lineHeight: 18,
        color: '#7e7e7e',
        fontFamily: 'SF-Regular',
    },
    metaValue: {
        color: '#333',
        fontFamily: 'SF-Bold',
        fontWeight: '600',
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 12,
        flexWrap: 'nowrap',
    },
    actionButton: {
        marginLeft: 10,
        minHeight: 38,
    },
    reviewBubble: {
        position: 'absolute',
        bottom: 16,
        alignSelf: 'center',
        backgroundColor: 'rgba(55, 55, 55, 0.86)',
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 8,
    },
    starIcon: {
        marginRight: 1,
    },
    memoriesSection: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 8,
    },
    memoriesTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    memoriesListContent: {
        paddingRight: 16,
    },
    locketCard: {
        width: LOCKET_CARD_WIDTH,
        height: LOCKET_CARD_HEIGHT,
        borderRadius: 20,
        overflow: 'hidden',
        marginRight: LOCKET_CARD_GAP,
        backgroundColor: '#111827',
    },
    locketGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '60%',
    },
    locketAvatarWrap: {
        position: 'absolute',
        top: 12,
        left: 12,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.85)',
        borderRadius: 20,
        overflow: 'hidden',
    },
    locketNote: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 14,
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '600',
    },
});
