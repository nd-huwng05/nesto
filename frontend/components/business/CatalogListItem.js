import {Text, TouchableOpacity, View} from 'react-native';
import {Pencil, Trash2} from 'lucide-react-native';

export function CatalogListItem({title, subtitle, meta, onPress, onEdit, onDelete}) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            className="flex-row items-center py-3 border-b border-gray-50 last:border-0"
        >
            <View className="flex-1 pr-2">
                <Text className="font-sf-semi text-slate-800">{title}</Text>
                {subtitle ? (
                    <Text className="font-sf text-xs text-gray-500 mt-0.5" numberOfLines={2}>
                        {subtitle}
                    </Text>
                ) : null}
                {meta ? <Text className="font-sf text-xs text-primary mt-1">{meta}</Text> : null}
            </View>
            <View className="flex-row gap-1">
                {onEdit ? (
                    <TouchableOpacity
                        onPress={onEdit}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] bg-primary/10 rounded-full items-center justify-center"
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                    >
                        <Pencil size={16} color="#8294FF" />
                    </TouchableOpacity>
                ) : null}
                {onDelete ? (
                    <TouchableOpacity
                        onPress={onDelete}
                        className="w-10 h-10 min-w-[40px] min-h-[40px] bg-red-50 rounded-full items-center justify-center"
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                    >
                        <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                ) : null}
            </View>
        </TouchableOpacity>
    );
}

export function formatVnd(amount) {
    if (amount === 0 || amount === '0') return 'Included';
    const num = Number(amount);
    if (Number.isNaN(num)) return String(amount);
    return `${num.toLocaleString('vi-VN')} ₫`;
}
