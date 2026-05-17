import {useCallback} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {ImageIcon, MapPin, Plus} from 'lucide-react-native';
import {ScreenWrapper} from '../../../components/common/ScreenWrapper';
import {DetailRow, DetailSection} from '../../../components/business/DetailSection';
import {DetailScreenHeader} from '../../../components/business/DetailScreenHeader';
import {BranchMediaGallery} from '../../../components/business/BranchMediaGallery';
import {CatalogListItem, formatVnd} from '../../../components/business/CatalogListItem';
import {RoomTypeCard} from '../../../components/business/RoomTypeCard';
import {useBranchCRUD} from '../../../hooks/business/useBranchCRUD';
import {useRoomTypes} from '../../../hooks/business/useRoomTypes';
import {useExtraServices} from '../../../hooks/business/useExtraServices';
import {usePhysicalRooms} from '../../../hooks/business/usePhysicalRooms';

export default function BranchDetailScreen({navigation, route}) {
    const {businessId, branchId} = route.params || {};
    const {branchDetail, isLoading, isSaving, loadDetail, remove} = useBranchCRUD();
    const {
        roomTypes,
        isLoading: loadingRooms,
        loadList: loadRoomTypes,
        remove: removeRoomType,
    } = useRoomTypes(branchId);
    const {
        extraServices,
        isLoading: loadingExtras,
        loadList: loadExtraServices,
        remove: removeExtraService,
    } = useExtraServices(branchId);
    const {
        physicalRooms,
        isLoading: loadingInventory,
        loadList: loadPhysicalRooms,
        remove: removePhysicalRoom,
    } = usePhysicalRooms(branchId);

    useFocusEffect(
        useCallback(() => {
            loadDetail(branchId);
            loadRoomTypes();
            loadPhysicalRooms();
            loadExtraServices();
        }, [branchId, loadDetail, loadRoomTypes, loadPhysicalRooms, loadExtraServices])
    );

    const handleDelete = async () => {
        const deleted = await remove(branchId, branchDetail?.name || 'this branch');
        if (deleted) navigation.goBack();
    };

    if (isLoading && !branchDetail) {
        return (
            <ScreenWrapper scrollable={false} className="flex-1 bg-gray-100">
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#8294FF" />
                </View>
            </ScreenWrapper>
        );
    }

    if (!branchDetail) {
        return (
            <ScreenWrapper className="flex-1 bg-gray-100">
                <Text className="text-center text-gray-500 font-sf mt-10">Branch not found.</Text>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper className="flex-1 bg-gray-100" contentClassName="px-5 pt-2">
            <DetailScreenHeader
                onBack={() => navigation.goBack()}
                title={branchDetail.name}
                editLabel="Edit"
                onEdit={() => navigation.navigate('EditBranchScreen', {businessId, branchId})}
                onDelete={handleDelete}
                isSaving={isSaving}
            />

            <Text className="font-sf text-primary text-sm mb-4">{branchDetail.lodgingType}</Text>

            <DetailSection title="General Information">
                <DetailRow label="Branch Name" value={branchDetail.name} />
                <DetailRow label="Lodging Type" value={branchDetail.lodgingType} />
                <DetailRow label="Phone" value={branchDetail.contact?.phone} />
                <DetailRow label="Email" value={branchDetail.contact?.email} />
            </DetailSection>

            <DetailSection title="Location">
                <DetailRow label="Address" value={branchDetail.address} />
                <View className="mt-2 h-32 bg-gray-100 rounded-xl items-center justify-center border border-gray-200">
                    <MapPin size={28} color="#94a3b8" />
                    <Text className="font-sf text-gray-400 text-xs mt-2">Map preview (placeholder)</Text>
                </View>
            </DetailSection>

            <DetailSection title="Facilities & Guest Segments">
                <Text className="font-sf text-xs text-gray-400 mb-2">Facilities</Text>
                <View className="flex-row flex-wrap gap-2 mb-3">
                    {(branchDetail.amenities || []).map((item) => (
                        <View key={item} className="bg-primary/10 px-3 py-1.5 rounded-full">
                            <Text className="text-primary font-sf text-xs">{item}</Text>
                        </View>
                    ))}
                </View>
                <Text className="font-sf text-xs text-gray-400 mb-2">Target Guest Segments</Text>
                <View className="flex-row flex-wrap gap-2">
                    {(branchDetail.guestSegments || []).map((item) => (
                        <View key={item} className="bg-slate-100 px-3 py-1.5 rounded-full">
                            <Text className="text-slate-600 font-sf text-xs">{item}</Text>
                        </View>
                    ))}
                </View>
            </DetailSection>

            <DetailSection title="Media Gallery">
                <BranchMediaGallery coverImage={branchDetail.image} images={branchDetail.images} />
                <TouchableOpacity
                    onPress={() => navigation.navigate('EditBranchMediaScreen', {branchId})}
                    className="flex-row items-center justify-center mt-3 py-2.5 border border-primary/40 rounded-xl bg-primary/5"
                >
                    <ImageIcon size={18} color="#8294FF" />
                    <Text className="text-primary font-sf-semi text-sm ml-2">Update Photos</Text>
                </TouchableOpacity>
            </DetailSection>

            <DetailSection title="Room Types">
                {loadingRooms ? (
                    <ActivityIndicator color="#8294FF" className="py-4" />
                ) : roomTypes.length === 0 ? (
                    <Text className="font-sf text-gray-400 text-sm mb-2">No room types configured yet.</Text>
                ) : (
                    roomTypes.map((room) => (
                        <RoomTypeCard
                            key={room.id}
                            roomType={room}
                            onPress={() =>
                                navigation.navigate('RoomTypeDetailScreen', {
                                    branchId,
                                    businessId,
                                    roomTypeId: room.id,
                                })
                            }
                            onEdit={() =>
                                navigation.navigate('RoomTypeFormScreen', {
                                    branchId,
                                    businessId,
                                    roomTypeId: room.id,
                                })
                            }
                        />
                    ))
                )}
                <TouchableOpacity
                    onPress={() =>
                        navigation.navigate('RoomTypeFormScreen', {branchId, businessId})
                    }
                    className="flex-row items-center justify-center mt-2 py-3 border border-dashed border-primary/50 rounded-xl bg-primary/5"
                >
                    <Plus size={18} color="#8294FF" />
                    <Text className="text-primary font-sf-semi text-sm ml-2">Add room type</Text>
                </TouchableOpacity>
            </DetailSection>

            <DetailSection title="Physical Rooms">
                {loadingInventory ? (
                    <ActivityIndicator color="#8294FF" className="py-4" />
                ) : physicalRooms.length === 0 ? (
                    <Text className="font-sf text-gray-400 text-sm mb-2">
                        No physical rooms in inventory yet.
                    </Text>
                ) : (
                    physicalRooms.map((room) => (
                        <CatalogListItem
                            key={room.id}
                            title={`Room ${room.roomNumber}`}
                            subtitle={`Floor ${room.floor}`}
                            meta={room.roomTypeName || 'Unassigned type'}
                            onEdit={() =>
                                navigation.navigate('PhysicalRoomFormScreen', {
                                    branchId,
                                    physicalRoomId: room.id,
                                })
                            }
                            onDelete={() =>
                                removePhysicalRoom(room.id, `${room.roomNumber} (Floor ${room.floor})`)
                            }
                        />
                    ))
                )}
                <TouchableOpacity
                    onPress={() => navigation.navigate('PhysicalRoomFormScreen', {branchId})}
                    className="flex-row items-center justify-center mt-2 py-3 border border-dashed border-primary/50 rounded-xl bg-primary/5"
                >
                    <Plus size={18} color="#8294FF" />
                    <Text className="text-primary font-sf-semi text-sm ml-2">Add physical room</Text>
                </TouchableOpacity>
            </DetailSection>

            <DetailSection title="Extra Services">
                {loadingExtras ? (
                    <ActivityIndicator color="#8294FF" className="py-4" />
                ) : extraServices.length === 0 ? (
                    <Text className="font-sf text-gray-400 text-sm mb-2">No extra services configured yet.</Text>
                ) : (
                    extraServices.map((service) => (
                        <CatalogListItem
                            key={service.id}
                            title={service.name}
                            subtitle={service.description}
                            meta={formatVnd(service.price)}
                            onEdit={() =>
                                navigation.navigate('ExtraServiceFormScreen', {
                                    branchId,
                                    businessId,
                                    serviceId: service.id,
                                })
                            }
                            onDelete={() => removeExtraService(service.id, service.name)}
                        />
                    ))
                )}
                <TouchableOpacity
                    onPress={() =>
                        navigation.navigate('ExtraServiceFormScreen', {branchId, businessId})
                    }
                    className="flex-row items-center justify-center mt-2 py-3 border border-dashed border-primary/50 rounded-xl bg-primary/5"
                >
                    <Plus size={18} color="#8294FF" />
                    <Text className="text-primary font-sf-semi text-sm ml-2">Add extra service</Text>
                </TouchableOpacity>
            </DetailSection>
        </ScreenWrapper>
    );
}
