import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {KeyboardAvoidingView, Platform, ScrollView, View} from 'react-native';

/**
 * Scrollable form body with a pinned footer CTA (visible on iOS and Android).
 */
export function FormScreenLayout({
    children,
    footer,
    className = 'flex-1',
    contentClassName = 'px-5 pt-2',
    screenStyle,
    footerBarStyle,
    scrollPaddingBottom = 24,
}) {
    const insets = useSafeAreaInsets();
    const footerBottomPad = Platform.OS === 'android' ? 24 : Math.max(insets.bottom, 12);

    return (
        <SafeAreaView className={className} style={[{flex: 1}, screenStyle]} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView
                style={{flex: 1}}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
                <ScrollView
                    className={contentClassName}
                    contentContainerStyle={{flexGrow: 1, paddingBottom: scrollPaddingBottom}}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    showsVerticalScrollIndicator={false}
                >
                    {children}
                </ScrollView>

                {footer ? (
                    <View
                        className="px-5 pt-3 border-t border-gray-200"
                        style={[{paddingBottom: footerBottomPad}, footerBarStyle]}
                    >
                        {footer}
                    </View>
                ) : null}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
