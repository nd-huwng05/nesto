import {useCallback, useState} from 'react';
import {ActivityIndicator, Image, ScrollView, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {ScreenWrapper} from '../../../components/common/ScreenWrapper';
import {DetailScreenHeader} from '../../../components/business/DetailScreenHeader';
import {DetailRow, DetailSection} from '../../../components/business/DetailSection';
import {formatVnd} from '../../../components/business/CatalogListItem';
import {useRoomTypes} from '../../../hooks/business/useRoomTypes';
import {fetchRoomTypes} from '../../../services/BranchService';

export default function RoomTypeDetailScreen({navigation, route}) {
    const {branchId, businessId, roomTypeId} = route.params || {};
    const {remove, isSaving} = useRoomTypes(branchId);
    const [roomType, setRoomType] = useState(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            (async () => {
                setLoading(true);
                const res = await fetchRoomTypes(branchId);
                const found = res.data?.find((r) => r.id === roomTypeId);
                if (active) {
                    setRoomType(found || null);
                    setLoading(false);
                }
            })();
            return () => {
                active = false;
            };
        }, [branchId, roomTypeId])
    );

    if (loading) {
        return (
            <ScreenWrapper scrollable={false} className="flex-1 bg-gray-100">
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#8294FF" />
                </View>
            </ScreenWrapper>
        );
    }

    const handleDelete = async () => {
        if (!roomType) return;
        const deleted = await remove(roomType.id, roomType.name);
        if (deleted) navigation.goBack();
    };

    if (!roomType) {
        return (
            <ScreenWrapper className="flex-1 bg-gray-100" contentClassName="px-5 pt-2">
                <DetailScreenHeader onBack={() => navigation.goBack()} title="Room Type" showDelete={false} />
                <Text className="font-sf text-center text-gray-500 mt-8">Room type not found.</Text>
            </ScreenWrapper>
        );
    }

    const images = roomType.images?.length ? roomType.images : [];

    return (
        <ScreenWrapper className="flex-1 bg-gray-100" contentClassName="px-5 pt-2">
            <DetailScreenHeader
                onBack={() => navigation.goBack()}
                title={roomType.name}
                editLabel="Edit"
                onEdit={() =>
                    navigation.navigate('RoomTypeFormScreen', {branchId, businessId, roomTypeId})
                }
                onDelete={handleDelete}
                isSaving={isSaving}
            />

            {images.length > 0 ? (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-4"
                    contentContainerStyle={{gap: 10}}
                >
                    {images.map((uri, index) => (
                        <Image
                            key={`${uri}-${index}`}
                            source={{uri}}
                            className="w-40 h-28 rounded-xl bg-gray-100"
                            resizeMode="cover"
                        />
                    ))}
                </ScrollView>
            ) : null}

            <DetailSection title="Overview">
                <DetailRow label="Base Price" value={formatVnd(roomType.basePrice)} />
                <DetailRow label="Max Guests" value={String(roomType.capacity)} />
                <DetailRow label="Description" value={roomType.description || '—'} />
            </DetailSection>

            <DetailSection title="Room Amenities">
                {(roomType.roomAmenities || []).length === 0 ? (
                    <Text className="font-sf text-sm text-gray-400">No amenities listed.</Text>
                ) : (
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
                        {roomType.roomAmenities.map((item) => (
                            <View key={item} className="bg-primary/10 px-3 py-1.5 rounded-full">
                                <Text className="text-primary font-sf text-xs">{item}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </DetailSection>
        </ScreenWrapper>
    );
}
