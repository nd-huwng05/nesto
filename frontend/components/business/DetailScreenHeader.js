import {ActivityIndicator, Platform, Text, TouchableOpacity, View} from 'react-native';
import {ChevronLeft, Pencil, Trash2} from 'lucide-react-native';

export function DetailScreenHeader({
    onBack,
    title,
    onEdit,
    onDelete,
    editLabel = 'Edit',
    isSaving = false,
    showDelete = true,
}) {
    return (
        <View
            className="flex-row items-center justify-between mb-4 min-h-[48px]"
            style={Platform.OS === 'android' ? {elevation: 0} : undefined}
        >
            <TouchableOpacity
                onPress={onBack}
                className="w-11 h-11 min-w-[44px] min-h-[44px] border border-gray-200 rounded-full items-center justify-center bg-white"
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            >
                <ChevronLeft size={22} color="#1f2937" />
            </TouchableOpacity>

            {title ? (
                <Text className="font-sf-bold text-lg text-slate-800 flex-1 text-center mx-2" numberOfLines={1}>
                    {title}
                </Text>
            ) : (
                <View className="flex-1" />
            )}

            <View className="flex-row items-center gap-2">
                {onEdit ? (
                    <TouchableOpacity
                        onPress={onEdit}
                        disabled={isSaving}
                        className="flex-row items-center justify-center bg-primary px-3 min-h-[44px] min-w-[44px] rounded-full"
                        hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}
                    >
                        <Pencil size={16} color="#ffffff" />
                        <Text className="text-white font-sf-semi text-sm ml-1.5">{editLabel}</Text>
                    </TouchableOpacity>
                ) : null}
                {showDelete && onDelete ? (
                    <TouchableOpacity
                        onPress={onDelete}
                        disabled={isSaving}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] bg-red-50 rounded-full items-center justify-center border border-red-100"
                        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                            <Trash2 size={18} color="#ef4444" />
                        )}
                    </TouchableOpacity>
                ) : null}
            </View>
        </View>
    );
}
