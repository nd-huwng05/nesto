import {useEffect, useMemo, useRef, useState} from 'react';
import {Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, FlatList, PanResponder} from 'react-native';
import {Ionicons, MaterialIcons} from '@expo/vector-icons';

const DEFAULT_WATCHLIST_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';
const DEFAULT_REVIEWER_AVATAR = 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=500&q=80';

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
    const [fallbackSet, setFallbackSet] = useState({});

    const handleGalleryImageError = (index) => {
        setFallbackSet((prev) => ({...prev, [index]: true}));
    };

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5" contentContainerStyle={styles.galleryRow}>
            {gallery.map((uri, index) => (
                <Image
                    key={`${uri}-${index}`}
                    source={{uri: fallbackSet[index] ? DEFAULT_WATCHLIST_IMAGE : uri}}
                    className="w-28 h-24 rounded-[18px] mr-4"
                    resizeMode="cover"
                    onError={() => handleGalleryImageError(index)}
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
    const [roomImage, setRoomImage] = useState(room?.image ?? DEFAULT_WATCHLIST_IMAGE);

    useEffect(() => {
        setRoomImage(room?.image ?? DEFAULT_WATCHLIST_IMAGE);
    }, [room?.image]);

    const handleRoomImageError = () => {
        if (roomImage !== DEFAULT_WATCHLIST_IMAGE) {
            setRoomImage(DEFAULT_WATCHLIST_IMAGE);
        }
    };

    return (
        <View className="rounded-[24px] bg-white p-5 mb-5 flex-row" style={styles.cardShadow}>
            <View style={styles.roomMediaColumn}>
                <Image source={{uri: roomImage}} className="w-full h-[150px] rounded-[16px]" resizeMode="cover" onError={handleRoomImageError}/>
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
    const activeImage = failedImages[reviewKey] ? DEFAULT_WATCHLIST_IMAGE : (activeReview?.image ?? DEFAULT_WATCHLIST_IMAGE);
    const activeAvatar = failedAvatars[reviewKey] ? DEFAULT_REVIEWER_AVATAR : (activeReview?.avatar ?? DEFAULT_REVIEWER_AVATAR);

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
                <Image source={{uri: activeImage}} className="w-full h-[360px]" resizeMode="cover" onError={handleImageError}/>
                <View style={styles.reviewBubble}>
                    <Text className="text-white text-[14px]">{activeReview?.review}</Text>
                </View>
            </View>

            <View className="flex-row items-center justify-center mt-4">
                <View className="w-[24px] h-[24px] rounded-full overflow-hidden border border-[#1f8fff] mr-3">
                    <Image source={{uri: activeAvatar}} className="w-full h-full" resizeMode="cover" onError={handleAvatarError}/>
                </View>
                <Text className="text-white text-[15px]">{activeReview?.reviewer}</Text>
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
});
