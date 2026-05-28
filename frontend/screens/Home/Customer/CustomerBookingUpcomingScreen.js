import React, {useEffect, useMemo, useState} from 'react';
import {Alert, Image, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {normalizeServiceLine} from '../../../utils/serviceLineIdentity';
import {displayBookingId} from '../../../utils/bookingId';
import {getUnreadCustomerNotificationCount, pushCustomerNotification} from '../../../services/NotificationService';
import {fetchMyBookings} from '../../../services/CustomerBookingService';
import {getSession} from '../../../utils/authStorage';
import Avatar from '../../../components/common/Avatar';
import {formatVnd} from '../../../utils/formatCurrency';

const DEFAULT_BOOKING_IMAGE = STAFF_MEDIA.ROOM_IMAGE;
const MOMO_LOGO = STAFF_MEDIA.MOMO_LOGO;
const ZALOPAY_LOGO = STAFF_MEDIA.ZALOPAY_LOGO;
const normalizeBookingId = (value) => String(value || '').trim().toUpperCase().replace(/^#/, '');
const FORCE_REMOVED_BOOKING_IDS = new Set(['BK296489']);

const getPaymentMethodLabel = (value) => {
    const text = String(value || '').trim().toLowerCase();
    if (text === 'zalo') return 'ZaloPay';
    if (text === 'momo') return 'MoMo';
    return 'selected wallet';
};

const resolveBookingGuestName = (item) => {
    return String(
        item?.customerName ||
        item?.guestName ||
        item?.name ||
        item?.onlineCheckInData?.guestName ||
        item?.invoiceDetails?.customerName ||
        ''
    ).trim();
};

const resolveImageUri = (image) => {
    if (typeof image === 'string' && image.trim().length > 0) return image;
    if (typeof image === 'number') {
        return Image.resolveAssetSource(image)?.uri || '';
    }
    if (image && typeof image === 'object' && typeof image.uri === 'string') {
        return image.uri;
    }
    return '';
};

const toActionLabelKey = (value) => {
    const text = String(value || '').trim().toLowerCase();
    if (text === 'payment') return 'payment';
    if (text === 'online check-in') return 'checkin';
    return '';
};

const SHORT_MONTHS = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
};

const ARRIVAL_TIME_OPTIONS = Array.from({length: 48}, (_, index) => {
    const hours = String(Math.floor(index / 2)).padStart(2, '0');
    const minutes = index % 2 === 0 ? '00' : '30';
    return `${hours}:${minutes}`;
});
const ANDROID_REFRESH_TOP_OFFSET = -170;

const createDeadlineDate = (year, monthIndex, day, hour, minute, hasExplicitTime) => {
    const h = hasExplicitTime ? hour : 14;
    const m = hasExplicitTime ? minute : 0;
    return new Date(year, monthIndex, day, h, m, 0, 0);
};

const parseCheckInDeadline = (item) => {
    const values = [item?.checkInAt, item?.checkInDateTime, item?.checkIn, item?.arrivalDate];

    for (const raw of values) {
        if (raw === null || raw === undefined) continue;
        const text = String(raw).trim();
        if (!text) continue;

        let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
        if (match) {
            const day = Number.parseInt(match[1], 10);
            const month = Number.parseInt(match[2], 10) - 1;
            const year = Number.parseInt(match[3], 10);
            const hour = Number.parseInt(match[4] || '14', 10);
            const minute = Number.parseInt(match[5] || '0', 10);
            return createDeadlineDate(year, month, day, hour, minute, Boolean(match[4]));
        }

        match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/);
        if (match) {
            const year = Number.parseInt(match[1], 10);
            const month = Number.parseInt(match[2], 10) - 1;
            const day = Number.parseInt(match[3], 10);
            const hour = Number.parseInt(match[4] || '14', 10);
            const minute = Number.parseInt(match[5] || '0', 10);
            return createDeadlineDate(year, month, day, hour, minute, Boolean(match[4]));
        }

        match = text.match(/^(\d{1,2})h(\d{2})'?\s+(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
        if (match) {
            const hour = Number.parseInt(match[1], 10);
            const minute = Number.parseInt(match[2], 10);
            const day = Number.parseInt(match[3], 10);
            const month = SHORT_MONTHS[String(match[4]).toLowerCase()];
            const year = Number.parseInt(match[5], 10);
            if (Number.isInteger(month)) {
                return createDeadlineDate(year, month, day, hour, minute, true);
            }
        }

        const parsed = new Date(text);
        if (Number.isFinite(parsed.getTime())) {
            return parsed;
        }
    }

    return null;
};

const parseAnyDateValue = (value) => {
    if (value === null || value === undefined) return null;

    const text = String(value).trim();
    if (!text) return null;

    let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const day = Number.parseInt(match[1], 10);
        const month = Number.parseInt(match[2], 10) - 1;
        const year = Number.parseInt(match[3], 10);
        const parsed = new Date(year, month, day);
        return Number.isFinite(parsed.getTime()) ? parsed : null;
    }

    match = text.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (match) {
        const day = Number.parseInt(match[1], 10);
        const month = SHORT_MONTHS[String(match[2]).toLowerCase()];
        const year = Number.parseInt(match[3], 10);
        if (Number.isInteger(month)) {
            const parsed = new Date(year, month, day);
            return Number.isFinite(parsed.getTime()) ? parsed : null;
        }
    }

    const parsed = new Date(text);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const formatDateLabel = (dateValue) => {
    if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return '';
    const day = String(dateValue.getDate()).padStart(2, '0');
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const year = dateValue.getFullYear();
    return `${day}/${month}/${year}`;
};

const resolveCanonicalDateLabel = (orderedItems, dateType) => {
    const isoKey = dateType === 'checkIn' ? 'checkInDateIso' : 'checkOutDateIso';
    const fallbackAtKey = dateType === 'checkIn' ? 'checkInAt' : 'checkOutAt';
    const displayKey = dateType === 'checkIn' ? 'checkIn' : 'checkOut';

    for (const item of orderedItems) {
        const parsed =
            parseAnyDateValue(item?.[isoKey]) ||
            parseAnyDateValue(item?.invoiceDetails?.[isoKey]) ||
            parseAnyDateValue(item?.[fallbackAtKey]) ||
            parseAnyDateValue(item?.[displayKey]);

        if (parsed) {
            return formatDateLabel(parsed);
        }
    }

    const rawLabel = String(orderedItems[0]?.[displayKey] || '').trim();
    return rawLabel || 'N/A';
};

function BookingCard({item, onActionPress, onAddServicePress, onCopyBookingId}) {
    const actionKey = toActionLabelKey(item?.actionLabel);
    const isCheckInAction = item?.actionType === 'checkin' || actionKey === 'checkin' || item?.onlineCheckInCompleted;
    const showQrIcon = isCheckInAction && !item?.onlineCheckInCompleted;
    const imageSource = useMemo(() => {
        if (typeof item?.image === 'number') return item.image;
        if (typeof item?.image === 'string' && item.image.trim().length > 0) return {uri: item.image};
        if (item?.image && typeof item.image === 'object' && typeof item.image.uri === 'string') {
            return {uri: item.image.uri};
        }
        return DEFAULT_BOOKING_IMAGE;
    }, [item]);

    return (
        <View style={styles.bookingCardWrap}>
            <Image source={imageSource} style={styles.bookingImage} resizeMode="cover"/>
            <View style={styles.bookingBody}>
                <Text style={styles.bookingHotelName}>{item.hotelName}</Text>
                <Text style={styles.bookingRoomTitle}>{item.roomName}</Text>

                <View style={styles.dateRow}>
                    <View style={styles.dateCol}>
                        <Text style={styles.dateLabel}>Check-in:</Text>
                        <Text style={styles.dateValue}>{item.checkIn}</Text>
                    </View>
                    <View style={styles.dateCol}>
                        <Text style={styles.dateLabel}>Check-out:</Text>
                        <Text style={styles.dateValue}>{item.checkOut}</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.bookingIdRow}
                    activeOpacity={0.9}
                    onLongPress={() => onCopyBookingId?.(item?.bookingId)}
                    delayLongPress={220}
                >
                    <Text style={styles.bookingIdLabel}>Booking ID: </Text>
                    <Text style={styles.bookingIdValue}>{displayBookingId(item.bookingId)}</Text>
                </TouchableOpacity>

                <View style={styles.actionSection}>
                    <View style={styles.actionRowWrap}>
                        <TouchableOpacity
                            style={[styles.actionBtn, {backgroundColor: item.actionColor}, item?.actionDisabled ? styles.actionBtnDisabled : null, styles.actionBtnPrimaryFlex]}
                            onPress={() => onActionPress(item)}
                            activeOpacity={0.9}
                            disabled={item?.actionDisabled}
                        >
                            <View style={styles.actionBtnMainRow}>
                                {showQrIcon ? <MaterialCommunityIcons name="qrcode-scan" size={22} color="#f3f6ff"/> : null}
                                {isCheckInAction && item?.onlineCheckInCompleted ? <Ionicons name="checkmark-circle" size={22} color="#eafff4"/> : null}
                                {item?.actionDisabled ? <Ionicons name="lock-closed" size={20} color="#f3f6ff"/> : null}
                                <Text style={[styles.actionBtnText, !showQrIcon ? styles.actionBtnTextNoIcon : null]}>{item.actionLabel}</Text>
                            </View>
                        </TouchableOpacity>

                        {!isCheckInAction ? (
                            <TouchableOpacity
                                style={styles.actionBtnSecondary}
                                onPress={() => onAddServicePress(item)}
                                activeOpacity={0.9}
                            >
                                <View style={styles.actionBtnMainRow}>
                                    <MaterialCommunityIcons name="room-service-outline" size={18} color="#2aa8b9"/>
                                    <Text style={styles.actionBtnSecondaryText}>Add service</Text>
                                </View>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <View style={styles.noticeBar}>
                        <Text style={styles.noticeText}>Smart Key will be available at 12:00 PM</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

export default function CustomerBookingUpcomingScreen({navigation, route}) {
    const [syncedBookings, setSyncedBookings] = useState([]);
    const [activeTab, setActiveTab] = useState('Upcoming');
    const [searchQuery, setSearchQuery] = useState('');
    const [paymentInvoiceVisible, setPaymentInvoiceVisible] = useState(false);
    const [selectedPaymentBooking, setSelectedPaymentBooking] = useState(null);
    const [invoicePaymentMethod, setInvoicePaymentMethod] = useState('momo');
    const [paymentSuccessModalVisible, setPaymentSuccessModalVisible] = useState(false);
    const [paymentSuccessMessage, setPaymentSuccessMessage] = useState('');
    const [checkInSuccessModalVisible, setCheckInSuccessModalVisible] = useState(false);
    const [checkInSuccessData, setCheckInSuccessData] = useState(null);
    const [checkInModalVisible, setCheckInModalVisible] = useState(false);
    const [arrivalTimePickerVisible, setArrivalTimePickerVisible] = useState(false);
    const [checkInSubmitting, setCheckInSubmitting] = useState(false);
    const [selectedCheckInBooking, setSelectedCheckInBooking] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [avatarName, setAvatarName] = useState('');
    const [checkInForm, setCheckInForm] = useState({
        guestName: '',
        idNumber: '',
        arrivalTime: '',
        roomPreference: '',
        note: '',
    });

    const handleCopyBookingId = async (bookingId) => {
        const value = String(bookingId || '').trim();
        if (!value) return;

        try {
            await Clipboard.setStringAsync(value);
            Alert.alert('Copied', `You have saved ${value} to clipboard cache.`);
        } catch {
            Alert.alert('Copy failed', 'Unable to copy Booking ID. Please try again.');
        }
    };

    const handleRefresh = React.useCallback(() => {
        setIsRefreshing(true);
        setIsRefreshing(false);
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            let mounted = true;

            const loadSyncedBookings = async () => {
                try {
                    const res = await fetchMyBookings();
                    const rows = res.status === 'success' && Array.isArray(res.data) ? res.data : [];
                    const normalized = rows
                        .filter((b) => b && typeof b === 'object')
                        .map((b) => ({
                            id: String(b?.id || ''),
                            bookingId: String(b?.bookingCode || b?.booking_code || ''),
                            hotelName: String(b?.hotel_name || ''),
                            roomName: String(b?.roomType || b?.room_type || ''),
                            checkIn: String(b?.checkInTime || '').trim() || '',
                            checkOut: String(b?.checkOutTime || '').trim() || '',
                            checkInDateIso: String(b?.check_in_at || ''),
                            checkOutDateIso: String(b?.expected_check_out_at || b?.check_out_at || ''),
                            actionLabel: b?.payment_method ? 'Online check-in' : 'Payment',
                            actionColor: b?.payment_method ? '#5b79df' : '#2aa8b9',
                            paymentStatus: b?.payment_method ? 'completed' : 'pending',
                            image: DEFAULT_BOOKING_IMAGE,
                            createdAt: String(b?.created_at || new Date().toISOString()),
                            customerName: String(b?.guestName || b?.guest_name || 'N/A'),
                            customerEmail: String(b?.email || ''),
                            customerPhone: String(b?.phone || ''),
                            totalAmount: Number(b?.basePrice || 0),
                            depositAmount: 0,
                            paidAmount: 0,
                            remainingAmount: 0,
                            selectedServices: [],
                            selectedService: null,
                        }))
                        .filter((item) => !FORCE_REMOVED_BOOKING_IDS.has(normalizeBookingId(item?.bookingId)));

                    if (mounted) {
                        setSyncedBookings(normalized);
                    }
                } catch {
                    if (mounted) {
                        setSyncedBookings([]);
                    }
                }
            };

            loadSyncedBookings();
            getSession()
                .then((session) => {
                    setAvatarUrl(String(session?.user?.avatar || '').trim());
                    setAvatarName(String(session?.user?.name || session?.user?.full_name || session?.user?.email || '').trim());
                })
                .catch(() => {
                    setAvatarUrl('');
                    setAvatarName('');
                });
            getUnreadCustomerNotificationCount()
                .then(setUnreadNotificationCount)
                .catch(() => Alert.alert('Notifications', 'Unable to load notification count right now.'));

            return () => {
                mounted = false;
            };
        }, [])
    );

    const bookings = useMemo(() => {
        const grouped = new Map();

        syncedBookings.forEach((item) => {
            const bookingId = String(item?.bookingId || item?.id || '').trim();
            if (!bookingId) return;

            if (!grouped.has(bookingId)) {
                grouped.set(bookingId, []);
            }
            grouped.get(bookingId).push(item);
        });

        const expanded = [];

        grouped.forEach((items, bookingId) => {
            const orderedItems = [...items].sort((left, right) => {
                const leftTime = Date.parse(left?.paidAt || left?.createdAt || 0) || 0;
                const rightTime = Date.parse(right?.paidAt || right?.createdAt || 0) || 0;
                return rightTime - leftTime;
            });

            const seed = orderedItems[0] || {};
            const canonicalCheckIn = resolveCanonicalDateLabel(orderedItems, 'checkIn');
            const canonicalCheckOut = resolveCanonicalDateLabel(orderedItems, 'checkOut');
            const paymentItem = orderedItems.find((item) => toActionLabelKey(item?.actionLabel) === 'payment');
            const checkInItem = orderedItems.find((item) => toActionLabelKey(item?.actionLabel) === 'checkin');
            const onlineCheckInCompleted = Boolean(checkInItem?.onlineCheckInCompleted || seed?.onlineCheckInCompleted);
            const onlineCheckInData = checkInItem?.onlineCheckInData || seed?.onlineCheckInData || null;
            const checkInDeadline = parseCheckInDeadline(checkInItem || seed);
            const isCheckInExpired = Boolean(
                !onlineCheckInCompleted &&
                checkInDeadline &&
                Date.now() > checkInDeadline.getTime()
            );

            expanded.push(
                checkInItem
                    ? {
                        ...checkInItem,
                        checkIn: canonicalCheckIn,
                        checkOut: canonicalCheckOut,
                        actionType: 'checkin',
                        actionLabel: onlineCheckInCompleted ? 'Checked-in online' : isCheckInExpired ? 'Check-in closed' : 'Online Check-in',
                        actionColor: onlineCheckInCompleted ? '#2ba36f' : isCheckInExpired ? '#9aa6bc' : '#8294FF',
                        actionDisabled: isCheckInExpired,
                        actionDisabledReason: 'The booking has passed its check-in time. Please contact reception for support.',
                        checkInDeadlineIso: checkInDeadline ? checkInDeadline.toISOString() : '',
                        onlineCheckInCompleted,
                        onlineCheckInData,
                    }
                    : {
                        ...seed,
                        id: `${bookingId}-checkin`,
                        checkIn: canonicalCheckIn,
                        checkOut: canonicalCheckOut,
                        actionType: 'checkin',
                        actionLabel: onlineCheckInCompleted ? 'Checked-in online' : isCheckInExpired ? 'Check-in closed' : 'Online Check-in',
                        actionColor: onlineCheckInCompleted ? '#2ba36f' : isCheckInExpired ? '#9aa6bc' : '#8294FF',
                        actionDisabled: isCheckInExpired,
                        actionDisabledReason: 'The booking has passed its check-in time. Please contact reception for support.',
                        checkInDeadlineIso: checkInDeadline ? checkInDeadline.toISOString() : '',
                        paymentStatus: 'completed',
                        bookingId,
                        onlineCheckInCompleted,
                        onlineCheckInData,
                    }
            );

            expanded.push(
                paymentItem
                    ? {
                        ...seed,
                        ...paymentItem,
                        checkIn: canonicalCheckIn,
                        checkOut: canonicalCheckOut,
                        actionDisabled: false,
                        actionType: 'payment',
                        actionLabel: Number(paymentItem?.remainingAmount ?? paymentItem?.invoiceDetails?.remainingAmount ?? 0) <= 0 ? 'Paid in full' : 'Payment',
                        actionColor: Number(paymentItem?.remainingAmount ?? paymentItem?.invoiceDetails?.remainingAmount ?? 0) <= 0 ? '#2ba36f' : '#2aa8b9',
                        bookingId,
                    }
                    : {
                        ...seed,
                        id: `${bookingId}-payment`,
                        checkIn: canonicalCheckIn,
                        checkOut: canonicalCheckOut,
                        actionDisabled: false,
                        actionType: 'payment',
                        actionLabel: 'Payment',
                        actionColor: '#2aa8b9',
                        paymentStatus: 'pending',
                        bookingId,
                    }
            );
        });

        return expanded.sort((left, right) => {
            const leftTime = Date.parse(left?.paidAt || left?.createdAt || 0) || 0;
            const rightTime = Date.parse(right?.paidAt || right?.createdAt || 0) || 0;

            if (rightTime !== leftTime) {
                return rightTime - leftTime;
            }

            const leftPriority = toActionLabelKey(left?.actionLabel) === 'checkin' ? 0 : 1;
            const rightPriority = toActionLabelKey(right?.actionLabel) === 'checkin' ? 0 : 1;
            return leftPriority - rightPriority;
        });
    }, [syncedBookings]);

    const closeCheckInModal = () => {
        setCheckInModalVisible(false);
        setArrivalTimePickerVisible(false);
        setSelectedCheckInBooking(null);
        setCheckInForm({
            guestName: '',
            idNumber: '',
            arrivalTime: '',
            roomPreference: '',
            note: '',
        });
    };

    const closePaymentInvoice = () => {
        setPaymentInvoiceVisible(false);
        setSelectedPaymentBooking(null);
        setInvoicePaymentMethod('momo');
    };

    useEffect(() => {
        if (!paymentInvoiceVisible) return;

        const rawMethod = String(
            selectedPaymentBooking?.paymentMethod ||
            selectedPaymentBooking?.invoiceDetails?.paymentMethod ||
            'momo'
        )
            .trim()
            .toLowerCase();

        setInvoicePaymentMethod(rawMethod === 'zalo' ? 'zalo' : 'momo');
    }, [paymentInvoiceVisible, selectedPaymentBooking]);

    const handlePayRemaining = async () => {
        const booking = selectedPaymentBooking;
        const summary = selectedPaymentSummary;
        const bookingId = String(booking?.bookingId || '').trim();

        if (!bookingId || !summary || summary.remainingAmount <= 0) {
            closePaymentInvoice();
            return;
        }

        try {
            const paidAtIso = new Date().toISOString();
            const nextPaidAmount = Number((summary.paidAmount + summary.remainingAmount).toFixed(2));
            const updatedBookings = syncedBookings.map((record) => {
                const sameBooking = String(record?.bookingId || '').trim() === bookingId;
                if (!sameBooking) return record;

                const previousInvoice = record?.invoiceDetails || {};
                return {
                    ...record,
                    actionLabel: 'Paid in full',
                    actionColor: '#2ba36f',
                    paymentStatus: 'completed',
                    paidAt: paidAtIso,
                    paidAmount: nextPaidAmount,
                    totalAmount: summary.totalAmount,
                    depositAmount: summary.depositAmount,
                    remainingAmount: 0,
                    paymentMethod: invoicePaymentMethod,
                    invoiceDetails: {
                        ...previousInvoice,
                        subtotalPrice: summary.subtotalPrice,
                        vatAmount: summary.vatAmount,
                        payableServiceTotal: summary.payableServiceTotal,
                        totalAmount: summary.totalAmount,
                        depositAmount: summary.depositAmount,
                        paidAmount: nextPaidAmount,
                        remainingAmount: 0,
                        selectedServices: summary.selectedServices,
                        paymentMethod: invoicePaymentMethod,
                    },
                };
            });

            setSyncedBookings(updatedBookings);

            const refreshedBooking = updatedBookings.find((record) => String(record?.bookingId || '').trim() === bookingId) || null;
            setSelectedPaymentBooking(refreshedBooking);

            closePaymentInvoice();
            setPaymentSuccessMessage(`Remaining balance has been paid with ${getPaymentMethodLabel(refreshedBooking?.paymentMethod || refreshedBooking?.invoiceDetails?.paymentMethod)}.`);
            setPaymentSuccessModalVisible(true);

            await pushCustomerNotification({
                title: 'Payment recorded',
                type: 'payment',
                message: `You paid invoice for Booking ID ${bookingId}: ${formatVnd(summary.remainingAmount)} via ${getPaymentMethodLabel(invoicePaymentMethod)}.`,
                meta: {
                    bookingId,
                    amount: summary.remainingAmount,
                    paymentMethod: invoicePaymentMethod,
                },
            });

            setUnreadNotificationCount(await getUnreadCustomerNotificationCount());
        } catch {
            Alert.alert('Payment error', 'Unable to complete the remaining payment right now. Please try again.');
        }
    };

    const handleOpenCheckInModal = (item) => {
        const existing = item?.onlineCheckInData || {};
        setSelectedCheckInBooking(item);
        setCheckInForm({
            guestName: String(existing?.guestName || '').trim(),
            idNumber: String(existing?.idNumber || '').trim(),
            arrivalTime: String(existing?.arrivalTime || '').trim(),
            roomPreference: String(existing?.roomPreference || '').trim(),
            note: String(existing?.note || '').trim(),
        });
        setCheckInModalVisible(true);
    };

    const handleConfirmOnlineCheckIn = async () => {
        const bookingId = String(selectedCheckInBooking?.bookingId || '').trim();
        if (!bookingId) {
            Alert.alert('Online check-in', 'Booking ID is missing. Please try again.');
            return;
        }

        const guestName = checkInForm.guestName.trim();
        const idNumber = checkInForm.idNumber.trim();
        const arrivalTime = checkInForm.arrivalTime.trim();
        const roomPreference = checkInForm.roomPreference.trim();

        if (guestName.length < 2) {
            Alert.alert('Missing information', 'Please enter your full name.');
            return;
        }
        if (idNumber.length < 6) {
            Alert.alert('Missing information', 'Please enter a valid CCCD/Passport number.');
            return;
        }
        if (!arrivalTime) {
            Alert.alert('Missing information', 'Please select your expected arrival time.');
            return;
        }

        try {
            setCheckInSubmitting(true);

            const onlineCheckInData = {
                guestName,
                idNumber,
                arrivalTime,
                roomPreference,
                note: checkInForm.note.trim(),
                submittedAt: new Date().toISOString(),
            };

            const updatedBookings = syncedBookings.map((record) => {
                const isTarget = String(record?.bookingId || '').trim() === bookingId;
                if (!isTarget) return record;
                return {
                    ...record,
                    onlineCheckInCompleted: true,
                    onlineCheckInData,
                };
            });

            setSyncedBookings(updatedBookings);
            closeCheckInModal();
            setCheckInSuccessData({
                guestName,
                arrivalTime,
                roomPreference,
            });
            setCheckInSuccessModalVisible(true);
        } catch {
            Alert.alert('Online check-in', 'Unable to save online check-in right now. Please try again.');
        } finally {
            setCheckInSubmitting(false);
        }
    };

    const handleActionPress = (item) => {
        if (item?.actionDisabled) {
            Alert.alert('Online check-in closed', item?.actionDisabledReason || 'Online check-in is no longer available for this booking.');
            return;
        }

        if (item?.actionType === 'checkin' || toActionLabelKey(item?.actionLabel) === 'checkin' || item?.onlineCheckInCompleted) {
            handleOpenCheckInModal(item);
            return;
        }

        setSelectedPaymentBooking(item);
        setPaymentInvoiceVisible(true);
    };

    const handleAddServicePress = (item) => {
        navigation.push('CustomerServiceScreen', {
            sourceScreen: 'upcoming',
            bookingId: item?.bookingId,
            hotelName: item?.hotelName,
            hotelAddress: item?.hotelAddress || '',
            roomName: item?.roomName,
            checkIn: item?.checkIn,
            checkOut: item?.checkOut,
            bookingMinDateIso: item?.checkInDateIso || item?.checkInAt || item?.invoiceDetails?.checkInDateIso || '',
            bookingMaxDateIso: item?.checkOutDateIso || item?.checkOutAt || item?.invoiceDetails?.checkOutDateIso || '',
            bookingStartDateIso: item?.checkInDateIso || item?.checkInAt || item?.invoiceDetails?.checkInDateIso || '',
            bookingEndDateIso: item?.checkOutDateIso || item?.checkOutAt || item?.invoiceDetails?.checkOutDateIso || '',
            selectedService: item?.selectedService || null,
            selectedServices: Array.isArray(item?.selectedServices) ? item.selectedServices : item?.selectedService ? [item.selectedService] : [],
        });
    };

    const selectedPaymentSummary = useMemo(() => {
        const booking = selectedPaymentBooking;
        if (!booking) return null;

        const invoiceDetails = booking?.invoiceDetails || {};
        const paidAmount = Number(booking?.paidAmount ?? invoiceDetails?.paidAmount ?? 0) || 0;
        const totalAmount = Number(booking?.totalAmount ?? invoiceDetails?.totalAmount ?? 0) || 0;
        const depositAmount = Number(booking?.depositAmount ?? invoiceDetails?.depositAmount ?? 0) || 0;
        const subtotalPrice = Number(booking?.subtotalPrice ?? invoiceDetails?.subtotalPrice ?? 0) || 0;
        const vatAmount = Number(booking?.vatAmount ?? invoiceDetails?.vatAmount ?? 0) || 0;
        const payableServiceTotal = Number(booking?.payableServiceTotal ?? invoiceDetails?.payableServiceTotal ?? 0) || 0;
        const remainingSource = booking?.remainingAmount ?? invoiceDetails?.remainingAmount ?? (totalAmount - paidAmount);
        const remainingAmount = Math.max(
            0,
            Number((Number(remainingSource || 0)).toFixed(2))
        );
        const selectedServices = Array.isArray(booking?.selectedServices)
            ? booking.selectedServices
            : Array.isArray(invoiceDetails?.selectedServices)
            ? invoiceDetails.selectedServices
            : [];

        const normalizedServices = selectedServices.map((service, index) => normalizeServiceLine(service, {
            lineNo: index + 1,
            lineId: `line-${service?.id || 'service'}-${index + 1}`,
            serviceCode: service?.code || '',
        }));

        return {
            paidAmount,
            totalAmount,
            depositAmount,
            subtotalPrice,
            vatAmount,
            payableServiceTotal,
            remainingAmount,
            selectedServices: normalizedServices,
        };
    }, [selectedPaymentBooking]);

    const filteredBookings = useMemo(() => {
        const keyword = searchQuery.trim().toLowerCase();
        if (!keyword) return bookings;

        return bookings.filter((item) => {
            const haystack = `${item?.hotelName || ''} ${item?.roomName || ''} ${item?.bookingId || ''} ${item?.checkIn || ''} ${item?.checkOut || ''} ${item?.actionLabel || ''}`.toLowerCase();
            return haystack.includes(keyword);
        });
    }, [bookings, searchQuery]);

    useEffect(() => {
        if (!route?.params?.openPaymentForm) return;

        const targetBookingId = String(route?.params?.openPaymentBookingId || '').trim();
        const fallbackBooking = route?.params?.openPaymentBooking || null;

        const matchByAction = bookings.find((item) => {
            const sameBookingId = String(item?.bookingId || '').trim() === targetBookingId;
            return sameBookingId && toActionLabelKey(item?.actionLabel) === 'payment';
        });

        const matchByBookingId = bookings.find((item) => String(item?.bookingId || '').trim() === targetBookingId);
        const selectedBooking = matchByAction || matchByBookingId || fallbackBooking;

        if (!selectedBooking) return;

        setSelectedPaymentBooking(selectedBooking);
        setPaymentInvoiceVisible(true);

        navigation.setParams({
            openPaymentForm: undefined,
            openPaymentBookingId: undefined,
            openPaymentBooking: undefined,
        });
    }, [bookings, navigation, route?.params?.openPaymentBooking, route?.params?.openPaymentBookingId, route?.params?.openPaymentForm]);

    return (
        <SafeAreaView style={styles.page}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.currentLabel}>Current Location</Text>
                    <Text style={styles.currentValue}>Unknown location</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.bellWrap} onPress={() => navigation.navigate('CustomerNotificationsScreen')}>
                        <Ionicons name="notifications" size={19} color="#1f1f1f"/>
                        {unreadNotificationCount > 0 ? (
                            <View style={styles.alertBadge}>
                                <Text style={styles.alertBadgeText}>{`+${Math.min(unreadNotificationCount, 99)}`}</Text>
                            </View>
                        ) : null}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('CustomerProfileScreen')}>
                        <Avatar uri={avatarUrl} name={avatarName} size={30} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.searchWrap}>
                <View style={styles.aiIconWrap}>
                    <Ionicons name="sparkles" size={16} color="#6a74ff"/>
                </View>
                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search bookings"
                    placeholderTextColor="#6B7280"
                    style={styles.searchInput}
                />
            </View>

            <View style={styles.tabRow}>
                {['Upcoming', 'History'].map((tab) => {
                    const active = tab === activeTab;
                    return (
                        <TouchableOpacity 
                            key={tab} 
                            style={styles.tabBtn} 
                            onPress={() => {
                                if (tab === 'History') {
                                    navigation.navigate('CustomerBookingHistoryScreen');
                                } else {
                                    setActiveTab(tab);
                                }
                            }}
                        >
                            <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{tab}</Text>
                            {active ? <View style={styles.tabUnderline}/> : <View style={styles.tabUnderlineGhost}/>}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={['#5b79df']}
                        tintColor="#5b79df"
                        progressViewOffset={Platform.OS === 'android' ? ANDROID_REFRESH_TOP_OFFSET : 0}
                    />
                }
            >
                {activeTab === 'Upcoming'
                    ? filteredBookings.length
                        ? filteredBookings.map((item) => (
                            <BookingCard
                                key={item.id}
                                item={item}
                                onActionPress={handleActionPress}
                                onAddServicePress={handleAddServicePress}
                                onCopyBookingId={handleCopyBookingId}
                            />
                        ))
                        : <Text style={styles.emptyText}>{searchQuery.trim() ? 'No upcoming bookings match your keyword.' : 'No upcoming bookings yet. Complete a payment to see your booking here.'}</Text>
                    : <Text style={styles.emptyText}>No booking history yet.</Text>}
            </ScrollView>

            <Modal
                visible={checkInModalVisible}
                transparent
                animationType="fade"
                onRequestClose={closeCheckInModal}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Online Check-in</Text>
                        <Text style={styles.modalSubtitle}>Complete details before arrival to reduce waiting at reception.</Text>

                        <View style={styles.stepsWrap}>
                            <Text style={styles.stepText}>1. Confirm booking from app/email invitation</Text>
                            <Text style={styles.stepText}>2. Enter personal ID for verification</Text>
                            <Text style={styles.stepText}>3. Select expected arrival time and room preference</Text>
                            <Text style={styles.stepText}>4. Receive room information when arriving at hotel</Text>
                        </View>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Full name"
                            placeholderTextColor="#9a9a9a"
                            value={checkInForm.guestName}
                            onChangeText={(value) => setCheckInForm((prev) => ({...prev, guestName: value}))}
                        />
                        <TextInput
                            style={styles.modalInput}
                            placeholder="CCCD/Passport number"
                            placeholderTextColor="#9a9a9a"
                            value={checkInForm.idNumber}
                            onChangeText={(value) => setCheckInForm((prev) => ({...prev, idNumber: value}))}
                        />
                        <TouchableOpacity
                            style={styles.modalTimePickerBtn}
                            onPress={() => setArrivalTimePickerVisible(true)}
                        >
                            <Text style={[styles.modalTimePickerBtnText, !checkInForm.arrivalTime ? styles.modalTimePickerBtnTextPlaceholder : null]}>
                                {checkInForm.arrivalTime || 'Select expected arrival time'}
                            </Text>
                            <Ionicons name="time-outline" size={18} color="#4b4f63"/>
                        </TouchableOpacity>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Room preference (optional)"
                            placeholderTextColor="#9a9a9a"
                            value={checkInForm.roomPreference}
                            onChangeText={(value) => setCheckInForm((prev) => ({...prev, roomPreference: value}))}
                        />
                        <TextInput
                            style={[styles.modalInput, styles.modalInputNote]}
                            placeholder="Note for reception (optional)"
                            placeholderTextColor="#9a9a9a"
                            value={checkInForm.note}
                            onChangeText={(value) => setCheckInForm((prev) => ({...prev, note: value}))}
                            multiline
                            textAlignVertical="top"
                        />

                        <View style={styles.modalActionRow}>
                            <TouchableOpacity
                                style={styles.modalBtnSecondary}
                                onPress={closeCheckInModal}
                                disabled={checkInSubmitting}
                            >
                                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalBtnPrimary}
                                onPress={handleConfirmOnlineCheckIn}
                                disabled={checkInSubmitting}
                            >
                                <Text style={styles.modalBtnPrimaryText}>{checkInSubmitting ? 'Submitting...' : 'Confirm check-in'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={paymentInvoiceVisible}
                transparent
                animationType="fade"
                onRequestClose={closePaymentInvoice}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.invoiceModalCard}>
                        <View style={styles.invoiceModalHeader}>
                            <View style={styles.invoiceModalHeaderTextWrap}>
                                <Text style={styles.modalTitle}>Payment Invoice</Text>
                                <Text style={styles.modalSubtitle}>Outstanding amount is calculated from the amount the guest already paid.</Text>
                            </View>
                            <TouchableOpacity style={styles.invoiceModalCloseBtn} onPress={closePaymentInvoice}>
                                <Ionicons name="close" size={20} color="#4f4f4f"/>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.invoiceScrollArea}
                            contentContainerStyle={styles.invoiceScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.invoiceHeaderCard}>
                                <Text style={styles.invoiceHotelName}>{selectedPaymentBooking?.hotelName || 'Hotel'}</Text>
                                <Text style={styles.invoiceRoomName}>{selectedPaymentBooking?.roomName || 'Room'}</Text>
                                <Text style={styles.invoiceBookingId}>Booking ID: {displayBookingId(selectedPaymentBooking?.bookingId) || 'N/A'}</Text>
                            </View>

                            <View style={styles.invoiceDetailCard}>
                                <Text style={styles.invoiceServicesTitle}>Booking details</Text>
                                <View style={styles.invoiceDetailGrid}>
                                    <View style={styles.invoiceDetailItem}>
                                        <Text style={styles.invoiceDetailLabel}>Check-in</Text>
                                        <Text style={styles.invoiceDetailValue}>{selectedPaymentBooking?.checkIn || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.invoiceDetailItem}>
                                        <Text style={styles.invoiceDetailLabel}>Check-out</Text>
                                        <Text style={styles.invoiceDetailValue}>{selectedPaymentBooking?.checkOut || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.invoiceDetailItem}>
                                        <Text style={styles.invoiceDetailLabel}>Guest name</Text>
                                        <Text style={styles.invoiceDetailValue}>
                                            {resolveBookingGuestName(selectedPaymentBooking) || 'N/A'}
                                        </Text>
                                    </View>
                                    <View style={styles.invoiceDetailItem}>
                                        <Text style={styles.invoiceDetailLabel}>Payment method</Text>
                                        <Text style={styles.invoiceDetailValue}>{getPaymentMethodLabel(invoicePaymentMethod)}</Text>
                                    </View>
                                </View>
                            </View>

                            {selectedPaymentSummary?.remainingAmount > 0 ? (
                                <View style={styles.invoiceSummaryCard}>
                                    <Text style={styles.invoiceServicesTitle}>Payment method</Text>
                                    <Text style={styles.invoiceMethodHint}>Choose payment method to complete remaining amount</Text>

                                    <TouchableOpacity
                                        style={[
                                            styles.invoicePaymentMethodBtn,
                                            invoicePaymentMethod === 'momo' ? styles.invoicePaymentMethodBtnActive : null,
                                        ]}
                                        onPress={() => setInvoicePaymentMethod('momo')}
                                        activeOpacity={0.88}
                                    >
                                        <View style={styles.invoicePaymentMethodLeft}>
                                            <View style={styles.invoicePaymentMethodLogo}>
                                                <Image source={MOMO_LOGO} style={styles.invoicePaymentMethodLogoImage} resizeMode="cover" />
                                            </View>
                                            <Text style={styles.invoicePaymentMethodLabel}>Payment by MoMo</Text>
                                        </View>
                                        <Ionicons
                                            name={invoicePaymentMethod === 'momo' ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={20}
                                            color={invoicePaymentMethod === 'momo' ? '#6f82f6' : '#9da3b3'}
                                        />
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.invoicePaymentMethodBtn,
                                            invoicePaymentMethod === 'zalo' ? styles.invoicePaymentMethodBtnActive : null,
                                        ]}
                                        onPress={() => setInvoicePaymentMethod('zalo')}
                                        activeOpacity={0.88}
                                    >
                                        <View style={styles.invoicePaymentMethodLeft}>
                                            <View style={styles.invoicePaymentMethodLogo}>
                                                <Image source={ZALOPAY_LOGO} style={styles.invoicePaymentMethodLogoImage} resizeMode="cover" />
                                            </View>
                                            <Text style={styles.invoicePaymentMethodLabel}>Payment by ZaloPay</Text>
                                        </View>
                                        <Ionicons
                                            name={invoicePaymentMethod === 'zalo' ? 'checkmark-circle' : 'ellipse-outline'}
                                            size={20}
                                            color={invoicePaymentMethod === 'zalo' ? '#6f82f6' : '#9da3b3'}
                                        />
                                    </TouchableOpacity>
                                </View>
                            ) : null}

                            <View style={styles.invoiceSummaryCard}>
                                <Text style={styles.invoiceServicesTitle}>Charge breakdown</Text>
                                <View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>Room subtotal</Text><Text style={styles.invoiceValue}>{formatVnd(selectedPaymentSummary?.subtotalPrice)}</Text></View>
                                <View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>Service total</Text><Text style={styles.invoiceValue}>{formatVnd(selectedPaymentSummary?.payableServiceTotal)}</Text></View>
                                <View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>VAT</Text><Text style={styles.invoiceValue}>{formatVnd(selectedPaymentSummary?.vatAmount)}</Text></View>
                                <View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>Deposit</Text><Text style={styles.invoiceValue}>{formatVnd(selectedPaymentSummary?.depositAmount)}</Text></View>
                                <View style={styles.invoiceRow}><Text style={styles.invoiceLabel}>Guest paid</Text><Text style={styles.invoiceValueAccent}>{formatVnd(selectedPaymentSummary?.paidAmount)}</Text></View>
                                <View style={[styles.invoiceRow, styles.invoiceRowLast]}><Text style={styles.invoiceLabel}>Remaining payment</Text><Text style={styles.invoiceValueDue}>{formatVnd(selectedPaymentSummary?.remainingAmount)}</Text></View>
                            </View>

                            <View style={styles.invoiceSummaryCard}>
                                <Text style={styles.invoiceServicesTitle}>Payment status</Text>
                                <View style={styles.invoiceStatusRow}>
                                    <Text style={styles.invoiceStatusLabel}>Status</Text>
                                    <Text style={[styles.invoiceStatusValue, selectedPaymentSummary?.remainingAmount > 0 ? styles.invoiceStatusPending : styles.invoiceStatusPaid]}>
                                        {selectedPaymentSummary?.remainingAmount > 0 ? 'Partial payment' : 'Fully paid'}
                                    </Text>
                                </View>
                                <View style={styles.invoiceStatusRow}>
                                    <Text style={styles.invoiceStatusLabel}>Selected services</Text>
                                    <Text style={styles.invoiceStatusValue}>{selectedPaymentSummary?.selectedServices?.length || 0}</Text>
                                </View>
                            </View>

                            {selectedPaymentSummary?.selectedServices?.length ? (
                                <View style={styles.invoiceServicesCard}>
                                    <Text style={styles.invoiceServicesTitle}>Service invoice</Text>
                                    {selectedPaymentSummary.selectedServices.map((service, index) => (
                                        <View key={String(service?.line_id || '').trim() || `${service?.id || 'service'}-${index}`} style={[styles.invoiceServiceItem, index === selectedPaymentSummary.selectedServices.length - 1 ? styles.invoiceServiceItemLast : null]}>
                                            <View style={styles.invoiceServiceTextWrap}>
                                                <Text style={styles.invoiceServiceName}>{service?.name || service?.title || 'Service'}</Text>
                                                <Text style={styles.invoiceServiceCode}>Code: {service?.display_code || service?.service_code || service?.code || service?.id || 'N/A'}</Text>
                                                <Text style={styles.invoiceServiceMeta}>{service?.date || 'N/A'} {service?.time ? `• ${service.time}` : ''}</Text>
                                            </View>
                                            <View style={styles.invoiceServiceFeeWrap}>
                                                <Text style={styles.invoiceServiceFee}>{formatVnd(service?.price || 0)}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.invoiceServicesCard}>
                                    <Text style={styles.invoiceServicesTitle}>Service invoice</Text>
                                    <Text style={styles.invoiceEmptyText}>No additional services were added to this booking.</Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.invoiceFooter}>
                            {selectedPaymentSummary?.remainingAmount > 0 ? (
                                <TouchableOpacity style={styles.invoicePayRemainingBtn} onPress={handlePayRemaining}>
                                    <Text style={styles.invoicePayRemainingBtnText}>Pay remaining {formatVnd(selectedPaymentSummary?.remainingAmount)}</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.invoicePaidChip}>
                                    <Ionicons name="checkmark-circle" size={18} color="#2ba36f"/>
                                    <Text style={styles.invoicePaidChipText}>Booking fully paid</Text>
                                </View>
                            )}

                            <TouchableOpacity style={styles.modalBtnSecondary} onPress={closePaymentInvoice}>
                                <Text style={styles.modalBtnSecondaryText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={arrivalTimePickerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setArrivalTimePickerVisible(false)}
            >
                <View style={styles.pickerBackdrop}>
                    <View style={styles.pickerCard}>
                        <Text style={styles.pickerTitle}>Choose Arrival Time</Text>
                        <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
                            {ARRIVAL_TIME_OPTIONS.map((time) => {
                                const selected = checkInForm.arrivalTime === time;
                                return (
                                    <TouchableOpacity
                                        key={time}
                                        style={[styles.pickerItem, selected ? styles.pickerItemSelected : null]}
                                        onPress={() => {
                                            setCheckInForm((prev) => ({...prev, arrivalTime: time}));
                                            setArrivalTimePickerVisible(false);
                                        }}
                                    >
                                        <Text style={[styles.pickerItemText, selected ? styles.pickerItemTextSelected : null]}>{time}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.pickerCloseBtn}
                            onPress={() => setArrivalTimePickerVisible(false)}
                        >
                            <Text style={styles.pickerCloseBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={paymentSuccessModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPaymentSuccessModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.paymentSuccessCard}>
                        <View style={styles.paymentSuccessIconWrap}>
                            <Ionicons name="checkmark-circle" size={48} color="#2ba36f" />
                        </View>
                        <Text style={styles.paymentSuccessTitle}>Payment completed</Text>
                        <Text style={styles.paymentSuccessDescription}>{paymentSuccessMessage || 'Remaining balance has been paid successfully.'}</Text>
                        <TouchableOpacity
                            style={styles.paymentSuccessBtn}
                            onPress={() => setPaymentSuccessModalVisible(false)}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.paymentSuccessBtnText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={checkInSuccessModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setCheckInSuccessModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.checkInSuccessCard}>
                        <View style={styles.checkInSuccessIconWrap}>
                            <Ionicons name="checkmark-circle" size={52} color="#2ba36f" />
                        </View>
                        <Text style={styles.checkInSuccessTitle}>Check-in submitted</Text>
                        <Text style={styles.checkInSuccessDescription}>
                            Your pre check-in information has been sent successfully. Please bring your original ID document to complete verification at reception.
                        </Text>

                        <View style={styles.checkInSuccessSummary}>
                            <View style={styles.checkInSuccessRow}>
                                <Text style={styles.checkInSuccessLabel}>Guest name</Text>
                                <Text style={styles.checkInSuccessValue}>{checkInSuccessData?.guestName || 'N/A'}</Text>
                            </View>
                            <View style={styles.checkInSuccessRow}>
                                <Text style={styles.checkInSuccessLabel}>Arrival time</Text>
                                <Text style={styles.checkInSuccessValue}>{checkInSuccessData?.arrivalTime || 'N/A'}</Text>
                            </View>
                            <View style={[styles.checkInSuccessRow, styles.checkInSuccessRowLast]}>
                                <Text style={styles.checkInSuccessLabel}>Room preference</Text>
                                <Text style={styles.checkInSuccessValue}>{checkInSuccessData?.roomPreference || 'None'}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.checkInSuccessBtn}
                            onPress={() => setCheckInSuccessModalVisible(false)}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.checkInSuccessBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    headerRow: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    currentLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
    },
    currentValue: {
        fontFamily: 'SF-Bold',
        fontSize: 22,
        lineHeight: 24,
        color: '#111111',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bellWrap: {
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 15,
    },
    alertBadge: {
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ff3b30',
        position: 'absolute',
        top: 1,
        right: -2,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f2f2f2',
    },
    alertBadgeText: {
        fontFamily: 'SF-Bold',
        fontSize: 9,
        color: '#fff',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    searchWrap: {
        marginTop: 16,
        marginHorizontal: 16,
        borderWidth: 1.2,
        borderColor: '#111111',
        borderRadius: 16,
        height: 40,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    aiIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 12,
        backgroundColor: 'rgba(130,148,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: '#111111',
        paddingVertical: 0,
    },
    tabRow: {
        marginTop: 20,
        marginHorizontal: 16,
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#d5d5d5',
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
    },
    tabText: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: '#333333',
        marginBottom: 8,
    },
    tabTextActive: {
        color: '#8294FF',
    },
    tabUnderline: {
        height: 2,
        width: '100%',
        backgroundColor: '#8294FF',
    },
    tabUnderlineGhost: {
        height: 2,
        width: '100%',
        backgroundColor: 'transparent',
    },
    scrollContent: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 108,
    },
    bookingCardWrap: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        marginBottom: 28,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#d9d9d9',
    },
    bookingImage: {
        width: '100%',
        height: 72,
    },
    bookingBody: {
        backgroundColor: '#fff',
        marginTop: -14,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 0,
    },
    bookingHotelName: {
        fontFamily: 'SF-Bold',
        fontSize: 24,
        lineHeight: 30,
        color: '#121212',
        marginBottom: 4,
    },
    bookingRoomTitle: {
        fontFamily: 'SF-Semibold',
        fontSize: 18,
        lineHeight: 24,
        color: '#4f4f4f',
        marginBottom: 10,
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateCol: {
        width: '48%',
    },
    dateLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        color: '#4b4b4b',
    },
    dateValue: {
        marginTop: 2,
        fontFamily: 'SF-Bold',
        fontSize: 17,
        color: '#202020',
    },
    bookingIdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        marginBottom: 12,
    },
    bookingIdLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        color: '#333',
    },
    bookingIdValue: {
        fontFamily: 'SF-Bold',
        fontSize: 16,
        color: '#202020',
    },
    actionSection: {
        marginTop: 0,
    },
    actionRowWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    actionBtn: {
        borderRadius: 28,
        minHeight: 56,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnPrimaryFlex: {
        flex: 1.6,
    },
    actionBtnSecondary: {
        flex: 1,
        minHeight: 56,
        borderRadius: 28,
        borderWidth: 1.4,
        borderColor: '#2aa8b9',
        backgroundColor: '#f3fbfd',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
    },
    actionBtnDisabled: {
        opacity: 0.86,
    },
    actionBtnMainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        marginLeft: 8,
        fontFamily: 'SF-Semibold',
        fontSize: 17,
        color: '#fff',
    },
    actionBtnTextNoIcon: {
        marginLeft: 0,
    },
    actionBtnSecondaryText: {
        marginLeft: 6,
        fontFamily: 'SF-Semibold',
        fontSize: 16,
        lineHeight: 22,
        color: '#2aa8b9',
    },
    noticeBar: {
        marginTop: 20,
        marginHorizontal: -18,
        marginBottom: 0,
        borderTopWidth: 1,
        borderTopColor: '#c4ccff',
        backgroundColor: '#e7ebff',
        paddingVertical: 2,
        paddingHorizontal: 12,
    },
    noticeText: {
        textAlign: 'center',
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#111111',
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(10, 14, 24, 0.45)',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    modalCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 14,
    },
    invoiceModalCard: {
        width: '100%',
        height: '86%',
        backgroundColor: '#fff',
        borderRadius: 22,
        overflow: 'hidden',
    },
    invoiceModalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f1f6',
    },
    invoiceModalHeaderTextWrap: {
        flex: 1,
        paddingRight: 12,
    },
    invoiceModalCloseBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#f4f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    invoiceScrollArea: {
        flex: 1,
    },
    invoiceScrollContent: {
        paddingHorizontal: 18,
        paddingTop: 14,
        paddingBottom: 14,
    },
    modalTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 22,
        color: '#1d1d1f',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
        marginBottom: 10,
    },
    stepsWrap: {
        backgroundColor: '#f5f7ff',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#dbe2ff',
        marginBottom: 10,
    },
    invoiceHeaderCard: {
        backgroundColor: '#f8f9ff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e2e7ff',
    },
    invoiceHotelName: {
        fontFamily: 'SF-Bold',
        fontSize: 18,
        color: '#1d1d1f',
    },
    invoiceRoomName: {
        fontFamily: 'SF-Semibold',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
        marginTop: 2,
    },
    invoiceBookingId: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
        marginTop: 6,
    },
    invoiceSummaryCard: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ececf2',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
    },
    invoiceDetailCard: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ececf2',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
        backgroundColor: '#fcfcfe',
    },
    invoiceDetailGrid: {
        marginTop: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    invoiceDetailItem: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#f0f1f6',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    invoiceDetailLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
        marginBottom: 4,
    },
    invoiceDetailValue: {
        fontFamily: 'SF-Semibold',
        fontSize: 15,
        lineHeight: 22,
        color: '#111111',
    },
    invoiceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    invoiceRowLast: {
        marginBottom: 0,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#ececf2',
    },
    invoiceStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    invoiceStatusLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
    },
    invoiceStatusValue: {
        fontFamily: 'SF-Semibold',
        fontSize: 15,
        lineHeight: 22,
        color: '#111111',
    },
    invoiceStatusPending: {
        color: '#cf5a2d',
    },
    invoiceStatusPaid: {
        color: '#2b8b5e',
    },
    invoiceLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
    },
    invoiceValue: {
        fontFamily: 'SF-Semibold',
        fontSize: 15,
        lineHeight: 22,
        color: '#111111',
    },
    invoiceValueAccent: {
        fontFamily: 'SF-Bold',
        fontSize: 15,
        lineHeight: 22,
        color: '#2a8d5d',
    },
    invoiceValueDue: {
        fontFamily: 'SF-Bold',
        fontSize: 16,
        lineHeight: 22,
        color: '#cf5a2d',
    },
    invoiceServicesCard: {
        borderRadius: 12,
        backgroundColor: '#fafafa',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
    },
    invoiceMethodHint: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
        marginBottom: 8,
    },
    invoicePaymentMethodBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#e4e7f2',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 10,
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    invoicePaymentMethodBtnActive: {
        borderColor: '#93a3ff',
        backgroundColor: '#f3f5ff',
    },
    invoicePaymentMethodLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    invoicePaymentMethodLogo: {
        width: 34,
        height: 34,
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 10,
    },
    invoicePaymentMethodLogoImage: {
        width: '100%',
        height: '100%',
    },
    invoicePaymentMethodLabel: {
        fontFamily: 'SF-Semibold',
        fontSize: 15,
        lineHeight: 22,
        color: '#111111',
    },
    invoiceServicesTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 16,
        lineHeight: 22,
        color: '#111111',
        marginBottom: 8,
    },
    invoiceServiceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#ececf2',
    },
    invoiceServiceItemLast: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    invoiceServiceTextWrap: {
        flex: 1,
        marginRight: 8,
    },
    invoiceServiceName: {
        fontFamily: 'SF-Semibold',
        fontSize: 15,
        lineHeight: 22,
        color: '#111111',
    },
    invoiceServiceCode: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
        marginTop: 2,
    },
    invoiceServiceMeta: {
        fontFamily: 'SF-Regular',
        fontSize: 15,
        lineHeight: 22,
        color: '#333333',
        marginTop: 2,
    },
    invoiceServiceFeeWrap: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minWidth: 72,
    },
    invoiceServiceFee: {
        fontFamily: 'SF-Bold',
        fontSize: 15,
        lineHeight: 22,
        color: '#111111',
    },
    invoiceEmptyText: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: '#333333',
    },
    invoiceFooter: {
        paddingHorizontal: 18,
        paddingTop: 12,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#f0f1f6',
        backgroundColor: '#fff',
        flexShrink: 0,
        minHeight: 116,
    },
    invoicePayRemainingBtn: {
        backgroundColor: '#2aa8b9',
        borderRadius: 12,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    invoicePayRemainingBtnText: {
        fontFamily: 'SF-Semibold',
        fontSize: 16,
        lineHeight: 22,
        color: '#fff',
    },
    invoicePaidChip: {
        minHeight: 44,
        borderRadius: 12,
        backgroundColor: '#eef9f3',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 8,
        gap: 8,
    },
    invoicePaidChipText: {
        fontFamily: 'SF-Semibold',
        fontSize: 16,
        lineHeight: 22,
        color: '#2b8b5e',
    },
    stepText: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: '#333333',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#d6d6df',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 42,
        marginBottom: 8,
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: '#111111',
        backgroundColor: '#fff',
    },
    modalTimePickerBtn: {
        borderWidth: 1,
        borderColor: '#d6d6df',
        borderRadius: 10,
        minHeight: 42,
        marginBottom: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
    },
    modalTimePickerBtnText: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: '#111111',
    },
    modalTimePickerBtnTextPlaceholder: {
        color: '#9a9a9a',
    },
    modalInputNote: {
        height: 72,
        paddingTop: 10,
    },
    modalActionRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    modalBtnSecondary: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#2c2d31',
        borderRadius: 10,
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnSecondaryText: {
        fontFamily: 'SF-Semibold',
        fontSize: 16,
        lineHeight: 22,
        color: '#111111',
    },
    modalBtnPrimary: {
        flex: 1,
        backgroundColor: '#8294FF',
        borderRadius: 10,
        minHeight: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnPrimaryText: {
        fontFamily: 'SF-Semibold',
        fontSize: 16,
        lineHeight: 22,
        color: '#fff',
    },
    pickerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(10, 14, 24, 0.45)',
        justifyContent: 'center',
        paddingHorizontal: 26,
    },
    pickerCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 12,
        maxHeight: 470,
    },
    pickerTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 18,
        color: '#1d1d1f',
        marginBottom: 8,
    },
    pickerList: {
        marginBottom: 8,
    },
    pickerItem: {
        borderRadius: 9,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    pickerItemSelected: {
        backgroundColor: '#e8ecff',
    },
    pickerItemText: {
        fontFamily: 'SF-Semibold',
        fontSize: 15,
        color: '#2e2e34',
    },
    pickerItemTextSelected: {
        color: '#4358d6',
    },
    pickerCloseBtn: {
        borderWidth: 1,
        borderColor: '#2c2d31',
        borderRadius: 10,
        minHeight: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerCloseBtnText: {
        fontFamily: 'SF-Semibold',
        fontSize: 16,
        lineHeight: 22,
        color: '#111111',
    },
    paymentSuccessCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 16,
        alignItems: 'center',
    },
    paymentSuccessIconWrap: {
        marginBottom: 8,
    },
    paymentSuccessTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 24,
        color: '#1d1d1f',
        marginBottom: 6,
        textAlign: 'center',
    },
    paymentSuccessDescription: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: '#333333',
        textAlign: 'center',
        marginBottom: 14,
    },
    paymentSuccessBtn: {
        width: '100%',
        minHeight: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8294FF',
    },
    paymentSuccessBtnText: {
        fontFamily: 'SF-Semibold',
        fontSize: 16,
        color: '#fff',
    },
    checkInSuccessCard: {
        backgroundColor: '#fff',
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 5,
    },
    checkInSuccessIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#eaf8f1',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 12,
    },
    checkInSuccessTitle: {
        fontFamily: 'SF-Bold',
        fontSize: 22,
        color: '#1d1d1f',
        textAlign: 'center',
        marginBottom: 8,
    },
    checkInSuccessDescription: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: '#333333',
        textAlign: 'center',
        marginBottom: 14,
    },
    checkInSuccessSummary: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e7edf4',
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 16,
    },
    checkInSuccessRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eef2f6',
    },
    checkInSuccessRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    checkInSuccessLabel: {
        fontFamily: 'SF-Regular',
        fontSize: 16,
        lineHeight: 22,
        color: '#333333',
        flex: 1,
        paddingRight: 10,
    },
    checkInSuccessValue: {
        fontFamily: 'SF-Semibold',
        fontSize: 16,
        lineHeight: 22,
        color: '#111111',
        flex: 1.1,
        textAlign: 'right',
    },
    checkInSuccessBtn: {
        minHeight: 48,
        borderRadius: 24,
        backgroundColor: '#2ba36f',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkInSuccessBtnText: {
        fontFamily: 'SF-Semibold',
        fontSize: 15,
        color: '#fff',
    },
    emptyText: {
        fontFamily: 'SF-Regular',
        color: '#333333',
        fontSize: 16,
        lineHeight: 22,
        textAlign: 'center',
        marginTop: 30,
    },
});