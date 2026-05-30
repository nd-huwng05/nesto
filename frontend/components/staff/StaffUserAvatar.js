import {Image, StyleSheet, Text, View} from 'react-native';
import {resolveMediaUrl} from '../../utils/mediaUrl';

export function StaffUserAvatar({user, size = 40, style}) {
    const raw = String(user?.avatar || '').trim();
    const uri = resolveMediaUrl(raw);
    const radius = size / 2;
    const initials = String(user?.name || user?.email || 'U').trim().charAt(0).toUpperCase() || 'U';

    return (
        <View style={[styles.wrap, {width: size, height: size, borderRadius: radius}, style]}>
            {uri ? (
                <Image
                    source={{uri}}
                    style={{width: size, height: size, borderRadius: radius}}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.fallback, {width: size, height: size, borderRadius: radius}]}>
                    <Text style={[styles.fallbackText, {fontSize: Math.max(12, size * 0.38)}]}>{initials}</Text>
                </View>
            )}
        </View>
    );
}

export function StaffUserAvatarLarge({user, size = 96}) {
    return <StaffUserAvatar user={user} size={size} style={styles.largeShadow} />;
}

const styles = StyleSheet.create({
    wrap: {
        overflow: 'hidden',
        backgroundColor: '#e2e8f0',
    },
    fallback: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8294FF',
    },
    fallbackText: {
        color: '#fff',
        fontWeight: '700',
    },
    largeShadow: {
        shadowColor: '#8294FF',
        shadowOffset: {width: 0, height: 6},
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
});
