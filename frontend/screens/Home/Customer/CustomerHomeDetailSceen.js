import {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View, Modal} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {
    GalleryStrip,
    RatingRow,
    WatchlistCard,
} from '../../../components/customer/CustomerHotelDetailSections';
import {fetchReviews} from '../../../services/ReviewService';
import api, {endpoints} from '../../../configuration/Apis';
import ScreenHeader from '../../../components/common/ScreenHeader';
import {formatVnd} from '../../../utils/formatCurrency';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getToday = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const getTomorrow = () => {
    const today = getToday();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
};

export function CustomerHomeDetailSceen({navigation, route}) {
    const params = route?.params ?? {};
    const room = params.room ?? {};
    const routeHotelName = params.hotelName ?? '';
    const heroImage = params.heroImage ?? room.image ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg';
    const rating = Number.isFinite(params.rating) ? params.rating : 0;
    const reviews = Number.isFinite(params.reviews) ? params.reviews : 0;
    const watchlist = params.watchlist ?? null;

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
    const hotelId = params.hotelId ?? room?.hotelId ?? null;
    const hotelAddress = params.hotelAddress
        ?? params.location
        ?? room?.hotelAddress
        ?? '';

    useEffect(() => {
        let mounted = true;
        (async () => {
            const safeBranchId = String(branchId || '').trim();
            if (!safeBranchId) {
                setReviewsList([]);
                return;
            }
            setIsReviewsLoading(true);
            try {
                const res = await fetchReviews({branchId: safeBranchId});
                if (!mounted) return;
                if (res?.status !== 'success') {
                    setReviewsList([]);
                    Alert.alert('Reviews', String(res?.message || 'Unable to load reviews.'));
                    return;
                }
                const rows = Array.isArray(res?.data) ? res.data : [];
                setReviewsList(rows);
            } catch (error) {
                if (mounted) {
                    setReviewsList([]);
                    Alert.alert('Reviews', 'Unable to load reviews right now. Please try again.');
                }
            } finally {
                if (mounted) setIsReviewsLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [branchId]);
    const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
    const DESCRIPTION_PREVIEW_LENGTH = 130;
    const hasLongDescription = detailDescription.length > DESCRIPTION_PREVIEW_LENGTH;
    const previewDescription = hasLongDescription
        ? `${detailDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`
        : detailDescription;
    const [roomTypes, setRoomTypes] = useState([]);
    const [isRoomTypesLoading, setIsRoomTypesLoading] = useState(false);
    const [startDate, setStartDate] = useState(() => getToday());
    const [endDate, setEndDate] = useState(() => getTomorrow());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tempStartDate, setTempStartDate] = useState(() => getToday());
    const [tempEndDate, setTempEndDate] = useState(() => getTomorrow());
    const [activeDateField, setActiveDateField] = useState('start');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [viewDate, setViewDate] = useState(() => {
        const today = getToday();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });

    useEffect(() => {
        let mounted = true;
        (async () => {
            const safeBranchId = String(branchId || '').trim();
            if (!safeBranchId) {
                setRoomTypes([]);
                return;
            }
            setIsRoomTypesLoading(true);
            try {
                const res = await api.get(endpoints['branch-room-types'], {params: {branch_id: safeBranchId}});
                const rows = res?.data?.results || res?.data || [];
                if (!mounted) return;
                setRoomTypes(Array.isArray(rows) ? rows : []);
            } catch (error) {
                if (mounted) {
                    setRoomTypes([]);
                    Alert.alert('Rooms', 'Unable to load room types right now. Please try again.');
                }
            } finally {
                if (mounted) setIsRoomTypesLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [branchId]);

    const handleCycleDateRange = () => {
        setTempStartDate(startDate);
        setTempEndDate(endDate);
        setActiveDateField('start');
        setViewDate(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
        setShowDatePicker(true);
    };

    const handleConfirmDateRange = () => {
        setStartDate(tempStartDate);
        setEndDate(tempEndDate);
        setShowDatePicker(false);
    };

    const handleCancelDatePicker = () => {
        setShowDatePicker(false);
    };

    const formatDateLabel = () => {
        const formatDay = (date) => String(date.getDate()).padStart(2, '0');
        return `${MONTH_NAMES[startDate.getMonth()]} ${formatDay(startDate)} - ${MONTH_NAMES[endDate.getMonth()]} ${formatDay(endDate)}`;
    };

    const isSameDate = (left, right) => {
        return left.getFullYear() === right.getFullYear()
            && left.getMonth() === right.getMonth()
            && left.getDate() === right.getDate();
    };

    const handleChangeMonth = (delta) => {
        setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    const handleSelectDate = (day) => {
        const pickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        const today = getToday();

        if (pickedDate < today) {
            return;
        }

        if (activeDateField === 'start') {
            setTempStartDate(pickedDate);
            if (pickedDate >= tempEndDate) {
                setTempEndDate(new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate() + 1));
            }
            setActiveDateField('end');
            const nextDay = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate() + 1);
            setViewDate(new Date(nextDay.getFullYear(), nextDay.getMonth(), 1));
            return;
        }

        if (pickedDate > tempStartDate) {
            setTempEndDate(pickedDate);
        }
    };

    const formatBookingDate = (date) => {
        const formattedDay = String(date.getDate()).padStart(2, '0');
        const month = MONTH_NAMES[date.getMonth()];
        const year = date.getFullYear();
        return `9h00' ${formattedDay} ${month} ${year}`;
    };

    const bookingCheckIn = formatBookingDate(startDate);
    const bookingCheckOut = formatBookingDate(endDate);

    const handleRefresh = () => {
        setIsRefreshing(true);
        setIsRefreshing(false);
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
                            <View className="flex-1 pr-4">
                                <Text className="font-sf-bold text-[24px] leading-[28px] text-black">{hotelName}</Text>
                                <View className="flex-row items-center mt-1">
                                    <Feather name="map-pin" size={15} color="#9a9a9a"/>
                                    <Text className="font-sf text-[16px] leading-[22px] text-[#8b8b8b] ml-1.5" numberOfLines={1}>
                                        {hotelAddress}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity className="w-12 h-12 rounded-full border-[3px] border-[#d2d2d2] bg-[#efefef] items-center justify-center mt-0.5">
                                <MaterialCommunityIcons name="map-marker-radius-outline" size={24} color="#a4a4a4"/>
                            </TouchableOpacity>
                        </View>

                        <RatingRow rating={rating} reviews={reviews}/>

                        <Text className="font-sf-semi text-[18px] leading-[22px] mt-4 text-black">Description</Text>
                        <Text className="font-sf text-[16px] leading-[24px] text-extra mt-1">
                            {isDescriptionExpanded ? detailDescription : previewDescription}
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
                    <View className="rounded-[24px] bg-[#e9e9e9] px-3.5 pt-4 pb-3">
                        <Text className="font-sf-semi text-[18px] leading-[22px] text-black">Room types</Text>
                        <Text className="font-sf text-[16px] leading-[22px] text-extra mt-1">
                            Choose a room type and book instantly. If a type is sold out, we will disable it.
                        </Text>

                        <View className="mt-4 mb-2">
                            <TouchableOpacity
                                className="rounded-full bg-[#eef0ff] px-4 py-2.5 flex-row items-center w-fit border border-primary"
                                onPress={handleCycleDateRange}
                                activeOpacity={0.7}
                            >
                                <Feather name="calendar" size={16} color="#5b5bff"/>
                                <Text className="ml-2 font-sf-semi text-[15px] text-primary">{formatDateLabel()}</Text>
                            </TouchableOpacity>
                        </View>

                        {isRoomTypesLoading ? (
                            <View className="py-8 items-center justify-center">
                                <ActivityIndicator size="small" color="#5b79df" />
                            </View>
                        ) : roomTypes.length ? (
                            <View className="mt-2" style={{gap: 12}}>
                                {roomTypes.map((type) => {
                                    const typeId = String(type?.id || '').trim();
                                    const typeName = String(type?.name || '').trim() || 'Room type';
                                    const price = Number(type?.basePrice || 0);
                                    const available = Number(type?.available_count ?? type?.availableCount ?? 0);
                                    const soldOut = !(available > 0);
                                    const desc = String(type?.description || '').trim();
                                    const amenities = Array.isArray(type?.roomAmenities)
                                        ? type.roomAmenities.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 3).join(' • ')
                                        : '';
                                    const image = (Array.isArray(type?.images) && type.images.length ? String(type.images[0] || '').trim() : '') || heroImage;

                                    return (
                                        <View key={typeId || typeName} className="rounded-[18px] bg-white border border-[#e7e9f2] px-4 py-4" style={{opacity: soldOut ? 0.55 : 1}}>
                                            <View className="flex-row items-start justify-between">
                                                <View className="flex-1 pr-3">
                                                    <Text className="font-sf-bold text-[18px] leading-[22px] text-black">{typeName}</Text>
                                                    <Text className="font-sf-semi text-[16px] leading-[22px] text-primary mt-1">{formatVnd(price || 0)}</Text>
                                                    {amenities ? (
                                                        <Text className="font-sf text-[15px] leading-[22px] text-[#333333] mt-2" numberOfLines={1}>{amenities}</Text>
                                                    ) : null}
                                                    {desc ? (
                                                        <Text className="font-sf text-[15px] leading-[22px] text-[#333333] mt-1" numberOfLines={2}>{desc}</Text>
                                                    ) : null}
                                                    <Text className="font-sf-semi text-[15px] leading-[22px] mt-2 text-[#333333]">
                                                        {soldOut ? 'Sold out' : `${available} rooms left`}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    disabled={soldOut || !typeId}
                                                    activeOpacity={0.85}
                                                    className={`rounded-full px-4 py-2 mt-0.5 ${soldOut ? 'bg-[#d7d7d7]' : 'bg-primary'}`}
                                                    onPress={() => navigation.navigate('CustomerBookingScreen', {
                                                        syncToken: Date.now(),
                                                        branchId,
                                                        roomTypeId: typeId,
                                                        hotelName,
                                                        hotelAddress,
                                                        roomName: typeName,
                                                        heroImage: image,
                                                        startDateIso: startDate.toISOString(),
                                                        endDateIso: endDate.toISOString(),
                                                        roomPrice: price,
                                                        checkIn: bookingCheckIn,
                                                        checkOut: bookingCheckOut,
                                                        reviews,
                                                        rating,
                                                    })}
                                                >
                                                    <Text className="text-white font-sf-semi text-[15px] leading-[20px]">{soldOut ? 'Sold out' : 'Book now'}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            <Text className="font-sf text-[15px] leading-[22px] text-[#333333] py-8 text-center">
                                No room types available for this branch yet.
                            </Text>
                        )}
                    </View>

                    <WatchlistCard watchlist={watchlist} reviews={reviewsList}/>
                </View>
            </ScrollView>

            

            <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={handleCancelDatePicker}>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl px-4 pt-6 pb-6">
                        <View className="flex-row justify-between items-center mb-2">
                            <Text className="font-sf-bold text-[24px] text-black">Select Date Range</Text>
                            <TouchableOpacity onPress={handleCancelDatePicker}>
                                <Ionicons name="close" size={28} color="#2d2d2d"/>
                            </TouchableOpacity>
                        </View>
                        <Text className="font-sf text-[14px] text-[#8b8b8b] mb-4">Choose check-in and check-out date</Text>

                        <View className="flex-row items-center justify-between mb-3">
                            <TouchableOpacity
                                className="w-8 h-8 rounded-full border border-[#e2e2e2] items-center justify-center bg-[#f8f8f8]"
                                onPress={() => handleChangeMonth(-1)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="chevron-back" size={18} color="#4d4d4d"/>
                            </TouchableOpacity>
                            <Text className="font-sf-bold text-[16px] text-[#2d2d2d]">
                                {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                            </Text>
                            <TouchableOpacity
                                className="w-8 h-8 rounded-full border border-[#e2e2e2] items-center justify-center bg-[#f8f8f8]"
                                onPress={() => handleChangeMonth(1)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="chevron-forward" size={18} color="#4d4d4d"/>
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row gap-3 mb-5">
                            <TouchableOpacity
                                className={`flex-1 rounded-2xl p-3 border ${activeDateField === 'start' ? 'border-primary bg-[#eef0ff]' : 'border-[#e3e3e3] bg-[#f7f7f7]'}`}
                                onPress={() => setActiveDateField('start')}
                                activeOpacity={0.8}
                            >
                                <Text className="font-sf text-[12px] text-[#8b8b8b]">Check-in</Text>
                                <Text className="font-sf-bold text-[18px] text-black mt-1">
                                    {MONTH_NAMES[tempStartDate.getMonth()]} {String(tempStartDate.getDate()).padStart(2, '0')}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className={`flex-1 rounded-2xl p-3 border ${activeDateField === 'end' ? 'border-primary bg-[#eef0ff]' : 'border-[#e3e3e3] bg-[#f7f7f7]'}`}
                                onPress={() => setActiveDateField('end')}
                                activeOpacity={0.8}
                            >
                                <Text className="font-sf text-[12px] text-[#8b8b8b]">Check-out</Text>
                                <Text className="font-sf-bold text-[18px] text-black mt-1">
                                    {MONTH_NAMES[tempEndDate.getMonth()]} {String(tempEndDate.getDate()).padStart(2, '0')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View className="rounded-2xl bg-[#f9f9f9] p-3 mb-6">
                            <Text className="font-sf-semi text-[14px] text-[#8b8b8b] mb-3">
                                {activeDateField === 'start' ? 'Pick your check-in date' : 'Pick your check-out date'}
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {(() => {
                                    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
                                    const firstWeekday = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
                                    const dayCells = [
                                        ...Array.from({length: firstWeekday}, (_, index) => ({
                                            key: `empty-${index}`,
                                            isEmpty: true,
                                        })),
                                        ...Array.from({length: daysInMonth}, (_, index) => ({
                                            key: `day-${index + 1}`,
                                            day: index + 1,
                                            isEmpty: false,
                                        })),
                                    ];

                                    return dayCells.map((cell) => {
                                        if (cell.isEmpty) {
                                            return <View key={cell.key} className="w-[14%] py-2"/>;
                                        }

                                        const day = cell.day;
                                        const candidateDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                                        const today = getToday();
                                        const isPastDate = candidateDate < today;
                                        const isDisabled = isPastDate || (activeDateField === 'end' && candidateDate <= tempStartDate);
                                        const isSelected = activeDateField === 'start'
                                            ? isSameDate(candidateDate, tempStartDate)
                                            : isSameDate(candidateDate, tempEndDate);

                                        return (
                                            <TouchableOpacity
                                                key={cell.key}
                                                className={`w-[14%] py-2 rounded-xl border ${
                                                    isSelected
                                                        ? 'bg-primary border-primary'
                                                        : isDisabled
                                                            ? 'bg-[#f2f2f2] border-[#ececec]'
                                                            : 'bg-white border-[#e2e2e2]'
                                                }`}
                                                onPress={() => handleSelectDate(day)}
                                                disabled={isDisabled}
                                                activeOpacity={0.8}
                                            >
                                                <Text className={`text-center font-sf-semi text-[13px] ${
                                                    isSelected ? 'text-white' : isDisabled ? 'text-[#cccccc]' : 'text-[#666]'
                                                }`}>
                                                    {day}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    });
                                })()}
                            </View>
                        </View>

                        <View className="flex-row gap-3">
                            <TouchableOpacity
                                className="flex-1 bg-[#f0f0f0] rounded-full py-3"
                                onPress={handleCancelDatePicker}
                            >
                                <Text className="text-center font-sf-semi text-[16px] text-[#8b8b8b]">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 bg-primary rounded-full py-3"
                                onPress={handleConfirmDateRange}
                            >
                                <Text className="text-center font-sf-semi text-[16px] text-white">Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
