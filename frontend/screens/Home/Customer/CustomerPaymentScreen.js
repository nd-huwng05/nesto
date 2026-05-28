import React, {useMemo, useState} from 'react';
import {Alert, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {getSession} from '../../../utils/authStorage';
import {normalizeServiceLine} from '../../../utils/serviceLineIdentity';
import {nextLocalBookingId, normalizeBookingId} from '../../../utils/bookingId';
import {pushCustomerNotification} from '../../../services/NotificationService';

const formatUsd = (amount) => Number(amount || 0).toLocaleString('en-US');
const UPCOMING_BOOKINGS_KEY = 'customer_paid_upcoming_bookings';
const HISTORY_BOOKINGS_KEY = 'customer_paid_history_bookings';

const PAYMENT_LOGOS = {
    momo: require('../../../assets/images/hotels/Logo-MoMo-Square.webp'),
    zalo: STAFF_MEDIA.ZALOPAY_LOGO,
};

const MONTH_TO_NUMBER = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
};

const toUpcomingDateLabel = (value) => {
    const text = String(value || '').trim();
    const match = text.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);

    if (!match) return text || 'N/A';

    const day = String(match[1]).padStart(2, '0');
    const month = MONTH_TO_NUMBER[String(match[2]).toLowerCase()] || '01';
    const year = match[3];

    return `${day}/${month}/${year}`;
};

export default function CustomerPaymentScreen({navigation, route}) {
    const insets = useSafeAreaInsets();
    const {
        heroImage = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg',
        hotelName = 'Swiss Hotel',
        roomName = 'Room 121',
        checkIn = "9h00' 23 Mar 2026",
        checkOut = "9h00' 24 Mar 2026",
        checkInDateIso = '',
        checkOutDateIso = '',
        name = 'Nguyen Ngoc Lan',
        email = 'customer@nesto.vn',
        phone = 'N/A',
        totalAmount = 312,
        depositAmount = 62,
        subtotalPrice = 283,
        vatAmount = 29,
        pricePerHour = 11,
        discountPerHour = 1,
        stayTimeLabel = '24h00',
        selectedService = null,
        selectedServices = [],
        bookingId = null,
    } = route?.params ?? {};

    const [paymentMethod, setPaymentMethod] = useState('momo');
    const [failedLogos, setFailedLogos] = useState({});
    const [showAmountModal, setShowAmountModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [paymentAmountInput, setPaymentAmountInput] = useState('');
    const [paidAmount, setPaidAmount] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const paymentRows = useMemo(
        () => [
            {id: 'momo', label: 'Payment by momo', logo: PAYMENT_LOGOS.momo, fallbackText: 'MoMo', fallbackColor: '#b0006d'},
            {id: 'zalo', label: 'Payment by ZaloPay', logo: PAYMENT_LOGOS.zalo, fallbackText: 'ZP', fallbackColor: '#0a78c2'},
        ],
        []
    );

    const normalizedServices = useMemo(() => {
        const services = Array.isArray(selectedServices)
            ? selectedServices.filter((item) => item && typeof item === 'object' && item.id)
            : [];

        if (services.length) {
            return services.map((item, index) => normalizeServiceLine(item, {
                lineNo: index + 1,
                lineId: `line-${item?.id || 'service'}-${index + 1}`,
                serviceCode: item?.code || '',
            }));
        }

        if (selectedService && typeof selectedService === 'object' && selectedService.id) {
            return [normalizeServiceLine(selectedService, {
                lineNo: 1,
                lineId: `line-${selectedService?.id || 'service'}-1`,
                serviceCode: selectedService?.code || '',
            })];
        }

        return [];
    }, [selectedService, selectedServices]);

    const payableServiceTotal = useMemo(() => {
        return normalizedServices.reduce((sum, service) => {
            const isDirectPay =
                service?.id === 'airport_shuttle' && service?.paymentMode === 'direct_with_driver';

            if (isDirectPay) {
                return sum;
            }

            const price = Number(service?.price || 0);
            return sum + (Number.isFinite(price) ? price : 0);
        }, 0);
    }, [normalizedServices]);

    const maxPayableAmount = useMemo(() => {
        const amount = Number(totalAmount || 0);
        if (!Number.isFinite(amount) || amount <= 0) return 0;
        return Math.round(amount * 100) / 100;
    }, [totalAmount]);

    const minPayableAmount = useMemo(() => {
        const amount = Number(depositAmount || 0);
        if (!Number.isFinite(amount) || amount <= 0) return 0;
        return Math.min(Math.round(amount * 100) / 100, maxPayableAmount || amount);
    }, [depositAmount, maxPayableAmount]);

    const parsePaymentAmount = (value) => {
        const normalized = String(value || '')
            .replace(/,/g, '')
            .replace(/\s+/g, '')
            .trim();

        if (!normalized) return NaN;
        const amount = Number(normalized);
        if (!Number.isFinite(amount)) return NaN;
        return Math.round(amount * 100) / 100;
    };

    const resolveUpcomingDateLabel = (isoValue, fallbackLabel) => {
        const parsedIso = typeof isoValue === 'string' ? new Date(isoValue) : null;
        if (parsedIso && Number.isFinite(parsedIso.getTime())) {
            const day = String(parsedIso.getDate()).padStart(2, '0');
            const month = String(parsedIso.getMonth() + 1).padStart(2, '0');
            const year = parsedIso.getFullYear();
            return `${day}/${month}/${year}`;
        }
        return toUpcomingDateLabel(fallbackLabel);
    };

    const markLogoFailed = (id) => {
        setFailedLogos((prev) => ({...prev, [id]: true}));
    };

    const handleProcessPayment = async (amountToPay) => {
        const session = await getSession();
        const sessionUser = session?.user || {};
        const customerName = String(sessionUser?.name || sessionUser?.full_name || name || 'N/A').trim() || 'N/A';
        const customerEmail = String(sessionUser?.email || email || '').trim().toLowerCase();
        const customerPhone = String(sessionUser?.phone || phone || 'N/A').trim() || 'N/A';
        const paidAt = new Date().toISOString();
        const normalizedBookingId = normalizeBookingId(bookingId);
        const safeBookingId = normalizedBookingId || await nextLocalBookingId();
        const upcomingCheckIn = resolveUpcomingDateLabel(checkInDateIso, checkIn);
        const upcomingCheckOut = resolveUpcomingDateLabel(checkOutDateIso, checkOut);
        const remainingAmount = Math.max(0, Number((maxPayableAmount - amountToPay).toFixed(2)));
        const stayHours = Number.parseInt(String(stayTimeLabel || '').replace(/[^\d]/g, ''), 10);
        const lateCheckoutHours = Number.isFinite(stayHours) ? Math.max(0, stayHours - 24) : 0;
        const invoiceDetails = {
            subtotalPrice,
            vatAmount,
            payableServiceTotal,
            totalAmount: maxPayableAmount,
            depositAmount: minPayableAmount,
            paidAmount: amountToPay,
            remainingAmount,
            selectedServices: normalizedServices,
            paymentMethod,
        };
        const bookedItem = {
            id: `upcoming-${Date.now()}`,
            hotelName,
            roomName,
            checkIn: upcomingCheckIn,
            checkOut: upcomingCheckOut,
            checkInDateIso,
            checkOutDateIso,
            bookingId: safeBookingId,
            actionLabel: 'Online Check-in',
            actionColor: '#8294FF',
            image: heroImage,
            paymentStatus: 'completed',
            paidAt,
            customerName,
            customerEmail,
            customerPhone,
            paidAmount: amountToPay,
            totalAmount: maxPayableAmount,
            depositAmount: minPayableAmount,
            payableServiceTotal,
            subtotalPrice,
            vatAmount,
            selectedServices: normalizedServices,
            selectedService: normalizedServices[0] || null,
            remainingAmount,
            paymentMethod,
            invoiceDetails,
        };

        const historyItem = {
            id: `history-${Date.now()}`,
            roomName,
            roomCode: hotelName,
            bookingId: safeBookingId,
            stayDate: `${upcomingCheckIn} - ${upcomingCheckOut}`,
            status: 'Complete',
            image: heroImage,
            paidAt,
            paymentMethod,
            customerName,
            customerEmail,
            customerPhone,
            paidAmount: amountToPay,
            totalAmount: maxPayableAmount,
            depositAmount: minPayableAmount,
            payableServiceTotal,
            subtotalPrice,
            vatAmount,
            selectedServices: normalizedServices,
            selectedService: normalizedServices[0] || null,
            remainingAmount,
            invoiceDetails,
        };

        try {
            const [rawUpcoming, rawHistory] = await AsyncStorage.multiGet([
                UPCOMING_BOOKINGS_KEY,
                HISTORY_BOOKINGS_KEY,
            ]);

            const parsedUpcoming = rawUpcoming?.[1] ? JSON.parse(rawUpcoming[1]) : [];
            const parsedHistory = rawHistory?.[1] ? JSON.parse(rawHistory[1]) : [];
            const currentUpcoming = Array.isArray(parsedUpcoming) ? parsedUpcoming : [];
            const currentHistory = Array.isArray(parsedHistory) ? parsedHistory : [];

            const nextPaymentSnapshot = {
                id: `upcoming-${safeBookingId}-payment`,
                hotelName,
                roomName,
                checkIn: upcomingCheckIn,
                checkOut: upcomingCheckOut,
                checkInDateIso,
                checkOutDateIso,
                bookingId: safeBookingId,
                actionLabel: 'Payment',
                actionColor: '#2aa8b9',
                paymentStatus: remainingAmount > 0 ? 'pending' : 'completed',
                image: heroImage,
                createdAt: paidAt,
                customerName,
                customerEmail,
                customerPhone,
                paidAmount: amountToPay,
                totalAmount: maxPayableAmount,
                depositAmount: minPayableAmount,
                payableServiceTotal,
                subtotalPrice,
                vatAmount,
                selectedServices: normalizedServices,
                selectedService: normalizedServices[0] || null,
                remainingAmount,
                paymentMethod,
                invoiceDetails,
            };

            const dedupedUpcoming = currentUpcoming.filter((item) => {
                const sameBooking = String(item?.bookingId || '').trim() === safeBookingId;
                if (!sameBooking) return true;

                return false;
            });
            const dedupedHistory = currentHistory.filter(
                (item) => String(item?.bookingId || '').trim() !== safeBookingId
            );

            const nextUpcoming = [bookedItem, nextPaymentSnapshot, ...dedupedUpcoming];
            const nextHistory = [historyItem, ...dedupedHistory];

            await AsyncStorage.multiSet([
                [UPCOMING_BOOKINGS_KEY, JSON.stringify(nextUpcoming)],
                [HISTORY_BOOKINGS_KEY, JSON.stringify(nextHistory)],
            ]);
        } catch {
            // Keep UX smooth: even if persistence fails, user still sees success modal.
        }

        setPaidAmount(amountToPay);
        setShowSuccessModal(true);

        const paymentStatusText = remainingAmount > 0
            ? `prepaid ${formatUsd(amountToPay)} USD, remaining ${formatUsd(remainingAmount)} USD`
            : `paid in full ${formatUsd(amountToPay)} USD`;

        await pushCustomerNotification({
            title: 'Booking payment confirmed',
            type: 'booking-payment',
            message: `You booked room ${roomName} (Booking ID ${safeBookingId}). ${paymentStatusText}. Check-in ${upcomingCheckIn}, check-out ${upcomingCheckOut}. Late checkout: ${lateCheckoutHours}h.`,
            meta: {
                bookingId: safeBookingId,
                hotelName,
                roomName,
                checkIn: upcomingCheckIn,
                checkOut: upcomingCheckOut,
                amount: amountToPay,
                remainingAmount,
                lateCheckoutHours,
            },
        });

        await pushCustomerNotification({
            title: 'Payment recorded',
            type: 'payment',
            message: `You paid invoice for Booking ID ${safeBookingId} with ${paymentMethod === 'zalo' ? 'ZaloPay' : 'MoMo'}: ${formatUsd(amountToPay)} USD.`,
            meta: {
                bookingId: safeBookingId,
                paymentMethod,
                amount: amountToPay,
            },
        });
    };

    const handleConfirmPayment = () => {
        setPaymentAmountInput(String(minPayableAmount || ''));
        setShowAmountModal(true);
    };

    const handleSubmitPaymentAmount = async () => {
        const amount = parsePaymentAmount(paymentAmountInput);

        if (!Number.isFinite(amount)) {
            Alert.alert('Invalid amount', 'Please enter a valid payment amount.');
            return;
        }

        if (amount < minPayableAmount) {
            Alert.alert('Amount too low', `Minimum payment is ${formatUsd(minPayableAmount)} USD.`);
            return;
        }

        if (amount > maxPayableAmount) {
            Alert.alert('Amount too high', `Maximum payment is ${formatUsd(maxPayableAmount)} USD.`);
            return;
        }

        setShowAmountModal(false);
        await handleProcessPayment(amount);
    };

    const handleGoHome = () => {
        setShowSuccessModal(false);
        navigation.navigate('CustomerHomeScreen');
    };

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 600);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        colors={['#5b79df']}
                        tintColor="#5b79df"
                    />
                }
            >
                <View style={[styles.heroWrap, {marginTop: insets.top + 8}] }>
                    <Image source={{uri: heroImage}} style={styles.heroImage} resizeMode="cover"/>
                    <View style={[styles.heroActions, {top: Math.max(12, insets.top + 4)}]}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroBtn}>
                            <Ionicons name="arrow-back" size={22} color="#222"/>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.heroBtn}>
                            <Ionicons name="ellipsis-horizontal" size={22} color="#222"/>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.cardTop}>
                    <Text style={styles.roomName}>{roomName}</Text>
                    <Text style={styles.hotelName}>{hotelName}</Text>
                    <View style={styles.ratingRow}>
                        <Ionicons name="star" size={16} color="#f5c51a"/>
                        <Text style={styles.rating}>4.8</Text>
                        <Text style={styles.review}>- 4231 Reviews</Text>
                    </View>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Order summary</Text>
                    <Text style={styles.sectionHint}>Check information order before payment</Text>

                    <View style={styles.row}><Text style={styles.label}>Name:</Text><Text style={styles.value}>{name}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Email:</Text><Text style={styles.value}>{email}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Phone number:</Text><Text style={styles.value}>{phone}</Text></View>
                    <View style={styles.divider}/>
                    <View style={styles.row}><Text style={styles.label}>Hotel:</Text><Text style={styles.value}>{hotelName}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Room:</Text><Text style={styles.value}>{roomName}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Check-in:</Text><Text style={styles.value}>{checkIn}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Check-out:</Text><Text style={styles.value}>{checkOut}</Text></View>
                    <View style={styles.divider}/>
                    <View style={styles.row}><Text style={styles.label}>Time:</Text><Text style={styles.value}>{stayTimeLabel}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Price:</Text><Text style={styles.value}>{formatUsd(pricePerHour)} USD/h</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Discount:</Text><Text style={styles.value}>{formatUsd(discountPerHour)} USD/h</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Subtotal:</Text><Text style={styles.value}>{formatUsd(subtotalPrice)} USD</Text></View>
                    {normalizedServices.length ? <View style={styles.divider}/> : null}
                    {normalizedServices.length ? <View style={styles.row}><Text style={styles.label}>Selected services:</Text><Text style={styles.value}>{normalizedServices.length}</Text></View> : null}
                    {normalizedServices.length ? normalizedServices.map((service, index) => {
                        const isDirectPay = service?.id === 'airport_shuttle' && service?.paymentMode === 'direct_with_driver';
                        const displayCode = String(service?.display_code || '').trim() || String(service?.service_code || service?.code || 'N/A').trim() || 'N/A';
                        return (
                            <View key={String(service?.line_id || '').trim() || `${service.id}-${index}`}>
                                <View style={styles.row}><Text style={styles.label}>Service code:</Text><Text style={styles.value}>{displayCode}</Text></View>
                                <View style={styles.row}><Text style={styles.label}>Service name:</Text><Text style={styles.value}>{service.name || 'N/A'}</Text></View>
                                <View style={styles.row}><Text style={styles.label}>Service fee:</Text><Text style={styles.value}>{isDirectPay ? 'Paid directly to driver' : `${formatUsd(service.price)} USD`}</Text></View>
                                <View style={styles.row}><Text style={styles.label}>Date:</Text><Text style={styles.value}>{service.date || 'N/A'}</Text></View>
                                <View style={styles.row}><Text style={styles.label}>Time:</Text><Text style={styles.value}>{service.time || 'N/A'}</Text></View>
                                {service?.notes ? <Text style={styles.serviceHint}>Notes: {service.notes}</Text> : null}
                                {service?.paymentNote ? <Text style={styles.serviceHint}>{service.paymentNote}</Text> : null}
                                {index < normalizedServices.length - 1 ? <View style={styles.divider}/> : null}
                            </View>
                        );
                    }) : null}
                    {normalizedServices.length ? <View style={styles.row}><Text style={styles.label}>Service total:</Text><Text style={styles.value}>{formatUsd(payableServiceTotal)} USD</Text></View> : null}
                    <View style={styles.row}><Text style={styles.label}>VAT (10%):</Text><Text style={styles.value}>{formatUsd(vatAmount)} USD</Text></View>
                    <View style={styles.divider}/>
                    <View style={styles.row}><Text style={styles.labelBold}>Total Price:</Text><Text style={styles.valueBold}>{formatUsd(totalAmount)} USD</Text></View>
                    <View style={styles.row}><Text style={styles.labelBold}>Deposit (20%):</Text><Text style={styles.valueBold}>{formatUsd(depositAmount)} USD</Text></View>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Payment method</Text>
                    <Text style={styles.sectionHint}>Choose payment method to book room, you have 15 minutes to reserve a place</Text>

                    {paymentRows.map((item) => {
                        const selected = paymentMethod === item.id;
                        const logoSource = typeof item.logo === 'number' ? item.logo : {uri: item.logo};
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.payItem, selected ? styles.payItemActive : null]}
                                onPress={() => setPaymentMethod(item.id)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.payBadgeWrap}>
                                    {!failedLogos[item.id] ? (
                                        <Image
                                            source={logoSource}
                                            style={styles.payBadgeImage}
                                            resizeMode="cover"
                                            onError={() => markLogoFailed(item.id)}
                                        />
                                    ) : (
                                        <View style={[styles.payBadgeFallback, {backgroundColor: item.fallbackColor}]}> 
                                            <Text style={styles.payBadgeFallbackText}>{item.fallbackText}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.payLabel}>{item.label}</Text>
                                {selected ? <Ionicons name="checkmark-circle" size={20} color="#8294FF"/> : null}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmPayment}>
                <Text style={styles.confirmBtnText}>Confirm payment</Text>
            </TouchableOpacity>

            <Modal
                visible={showAmountModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAmountModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.amountModalCard}>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={() => setShowAmountModal(false)}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="close" size={20} color="#4f4f4f"/>
                        </TouchableOpacity>

                        <Text style={styles.amountModalTitle}>Enter payment amount</Text>
                        <Text style={styles.amountModalHint}>
                            Min: {formatUsd(minPayableAmount)} USD | Max: {formatUsd(maxPayableAmount)} USD
                        </Text>

                        <TextInput
                            value={paymentAmountInput}
                            onChangeText={setPaymentAmountInput}
                            placeholder="Enter amount in USD"
                            placeholderTextColor="#9a9a9a"
                            keyboardType="decimal-pad"
                            style={styles.amountInput}
                        />

                        <TouchableOpacity style={styles.amountPayBtn} onPress={handleSubmitPaymentAmount} activeOpacity={0.88}>
                            <Text style={styles.amountPayBtnText}>Pay now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={handleCloseSuccessModal}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="close" size={20} color="#4f4f4f"/>
                        </TouchableOpacity>
                        <View style={styles.modalIconWrap}>
                            <Ionicons name="checkmark" size={34} color="#fff"/>
                        </View>
                        <Text style={styles.modalTitle}>Payment successful</Text>
                        <Text style={styles.modalHint}>
                            Your payment of {formatUsd(paidAmount)} USD with {paymentMethod === 'momo' ? 'MoMo' : 'ZaloPay'} has been completed.
                        </Text>

                        <TouchableOpacity style={styles.homeBtn} onPress={handleGoHome} activeOpacity={0.88}>
                            <Ionicons name="home" size={18} color="#fff"/>
                            <Text style={styles.homeBtnText}>Back to Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    content: {
        paddingBottom: 110,
    },
    heroWrap: {
        marginHorizontal: 10,
        marginTop: 8,
        borderRadius: 24,
        overflow: 'hidden',
        height: 180,
        backgroundColor: '#ddd',
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
    },
    heroBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.88)',
    },
    cardTop: {
        marginTop: -30,
        marginHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 14,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    roomName: {
        fontSize: 38,
        lineHeight: 42,
        fontWeight: '800',
        color: '#181818',
    },
    hotelName: {
        fontSize: 17,
        color: '#8a8a8a',
        marginTop: 2,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    rating: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 4,
    },
    review: {
        fontSize: 16,
        color: '#9a9a9a',
        marginLeft: 4,
    },
    sectionCard: {
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 32,
        lineHeight: 36,
        fontWeight: '800',
        color: '#1f1f1f',
    },
    sectionHint: {
        fontSize: 14,
        color: '#8f8f8f',
        marginTop: 2,
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    label: {
        fontSize: 15,
        color: '#333',
    },
    value: {
        fontSize: 15,
        color: '#222',
        flex: 1,
        textAlign: 'right',
        marginLeft: 8,
    },
    labelBold: {
        fontSize: 15,
        color: '#222',
        fontWeight: '800',
    },
    valueBold: {
        fontSize: 15,
        color: '#222',
        fontWeight: '800',
        flex: 1,
        textAlign: 'right',
        marginLeft: 8,
    },
    serviceHint: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#d9d9d9',
        marginVertical: 6,
    },
    payItem: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#d9d9d9',
        paddingHorizontal: 10,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: '#fff',
    },
    payItemActive: {
        borderColor: '#8294FF',
        backgroundColor: '#eef0ff',
    },
    payBadgeWrap: {
        width: 34,
        height: 34,
        borderRadius: 8,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        backgroundColor: 'transparent',
    },
    payBadgeImage: {
        width: '100%',
        height: '100%',
    },
    payBadgeFallback: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    payBadgeFallbackText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    payLabel: {
        flex: 1,
        fontSize: 16,
        color: '#1f1f1f',
        fontWeight: '600',
    },
    confirmBtn: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
        backgroundColor: '#8294FF',
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#8294FF',
        shadowOpacity: 0.28,
        shadowRadius: 8,
        elevation: 5,
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '800',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 20,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 24,
        alignItems: 'center',
        position: 'relative',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    amountModalCard: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 20,
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 20,
        position: 'relative',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    amountModalTitle: {
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '800',
        color: '#1f1f1f',
    },
    amountModalHint: {
        marginTop: 8,
        fontSize: 13,
        lineHeight: 18,
        color: '#666',
        marginBottom: 12,
    },
    amountInput: {
        borderWidth: 1,
        borderColor: '#d2d2dd',
        borderRadius: 12,
        minHeight: 46,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#1f1f1f',
    },
    amountPayBtn: {
        marginTop: 12,
        borderRadius: 12,
        backgroundColor: '#8294FF',
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    amountPayBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f2f2f2',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalIconWrap: {
        width: 66,
        height: 66,
        borderRadius: 33,
        backgroundColor: '#33b26b',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        marginTop: 14,
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '800',
        color: '#1f1f1f',
        textAlign: 'center',
    },
    modalHint: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    homeBtn: {
        marginTop: 18,
        borderRadius: 999,
        backgroundColor: '#8294FF',
        paddingHorizontal: 18,
        paddingVertical: 11,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    homeBtnText: {
        marginLeft: 8,
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});