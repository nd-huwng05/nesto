import {Image, StyleSheet, Text, View} from 'react-native';
import {STAFF_MEDIA} from '../../constants/staffMedia';
import {StaffUserAvatar} from './StaffUserAvatar';

const HOTEL_SIZE = 40;

export function StaffBranchHeader({user, branchName, branchAddress}) {
    return (
        <View style={styles.header}>
            <Image
                source={{uri: STAFF_MEDIA.HOTEL_AVATAR || STAFF_MEDIA.BRANCH_LOGO}}
                style={styles.hotelImage}
                resizeMode="cover"
            />
            <View style={styles.info}>
                <Text style={styles.branchName} numberOfLines={1}>
                    {branchName}
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
