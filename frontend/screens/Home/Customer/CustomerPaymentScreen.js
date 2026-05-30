import React, {useCallback, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {confirmBookingPayment, createMyBooking, fetchMyBookingDetail} from '../../../services/CustomerBookingService';
import RemoteImage from '../../../components/common/RemoteImage';
import {formatPricingTierLabel} from '../../../utils/roomPricing';
import ScreenHeader from '../../../components/common/ScreenHeader';
import {navigateToCustomerHome} from '../../../utils/navigation';
import {formatVnd} from '../../../utils/formatCurrency';
import {normalizeSelectedServices} from '../../../utils/bookingCheckout';

const PAYMENT_HOLD_MINUTES = 10;

const PAYMENT_LOGOS = {
    momo: STAFF_MEDIA.MOMO_LOGO,
    zalo: STAFF_MEDIA.ZALOPAY_LOGO,
};

const resolveWalletMethod = (method) => (method === 'zalo' ? 'zalopay' : 'momo');

/**
 * Luong: quote -> Payment -> tao booking PENDING (giu cho 10 phut) -> Pay (xac nhan ngay nhu cash) -> CONFIRMED.
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
    const [pendingBookingId, setPendingBookingId] = useState(String(backendBookingId || '').trim());
    const [createdBookingCode, setCreatedBookingCode] = useState(String(bookingId || '').trim());
    const [liveDepositAmount, setLiveDepositAmount] = useState(0);

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
        if (liveDepositAmount > 0) return liveDepositAmount;
        const explicit = Number(depositAmount || 0);
        if (explicit > 0) return explicit;
        const pct = Math.max(20, Number(depositPercent || 20));
        return Math.round(Number(roomTotal || 0) * (pct / 100));
    }, [liveDepositAmount, depositAmount, depositPercent, roomTotal]);

    const markLogoFailed = (id) => {
        setFailedLogos((prev) => ({...prev, [id]: true}));
    };

    const finishPaymentAndGoHome = useCallback((title, message) => {
        navigateToCustomerHome(navigation);
        if (message) {
            setTimeout(() => {
                Alert.alert(title, message, [{text: 'OK', onPress: () => navigateToCustomerHome(navigation)}]);
            }, 350);
        }
    }, [navigation]);

    const ensurePendingBooking = useCallback(async () => {
        const existingId = String(pendingBookingId || '').trim();
        if (existingId) {
            return {ok: true, bookingId: existingId, bookingCode: createdBookingCode};
        }
        if (!bookingDraft) {
            return {ok: false, message: 'Booking details are missing. Go back and try again.'};
        }

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
            return {ok: false, message: created.message || 'Unable to create your booking hold.'};
        }

        const bookingUuid = String(created.data.id);
        const bookingCode = String(created.data.booking_code || '');
        const serverDeposit = Number(created.data.deposit_amount || 0);
        if (serverDeposit > 0) {
            setLiveDepositAmount(serverDeposit);
        }
        setPendingBookingId(bookingUuid);
        setCreatedBookingCode(bookingCode);
        return {ok: true, bookingId: bookingUuid, bookingCode};
    }, [bookingDraft, createdBookingCode, depositPercent, pendingBookingId]);

    const handleConfirmPayment = async () => {
        const amountToPay = resolvedDepositAmount;
        if (!amountToPay || amountToPay <= 0) {
            Alert.alert('Payment', 'Deposit amount is invalid. Go back and review your booking.');
            return;
        }

        setIsPaying(true);
        try {
            const hold = await ensurePendingBooking();
            if (!hold.ok) {
                Alert.alert('Booking', hold.message || 'Unable to hold this room.');
                return;
            }

            const walletMethod = resolveWalletMethod(paymentMethod);
            const confirmRes = await confirmBookingPayment(hold.bookingId, {
                amount: amountToPay,
                payment_method: walletMethod,
            });

            if (confirmRes.status !== 'success') {
                Alert.alert('Payment', confirmRes.message || 'Payment could not be confirmed.');
                return;
            }

            const code = String(confirmRes.data?.booking_code || hold.bookingCode || createdBookingCode || '').trim();
            const status = String(confirmRes.data?.status || '').toUpperCase();
            if (status && status !== 'CONFIRMED') {
                Alert.alert('Payment', 'Payment was recorded but booking is not confirmed yet. Check the Booking tab.');
                return;
            }

            finishPaymentAndGoHome(
                'Payment successful',
                code
                    ? `Your deposit has been paid. Booking ${code} is confirmed — view details in the Booking tab.`
                    : 'Your deposit has been paid. Your booking is confirmed — view details in the Booking tab.'
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
            const bookingUuid = String(pendingBookingId || '').trim();
            if (!bookingUuid) return;
            const res = await fetchMyBookingDetail(bookingUuid);
            if (res.status === 'success' && res.data) {
                setCreatedBookingCode(String(res.data.booking_code || createdBookingCode));
                if (String(res.data.status || '').toUpperCase() === 'CONFIRMED') {
                    const refreshedCode = String(res.data.booking_code || createdBookingCode || '').trim();
                    finishPaymentAndGoHome(
                        'Payment successful',
                        refreshedCode
                            ? `Booking ${refreshedCode} is confirmed. View details in the Booking tab.`
                            : 'Your booking is confirmed. View details in the Booking tab.'
                    );
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
                    <Text style={styles.holdSummary}>
                        Complete payment within {PAYMENT_HOLD_MINUTES} minutes to keep this room reserved. Unpaid holds are cancelled automatically.
                    </Text>
                </View>

                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Payment method</Text>
                    <Text style={styles.sectionHint}>
                        Tap Pay to confirm with {paymentMethod === 'zalo' ? 'ZaloPay' : 'MoMo'} (instant demo payment)
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
});
