import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {ChevronLeft} from 'lucide-react-native';
import React from 'react';
import {Ionicons} from '@expo/vector-icons';

export default function RolesRegisterScreen({navigation}) {
    const insets = useSafeAreaInsets();

    const handleRoleSelect = (role) => {
        navigation.navigate('EmailRegisterScreen', {role});
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
            <Image
                source={require('../../assets/images/decorator/decorate_02.png')}
                className="absolute top-[-190px] right-[-80px] h-[1200px] w-[650px] -rotate-180"
                resizeMode="contain"
            />
            <KeyboardAvoidingView style={{flex: 1}} behavior="padding" keyboardVerticalOffset={0}>
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        paddingHorizontal: 24,
                        paddingBottom: insets.bottom + 8,
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    bounces={false}
                >
                    <View className="mt-4">
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            className="w-10 h-10 border border-gray-200 rounded-full items-center justify-center"
                        >
                            <ChevronLeft size={24} color="#1f2937" strokeWidth={2} />
                        </TouchableOpacity>
                    </View>

                    <View className="flex-1 justify-center py-4">
                        <Text className="text-2xl font-sf-bold text-center mb-3">
                            What roles are you applying for?
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleRoleSelect('consumer')}
                            className="bg-white border-2 border-gray-200 rounded-2xl p-6 mb-4 shadow-sm items-center justify-center"
                        >
                            <View className="bg-green-50 w-16 h-16 rounded-full items-center justify-center mb-3">
                                <Ionicons name="person" size={32} color="#f97316" />
                            </View>
                            <Text className="text-lg font-bold text-gray-700">Customer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleRoleSelect('business')}
                            className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm items-center justify-center"
                        >
                            <View className="bg-blue-50 w-16 h-16 rounded-full items-center justify-center mb-3">
                                <Ionicons name="business" size={32} color="#3b82f6" />
                            </View>
                            <Text className="text-lg font-bold text-gray-700">Business</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};
