import {Switch, Text, TouchableOpacity, View} from 'react-native';
import {ChevronRight} from 'lucide-react-native';

export function ProfileSettingsRow({
    icon: Icon,
    label,
    value,
    onPress,
    showChevron = true,
    isSwitch = false,
    switchValue = false,
    onSwitchChange,
    destructive = false,
    isLast = false,
}) {
    const borderClass = isLast ? '' : 'border-b border-gray-50';

    const content = (
        <>
            {Icon ? (
                <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center mr-3">
                    <Icon size={18} color={destructive ? '#dc2626' : '#8294FF'} />
                </View>
            ) : null}
            <View className="flex-1 min-w-0">
                <Text
                    className={`font-sf-semi text-sm ${destructive ? 'text-red-600' : 'text-slate-800'}`}
                    numberOfLines={1}
                >
                    {label}
                </Text>
                {value && !isSwitch ? (
                    <Text className="font-sf text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                        {value}
                    </Text>
                ) : null}
            </View>
            {isSwitch ? (
                <Switch
                    value={switchValue}
                    onValueChange={onSwitchChange}
                    trackColor={{false: '#e5e7eb', true: '#c7d2fe'}}
                    thumbColor={switchValue ? '#8294FF' : '#f9fafb'}
                />
            ) : showChevron ? (
                <ChevronRight size={20} color="#cbd5e1" />
            ) : null}
        </>
    );

    if (onPress && !isSwitch) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
                className={`flex-row items-center py-3.5 ${borderClass}`}
            >
                {content}
            </TouchableOpacity>
        );
    }

    return <View className={`flex-row items-center py-3.5 ${borderClass}`}>{content}</View>;
}
