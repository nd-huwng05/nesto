import {Text, TouchableOpacity, View} from 'react-native';
import {ChevronRight, Pencil} from 'lucide-react-native';
import RemoteImage from '../common/RemoteImage';
import {formatVnd} from './CatalogListItem';

export function RoomTypeCard({roomType, onPress, onEdit}) {
    const thumbnailUri = String(roomType.images?.[0] || '').trim();
    const meta = `${formatVnd(roomType.basePrice)} · Max ${roomType.capacity} guests`;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.75}
            className="flex-row items-center py-3 border-b border-gray-50"
        >
            <RemoteImage
                uri={thumbnailUri}
                style={{width: 64, height: 64, borderRadius: 12, marginRight: 12}}
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
