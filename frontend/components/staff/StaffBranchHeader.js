import {Image, StyleSheet, Text, View} from 'react-native';
import {resolveMediaUrl} from '../../utils/mediaUrl';
import {StaffUserAvatar} from './StaffUserAvatar';

const HOTEL_SIZE = 40;

export function StaffBranchHeader({user, branchName, branchAddress, branchImage = ''}) {
    const imageUri = resolveMediaUrl(branchImage);
    const initials = String(branchName || 'N').trim().charAt(0).toUpperCase() || 'N';

    return (
        <View style={styles.header}>
            {imageUri ? (
                <Image source={{uri: imageUri}} style={styles.hotelImage} resizeMode="cover" />
            ) : (
                <View style={[styles.hotelImage, styles.hotelFallback]}>
                    <Text style={styles.hotelFallbackText}>{initials}</Text>
                </View>
            )}
            <View style={styles.info}>
                <Text style={styles.branchName} numberOfLines={1}>
                    {branchName || 'Branch'}
                </Text>
                <Text style={styles.branchAddress} numberOfLines={2}>
                    {branchAddress || '—'}
                </Text>
            </View>
            <StaffUserAvatar user={user} size={HOTEL_SIZE} style={styles.userAvatar} />
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    hotelImage: {
        width: HOTEL_SIZE,
        height: HOTEL_SIZE,
        borderRadius: 999,
        marginRight: 12,
        backgroundColor: '#e2e8f0',
    },
    hotelFallback: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#dbeafe',
    },
    hotelFallbackText: {
        color: '#8294FF',
        fontWeight: '700',
        fontSize: 16,
    },
    info: {
        flex: 1,
        minWidth: 0,
        marginRight: 8,
    },
    branchName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8294FF',
    },
    branchAddress: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 3,
        lineHeight: 16,
    },
    userAvatar: {
        marginLeft: 0,
    },
});
