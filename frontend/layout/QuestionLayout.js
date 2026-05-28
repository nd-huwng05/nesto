import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {ChevronLeft} from 'lucide-react-native';
import React from 'react';

export const QuestionLayout = ({
    navigation,
    title,
    subtitle,
    children,
    onContinue,
    isValid = true,
    isLoading = false,
    continueLabel = 'Continue',
    footerText,
    hideContinue = false,
    contentJustify = 'center',
    contentPaddingTop = 0,
}) => {
    const insets = useSafeAreaInsets();
    const canSubmit = isValid && !isLoading;

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
            <Image
                source={require('../assets/images/decorator/decorate_02.png')}
                className="absolute top-[-190px] right-[-80px] h-[1200px] w-[650px] -rotate-180"
                resizeMode="contain"
            />
            <KeyboardAvoidingView style={{flex: 1}} behavior="padding" keyboardVerticalOffset={0}>
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'space-between',
                        paddingHorizontal: 24,
                        paddingBottom: insets.bottom + 8,
                    }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    showsVerticalScrollIndicator={false}
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

                    <View className="flex-1 py-4" style={{justifyContent: contentJustify, alignItems: 'center', paddingTop: contentPaddingTop}}>
                        <Text className="text-3xl font-sf-bold text-center mb-3">{title}</Text>
                        {subtitle ? (
                            <Text className="text-gray-500 font-sf text-center mb-4 px-2">{subtitle}</Text>
                        ) : null}
                        <View style={{width: '100%'}}>
                            {children}
                        </View>
                    </View>

                    <View className="items-center pb-3">
                        {footerText}
                        {!hideContinue && (
                            <TouchableOpacity
                                className={`${canSubmit ? 'bg-primary' : 'bg-gray-300'} w-full py-4 rounded-full flex-row items-center justify-center`}
                                disabled={!canSubmit}
                                onPress={() => {
                                    Keyboard.dismiss();
                                    onContinue?.();
                                }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#ffffff" />
                                ) : (
                                    <Text className="text-white text-center font-sf-bold text-base">
                                        {continueLabel}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
                {isLoading ? (
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            backgroundColor: 'rgba(255,255,255,0.6)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ActivityIndicator size="large" color="#8294FF" />
                    </View>
                ) : null}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};
