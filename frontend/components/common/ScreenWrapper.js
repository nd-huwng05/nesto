import {SafeAreaView} from 'react-native-safe-area-context';
import {KeyboardAvoidingView, Platform, ScrollView, View} from 'react-native';

export function ScreenWrapper({
    children,
    scrollable = true,
    className = 'flex-1 bg-white',
    contentClassName = '',
    scrollPaddingBottom = 24,
    scrollFill = false,
    edges = ['top', 'left', 'right'],
}) {
    const scrollContentStyle = scrollFill
        ? {flexGrow: 1, paddingBottom: scrollPaddingBottom}
        : {paddingBottom: scrollPaddingBottom};

    const body = scrollable ? (
        <ScrollView
            className={contentClassName}
            contentContainerStyle={scrollContentStyle}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
        >
            {children}
        </ScrollView>
    ) : (
        <View className={`flex-1 ${contentClassName}`}>{children}</View>
    );

    return (
        <SafeAreaView className={className} edges={edges}>
            <KeyboardAvoidingView
                style={{flex: 1}}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
                {body}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
