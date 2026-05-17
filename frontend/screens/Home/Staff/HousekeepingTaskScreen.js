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

function statusLabel(status) {
    return status === 'cleaning' ? 'Cleaning in progress' : 'Needs cleaning';
}

export default function HousekeepingTaskScreen() {
    const {user, branchId} = useStaffSession();
    const branch = getStaffBranchInfo(branchId);
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingId, setMarkingId] = useState(null);

    const loadRooms = useCallback(async () => {
        if (!branchId) {
            setRooms([]);
            setIsLoading(false);
            return;
        }
        const data = await staffPortalMockStore.listHousekeepingRooms(branchId);
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

    const handleMarkClean = async (roomId) => {
        setMarkingId(roomId);
        await staffPortalMockStore.markRoomClean(roomId);
        setRooms((prev) => prev.filter((r) => r.id !== roomId));
        setMarkingId(null);
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
                    <Text className="font-sf-bold text-2xl text-slate-800">Housekeeping Tasks</Text>
                    <Text className="font-sf text-sm text-gray-500 mt-1 mb-2">
                        Rooms marked Dirty or Cleaning — tap when ready for guests.
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
                                <View style={styles.roomHeader}>
                                    <Text style={styles.roomNumber}>Room {item.roomNumber}</Text>
                                    <View
                                        style={[
                                            styles.statusPill,
                                            item.status === 'cleaning'
                                                ? styles.statusCleaning
                                                : styles.statusDirty,
                                        ]}
                                    >
                                        <Text style={styles.statusText}>{statusLabel(item.status)}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    disabled={markingId === item.id}
                                    onPress={() => handleMarkClean(item.id)}
                                    style={styles.cleanBtn}
                                >
                                    {markingId === item.id ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.cleanBtnText}>Mark as Clean</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text className="font-sf-bold text-slate-700 text-lg">All caught up!</Text>
                                <Text className="font-sf text-sm text-gray-500 text-center mt-2">
                                    No rooms need cleaning right now.
                                </Text>
                            </View>
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
    listContent: {paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1},
    roomCard: {marginBottom: UI.sectionGap},
    roomHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    roomNumber: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1e293b',
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusDirty: {backgroundColor: '#fef3c7'},
    statusCleaning: {backgroundColor: '#dbeafe'},
    statusText: {fontSize: 11, fontWeight: '600', color: '#475569'},
    cleanBtn: {
        backgroundColor: '#8294FF',
        borderRadius: 14,
        minHeight: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cleanBtnText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '700',
    },
    empty: {alignItems: 'center', paddingVertical: 48},
});
