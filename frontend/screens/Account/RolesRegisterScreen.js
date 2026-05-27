import { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ChevronLeft } from 'lucide-react-native';

const ROLE_CARDS = [
    {
        value: 'CUSTOMER',
        label: 'Customer',
        description: 'Book services and manage appointments',
        icon: 'person-outline',
        iconColor: '#10B981',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        selectedBorderColor: 'border-emerald-500',
        selectedBgColor: 'bg-emerald-50',
    },
    {
        value: 'BUSINESS_OWNER',
        label: 'Business',
        description: 'Manage your business and staff',
        icon: 'business-outline',
        iconColor: '#3B82F6',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        selectedBorderColor: 'border-blue-500',
        selectedBgColor: 'bg-blue-50',
    },
];

export default function RolesRegisterScreen({ navigation }) {
    const [selectedRole, setSelectedRole] = useState(null);

    const handleContinue = () => {
        if (selectedRole) {
            navigation.navigate('EmailRegisterScreen', { role: selectedRole });
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Image
                source={require('../../assets/images/decorator/decorate_02.png')}
                className="absolute top-[-190px] right-[-80px] h-[1200px] w-[650px] -rotate-180"
                resizeMode="contain"
            />
            <View className="flex-1 px-6">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 border border-gray-200 rounded-full items-center justify-center mt-4"
                >
                    <ChevronLeft size={24} color="#1f2937" strokeWidth={2} />
                </TouchableOpacity>

                <View className="flex-1 justify-center">
                    <Text className="text-3xl font-sf-bold text-gray-900 mb-2 text-center">
                        Join as
                    </Text>
                    <Text className="text-base text-gray-500 text-center mb-10">
                        Choose how you want to use Nesto
                    </Text>

                    <View className="space-y-4">
                        {ROLE_CARDS.map((card) => {
                            const isSelected = selectedRole === card.value;
                            return (
                                <TouchableOpacity
                                    key={card.value}
                                    onPress={() => setSelectedRole(card.value)}
                                    activeOpacity={0.8}
                                    className={`
                                        p-5 rounded-2xl border-2
                                        ${isSelected ? `${card.selectedBorderColor} ${card.selectedBgColor}` : `border-gray-200 bg-white`}
                                        shadow-sm
                                    `}
                                >
                                    <View className="flex-row items-center">
                                        <View className={`w-14 h-14 rounded-2xl ${card.bgColor} items-center justify-center mr-4`}>
                                            <Ionicons name={card.icon} size={28} color={card.iconColor} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className={`text-lg font-sf-semi ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                                {card.label}
                                            </Text>
                                            <Text className="text-sm text-gray-500 mt-1">
                                                {card.description}
                                            </Text>
                                        </View>
                                        <View className={`
                                            w-6 h-6 rounded-full border-2 items-center justify-center
                                            ${isSelected ? `border-[${card.iconColor}] bg-[${card.iconColor}]` : 'border-gray-300'}
                                        `}>
                                            {isSelected && (
                                                <Ionicons name="checkmark" size={14} color="white" />
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <View className="pb-6">
                    <TouchableOpacity
                        onPress={handleContinue}
                        disabled={!selectedRole}
                        className={`
                            py-4 rounded-2xl items-center
                            ${selectedRole ? 'bg-indigo-600' : 'bg-gray-200'}
                        `}
                    >
                        <Text className={`text-base font-sf-semi ${selectedRole ? 'text-white' : 'text-gray-400'}`}>
                            Continue
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}
