import {Image, StyleSheet, Text, View} from 'react-native';
import {STAFF_MEDIA} from '../../constants/staffMedia';
import {StaffUserAvatar} from './StaffUserAvatar';
import {cardStyle} from '../../styles/uiTokens';

export function StaffBranchHeader({user, branchName, branchAddress}) {
    return (
        <View style={[cardStyle, styles.header]}>
            <Image
                source={{uri: STAFF_MEDIA.BRANCH_LOGO}}
                style={styles.branchLogo}
                resizeMode="cover"
            />
            <View style={styles.info}>
                <Text style={styles.branchName} numberOfLines={1}>
                    {branchName}
                </Text>
                {branchAddress ? (
                    <Text style={styles.branchAddress} numberOfLines={2}>
                        {branchAddress}
                    </Text>
                ) : null}
            </View>
            <StaffUserAvatar user={user} size={40} style={styles.avatarMargin} />
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    branchLogo: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 12,
        backgroundColor: '#e2e8f0',
    },
    info: {
        flex: 1,
        minWidth: 0,
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
    avatarMargin: {
        marginLeft: 8,
    },
});
