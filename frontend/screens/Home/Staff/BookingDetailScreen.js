import {useCallback, useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Calendar, ChevronLeft} from 'lucide-react-native';
import {
    addBookingExtraService,
    confirmCheckIn,
    fetchBookingDetails,
    processPaymentAndCheckOut,
} from '../../../services/ReceptionService';
import {QUICK_ADD_SERVICES, STAFF_MEDIA} from '../../../constants/staffMedia';
import {StaffUserAvatar} from '../../../components/staff/StaffUserAvatar';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {UI} from '../../../styles/uiTokens';

function formatVnd(amount) {
    return `${Number(amount).toLocaleString('vi-VN')} VND`;
}

function formatShortK(amount) {
    const n = Number(amount);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}m`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(n);
}

function SummaryRow({label, value, isFinal}) {
    return (
        <View style={styles.kvRow}>
            <Text style={styles.kvKey}>{label}</Text>
            <Text style={[styles.kvValue, isFinal && styles.kvValueFinal]} numberOfLines={2}>
                {value}
            </Text>
        </View>
    );
}

function MockBarcode() {
    return (
        <View style={styles.barcodeWrap}>
            {Array.from({length: 12}).map((_, i) => (
                <View
                    key={i}
                    style={[styles.barcodeLine, {width: i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 4}]}
                />
            ))}
        </View>
    );
}

function PaymentOption({icon, label, selected, onPress}) {
    return (
        <TouchableOpacity
            activeOpacity={0.85}
            onPress={onPress}
            style={[styles.payPill, selected && styles.payPillSelected]}
        >
            <View style={styles.payIconBox}>{icon}</View>
            <Text style={styles.payLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function AddServicesSection({onAdd, adding}) {
    return (
        <View style={styles.addServicesBlock}>
            <Text style={styles.addServicesTitle}>Add Services</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.addServicesRow}
            >
                {QUICK_ADD_SERVICES.map((service) => (
                    <TouchableOpacity
                        key={service.id}
                        activeOpacity={0.85}
                        disabled={adding}
                        onPress={() => onAdd(service.id)}
                        style={[styles.addServiceChip, adding && styles.addServiceChipDisabled]}
                    >
                        <Text style={styles.addServiceChipText}>
                            {service.emoji} {service.label} - {formatShortK(service.price)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

function ScreenHeader({navigation, booking, user}) {
    return (
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
                <ChevronLeft size={22} color="#334155" />
            </TouchableOpacity>
            <Image
                source={{uri: STAFF_MEDIA.BRANCH_LOGO}}
                style={styles.hotelLogo}
                resizeMode="cover"
            />
            <View style={styles.hotelInfo}>
                <Text style={styles.hotelName}>{booking.hotelName}</Text>
                <Text style={styles.hotelAddress} numberOfLines={2}>
                    {booking.hotelAddress}
                </Text>
            </View>
            <StaffUserAvatar user={user} size={40} style={{marginLeft: 8}} />
        </View>
    );
}

function PendingCheckInView({booking, onConfirm, processing}) {
    const room = booking.roomNumber || '—';

    return (
        <>
            <View style={styles.titleRow}>
                <Text style={styles.screenTitle}>Check-in</Text>
                <View style={styles.datePill}>
                    <Calendar size={14} color="#64748b" />
                    <Text style={styles.datePillText}>{booking.dateRangeLabel}</Text>
                </View>
            </View>

            <View style={styles.codeBar}>
                <Text style={styles.codeLabel}>
                    Code: <Text style={styles.codeValue}>{booking.bookingCode}</Text>
                </Text>
                <MockBarcode />
            </View>

            <View style={[styles.summaryCard, styles.summaryCardFlat]}>
                <Text style={styles.summaryTitle}>Reservation details</Text>
                <Text style={styles.summarySubtitle}>
                    Verify guest information before confirming check-in
                </Text>

                <SummaryRow label="Name:" value={booking.guestName} />
                <SummaryRow label="Email:" value={booking.email} />
                <SummaryRow label="Phone number:" value={booking.phone} />
                <SummaryRow label="Room:" value={`Room ${room}`} />
                <SummaryRow label="Planned check-in:" value={booking.checkInTime} />
                <SummaryRow label="Planned check-out:" value={booking.checkOutTime} />
                <SummaryRow label="Duration:" value={booking.duration} />
            </View>

            <TouchableOpacity
                activeOpacity={0.9}
                disabled={processing}
                onPress={onConfirm}
                style={[styles.primaryCta, processing && styles.primaryCtaDisabled]}
            >
                {processing ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <Text style={styles.primaryCtaText}>Confirm Check-in</Text>
                )}
            </TouchableOpacity>
        </>
    );
}

function CheckOutSummaryView({
    booking,
    paymentMethod,
    onSelectPayment,
    onCheckout,
    onAddService,
    addingService,
    processing,
}) {
    const bill = booking.checkoutBill || {};
    const room = booking.roomNumber || '—';
    const roomSubtotal = bill.roomSubtotal ?? booking.basePrice - (booking.discount || 0);
    const serviceTotal = bill.serviceTotal ?? 0;
    const subtotal = bill.subtotal ?? roomSubtotal + serviceTotal;
    const isCompleted = booking.status === 'CHECKED_OUT';
    const canAddServices = booking.status === 'CHECKED_IN';
    const extraItems = bill.extraServices || booking.extraServices || [];

    return (
        <>
            <View style={styles.titleRow}>
                <Text style={styles.screenTitle}>Check-out</Text>
                <View style={styles.datePill}>
                    <Calendar size={14} color="#64748b" />
                    <Text style={styles.datePillText}>{booking.dateRangeLabel}</Text>
                </View>
            </View>

            <View style={styles.codeBar}>
                <Text style={styles.codeLabel}>
                    Code: <Text style={styles.codeValue}>{booking.bookingCode}</Text>
                </Text>
                <MockBarcode />
            </View>

            <View style={styles.heroBlock}>
                <Image source={{uri: STAFF_MEDIA.ROOM_IMAGE}} style={styles.heroImage} resizeMode="cover" />
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Order summary</Text>
                    <Text style={styles.summarySubtitle}>
                        Check information order before payment
                    </Text>

                    <SummaryRow label="Name:" value={booking.guestName} />
                    <SummaryRow label="Email:" value={booking.email} />
                    <SummaryRow label="Phone number:" value={booking.phone} />
                    <SummaryRow label="Hotel:" value={booking.hotelName} />
                    <SummaryRow label="Room:" value={`Room ${room}`} />
                    <SummaryRow label="Check-in:" value={booking.checkInTime} />
                    <SummaryRow label="Check-out:" value={booking.checkOutTime} />
                    <SummaryRow label="Time:" value={booking.duration} />

                    {canAddServices ? (
                        <AddServicesSection onAdd={onAddService} adding={addingService} />
                    ) : null}

                    <View style={styles.divider} />

                    <SummaryRow label="Room charge:" value={formatVnd(roomSubtotal)} />
                    <SummaryRow label="Discount:" value={formatVnd(booking.discount)} />

                    {extraItems.map((item) => (
                        <SummaryRow
                            key={item.id}
                            label={`Extra: ${item.summary}`}
                            value={formatVnd(item.amount)}
                        />
                    ))}

                    {(bill.serviceOrders || []).map((order) => (
                        <SummaryRow
                            key={order.id}
                            label={`F&B: ${order.summary}`}
                            value={formatVnd(order.amount)}
                        />
                    ))}

                    {serviceTotal > 0 ? (
                        <SummaryRow label="Services total:" value={formatVnd(serviceTotal)} />
                    ) : null}

                    <View style={styles.divider} />

                    <SummaryRow label="Subtotal:" value={formatVnd(subtotal)} />
                    <SummaryRow label="VAT (10%):" value={formatVnd(bill.vat ?? booking.vat)} />
                    <SummaryRow label="Total Price:" value={formatVnd(bill.totalPrice ?? booking.totalPrice)} />
                    <SummaryRow
                        label="Deposit (20%):"
                        value={formatVnd(bill.deposit ?? booking.deposit)}
                    />
                    <SummaryRow
                        label="Final payment:"
                        value={formatVnd(bill.finalPayment ?? booking.finalPayment)}
                        isFinal
                    />
                </View>
            </View>

            {!isCompleted ? (
                <>
                    <Text style={styles.paymentTitle}>Payment method</Text>
                    <PaymentOption
                        selected={paymentMethod === 'momo'}
                        onPress={() => onSelectPayment('momo')}
                        icon={
                            <Image
                                source={{uri: STAFF_MEDIA.MOMO_LOGO}}
                                style={styles.payLogoImage}
                                resizeMode="contain"
                            />
                        }
                        label="Payment by momo"
                    />
                    <PaymentOption
                        selected={paymentMethod === 'zalopay'}
                        onPress={() => onSelectPayment('zalopay')}
                        icon={
                            <Image
                                source={{uri: STAFF_MEDIA.ZALOPAY_LOGO}}
                                style={styles.payLogoImage}
                                resizeMode="contain"
                            />
                        }
                        label="Payment by ZaloPay"
                    />
                    <PaymentOption
                        selected={paymentMethod === 'cash'}
                        onPress={() => onSelectPayment('cash')}
                        icon={
                            <View style={styles.cashIcon}>
                                <Text style={styles.cashIconText}>$</Text>
                            </View>
                        }
                        label="Pay in cash"
                    />

                    <TouchableOpacity
                        activeOpacity={0.9}
                        disabled={processing || !paymentMethod}
                        onPress={onCheckout}
                        style={[
                            styles.primaryCta,
                            (!paymentMethod || processing) && styles.primaryCtaDisabled,
                        ]}
                    >
                        {processing ? (
                            <ActivityIndicator color="#ffffff" />
                        ) : (
                            <Text style={styles.primaryCtaText}>Process Payment & Check-out</Text>
                        )}
                    </TouchableOpacity>
                </>
            ) : (
                <View style={styles.completedBanner}>
                    <Text style={styles.completedText}>
                        Checked out · Paid via {String(booking.paymentMethod)}
                    </Text>
                </View>
            )}
        </>
    );
}

export default function BookingDetailScreen({navigation, route}) {
    const {bookingId} = route.params || {};
    const {user} = useStaffSession();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('momo');
    const [processing, setProcessing] = useState(false);
    const [addingService, setAddingService] = useState(false);

    const loadBooking = useCallback(async () => {
        if (!bookingId) {
            setLoadError('Missing booking reference.');
            setBooking(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setLoadError(null);
        const result = await fetchBookingDetails(bookingId);
        if (result.status === 'success' && result.data) {
            setBooking(result.data);
        } else {
            setBooking(null);
            setLoadError(result.message || 'Unable to load booking details.');
        }
        setLoading(false);
    }, [bookingId]);

    useEffect(() => {
        loadBooking();
    }, [loadBooking]);

    const handleConfirmCheckIn = () => {
        Alert.alert('Confirm check-in', 'Register this guest as checked in? No payment is collected yet.', [
            {text: 'Cancel', style: 'cancel'},
            {
                text: 'Confirm',
                onPress: async () => {
                    setProcessing(true);
                    const result = await confirmCheckIn(bookingId);
                    setProcessing(false);
                    if (result.status === 'success') {
                        setBooking(result.data);
                        Alert.alert('Checked in', result.message || 'Guest is now in-house.');
                        return;
                    }
                    Alert.alert('Check-in failed', result.message || 'Please try again.');
                },
            },
        ]);
    };

    const handleAddService = async (serviceKey) => {
        setAddingService(true);
        const result = await addBookingExtraService(bookingId, serviceKey);
        setAddingService(false);
        if (result.status === 'success') {
            setBooking(result.data);
            return;
        }
        Alert.alert('Unable to add service', result.message || 'Please try again.');
    };

    const handleCheckout = () => {
        if (!paymentMethod) {
            Alert.alert('Payment required', 'Please select a payment method.');
            return;
        }

        Alert.alert(
            'Process payment & check-out',
            `Collect ${formatVnd(booking?.checkoutBill?.finalPayment ?? booking?.finalPayment)} via ${paymentMethod}?`,
            [
                {text: 'Cancel', style: 'cancel'},
                {
                    text: 'Confirm',
                    onPress: async () => {
                        setProcessing(true);
                        const result = await processPaymentAndCheckOut(bookingId, paymentMethod);
                        setProcessing(false);
                        if (result.status === 'success') {
                            Alert.alert(
                                'Success',
                                result.message || 'Checkout complete.',
                                [{text: 'OK', onPress: () => navigation.goBack()}]
                            );
                            return;
                        }
                        Alert.alert('Checkout failed', result.message || 'Please try again.');
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#8294FF" />
                </View>
            </SafeAreaView>
        );
    }

    if (loadError || !booking) {
        return (
            <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
                <View style={styles.centered}>
                    <Text style={styles.errorText}>{loadError || 'Booking not found.'}</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>Go back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const isPending = booking.status === 'PENDING';
    const isCheckoutPhase = booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT';

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <ScreenHeader navigation={navigation} booking={booking} user={user} />

                {isPending ? (
                    <PendingCheckInView
                        booking={booking}
                        onConfirm={handleConfirmCheckIn}
                        processing={processing}
                    />
                ) : null}

                {isCheckoutPhase ? (
                    <CheckOutSummaryView
                        booking={booking}
                        paymentMethod={paymentMethod}
                        onSelectPayment={setPaymentMethod}
                        onCheckout={handleCheckout}
                        onAddService={handleAddService}
                        addingService={addingService}
                        processing={processing}
                    />
                ) : null}
            </ScrollView>

            <Modal visible={processing && !isPending} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.overlayCard}>
                        <ActivityIndicator size="large" color="#8294FF" />
                        <Text style={styles.overlayText}>Processing payment…</Text>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: UI.screenBg,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    errorText: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#8294FF',
        borderRadius: 12,
    },
    retryBtnText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 32,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 16,
    },
    backBtn: {
        marginRight: 8,
        padding: 2,
    },
    hotelLogo: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    hotelInfo: {
        flex: 1,
        minWidth: 0,
    },
    hotelName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8294FF',
    },
    hotelAddress: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 2,
        lineHeight: 15,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    screenTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f172a',
    },
    datePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    datePillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    codeBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 16,
    },
    codeLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    codeValue: {
        fontWeight: '700',
        color: '#334155',
    },
    barcodeWrap: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
        height: 28,
        paddingHorizontal: 4,
        backgroundColor: '#ffffff',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    barcodeLine: {
        backgroundColor: '#1e293b',
        height: '100%',
        borderRadius: 1,
    },
    heroBlock: {
        marginBottom: 24,
    },
    heroImage: {
        width: '100%',
        height: 150,
        borderRadius: 16,
        backgroundColor: '#cbd5e1',
    },
    summaryCard: {
        marginTop: -36,
        marginHorizontal: 4,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 22,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 8},
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 5,
    },
    summaryCardFlat: {
        marginTop: 0,
        marginHorizontal: 0,
        marginBottom: 20,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 4,
    },
    summarySubtitle: {
        fontSize: 12,
        color: '#94a3b8',
        marginBottom: 16,
    },
    kvRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 6,
        gap: 12,
    },
    kvKey: {
        fontSize: 14,
        color: '#94a3b8',
        flexShrink: 0,
    },
    kvValue: {
        fontSize: 14,
        color: '#0f172a',
        fontWeight: '500',
        textAlign: 'right',
        flex: 1,
    },
    kvValueFinal: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    divider: {
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        marginTop: 8,
        marginBottom: 4,
    },
    paymentTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 12,
    },
    payPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    payPillSelected: {
        borderColor: '#8294FF',
        backgroundColor: '#f8faff',
    },
    payIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        backgroundColor: '#f8fafc',
        overflow: 'hidden',
    },
    payLogoImage: {
        width: 32,
        height: 32,
    },
    payLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#334155',
    },
    cashIcon: {
        backgroundColor: '#0f172a',
        borderRadius: 20,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cashIconText: {color: '#ffffff', fontSize: 18, fontWeight: '700'},
    addServicesBlock: {
        marginTop: 8,
        marginBottom: 4,
    },
    addServicesTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 10,
    },
    addServicesRow: {
        gap: 10,
        paddingRight: 8,
    },
    addServiceChip: {
        backgroundColor: '#f1f5f9',
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    addServiceChipDisabled: {
        opacity: 0.5,
    },
    addServiceChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155',
    },
    primaryCta: {
        backgroundColor: '#8294FF',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        minHeight: 52,
    },
    primaryCtaDisabled: {
        opacity: 0.65,
    },
    primaryCtaText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    completedBanner: {
        backgroundColor: '#dcfce7',
        borderRadius: 12,
        padding: 14,
        marginTop: 8,
    },
    completedText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#166534',
        textAlign: 'center',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlayCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingVertical: 28,
        paddingHorizontal: 36,
        alignItems: 'center',
        minWidth: 200,
    },
    overlayText: {
        marginTop: 14,
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
});
