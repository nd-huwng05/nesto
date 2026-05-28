import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Image, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import {SafeAreaView} from 'react-native-safe-area-context';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {getSession} from '../../../utils/authStorage';
import {normalizeBookingId} from '../../../utils/bookingId';
import {pushCustomerNotification} from '../../../services/NotificationService';
import {initiateMomoPayment, initiateZaloPayPayment} from '../../../services/PaymentService';
import ScreenHeader from '../../../components/common/ScreenHeader';
import {formatVnd} from '../../../utils/formatCurrency';

WebBrowser.maybeCompleteAuthSession();

const PAYMENT_LOGOS = {
    momo: STAFF_MEDIA.MOMO_LOGO,
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
    const {
        heroImage = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?fit=crop&w=1400&q=80&fm=jpg',
        hotelName = '',
        roomName = '',
        checkIn = '',
        checkOut = '',
        checkInDateIso = '',
        checkOutDateIso = '',
        name = '',
        email = '',
        phone = 'N/A',
        totalAmount = 0,
        subtotalAmount = 0,
        depositAmount = 0,
        depositPercent = 20,
        holdMinutes = 0,
        stayMinutes = 0,
        roomTotal = 0,
        servicesTotal = 0,
        stayTimeLabel = '',
        selectedServices = [],
        bookingId = null,
        backendBookingId = null,
        branchId = null,
        rating = 0,
        reviews = 0,
    } = route?.params ?? {};

    const safeRating = Number.isFinite(rating) ? rating : 0;
    const safeReviews = Number.isFinite(reviews) ? reviews : 0;
    const shouldShowRating = safeRating > 0 || safeReviews > 0;

    const [paymentMethod, setPaymentMethod] = useState('momo');
    const [failedLogos, setFailedLogos] = useState({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [paidAmount, setPaidAmount] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPaying, setIsPaying] = useState(false);

    const paymentRows = useMemo(
        () => [
            {id: 'momo', label: 'Payment by momo', logo: PAYMENT_LOGOS.momo, fallbackText: 'MoMo', fallbackColor: '#b0006d'},
            {id: 'zalo', label: 'Payment by ZaloPay', logo: PAYMENT_LOGOS.zalo, fallbackText: 'ZP', fallbackColor: '#0a78c2'},
        ],
        []
    );

    const normalizedServices = useMemo(
        () => (Array.isArray(selectedServices) ? selectedServices.filter((item) => item && item.id) : []),
        [selectedServices]
    );

    const resolvedSubtotal = useMemo(() => {
        const explicit = Number(subtotalAmount || totalAmount || 0);
        if (explicit > 0) return explicit;
        return Number(roomTotal || 0) + Number(servicesTotal || 0);
    }, [subtotalAmount, totalAmount, roomTotal, servicesTotal]);

    const resolvedDepositAmount = useMemo(() => {
        const explicit = Number(depositAmount || 0);
        if (explicit > 0) return explicit;
        const pct = Math.max(20, Number(depositPercent || 20));
        return Math.round(resolvedSubtotal * (pct / 100));
    }, [depositAmount, depositPercent, resolvedSubtotal]);

    const resolvedHoldMinutes = useMemo(() => {
        const explicit = Number(holdMinutes || 0);
        if (explicit > 0) return explicit;
        const duration = Math.max(1, Number(stayMinutes || 0));
        const pct = Math.max(20, Number(depositPercent || 20));
        return Math.max(1, Math.round(duration * (pct / 100)));
    }, [holdMinutes, stayMinutes, depositPercent]);

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

    const buildPaymentPayload = (amountToPay) => ({
        bookingId: normalizeBookingId(bookingId) || String(backendBookingId || ''),
        bookingData: {
            booking_id: normalizeBookingId(bookingId) || String(backendBookingId || ''),
            branch_id: branchId,
            hotel_name: hotelName,
            room_name: roomName,
            check_in: checkIn,
            check_out: checkOut,
            total_amount: resolvedSubtotal,
            room_total: Number(roomTotal || 0),
            services_total: Number(servicesTotal || 0),
            deposit_amount: amountToPay,
            hold_minutes: resolvedHoldMinutes,
        },
        selectedServices: normalizedServices,
        depositPercentage: Math.max(20, Number(depositPercent || 20)),
        amount: amountToPay,
        orderInfo: `Nesto ${hotelName} - ${roomName}`,
    });

    const handleProcessPayment = async (amountToPay) => {
        try {
            const session = await getSession();
            const sessionUser = session?.user || {};
            const customerName = String(sessionUser?.name || sessionUser?.full_name || name || 'N/A').trim() || 'N/A';
            const customerEmail = String(sessionUser?.email || email || '').trim().toLowerCase();
            const customerPhone = String(sessionUser?.phone || phone || 'N/A').trim() || 'N/A';
            const paidAt = new Date().toISOString();
            const normalizedBookingId = normalizeBookingId(bookingId);
            const safeBookingId = normalizedBookingId || String(backendBookingId || '').trim();
            const upcomingCheckIn = resolveUpcomingDateLabel(checkInDateIso, checkIn);
            const upcomingCheckOut = resolveUpcomingDateLabel(checkOutDateIso, checkOut);
            const remainingAmount = Math.max(0, resolvedSubtotal - amountToPay);
            const invoiceDetails = {
                subtotalAmount: resolvedSubtotal,
                roomTotal: Number(roomTotal || 0),
                servicesTotal: Number(servicesTotal || 0),
                totalAmount: resolvedSubtotal,
                depositAmount: resolvedDepositAmount,
                depositPercent: Math.max(20, Number(depositPercent || 20)),
                holdMinutes: resolvedHoldMinutes,
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
                totalAmount: resolvedSubtotal,
                depositAmount: resolvedDepositAmount,
                payableServiceTotal: Number(servicesTotal || 0),
                subtotalPrice: resolvedSubtotal,
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
                totalAmount: resolvedSubtotal,
                depositAmount: resolvedDepositAmount,
                payableServiceTotal: Number(servicesTotal || 0),
                subtotalPrice: resolvedSubtotal,
                selectedServices: normalizedServices,
                selectedService: normalizedServices[0] || null,
                remainingAmount,
                invoiceDetails,
            };

            const paymentStatusText = remainingAmount > 0
                ? `prepaid ${formatVnd(amountToPay)}, remaining ${formatVnd(remainingAmount)}`
                : `paid in full ${formatVnd(amountToPay)}`;

            await pushCustomerNotification({
                title: 'Booking payment confirmed',
                type: 'booking-payment',
                message: `You booked room ${roomName} (Booking ID ${safeBookingId}). ${paymentStatusText}. Check-in ${upcomingCheckIn}, check-out ${upcomingCheckOut}. Late hold: ${resolvedHoldMinutes} minutes.`,
                meta: {
                    bookingId: safeBookingId,
                    hotelName,
                    roomName,
                    checkIn: upcomingCheckIn,
                    checkOut: upcomingCheckOut,
                    amount: amountToPay,
                    remainingAmount,
                    holdMinutes: resolvedHoldMinutes,
                },
            });

            await pushCustomerNotification({
                title: 'Payment recorded',
                type: 'payment',
                message: `You paid invoice for Booking ID ${safeBookingId} with ${paymentMethod === 'zalo' ? 'ZaloPay' : 'MoMo'}: ${formatVnd(amountToPay)}.`,
                meta: {
                    bookingId: safeBookingId,
                    paymentMethod,
                    amount: amountToPay,
                },
            });

            void bookedItem;
            void historyItem;
        } catch (error) {
            Alert.alert('Payment error', 'Unable to process payment right now. Please try again.');
        }
    };

    const handleConfirmPayment = async () => {
        const amountToPay = resolvedDepositAmount;
        if (!amountToPay || amountToPay <= 0) {
            Alert.alert('Payment', 'Deposit amount is invalid. Go back and review your booking.');
            return;
        }

        setIsPaying(true);
        try {
            const payload = buildPaymentPayload(amountToPay);
            const gatewayResult = paymentMethod === 'zalo'
                ? await initiateZaloPayPayment(payload)
                : await initiateMomoPayment(payload);

            if (gatewayResult.status !== 'success' || !gatewayResult.data?.payUrl) {
                Alert.alert('Payment', gatewayResult.message || 'Unable to start payment gateway.');
                return;
            }

            const browserResult = await WebBrowser.openBrowserAsync(gatewayResult.data.payUrl);
            if (browserResult.type === 'cancel') {
                Alert.alert('Payment cancelled', 'You closed the payment page before completing checkout.');
                return;
            }

            setPaidAmount(amountToPay);
            await handleProcessPayment(amountToPay);
            setShowSuccessModal(true);
        } catch {
            Alert.alert('Payment', 'Unable to process payment right now. Please try again.');
        } finally {
            setIsPaying(false);
        }
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
        setIsRefreshing(false);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <ScreenHeader onBack={() => navigation.goBack()} title="Payment" />
            <ScrollView
                style={styles.scroll}
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
                <View style={styles.heroWrap}>
                    <Image source={{uri: heroImage}} style={styles.heroImage} resizeMode="cover"/>
                </View>

                <View style={styles.cardTop}>
                    <Text style={styles.roomName}>{roomName}</Text>
                    <Text style={styles.hotelName}>{hotelName}</Text>
                    {shouldShowRating ? (
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={16} color="#f5c51a"/>
                            {safeRating > 0 ? <Text style={styles.rating}>{safeRating.toFixed(1)}</Text> : null}
                            {safeReviews > 0 ? <Text style={styles.review}>{`${safeRating > 0 ? '• ' : ''}${safeReviews} Reviews`}</Text> : null}
                        </View>
                    ) : null}
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
                    {stayTimeLabel ? <View style={styles.row}><Text style={styles.label}>Stay:</Text><Text style={styles.value}>{stayTimeLabel}</Text></View> : null}
                    <View style={styles.row}><Text style={styles.label}>Room total:</Text><Text style={styles.value}>{formatVnd(roomTotal)}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Services total:</Text><Text style={styles.value}>{formatVnd(servicesTotal)}</Text></View>
                    <View style={styles.divider}/>
                    <View style={styles.row}><Text style={styles.labelBold}>Subtotal:</Text><Text style={styles.valueBold}>{formatVnd(resolvedSubtotal)}</Text></View>
                    <View style={styles.row}><Text style={styles.labelBold}>Required deposit ({depositPercent}%):</Text><Text style={styles.valueBold}>{formatVnd(resolvedDepositAmount)}</Text></View>
                    <Text style={styles.holdSummary}>Room will be held for {resolvedHoldMinutes} minutes if you arrive late.</Text>
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

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmPayment} disabled={isPaying}>
                {isPaying ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.confirmBtnText}>Confirm payment · {formatVnd(resolvedDepositAmount)}</Text>
                )}
            </TouchableOpacity>

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
                            Your payment of {formatVnd(paidAmount)} with {paymentMethod === 'momo' ? 'MoMo' : 'ZaloPay'} has been completed.
                        </Text>

                        <TouchableOpacity style={styles.homeBtn} onPress={handleGoHome} activeOpacity={0.88}>
                            <Ionicons name="home" size={18} color="#fff"/>
                            <Text style={styles.homeBtnText}>Back to Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    scroll: {
        flex: 1,
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
        fontSize: 24,
        lineHeight: 28,
        fontWeight: '700',
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
        fontSize: 18,
        lineHeight: 22,
        fontWeight: '600',
        color: '#1f1f1f',
    },
    sectionHint: {
        fontSize: 14,
        color: '#8f8f8f',
        marginTop: 2,
        marginBottom: 8,
    },
    holdSummary: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 20,
        color: '#374151',
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