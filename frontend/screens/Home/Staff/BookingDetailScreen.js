import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import BookingQrCode from '../../../components/booking/BookingQrCode';
import {
    assignRoomAndCheckIn,
    cancelStaffBooking,
    confirmCheckIn,
    fetchAvailableRoomsForSwitch,
    fetchBookingDetails,
    fetchFinalBill,
    fetchLiveBill,
    processPaymentAndCheckOut,
    reassignBookingRoom,
    switchBookingRoom,
} from '../../../services/ReceptionService';
import {normalizeStaffBooking} from '../../../utils/staffBookingMapper';
import {connectBookingLiveBill, connectBookingUpdates} from '../../../services/WebSocketService';
import {isBookingWsPayload, isLiveBillWsEvent, mergeWsPayloadIntoStaffBooking} from '../../../utils/liveBill';
import {StaffUserAvatar} from '../../../components/staff/StaffUserAvatar';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {UI} from '../../../styles/uiTokens';
import {calculateOvertimeCharge, computeCheckoutTotals} from '../../../utils/staffOvertimeBilling';
import {getRoomStatusLabel, patchRoomListWithStatus} from '../../../utils/roomStatus';
import {useStaffRoomLive} from '../../../contexts/StaffRoomLiveContext';

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

function BookingQrStrip({bookingId}) {
    return (
        <View style={styles.barcodeWrap}>
            <BookingQrCode bookingId={bookingId} size={56} />
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

import { resolveMediaUrl } from '../../../utils/mediaUrl';

function buildNetworkUri(rawUri) {
    return resolveMediaUrl(rawUri);
}

function ScreenHeader({navigation, booking, user}) {
    const hotelLogo = booking?.hotel_logo || booking?.hero_image || booking?.hotelLogo;
    const hotelAddress = booking?.hotel_address || booking?.hotelAddress || '';

    return (
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
                <ChevronLeft size={22} color="#334155" />
            </TouchableOpacity>
            {hotelLogo ? (
                <Image
                    source={{uri: buildNetworkUri(hotelLogo)}}
                    style={styles.hotelLogo}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.hotelLogo, styles.hotelLogoFallback]}>
                    <Text style={styles.hotelLogoFallbackText}>
                        {String(booking?.hotel_name || booking?.hotelName || 'H').trim().charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}
            <View style={styles.hotelInfo}>
                <Text style={styles.hotelName} numberOfLines={1}>
                    {booking?.hotel_name || booking?.hotelName || 'Hotel'}
                </Text>
                <Text style={styles.hotelAddress} numberOfLines={2}>
                    {hotelAddress}
                </Text>
            </View>
            <StaffUserAvatar user={user} size={40} style={styles.headerAvatar} />
        </View>
    );
}

function PendingCheckInView({
    booking,
    onConfirm,
    onAssignAndCheckIn,
    onChangeRoom,
    onCancel,
    processing,
}) {
    const isUnassigned = booking.is_unassigned || !booking.room_number;
    const roomType = booking.room_type || '—';
    const roomCharge = Number(booking.room_total || booking.room_price || booking.base_price || 0);
    const depositPaid = Number(booking.deposit_amount || 0);

    return (
        <>
            <Text style={styles.screenTitle}>Check-in</Text>
            {booking.date_range_label ? (
                <View style={styles.datePill}>
                    <Calendar size={14} color="#8294FF" />
                    <Text style={styles.datePillText} numberOfLines={2}>
                        {booking.date_range_label}
                    </Text>
                </View>
            ) : null}

            <View style={styles.codeBar}>
                <View style={styles.codeBarText}>
                    <Text style={styles.codeLabel}>Booking code</Text>
                    <Text style={styles.codeValue}>{booking.booking_code}</Text>
                </View>
                <BookingQrStrip bookingId={booking.id || booking.bookingId} />
            </View>

            <View style={[styles.summaryCard, styles.summaryCardFlat]}>
                <Text style={styles.summaryTitle}>Reservation details</Text>
                <Text style={styles.summarySubtitle}>
                    Verify guest details, then assign a room of the booked type.
                </Text>

                <SummaryRow label="Name:" value={booking.guest_name} />
                <SummaryRow label="Email:" value={booking.email} />
                <SummaryRow label="Phone number:" value={booking.phone} />
                <SummaryRow label="Room type:" value={roomType} />
                <View style={styles.roomAssignRow}>
                    <View style={styles.roomAssignBody}>
                        <Text style={styles.kvKey}>Assigned room:</Text>
                        {isUnassigned ? (
                            <Text style={styles.roomAssignPending}>Not assigned yet</Text>
                        ) : (
                            <Text style={styles.roomAssignValue}>Room {booking.room_number}</Text>
                        )}
                        {booking.original_room_number ? (
                            <Text style={styles.roomSwitchedNote}>
                                Originally Room {booking.original_room_number}
                            </Text>
                        ) : null}
                        {booking.room_change_note ? (
                            <Text style={styles.roomSwitchedNote}>{booking.room_change_note}</Text>
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
                <SummaryRow label="Planned check-in:" value={booking.check_in_time || '—'} />
                <SummaryRow label="Planned check-out:" value={booking.check_out_time || '—'} />
                <SummaryRow label="Duration:" value={booking.duration || '—'} />
                {roomCharge > 0 ? (
                    <SummaryRow label="Room charge:" value={formatVnd(roomCharge)} />
                ) : null}
                {depositPaid > 0 ? (
                    <SummaryRow label="Deposit paid:" value={formatVnd(depositPaid)} />
                ) : null}
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

            {onCancel ? (
                <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={processing}
                    onPress={onCancel}
                    style={styles.cancelBookingBtn}
                >
                    <Text style={styles.cancelBookingBtnText}>Cancel booking</Text>
                </TouchableOpacity>
            ) : null}
        </>
    );
}

function formatOvertimeLabel(finalBill, fallbackLabel) {
    const lateMinutes = Number(finalBill?.lateMinutes || 0);
    if (lateMinutes > 0) {
        const blocks = Number(finalBill?.penaltyBlocks || Math.ceil(lateMinutes / 15));
        return `${blocks} × 15 min late`;
    }
    return fallbackLabel || '';
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
    const bill = booking.checkout_bill || {};
    const final_bill = booking.final_bill || {};
    const room = booking.room_number || '—';
    const roomSubtotal =
        final_bill.room_total ??
        booking.room_total ??
        bill.room_subtotal ??
        Math.max(0, (booking.total_amount || 0) - (booking.discount || 0));
    const serviceTotal = final_bill.services_total ?? booking.services_total ?? bill.service_total ?? 0;
    const depositPaid = final_bill.deposit_paid ?? final_bill.deposit_amount ?? 0;
    const depositPct = final_bill.deposit_percentage ?? booking.deposit_percentage ?? 0;
    const isCompleted = booking.status === 'CHECKED_OUT';
    const canAddServices = booking.status === 'CHECKED_IN';
    const extraItems = booking.line_items || bill.line_items || [];

    const overtimeAmount = useMemo(() => {
        if (booking.overtime_charge != null) {
            return Number(booking.overtime_charge) || 0;
        }
        if (final_bill.overtime_charge != null) {
            return Number(final_bill.overtime_charge) || 0;
        }
        if (booking.status === 'CHECKED_OUT') {
            return Number(bill.overtime_surcharge) || 0;
        }
        if (booking.status === 'CHECKED_IN') {
            return calculateOvertimeCharge(booking, new Date()).amount;
        }
        return 0;
    }, [booking, bill, final_bill]);

    const overtimeLabel = useMemo(() => {
        if (overtimeAmount <= 0) return '';
        return formatOvertimeLabel(final_bill, calculateOvertimeCharge(booking, new Date()).hoursLabel);
    }, [booking, final_bill, overtimeAmount]);

    const totals = useMemo(
        () =>
            computeCheckoutTotals({
                roomSubtotal,
                serviceTotal,
                overtimeAmount,
                depositPaid,
            }),
        [roomSubtotal, serviceTotal, overtimeAmount, depositPaid]
    );

    return (
        <>
            <View style={styles.titleRow}>
                <Text style={styles.screenTitle}>Check-out</Text>
                <View style={styles.datePill}>
                    <Calendar size={14} color="#64748b" />
                    <Text style={styles.datePillText}>{booking.date_range_label}</Text>
                </View>
            </View>

            <View style={styles.codeBar}>
                <Text style={styles.codeLabel}>
                    Code: <Text style={styles.codeValue}>{booking.booking_code}</Text>
                </Text>
                <BookingQrStrip bookingId={booking.id || booking.bookingId} />
            </View>

            <View style={styles.heroBlock}>
                {booking?.roomImage ? (
                    <Image source={{uri: buildNetworkUri(booking.room_image)}} style={styles.heroImage} resizeMode="cover" />
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

                    <SummaryRow label="Name:" value={booking.guest_name} />
                    <SummaryRow label="Email:" value={booking.email} />
                    <SummaryRow label="Phone number:" value={booking.phone} />
                    <SummaryRow label="Hotel:" value={booking.hotel_name} />
                    <SummaryRow label="Room:" value={`Room ${room}`} />
                    {booking.room_change_note ? (
                        <View style={styles.roomChangeBanner}>
                            <Text style={styles.roomChangeBannerText}>{booking.room_change_note}</Text>
                        </View>
                    ) : null}
                    {booking.original_room_number ? (
                        <Text style={styles.roomSwitchedNote}>
                            Originally Room {booking.original_room_number}
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
                    <SummaryRow label="Check-in:" value={booking.check_in_time} />
                    <SummaryRow label="Check-out:" value={booking.check_out_time} />
                    <SummaryRow label="Time:" value={booking.duration} />

                    <View style={styles.divider} />

                    <SummaryRow label="Room charge:" value={formatVnd(roomSubtotal)} />
                    <OvertimeSummaryRow hoursLabel={overtimeLabel} amount={overtimeAmount} />
                    <SummaryRow label="Discount:" value={formatVnd(booking.discount)} />

                    {extraItems.map((item) => (
                        <SummaryRow
                            key={item.id}
                            label={`Extra: ${item.summary}`}
                            value={formatVnd(item.amount)}
                        />
                    ))}

                    {(bill.line_items || []).map((order) => (
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

                    <SummaryRow label="Subtotal (room + services + overtime):" value={formatVnd(totals.grossTotal)} />
                    <SummaryRow
                        label={`Deposit paid${depositPct ? ` (${depositPct}%)` : ''}:`}
                        value={formatVnd(totals.depositPaid)}
                    />
                    <SummaryRow label="Amount due at checkout:" value={formatVnd(totals.finalPayment)} isFinal />
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
                        Checked out · Paid via {String(booking.payment_method)}
                    </Text>
                </View>
            )}
        </>
    );
}

function getRoomPickerStatusStyle(status) {
    const key = String(status || '').toUpperCase();
    if (key === 'AVAILABLE') {
        return {badge: styles.roomStatusBadgeGreen, text: styles.roomStatusBadgeTextGreen};
    }
    if (key === 'DIRTY' || key === 'CLEANING') {
        return {badge: styles.roomStatusBadgeYellow, text: styles.roomStatusBadgeTextYellow};
    }
    return {badge: styles.roomStatusBadgeRed, text: styles.roomStatusBadgeTextRed};
}

function RoomSwitchModal({
    visible,
    rooms,
    loading,
    busy,
    currentRoomNumber,
    mode,
    roomType,
    onSelect,
    onClose,
}) {
    const insets = useSafeAreaInsets();
    const isAssign = mode === 'assign';
    const isBusy = Boolean(busy);

    const renderRoomRow = ({item: room}) => {
        const roomNumber = room.roomNumber || room.room_number || '';
        const roomTypeLabel = room.type || room.roomType || roomType || '';
        const isCurrent = String(roomNumber) === String(currentRoomNumber);
        const selectable = room.selectable !== false && !isCurrent && !isBusy;
        const statusLabel = room.statusLabel || getRoomStatusLabel(room.status);
        const statusStyle = getRoomPickerStatusStyle(room.status);
        const floorLabel = room.feature && !String(room.feature).includes(statusLabel) ? room.feature : '';

        return (
            <TouchableOpacity
                activeOpacity={selectable ? 0.85 : 1}
                disabled={!selectable}
                onPress={() => onSelect(room)}
                style={[
                    styles.roomSheetRow,
                    (isCurrent || !selectable) && styles.roomSheetRowDisabled,
                ]}
            >
                <View style={styles.roomSheetRowLeft}>
                    <Text style={styles.roomSheetRowTitle}>Room {roomNumber || '—'}</Text>
                    <Text style={styles.roomSheetRowMeta}>
                        {roomTypeLabel}
                        {floorLabel ? ` · ${floorLabel}` : ''}
                    </Text>
                </View>
                {isCurrent ? (
                    <Text style={styles.roomSheetCurrentLabel}>Current</Text>
                ) : selectable ? (
                    <View style={styles.roomSheetSelectBtn}>
                        <Text style={styles.roomSheetSelectText}>Select</Text>
                        <ChevronRight size={16} color="#8294FF" />
                    </View>
                ) : (
                    <View style={[styles.roomStatusBadge, statusStyle.badge]}>
                        <Text style={[styles.roomStatusBadgeText, statusStyle.text]}>{statusLabel}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={isBusy ? undefined : onClose}
        >
            <View style={styles.roomModalOverlay}>
                <TouchableOpacity
                    style={styles.roomModalBackdrop}
                    activeOpacity={1}
                    disabled={isBusy}
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
                                ? `Only available ${roomType || ''} rooms can be assigned. Occupied rooms are in use; dirty rooms need housekeeping.`
                                : `Switch to an available ${roomType || ''} room. Occupied and dirty rooms cannot be selected.`}
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
                                    No {roomType || ''} rooms found for this branch.
                                </Text>
                            }
                        />
                    )}

                    <TouchableOpacity
                        onPress={onClose}
                        disabled={isBusy}
                        style={[styles.roomModalCancel, isBusy && styles.roomModalCancelDisabled]}
                    >
                        <Text style={styles.roomModalCancelText}>Cancel</Text>
                    </TouchableOpacity>

                    {isBusy ? (
                        <View style={styles.roomSheetBusyOverlay} pointerEvents="auto">
                            <ActivityIndicator size="large" color="#8294FF" />
                            <Text style={styles.roomSheetBusyText}>
                                {isAssign ? 'Assigning room…' : 'Updating room…'}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </Modal>
    );
}

export default function BookingDetailScreen({navigation, route}) {
    const {bookingId} = route.params || {};
    const {user, branchId} = useStaffSession();
    const {subscribe} = useStaffRoomLive();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('momo');
    const [processing, setProcessing] = useState(false);
    const [roomModalVisible, setRoomModalVisible] = useState(false);
    const [roomModalMode, setRoomModalMode] = useState('switch');
    const [switchRooms, setSwitchRooms] = useState([]);
    const [loadingSwitchRooms, setLoadingSwitchRooms] = useState(false);
    const [roomPickerBusy, setRoomPickerBusy] = useState(false);
    const hasLoadedBookingRef = useRef(false);
    const loadBooking = useCallback(async ({silent = false} = {}) => {
        if (!bookingId) {
            setLoadError('Missing booking reference.');
            setBooking(null);
            setLoading(false);
            hasLoadedBookingRef.current = false;
            return;
        }
        if (!silent) {
            setLoading(true);
        }
        setLoadError(null);
        const result = await fetchBookingDetails(bookingId);
        if (result.status === 'success' && result.data) {
            setBooking(normalizeStaffBooking(result.data));
            hasLoadedBookingRef.current = true;
        } else if (!silent || !hasLoadedBookingRef.current) {
            setBooking(null);
            setLoadError(result.message || 'Unable to load booking details.');
            hasLoadedBookingRef.current = false;
        }
        if (!silent) {
            setLoading(false);
        }
    }, [bookingId]);

    const refreshLiveBill = useCallback(async () => {
        if (!bookingId || booking?.status !== 'CHECKED_IN') return;
        const result = await fetchLiveBill(bookingId);
        if (result.status === 'success' && result.data) {
            setBooking((prev) => {
                if (!prev) return prev;
                const live = result.data;
                return {
                    ...prev,
                    room_total: live.room_total ?? prev.room_total,
                    services_total: live.services_total ?? prev.services_total,
                    subtotal: live.subtotal ?? prev.subtotal,
                    overtime_charge: live.overtime_charge ?? prev.overtime_charge,
                    late_minutes: live.late_minutes ?? prev.late_minutes,
                    is_overtime: live.is_overtime ?? prev.is_overtime,
                    total_amount: live.total_amount ?? prev.total_amount,
                    final_bill: live.final_bill ?? prev.final_bill,
                    line_items: live.line_items ?? prev.line_items,
                };
            });
        }
    }, [bookingId, booking?.status]);

    useFocusEffect(
        useCallback(() => {
            let mounted = true;
            let disconnectWs = () => {};

            const bootstrap = async () => {
                try {
                    await loadBooking({silent: hasLoadedBookingRef.current});
                    if (!mounted || !bookingId) return;
                    const token = (await AsyncStorage.getItem('access_token')) || '';
                    if (!token) return;

                    const handleBillPayload = (payload) => {
                        if (!isLiveBillWsEvent(payload)) return;
                        if (!isBookingWsPayload(payload, bookingId)) return;
                        setBooking((prev) => mergeWsPayloadIntoStaffBooking(prev, payload));
                    };

                    const disconnectBill = await connectBookingLiveBill(bookingId, {
                        token,
                        onMessage: handleBillPayload,
                        onMaxRetries: () => {
                            refreshLiveBill().catch(() => {});
                        },
                    });

                    let disconnectBranch = () => {};
                    if (branchId) {
                        disconnectBranch = await connectBookingUpdates(branchId, {
                            token,
                            onMessage: handleBillPayload,
                        });
                    }

                    disconnectWs = () => {
                        disconnectBill?.();
                        disconnectBranch?.();
                    };
                } catch (error) {
                    console.error('Live updates unavailable:', error?.message || error);
                }
            };

            bootstrap();
            return () => {
                mounted = false;
                disconnectWs?.();
            };
        }, [loadBooking, branchId, bookingId])
    );

    useEffect(() => {
        if (!roomModalVisible) return undefined;
        return subscribe((payload) => {
            setSwitchRooms((prev) => patchRoomListWithStatus(prev, payload));
        });
    }, [roomModalVisible, subscribe]);

    const openRoomPicker = async (mode) => {
        if (!branchId || !booking) return;
        setRoomModalMode(mode);
        setRoomModalVisible(true);
        setLoadingSwitchRooms(true);
        const result = await fetchAvailableRoomsForSwitch(branchId, booking.room_type, bookingId);
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
        if (roomPickerBusy) return;
        if (room?.selectable === false) {
            Alert.alert(
                'Room unavailable',
                `${room.statusLabel || getRoomStatusLabel(room.status)} — this room cannot be selected right now.`
            );
            return;
        }

        setRoomPickerBusy(true);
        try {
            if (roomModalMode === 'assign') {
                const result = await assignRoomAndCheckIn(bookingId, room.id);
                if (result.status === 'success' && result.data) {
                    setBooking(normalizeStaffBooking(result.data));
                    setRoomModalVisible(false);
                    return;
                }
                Alert.alert('Check-in failed', result.message || 'Please try again.');
                return;
            }

            const isPreCheckIn =
                booking.status === 'PENDING' || booking.status === 'CONFIRMED';
            const result = isPreCheckIn
                ? await reassignBookingRoom(bookingId, room.id)
                : await switchBookingRoom(bookingId, room.id);
            if (result.status === 'success' && result.data) {
                setBooking(normalizeStaffBooking(result.data));
                setRoomModalVisible(false);
                return;
            }
            Alert.alert('Room change failed', result.message || 'Please try again.');
        } catch (error) {
            Alert.alert('Error', error?.message || 'Something went wrong. Please try again.');
        } finally {
            setRoomPickerBusy(false);
        }
    };

    const handleConfirmCheckIn = () => {
        Alert.alert('Confirm check-in', 'Register this guest as checked in? No payment is collected yet.', [
            {text: 'Cancel', style: 'cancel'},
            {
                text: 'Confirm',
                onPress: async () => {
                    setProcessing(true);
                    try {
                        const result = await confirmCheckIn(bookingId);
                        if (result.status === 'success' && result.data) {
                            setBooking(normalizeStaffBooking(result.data));
                            return;
                        }
                        Alert.alert('Check-in failed', result.message || 'Please try again.');
                    } catch (error) {
                        Alert.alert('Error', error?.message || 'Something went wrong. Please try again.');
                    } finally {
                        setProcessing(false);
                    }
                },
            },
        ]);
    };

    const handleCancelBooking = () => {
        Alert.alert(
            'Cancel booking',
            'This will cancel the reservation and notify the guest. Continue?',
            [
                {text: 'Keep booking', style: 'cancel'},
                {
                    text: 'Cancel booking',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessing(true);
                        const result = await cancelStaffBooking(bookingId, 'Cancelled by reception');
                        setProcessing(false);
                        if (result.status === 'success' && result.data) {
                            setBooking(normalizeStaffBooking(result.data));
                            Alert.alert('Booking cancelled', 'The reservation has been cancelled.');
                            return;
                        }
                        Alert.alert('Cancel failed', result.message || 'Please try again.');
                    },
                },
            ]
        );
    };

    const resolveCheckoutFinalPayment = () => {
        const fb = booking?.final_bill;
        if (fb?.amount_due != null) {
            return Number(fb.amount_due) || 0;
        }
        const bill = booking?.checkout_bill || {};
        const roomSubtotal = bill.room_subtotal ?? booking.total_amount ?? 0;
        const serviceTotal = bill.service_total ?? 0;
        const overtime = calculateOvertimeCharge(booking, new Date());
        return computeCheckoutTotals({
            roomSubtotal,
            serviceTotal,
            overtimeAmount: overtime.amount,
            depositPaid: fb?.deposit_paid ?? fb?.deposit_amount ?? 0,
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
                        let checkoutAmount = amountDue;
                        const billResult = await fetchFinalBill(bookingId);
                        if (billResult.status === 'success' && billResult.data) {
                            setBooking((prev) =>
                                prev ? {...prev, final_bill: billResult.data} : prev
                            );
                            if (billResult.data.amountDue != null) {
                                checkoutAmount = Number(billResult.data.amountDue) || 0;
                            }
                        } else if (billResult.status === 'error') {
                            setProcessing(false);
                            Alert.alert(
                                'Bill unavailable',
                                billResult.message || 'Could not load final bill. Try again.'
                            );
                            return;
                        }
                        const result = await processPaymentAndCheckOut(
                            bookingId,
                            paymentMethod,
                            checkoutAmount
                        );
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

    useEffect(() => {
        if (booking?.status !== 'CHECKED_IN' || !bookingId) return undefined;
        const id = setInterval(() => {
            refreshLiveBill();
        }, 30000);
        return () => clearInterval(id);
    }, [booking?.status, bookingId, refreshLiveBill]);

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
                    <TouchableOpacity onPress={loadBooking} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.retryBtn, {marginTop: 8}]}>
                        <Text style={styles.retryBtnText}>Go back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const isCancelled =
        booking.status === 'CANCELLED' || booking.status === 'CANCELLED_NO_SHOW';
    const isCheckInPhase =
        !isCancelled && (booking.status === 'PENDING' || booking.status === 'CONFIRMED');
    const isCheckoutPhase =
        !isCancelled && (booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT');

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <ScreenHeader navigation={navigation} booking={booking} user={user} />

                {isCancelled ? (
                    <View style={styles.cancelledCard}>
                        <Text style={styles.cancelledTitle}>
                            {booking.status === 'CANCELLED_NO_SHOW' ? 'No-show' : 'Cancelled'}
                        </Text>
                        <Text style={styles.cancelledBody}>
                            This booking cannot be checked in or checked out.
                        </Text>
                    </View>
                ) : null}

                {isCheckInPhase ? (
                    <PendingCheckInView
                        booking={booking}
                        onConfirm={handleConfirmCheckIn}
                        onAssignAndCheckIn={handleOpenAssign}
                        onChangeRoom={handleOpenRoomSwitch}
                        onCancel={handleCancelBooking}
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
                busy={roomPickerBusy}
                currentRoomNumber={booking?.room_number || booking?.roomNumber}
                mode={roomModalMode}
                roomType={booking?.room_type || booking?.roomType}
                onSelect={handleSelectRoom}
                onClose={() => {
                    if (roomPickerBusy) return;
                    setRoomModalVisible(false);
                }}
            />

            {processing && !roomModalVisible ? (
                <View style={styles.processingOverlay} pointerEvents="auto">
                    <View style={styles.overlayCard}>
                        <ActivityIndicator size="large" color="#8294FF" />
                        <Text style={styles.overlayText}>
                            {isCheckInPhase ? 'Updating booking…' : 'Processing payment…'}
                        </Text>
                    </View>
                </View>
            ) : null}
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
    cancelledCard: {
        marginTop: 16,
        padding: 16,
        borderRadius: 14,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
    },
    cancelledTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#991b1b',
    },
    cancelledBody: {
        marginTop: 6,
        fontSize: 14,
        color: '#7f1d1d',
        lineHeight: 20,
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
    headerAvatar: {
        marginLeft: 8,
        flexShrink: 0,
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
        marginBottom: 8,
    },
    datePill: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        alignSelf: 'stretch',
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
        marginBottom: 12,
    },
    datePillText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
        lineHeight: 18,
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
        gap: 12,
    },
    codeBarText: {
        flex: 1,
        minWidth: 0,
    },
    codeLabel: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '600',
        marginBottom: 2,
    },
    codeValue: {
        fontWeight: '700',
        color: '#334155',
        fontSize: 14,
    },
    barcodeWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        flexShrink: 0,
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
    cancelBookingBtn: {
        marginTop: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#fecaca',
        backgroundColor: '#fff5f5',
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelBookingBtnText: {
        color: '#dc2626',
        fontFamily: 'SF-SemiBold',
        fontSize: 14,
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
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 30,
        elevation: 30,
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
    roomAssignPending: {
        fontSize: 15,
        fontWeight: '600',
        color: '#8294FF',
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
        position: 'relative',
        overflow: 'hidden',
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
    roomStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        maxWidth: 120,
    },
    roomStatusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'right',
    },
    roomStatusBadgeGreen: {backgroundColor: '#dcfce7'},
    roomStatusBadgeTextGreen: {color: '#166534'},
    roomStatusBadgeYellow: {backgroundColor: '#fef9c3'},
    roomStatusBadgeTextYellow: {color: '#854d0e'},
    roomStatusBadgeRed: {backgroundColor: '#fee2e2'},
    roomStatusBadgeTextRed: {color: '#991b1b'},
    roomSheetBusyOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    roomSheetBusyText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    roomModalCancelDisabled: {
        opacity: 0.5,
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
