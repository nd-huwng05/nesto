import {useEffect, useMemo, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ChevronLeft} from 'lucide-react-native';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {useStaffBranch} from '../../../hooks/staff/useStaffBranch';
import {createStaffBooking} from '../../../services/ReceptionService';
import {getRoom, canBookWalkInRoom} from '../../../services/staffApiService';
import {commonInputStyles} from '../../../styles/TextInputStyles';
import {UI} from '../../../styles/uiTokens';

function formatVnd(amount) {
    return `${Number(amount).toLocaleString('en-US')} VND`;
}

function parseNonNegativeInt(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits === '') return 0;
    return Math.min(Number(digits), 999);
}

export default function StaffCreateBookingScreen({navigation, route}) {
    const {roomId, roomNumber, hourlyRate, roomType} = route.params || {};
    const {branchId} = useStaffSession();
    const {branch} = useStaffBranch(branchId);

    const [guestName, setGuestName] = useState('');
    const [phone, setPhone] = useState('');
    const [durationDays, setDurationDays] = useState('0');
    const [durationHours, setDurationHours] = useState('1');
    const [submitting, setSubmitting] = useState(false);
    const [roomAvailable, setRoomAvailable] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!roomId) {
                setRoomAvailable(false);
                return;
            }
            try {
                const room = await getRoom(roomId);
                if (cancelled) return;
                if (!room || !canBookWalkInRoom(room.status)) {
                    setRoomAvailable(false);
                    Alert.alert(
                        'Room unavailable',
                        'This room is occupied or under maintenance and cannot accept a walk-in.',
                        [{text: 'OK', onPress: () => navigation.goBack()}]
                    );
                }
            } catch (err) {
                if (!cancelled) {
                    setRoomAvailable(false);
                    Alert.alert('Error', 'Could not load room information.', [
                        {text: 'OK', onPress: () => navigation.goBack()},
                    ]);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [roomId, navigation]);

    const rate = Number(hourlyRate) || 0;
    const days = parseNonNegativeInt(durationDays);
    const hours = parseNonNegativeInt(durationHours);
    const totalHours = days * 24 + hours;

    const estimatedPrice = useMemo(() => {
        if (totalHours < 1) return 0;
        return Math.round(rate * totalHours);
    }, [rate, totalHours]);

    const handleSubmit = async () => {
        if (!guestName.trim()) {
            Alert.alert('Required', 'Please enter the guest name.');
            return;
        }
        if (!phone.trim()) {
            Alert.alert('Required', 'Please enter a phone number.');
            return;
        }
        if (totalHours < 1) {
            Alert.alert('Required', 'Total duration must be at least 1 hour.');
            return;
        }

        setSubmitting(true);
        const result = await createStaffBooking({
            roomId,
            branchId,
            guestName: guestName.trim(),
            phone: phone.trim(),
            durationDays: days,
            durationHours: hours,
            walkIn: true,
            hotelName: branch?.name || '',
            hotelAddress: branch?.address || '',
        });
        setSubmitting(false);

        if (result.status === 'success') {
            Alert.alert(
                'Walk-in checked in',
                `Guest checked in to Room ${roomNumber} now. Collect payment at check-out.`,
                [{text: 'OK', onPress: () => navigation.navigate('ReceptionistMain', {screen: 'Bookings'})}]
            );
            return;
        }
        Alert.alert('Error', result.message || 'Could not create booking.');
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
                    <ChevronLeft size={24} color="#334155" />
                </TouchableOpacity>
                <Text style={styles.topTitle}>Walk-in check-in</Text>
                <View style={{width: 24}} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.roomBanner}>
                    <Text style={styles.roomBannerLabel}>Walk-in · checking in now</Text>
                    <Text style={styles.roomBannerTitle}>Room {roomNumber}</Text>
                    <Text style={styles.roomBannerMeta}>
                        {roomType} · {rate.toLocaleString('en-US')} VND/h
                    </Text>
                </View>

                <Text style={styles.label}>Guest name</Text>
                <TextInput
                    value={guestName}
                    onChangeText={setGuestName}
                    placeholder="Full name"
                    placeholderTextColor="#94a3b8"
                    style={[commonInputStyles.baseInput, styles.input]}
                />

                <Text style={styles.label}>Phone number</Text>
                <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="09xx xxx xxx"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    style={[commonInputStyles.baseInput, styles.input]}
                />

                <Text style={styles.label}>Duration</Text>
                <View style={styles.durationRow}>
                    <View style={styles.durationField}>
                        <Text style={styles.durationFieldLabel}>Days</Text>
                        <TextInput
                            value={durationDays}
                            onChangeText={(v) => setDurationDays(String(parseNonNegativeInt(v)))}
                            placeholder="0"
                            placeholderTextColor="#94a3b8"
                            keyboardType="number-pad"
                            style={[commonInputStyles.baseInput, styles.input, styles.durationInput]}
                        />
                    </View>
                    <View style={styles.durationField}>
                        <Text style={styles.durationFieldLabel}>Hours</Text>
                        <TextInput
                            value={durationHours}
                            onChangeText={(v) => setDurationHours(String(parseNonNegativeInt(v)))}
                            placeholder="1"
                            placeholderTextColor="#94a3b8"
                            keyboardType="number-pad"
                            style={[commonInputStyles.baseInput, styles.input, styles.durationInput]}
                        />
                    </View>
                </View>

                <View style={styles.estimateCard}>
                    <Text style={styles.estimateLabel}>Total duration</Text>
                    <Text style={styles.estimateValue}>
                        {totalHours} hour{totalHours === 1 ? '' : 's'} ({days}d × 24 + {hours}h)
                    </Text>
                    <Text style={[styles.estimateLabel, {marginTop: 12}]}>Estimated room charge</Text>
                    <Text style={styles.estimatePrice}>
                        {totalHours < 1 ? '—' : formatVnd(estimatedPrice)}
                    </Text>
                </View>

                <TouchableOpacity
                    activeOpacity={0.9}
                    disabled={submitting || totalHours < 1 || !roomAvailable}
                    onPress={handleSubmit}
                    style={[styles.cta, (submitting || totalHours < 1 || !roomAvailable) && styles.ctaDisabled]}
                >
                    {submitting ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.ctaText}>Confirm Walk-in</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {flex: 1, backgroundColor: UI.screenBg},
    topBar: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8},
    topTitle: {fontSize: 17, fontWeight: '700', color: '#0f172a'},
    scroll: {paddingHorizontal: 20, paddingBottom: 32},
    roomBanner: {backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0'},
    roomBannerLabel: {fontSize: 12, color: '#94a3b8', fontWeight: '600'},
    roomBannerTitle: {fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 4},
    roomBannerMeta: {fontSize: 13, color: '#64748b', marginTop: 4},
    label: {fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 4},
    input: {backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14, marginBottom: 8, fontSize: 15, color: '#0f172a'},
    durationRow: {flexDirection: 'row', gap: 12, marginBottom: 8},
    durationField: {flex: 1},
    durationFieldLabel: {fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6},
    durationInput: {marginBottom: 0},
    estimateCard: {backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginTop: 12, marginBottom: 4},
    estimateLabel: {fontSize: 12, fontWeight: '600', color: '#64748b'},
    estimateValue: {fontSize: 14, fontWeight: '600', color: '#334155', marginTop: 4},
    estimatePrice: {fontSize: 18, fontWeight: '800', color: '#059669', marginTop: 4},
    cta: {backgroundColor: '#8294FF', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24, minHeight: 52},
    ctaDisabled: {opacity: 0.65},
    ctaText: {color: '#ffffff', fontSize: 16, fontWeight: '700'},
});
