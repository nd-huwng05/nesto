import {useEffect, useState, useRef} from 'react';
import {Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, FlatList, PanResponder} from 'react-native';
import {Ionicons, MaterialIcons} from '@expo/vector-icons';

const DEFAULT_WATCHLIST_IMAGE = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';
const DEFAULT_REVIEWER_AVATAR = 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=500&q=80';

export function formatMoney(amount, currency) {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return `${safeAmount.toLocaleString('vi-VN')} ${currency ?? ''}`.trim();
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
            <Text className="font-sf text-[17px] text-[#c7c7c7]">-{reviews.toLocaleString('vi-VN')} Reviews</Text>
        </View>
    );
}

export function RoomCard({room, onViewDetail, onBookNow}) {
    const priceAmount = room?.price?.amount;
    const priceCurrency = room?.price?.currency ?? 'VND';
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
            <View className="w-[42%]">
                <Image source={{uri: roomImage}} className="w-full h-[150px] rounded-[16px]" resizeMode="cover" onError={handleRoomImageError}/>
                <Text className="font-sf-bold text-[17px] leading-[22px] text-black mt-3 text-center" numberOfLines={2}>
                    {room.name}
                </Text>
            </View>

            <View className="flex-1 ml-5 justify-between">
                <View>
                    <Text className="font-sf-semi text-[14px] text-[#11b825] font-bold text-right">{formatMoney(priceAmount, priceCurrency)}</Text>

                    <Text className="font-sf text-[12px] text-[#7e7e7e] leading-5 mt-3" numberOfLines={2}>
                        {room.description}
                    </Text>

                    <View className="mt-4">
                        <Text className="font-sf text-[12px] text-[#7e7e7e]">Type: <Text className="font-sf-semi text-[#333]">{room.type}</Text></Text>
                        <Text className="font-sf text-[12px] text-[#7e7e7e] mt-2">Feature: <Text className="font-sf-semi text-[#333]">{room.view}</Text></Text>
                    </View>
                </View>

                <View className="flex-row justify-end items-center gap-2 mt-4">
                    <TouchableOpacity 
                        onPress={onViewDetail} 
                        activeOpacity={0.7}
                        className="px-3 py-2 rounded-full border border-[#ddd] bg-[#f9f9f9]"
                    >
                        <Text className="font-sf-semi text-[13px] text-[#333]">View Detail</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        className="px-4 py-2 rounded-full bg-primary"
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
    const panResponder = useRef(null);
    const startX = useRef(0);
    const currentIndexRef = useRef(0);

    if (!reviewList.length) {
        return null;
    }

    // Update ref khi currentIndex thay đổi
    useEffect(() => {
        currentIndexRef.current = currentIndex;
    }, [currentIndex]);

    const currentReview = reviewList[currentIndex];

    useEffect(() => {
        panResponder.current = PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                const absDx = Math.abs(gestureState.dx);
                const absDy = Math.abs(gestureState.dy);
                return absDx > 12 && absDx > absDy;
            },
            onPanResponderGrant: () => {
                startX.current = 0;
            },
            onPanResponderRelease: (_, gestureState) => {
                const distance = gestureState.dx;
                const threshold = 50;

                if (distance > threshold) {
                    // Kéo phải -> prev
                    if (currentIndexRef.current > 0) {
                        setCurrentIndex(currentIndexRef.current - 1);
                    }
                } else if (distance < -threshold) {
                    // Kéo trái -> next
                    if (currentIndexRef.current < reviewList.length - 1) {
                        setCurrentIndex(currentIndexRef.current + 1);
                    }
                }
            },
            onPanResponderTerminationRequest: () => false,
        });
    }, [reviewList.length]);

    const handleImageError = (reviewId) => {
        setFailedImages(prev => ({...prev, [reviewId]: true}));
    };

    const handleAvatarError = (reviewId) => {
        setFailedAvatars(prev => ({...prev, [reviewId]: true}));
    };

    const imageUri = failedImages[currentReview.id] ? DEFAULT_WATCHLIST_IMAGE : (currentReview?.image ?? DEFAULT_WATCHLIST_IMAGE);
    const avatarUri = failedAvatars[currentReview.id] ? DEFAULT_REVIEWER_AVATAR : (currentReview?.avatar ?? DEFAULT_REVIEWER_AVATAR);

    return (
        <View className="rounded-[26px] bg-black p-4 mt-2 mb-8">
            <Text className="font-wendy text-[23px] text-[#e4ef27]">Watchlish</Text>
            <Text className="text-white text-[14px] mt-1">Review's customer were used room</Text>

            <View className="mt-4 rounded-[24px] overflow-hidden" {...panResponder.current?.panHandlers}>
                <Image 
                    source={{uri: imageUri}} 
                    className="w-full h-[360px]" 
                    resizeMode="cover" 
                    onError={() => handleImageError(currentReview.id)}
                />
                <View style={styles.reviewBubble}>
                    <Text className="text-white text-[14px]">{currentReview.review}</Text>
                </View>
            </View>

            <View className="flex-row items-center justify-center mt-4">
                <View className="w-[24px] h-[24px] rounded-full overflow-hidden border border-[#1f8fff] mr-3">
                    <Image 
                        source={{uri: avatarUri}} 
                        className="w-full h-full" 
                        resizeMode="cover" 
                        onError={() => handleAvatarError(currentReview.id)}
                    />
                </View>
                <Text className="text-white text-[15px]">{currentReview.reviewer}</Text>
            </View>

            {reviewList.length > 1 && (
                <Text className="text-white text-[12px] text-center mt-3">
                    {currentIndex + 1} / {reviewList.length}
                </Text>
            )}
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
