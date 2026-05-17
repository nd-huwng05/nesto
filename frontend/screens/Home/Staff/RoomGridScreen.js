import {useCallback, useState} from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
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
import {STAFF_MEDIA} from '../../../constants/staffMedia';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {staffPortalMockStore} from '../../../services/staffPortalMockStore';
import {UI, cardStyle} from '../../../styles/uiTokens';

function formatHourly(amount) {
    return `${Number(amount).toLocaleString('vi-VN')} VND/h`;
}

export default function RoomGridScreen({navigation}) {
    const {user, branchId} = useStaffSession();
    const branch = getStaffBranchInfo(branchId);
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadRooms = useCallback(async () => {
        if (!branchId) {
            setRooms([]);
            setIsLoading(false);
            return;
        }
        const data = await staffPortalMockStore.listReceptionRooms(branchId);
        setRooms(data);
        setIsLoading(false);
    }, [branchId]);

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            loadRooms();
        }, [loadRooms])
    );

    const refresh = async () => {
        setRefreshing(true);
        await loadRooms();
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
                    <Text className="font-sf-bold text-2xl text-slate-800">Rooms</Text>
                    <Text className="font-sf text-sm text-gray-500 mt-1 mb-2">
                        View availability and start a booking for your branch.
                    </Text>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color="#8294FF" style={{marginTop: 40}} />
                ) : (
                    <FlatList
                        data={rooms}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8294FF" />
                        }
                        renderItem={({item}) => (
                            <View style={[cardStyle, styles.roomCard]}>
                                <View style={styles.roomRow}>
                                    <Image
                                        source={{uri: STAFF_MEDIA.ROOM_IMAGE}}
                                        style={styles.thumb}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.roomBody}>
                                        <View style={styles.topRow}>
                                            <Text className="font-sf-bold text-base text-slate-800">
                                                Room {item.roomNumber}
                                            </Text>
                                            <Text style={styles.hourlyRate}>
                                                {formatHourly(item.hourlyRate)}
                                            </Text>
                                        </View>
                                        <Text className="font-sf text-xs text-gray-500 mt-1">
                                            Type: {item.type} · Feature: {item.feature}
                                        </Text>
                                        <Text className="font-sf text-xs text-gray-400 mt-0.5 capitalize">
                                            Status: {item.status}
                                        </Text>
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={styles.bookBtn}
                                            onPress={() =>
                                                navigation.navigate('StaffCreateBookingScreen', {
                                                    roomId: item.id,
                                                    roomNumber: item.roomNumber,
                                                    hourlyRate: item.hourlyRate,
                                                    roomType: item.type,
                                                })
                                            }
                                        >
                                            <Text className="font-sf-semi text-primary text-sm">Book now</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={
                            <Text className="font-sf text-center text-gray-500 py-12">No rooms found.</Text>
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
    roomCard: {marginBottom: UI.sectionGap},
    roomRow: {flexDirection: 'row'},
    thumb: {
        width: 72,
        height: 72,
        borderRadius: 12,
        backgroundColor: '#e2e8f0',
        marginRight: 12,
    },
    roomBody: {flex: 1, minWidth: 0},
    topRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
    hourlyRate: {
        fontSize: 13,
        fontWeight: '700',
        color: '#059669',
    },
    bookBtn: {
        alignSelf: 'flex-start',
        marginTop: 10,
    },
});
