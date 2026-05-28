import {useEffect, useMemo, useState} from 'react';
import {Image, RefreshControl, ScrollView, Text, TouchableOpacity, View, Modal} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather, Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {fakeGetReviews} from '../../../configuration/FakeApi';
import {
    FeaturedTag,
    GalleryStrip,
    PaginationRow,
    RatingRow,
    RoomCard,
    WatchlistCard,
} from '../../../components/customer/CustomerHotelDetailSections';
import CustomerBottomTabBar from '../../../components/customer/CustomerBottomTabBar';

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
    const routeHotelPrice = params.hotelPrice ?? '';
    const heroImage = params.heroImage ?? room.image ?? 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg';
    const rating = Number.isFinite(params.rating) ? params.rating : 5;
    const reviews = Number.isFinite(params.reviews) ? params.reviews : 0;
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
    const [reviewsList, setReviewsList] = useState([]);

    const parseRoomPrice = (value) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }

        const normalized = String(value || '')
            .replace(/[^0-9.,-]/g, '')
            .replace(/,/g, '');
        const parsed = Number.parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const hotelPriceAmount = parseRoomPrice(routeHotelPrice);
    const standardRoomPrice = hotelPriceAmount;
    const vipRoomPrice = Math.round(hotelPriceAmount * 1.35);
    const superVipRoomPrice = Math.round(hotelPriceAmount * 1.7);

    const hotelName = routeHotelName || 'Swiss Hotel';
    const hotelId = params.hotelId ?? 'hotel-1';
    const hotelAddress = params.hotelAddress
        ?? params.location
        ?? '211B Baker Street, London, England';

    useEffect(() => {
        let mounted = true;

        const loadReviews = async () => {
            try {
                const reviewsData = await fakeGetReviews('hotel-1');
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
    }, []);
    const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
    const DESCRIPTION_PREVIEW_LENGTH = 130;
    const hasLongDescription = detailDescription.length > DESCRIPTION_PREVIEW_LENGTH;
    const previewDescription = hasLongDescription
        ? `${detailDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`
        : detailDescription;

    const roomCards = params.roomCards ?? [
        {
            id: 'room-1',
            name: 'Standard Room',
            description: 'Comfortable room for everyday stay.',
            type: 'Family',
            view: 'Beach',
            image: heroImage,
            price: {amount: standardRoomPrice, currency: 'USD'},
        },
        {
            id: 'room-2',
            name: 'VIP Room',
            description: 'Spacious room with upgraded comfort and service.',
            type: 'Business',
            view: 'City',
            image: heroImage,
            price: {amount: vipRoomPrice, currency: 'USD'},
        },
        {
            id: 'room-3',
            name: 'Super VIP Room',
            description: 'Premium suite with top-tier amenities and privacy.',
            type: 'Suite',
            view: 'Ocean',
            image: heroImage,
            price: {amount: superVipRoomPrice, currency: 'USD'},
        },
        {
            id: 'room-4',
            name: 'Standard Room',
            description: 'Quiet room facing the garden for relaxed stays.',
            type: 'Family',
            view: 'Garden',
            image: heroImage,
            price: {amount: Math.round(standardRoomPrice * 1.05), currency: 'USD'},
        },
        {
            id: 'room-5',
            name: 'VIP Room',
            description: 'Executive room with workspace and premium service.',
            type: 'Business',
            view: 'City',
            image: heroImage,
            price: {amount: Math.round(vipRoomPrice * 1.08), currency: 'USD'},
        },
        {
            id: 'room-6',
            name: 'Super VIP Room',
            description: 'Suite with direct ocean view and private lounge.',
            type: 'Suite',
            view: 'Ocean',
            image: heroImage,
            price: {amount: Math.round(superVipRoomPrice * 1.1), currency: 'USD'},
        },
    ];

    const typeOptions = useMemo(() => {
        const values = Array.from(new Set(roomCards.map((item) => String(item?.type || '').trim()).filter(Boolean)));
        return ['All type', ...values];
    }, [roomCards]);

    const featureOptions = useMemo(() => {
        const values = Array.from(new Set(roomCards.map((item) => String(item?.view || '').trim()).filter(Boolean)));
        return ['Feature', ...values.map((value) => `View ${value}`)];
    }, [roomCards]);

    const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
    const [selectedFeatureIndex, setSelectedFeatureIndex] = useState(0);
    const [currentFloor, setCurrentFloor] = useState(1);
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

    const selectedType = typeOptions[selectedTypeIndex] ?? 'All type';
    const selectedFeature = featureOptions[selectedFeatureIndex] ?? 'Feature';

    const filteredRoomCards = useMemo(() => {
        return roomCards.filter((item) => {
            const itemType = String(item?.type || '').trim();
            const itemFeature = `View ${String(item?.view || '').trim()}`;
            const typeMatch = selectedType === 'All type' || itemType === selectedType;
            const featureMatch = selectedFeature === 'Feature' || itemFeature === selectedFeature;
            return typeMatch && featureMatch;
        });
    }, [roomCards, selectedType, selectedFeature]);

    const ROOMS_PER_FLOOR = 3;
    const totalFloors = Math.max(1, Math.ceil(filteredRoomCards.length / ROOMS_PER_FLOOR));

    useEffect(() => {
        setCurrentFloor(1);
    }, [selectedType, selectedFeature]);

    useEffect(() => {
        if (currentFloor > totalFloors) {
            setCurrentFloor(totalFloors);
        }
    }, [currentFloor, totalFloors]);

    const pagedRoomCards = useMemo(() => {
        const start = (currentFloor - 1) * ROOMS_PER_FLOOR;
        return filteredRoomCards.slice(start, start + ROOMS_PER_FLOOR);
    }, [filteredRoomCards, currentFloor]);

    const handleCycleType = () => {
        if (!typeOptions.length) return;
        setSelectedTypeIndex((prev) => (prev + 1) % typeOptions.length);
    };

    const handleCycleFeature = () => {
        if (!featureOptions.length) return;
        setSelectedFeatureIndex((prev) => (prev + 1) % featureOptions.length);
    };

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
        setTimeout(() => {
            setIsRefreshing(false);
        }, 600);
    };

    return (
        <SafeAreaView className="flex-1 bg-[#ececec]">
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
                            <View className="flex-1 pr-4">
                                <Text className="font-sf-bold text-[37px] leading-[40px] text-black">{hotelName}</Text>
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

                        <Text className="font-sf-bold text-[38px] leading-[42px] mt-4 text-black">Description</Text>
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
                        <Text className="font-sf-bold text-[39px] leading-[42px] text-black">Rooms</Text>
                        <Text className="font-sf text-[16px] leading-[22px] text-extra mt-1">
                            Room have many type for family or couple. and many rooms have view beach
                        </Text>

                        <View className="mt-4 mb-3">
                            <TouchableOpacity 
                                className="rounded-full bg-[#eef0ff] px-4 py-2.5 flex-row items-center w-fit mb-3 border border-primary"
                                onPress={handleCycleDateRange}
                                activeOpacity={0.7}
                            >
                                <Feather name="calendar" size={16} color="#5b5bff"/>
                                <Text className="ml-2 font-sf-semi text-[15px] text-primary">{formatDateLabel()}</Text>
                            </TouchableOpacity>
                            <View className="flex-row items-center justify-between gap-3">
                                <TouchableOpacity
                                    className={`rounded-full px-5 py-2 flex-1 ${selectedType !== 'All type' ? 'bg-[#eef0ff]' : 'bg-[#dbdbdb]'}`}
                                    onPress={handleCycleType}
                                    activeOpacity={0.8}
                                >
                                    <Text className={`font-sf text-[15px] text-center ${selectedType !== 'All type' ? 'text-primary' : 'text-[#8f8f8f]'}`}>
                                        {selectedType}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    className={`rounded-full px-5 py-2 flex-1 ${selectedFeature !== 'Feature' ? 'bg-[#eef0ff]' : 'bg-[#dbdbdb]'}`}
                                    onPress={handleCycleFeature}
                                    activeOpacity={0.8}
                                >
                                    <Text className={`font-sf text-[15px] text-center ${selectedFeature !== 'Feature' ? 'text-primary' : 'text-[#8f8f8f]'}`}>
                                        {selectedFeature}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {selectedFeature !== 'Feature' ? (
                            <FeaturedTag label={selectedFeature} onRemove={() => setSelectedFeatureIndex(0)} />
                        ) : null}

                        {pagedRoomCards.length ? (
                            pagedRoomCards.map((roomItem, indexInFloor) => {
                                const displayRoom = {
                                    ...roomItem,
                                    name: roomItem?.name || `Room ${currentFloor * 100 + (indexInFloor + 1)}`,
                                };
                                const resolvedRoomName =
                                    displayRoom?.name
                                    || displayRoom?.roomName
                                    || (displayRoom?.roomNumber ? `Room ${displayRoom.roomNumber}` : '')
                                    || (displayRoom?.number ? `Room ${displayRoom.number}` : 'Room');

                                return (
                                <RoomCard
                                    key={roomItem.id}
                                    room={displayRoom}
                                    onViewDetail={() => navigation.navigate('CustomerRoomDetailScreen', {
                                        room: displayRoom,
                                        hotelId,
                                        hotelName,
                                        hotelAddress,
                                        startDateIso: startDate.toISOString(),
                                        endDateIso: endDate.toISOString(),
                                        roomPrice: displayRoom?.price?.amount,
                                        checkIn: bookingCheckIn,
                                        checkOut: bookingCheckOut,
                                        heroImage: displayRoom.image ?? heroImage,
                                        rating,
                                        reviews,
                                        watchlist,
                                        gallery: [
                                            displayRoom.image ?? heroImage,
                                            ...detailGallery.filter((image) => image !== (displayRoom.image ?? heroImage)),
                                        ],
                                        hotelDescription: detailDescription,
                                    })}
                                    onBookNow={(room) => navigation.navigate('CustomerBookingScreen', {
                                        syncToken: Date.now(),
                                        roomId: room?.id,
                                        hotelName,
                                        hotelAddress,
                                        roomName: resolvedRoomName,
                                        heroImage: room.image ?? heroImage,
                                        startDateIso: startDate.toISOString(),
                                        endDateIso: endDate.toISOString(),
                                        roomPrice: room?.price?.amount,
                                        checkIn: bookingCheckIn,
                                        checkOut: bookingCheckOut,
                                        reviews: reviews,
                                        rating: rating,
                                    })}
                                />
                                );
                            })
                        ) : (
                            <Text className="font-sf text-[15px] text-extra py-6 text-center">
                                No rooms match the selected filters.
                            </Text>
                        )}

                        <PaginationRow
                            currentFloor={currentFloor}
                            totalFloors={totalFloors}
                            onPrev={() => setCurrentFloor((prev) => (prev <= 1 ? totalFloors : prev - 1))}
                            onNext={() => setCurrentFloor((prev) => (prev >= totalFloors ? 1 : prev + 1))}
                        />
                    </View>

                    <WatchlistCard watchlist={watchlist} reviews={reviewsList}/>
                </View>
            </ScrollView>

            <CustomerBottomTabBar navigation={navigation} activeTab="Home"/>

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
