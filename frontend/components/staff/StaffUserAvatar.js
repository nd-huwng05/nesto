import {Image, StyleSheet, View} from 'react-native';
import {STAFF_MEDIA} from '../../constants/staffMedia';

export function StaffUserAvatar({user, size = 40, style}) {
    const raw = String(user?.avatar || '').trim();
    const uri = (() => {
        if (!raw) return STAFF_MEDIA.USER_PLACEHOLDER;
        if (/^https?:\/\//i.test(raw)) return raw;
        const base = String(process.env.EXPO_PUBLIC_API_URL || '').replace(/\/api\/v1\/?$/, '');
        return base ? `${base}${raw.startsWith('/') ? raw : `/${raw}`}` : raw;
    })();
    const radius = size / 2;

    return (
        <View style={[styles.wrap, {width: size, height: size, borderRadius: radius}, style]}>
            <Image
                source={{uri}}
                style={{width: size, height: size, borderRadius: radius}}
                resizeMode="cover"
            />
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
    largeShadow: {
        shadowColor: '#8294FF',
        shadowOffset: {width: 0, height: 6},
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
    },
});
