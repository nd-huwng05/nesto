import {TouchableOpacity, View, Text} from "react-native";
import {Bell} from "lucide-react-native";
import Avatar from "../common/Avatar";

export const HeaderBusiness = ({user}) => {
    const displayName = String(user?.name || user?.full_name || 'Manager').trim() || 'Manager';
    const roleLabel = String(user?.role || 'Manager').trim() || 'Manager';

    return (
        <View className="flex-row justify-between items-center bg-white px-6 py-4">
            <View className="flex-row items-center gap-3">
                <Avatar uri={user?.avatar} name={displayName} size={40} />
                <View>
                    <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider">{roleLabel}</Text>
                    <Text className="text-slate-800 text-lg font-bold">{displayName}</Text>
                </View>
            </View>
            <TouchableOpacity className="relative p-2">
                <Bell size={24} color="#334155" />
                <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </TouchableOpacity>
        </View>
    );
};
