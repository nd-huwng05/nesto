import {useEffect, useState} from 'react';
import {Image, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather, Ionicons} from '@expo/vector-icons';
import {GalleryStrip, RatingRow, WatchlistCard} from '../../../components/customer/CustomerHotelDetailSections';
import {fakeGetReviews} from '../../../configuration/FakeApi';

export function HomeDetailScreen({navigation, route}) {
    const params = route?.params ?? {};
    const room = params.room ?? {};
    const hotelId = params.hotelId ?? 'hotel-1';
    const hotelName = params.hotelName ?? 'Swiss Hotel';
    const heroImage = room.image ?? params.heroImage ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg';
    const checkIn = typeof params.checkIn === 'string' ? params.checkIn : "9h00' 23 Mar 2026";
    const checkOut = typeof params.checkOut === 'string' ? params.checkOut : "9h00' 24 Mar 2026";
    const startDateIso = typeof params.startDateIso === 'string' ? params.startDateIso : null;
    const endDateIso = typeof params.endDateIso === 'string' ? params.endDateIso : null;
    const startDate = Number.isFinite(params.startDate) ? params.startDate : null;
    const endDate = Number.isFinite(params.endDate) ? params.endDate : null;
    const roomPrice = Number.isFinite(params.roomPrice)
        ? params.roomPrice
        : (Number.isFinite(room?.price?.amount) ? room.price.amount : null);
    const rating = Number.isFinite(params.rating) ? params.rating : 4.5;
    const reviews = Number.isFinite(params.reviews) ? params.reviews : 4231;
    const watchlist = params.watchlist ?? {
        title: 'Watchlish',
        subtitle: "Review's customer were used room",
        reviewer: 'Ngoc Lan',
        review: 'The view is very beautifull',
        image: heroImage,
        avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?fit=crop&w=500&q=80&fm=jpg',
    };

    const detailGallery = Array.isArray(params.gallery) && params.gallery.length
        ? params.gallery
        : [room.image ?? heroImage, room.image ?? heroImage, room.image ?? heroImage];
    const defaultDescription = 'Hotel Room means an area that is designed and constructed to be occupied by one or more persons on Hotel Property, which is separate from sleeping area.';
    const roomDescription = typeof room.description === 'string' ? room.description.trim() : '';
    const hotelDescription = typeof params.hotelDescription === 'string' ? params.hotelDescription.trim() : '';
    const detailDescription = roomDescription.length >= 60
        ? roomDescription
        : (hotelDescription.length ? hotelDescription : defaultDescription);
    const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
    const [reviewsList, setReviewsList] = useState([]);
    const extraDescription = params.extraDescription
        ?? 'Guests can enjoy daily breakfast, free high-speed Wi-Fi, and 24/7 room service with airport transfer support.';
    const fullDescription = `${detailDescription} ${extraDescription}`.trim();
    const DESCRIPTION_PREVIEW_LENGTH = 130;
    const hasLongDescription = fullDescription.length > DESCRIPTION_PREVIEW_LENGTH;
    const previewDescription = hasLongDescription
        ? `${fullDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`
        : fullDescription;

    useEffect(() => {
        let mounted = true;

        const loadReviews = async () => {
            try {
                const reviewsData = await fakeGetReviews(hotelId);
                if (mounted) {
                    setReviewsList(reviewsData);
                }
            } catch {
                if (mounted) {
                    setReviewsList([]);
                }
            }
        };

        loadReviews();

        return () => {
            mounted = false;
        };
    }, [hotelId]);

    return (
        <SafeAreaView className="flex-1 bg-[#ececec]">
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 bg-[#ececec]" contentContainerStyle={{paddingBottom: 18}}>
                <View className="mx-3 mt-2 rounded-[26px] overflow-hidden bg-[#ececec]">
                    <View className="relative">
                        <Image source={{uri: heroImage}} className="w-full h-[220px]" resizeMode="cover"/>
                        <View className="absolute top-5 left-5 right-5 flex-row justify-between">
                            <TouchableOpacity
                                className="w-11 h-11 rounded-full bg-[#eef2f3]/40 items-center justify-center"
                                onPress={() => navigation.goBack()}>
                                <Ionicons name="chevron-back" size={22} color="#2d2d2d"/>
                            </TouchableOpacity>
                            <TouchableOpacity className="w-11 h-11 rounded-full bg-[#eef2f3]/40 items-center justify-center">
                                <Feather name="more-horizontal" size={20} color="#2d2d2d"/>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="bg-[#ececec] rounded-t-[34px] -mt-8 px-5 pt-6 pb-5">
                        <View className="flex-row items-start justify-between">
                            <View className="flex-1 pr-6">
                                <Text className="font-sf-bold text-[34px] leading-[38px] text-black">{room.name ?? 'Room 121'}</Text>
                                <Text className="font-sf text-[17px] leading-[22px] text-[#8b8b8b] mt-1">{hotelName}</Text>
                            </View>
                            <TouchableOpacity
                                className="bg-primary rounded-full px-5 py-2 mt-1.5 ml-4"
                                onPress={() => {
                                    navigation.navigate('CustomerBookingScreen', {
                                        syncToken: Date.now(),
                                        hotelName,
                                        roomName: room.name ?? 'Room 121',
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
                                <Text className="text-white font-sf-semi text-[16px] leading-[22px]">Book now</Text>
                            </TouchableOpacity>
                        </View>

                        <RatingRow rating={rating} reviews={reviews}/>

                        <Text className="font-sf-bold text-[38px] leading-[42px] mt-4 text-black">Description</Text>
                        <Text className="font-sf text-[16px] leading-[24px] text-extra mt-1">
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
                    <WatchlistCard watchlist={watchlist} reviews={reviewsList}/>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}