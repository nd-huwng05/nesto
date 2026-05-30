import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {FileText, Network, User, Users} from 'lucide-react-native';

export const TaborBusiness = ({state, navigation, bottomInset = 10}) => {
    return (
        <View style={[styles.bar, {paddingBottom: bottomInset, paddingTop: 8}]}>
            {state.routes.map((route, index) => {
                const isFocused = state.index === index;

                let IconComponent = Network;
                let title = 'Branch';

                if (route.name === 'HomeBusinessMain') {
                    IconComponent = Network;
                    title = 'Branch';
                } else if (route.name === 'ReportBusinessScreen') {
                    IconComponent = FileText;
                    title = 'Report';
                } else if (route.name === 'StaffBusinessScreen') {
                    IconComponent = Users;
                    title = 'Staff';
                } else if (route.name === 'ProfileBusinessScreen') {
                    IconComponent = User;
                    title = 'Profile';
                }

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
                        <Text className={`text-[10px] mt-1 ${textClass}`}>{title}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

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
        width: 64,
        justifyContent: 'center',
    },
});
