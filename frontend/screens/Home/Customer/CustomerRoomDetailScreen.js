import {useEffect, useState} from 'react';
import {ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather, Ionicons} from '@expo/vector-icons';
import {GalleryStrip, RatingRow, WatchlistCard} from '../../../components/customer/CustomerHotelDetailSections';
import ScreenHeader from '../../../components/common/ScreenHeader';
import {fetchReviews} from '../../../services/ReviewService';

export function HomeDetailScreen({navigation, route}) {
    const params = route?.params ?? {};
    const room = params.room ?? {};
    const hotelId = params.hotelId ?? null;
    const hotelName = params.hotelName ?? '';
    const hotelAddress = params.hotelAddress ?? '';
    const resolvedRoomName =
        room?.name
        || room?.roomName
        || (room?.roomNumber ? `Room ${room.roomNumber}` : '')
        || (room?.number ? `Room ${room.number}` : 'Room');
    const heroImage = room.image ?? params.heroImage ?? '';
    const checkIn = typeof params.checkIn === 'string' ? params.checkIn : '';
    const checkOut = typeof params.checkOut === 'string' ? params.checkOut : '';
    const startDateIso = typeof params.startDateIso === 'string' ? params.startDateIso : null;
    const endDateIso = typeof params.endDateIso === 'string' ? params.endDateIso : null;
    const startDate = Number.isFinite(params.startDate) ? params.startDate : null;
    const endDate = Number.isFinite(params.endDate) ? params.endDate : null;
    const roomPrice = Number.isFinite(params.roomPrice)
        ? params.roomPrice
        : (Number.isFinite(room?.price?.amount) ? room.price.amount : null);
    const rating = Number.isFinite(params.rating) ? params.rating : 0;
    const reviews = Number.isFinite(params.reviews) ? params.reviews : 0;
    const watchlist = params.watchlist ?? null;

    const roomDescription = typeof room.description === 'string' ? room.description.trim() : '';
    const hotelDescription = typeof params.hotelDescription === 'string' ? params.hotelDescription.trim() : '';
    const detailDescription = roomDescription.length ? roomDescription : hotelDescription;
    const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
    const [reviewsList, setReviewsList] = useState([]);
    const [isReviewsLoading, setIsReviewsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const fullDescription = String(detailDescription || '').trim();
    const DESCRIPTION_PREVIEW_LENGTH = 130;
    const hasLongDescription = fullDescription.length > DESCRIPTION_PREVIEW_LENGTH;
    const previewDescription = hasLongDescription
        ? `${fullDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`
        : fullDescription;

    const detailGallery = (() => {
        const raw = Array.isArray(params.gallery) ? params.gallery : [];
        const fallback = [room?.image, heroImage].map((x) => String(x || '').trim()).filter(Boolean);
        const merged = [...raw, ...fallback].map((x) => String(x || '').trim()).filter(Boolean);
        return Array.from(new Set(merged));
    })();

    useEffect(() => {
        let alive = true;
        (async () => {
            const branchId = String(params.branchId || '').trim();
            if (!branchId) {
                if (alive) setReviewsList([]);
                return;
            }
            setIsReviewsLoading(true);
            try {
                const res = await fetchReviews({hotelName, roomName: resolvedRoomName, branchId});
                if (!alive) return;
                if (res.status === 'success') {
                    setReviewsList(Array.isArray(res.data) ? res.data : []);
                } else {
                    setReviewsList([]);
                    Alert.alert('Reviews', String(res?.message || 'Unable to load reviews.'));
                }
            } catch (error) {
                if (alive) {
                    setReviewsList([]);
                    Alert.alert('Reviews', 'Unable to load reviews right now. Please try again.');
                }
            } finally {
                if (alive) setIsReviewsLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [hotelId, params.branchId, resolvedRoomName, hotelName]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        (async () => {
            try {
                const branchId = String(params.branchId || '').trim();
                if (!branchId) return;
                const res = await fetchReviews({hotelName, roomName: resolvedRoomName, branchId});
                if (res.status === 'success') setReviewsList(Array.isArray(res.data) ? res.data : []);
                else Alert.alert('Reviews', String(res?.message || 'Unable to refresh reviews.'));
            } catch (error) {
                Alert.alert('Reviews', 'Unable to refresh reviews right now. Please try again.');
            } finally {
                setIsRefreshing(false);
            }
        })();
    };

    return (
        <SafeAreaView className="flex-1 bg-[#ececec]">
            <ScreenHeader onBack={() => navigation.goBack()} icon="chevron-back" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                className="flex-1 bg-[#ececec]"
                contentContainerStyle={{paddingBottom: 98}}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={['#5b79df']}
                        tintColor="#5b79df"
                    />
                }
            >
                <View className="mx-3 mt-2 rounded-[26px] overflow-hidden bg-[#ececec]">
                    <View className="relative">
                        <Image source={{uri: heroImage}} className="w-full h-[220px]" resizeMode="cover"/>
                    </View>

                    <View className="bg-[#ececec] rounded-t-[34px] -mt-8 px-5 pt-6 pb-5">
                        <View className="flex-row items-start justify-between">
                            <View className="flex-1 pr-6">
                                <Text className="font-sf-bold text-[24px] leading-[28px] text-black">{resolvedRoomName}</Text>
                                <Text className="font-sf text-[13px] leading-[18px] text-[#8b8b8b] mt-1">{hotelName}</Text>
                            </View>
                            <TouchableOpacity
                                className="bg-primary rounded-full px-5 py-2 mt-1.5 ml-4"
                                onPress={() => {
                                    navigation.navigate('CustomerBookingScreen', {
                                        syncToken: Date.now(),
                                        roomId: room?.id,
                                        hotelName,
                                        hotelAddress,
                                        roomName: resolvedRoomName,
                                        heroImage,
                                        startDateIso,
                                        endDateIso,
                                        startDate,
                                        endDate,
                                        roomPrice,
                                        checkIn,
                                        checkOut,
                                        reviews: reviews,
                                        rating: rating,
                                    });
                                }}
                            >
                                <Text className="text-white font-sf-semi text-[15px] leading-[20px]">Book now</Text>
                            </TouchableOpacity>
                        </View>

                        <RatingRow rating={rating} reviews={reviews}/>

                        <Text className="font-sf-semi text-[18px] leading-[22px] mt-4 text-black">Description</Text>
                        <Text className="font-sf text-[14px] leading-[20px] text-extra mt-1">
                            {isDescriptionExpanded ? fullDescription : previewDescription}
                        </Text>
                        {hasLongDescription ? (
                            <TouchableOpacity onPress={() => setDescriptionExpanded((prev) => !prev)} activeOpacity={0.8}>
                                <Text className="text-[#1897ff] font-sf-semi mt-0.5">
                                    {isDescriptionExpanded ? 'Read less' : 'Read more'}
                                </Text>
                            </TouchableOpacity>
                        ) : null}

                        <GalleryStrip gallery={detailGallery}/>
                    </View>
                </View>

                <View className="mt-3 px-3">
                    {isReviewsLoading ? (
                        <View className="py-6 items-center justify-center">
                            <ActivityIndicator size="small" color="#5b79df" />
                        </View>
                    ) : (
                        <WatchlistCard watchlist={watchlist || null} reviews={reviewsList}/>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}