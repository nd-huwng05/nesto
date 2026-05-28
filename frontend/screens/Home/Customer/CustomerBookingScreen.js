import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
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
} from 'react-native';
import {Ionicons, Feather} from '@expo/vector-icons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {getSession} from '../../../utils/authStorage';
import {formatVnd} from '../../../utils/formatCurrency';
import {createMyBooking} from '../../../services/CustomerBookingService';

const DEPOSIT_OPTIONS = [20, 50, 100];

const normalizeSelectedServices = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && item.id)
    .map((item) => ({
      id: String(item.id),
      name: String(item.name || 'Service'),
      price: Number(item.price || 0),
      icon: String(item.icon || ''),
      category: String(item.category || ''),
      description: String(item.description || ''),
    }));
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const getToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const CustomerBookingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
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
    roomId,
    branchId,
    hotelAddress,
    price: legacyPricePerHour,
    discount: legacyDiscountPerHour,
    vat: legacyVat,
    total: legacyTotal,
    deposit: legacyDeposit,
    syncToken,
    serviceSyncToken,
    selectedService: routeSelectedService = null,
    selectedServices: routeSelectedServices = [],
    reviews = 0,
    rating = 0,
    heroImage = '',
  } = route.params || {};

  const resolveRoomName = (...values) => {
    for (const raw of values) {
      if (raw === null || raw === undefined) continue;
      const value = String(raw).trim();
      if (!value) continue;
      const numericOnly = /^\d+$/.test(value);
      return numericOnly ? `Room ${value}` : value;
    }
    return 'Room';
  };

  const roomName = resolveRoomName(
    routeRoomName,
    route.params?.room?.name,
    route.params?.room?.roomName,
    route.params?.roomName,
    route.params?.roomNumber,
    route.params?.room?.roomNumber,
    route.params?.room?.number,
    route.params?.selectedService?.roomName,
    route.params?.selectedServices?.[0]?.roomName
  );

  const parseDateFromLabel = (label, fallbackDate) => {
    const text = String(label || '').trim();
    const match = text.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    if (!match) return fallbackDate;

    const day = Number.parseInt(match[1], 10);
    const month = MONTH_NAMES.findIndex((name) => name.toLowerCase() === match[2].toLowerCase());
    const year = Number.parseInt(match[3], 10);

    if (!Number.isFinite(day) || !Number.isFinite(year) || month < 0) return fallbackDate;
    return new Date(year, month, day);
  };

  const parseIsoDate = (value) => {
    if (typeof value !== 'string') return null;
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  };

  const parsedStartIso = parseIsoDate(startDateIso);
  const parsedEndIso = parseIsoDate(endDateIso);

  const safeStartDate = parsedStartIso
    ? parsedStartIso
    : Number.isFinite(startDate)
    ? new Date(new Date().getFullYear(), new Date().getMonth(), startDate)
    : parseDateFromLabel(initialCheckIn, getToday());
  const safeEndDateCandidate = parsedEndIso
    ? parsedEndIso
    : Number.isFinite(endDate)
    ? new Date(new Date().getFullYear(), new Date().getMonth(), endDate)
    : parseDateFromLabel(initialCheckOut, new Date(safeStartDate.getFullYear(), safeStartDate.getMonth(), safeStartDate.getDate() + 1));
  const safeEndDate = safeEndDateCandidate > safeStartDate
    ? safeEndDateCandidate
    : new Date(safeStartDate.getFullYear(), safeStartDate.getMonth(), safeStartDate.getDate() + 1);

  const [selectedStartDate, setSelectedStartDate] = useState(safeStartDate);
  const [selectedEndDate, setSelectedEndDate] = useState(safeEndDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeDateField, setActiveDateField] = useState('start');
  const [viewDate, setViewDate] = useState(new Date(safeStartDate.getFullYear(), safeStartDate.getMonth(), 1));

  useEffect(() => {
    const syncedStart = parsedStartIso
      ? parsedStartIso
      : Number.isFinite(startDate)
      ? new Date(new Date().getFullYear(), new Date().getMonth(), startDate)
      : parseDateFromLabel(initialCheckIn, getToday());
    const syncedEndCandidate = parsedEndIso
      ? parsedEndIso
      : Number.isFinite(endDate)
      ? new Date(new Date().getFullYear(), new Date().getMonth(), endDate)
      : parseDateFromLabel(initialCheckOut, new Date(syncedStart.getFullYear(), syncedStart.getMonth(), syncedStart.getDate() + 1));
    const syncedEnd = syncedEndCandidate > syncedStart
      ? syncedEndCandidate
      : new Date(syncedStart.getFullYear(), syncedStart.getMonth(), syncedStart.getDate() + 1);

    setSelectedStartDate(syncedStart);
    setSelectedEndDate(syncedEnd);
    setViewDate(new Date(syncedStart.getFullYear(), syncedStart.getMonth(), 1));
  }, [startDateIso, endDateIso, startDate, endDate, initialCheckIn, initialCheckOut, syncToken]);

  const formatBookingDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const checkIn = formatBookingDate(selectedStartDate);
  const checkOut = formatBookingDate(selectedEndDate);

  const stayHours = useMemo(() => {
    const diffMs = selectedEndDate.getTime() - selectedStartDate.getTime();
    if (diffMs > 0) {
      return Math.round(diffMs / (1000 * 60 * 60));
    }
    return 24;
  }, [selectedStartDate, selectedEndDate]);

  const stayDays = useMemo(() => {
    return Math.max(1, Math.round(stayHours / 24));
  }, [stayHours]);

  const nightlyPrice = useMemo(() => {
    if (Number.isFinite(roomPrice) && roomPrice > 0) return roomPrice;
    if (Number.isFinite(legacyPricePerHour) && legacyPricePerHour > 0) return legacyPricePerHour * 24;
    return 0;
  }, [roomPrice, legacyPricePerHour]);

  const roomTotal = useMemo(() => nightlyPrice * stayDays, [nightlyPrice, stayDays]);

  const [selectedServices, setSelectedServices] = useState(() => {
    const fromRoute = normalizeSelectedServices(routeSelectedServices);
    if (fromRoute.length) return fromRoute;
    if (routeSelectedService?.id) return normalizeSelectedServices([routeSelectedService]);
    return [];
  });

  useFocusEffect(
    useCallback(() => {
      if (Array.isArray(route.params?.selectedServices)) {
        setSelectedServices(normalizeSelectedServices(route.params.selectedServices));
      }
    }, [route.params?.selectedServices, route.params?.serviceSyncToken, serviceSyncToken])
  );

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
    () => Math.round(subtotalAmount * (depositPercent / 100)),
    [subtotalAmount, depositPercent]
  );
  const stayMinutes = useMemo(() => Math.max(1, Math.round(stayHours * 60)), [stayHours]);
  const holdMinutes = useMemo(
    () => Math.max(1, Math.round(stayMinutes * (depositPercent / 100))),
    [stayMinutes, depositPercent]
  );
  const stayTimeLabel = `${stayDays} night${stayDays === 1 ? '' : 's'} · ${stayMinutes} min`;
  const [bookingError, setBookingError] = useState('');
  const [accountLoaded, setAccountLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [account, setAccount] = useState({
    name: '',
    email: '',
    phone: 'N/A',
  });

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
            email: String(user?.email || '').trim() || 'N/A',
            phone: String(user?.phone || '').trim() || 'N/A',
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
    if (!branchId) {
      setBookingError('Missing branch for booking');
    } else {
      setBookingError('');
    }
  }, [accountLoaded, branchId]);

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

  const handleBookNow = async () => {
    if (!branchId) {
      setBookingError('Missing branch for booking');
      Alert.alert('Booking', 'This property is missing branch information. Go back and choose a room again.');
      return;
    }
    if (!roomTypeId && !roomName) {
      Alert.alert('Booking', 'Please choose a room type before booking.');
      return;
    }
    if (nightlyPrice <= 0) {
      Alert.alert('Booking', 'Room price is unavailable for this stay. Go back and select a room again.');
      return;
    }

    setIsSubmitting(true);
    setBookingError('');
    try {
      const created = await createMyBooking({
        branchId,
        hotelName,
        hotelAddress: hotelAddress || '',
        roomType: roomName,
        roomTypeId,
        guestName: displayName,
        email: account.email,
        phone: account.phone,
        checkInAt: selectedStartDate.toISOString(),
        expectedCheckOutAt: selectedEndDate.toISOString(),
        serviceIds: selectedServiceIds,
      });
      if (created.status !== 'success') {
        setBookingError(created.message || 'Unable to create booking');
        Alert.alert('Booking', String(created.message || 'Unable to create booking. Please try again.'));
        return;
      }
      const bookingCode = created?.data?.bookingCode || created?.data?.booking_code || created?.data?.bookingId || '';

      navigation.navigate('CustomerPaymentScreen', {
        bookingId: bookingCode,
        backendBookingId: created?.data?.id || null,
        heroImage,
        hotelName,
        roomName,
        branchId,
        checkIn,
        checkOut,
        checkInDateIso: selectedStartDate.toISOString(),
        checkOutDateIso: selectedEndDate.toISOString(),
        name: displayName,
        email: account.email,
        phone: account.phone,
        subtotalAmount,
        totalAmount: subtotalAmount,
        depositAmount,
        depositPercent,
        holdMinutes,
        stayMinutes,
        roomTotal,
        servicesTotal,
        nightlyPrice,
        stayDays,
        stayTimeLabel,
        selectedServices,
      });
    } catch {
      setBookingError('Unable to create booking');
      Alert.alert('Booking', 'Unable to create booking right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenServiceSelection = () => {
    if (!branchId) {
      Alert.alert('Services', 'Branch information is missing for this booking.');
      return;
    }
    navigation.navigate('ServiceSelectionScreen', {
      branchId,
      selectedServices,
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.checkoutHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={22} color="#000000" />
        </TouchableOpacity>
        <View style={styles.checkoutHeaderText}>
          <Text style={styles.checkoutRoomTitle} numberOfLines={1}>{roomName}</Text>
          <Text style={styles.checkoutHotelTitle} numberOfLines={1}>{hotelName}</Text>
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
          <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
        </View>
        <View style={styles.roomInfoBox}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{rating}</Text>
            <Text style={styles.reviewText}>- {reviews} Reviews</Text>
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

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Checkout summary</Text>
          <Text style={styles.summaryNote}>Review your stay before confirming</Text>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Guest</Text><Text style={styles.summaryValue}>{displayName}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Email</Text><Text style={styles.summaryValue}>{account.email}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Phone</Text><Text style={styles.summaryValue}>{account.phone}</Text></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Hotel</Text><Text style={styles.summaryValue}>{hotelName}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Room</Text><Text style={styles.summaryValue}>{roomName}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Stay</Text><Text style={styles.summaryValue}>{stayTimeLabel}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Check-in</Text><Text style={styles.summaryValue}>{checkIn}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Check-out</Text><Text style={styles.summaryValue}>{checkOut}</Text></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Room ({formatVnd(nightlyPrice)} × {stayDays})</Text>
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
          <Text style={styles.holdNote}>Required deposit: {formatVnd(depositAmount)}</Text>
          <Text style={styles.holdNote}>
            Room will be held for {holdMinutes} minutes if you arrive late.
          </Text>
          {bookingError ? <Text style={styles.bookingError}>{bookingError}</Text> : null}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.bookBtn, isSubmitting ? styles.bookBtnDisabled : null]}
        onPress={handleBookNow}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.bookBtnText}>Book now · {formatVnd(subtotalAmount)}</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={28} color="#2d2d2d"/>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalHint}>Check-out must be after check-in</Text>

            <View style={styles.monthNavRow}>
              <TouchableOpacity style={styles.monthNavBtn} onPress={() => handleChangeMonth(-1)}>
                <Ionicons name="chevron-back" size={18} color="#4d4d4d"/>
              </TouchableOpacity>
              <Text style={styles.monthNavTitle}>{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
              <TouchableOpacity style={styles.monthNavBtn} onPress={() => handleChangeMonth(1)}>
                <Ionicons name="chevron-forward" size={18} color="#4d4d4d"/>
              </TouchableOpacity>
            </View>

            <View style={styles.datePreviewRow}>
              <TouchableOpacity
                style={[
                  styles.datePreviewCard,
                  activeDateField === 'start' ? styles.datePreviewCardActive : null,
                ]}
                onPress={() => setActiveDateField('start')}
              >
                <Text style={styles.datePreviewLabel}>Check-in</Text>
                <Text style={styles.datePreviewValue}>{MONTH_NAMES[selectedStartDate.getMonth()]} {String(selectedStartDate.getDate()).padStart(2, '0')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.datePreviewCard,
                  activeDateField === 'end' ? styles.datePreviewCardActive : null,
                ]}
                onPress={() => setActiveDateField('end')}
              >
                <Text style={styles.datePreviewLabel}>Check-out</Text>
                <Text style={styles.datePreviewValue}>{MONTH_NAMES[selectedEndDate.getMonth()]} {String(selectedEndDate.getDate()).padStart(2, '0')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dayGrid}>
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
                    return <View key={cell.key} style={styles.dayCellEmpty}/>;
                  }

                  const day = cell.day;
                  const candidateDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                  const today = getToday();
                  const isPastDate = candidateDate < today;
                  const isDisabled = isPastDate || (activeDateField === 'end' && candidateDate <= selectedStartDate);
                  const isSelected = activeDateField === 'start'
                    ? isSameDate(candidateDate, selectedStartDate)
                    : isSameDate(candidateDate, selectedEndDate);

                  return (
                    <TouchableOpacity
                      key={cell.key}
                      style={[
                        styles.dayCell,
                        isSelected ? styles.dayCellActive : null,
                        isDisabled ? styles.dayCellDisabled : null,
                      ]}
                      onPress={() => handleSelectDate(day)}
                      disabled={isDisabled}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.dayCellText,
                        isSelected ? styles.dayCellTextActive : null,
                        isDisabled ? styles.dayCellTextDisabled : null,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </View>

            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  scroll: {
    flex: 1,
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F4F6FB',
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
    backgroundColor: '#FAFAFA',
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
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#d9d9d9',
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
    backgroundColor: '#EFEFEF',
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
    backgroundColor: '#EFEFEF',
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
    backgroundColor: '#EFEFEF',
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
    margin: 16,
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
