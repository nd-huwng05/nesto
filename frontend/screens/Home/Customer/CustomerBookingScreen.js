import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  RefreshControl,
  TextInput,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Ionicons, Feather} from '@expo/vector-icons';
import {useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getSession} from '../../../utils/authStorage';
import {quoteBooking} from '../../../services/CustomerBookingService';
import {formatVnd} from '../../../utils/formatCurrency';
import BookingDateTimePicker from '../../../components/booking/BookingDateTimePicker';
import TierPricingSummary from '../../../components/booking/TierPricingSummary';
import {
  calculateDepositAmount,
  calculateHoldMinutes,
  calculateTieredRoomPrice,
  formatDateTimeLabel,
  normalizeTierRates,
} from '../../../utils/roomPricing';
import {
  buildBookingContextPayload,
  buildPaymentNavigationParams,
  getToday,
  normalizeSelectedServices,
  readSessionSelectedServices,
  resolveBookingSession,
  resolveRoomDisplayName,
  resolveStayDates,
  servicesEqual,
  writeBookingSession,
} from '../../../utils/bookingCheckout';

const DEPOSIT_OPTIONS = [20, 50, 100];

/**
 * CustomerBookingScreen — man CHECKOUT (buoc 3 trong luong dat phong).
 *
 * - Hien thi gia phong, ngay o, deposit %
 * - Nut "Add services" -> ServiceSelectionScreen
 * - Nut "Continue to payment" -> goi API quote -> chuyen Payment (bookingDraft, chua tao DB)
 */
const CustomerBookingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const {
    hotelName = '',
    roomName: routeRoomName = '',
    roomTypeId,
    checkIn: initialCheckIn = '',
    checkOut: initialCheckOut = '',
    startDateIso,
    endDateIso,
    startDate,
    endDate,
    roomPrice,
    pricePerHour: routePricePerHour,
    pricePerHalfDay: routePricePerHalfDay,
    pricePerDay: routePricePerDay,
    branchId,
    hotelAddress,
    syncToken,
    serviceSyncToken,
    selectedService: routeSelectedService = null,
    selectedServices: routeSelectedServices = [],
    reviews = 0,
    rating = 0,
    heroImage = '',
  } = route.params || {};

  const session = useMemo(
    () => resolveBookingSession(route.params),
    [
      syncToken,
      serviceSyncToken,
      branchId,
      hotelName,
      roomTypeId,
      startDateIso,
      endDateIso,
      heroImage,
      roomPrice,
      routePricePerHour,
      routePricePerHalfDay,
      routePricePerDay,
      initialCheckIn,
      initialCheckOut,
      reviews,
      rating,
      routeRoomName,
    ]
  );

  const roomName = resolveRoomDisplayName(
    routeRoomName || session.roomName,
    route.params?.room?.name,
    route.params?.room?.roomName,
    route.params?.roomName,
    route.params?.roomNumber,
    route.params?.room?.roomNumber,
    route.params?.room?.number
  );

  const hotelNameResolved = hotelName || session.hotelName || '';
  const branchIdResolved = branchId || session.branchId || '';
  const roomTypeIdResolved = roomTypeId || session.roomTypeId || '';
  const hotelAddressResolved = hotelAddress || session.hotelAddress || '';
  const heroImageResolved = heroImage || session.heroImage || '';
  const roomPriceResolved = roomPrice ?? session.roomPrice;
  const pricePerHourResolved = routePricePerHour ?? session.pricePerHour;
  const pricePerHalfDayResolved = routePricePerHalfDay ?? session.pricePerHalfDay;
  const pricePerDayResolved = routePricePerDay ?? session.pricePerDay;
  const reviewsResolved = reviews || session.reviews || 0;
  const ratingResolved = rating || session.rating || 0;
  const checkInLabelResolved = initialCheckIn || session.checkIn || '';
  const checkOutLabelResolved = initialCheckOut || session.checkOut || '';

  const bootDates = resolveStayDates({
    startDateIso: startDateIso || session.startDateIso,
    endDateIso: endDateIso || session.endDateIso,
    startDate,
    endDate,
    initialCheckIn: checkInLabelResolved,
    initialCheckOut: checkOutLabelResolved,
  });

  const [selectedStartDate, setSelectedStartDate] = useState(bootDates.start);
  const [selectedEndDate, setSelectedEndDate] = useState(bootDates.end);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState('start');
  const [viewDate, setViewDate] = useState(
    () => new Date(bootDates.start.getFullYear(), bootDates.start.getMonth(), 1)
  );

  const routeDatesKey = `${syncToken || ''}|${startDateIso || ''}|${endDateIso || ''}`;

  useEffect(() => {
    if (!startDateIso && !endDateIso && !syncToken) {
      return;
    }
    const nextDates = resolveStayDates({
      startDateIso: startDateIso || session.startDateIso,
      endDateIso: endDateIso || session.endDateIso,
      startDate,
      endDate,
      initialCheckIn: checkInLabelResolved,
      initialCheckOut: checkOutLabelResolved,
    });
    setSelectedStartDate((prev) => (prev.getTime() === nextDates.start.getTime() ? prev : nextDates.start));
    setSelectedEndDate((prev) => (prev.getTime() === nextDates.end.getTime() ? prev : nextDates.end));
    setViewDate((prev) => {
      const next = new Date(nextDates.start.getFullYear(), nextDates.start.getMonth(), 1);
      return prev.getTime() === next.getTime() ? prev : next;
    });
  }, [routeDatesKey]);

  const tierRates = useMemo(
    () =>
      normalizeTierRates({
        pricePerHour: pricePerHourResolved,
        pricePerHalfDay: pricePerHalfDayResolved,
        pricePerDay: pricePerDayResolved ?? roomPriceResolved,
        basePrice: roomPriceResolved,
      }),
    [pricePerHourResolved, pricePerHalfDayResolved, pricePerDayResolved, roomPriceResolved]
  );

  const pricingQuote = useMemo(
    () => calculateTieredRoomPrice(tierRates, selectedStartDate, selectedEndDate),
    [tierRates, selectedStartDate, selectedEndDate]
  );

  const checkIn = formatDateTimeLabel(selectedStartDate);
  const checkOut = formatDateTimeLabel(selectedEndDate);

  const stayHours = useMemo(() => pricingQuote.durationHours || 0, [pricingQuote.durationHours]);
  const stayDays = useMemo(() => Math.max(1, Math.ceil((stayHours || 1) / 24)), [stayHours]);
  const roomTotal = useMemo(() => pricingQuote.roomTotal || 0, [pricingQuote.roomTotal]);
  const nightlyPrice = tierRates.pricePerDay;

  const [selectedServices, setSelectedServices] = useState(() => {
    const fromRoute = normalizeSelectedServices(routeSelectedServices);
    if (fromRoute.length) return fromRoute;
    if (routeSelectedService?.id) return normalizeSelectedServices([routeSelectedService]);
    return readSessionSelectedServices();
  });

  const lastSyncTokenRef = useRef(String(syncToken || ''));

  useEffect(() => {
    const token = String(syncToken || '');
    if (!token || token === lastSyncTokenRef.current) return;
    lastSyncTokenRef.current = token;
    setSelectedServices([]);
    writeBookingSession({selectedServices: []});
  }, [syncToken]);

  useFocusEffect(
    useCallback(() => {
      const cached = readSessionSelectedServices();
      if (!cached.length) return;
      setSelectedServices((prev) => (servicesEqual(prev, cached) ? prev : cached));
    }, [])
  );

  useEffect(() => {
    if (!serviceSyncToken) return;
    const services = route.params?.selectedServices;
    if (!Array.isArray(services)) return;
    const next = normalizeSelectedServices(services);
    writeBookingSession({selectedServices: next});
    setSelectedServices((prev) => (servicesEqual(prev, next) ? prev : next));
  }, [serviceSyncToken]);

  const selectedServiceIds = useMemo(
    () => selectedServices.map((service) => service.id),
    [selectedServices]
  );

  const servicesTotal = useMemo(
    () => selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0),
    [selectedServices]
  );

  const subtotalAmount = roomTotal + servicesTotal;
  const [depositPercent, setDepositPercent] = useState(20);
  const depositAmount = useMemo(
    () => calculateDepositAmount(roomTotal, depositPercent),
    [roomTotal, depositPercent]
  );
  const stayMinutes = useMemo(() => pricingQuote.durationMinutes || Math.max(1, Math.round(stayHours * 60)), [pricingQuote.durationMinutes, stayHours]);
  const holdMinutes = useMemo(
    () => calculateHoldMinutes(stayMinutes, depositPercent),
    [stayMinutes, depositPercent]
  );
  const stayTimeLabel = `${pricingQuote.pricingTier || 'stay'} · ${stayMinutes} min`;
  const [bookingError, setBookingError] = useState('');
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);

  const sanitizeEmail = (value) => {
    const text = String(value || '').trim();
    return text && text !== 'N/A' ? text : '';
  };

  const sanitizePhone = (value) => {
    const text = String(value || '').trim();
    return text && text !== 'N/A' ? text : '';
  };

  const [account, setAccount] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadAccount = async () => {
      try {
        const session = await getSession();
        const user = session?.user ?? {};
        const rawName = String(user?.name || user?.full_name || '').trim();

        if (mounted) {
          setAccount({
            name: rawName,
            email: sanitizeEmail(user?.email),
            phone: sanitizePhone(user?.phone),
          });
        }
      } catch {
        Alert.alert('Account', 'Unable to load your account details right now.');
      } finally {
        if (mounted) {
          setAccountLoaded(true);
        }
      }
    };

    loadAccount();

    return () => {
      mounted = false;
    };
  }, []);

  const displayName = useMemo(() => {
    const value = String(account.name || '').trim();
    if (!value) return 'Guest';
    return value
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }, [account.name]);

  useEffect(() => {
    if (!accountLoaded) return;
    if (!branchIdResolved) {
      setBookingError('Missing branch for booking');
    } else {
      setBookingError('');
    }
  }, [accountLoaded, branchIdResolved]);

  const handleOpenDatePicker = (field) => {
    setActiveDateField(field);
    const baseDate = field === 'start' ? selectedStartDate : selectedEndDate;
    setViewDate(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    setShowDatePicker(true);
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
      setSelectedStartDate(pickedDate);
      if (pickedDate >= selectedEndDate) {
        setSelectedEndDate(new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate() + 1));
      }
      setActiveDateField('end');
      const nextDay = new Date(pickedDate.getFullYear(), pickedDate.getMonth(), pickedDate.getDate() + 1);
      setViewDate(new Date(nextDay.getFullYear(), nextDay.getMonth(), 1));
      return;
    }

    if (pickedDate > selectedStartDate) {
      setSelectedEndDate(pickedDate);
      setShowDatePicker(false);
    }
  };

  const formatDateForUpcoming = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  /** Buoc cuoi checkout: quote API -> sang Payment (chua tao booking tren server). */
  const handleBookNow = async () => {
    if (!branchIdResolved) {
      setBookingError('Missing branch for booking');
      Alert.alert('Booking', 'This property is missing branch information. Go back and choose a room again.');
      return;
    }
    if (!roomTypeIdResolved) {
      Alert.alert('Booking', 'Please choose a room type before booking.');
      return;
    }
    const email = sanitizeEmail(account.email);
    if (!email) {
      Alert.alert('Booking', 'Please add your email in Profile before booking.');
      return;
    }
    if (selectedEndDate <= selectedStartDate) {
      Alert.alert('Booking', 'Check-out must be after check-in.');
      return;
    }

    setBookingError('');
    setIsQuoting(true);
    try {
      const quoteRes = await quoteBooking({
        branchId: branchIdResolved,
        roomTypeId: roomTypeIdResolved,
        checkInAt: selectedStartDate.toISOString(),
        expectedCheckOutAt: selectedEndDate.toISOString(),
        depositPercentage: depositPercent,
      });
      if (quoteRes.status !== 'success' || !quoteRes.data) {
        Alert.alert('Booking', quoteRes.message || 'Unable to calculate booking price. Try again.');
        return;
      }

      const q = quoteRes.data;
      const serverRoomTotal = Number(q.roomTotal || q.room_total || 0);
      const serverDeposit = Number(q.depositAmount || q.deposit_amount || depositAmount);
      const serverHoldMinutes = Number(q.holdMinutes || q.hold_minutes || holdMinutes);
      const serverStayMinutes = Number(q.durationMinutes || q.duration_minutes || stayMinutes);

      if (serverRoomTotal <= 0) {
        Alert.alert('Booking', 'Room price is unavailable for this stay. Adjust your dates and try again.');
        return;
      }

      writeBookingSession({
        selectedServices,
        hotelName: hotelNameResolved,
        roomName,
        branchId: branchIdResolved,
        roomTypeId: roomTypeIdResolved,
      });

      navigation.navigate(
        'CustomerPaymentScreen',
        buildPaymentNavigationParams({
          heroImage: heroImageResolved,
          hotelName: hotelNameResolved,
          roomName,
          branchId: branchIdResolved,
          roomTypeId: roomTypeIdResolved,
          checkIn,
          checkOut,
          checkInDateIso: selectedStartDate.toISOString(),
          checkOutDateIso: selectedEndDate.toISOString(),
          name: displayName,
          email,
          phone: account.phone || '',
          subtotalAmount: serverRoomTotal + servicesTotal,
          totalAmount: serverRoomTotal + servicesTotal,
          depositAmount: serverDeposit,
          depositPercent,
          holdMinutes: serverHoldMinutes,
          stayMinutes: serverStayMinutes,
          roomTotal: serverRoomTotal,
          servicesTotal,
          nightlyPrice,
          stayDays,
          stayTimeLabel: `${q.pricingTier || pricingQuote.pricingTier || 'stay'} · ${serverStayMinutes} min`,
          pricingTier: q.pricingTier || pricingQuote.pricingTier,
          selectedServices,
          serviceIds: selectedServiceIds,
          bookingDraft: {
            branchId: branchIdResolved,
            hotelName: hotelNameResolved,
            hotelAddress: hotelAddressResolved || '',
            roomType: roomName,
            roomTypeId: roomTypeIdResolved,
            guestName: displayName,
            email,
            phone: account.phone || '',
            checkInAt: selectedStartDate.toISOString(),
            expectedCheckOutAt: selectedEndDate.toISOString(),
            serviceIds: selectedServiceIds,
            depositPercentage: depositPercent,
            specialRequests: String(specialRequests || '').trim(),
          },
          rating: ratingResolved,
          reviews: reviewsResolved,
        })
      );
    } finally {
      setIsQuoting(false);
    }
  };

  const buildBookingContext = () =>
    writeBookingSession(
      buildBookingContextPayload({
        routeSyncToken: syncToken,
        cachedSyncToken: session.syncToken,
        hotelName: hotelNameResolved,
        roomName,
        roomTypeId: roomTypeIdResolved,
        branchId: branchIdResolved,
        hotelAddress: hotelAddressResolved,
        heroImage: heroImageResolved,
        roomPrice: roomPriceResolved,
        tierRates,
        selectedStartDate,
        selectedEndDate,
        checkIn,
        checkOut,
        reviews: reviewsResolved,
        rating: ratingResolved,
      })
    );

  const handleOpenServiceSelection = () => {
    if (!branchIdResolved) {
      Alert.alert('Services', 'Branch information is missing for this booking.');
      return;
    }
    const context = buildBookingContext();
    writeBookingSession({...context, selectedServices});
    navigation.navigate('ServiceSelectionScreen', {
      mode: 'checkout',
      branchId: branchIdResolved,
      selectedServices,
      bookingContext: context,
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const session = await getSession();
      const user = session?.user ?? {};
      setAccount({
        name: String(user?.name || user?.full_name || '').trim(),
        email: sanitizeEmail(user?.email),
        phone: sanitizePhone(user?.phone),
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.checkoutHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>
        <View style={styles.checkoutHeaderText}>
          <Text style={styles.checkoutRoomTitle} numberOfLines={1}>{roomName}</Text>
          <Text style={styles.checkoutHotelTitle} numberOfLines={1}>{hotelNameResolved}</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#5b79df']}
            tintColor="#5b79df"
          />
        }
      >
        <View style={styles.heroWrap}>
          <Image source={{ uri: heroImageResolved }} style={styles.heroImage} resizeMode="cover" />
        </View>
        <View style={styles.roomInfoBox}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{ratingResolved}</Text>
            <Text style={styles.reviewText}>- {reviewsResolved} Reviews</Text>
          </View>
        </View>
        {/* Check-in/out */}
        <View style={styles.checkRow}>
          <Text style={styles.checkLabel}>Check-in:</Text>
          <TouchableOpacity
            style={styles.checkInput}
            activeOpacity={0.8}
            onPress={() => handleOpenDatePicker('start')}
          >
            <Feather name="calendar" size={16} color="#888" />
            <Text style={styles.checkText}>{checkIn}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.checkRow}>
          <Text style={styles.checkLabel}>Check-out:</Text>
          <TouchableOpacity
            style={styles.checkInput}
            activeOpacity={0.8}
            onPress={() => handleOpenDatePicker('end')}
          >
            <Feather name="calendar" size={16} color="#888" />
            <Text style={styles.checkText}>{checkOut}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.addServicesBtn} onPress={handleOpenServiceSelection} activeOpacity={0.88}>
          <View style={styles.addServicesLeft}>
            <Ionicons name="add-circle-outline" size={22} color="#5b79df" />
            <Text style={styles.addServicesText}>Add services (+)</Text>
          </View>
          <Text style={styles.addServicesMeta}>
            {selectedServices.length ? `${selectedServices.length} · ${formatVnd(servicesTotal)}` : 'Optional'}
          </Text>
        </TouchableOpacity>

        <View style={styles.specialRequestsBox}>
          <Text style={styles.summaryTitle}>Special requests (optional)</Text>
          <TextInput
            style={styles.specialRequestsInput}
            placeholder="Early check-in, extra pillows, dietary needs..."
            placeholderTextColor="#9ca3af"
            value={specialRequests}
            onChangeText={setSpecialRequests}
            multiline
            maxLength={500}
          />
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Checkout summary</Text>
          <Text style={styles.summaryNote}>Review your stay before confirming</Text>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Guest</Text><Text style={styles.summaryValue}>{displayName}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Email</Text><Text style={styles.summaryValue}>{account.email}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Phone</Text><Text style={styles.summaryValue}>{account.phone}</Text></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Hotel</Text><Text style={styles.summaryValue}>{hotelNameResolved}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Room</Text><Text style={styles.summaryValue}>{roomName}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Stay</Text><Text style={styles.summaryValue}>{stayTimeLabel}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Check-in</Text><Text style={styles.summaryValue}>{checkIn}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Check-out</Text><Text style={styles.summaryValue}>{checkOut}</Text></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Room ({pricingQuote.pricingTier || 'tier'} · {stayMinutes} min)
            </Text>
            <Text style={styles.summaryValue}>{formatVnd(roomTotal)}</Text>
          </View>
          {selectedServices.length ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Services ({selectedServices.length})</Text>
                <Text style={styles.summaryValue}>{formatVnd(servicesTotal)}</Text>
              </View>
              {selectedServices.map((service) => (
                <Text key={service.id} style={styles.summaryServiceHint}>• {service.name}</Text>
              ))}
            </>
          ) : null}
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>Subtotal</Text>
            <Text style={styles.summaryValueBold}>{formatVnd(subtotalAmount)}</Text>
          </View>
        </View>

        <TierPricingSummary
          tierRates={tierRates}
          pricingQuote={pricingQuote}
          roomTotal={roomTotal}
          servicesTotal={servicesTotal}
          subtotalAmount={subtotalAmount}
        />

        <View style={styles.summaryBox}>
          <Text style={styles.depositSectionTitle}>Deposit amount</Text>
          <View style={styles.depositOptionsRow}>
            {DEPOSIT_OPTIONS.map((option) => {
              const active = depositPercent === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.depositOption, active ? styles.depositOptionActive : null]}
                  onPress={() => setDepositPercent(option)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.depositOptionText, active ? styles.depositOptionTextActive : null]}>
                    {option}%
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.holdNote}>Required deposit (room only): {formatVnd(depositAmount)}</Text>
          <Text style={styles.holdNote}>
            Late hold: {holdMinutes} minutes ({depositPercent}% of stay). After this, booking becomes no-show.
          </Text>
          {bookingError ? <Text style={styles.bookingError}>{bookingError}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, {paddingBottom: Math.max(insets.bottom, 12)}]}>
        <TouchableOpacity style={styles.bookBtn} onPress={handleBookNow} activeOpacity={0.9} disabled={isQuoting}>
          {isQuoting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.bookBtnText}>Continue to payment · {formatVnd(depositAmount)} deposit</Text>
          )}
        </TouchableOpacity>
      </View>

      <BookingDateTimePicker
        visible={showDatePicker}
        checkInDate={selectedStartDate}
        checkOutDate={selectedEndDate}
        onCancel={() => setShowDatePicker(false)}
        onConfirm={({checkIn, checkOut}) => {
          setSelectedStartDate(checkIn);
          setSelectedEndDate(checkOut);
          setShowDatePicker(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  scroll: {
    flex: 1,
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutHeaderText: {
    flex: 1,
    paddingLeft: 4,
    minWidth: 0,
  },
  checkoutRoomTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  checkoutHotelTitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 2,
  },
  addServicesBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addServicesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addServicesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  addServicesMeta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5b79df',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 12,
  },
  servicesCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  servicesLoader: {
    marginVertical: 12,
  },
  servicesError: {
    fontSize: 15,
    color: '#DC2626',
    marginBottom: 8,
  },
  servicesEmpty: {
    fontSize: 15,
    color: '#6B7280',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  serviceRowSelected: {
    borderColor: '#5b79df',
    backgroundColor: '#F3F6FF',
  },
  serviceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  serviceCopy: {
    flex: 1,
    paddingRight: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  serviceDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  servicePriceCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  servicePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  bookingError: {
    marginTop: 10,
    fontSize: 14,
    color: '#DC2626',
  },
  depositSectionTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  depositOptionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  depositOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  depositOptionActive: {
    borderColor: '#5b79df',
    backgroundColor: '#EEF2FF',
  },
  depositOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  depositOptionTextActive: {
    color: '#5b79df',
  },
  holdNote: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    marginTop: 4,
  },
  bookBtnDisabled: {
    opacity: 0.7,
  },
  heroWrap: {
    height: 180,
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  roomInfoBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 16,
    padding: 16,
    marginTop: -34,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  roomName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
  },
  hotelName: {
    fontSize: 15,
    color: '#888',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 15,
    color: '#222',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  reviewText: {
    fontSize: 13,
    color: '#888',
    marginLeft: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
  },
  checkLabel: {
    fontSize: 15,
    color: '#222',
    width: 90,
    fontWeight: '500',
  },
  checkInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
    flex: 1,
  },
  checkText: {
    fontSize: 15,
    color: '#222',
    marginLeft: 6,
  },
  depositNote: {
    fontSize: 13,
    color: '#888',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  depositRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  depositLabel: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
  },
  depositValue: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
    marginRight: 16,
  },
  depositPercent: {
    fontSize: 15,
    color: '#222',
    fontWeight: 'bold',
  },
  lateLabel: {
    fontSize: 15,
    color: '#222',
    marginLeft: 8,
    fontWeight: '500',
  },
  lateValue: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  lateTime: {
    fontSize: 15,
    color: '#222',
    fontWeight: 'bold',
  },
  specialRequestsBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  specialRequestsInput: {
    marginTop: 8,
    minHeight: 72,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
    textAlignVertical: 'top',
  },
  summaryBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  summaryNote: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#d5d5d5',
    marginVertical: 6,
  },
  summaryLabel: {
    fontSize: 15,
    color: '#222',
  },
  summaryValue: {
    fontSize: 15,
    color: '#222',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  summaryLabelBold: {
    fontSize: 15,
    color: '#222',
    fontWeight: 'bold',
  },
  summaryValueBold: {
    fontSize: 15,
    color: '#222',
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  summaryServiceHint: {
    marginBottom: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
  },
  bookBtn: {
    backgroundColor: '#8EA6FF',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#8EA6FF',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bookBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  addServiceBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#8EA6FF',
  },
  addServiceBtnDisabled: {
    opacity: 0.55,
  },
  addServiceBtnText: {
    color: '#5167d8',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f1f1f',
  },
  modalHint: {
    marginTop: 2,
    marginBottom: 10,
    fontSize: 13,
    color: '#8b8b8b',
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e1e1e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
  },
  monthNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d2d2d',
  },
  datePreviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  datePreviewCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e3e3e3',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#f7f7f7',
  },
  datePreviewCardActive: {
    borderColor: '#8294FF',
    backgroundColor: '#eef0ff',
  },
  datePreviewLabel: {
    fontSize: 12,
    color: '#8b8b8b',
  },
  datePreviewValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f1f1f',
    marginTop: 2,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  dayCell: {
    width: '13.3%',
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  dayCellEmpty: {
    width: '13.3%',
  },
  dayCellActive: {
    borderColor: '#8294FF',
    backgroundColor: '#8294FF',
  },
  dayCellDisabled: {
    borderColor: '#ececec',
    backgroundColor: '#f2f2f2',
  },
  dayCellText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  dayCellTextActive: {
    color: '#fff',
  },
  dayCellTextDisabled: {
    color: '#c7c7c7',
  },
  modalDoneBtn: {
    marginTop: 14,
    backgroundColor: '#8294FF',
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CustomerBookingScreen;
