import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {normalizeBookingId} from '../../../utils/bookingId';
import {createMyBooking, fetchMyBookingDetail} from '../../../services/CustomerBookingService';
import {initiateMomoPayment, initiateZaloPayPayment, pollPaymentUntilConfirmed} from '../../../services/PaymentService';
import RemoteImage from '../../../components/common/RemoteImage';
import {formatPricingTierLabel} from '../../../utils/roomPricing';
import ScreenHeader from '../../../components/common/ScreenHeader';
import {navigateToCustomerHome} from '../../../utils/navigation';
import {formatVnd} from '../../../utils/formatCurrency';
import {normalizeSelectedServices} from '../../../utils/bookingCheckout';

WebBrowser.maybeCompleteAuthSession();

const PAYMENT_LOGOS = {
    momo: STAFF_MEDIA.MOMO_LOGO,
    zalo: STAFF_MEDIA.ZALOPAY_LOGO,
};

/**
 * CustomerPaymentScreen — thanh toan deposit MoMo/ZaloPay.
 *
 * - Neu co bookingDraft: tao booking PENDING luc bam Pay (UUID dung lam order_id)
 * - Neu co backendBookingId: resume tu tab Bookings (booking da tao truoc do)
 */
export default function CustomerPaymentScreen({navigation, route}) {
    const insets = useSafeAreaInsets();
    const {
        heroImage = '',
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
        bookingDraft = null,
        roomTypeId = null,
        pricingTier = '',
        branchId = null,
        rating = 0,
        reviews = 0,
    } = route?.params ?? {};

    const safeRating = Number.isFinite(rating) ? rating : 0;
    const safeReviews = Number.isFinite(reviews) ? reviews : 0;
    const shouldShowRating = safeRating > 0 || safeReviews > 0;

    const [paymentMethod, setPaymentMethod] = useState('momo');
    const [failedLogos, setFailedLogos] = useState({});
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPaying, setIsPaying] = useState(false);
    const [createdBookingUuid, setCreatedBookingUuid] = useState(String(backendBookingId || '').trim());
    const [createdBookingCode, setCreatedBookingCode] = useState(String(bookingId || '').trim());

    const paymentRows = useMemo(
        () => [
            {id: 'momo', label: 'Payment by momo', logo: PAYMENT_LOGOS.momo, fallbackText: 'MoMo', fallbackColor: '#b0006d'},
            {id: 'zalo', label: 'Payment by ZaloPay', logo: PAYMENT_LOGOS.zalo, fallbackText: 'ZP', fallbackColor: '#0a78c2'},
        ],
        []
    );

    const normalizedServices = useMemo(
        () => normalizeSelectedServices(selectedServices),
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
        return Math.round(Number(roomTotal || 0) * (pct / 100));
    }, [depositAmount, depositPercent, roomTotal]);

    const resolvedHoldMinutes = useMemo(() => {
        const explicit = Number(holdMinutes || 0);
        if (explicit > 0) return explicit;
        const duration = Math.max(1, Number(stayMinutes || 0));
        const pct = Math.max(20, Number(depositPercent || 20));
        return Math.max(1, Math.round(duration * (pct / 100)));
    }, [holdMinutes, stayMinutes, depositPercent]);

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

    const handleConfirmPayment = async () => {
        const amountToPay = resolvedDepositAmount;
        if (!amountToPay || amountToPay <= 0) {
            Alert.alert('Payment', 'Deposit amount is invalid. Go back and review your booking.');
            return;
        }
        if (!bookingDraft && !createdBookingUuid) {
            Alert.alert('Payment', 'Booking details are missing. Go back and try again.');
            return;
        }

        setIsPaying(true);
        try {
            let bookingUuid = createdBookingUuid;
            let bookingCode = createdBookingCode;

            if (!bookingUuid && bookingDraft) {
                const created = await createMyBooking({
                    branchId: bookingDraft.branchId,
                    hotelName: bookingDraft.hotelName,
                    hotelAddress: bookingDraft.hotelAddress,
                    roomType: bookingDraft.roomType,
                    roomTypeId: bookingDraft.roomTypeId,
                    guestName: bookingDraft.guestName,
                    email: bookingDraft.email,
                    phone: bookingDraft.phone,
                    checkInAt: bookingDraft.checkInAt,
                    expectedCheckOutAt: bookingDraft.expectedCheckOutAt,
                    serviceIds: bookingDraft.serviceIds || [],
                    depositPercentage: bookingDraft.depositPercentage || depositPercent,
                    specialRequests: bookingDraft.specialRequests || '',
                });
                if (created.status !== 'success' || !created.data?.id) {
                    Alert.alert('Booking', created.message || 'Unable to create your booking.');
                    return;
                }
                bookingUuid = String(created.data.id);
                bookingCode = String(created.data.bookingCode || created.data.booking_code || '');
                setCreatedBookingUuid(bookingUuid);
                setCreatedBookingCode(bookingCode);
            }

            const payload = buildPaymentPayload(amountToPay);
            payload.bookingId = bookingUuid;
            payload.bookingData.booking_id = bookingUuid;

            const gatewayResult = paymentMethod === 'zalo'
                ? await initiateZaloPayPayment(payload)
                : await initiateMomoPayment(payload);

            if (gatewayResult.status !== 'success') {
                Alert.alert('Payment', gatewayResult.message || 'Unable to start payment gateway.');
                return;
            }

            const payUrl = String(gatewayResult.data?.payUrl || '').trim();
            if (!payUrl) {
                Alert.alert('Payment', 'Payment gateway did not return a checkout URL. Please try again.');
                return;
            }

            await WebBrowser.openBrowserAsync(payUrl, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                showInRecents: true,
            });

            const pollResult = await pollPaymentUntilConfirmed(bookingUuid, {
                maxAttempts: 45,
                intervalMs: 2000,
            });

            if (pollResult.confirmed) {
                Alert.alert(
                    'Payment successful',
                    'Your deposit has been confirmed. Show QR at reception for check-in.',
                    [{text: 'Go to Home', onPress: () => navigateToCustomerHome(navigation)}]
                );
                return;
            }

            Alert.alert(
                'Verifying payment',
                'We are still confirming your payment with MoMo/ZaloPay. Check My bookings in a few minutes.',
                [{text: 'Go to Home', onPress: () => navigateToCustomerHome(navigation)}]
            );
        } catch {
            Alert.alert('Payment', 'Unable to process payment right now. Please try again.');
        } finally {
            setIsPaying(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            if (createdBookingUuid) {
                const res = await fetchMyBookingDetail(createdBookingUuid);
                if (res.status === 'success' && res.data) {
                    const row = res.data;
                    setCreatedBookingCode(String(row.bookingCode || row.booking_code || createdBookingCode));
                }
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
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
                    <RemoteImage uri={heroImage} style={styles.heroImage} resizeMode="cover"/>
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
                    {pricingTier ? (
                        <View style={styles.row}>
                            <Text style={styles.label}>Pricing tier:</Text>
                            <Text style={styles.value}>{formatPricingTierLabel(pricingTier)}</Text>
                        </View>
                    ) : null}
                    <View style={styles.row}><Text style={styles.label}>Room total:</Text><Text style={styles.value}>{formatVnd(roomTotal)}</Text></View>
                    <View style={styles.row}><Text style={styles.label}>Services total:</Text><Text style={styles.value}>{formatVnd(servicesTotal)}</Text></View>
                    {normalizedServices.length ? (
                        normalizedServices.map((service) => (
                            <Text key={service.id} style={styles.serviceHint}>• {service.name} ({formatVnd(service.price)})</Text>
                        ))
                    ) : null}
                    <View style={styles.divider}/>
                    <View style={styles.row}><Text style={styles.labelBold}>Subtotal:</Text><Text style={styles.valueBold}>{formatVnd(resolvedSubtotal)}</Text></View>
                    <View style={styles.row}><Text style={styles.labelBold}>Required deposit ({depositPercent}%):</Text><Text style={styles.valueBold}>{formatVnd(resolvedDepositAmount)}</Text></View>
                    <Text style={styles.holdSummary}>Room will be held for {resolvedHoldMinutes} minutes if you arrive late.</Text>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Payment method</Text>
                    <Text style={styles.sectionHint}>
                        You will be redirected to {paymentMethod === 'zalo' ? 'ZaloPay' : 'MoMo'} to complete the transfer
                    </Text>

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

            <View style={[styles.bottomBar, {paddingBottom: Math.max(insets.bottom, 12)}]}>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmPayment} disabled={isPaying}>
                    {isPaying ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.confirmBtnText}>
                            Pay with {paymentMethod === 'zalo' ? 'ZaloPay' : 'MoMo'} · {formatVnd(resolvedDepositAmount)}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

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
    modalOverlaySafe: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
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
    secondaryBtn: {
        marginTop: 10,
        paddingVertical: 10,
    },
    secondaryBtnText: {
        color: '#5b79df',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});