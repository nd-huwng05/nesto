import {useCallback, useEffect, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    LayoutAnimation,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {CheckCircle} from 'lucide-react-native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {StaffBranchHeader} from '../../../components/staff/StaffBranchHeader';
import {getStaffBranchInfo} from '../../../constants/staffBranchInfo';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {staffPortalMockStore} from '../../../services/staffPortalMockStore';
import {connectBookingUpdates} from '../../../services/WebSocketService';

const normalizeStatus = (status) => String(status || '').toLowerCase();

function statusLabel(status) {
    return normalizeStatus(status) === 'cleaning' ? 'In Progress' : 'Needs Cleaning';
}

export default function HousekeepingTaskScreen() {
    useEffect(() => {
        if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
            UIManager.setLayoutAnimationEnabledExperimental(true);
        }
    }, []);

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
        setIsLoading(true);
        try {
            const data = await staffPortalMockStore.listHousekeepingRooms(branchId);
            const filtered = (data || [])
                .filter((room) => {
                    const status = normalizeStatus(room.status);
                    return status === 'dirty' || status === 'cleaning';
                })
                .sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
            setRooms(filtered);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useFocusEffect(
        useCallback(() => {
            loadRooms();
        }, [loadRooms])
    );

    useEffect(() => {
        if (!branchId) return;
        connectBookingUpdates(branchId, {
            onMessage: (data) => {
                if (data.type === 'room_status' || data.type === 'room_dirty') {
                    loadRooms();
                }
            },
        });
        return () => {};
    }, [branchId, loadRooms]);

    const refresh = async () => {
        setRefreshing(true);
        await loadRooms();
        setRefreshing(false);
    };

    const confirmMarkClean = (room) => {
        Alert.alert(
            'Confirm Clean-up',
            `Mark Room ${room.roomNumber} as clean?`,
            [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Mark Clean', style: 'default', onPress: () => handleMarkClean(room.id)},
            ],
            {cancelable: true}
        );
    };

    const handleMarkClean = async (roomId) => {
        setMarkingId(roomId);
        try {
            await staffPortalMockStore.markRoomClean(roomId);
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setRooms((prev) => prev.filter((r) => r.id !== roomId));
        } finally {
            setMarkingId(null);
        }
    };

    return (
        <TabScreenLayout backgroundColor="#F8FAFC">
            <View style={styles.inner}>
                <View style={styles.headerPad}>
                    <StaffBranchHeader user={user} branchName={branch.name} branchAddress={branch.address} />
                    <Text style={styles.title}>Housekeeping Tasks</Text>
                    <Text style={styles.subtitle}>Rooms marked Dirty or Cleaning — tap when ready for guests.</Text>
                </View>

                {isLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#22C55E" />
                    </View>
                ) : (
                    <FlatList
                        data={rooms}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#22C55E" />}
                        renderItem={({item}) => (
                            <View style={styles.roomCard}>
                                <View style={styles.row}>
                                    <View style={styles.leftArea}>
                                        <Text style={styles.roomNumber}>Room {item.roomNumber}</Text>
                                        <View style={[styles.statusPill, normalizeStatus(item.status) === 'cleaning' ? styles.statusCleaning : styles.statusDirty]}>
                                            <Text style={styles.statusText}>{statusLabel(item.status)}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        disabled={markingId === item.id}
                                        onPress={() => confirmMarkClean(item)}
                                        style={[styles.cleanBtn, markingId === item.id && styles.cleanBtnDisabled]}
                                    >
                                        {markingId === item.id ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <View style={styles.cleanBtnInner}>
                                                <CheckCircle size={18} color="#fff" strokeWidth={2.5} />
                                                <Text style={styles.cleanBtnText}>Mark Clean</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        ItemSeparatorComponent={() => <View style={{height: 16}} />}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={styles.emptyTitle}>All caught up!</Text>
                                <Text style={styles.emptySubtitle}>No rooms need cleaning right now.</Text>
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
    title: {fontSize: 22, fontWeight: '700', color: '#1E293B', marginTop: 6},
    subtitle: {fontSize: 13, color: '#64748B', marginTop: 6, marginBottom: 6},
    loadingWrap: {marginTop: 40, alignItems: 'center'},
    listContent: {paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1},
    roomCard: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 2},
        marginBottom: 0,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftArea: {flex: 1, paddingRight: 12},
    roomNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E293B',
    },
    statusPill: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    statusDirty: {backgroundColor: '#FEF3C7'},
    statusCleaning: {backgroundColor: '#FFEDD5'},
    statusText: {fontSize: 13, fontWeight: '700', color: '#92400E'},
    cleanBtn: {
        backgroundColor: '#22C55E',
        borderRadius: 12,
        minHeight: 48,
        minWidth: 132,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    cleanBtnDisabled: {opacity: 0.75},
    cleanBtnInner: {flexDirection: 'row', alignItems: 'center', gap: 8},
    cleanBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    empty: {alignItems: 'center', paddingVertical: 48},
    emptyTitle: {fontSize: 18, fontWeight: '700', color: '#0F172A'},
    emptySubtitle: {fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8},
});
