import {Image, StyleSheet, View} from 'react-native';
import {STAFF_MEDIA} from '../../constants/staffMedia';

export function StaffUserAvatar({user, size = 40, style}) {
    const uri = user?.avatar || STAFF_MEDIA.USER_PLACEHOLDER;
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
