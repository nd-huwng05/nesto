import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

/**
 * Root layout for bottom-tab screens when the stack header is hidden.
 * Requires <SafeAreaProvider> at the app root (see App.js).
 */
export function TabScreenLayout({children, style, backgroundColor}) {
    return (
        <SafeAreaView
            style={[styles.safe, backgroundColor != null && {backgroundColor}, style]}
            edges={['top', 'left', 'right']}
        >
            {children}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
    },
});
