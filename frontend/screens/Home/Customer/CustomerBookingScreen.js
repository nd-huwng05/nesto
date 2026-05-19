import React, {useEffect, useMemo, useState} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {getSession} from '../../../utils/authStorage';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CustomerBookingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    hotelName = 'Swiss Hotel',
    roomName = 'Room 121',
    checkIn: initialCheckIn = "9h00' 23 Mar 2026",
    checkOut: initialCheckOut = "9h00' 24 Mar 2026",
    startDateIso,
    endDateIso,
    startDate,
    endDate,
    roomPrice,
    price: legacyPricePerHour,
    discount: legacyDiscountPerHour,
    vat: legacyVat,
    total: legacyTotal,
    deposit: legacyDeposit,
    syncToken,
    reviews = 3,
    rating = 4.5,
    heroImage = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg',
  } = route.params || {};

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
    ? new Date(2026, 6, startDate)
    : parseDateFromLabel(initialCheckIn, new Date(2026, 6, 8));
  const safeEndDateCandidate = parsedEndIso
    ? parsedEndIso
    : Number.isFinite(endDate)
    ? new Date(2026, 6, endDate)
    : parseDateFromLabel(initialCheckOut, new Date(2026, 6, safeStartDate.getDate() + 1));
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
      ? new Date(2026, 6, startDate)
      : parseDateFromLabel(initialCheckIn, new Date(2026, 6, 8));
    const syncedEndCandidate = parsedEndIso
      ? parsedEndIso
      : Number.isFinite(endDate)
      ? new Date(2026, 6, endDate)
      : parseDateFromLabel(initialCheckOut, new Date(2026, 6, syncedStart.getDate() + 1));
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
    return `9h00' ${day} ${month} ${year}`;
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

  const dailyPrice = useMemo(() => {
    if (Number.isFinite(roomPrice) && roomPrice > 0) return roomPrice;
    if (Number.isFinite(legacyPricePerHour) && legacyPricePerHour > 0) return legacyPricePerHour * 24;
    return 2250000;
  }, [roomPrice, legacyPricePerHour]);

  const subtotalPrice = useMemo(() => {
    return dailyPrice * stayDays;
  }, [dailyPrice, stayDays]);

  const discountAmount = useMemo(() => {
    if (Number.isFinite(legacyDiscountPerHour) && legacyDiscountPerHour > 0) {
      return legacyDiscountPerHour * stayHours;
    }
    return Math.round(subtotalPrice * 0.1);
  }, [legacyDiscountPerHour, stayHours, subtotalPrice]);

  const taxableAmount = Math.max(0, subtotalPrice - discountAmount);
  const vatAmount = Number.isFinite(legacyVat) && legacyVat > 0 ? legacyVat : Math.round(taxableAmount * 0.1);
  const totalAmount = Number.isFinite(legacyTotal) && legacyTotal > 0 ? legacyTotal : taxableAmount + vatAmount;
  const depositPercent = 20;
  const lateCheckInPercent = 10;
  const depositAmount = Number.isFinite(legacyDeposit) && legacyDeposit > 0 ? legacyDeposit : Math.round(totalAmount * 0.2);
  const pricePerHour = Math.max(1, Math.round(dailyPrice / 24));
  const discountPerHour = Math.round(discountAmount / stayHours);
  const stayTimeLabel = `${stayHours}h00`;

  const lateCheckInLabel = useMemo(() => {
    const lateHours = stayHours * (lateCheckInPercent / 100);
    const hours = Math.floor(lateHours);
    const minutes = Math.round((lateHours - hours) * 60);
    return `${String(hours).padStart(2, '0')}h${String(minutes).padStart(2, '0')}'`;
  }, [stayHours, lateCheckInPercent]);

  const formatVnd = (amount) => Number(amount || 0).toLocaleString('en-US');

  const [account, setAccount] = useState({
    name: 'Nguyen Ngoc Lan',
    email: 'customer@nesto.vn',
    phone: 'N/A',
  });

  useEffect(() => {
    let mounted = true;

    const loadAccount = async () => {
      try {
        const session = await getSession();
        const user = session?.user ?? {};
        const rawName = String(user?.name || user?.full_name || '').trim();
        const shouldUseDefaultName = rawName.toLowerCase() === 'nesto customer' || rawName.length === 0;

        if (mounted) {
          setAccount({
            name: shouldUseDefaultName ? 'Nguyen Ngoc Lan' : rawName,
            email: String(user?.email || '').trim() || 'N/A',
            phone: String(user?.phone || '').trim() || 'N/A',
          });
        }
      } catch {
      }
    };

    loadAccount();

    return () => {
      mounted = false;
    };
  }, []);

  const displayName = useMemo(() => {
    const value = String(account.name || '').trim();
    if (!value) return 'Nguyen Ngoc Lan';
    return value
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }, [account.name]);

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.heroWrap}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroActions}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#222" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuBtn}>
              <Feather name="more-horizontal" size={22} color="#222" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Room Info */}
        <View style={styles.roomInfoBox}>
          <Text style={styles.roomName}>{roomName}</Text>
          <Text style={styles.hotelName}>{hotelName}</Text>
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
        <Text style={styles.depositNote}>Can check-in late is {lateCheckInPercent}% of total booking hours.</Text>
        <View style={styles.depositRow}>
          <Text style={styles.depositLabel}>Deposit:</Text>
          <View style={styles.depositValue}><Text style={styles.depositPercent}>{depositPercent}%</Text></View>
          <Text style={styles.lateLabel}>Can check-in late:</Text>
          <View style={styles.lateValue}><Text style={styles.lateTime}>{lateCheckInLabel}</Text></View>
        </View>
        {/* Order summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Order summary</Text>
          <Text style={styles.summaryNote}>Check information order before payment</Text>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Name:</Text><Text style={styles.summaryValue}>{displayName}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Email:</Text><Text style={styles.summaryValue}>{account.email}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Phone number:</Text><Text style={styles.summaryValue}>{account.phone}</Text></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Hotel:</Text><Text style={styles.summaryValue}>{hotelName}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Room:</Text><Text style={styles.summaryValue}>{roomName}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Check-in:</Text><Text style={styles.summaryValue}>{checkIn}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Check-out:</Text><Text style={styles.summaryValue}>{checkOut}</Text></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Time:</Text><Text style={styles.summaryValue}>{stayTimeLabel}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Price:</Text><Text style={styles.summaryValue}>{formatVnd(pricePerHour)} VND/h</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Discount:</Text><Text style={styles.summaryValue}>{formatVnd(discountPerHour)} VND/h</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Price:</Text><Text style={styles.summaryValue}>{formatVnd(subtotalPrice)} VND</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>VAT (10%):</Text><Text style={styles.summaryValue}>{formatVnd(vatAmount)} VND</Text></View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}><Text style={styles.summaryLabelBold}>Total Price:</Text><Text style={styles.summaryValueBold}>{formatVnd(totalAmount)} VND</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabelBold}>Deposit (20%):</Text><Text style={styles.summaryValueBold}>{formatVnd(depositAmount)} VND</Text></View>
        </View>
      </ScrollView>
      <TouchableOpacity
        style={styles.bookBtn}
        onPress={() => navigation.navigate('CustomerPaymentScreen', {
          heroImage,
          hotelName,
          roomName,
          checkIn,
          checkOut,
          name: displayName,
          email: account.email,
          phone: account.phone,
          totalAmount,
          depositAmount,
          subtotalPrice,
          vatAmount,
          pricePerHour,
          discountPerHour,
          stayTimeLabel,
        })}
      >
        <Text style={styles.bookBtnText}>Book now</Text>
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
                  const isDisabled = activeDateField === 'end' && candidateDate <= selectedStartDate;
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
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
  heroActions: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  menuBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
