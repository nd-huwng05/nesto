import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {
    Calendar,
    CheckSquare,
    Coffee,
    LayoutGrid,
    User,
} from 'lucide-react-native';

const TAB_META = {
    RoomGrid: {Icon: LayoutGrid, label: 'Rooms'},
    Bookings: {Icon: Calendar, label: 'Bookings'},
    Tasks: {Icon: CheckSquare, label: 'Tasks'},
    Orders: {Icon: Coffee, label: 'Orders'},
    Profile: {Icon: User, label: 'Profile'},
};

export function StaffTabBar({state, navigation, bottomInset = 10}) {
    return (
        <View style={[styles.bar, {paddingBottom: bottomInset, paddingTop: 10}]}>
            {state.routes.map((route, index) => {
                const isFocused = state.index === index;
                const meta = TAB_META[route.name] || {Icon: User, label: route.name};
                const IconComponent = meta.Icon;
                const iconColor = isFocused ? '#8294FF' : '#9ca3af';
                const textClass = isFocused ? 'text-primary font-bold' : 'text-gray-400 font-medium';

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });
                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <TouchableOpacity key={route.key} style={styles.tabItem} onPress={onPress}>
                        <IconComponent size={24} color={iconColor} />
                        <Text className={`text-[10px] mt-1 ${textClass}`}>{meta.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: -2},
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 8,
    },
    tabItem: {
        alignItems: 'center',
        width: 72,
        justifyContent: 'center',
    },
});
