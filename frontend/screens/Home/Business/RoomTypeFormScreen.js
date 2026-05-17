import {useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {FormScreenLayout} from '../../../components/common/FormScreenLayout';
import {DetailScreenHeader} from '../../../components/business/DetailScreenHeader';
import {MultiImagePicker} from '../../../components/business/MultiImagePicker';
import {useRoomTypes} from '../../../hooks/business/useRoomTypes';
import {fetchRoomAmenityOptions, fetchRoomTypes} from '../../../services/BranchService';
import {commonInputStyles} from '../../../styles/TextInputStyles';

const amenityWrapStyle = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        maxWidth: '100%',
    },
});

export default function RoomTypeFormScreen({navigation, route}) {
    const {branchId, roomTypeId} = route.params || {};
    const isEdit = Boolean(roomTypeId);
    const {save, isSaving} = useRoomTypes(branchId);

    const [name, setName] = useState('');
    const [basePrice, setBasePrice] = useState('');
    const [capacity, setCapacity] = useState('');
    const [description, setDescription] = useState('');
    const [roomAmenities, setRoomAmenities] = useState([]);
    const [images, setImages] = useState([]);
    const [amenityOptions, setAmenityOptions] = useState([]);
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        fetchRoomAmenityOptions().then((res) => {
            if (res.status === 'success') setAmenityOptions(res.data);
        });
    }, []);

    useEffect(() => {
        if (!isEdit) {
            setLoading(false);
            return;
        }
        (async () => {
            const res = await fetchRoomTypes(branchId);
            const found = res.data?.find((r) => r.id === roomTypeId);
            if (found) {
                setName(found.name);
                setBasePrice(String(found.basePrice));
                setCapacity(String(found.capacity));
                setDescription(found.description || '');
                setRoomAmenities(found.roomAmenities || []);
                setImages(found.images || []);
            }
            setLoading(false);
        })();
    }, [branchId, isEdit, roomTypeId]);

    const toggleAmenity = (item) => {
        setRoomAmenities((prev) =>
            prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
        );
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation', 'Room type name is required.');
            return;
        }
        if (!basePrice.trim() || Number(basePrice) < 0) {
            Alert.alert('Validation', 'Enter a valid base price.');
            return;
        }
        if (!capacity.trim() || Number(capacity) < 1) {
            Alert.alert('Validation', 'Capacity must be at least 1 guest.');
            return;
        }
        if (images.length === 0) {
            Alert.alert('Validation', 'Add at least one photo for this room type.');
            return;
        }

        const res = await save(
            {
                name: name.trim(),
                basePrice: Number(basePrice),
                capacity: Number(capacity),
                description: description.trim(),
                roomAmenities,
                images,
            },
            roomTypeId
        );

        if (res?.status === 'success') {
            Alert.alert('Saved', 'Room type saved successfully.', [
                {text: 'OK', onPress: () => navigation.goBack()},
            ]);
        }
    };

    const saveButton = (
        <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.85}
            className={`py-4 rounded-full items-center min-h-[52px] justify-center ${
                isSaving ? 'bg-gray-300' : 'bg-primary'
            }`}
        >
            {isSaving ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text className="text-white font-sf-bold text-base">Save Room Type</Text>
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
                title={isEdit ? 'Edit Room Type' : 'Add Room Type'}
                showDelete={false}
            />

            <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
                <Text className="font-sf text-xs text-gray-500 mb-2">Room Photos *</Text>
                <MultiImagePicker
                    images={images}
                    onChange={setImages}
                    label="Bedroom, bathroom, and in-room amenities"
                />
            </View>

            <View className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
                <Text className="font-sf text-xs text-gray-500 mb-1.5">Name *</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Deluxe, Family Suite"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 font-sf text-slate-800 mb-4"
                    style={commonInputStyles.baseInput}
                />

                <Text className="font-sf text-xs text-gray-500 mb-1.5">Base Price (VND) *</Text>
                <TextInput
                    value={basePrice}
                    onChangeText={setBasePrice}
                    keyboardType="number-pad"
                    placeholder="1500000"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 font-sf text-slate-800 mb-4"
                    style={commonInputStyles.baseInput}
                />

                <Text className="font-sf text-xs text-gray-500 mb-1.5">Max Guests *</Text>
                <TextInput
                    value={capacity}
                    onChangeText={setCapacity}
                    keyboardType="number-pad"
                    placeholder="2"
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 font-sf text-slate-800 mb-4"
                    style={commonInputStyles.baseInput}
                />

                <Text className="font-sf text-xs text-gray-500 mb-1.5">Description</Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe the room..."
                    multiline
                    numberOfLines={4}
                    className="bg-gray-50 border border-gray-100 rounded-xl px-4 font-sf text-slate-800 mb-4"
                    style={[commonInputStyles.baseInput, commonInputStyles.multilineInput]}
                />

                <Text className="font-sf text-xs text-gray-500 mb-2">Room Amenities</Text>
                <View style={amenityWrapStyle.wrap}>
                    {amenityOptions.map((item) => (
                        <TouchableOpacity
                            key={item}
                            onPress={() => toggleAmenity(item)}
                            style={amenityWrapStyle.chip}
                            className={`px-3 py-2 rounded-full border ${
                                roomAmenities.includes(item)
                                    ? 'bg-primary/10 border-primary'
                                    : 'border-gray-200'
                            }`}
                        >
                            <Text
                                className={`font-sf text-xs ${
                                    roomAmenities.includes(item) ? 'text-primary' : 'text-gray-600'
                                }`}
                            >
                                {item}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </FormScreenLayout>
    );
}
