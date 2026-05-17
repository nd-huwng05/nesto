import {useState} from 'react';
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
import {getStaffBranchInfo} from '../../../constants/staffBranchInfo';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {createStaffBooking} from '../../../services/ReceptionService';
import {commonInputStyles} from '../../../styles/TextInputStyles';
import {UI} from '../../../styles/uiTokens';

export default function StaffCreateBookingScreen({navigation, route}) {
    const {roomId, roomNumber, hourlyRate, roomType} = route.params || {};
    const {branchId} = useStaffSession();
    const branch = getStaffBranchInfo(branchId);

    const [guestName, setGuestName] = useState('');
    const [phone, setPhone] = useState('');
    const [durationAmount, setDurationAmount] = useState('1');
    const [durationUnit, setDurationUnit] = useState('hours');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!guestName.trim()) {
            Alert.alert('Required', 'Please enter the guest name.');
            return;
        }
        if (!phone.trim()) {
            Alert.alert('Required', 'Please enter a phone number.');
            return;
        }
        const amount = Number(durationAmount);
        if (!amount || amount < 1) {
            Alert.alert('Required', 'Duration must be at least 1.');
            return;
        }

        setSubmitting(true);
        const result = await createStaffBooking({
            roomId,
            branchId,
            guestName: guestName.trim(),
            phone: phone.trim(),
            durationAmount: amount,
            durationUnit,
            hotelName: branch.name,
            hotelAddress: branch.address,
        });
        setSubmitting(false);

        if (result.status === 'success') {
            Alert.alert('Booking created', `Reservation for Room ${roomNumber} is pending check-in.`, [
                {
                    text: 'OK',
                    onPress: () =>
                        navigation.navigate('ReceptionistMain', {screen: 'RoomGrid'}),
                },
            ]);
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
                <Text style={styles.topTitle}>New booking</Text>
                <View style={{width: 24}} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.roomBanner}>
                    <Text style={styles.roomBannerLabel}>Room</Text>
                    <Text style={styles.roomBannerTitle}>Room {roomNumber}</Text>
                    <Text style={styles.roomBannerMeta}>
                        {roomType} · {Number(hourlyRate).toLocaleString('vi-VN')} VND/h
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
                <View style={styles.unitRow}>
                    {['hours', 'nights'].map((unit) => (
                        <TouchableOpacity
                            key={unit}
                            onPress={() => setDurationUnit(unit)}
                            style={[styles.unitChip, durationUnit === unit && styles.unitChipActive]}
                        >
                            <Text
                                style={[
                                    styles.unitChipText,
                                    durationUnit === unit && styles.unitChipTextActive,
                                ]}
                            >
                                {unit === 'hours' ? 'Hours' : 'Nights'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <TextInput
                    value={durationAmount}
                    onChangeText={setDurationAmount}
                    placeholder="1"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    style={[commonInputStyles.baseInput, styles.input]}
                />

                <TouchableOpacity
                    activeOpacity={0.9}
                    disabled={submitting}
                    onPress={handleSubmit}
                    style={[styles.cta, submitting && styles.ctaDisabled]}
                >
                    {submitting ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.ctaText}>Confirm Booking</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {flex: 1, backgroundColor: UI.screenBg},
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    topTitle: {fontSize: 17, fontWeight: '700', color: '#0f172a'},
    scroll: {paddingHorizontal: 20, paddingBottom: 32},
    roomBanner: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    roomBannerLabel: {fontSize: 12, color: '#94a3b8', fontWeight: '600'},
    roomBannerTitle: {fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 4},
    roomBannerMeta: {fontSize: 13, color: '#64748b', marginTop: 4},
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 8,
        marginTop: 4,
    },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 14,
        marginBottom: 8,
        fontSize: 15,
        color: '#0f172a',
    },
    unitRow: {flexDirection: 'row', gap: 10, marginBottom: 10},
    unitChip: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        alignItems: 'center',
    },
    unitChipActive: {
        borderColor: '#8294FF',
        backgroundColor: '#eef2ff',
    },
    unitChipText: {fontSize: 14, fontWeight: '600', color: '#64748b'},
    unitChipTextActive: {color: '#8294FF'},
    cta: {
        backgroundColor: '#8294FF',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
        minHeight: 52,
    },
    ctaDisabled: {opacity: 0.65},
    ctaText: {color: '#ffffff', fontSize: 16, fontWeight: '700'},
});
