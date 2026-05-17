import {Image, Text, TouchableOpacity, View} from 'react-native';
import {ChevronRight, Pencil} from 'lucide-react-native';
import {formatVnd} from './CatalogListItem';

const PLACEHOLDER = 'https://placehold.co/96x96/e2e8f0/94a3b8?text=Room';

export function RoomTypeCard({roomType, onPress, onEdit}) {
    const thumbnailUri = roomType.images?.[0] || PLACEHOLDER;
    const meta = `${formatVnd(roomType.basePrice)} · Max ${roomType.capacity} guests`;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            className="flex-row items-center py-3 border-b border-gray-50"
        >
            <Image
                source={{uri: thumbnailUri}}
                className="w-16 h-16 rounded-xl bg-gray-100 mr-3"
                resizeMode="cover"
            />

            <View className="flex-1 pr-2 min-w-0">
                <Text className="font-sf-semi text-slate-800" numberOfLines={1}>
                    {roomType.name}
                </Text>
                {roomType.description ? (
                    <Text className="font-sf text-xs text-gray-500 mt-0.5" numberOfLines={2}>
                        {roomType.description}
                    </Text>
                ) : null}
                <Text className="font-sf text-xs text-primary mt-1" numberOfLines={1}>
                    {meta}
                </Text>
            </View>

            <View className="flex-row items-center gap-1">
                {onEdit ? (
                    <TouchableOpacity
                        onPress={onEdit}
                        className="w-10 h-10 bg-primary/10 rounded-full items-center justify-center"
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${roomType.name}`}
                    >
                        <Pencil size={16} color="#8294FF" />
                    </TouchableOpacity>
                ) : null}
                <ChevronRight size={18} color="#94a3b8" />
            </View>
        </TouchableOpacity>
    );
}
