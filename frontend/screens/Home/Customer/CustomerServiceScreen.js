import React, {useMemo, useState} from 'react';
import {Alert, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Ionicons, Feather} from '@expo/vector-icons';
import {UI} from '../../../styles/uiTokens';
import {buildServiceDisplayCode} from '../../../utils/serviceLineIdentity';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const UPCOMING_BOOKINGS_KEY = 'customer_paid_upcoming_bookings';

const SERVICE_OPTIONS = [
    {
        id: 'spa',
        code: 'SER-SPA-001',
        title: 'Spa Service',
        subtitle: 'Relaxing massage, sauna, and wellness treatment',
        price: 49,
        priceLabel: '49 USD',
        icon: 'flower-outline',
        accent: '#7c4dff',
    },
    {
        id: 'restaurant',
        code: 'SER-RES-001',
        title: 'Restaurant Service',
        subtitle: 'Breakfast, lunch, dinner, and private dining',
        price: 32,
        priceLabel: '32 USD',
        icon: 'restaurant-outline',
        accent: '#e67e22',
    },
    {
        id: 'airport_shuttle',
        code: 'SER-TRN-001',
        title: 'Airport Shuttle',
        subtitle: 'Pick-up and drop-off with flexible schedule',
        price: 20,
        priceLabel: '20 USD',
        icon: 'car-sport-outline',
        accent: '#1e88e5',
    },
];

function formatDateDisplay(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function formatTimeDisplay(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function createTimeSlots() {
    const slots = [];
    for (let hour = 6; hour <= 22; hour += 1) {
        slots.push(formatTimeDisplay(hour, 0));
        slots.push(formatTimeDisplay(hour, 30));
    }
    return slots;
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthTitle(date) {
    return date.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
    });
}

function normalizeDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateInput(value) {
    if (value instanceof Date) {
        return normalizeDate(value);
    }

    const text = String(value || '').trim();
    if (!text) return null;

    const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const dd = Number.parseInt(slashMatch[1], 10);
        const mm = Number.parseInt(slashMatch[2], 10);
        const yyyy = Number.parseInt(slashMatch[3], 10);
        const parsed = new Date(yyyy, mm - 1, dd);
        if (Number.isFinite(parsed.getTime())) return normalizeDate(parsed);
    }

    const shortMonthMatch = text.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
    if (shortMonthMatch) {
        const day = Number.parseInt(shortMonthMatch[1], 10);
        const month = MONTH_NAMES.findIndex((name) => name.toLowerCase() === shortMonthMatch[2].toLowerCase());
        const year = Number.parseInt(shortMonthMatch[3], 10);
        const parsed = new Date(year, month, day);
        if (month >= 0 && Number.isFinite(parsed.getTime())) return normalizeDate(parsed);
    }

    const isoParsed = new Date(text);
    if (Number.isFinite(isoParsed.getTime())) {
        return normalizeDate(isoParsed);
    }

    return null;
}

function isSameDate(left, right) {
    if (!left || !right) return false;
    return left.getTime() === right.getTime();
}

function clampDate(date, minDate, maxDate) {
    if (!date) return null;
    if (minDate && date < minDate) return minDate;
    if (maxDate && date > maxDate) return maxDate;
    return date;
}

function createScheduleUid() {
    return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function buildScheduleKey(service) {
    return `${String(service?.id || '').trim()}|${String(service?.date || '').trim()}|${String(service?.time || '').trim()}`;
}

export default function CustomerServiceScreen({navigation, route}) {
    const {
        sourceScreen = '',
        bookingId = '',
        hotelName = 'Swiss Hotel',
        hotelAddress = '',
        roomName: routeRoomName = '',
        checkIn,
        checkOut,
        bookingMinDateIso,
        bookingMaxDateIso,
        startDate,
        endDate,
        startDateIso,
        endDateIso,
        bookingStartDateIso,
        bookingEndDateIso,
        selectedService: initialSelectedService = null,
        selectedServices: routeSelectedServices = [],
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
        route?.params?.room?.name,
        route?.params?.room?.roomName,
        route?.params?.roomNumber,
        route?.params?.room?.roomNumber,
        initialSelectedService?.roomName,
        routeSelectedServices?.[0]?.roomName
    );
    const selectedServices = useMemo(() => {
        const items = Array.isArray(routeSelectedServices)
            ? routeSelectedServices.filter((item) => item && typeof item === 'object' && item.id)
            : [];

        if (initialSelectedService && initialSelectedService.id) {
            const existingKeys = new Set(items.map((item) => buildScheduleKey(item)));
            const initialKey = buildScheduleKey(initialSelectedService);
            if (!existingKeys.has(initialKey)) {
                return [...items, initialSelectedService];
            }
        }

        return items;
    }, [routeSelectedServices, initialSelectedService]);
    const [activeServiceIds, setActiveServiceIds] = useState(() => {
        const existingIds = selectedServices
            .map((service) => service?.id)
            .filter((id) => SERVICE_OPTIONS.some((option) => option.id === id));

        if (existingIds.length) {
            return Array.from(new Set(existingIds));
        }

        return [];
    });
    const [serviceSchedules, setServiceSchedules] = useState(() => {
        const initial = {};

        selectedServices.forEach((service) => {
            const serviceId = String(service?.id || '').trim();
            if (!serviceId) return;

            if (!initial[serviceId]) {
                initial[serviceId] = [];
            }

            initial[serviceId].push({
                uid: createScheduleUid(),
                date: String(service?.date || '').trim(),
                time: String(service?.time || '').trim(),
            });
        });

        return initial;
    });
    const [pickerMode, setPickerMode] = useState(null);
    const [pickerTarget, setPickerTarget] = useState({serviceId: '', scheduleUid: ''});
    const [pickerDate, setPickerDate] = useState(() => startOfMonth(new Date()));
    const [isRefreshing, setIsRefreshing] = useState(false);

    const timeSlots = useMemo(() => createTimeSlots(), []);

    const minAllowedDate = useMemo(() => {
        return (
            parseDateInput(bookingMinDateIso) ||
            parseDateInput(bookingStartDateIso) ||
            parseDateInput(startDateIso) ||
            parseDateInput(checkIn) ||
            null
        );
    }, [bookingMinDateIso, bookingStartDateIso, startDateIso, checkIn]);

    const maxAllowedDate = useMemo(() => {
        return (
            parseDateInput(bookingMaxDateIso) ||
            parseDateInput(bookingEndDateIso) ||
            parseDateInput(endDateIso) ||
            parseDateInput(checkOut) ||
            null
        );
    }, [bookingMaxDateIso, bookingEndDateIso, endDateIso, checkOut]);

    const safeMinAllowedDate = useMemo(() => {
        if (!minAllowedDate || !maxAllowedDate) return minAllowedDate;
        return minAllowedDate <= maxAllowedDate ? minAllowedDate : maxAllowedDate;
    }, [minAllowedDate, maxAllowedDate]);

    const safeMaxAllowedDate = useMemo(() => {
        if (!minAllowedDate || !maxAllowedDate) return maxAllowedDate;
        return maxAllowedDate >= minAllowedDate ? maxAllowedDate : minAllowedDate;
    }, [minAllowedDate, maxAllowedDate]);

    const selectedDateInPicker = useMemo(() => {
        const entries = Array.isArray(serviceSchedules?.[pickerTarget.serviceId])
            ? serviceSchedules[pickerTarget.serviceId]
            : [];
        const currentEntry = entries.find((entry) => entry?.uid === pickerTarget.scheduleUid);
        return parseDateInput(currentEntry?.date || '');
    }, [serviceSchedules, pickerTarget]);

    const canGoPrevMonth = useMemo(() => {
        if (!safeMinAllowedDate) return true;
        const prevMonth = new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1);
        return prevMonth >= startOfMonth(safeMinAllowedDate);
    }, [pickerDate, safeMinAllowedDate]);

    const canGoNextMonth = useMemo(() => {
        if (!safeMaxAllowedDate) return true;
        const nextMonth = new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1);
        return nextMonth <= startOfMonth(safeMaxAllowedDate);
    }, [pickerDate, safeMaxAllowedDate]);

    const allowedDateRangeLabel = useMemo(() => {
        if (!safeMinAllowedDate || !safeMaxAllowedDate) return '';
        return `${formatDateDisplay(safeMinAllowedDate)} - ${formatDateDisplay(safeMaxAllowedDate)}`;
    }, [safeMinAllowedDate, safeMaxAllowedDate]);

    const dayCells = useMemo(() => {
        const daysInMonth = new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 0).getDate();
        const firstWeekday = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), 1).getDay();

        return [
            ...Array.from({length: firstWeekday}, (_, index) => ({
                key: `empty-${index}`,
                isEmpty: true,
            })),
            ...Array.from({length: daysInMonth}, (_, index) => ({
                date: new Date(pickerDate.getFullYear(), pickerDate.getMonth(), index + 1),
                key: `day-${index + 1}`,
                day: index + 1,
                isEmpty: false,
                isDisabled:
                    (safeMinAllowedDate && new Date(pickerDate.getFullYear(), pickerDate.getMonth(), index + 1) < safeMinAllowedDate) ||
                    (safeMaxAllowedDate && new Date(pickerDate.getFullYear(), pickerDate.getMonth(), index + 1) > safeMaxAllowedDate),
                isSelected: isSameDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth(), index + 1), selectedDateInPicker),
            })),
        ];
    }, [pickerDate, safeMinAllowedDate, safeMaxAllowedDate, selectedDateInPicker]);

    const toggleServiceSelection = (serviceId) => {
        setActiveServiceIds((current) => {
            if (current.includes(serviceId)) {
                return current.filter((id) => id !== serviceId);
            }
            return [...current, serviceId];
        });

        setServiceSchedules((current) => {
            const existingRows = Array.isArray(current?.[serviceId]) ? current[serviceId] : [];

            if (existingRows.length) {
                return current;
            }

            return {
                ...current,
                [serviceId]: [{uid: createScheduleUid(), date: '', time: ''}],
            };
        });
    };

    const updateServiceSchedule = (serviceId, scheduleUid, updates) => {
        setServiceSchedules((current) => ({
            ...current,
            [serviceId]: (Array.isArray(current?.[serviceId]) ? current[serviceId] : []).map((row) => {
                if (row?.uid !== scheduleUid) return row;

                return {
                    ...row,
                    date: String(row?.date || '').trim(),
                    time: String(row?.time || '').trim(),
                    ...updates,
                };
            }),
        }));
    };

    const openDatePicker = (serviceId, scheduleUid) => {
        setPickerTarget({serviceId, scheduleUid});
        const entries = Array.isArray(serviceSchedules?.[serviceId]) ? serviceSchedules[serviceId] : [];
        const currentEntry = entries.find((entry) => entry?.uid === scheduleUid);
        const existingDate = parseDateInput(currentEntry?.date || '');
        const seed = clampDate(existingDate || new Date(), safeMinAllowedDate, safeMaxAllowedDate) || new Date();
        setPickerDate(startOfMonth(seed));
        setPickerMode('date');
    };

    const openTimePicker = (serviceId, scheduleUid) => {
        setPickerTarget({serviceId, scheduleUid});
        setPickerMode('time');
    };

    const closePicker = () => {
        setPickerMode(null);
        setPickerTarget({serviceId: '', scheduleUid: ''});
    };

    const addServiceSchedule = (serviceId) => {
        setServiceSchedules((current) => {
            const rows = Array.isArray(current?.[serviceId]) ? current[serviceId] : [];
            return {
                ...current,
                [serviceId]: [...rows, {uid: createScheduleUid(), date: '', time: ''}],
            };
        });

        setActiveServiceIds((current) => (current.includes(serviceId) ? current : [...current, serviceId]));
    };

    const removeServiceSchedule = (serviceId, scheduleUid) => {
        setServiceSchedules((current) => {
            const rows = Array.isArray(current?.[serviceId]) ? current[serviceId] : [];
            const nextRows = rows.filter((entry) => entry?.uid !== scheduleUid);

            setActiveServiceIds((currentActive) => {
                if (nextRows.length === 0) {
                    return currentActive.filter((id) => id !== serviceId);
                }
                return currentActive;
            });

            return {
                ...current,
                [serviceId]: nextRows,
            };
        });
    };

    const selectDate = (selected) => {
        if (!selected) return;
        if (safeMinAllowedDate && selected < safeMinAllowedDate) return;
        if (safeMaxAllowedDate && selected > safeMaxAllowedDate) return;
        updateServiceSchedule(pickerTarget.serviceId, pickerTarget.scheduleUid, {date: formatDateDisplay(selected)});
        closePicker();
    };

    const selectTime = (time) => {
        updateServiceSchedule(pickerTarget.serviceId, pickerTarget.scheduleUid, {time});
        closePicker();
    };

    const previewSelectedServices = useMemo(() => {
        if (!activeServiceIds.length) {
            return [];
        }

        return activeServiceIds.flatMap((serviceId) => {
                const service = SERVICE_OPTIONS.find((item) => item.id === serviceId);
                if (!service) return [];

                const existingItems = selectedServices.filter((item) => item?.id === serviceId);
                const scheduleRows = Array.isArray(serviceSchedules?.[serviceId]) ? serviceSchedules[serviceId] : [];

                return scheduleRows.map((schedule, index) => {
                    const existing = existingItems[index] || {};

                    return {
                        ...existing,
                        id: service.id,
                        line_id: String(existing?.line_id || existing?.lineId || '').trim() || `line-${service.id}-${schedule.uid}`,
                        line_no: Number(index) + 1,
                        service_code: service.code,
                        display_code: buildServiceDisplayCode(service.code, Number(index) + 1),
                        code: service.code,
                        name: service.title,
                        roomName,
                        price: Number(service.price || 0),
                        priceLabel: `${Number(service.price || 0).toLocaleString('en-US')} USD`,
                        paymentMode: 'prepaid',
                        paymentNote: '',
                        date: String(schedule?.date || existing?.date || '').trim(),
                        time: String(schedule?.time || existing?.time || '').trim(),
                    };
                });
            })
            .filter(Boolean);
    }, [selectedServices, activeServiceIds, roomName, serviceSchedules]);

    const payableServiceTotal = useMemo(() => {
        return previewSelectedServices.reduce((sum, item) => {
            if (item?.id === 'airport_shuttle' && item?.paymentMode === 'direct_with_driver') {
                return sum;
            }
            return sum + Number(item?.price || 0);
        }, 0);
    }, [previewSelectedServices]);

    const handleSubmit = async () => {
        let nextSelectedServices = previewSelectedServices;

        if (!nextSelectedServices.length) {
            if (!activeServiceIds.length) {
                Alert.alert('No service selected', 'Please choose at least one service before applying.');
                return;
            }
            nextSelectedServices = previewSelectedServices;
        }

        const missingSchedule = nextSelectedServices.find(
            (service) => !String(service?.date || '').trim() || !String(service?.time || '').trim()
        );
        if (missingSchedule) {
            Alert.alert('Missing schedule', `Please choose date and time for ${missingSchedule.name}.`);
            return;
        }

        const outOfRangeService = nextSelectedServices.find((service) => {
            const serviceDate = parseDateInput(service?.date);
            if (!serviceDate) return true;
            if (safeMinAllowedDate && serviceDate < safeMinAllowedDate) return true;
            if (safeMaxAllowedDate && serviceDate > safeMaxAllowedDate) return true;
            return false;
        });
        if (outOfRangeService) {
            const rangeNote = allowedDateRangeLabel ? ` (${allowedDateRangeLabel})` : '';
            Alert.alert('Date out of range', `Please choose a valid date for ${outOfRangeService.name}${rangeNote}.`);
            return;
        }

        const nextServiceTotal = nextSelectedServices.reduce((sum, item) => {
            if (item?.id === 'airport_shuttle' && item?.paymentMode === 'direct_with_driver') return sum;
            return sum + Number(item?.price || 0);
        }, 0);

        if (sourceScreen === 'upcoming' && bookingId) {
            try {
                const raw = await AsyncStorage.getItem(UPCOMING_BOOKINGS_KEY);
                const parsed = raw ? JSON.parse(raw) : [];
                const current = Array.isArray(parsed) ? parsed : [];

                const normalizedBookingId = String(bookingId).trim();
                const bookingRecords = current.filter(
                    (record) => String(record?.bookingId || '').trim() === normalizedBookingId
                );

                const canonicalRecord =
                    bookingRecords.find((record) => {
                        const action = String(record?.actionLabel || '').trim().toLowerCase();
                        const actionType = String(record?.actionType || '').trim().toLowerCase();
                        return actionType === 'payment' || action === 'payment' || action === 'paid in full';
                    }) ||
                    bookingRecords[0] ||
                    {};

                const canonicalInvoice = canonicalRecord?.invoiceDetails || {};
                const canonicalSubtotal = Number(canonicalRecord?.subtotalPrice ?? canonicalInvoice?.subtotalPrice ?? 0) || 0;
                const canonicalServiceTotal = Number(canonicalRecord?.payableServiceTotal ?? canonicalInvoice?.payableServiceTotal ?? 0) || 0;
                const roomSubtotal = Math.max(0, canonicalSubtotal - canonicalServiceTotal);
                const nextSubtotal = Number((roomSubtotal + nextServiceTotal).toFixed(2));
                const nextVat = Number((nextSubtotal * 0.1).toFixed(2));
                const nextTotal = Number((nextSubtotal + nextVat).toFixed(2));
                const nextDeposit = Number((nextTotal * 0.2).toFixed(2));
                const paidAmount = bookingRecords.reduce((maxPaid, record) => {
                    const invoice = record?.invoiceDetails || {};
                    const currentPaid = Number(record?.paidAmount ?? invoice?.paidAmount ?? 0) || 0;
                    return currentPaid > maxPaid ? currentPaid : maxPaid;
                }, 0);
                const remainingAmount = Math.max(0, Number((nextTotal - paidAmount).toFixed(2)));

                const updated = current.map((record) => {
                    const sameBooking = String(record?.bookingId || '').trim() === normalizedBookingId;
                    if (!sameBooking) return record;

                    const previousInvoice = record?.invoiceDetails || {};
                    const isPaymentAction =
                        String(record?.actionLabel || '').trim().toLowerCase() === 'payment' ||
                        String(record?.actionType || '').trim().toLowerCase() === 'payment' ||
                        String(record?.actionLabel || '').trim().toLowerCase() === 'paid in full';

                    return {
                        ...record,
                        selectedService: nextSelectedServices[0] || null,
                        selectedServices: nextSelectedServices,
                        payableServiceTotal: nextServiceTotal,
                        subtotalPrice: nextSubtotal,
                        vatAmount: nextVat,
                        totalAmount: nextTotal,
                        depositAmount: nextDeposit,
                        remainingAmount,
                        paymentStatus: isPaymentAction ? (remainingAmount > 0 ? 'pending' : 'completed') : record?.paymentStatus,
                        actionLabel: isPaymentAction ? (remainingAmount > 0 ? 'Payment' : 'Paid in full') : record?.actionLabel,
                        actionColor: isPaymentAction ? (remainingAmount > 0 ? '#2aa8b9' : '#2ba36f') : record?.actionColor,
                        invoiceDetails: {
                            ...previousInvoice,
                            selectedServices: nextSelectedServices,
                            payableServiceTotal: nextServiceTotal,
                            subtotalPrice: nextSubtotal,
                            vatAmount: nextVat,
                            totalAmount: nextTotal,
                            depositAmount: nextDeposit,
                            paidAmount,
                            remainingAmount,
                        },
                    };
                });

                await AsyncStorage.setItem(UPCOMING_BOOKINGS_KEY, JSON.stringify(updated));
                navigation.goBack();
                return;
            } catch {
                Alert.alert('Unable to apply service', 'Please try again.');
                return;
            }
        }

        navigation.navigate({
            name: 'CustomerBookingScreen',
            params: {
                hotelName,
                hotelAddress,
                roomName,
                checkIn,
                checkOut,
                startDate,
                endDate,
                startDateIso,
                endDateIso,
                bookingMinDateIso,
                bookingMaxDateIso,
                bookingStartDateIso,
                bookingEndDateIso,
                selectedService: nextSelectedServices[0],
                selectedServices: nextSelectedServices,
                selectedServicePrice: nextServiceTotal,
                serviceSelectionToken: Date.now(),
            },
            merge: true,
        });
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 600);
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                style={styles.keyboardWrap}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
                        <Ionicons name="chevron-back" size={22} color="#1f1f1f" />
                    </TouchableOpacity>
                    <View style={styles.headerTextWrap}>
                        <Text style={styles.headerTitle}>Customer Service</Text>
                        <Text style={styles.headerSubtitle}>{hotelName} • {roomName}</Text>
                    </View>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={['#5b79df']}
                            tintColor="#5b79df"
                        />
                    }
                >
                <View style={styles.heroCard}>
                    <Text style={styles.heroTitle}>Book extra services</Text>
                    <Text style={styles.heroDescription}>
                            Choose one or more services. Date/time and price will be synced to your booking summary.
                        </Text>
                    <View style={styles.heroBadge}>
                        <Feather name="calendar" size={14} color="#5167d8" />
                        <Text style={styles.heroBadgeText}>{bookingId || 'Draft booking'}</Text>
                    </View>
                    {allowedDateRangeLabel ? (
                        <View style={styles.heroRangeBadge}>
                            <Ionicons name="calendar-clear-outline" size={13} color="#3d5bc9" />
                            <Text style={styles.heroRangeText}>Service date range: {allowedDateRangeLabel}</Text>
                        </View>
                    ) : null}
                </View>

                <Text style={styles.sectionTitle}>Select service</Text>
                {SERVICE_OPTIONS.map((item) => {
                    const active = activeServiceIds.includes(item.id);
                    const confirmedServices = selectedServices.filter((service) => service?.id === item.id);
                    const hasConfirmedData = confirmedServices.length > 0;
                    const confirmedCount = confirmedServices.length;
                    const serviceRows = Array.isArray(serviceSchedules?.[item.id]) ? serviceSchedules[item.id] : [];
                    const servicePriceValue = Number(confirmedServices[0]?.price || 0);
                    const shouldShowConfirmedPrice = hasConfirmedData && item.id !== 'airport_shuttle' && servicePriceValue > 0;
                    const shouldShowDirectPay = hasConfirmedData && item.id === 'airport_shuttle';
                    return (
                        <TouchableOpacity
                            key={item.id}
                            onPress={() => toggleServiceSelection(item.id)}
                            activeOpacity={0.85}
                            style={[
                                styles.serviceCard,
                                active ? {borderColor: item.accent, backgroundColor: '#fbfbff'} : null,
                            ]}
                        >
                            <View style={[styles.serviceIconWrap, {backgroundColor: `${item.accent}18`}] }>
                                <Ionicons name={item.icon} size={22} color={item.accent} />
                            </View>
                            <View style={styles.serviceBody}>
                                <Text style={styles.serviceTitle}>{item.title}</Text>
                                <Text style={styles.serviceSubtitle}>{item.subtitle}</Text>
                                <Text style={[styles.servicePrice, {color: item.accent}]}>Price: {item.priceLabel}</Text>
                                {active ? (
                                    <>
                                        {serviceRows.map((schedule, rowIndex) => (
                                            <View key={schedule.uid} style={styles.scheduleLineWrap}>
                                                <View style={styles.scheduleLineHeader}>
                                                    <Text style={[styles.scheduleLineTitle, {color: item.accent}]}>Schedule {rowIndex + 1}</Text>
                                                    {serviceRows.length > 1 ? (
                                                        <TouchableOpacity onPress={() => removeServiceSchedule(item.id, schedule.uid)} activeOpacity={0.85}>
                                                            <Text style={styles.scheduleRemoveText}>Remove</Text>
                                                        </TouchableOpacity>
                                                    ) : null}
                                                </View>
                                                <View style={styles.scheduleRow}>
                                                    <TouchableOpacity
                                                        style={[styles.scheduleBtn, {borderColor: item.accent}]}
                                                        onPress={() => openDatePicker(item.id, schedule.uid)}
                                                        activeOpacity={0.85}
                                                    >
                                                        <Ionicons name="calendar-outline" size={14} color={item.accent} />
                                                        <Text style={[styles.scheduleBtnText, {color: item.accent}]}>
                                                            {schedule?.date || 'Select date'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.scheduleBtn, {borderColor: item.accent}]}
                                                        onPress={() => openTimePicker(item.id, schedule.uid)}
                                                        activeOpacity={0.85}
                                                    >
                                                        <Ionicons name="time-outline" size={14} color={item.accent} />
                                                        <Text style={[styles.scheduleBtnText, {color: item.accent}]}>
                                                            {schedule?.time || 'Select time'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}

                                        <TouchableOpacity
                                            style={[styles.addScheduleBtn, {borderColor: item.accent}]}
                                            onPress={() => addServiceSchedule(item.id)}
                                            activeOpacity={0.85}
                                        >
                                            <Ionicons name="add-circle-outline" size={15} color={item.accent} />
                                            <Text style={[styles.addScheduleBtnText, {color: item.accent}]}>Add schedule</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : null}
                                {shouldShowConfirmedPrice ? (
                                    <Text style={[styles.servicePrice, {color: item.accent}]}>Confirmed: {servicePriceValue.toLocaleString('en-US')} USD</Text>
                                ) : null}
                                {shouldShowDirectPay ? (
                                    <Text style={[styles.servicePrice, {color: item.accent}]}>Confirmed: Pay directly to driver</Text>
                                ) : null}
                                {active ? <Text style={[styles.servicePrice, {color: item.accent}]}>Selected ({serviceRows.length} schedule{serviceRows.length > 1 ? 's' : ''})</Text> : null}
                                {!active && hasConfirmedData ? <Text style={[styles.servicePrice, {color: item.accent}]}>Saved {confirmedCount} schedule{confirmedCount > 1 ? 's' : ''}</Text> : null}
                            </View>
                            <View style={[styles.radioOuter, active ? {borderColor: item.accent} : null]}>
                                {active ? <View style={[styles.radioInner, {backgroundColor: item.accent}]} /> : null}
                            </View>
                        </TouchableOpacity>
                    );
                })}

                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Service summary</Text>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Hotel</Text>
                        <Text style={styles.summaryValue}>{hotelName}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Room</Text>
                        <Text style={styles.summaryValue}>{roomName}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Services</Text>
                        <Text style={styles.summaryValue}>{previewSelectedServices.length ? `${previewSelectedServices.length} selected` : 'None'}</Text>
                    </View>
                    {previewSelectedServices.length ? <View style={styles.summaryDivider} /> : null}
                    {previewSelectedServices.length ? previewSelectedServices.map((service, index) => {
                        const isDirectPay = service?.id === 'airport_shuttle' && service?.paymentMode === 'direct_with_driver';
                        const serviceFee = Number(service?.price || 0);
                        const spaItems = Array.isArray(service?.selectedSpaServices) ? service.selectedSpaServices : [];
                        const displayCode = String(service?.display_code || '').trim() || String(service?.service_code || service?.code || 'N/A').trim() || 'N/A';

                        return (
                            <View key={String(service?.line_id || '').trim() || `${service.id}-${index}`}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Service code</Text>
                                    <Text style={styles.summaryValue}>{displayCode}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Service name</Text>
                                    <Text style={styles.summaryValue}>{service?.name || 'N/A'}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Date</Text>
                                    <Text style={styles.summaryValue}>{service?.date || 'Select date'}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Time</Text>
                                    <Text style={styles.summaryValue}>{service?.time || 'Select time'}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Service fee</Text>
                                    <Text style={styles.summaryValue}>{isDirectPay ? 'Paid directly to driver' : `${serviceFee.toLocaleString('en-US')} USD`}</Text>
                                </View>
                                {service?.selectedShuttleMode ? (
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Shuttle mode</Text>
                                        <Text style={styles.summaryValue}>{service.selectedShuttleMode}</Text>
                                    </View>
                                ) : null}
                                {service?.selectedShuttlePickup ? (
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Pickup</Text>
                                        <Text style={styles.summaryValue}>{service.selectedShuttlePickup}</Text>
                                    </View>
                                ) : null}
                                {service?.selectedShuttleDestination ? (
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Destination</Text>
                                        <Text style={styles.summaryValue}>{service.selectedShuttleDestination}</Text>
                                    </View>
                                ) : null}
                                {spaItems.length ? (
                                    <Text style={styles.summaryHintText}>Spa items: {spaItems.map((item) => item.name).join(', ')}</Text>
                                ) : null}
                                {service?.notes ? (
                                    <Text style={styles.summaryHintText}>Notes: {service.notes}</Text>
                                ) : null}
                                {service?.paymentNote ? (
                                    <Text style={styles.summaryHintText}>{service.paymentNote}</Text>
                                ) : null}
                                {index < previewSelectedServices.length - 1 ? <View style={styles.summaryServiceDivider} /> : null}
                            </View>
                        );
                    }) : (
                        <Text style={styles.summaryHintText}>No service selected yet. Choose one service above and tap Apply service.</Text>
                    )}
                    {selectedServices.length ? <View style={styles.summaryDivider} /> : null}
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Payable service total</Text>
                        <Text style={styles.summaryValue}>{payableServiceTotal.toLocaleString('en-US')} USD</Text>
                    </View>
                </View>

                <Modal
                    visible={pickerMode === 'date'}
                    transparent
                    animationType="slide"
                    onRequestClose={closePicker}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalSheet}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select date</Text>
                                <TouchableOpacity onPress={closePicker}>
                                    <Ionicons name="close" size={24} color="#1f2937" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.monthNavRow}>
                                <TouchableOpacity
                                    style={[styles.monthNavBtn, !canGoPrevMonth ? styles.monthNavBtnDisabled : null]}
                                    onPress={() => {
                                        if (!canGoPrevMonth) return;
                                        setPickerDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                                    }}
                                    disabled={!canGoPrevMonth}
                                >
                                    <Ionicons name="chevron-back" size={18} color={canGoPrevMonth ? '#374151' : '#9ca3af'} />
                                </TouchableOpacity>
                                <Text style={styles.monthTitle}>{getMonthTitle(pickerDate)}</Text>
                                <TouchableOpacity
                                    style={[styles.monthNavBtn, !canGoNextMonth ? styles.monthNavBtnDisabled : null]}
                                    onPress={() => {
                                        if (!canGoNextMonth) return;
                                        setPickerDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                                    }}
                                    disabled={!canGoNextMonth}
                                >
                                    <Ionicons name="chevron-forward" size={18} color={canGoNextMonth ? '#374151' : '#9ca3af'} />
                                </TouchableOpacity>
                            </View>

                            {allowedDateRangeLabel ? (
                                <Text style={styles.modalRangeText}>Available: {allowedDateRangeLabel}</Text>
                            ) : null}

                            <View style={styles.weekdayRow}>
                                {WEEKDAY_LABELS.map((label) => (
                                    <Text key={label} style={styles.weekdayText}>{label}</Text>
                                ))}
                            </View>

                            <View style={styles.dayGrid}>
                                {dayCells.map((cell) => {
                                    if (cell.isEmpty) {
                                        return (
                                            <View key={cell.key} style={styles.daySlot}>
                                                <View style={styles.dayCellGhost} />
                                            </View>
                                        );
                                    }

                                    return (
                                        <View key={cell.key} style={styles.daySlot}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.dayCell,
                                                    cell.isSelected ? styles.dayCellSelected : null,
                                                    cell.isDisabled ? styles.dayCellDisabled : null,
                                                ]}
                                                onPress={() => selectDate(cell.date)}
                                                activeOpacity={0.85}
                                                disabled={cell.isDisabled}
                                            >
                                                <Text
                                                    style={[
                                                        styles.dayCellText,
                                                        cell.isSelected ? styles.dayCellTextSelected : null,
                                                        cell.isDisabled ? styles.dayCellTextDisabled : null,
                                                    ]}
                                                >
                                                    {cell.day}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                </Modal>

                <Modal
                    visible={pickerMode === 'time'}
                    transparent
                    animationType="slide"
                    onRequestClose={closePicker}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalSheet}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select time</Text>
                                <TouchableOpacity onPress={closePicker}>
                                    <Ionicons name="close" size={24} color="#1f2937" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.timeList} showsVerticalScrollIndicator={false}>
                                {timeSlots.map((slot) => (
                                    <TouchableOpacity
                                        key={slot}
                                        style={styles.timeRow}
                                        onPress={() => selectTime(slot)}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.timeRowText}>{slot}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
                        <Text style={styles.secondaryBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={handleSubmit}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.primaryBtnText}>Apply service</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: UI.screenBg,
    },
    keyboardWrap: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    headerTextWrap: {
        flex: 1,
        paddingHorizontal: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#667085',
        marginTop: 2,
    },
    headerSpacer: {
        width: 40,
        height: 40,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 24,
        flexGrow: 1,
    },
    heroCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 16,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    heroTitle: {
        fontSize: 28,
        lineHeight: 32,
        fontWeight: '800',
        color: '#121826',
    },
    heroDescription: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 20,
        color: '#667085',
    },
    heroBadge: {
        marginTop: 12,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#eef0ff',
    },
    heroBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#5167d8',
    },
    heroRangeBadge: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        backgroundColor: '#edf3ff',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    heroRangeText: {
        fontSize: 12,
        color: '#3d5bc9',
        fontWeight: '700',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#121826',
        marginTop: 6,
        marginBottom: 10,
    },
    serviceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e4e7ec',
        backgroundColor: '#fff',
        padding: 14,
        marginBottom: 12,
    },
    serviceIconWrap: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    serviceBody: {
        flex: 1,
        minWidth: 0,
    },
    serviceTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#101828',
    },
    serviceSubtitle: {
        fontSize: 13,
        color: '#667085',
        marginTop: 3,
        lineHeight: 18,
    },
    servicePrice: {
        fontSize: 12,
        color: '#5167d8',
        fontWeight: '700',
        marginTop: 6,
    },
    scheduleRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
        flexWrap: 'wrap',
    },
    scheduleLineWrap: {
        marginTop: 8,
    },
    scheduleLineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scheduleLineTitle: {
        fontSize: 12,
        fontWeight: '800',
    },
    scheduleRemoveText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#dc2626',
    },
    scheduleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 10,
        gap: 5,
    },
    scheduleBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    addScheduleBtn: {
        marginTop: 10,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 7,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    addScheduleBtnText: {
        fontSize: 12,
        fontWeight: '800',
    },
    serviceDetailButton: {
        alignSelf: 'flex-start',
        marginTop: 10,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    serviceDetailButtonText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#fff',
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#cbd5e1',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e4e7ec',
        padding: 14,
        marginBottom: 4,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#101828',
        marginBottom: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
    },
    summaryLabel: {
        fontSize: 13,
        color: '#667085',
    },
    summaryValue: {
        fontSize: 13,
        color: '#101828',
        fontWeight: '700',
        flexShrink: 1,
        textAlign: 'right',
        marginLeft: 12,
    },
    summaryDivider: {
        height: 1,
        backgroundColor: '#eef2f6',
        marginVertical: 6,
    },
    summaryHintText: {
        marginTop: 6,
        fontSize: 12,
        lineHeight: 18,
        color: '#667085',
    },
    summaryServiceDivider: {
        height: 1,
        backgroundColor: '#dbe4f0',
        marginTop: 10,
        marginBottom: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.42)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        paddingHorizontal: 16,
        paddingBottom: 20,
        paddingTop: 14,
        maxHeight: '75%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    monthNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    monthNavBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthNavBtnDisabled: {
        backgroundColor: '#f6f7f8',
    },
    monthTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1f2937',
    },
    modalRangeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#5167d8',
        marginBottom: 10,
    },
    weekdayRow: {
        flexDirection: 'row',
        marginBottom: 6,
    },
    weekdayText: {
        width: '14.2857%',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: 11,
        fontWeight: '700',
    },
    dayGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingBottom: 4,
    },
    daySlot: {
        width: '14.2857%',
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    dayCellGhost: {
        width: '100%',
        aspectRatio: 1,
    },
    dayCell: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#d1d5db',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    dayCellSelected: {
        backgroundColor: '#5167d8',
        borderColor: '#5167d8',
    },
    dayCellDisabled: {
        backgroundColor: '#f4f4f5',
        borderColor: '#e5e7eb',
    },
    dayCellText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
    },
    dayCellTextSelected: {
        color: '#ffffff',
    },
    dayCellTextDisabled: {
        color: '#9ca3af',
    },
    timeList: {
        maxHeight: 360,
    },
    timeRow: {
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: '#eef2f7',
    },
    timeRowText: {
        fontSize: 15,
        color: '#111827',
        fontWeight: '700',
    },
    spaSummaryTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#7c4dff',
        marginTop: 4,
        marginBottom: 6,
    },
    spaSummaryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 7,
    },
    spaSummaryTextWrap: {
        flex: 1,
        paddingRight: 12,
    },
    spaSummaryName: {
        fontSize: 13,
        color: '#101828',
        fontWeight: '700',
    },
    spaSummaryMeta: {
        marginTop: 2,
        fontSize: 12,
        color: '#667085',
    },
    spaSummaryPrice: {
        fontSize: 13,
        fontWeight: '800',
        color: '#7c4dff',
        textAlign: 'right',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 16,
        backgroundColor: UI.screenBg,
    },
    secondaryBtn: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d0d5dd',
    },
    secondaryBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#344054',
    },
    primaryBtn: {
        flex: 1.2,
        backgroundColor: '#5167d8',
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#5167d8',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    primaryBtnText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#fff',
    },
});
