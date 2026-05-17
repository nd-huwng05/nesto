import {useCallback, useState} from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {StaffBranchHeader} from '../../../components/staff/StaffBranchHeader';
import {getStaffBranchInfo} from '../../../constants/staffBranchInfo';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {staffPortalMockStore} from '../../../services/staffPortalMockStore';
import {UI, cardStyle} from '../../../styles/uiTokens';

function formatVnd(amount) {
    return `${amount.toLocaleString('vi-VN')} VND`;
}

function badgeStyle(status) {
    if (status === 'checked_in') return styles.badgeInHouse;
    if (status === 'checked_out') return styles.badgeDone;
    return styles.badgePending;
}

export default function BookingsScreen({navigation}) {
    const {user, branchId} = useStaffSession();
    const branch = getStaffBranchInfo(branchId);
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadBookings = useCallback(async () => {
        if (!branchId) {
            setBookings([]);
            setIsLoading(false);
            return;
        }
        const data = await staffPortalMockStore.listBookings(branchId);
        setBookings(data);
        setIsLoading(false);
    }, [branchId]);

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            loadBookings();
        }, [loadBookings])
    );

    const refresh = async () => {
        setRefreshing(true);
        await loadBookings();
        setRefreshing(false);
    };

    return (
        <TabScreenLayout backgroundColor={UI.screenBg}>
            <View style={styles.inner}>
                <View style={styles.headerPad}>
                    <StaffBranchHeader
                        user={user}
                        branchName={branch.name}
                        branchAddress={branch.address}
                    />
                    <Text className="font-sf-bold text-2xl text-slate-800">Bookings</Text>
                    <Text className="font-sf text-sm text-gray-500 mt-1 mb-2">
                        Pending: confirm check-in. In house: process check-out and payment.
                    </Text>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color="#8294FF" style={{marginTop: 40}} />
                ) : (
                    <FlatList
                        data={bookings}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8294FF" />
                        }
                        renderItem={({item}) => (
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() =>
                                    navigation.navigate('BookingDetailScreen', {bookingId: item.id})
                                }
                            >
                                <View style={[cardStyle, styles.bookingCard]}>
                                    <View style={styles.bookingTop}>
                                        <Text className="font-sf-bold text-base text-slate-800">
                                            {item.guestName}
                                        </Text>
                                        <View style={[styles.badge, badgeStyle(item.status)]}>
                                            <Text style={styles.badgeText}>{item.statusLabel}</Text>
                                        </View>
                                    </View>
                                    <Text className="font-sf text-sm text-gray-600 mt-2">
                                        Room {item.roomNumber} · {item.checkIn} → {item.checkOut}
                                    </Text>
                                    <Text className="font-sf-bold text-sm text-emerald-600 mt-2">
                                        {formatVnd(item.total)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text className="font-sf text-center text-gray-500 py-12">No bookings yet.</Text>
                        }
                    />
                )}
            </View>
        </TabScreenLayout>
    );
}

const styles = StyleSheet.create({
    inner: {flex: 1},
    headerPad: {paddingHorizontal: 20, paddingTop: 8},
    listContent: {paddingHorizontal: 20, paddingBottom: 24},
    bookingCard: {marginBottom: UI.sectionGap},
    bookingTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    badge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12},
    badgePending: {backgroundColor: '#fef3c7'},
    badgeInHouse: {backgroundColor: '#dbeafe'},
    badgeDone: {backgroundColor: '#dcfce7'},
    badgeText: {fontSize: 10, fontWeight: '600', color: '#475569'},
});
