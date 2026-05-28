import {useEffect, useState} from 'react';
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
import {FormScreenLayout} from '../../../components/common/FormScreenLayout';
import {DetailScreenHeader} from '../../../components/business/DetailScreenHeader';
import {usePhysicalRooms} from '../../../hooks/business/usePhysicalRooms';
import {fetchPhysicalRooms, fetchRoomTypes} from '../../../services/BranchService';
import {commonInputStyles} from '../../../styles/TextInputStyles';

const typePickerStyle = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
});

export default function PhysicalRoomFormScreen({navigation, route}) {
    const {branchId, physicalRoomId} = route.params || {};
    const isEdit = Boolean(physicalRoomId);
    const {save, isSaving} = usePhysicalRooms(branchId);

    const [roomNumber, setRoomNumber] = useState('');
    const [floor, setFloor] = useState('');
    const [roomTypeId, setRoomTypeId] = useState('');
    const [roomTypes, setRoomTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const roomTypeList = Array.isArray(roomTypes) ? roomTypes : [];

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const typesRes = await fetchRoomTypes(branchId);
                const types =
                    typesRes?.status === 'success' && Array.isArray(typesRes?.data) ? typesRes.data : [];
                if (!mounted) return;
                setRoomTypes(types);

                if (isEdit) {
                    const roomsRes = await fetchPhysicalRooms(branchId);
                    const rooms = Array.isArray(roomsRes?.data) ? roomsRes.data : [];
                    const found = rooms.find((r) => r?.id === physicalRoomId);
                    if (found) {
                        setRoomNumber(found?.roomNumber != null ? String(found.roomNumber) : '');
                        setFloor(found?.floor != null ? String(found.floor) : '');
                        setRoomTypeId(found?.roomTypeId ?? '');
                    }
                } else if (types.length > 0) {
                    setRoomTypeId(types[0]?.id ?? '');
                }
            } catch (e) {
                // eslint-disable-next-line no-console
                console.error('[PhysicalRoomForm] load failed', e);
                if (mounted) {
                    setRoomTypes([]);
                    Alert.alert(
                        'Error',
                        e?.response?.data?.detail || e?.message || 'Could not load room information.'
                    );
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [branchId, isEdit, physicalRoomId]);

    const handleSave = async () => {
        if (!roomNumber.trim()) {
            Alert.alert('Validation', 'Room number is required.');
            return;
        }
        if (!floor.trim()) {
            Alert.alert('Validation', 'Floor is required.');
            return;
        }
        if (!roomTypeId) {
            Alert.alert('Validation', 'Select a room type. Add a room type first if none exist.');
            return;
        }

        const res = await save(
            {
                roomNumber: roomNumber.trim(),
                floor: floor.trim(),
                roomTypeId,
            },
            physicalRoomId
        );

        if (res?.status === 'success') {
            Alert.alert('Saved', 'Physical room saved successfully.', [
                {text: 'OK', onPress: () => navigation.goBack()},
            ]);
            return;
        }
        Alert.alert('Error', res?.message || 'Could not save physical room.');
    };

    const saveButton = (
        <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || roomTypeList.length === 0}
            activeOpacity={0.85}
            className={`py-4 rounded-full items-center min-h-[52px] justify-center ${
                isSaving || roomTypeList.length === 0 ? 'bg-gray-300' : 'bg-primary'
            }`}
        >
            {isSaving ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text className="text-white font-sf-bold text-base">Save Room</Text>
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <FormScreenLayout>
                <View className="flex-1 items-center justify-center py-20">
                    <ActivityIndicator size="large" color="#8294FF" />
                </View>
            </FormScreenLayout>
        );
    }

    return (
        <FormScreenLayout footer={saveButton}>
            <DetailScreenHeader
                onBack={() => navigation.goBack()}
                title={isEdit ? 'Edit Physical Room' : 'Add Physical Room'}
                showDelete={false}
            />

            <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
                <Text className="font-sf text-xs text-gray-500 mb-1.5">Room Number *</Text>
                <TextInput
                    value={roomNumber}
                    onChangeText={setRoomNumber}
                    placeholder='e.g. "101", "204"'
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 font-sf text-slate-800 mb-4"
                    style={commonInputStyles.baseInput}
                />

                <Text className="font-sf text-xs text-gray-500 mb-1.5">Floor *</Text>
                <TextInput
                    value={floor}
                    onChangeText={setFloor}
                    placeholder='e.g. "1", "2"'
                    keyboardType="number-pad"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 font-sf text-slate-800 mb-4"
                    style={commonInputStyles.baseInput}
                />

                <Text className="font-sf text-xs text-gray-500 mb-2">Room Type *</Text>
                {roomTypeList.length === 0 ? (
                    <Text className="font-sf text-sm text-amber-600 mb-2">
                        No room types yet. Add a room type before assigning physical rooms.
                    </Text>
                ) : (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        nestedScrollEnabled
                        contentContainerStyle={typePickerStyle.row}
                    >
                        {roomTypeList.map((type) => (
                            <TouchableOpacity
                                key={type.id}
                                onPress={() => setRoomTypeId(type.id)}
                                className={`px-4 py-2.5 rounded-full border ${
                                    roomTypeId === type.id
                                        ? 'bg-primary/10 border-primary'
                                        : 'border-gray-200 bg-gray-50'
                                }`}
                            >
                                <Text
                                    className={`font-sf text-sm ${
                                        roomTypeId === type.id ? 'text-primary font-sf-semi' : 'text-gray-600'
                                    }`}
                                >
                                    {type.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>
        </FormScreenLayout>
    );
}
