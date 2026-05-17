import {TouchableOpacity, View, Image, Text} from "react-native";
import {Bell} from "lucide-react-native";

export const HeaderBusiness = () => (
    <View className="flex-row justify-between items-center bg-white px-6 py-4">
        <View className="flex-row items-center gap-3">
            <Image
                source={{ uri: 'https://i.pravatar.cc/150?img=11' }}
                className="w-10 h-10 rounded-full border border-gray-100"
            />
            <View>
                <Text className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Manager</Text>
                <Text className="text-slate-800 text-lg font-bold">Trọng Bảo An</Text>
            </View>
        </View>
        <TouchableOpacity className="relative p-2">
            <Bell size={24} color="#334155" />
            <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
        </TouchableOpacity>
    </View>
);