import {useCallback, useEffect, useMemo, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Calendar, ChevronLeft, ChevronRight} from 'lucide-react-native';
import {
    assignRoomAndCheckIn,
    confirmCheckIn,
    fetchAvailableRoomsForSwitch,
    fetchBookingDetails,
    processPaymentAndCheckOut,
    switchBookingRoom,
} from '../../../services/ReceptionService';
import {StaffUserAvatar} from '../../../components/staff/StaffUserAvatar';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {UI} from '../../../styles/uiTokens';
import {calculateOvertimeCharge, computeCheckoutTotals} from '../../../utils/staffOvertimeBilling';

function formatVnd(amount) {
    return `${Number(amount).toLocaleString('en-US')} VND`;
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

function OvertimeSummaryRow({hoursLabel, amount}) {
    if (!amount || amount <= 0) return null;

    return (
        <View style={styles.kvRow}>
            <Text style={styles.overtimeKey}>Overtime Surcharge ({hoursLabel})</Text>
            <Text style={styles.overtimeValue}>{formatVnd(amount)}</Text>
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

function buildNetworkUri(rawUri) {
    const value = String(rawUri || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    const base = String(process.env.EXPO_PUBLIC_API_URL || '').replace(/\/api\/v1\/?$/, '');
    return base ? `${base}${value.startsWith('/') ? value : `/${value}`}` : value;
}

function ScreenHeader({navigation, booking, user}) {
    return (
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
                <ChevronLeft size={22} color="#334155" />
            </TouchableOpacity>
            {booking?.hotelLogo ? (
                <Image
                    source={{uri: buildNetworkUri(booking.hotelLogo)}}
                    style={styles.hotelLogo}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.hotelLogo, styles.hotelLogoFallback]}>
                    <Text style={styles.hotelLogoFallbackText}>
                        {String(booking?.hotelName || 'H').trim().charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}
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

function PendingCheckInView({
    booking,
    onConfirm,
    onAssignAndCheckIn,
    onChangeRoom,
    processing,
}) {
    const isUnassigned = booking.isUnassigned || !booking.roomNumber;
    const roomType = booking.roomType || '—';

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
                <View style={styles.roomAssignRow}>
                    <View style={styles.roomAssignBody}>
                        <Text style={styles.kvKey}>Room:</Text>
                        {isUnassigned ? (
                            <Text style={styles.roomAssignValue}>
                                Unassigned (Type: {roomType})
                            </Text>
                        ) : (
                            <Text style={styles.roomAssignValue}>Room {booking.roomNumber}</Text>
                        )}
                        {booking.originalRoomNumber ? (
                            <Text style={styles.roomSwitchedNote}>
                                Originally Room {booking.originalRoomNumber}
                            </Text>
                        ) : null}
                        {booking.roomChangeNote ? (
                            <Text style={styles.roomSwitchedNote}>{booking.roomChangeNote}</Text>
                        ) : null}
                    </View>
                    {!isUnassigned ? (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={onChangeRoom}
                            style={styles.changeRoomBtn}
                        >
                            <Text style={styles.changeRoomBtnText}>Change Room / Temp Room</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
                <SummaryRow label="Planned check-in:" value={booking.checkInTime} />
                <SummaryRow label="Planned check-out:" value={booking.checkOutTime} />
                <SummaryRow label="Duration:" value={booking.duration} />
            </View>

            <TouchableOpacity
                activeOpacity={0.9}
                disabled={processing}
                onPress={isUnassigned ? onAssignAndCheckIn : onConfirm}
                style={[styles.primaryCta, processing && styles.primaryCtaDisabled]}
            >
                {processing ? (
                    <ActivityIndicator color="#ffffff" />
                ) : (
                    <Text style={styles.primaryCtaText}>
                        {isUnassigned ? 'Assign Room & Check-in' : 'Confirm Check-in'}
                    </Text>
                )}
            </TouchableOpacity>
        </>
    );
}

function CheckOutSummaryView({
    booking,
    navigation,
    paymentMethod,
    onSelectPayment,
    onCheckout,
    onChangeRoom,
    processing,
}) {
    const bill = booking.checkoutBill || {};
    const room = booking.roomNumber || '—';
    const roomSubtotal = bill.roomSubtotal ?? booking.basePrice - (booking.discount || 0);
    const serviceTotal = bill.serviceTotal ?? 0;
    const isCompleted = booking.status === 'CHECKED_OUT';
    const canAddServices = booking.status === 'CHECKED_IN';
    const extraItems = bill.extraServices || booking.extraServices || [];

    const [overtimeTick, setOvertimeTick] = useState(0);

    useEffect(() => {
        if (booking.status !== 'CHECKED_IN') return undefined;
        const id = setInterval(() => setOvertimeTick((t) => t + 1), 30000);
        return () => clearInterval(id);
    }, [booking.status]);

    const overtime = useMemo(() => {
        if (booking.status === 'CHECKED_OUT') {
            return {
                hours: bill.overtimeHours ?? 0,
                amount: bill.overtimeSurcharge ?? 0,
                hoursLabel: bill.overtimeHoursLabel || '',
            };
        }
        if (booking.status === 'CHECKED_IN') {
            return calculateOvertimeCharge(booking, new Date());
        }
        return {hours: 0, amount: 0, hoursLabel: ''};
    }, [booking, bill, overtimeTick]);

    const totals = useMemo(
        () =>
            computeCheckoutTotals({
                roomSubtotal,
                serviceTotal,
                overtimeAmount: overtime.amount,
            }),
        [roomSubtotal, serviceTotal, overtime.amount]
    );

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
                {booking?.roomImage ? (
                    <Image source={{uri: buildNetworkUri(booking.roomImage)}} style={styles.heroImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.heroImage, styles.heroImageFallback]}>
                        <Text style={styles.heroImageFallbackText}>Room {room}</Text>
                    </View>
                )}
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
                    {booking.roomChangeNote ? (
                        <View style={styles.roomChangeBanner}>
                            <Text style={styles.roomChangeBannerText}>{booking.roomChangeNote}</Text>
                        </View>
                    ) : null}
                    {booking.originalRoomNumber ? (
                        <Text style={styles.roomSwitchedNote}>
                            Originally Room {booking.originalRoomNumber}
                        </Text>
                    ) : null}
                    {canAddServices ? (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={onChangeRoom}
                            style={[styles.changeRoomBtn, {marginTop: 4, marginBottom: 8}]}
                        >
                            <Text style={styles.changeRoomBtnText}>Change Room / Temp Room</Text>
                        </TouchableOpacity>
                    ) : null}
                    <SummaryRow label="Check-in:" value={booking.checkInTime} />
                    <SummaryRow label="Check-out:" value={booking.checkOutTime} />
                    <SummaryRow label="Time:" value={booking.duration} />

                    <View style={styles.divider} />

                    <SummaryRow label="Room charge:" value={formatVnd(roomSubtotal)} />
                    <OvertimeSummaryRow
                        hoursLabel={overtime.hoursLabel}
                        amount={overtime.amount}
                    />
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

                    <SummaryRow label="Subtotal:" value={formatVnd(totals.subtotal)} />
                    <SummaryRow label="VAT (10%):" value={formatVnd(totals.vat)} />
                    <SummaryRow label="Total Price:" value={formatVnd(totals.totalPrice)} />
                    <SummaryRow label="Deposit (20%):" value={formatVnd(totals.deposit)} />
                    <SummaryRow label="Final payment:" value={formatVnd(totals.finalPayment)} isFinal />
                </View>
            </View>

            {canAddServices ? (
                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() =>
                        navigation.navigate('StaffAddServiceScreen', {bookingId: booking.id})
                    }
                    style={styles.addServiceBtn}
                >
                    <Text style={styles.addServiceBtnText}>+ Add Service</Text>
                </TouchableOpacity>
            ) : null}

            {!isCompleted ? (
                <>
                    <Text style={styles.paymentTitle}>Payment method</Text>
                    <PaymentOption
                        selected={paymentMethod === 'momo'}
                        onPress={() => onSelectPayment('momo')}
                        icon={
                            <View style={styles.walletIconMomo}>
                                <Text style={styles.walletIconText}>M</Text>
                            </View>
                        }
                        label="Payment by momo"
                    />
                    <PaymentOption
                        selected={paymentMethod === 'zalopay'}
                        onPress={() => onSelectPayment('zalopay')}
                        icon={
                            <View style={styles.walletIconZalo}>
                                <Text style={styles.walletIconText}>Z</Text>
                            </View>
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

function RoomSwitchModal({
    visible,
    rooms,
    loading,
    currentRoomNumber,
    mode,
    roomType,
    onSelect,
    onClose,
}) {
    const insets = useSafeAreaInsets();
    const isAssign = mode === 'assign';

    const renderRoomRow = ({item: room}) => {
        const isCurrent = String(room.roomNumber) === String(currentRoomNumber);

        return (
            <TouchableOpacity
                activeOpacity={0.85}
                disabled={isCurrent}
                onPress={() => onSelect(room)}
                style={[styles.roomSheetRow, isCurrent && styles.roomSheetRowDisabled]}
            >
                <View style={styles.roomSheetRowLeft}>
                    <Text style={styles.roomSheetRowTitle}>Room {room.roomNumber}</Text>
                    <Text style={styles.roomSheetRowMeta}>
                        {room.type} · {room.feature}
                    </Text>
                </View>
                {isCurrent ? (
                    <Text style={styles.roomSheetCurrentLabel}>Current</Text>
                ) : (
                    <View style={styles.roomSheetSelectBtn}>
                        <Text style={styles.roomSheetSelectText}>Select</Text>
                        <ChevronRight size={16} color="#8294FF" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.roomModalOverlay}>
                <TouchableOpacity
                    style={styles.roomModalBackdrop}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View
                    style={[
                        styles.roomModalSheet,
                        {paddingBottom: Math.max(insets.bottom, 16)},
                    ]}
                >
                    <View style={styles.roomSheetHandle} />

                    <View style={styles.roomSheetHeader}>
                        <Text style={styles.roomModalTitle}>
                            {isAssign ? 'Assign physical room' : 'Select clean room'}
                        </Text>
                        <Text style={styles.roomModalSubtitle}>
                            {isAssign
                                ? `Only clean, ready ${roomType || ''} rooms are shown`
                                : `Only clean, ready ${roomType || ''} rooms · same category`}
                        </Text>
                    </View>

                    {loading ? (
                        <View style={styles.roomSheetLoading}>
                            <ActivityIndicator size="large" color="#8294FF" />
                        </View>
                    ) : (
                        <FlatList
                            data={rooms}
                            keyExtractor={(item) => item.id}
                            renderItem={renderRoomRow}
                            style={styles.roomSheetList}
                            contentContainerStyle={
                                rooms.length === 0 ? styles.roomSheetListEmpty : undefined
                            }
                            showsVerticalScrollIndicator
                            ListEmptyComponent={
                                <Text style={styles.roomModalEmpty}>
                                    No clean, available {roomType || ''} rooms right now. Dirty,
                                    cleaning, and occupied rooms are not shown.
                                </Text>
                            }
                        />
                    )}

                    <TouchableOpacity onPress={onClose} style={styles.roomModalCancel}>
                        <Text style={styles.roomModalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export default function BookingDetailScreen({navigation, route}) {
    const {bookingId} = route.params || {};
    const {user, branchId} = useStaffSession();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('momo');
    const [processing, setProcessing] = useState(false);
    const [roomModalVisible, setRoomModalVisible] = useState(false);
    const [roomModalMode, setRoomModalMode] = useState('switch');
    const [switchRooms, setSwitchRooms] = useState([]);
    const [loadingSwitchRooms, setLoadingSwitchRooms] = useState(false);
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

    useFocusEffect(
        useCallback(() => {
            loadBooking();
        }, [loadBooking])
    );

    const openRoomPicker = async (mode) => {
        if (!branchId || !booking) return;
        setRoomModalMode(mode);
        setRoomModalVisible(true);
        setLoadingSwitchRooms(true);
        const result = await fetchAvailableRoomsForSwitch(branchId, booking.roomType);
        setLoadingSwitchRooms(false);
        if (result.status === 'success') {
            setSwitchRooms(result.data || []);
            return;
        }
        Alert.alert('Unable to load rooms', result.message || 'Please try again.');
        setRoomModalVisible(false);
    };

    const handleOpenRoomSwitch = () => openRoomPicker('switch');
    const handleOpenAssign = () => openRoomPicker('assign');

    const handleSelectRoom = async (room) => {
        setRoomModalVisible(false);
        setProcessing(true);

        if (roomModalMode === 'assign') {
            const result = await assignRoomAndCheckIn(bookingId, room.id);
            setProcessing(false);
            if (result.status === 'success' && result.data) {
                setBooking(result.data);
                Alert.alert('Checked in', result.message || `Room ${room.roomNumber} assigned.`);
                return;
            }
            Alert.alert('Check-in failed', result.message || 'Please try again.');
            return;
        }

        const result = await switchBookingRoom(bookingId, room.id);
        setProcessing(false);
        if (result.status === 'success' && result.data) {
            setBooking(result.data);
            Alert.alert('Room updated', result.data.roomChangeNote || `Room ${room.roomNumber}.`);
            return;
        }
        Alert.alert('Room change failed', result.message || 'Please try again.');
    };

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

    const resolveCheckoutFinalPayment = () => {
        const bill = booking?.checkoutBill || {};
        const roomSubtotal = bill.roomSubtotal ?? booking.basePrice - (booking.discount || 0);
        const serviceTotal = bill.serviceTotal ?? 0;
        const overtime = calculateOvertimeCharge(booking, new Date());
        return computeCheckoutTotals({
            roomSubtotal,
            serviceTotal,
            overtimeAmount: overtime.amount,
        }).finalPayment;
    };

    const handleCheckout = () => {
        if (!paymentMethod) {
            Alert.alert('Payment required', 'Please select a payment method.');
            return;
        }

        const amountDue = resolveCheckoutFinalPayment();

        Alert.alert(
            'Process payment & check-out',
            `Collect ${formatVnd(amountDue)} via ${paymentMethod}?`,
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
                        onAssignAndCheckIn={handleOpenAssign}
                        onChangeRoom={handleOpenRoomSwitch}
                        processing={processing}
                    />
                ) : null}

                {isCheckoutPhase ? (
                    <CheckOutSummaryView
                        booking={booking}
                        navigation={navigation}
                        paymentMethod={paymentMethod}
                        onSelectPayment={setPaymentMethod}
                        onCheckout={handleCheckout}
                        onChangeRoom={handleOpenRoomSwitch}
                        processing={processing}
                    />
                ) : null}
            </ScrollView>

            <RoomSwitchModal
                visible={roomModalVisible}
                rooms={switchRooms}
                loading={loadingSwitchRooms}
                currentRoomNumber={booking?.roomNumber}
                mode={roomModalMode}
                roomType={booking?.roomType}
                onSelect={handleSelectRoom}
                onClose={() => setRoomModalVisible(false)}
            />

            <Modal visible={processing && !isPending && !roomModalVisible} transparent animationType="fade">
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
    hotelLogoFallback: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e2e8f0',
    },
    hotelLogoFallbackText: {
        color: '#334155',
        fontSize: 18,
        fontWeight: '700',
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
    heroImageFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroImageFallbackText: {
        color: '#334155',
        fontSize: 20,
        fontWeight: '700',
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
    overtimeKey: {
        fontSize: 14,
        color: '#ea580c',
        fontWeight: '700',
        flexShrink: 0,
    },
    overtimeValue: {
        fontSize: 14,
        color: '#ea580c',
        fontWeight: '700',
        textAlign: 'right',
        flex: 1,
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
        width: 24,
        height: 24,
        borderRadius: 4,
    },
    walletIconMomo: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#db2777',
        alignItems: 'center',
        justifyContent: 'center',
    },
    walletIconZalo: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#2563eb',
        alignItems: 'center',
        justifyContent: 'center',
    },
    walletIconText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
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
    addServiceBtn: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#8294FF',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 20,
    },
    addServiceBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#8294FF',
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
    roomAssignRow: {
        paddingVertical: 8,
        gap: 10,
    },
    roomAssignBody: {
        gap: 4,
    },
    roomAssignValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0f172a',
    },
    roomChangeBanner: {
        backgroundColor: '#eef2ff',
        borderRadius: 10,
        padding: 10,
        marginTop: 8,
        marginBottom: 4,
    },
    roomChangeBannerText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#4338ca',
    },
    roomSwitchedNote: {
        fontSize: 12,
        color: '#8294FF',
        fontWeight: '600',
    },
    changeRoomBtn: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#8294FF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#f8faff',
    },
    changeRoomBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#8294FF',
    },
    roomModalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    roomModalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    roomModalSheet: {
        height: '50%',
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 8,
        shadowColor: '#0f172a',
        shadowOffset: {width: 0, height: -8},
        shadowOpacity: 0.18,
        shadowRadius: 24,
        elevation: 24,
    },
    roomSheetHandle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#cbd5e1',
        marginBottom: 16,
    },
    roomSheetHeader: {
        marginBottom: 8,
    },
    roomModalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
    },
    roomModalSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
        lineHeight: 18,
    },
    roomSheetLoading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roomSheetList: {
        flex: 1,
    },
    roomSheetListEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    roomModalEmpty: {
        textAlign: 'center',
        color: '#94a3b8',
        paddingVertical: 24,
        paddingHorizontal: 12,
        fontSize: 14,
        lineHeight: 20,
    },
    roomSheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        minHeight: 72,
    },
    roomSheetRowDisabled: {
        opacity: 0.5,
    },
    roomSheetRowLeft: {
        flex: 1,
        minWidth: 0,
        paddingRight: 12,
    },
    roomSheetRowTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    roomSheetRowMeta: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 4,
    },
    roomSheetSelectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#eef2ff',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    roomSheetSelectText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8294FF',
    },
    roomSheetCurrentLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94a3b8',
    },
    roomModalCancel: {
        paddingTop: 12,
        paddingBottom: 4,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        marginTop: 4,
    },
    roomModalCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748b',
    },
});
