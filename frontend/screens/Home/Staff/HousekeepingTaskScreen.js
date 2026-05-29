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
import AsyncStorage from '@react-native-async-storage/async-storage';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {EmptyState} from '../../../components/common/EmptyState';
import {StaffBranchHeader} from '../../../components/staff/StaffBranchHeader';
import {getStaffBranchInfo} from '../../../constants/staffBranchInfo';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {connectBranchTasks, connectRoomUpdates} from '../../../services/WebSocketService';
import {completeHousekeepingTask, listHousekeepingTasks, startHousekeepingTask} from '../../../services/staffApiService';

const normalizeStatus = (status) => String(status || '').toLowerCase();

function statusLabel(status) {
    return normalizeStatus(status) === 'cleaning' ? 'In Progress' : 'Needs Cleaning';
}

export default function HousekeepingTaskScreen() {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    const {user, branchId} = useStaffSession();
    const branch = getStaffBranchInfo(branchId);
    const [tasks, setTasks] = useState([]);
    const taskList = Array.isArray(tasks) ? tasks : [];
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingId, setMarkingId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const loadTasks = useCallback(async () => {
        if (!branchId) {
            setTasks([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await listHousekeepingTasks(branchId);
            const filtered = (data || [])
                .filter((t) => {
                    const status = String(t.status || '').toUpperCase();
                    return status === 'PENDING' || status === 'IN_PROGRESS';
                })
                .sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
            setTasks(filtered);
            setErrorMessage('');
        } catch (error) {
            console.error("API Error: ", error.response?.data || error.message);
            setTasks([]);
            setErrorMessage('Unable to load housekeeping tasks.');
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useFocusEffect(
        useCallback(() => {
            loadTasks();
        }, [loadTasks])
    );

    const mapWsTaskToRow = (task) => ({
        id: String(task?.id || ''),
        roomNumber: String(task?.roomNumber || task?.room_number || ''),
        status: String(task?.status || 'PENDING'),
        note: String(task?.note || ''),
    });

    useEffect(() => {
        let unsubscribeRooms = () => {};
        let unsubscribeTasks = () => {};

        (async () => {
            if (!branchId) return;
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;

            unsubscribeRooms = await connectRoomUpdates(branchId, {
                token,
                onMessage: (data) => {
                    if (data?.type === 'room_status' || data?.type === 'room_dirty') {
                        loadTasks();
                    }
                },
            });

            unsubscribeTasks = await connectBranchTasks(branchId, {
                token,
                onMessage: (data) => {
                    if (data?.type !== 'task_created' && data?.type !== 'task_updated') return;
                    const task = data?.task;
                    if (!task?.id) return;

                    const mapped = mapWsTaskToRow(task);
                    const status = String(mapped.status || '').toUpperCase();
                    if (status !== 'PENDING' && status !== 'IN_PROGRESS') return;

                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setTasks((prev) => {
                        const list = Array.isArray(prev) ? [...prev] : [];
                        const existingIndex = list.findIndex((row) => String(row.id) === mapped.id);
                        if (existingIndex >= 0) {
                            list[existingIndex] = {...list[existingIndex], ...mapped};
                            return list.sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
                        }
                        return [mapped, ...list].sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
                    });

                    if (data.type === 'task_created') {
                        const roomLabel = mapped.roomNumber ? `Room ${mapped.roomNumber}` : 'New task';
                        Alert.alert('New task', `${roomLabel} requires attention.`);
                    }
                },
            });
        })().catch((error) => {
            console.error('WebSocket error:', error?.message || error);
        });

        return () => {
            unsubscribeRooms?.();
            unsubscribeTasks?.();
        };
    }, [branchId, loadTasks]);

    const refresh = async () => {
        setRefreshing(true);
        await loadTasks();
        setRefreshing(false);
    };

    const confirmComplete = (task) => {
        Alert.alert(
            'Confirm Clean-up',
            `Mark Room ${task.roomNumber} as clean?`,
            [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Complete Task', style: 'default', onPress: () => handleComplete(task.id)},
            ],
            {cancelable: true}
        );
    };

    const handleStart = async (taskId) => {
        setMarkingId(taskId);
        try {
            const result = await startHousekeepingTask(taskId);
            if (!result.success) {
                Alert.alert('Unable to start', result.message || 'Please try again.');
                return;
            }
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setTasks((prev) =>
                (prev || []).map((row) =>
                    row.id === taskId ? {...row, status: 'IN_PROGRESS'} : row
                )
            );
        } finally {
            setMarkingId(null);
        }
    };

    const handleComplete = async (taskId) => {
        setMarkingId(taskId);
        try {
            const result = await completeHousekeepingTask(taskId);
            if (!result.success) {
                Alert.alert('Unable to complete', result.message || 'Please try again.');
                return;
            }
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            setSuccessMessage('Task completed.');
            setTimeout(() => setSuccessMessage(''), 1500);
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

                {!isLoading && !!successMessage ? (
                    <View style={styles.toast}>
                        <Text style={styles.toastText}>{successMessage}</Text>
                    </View>
                ) : null}

                {isLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#22C55E" />
                    </View>
                ) : (
                    <FlatList
                        data={taskList}
                        keyExtractor={(item) => String(item?.id ?? item?.roomNumber ?? Math.random())}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#22C55E" />}
                        renderItem={({item}) => (
                            <View style={styles.roomCard}>
                                <View style={styles.row}>
                                    <View style={styles.leftArea}>
                                        <Text style={styles.roomNumber}>Room {item.roomNumber}</Text>
                                        <View style={[styles.statusPill, String(item.status || '').toUpperCase() === 'IN_PROGRESS' ? styles.statusCleaning : styles.statusDirty]}>
                                            <Text style={styles.statusText}>
                                                {String(item.status || '').toUpperCase() === 'IN_PROGRESS' ? 'In Progress' : 'Needs Cleaning'}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        activeOpacity={0.9}
                                        disabled={markingId === item.id}
                                        onPress={() =>
                                            String(item.status || '').toUpperCase() === 'PENDING'
                                                ? handleStart(item.id)
                                                : confirmComplete(item)
                                        }
                                        style={[
                                            styles.cleanBtn,
                                            String(item.status || '').toUpperCase() === 'PENDING'
                                                ? styles.startBtn
                                                : null,
                                            markingId === item.id && styles.cleanBtnDisabled,
                                        ]}
                                    >
                                        {markingId === item.id ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <View style={styles.cleanBtnInner}>
                                                <CheckCircle size={18} color="#fff" strokeWidth={2.5} />
                                                <Text style={styles.cleanBtnText}>
                                                    {String(item.status || '').toUpperCase() === 'PENDING'
                                                        ? 'Start Task'
                                                        : 'Complete Task'}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        ItemSeparatorComponent={() => <View style={{height: 16}} />}
                        ListEmptyComponent={
                            <EmptyState
                                title="All caught up!"
                                description="No rooms need cleaning right now."
                            />
                        }
                    />
                )}
                {!isLoading && !!errorMessage ? (
                    <Text style={styles.errorText}>{errorMessage}</Text>
                ) : null}
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
    toast: {
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: '#dcfce7',
        borderWidth: 1,
        borderColor: '#86efac',
    },
    toastText: {color: '#166534', fontWeight: '700', textAlign: 'center'},
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
    startBtn: {backgroundColor: '#2563EB'},
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
    errorText: {fontSize: 13, color: '#dc2626', textAlign: 'center', paddingHorizontal: 20, paddingBottom: 12},
});
