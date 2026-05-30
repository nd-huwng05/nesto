import {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Feather, Ionicons} from '@expo/vector-icons';
import {GalleryStrip, RatingRow, WatchlistCard} from '../../../components/customer/CustomerHotelDetailSections';
import BookingDateTimePicker from '../../../components/booking/BookingDateTimePicker';
import TierPricingSummary from '../../../components/booking/TierPricingSummary';
import ScreenHeader from '../../../components/common/ScreenHeader';
import api, {endpoints} from '../../../configuration/Apis';
import {fetchReviews} from '../../../services/ReviewService';
import {mapReviewsToWatchlistCards} from '../../../utils/locketFeed';
import {formatVnd} from '../../../utils/formatCurrency';
import {clearBookingSession} from '../../../utils/bookingCheckout';
import {
  calculateTieredRoomPrice,
  formatDateTimeLabel,
  normalizeTierRates,
} from '../../../utils/roomPricing';

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

export function HomeDetailScreen({navigation, route}) {
  const params = route?.params ?? {};
  const room = params.room ?? {};
  const hotelId = params.hotelId ?? null;
  const hotelName = params.hotelName ?? '';
  const hotelAddress = params.hotelAddress ?? '';
  const branchId = String(params.branchId || room?.branchId || '').trim();
  const roomTypeId = String(params.roomTypeId || room?.roomTypeId || room?.id || '').trim();

  const resolvedRoomName =
    room?.name ||
    room?.roomName ||
    (room?.roomNumber ? `Room ${room.roomNumber}` : '') ||
    (room?.number ? `Room ${room.number}` : 'Room');

  const heroImage = room.image ?? params.heroImage ?? '';
  const rating = Number.isFinite(params.rating) ? params.rating : 0;
  const reviews = Number.isFinite(params.reviews) ? params.reviews : 0;
  const watchlist = params.watchlist ?? null;

  const [checkInDate, setCheckInDate] = useState(() => {
    const iso = params.startDateIso ? new Date(params.startDateIso) : null;
    return iso && Number.isFinite(iso.getTime()) ? iso : buildDefaultCheckIn();
  });
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const iso = params.endDateIso ? new Date(params.endDateIso) : null;
    if (iso && Number.isFinite(iso.getTime())) return iso;
    return buildDefaultCheckOut(checkInDate);
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [roomTypeDetail, setRoomTypeDetail] = useState(null);
  const [loadingType, setLoadingType] = useState(false);

  const tierRates = useMemo(() => {
    if (roomTypeDetail) {
      return normalizeTierRates({
        pricePerHour: roomTypeDetail.pricePerHour,
        pricePerHalfDay: roomTypeDetail.pricePerHalfDay,
        pricePerDay: roomTypeDetail.pricePerDay || roomTypeDetail.basePrice,
      });
    }
    return normalizeTierRates({
      pricePerHour: params.pricePerHour || room?.pricePerHour,
      pricePerHalfDay: params.pricePerHalfDay || room?.pricePerHalfDay,
      pricePerDay: params.roomPrice || params.pricePerDay || room?.price?.amount,
      basePrice: params.roomPrice,
    });
  }, [roomTypeDetail, params, room]);

  const pricingQuote = useMemo(
    () => calculateTieredRoomPrice(tierRates, checkInDate, checkOutDate),
    [tierRates, checkInDate, checkOutDate]
  );

  const roomTotal = pricingQuote.roomTotal || 0;
  const checkIn = formatDateTimeLabel(checkInDate);
  const checkOut = formatDateTimeLabel(checkOutDate);

  const roomDescription = typeof room.description === 'string' ? room.description.trim() : '';
  const hotelDescription = typeof params.hotelDescription === 'string' ? params.hotelDescription.trim() : '';
  const detailDescription = roomDescription.length ? roomDescription : hotelDescription;
  const [isDescriptionExpanded, setDescriptionExpanded] = useState(false);
  const [reviewsList, setReviewsList] = useState([]);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const DESCRIPTION_PREVIEW_LENGTH = 130;
  const hasLongDescription = detailDescription.length > DESCRIPTION_PREVIEW_LENGTH;
  const previewDescription = hasLongDescription
    ? `${detailDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}...`
    : detailDescription;

  const detailGallery = (() => {
    const raw = Array.isArray(params.gallery) ? params.gallery : [];
    const fallback = [room?.image, heroImage].map((x) => String(x || '').trim()).filter(Boolean);
    const merged = [...raw, ...fallback].map((x) => String(x || '').trim()).filter(Boolean);
    return Array.from(new Set(merged));
  })();

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!branchId || !roomTypeId) {
        setRoomTypeDetail(null);
        return;
      }
      setLoadingType(true);
      try {
        const res = await api.get(endpoints['branch-room-types'], {params: {branch_id: branchId}});
        const rows = res?.data?.results || res?.data || [];
        const match = (Array.isArray(rows) ? rows : []).find((row) => String(row?.id) === roomTypeId);
        if (alive) setRoomTypeDetail(match || null);
      } catch {
        if (alive) setRoomTypeDetail(null);
      } finally {
        if (alive) setLoadingType(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [branchId, roomTypeId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!branchId) {
        if (alive) setReviewsList([]);
        return;
      }
      setIsReviewsLoading(true);
      try {
        const res = await fetchReviews({hotelName, roomName: resolvedRoomName, branchId});
        if (!alive) return;
        if (res.status === 'success') {
          setReviewsList(mapReviewsToWatchlistCards(Array.isArray(res.data) ? res.data : []));
        } else {
          setReviewsList([]);
        }
      } catch {
        if (alive) setReviewsList([]);
      } finally {
        if (alive) setIsReviewsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [branchId, hotelName, resolvedRoomName]);

  const handleBook = () => {
    if (!branchId) {
      Alert.alert('Booking', 'Branch information is missing.');
      return;
    }
    if (roomTotal <= 0) {
      Alert.alert('Booking', 'Select valid check-in and check-out times.');
      return;
    }
    clearBookingSession();
    navigation.navigate('CustomerBookingScreen', {
      syncToken: Date.now(),
      branchId,
      roomTypeId,
      hotelName,
      hotelAddress,
      roomName: resolvedRoomName,
      heroImage,
      startDateIso: checkInDate.toISOString(),
      endDateIso: checkOutDate.toISOString(),
      pricePerHour: tierRates.pricePerHour,
      pricePerHalfDay: tierRates.pricePerHalfDay,
      pricePerDay: tierRates.pricePerDay,
      roomPrice: tierRates.pricePerDay,
      checkIn,
      checkOut,
      reviews,
      rating,
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScreenHeader onBack={() => navigation.goBack()} icon="chevron-back" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-white"
        contentContainerStyle={{paddingBottom: 98}}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#5b79df']} tintColor="#5b79df" />
        }
      >
        <View className="mx-3 mt-2 rounded-[26px] overflow-hidden bg-white">
          <Image source={{uri: heroImage}} className="w-full h-[220px]" resizeMode="cover" />

          <View className="bg-white rounded-t-[34px] -mt-8 px-5 pt-6 pb-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="font-sf-bold text-[24px] leading-[28px] text-black">{resolvedRoomName}</Text>
                <Text className="font-sf text-[13px] leading-[18px] text-[#8b8b8b] mt-1">{hotelName}</Text>
                {loadingType ? (
                  <ActivityIndicator size="small" color="#5b79df" style={{marginTop: 8}} />
                ) : (
                  <Text className="font-sf-semi text-[15px] text-primary mt-2">
                    From {formatVnd(tierRates.pricePerHour)}/hr · {formatVnd(roomTotal)} for selected stay
                  </Text>
                )}
              </View>
            </View>

            <RatingRow rating={rating} reviews={reviews} />

            <TouchableOpacity
              className="rounded-full bg-[#eef0ff] px-4 py-2.5 flex-row items-center mt-3 border border-primary self-start"
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.85}
            >
              <Feather name="calendar" size={16} color="#5b5bff" />
              <Text className="ml-2 font-sf-semi text-[14px] text-primary">{checkIn} → {checkOut}</Text>
            </TouchableOpacity>

            <Text className="font-sf-semi text-[18px] leading-[22px] mt-4 text-black">Description</Text>
            <Text className="font-sf text-[14px] leading-[20px] text-extra mt-1">
              {isDescriptionExpanded ? detailDescription : previewDescription}
            </Text>
            {hasLongDescription ? (
              <TouchableOpacity onPress={() => setDescriptionExpanded((prev) => !prev)} activeOpacity={0.8}>
                <Text className="text-[#1897ff] font-sf-semi mt-0.5">
                  {isDescriptionExpanded ? 'Read less' : 'Read more'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <GalleryStrip gallery={detailGallery} />
          </View>
        </View>

        <TierPricingSummary
          tierRates={tierRates}
          pricingQuote={pricingQuote}
          roomTotal={roomTotal}
          subtotalAmount={roomTotal}
        />

        <View className="px-3 mt-2">
          <TouchableOpacity className="bg-primary rounded-full py-3.5 items-center" onPress={handleBook} activeOpacity={0.9}>
            <Text className="text-white font-sf-bold text-[16px]">Continue to checkout · {formatVnd(roomTotal)}</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-3 px-3">
          {isReviewsLoading ? (
            <View className="py-6 items-center justify-center">
              <ActivityIndicator size="small" color="#5b79df" />
            </View>
          ) : (
            <WatchlistCard watchlist={watchlist || null} reviews={reviewsList} />
          )}
        </View>
      </ScrollView>

      <BookingDateTimePicker
        visible={showDatePicker}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
        onCancel={() => setShowDatePicker(false)}
        onConfirm={({checkIn, checkOut}) => {
          setCheckInDate(checkIn);
          setCheckOutDate(checkOut);
          setShowDatePicker(false);
        }}
      />
    </SafeAreaView>
  );
}
