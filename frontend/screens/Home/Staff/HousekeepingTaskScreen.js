import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {CheckCircle} from 'lucide-react-native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {EmptyState} from '../../../components/common/EmptyState';
import {StaffBranchHeader} from '../../../components/staff/StaffBranchHeader';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {useStaffBranch} from '../../../hooks/staff/useStaffBranch';
import {connectBranchTasks, connectRoomUpdates} from '../../../services/WebSocketService';
import {
    completeHousekeepingTask,
    dedupeHousekeepingTasks,
    listHousekeepingTasks,
    normalizeHousekeepingTask,
    startHousekeepingTask,
} from '../../../services/staffApiService';
import {UI} from '../../../styles/uiTokens';
import {normalizeRoomStatus, parseRoomStatusWsPayload} from '../../../utils/roomStatus';

const ACTIVE_STATUSES = new Set(['PENDING', 'IN_PROGRESS']);

function isActiveHousekeepingTask(task) {
    if (!task || !ACTIVE_STATUSES.has(task.status)) return false;
    return normalizeRoomStatus(task.roomStatus) !== 'AVAILABLE';
}

function removeTasksForRoom(list, target) {
    const safeRoomId = String(target?.roomId || target?.room_id || '').trim();
    const safeRoomNumber = String(target?.roomNumber || target?.room_number || '').trim();
    const safeTaskId = String(target?.taskId || target?.id || '').trim();
    return (Array.isArray(list) ? list : []).filter((row) => {
        if (safeTaskId && String(row.id) === safeTaskId) return false;
        if (safeRoomId && String(row.room_id || row.roomId || '') === safeRoomId) return false;
        if (safeRoomNumber && String(row.roomNumber || row.room_number || '') === safeRoomNumber) return false;
        return true;
    });
}

function sortTasks(rows) {
    return [...rows].sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
}

function HousekeepingTaskCard({item, markingId, busy, onStart, onComplete}) {
    const isPending = item.status === 'PENDING';
    const metaParts = [item.roomType, item.floorLabel].filter(Boolean);
    const disabled = busy || markingId === item.id;

    return (
        <View style={styles.roomCard}>
            <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                    <Text style={styles.roomNumber}>
                        Room {item.roomNumber || '—'}
                    </Text>
                    {metaParts.length ? (
                        <Text style={styles.roomMeta}>{metaParts.join(' · ')}</Text>
                    ) : null}
                    {item.note ? (
                        <Text style={styles.taskNote} numberOfLines={2}>
                            {item.note}
                        </Text>
                    ) : null}
                    <View
                        style={[
                            styles.statusPill,
                            isPending ? styles.statusDirty : styles.statusCleaning,
                        ]}
                    >
                        <Text style={styles.statusText}>{item.statusLabel}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    activeOpacity={0.9}
                    disabled={disabled}
                    onPress={() => (isPending ? onStart(item) : onComplete(item))}
                    style={[
                        styles.actionBtn,
                        isPending ? styles.startBtn : styles.completeBtn,
                        disabled && styles.actionBtnDisabled,
                    ]}
                >
                    {markingId === item.id ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <View style={styles.actionBtnInner}>
                            <CheckCircle size={18} color="#fff" strokeWidth={2.5} />
                            <Text style={styles.actionBtnText}>
                                {isPending ? 'Start Task' : 'Complete Task'}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function HousekeepingTaskScreen() {
    const {user, branchId} = useStaffSession();
    const {branch} = useStaffBranch(branchId);
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingId, setMarkingId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const markingIdRef = useRef(null);
    const reloadTimerRef = useRef(null);
    const hasLoadedRef = useRef(false);

    const showToast = useCallback((message, durationMs = 1800) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(''), durationMs);
    }, []);

    const taskList = useMemo(
        () =>
            sortTasks(
                dedupeHousekeepingTasks(
                    Array.isArray(tasks) ? tasks.filter(isActiveHousekeepingTask) : []
                )
            ),
        [tasks]
    );

    const loadTasks = useCallback(async ({silent = false} = {}) => {
        if (!branchId) {
            setTasks([]);
            setIsLoading(false);
            hasLoadedRef.current = false;
            return;
        }
        if (!silent) {
            setIsLoading(true);
        }
        try {
            const data = await listHousekeepingTasks(branchId);
            setTasks(data || []);
            setErrorMessage('');
            hasLoadedRef.current = true;
        } catch (error) {
            console.error('API Error: ', error.response?.data || error.message);
            if (!silent) {
                setTasks([]);
            }
            setErrorMessage('Unable to load housekeeping tasks.');
        } finally {
            if (!silent) {
                setIsLoading(false);
            }
        }
    }, [branchId]);

    const scheduleSilentReload = useCallback(() => {
        if (markingIdRef.current) return;
        if (reloadTimerRef.current) {
            clearTimeout(reloadTimerRef.current);
        }
        reloadTimerRef.current = setTimeout(() => {
            loadTasks({silent: true}).catch(() => {});
        }, 600);
    }, [loadTasks]);

    useFocusEffect(
        useCallback(() => {
            loadTasks({silent: hasLoadedRef.current});
        }, [loadTasks])
    );

    useEffect(() => {
        let unsubscribeRooms = () => {};
        let unsubscribeTasks = () => {};

        const mergeIncomingTask = (taskPayload) => {
            const mapped = normalizeHousekeepingTask(taskPayload);
            if (!mapped?.id) return;

            if (!ACTIVE_STATUSES.has(mapped.status)) {
                setTasks((prev) => dedupeHousekeepingTasks(removeTasksForRoom(prev, mapped)));
                return;
            }

            if (normalizeRoomStatus(mapped.roomStatus) === 'AVAILABLE') {
                setTasks((prev) => dedupeHousekeepingTasks(removeTasksForRoom(prev, mapped)));
                return;
            }

            setTasks((prev) => {
                const list = Array.isArray(prev) ? [...prev] : [];
                const roomKey = String(mapped.roomNumber || mapped.room_number || mapped.id);
                const withoutRoomDupes = list.filter(
                    (row) => String(row.roomNumber || row.room_number || row.id) !== roomKey
                );
                const existingIndex = withoutRoomDupes.findIndex((row) => String(row.id) === mapped.id);
                if (existingIndex >= 0) {
                    withoutRoomDupes[existingIndex] = {...withoutRoomDupes[existingIndex], ...mapped};
                    return sortTasks(dedupeHousekeepingTasks(withoutRoomDupes));
                }
                return sortTasks(dedupeHousekeepingTasks([mapped, ...withoutRoomDupes]));
            });
        };

        (async () => {
            if (!branchId) return;

            unsubscribeRooms = await connectRoomUpdates(branchId, {
                onMessage: (data) => {
                    if (data?.type === 'housekeeping_task_created' && data?.task) {
                        mergeIncomingTask(data.task);
                        return;
                    }

                    const parsed = parseRoomStatusWsPayload(data);
                    if (parsed?.status === 'AVAILABLE') {
                        setTasks((prev) => dedupeHousekeepingTasks(removeTasksForRoom(prev, parsed)));
                        return;
                    }

                    const status = String(data?.status || '').toUpperCase();
                    if (
                        data?.type === 'room_status' ||
                        data?.type === 'room_dirty' ||
                        status === 'DIRTY' ||
                        status === 'CLEANING'
                    ) {
                        scheduleSilentReload();
                    }
                },
            });

            unsubscribeTasks = await connectBranchTasks(branchId, {
                onMessage: (data) => {
                    if (data?.type !== 'task_created' && data?.type !== 'task_updated') return;
                    mergeIncomingTask(data?.task);
                    if (data.type === 'task_created') {
                        const mapped = normalizeHousekeepingTask(data?.task);
                        const roomLabel = mapped?.roomNumber ? `Room ${mapped.roomNumber}` : 'New room';
                        showToast(`${roomLabel} added to your list.`);
                    }
                },
            });
        })().catch((error) => {
            console.error('WebSocket error:', error?.message || error);
        });

        return () => {
            unsubscribeRooms?.();
            unsubscribeTasks?.();
            if (reloadTimerRef.current) {
                clearTimeout(reloadTimerRef.current);
            }
        };
    }, [branchId, loadTasks, scheduleSilentReload, showToast]);

    const refresh = async () => {
        setRefreshing(true);
        await loadTasks({silent: true});
        setRefreshing(false);
    };

    const handleStart = async (task) => {
        markingIdRef.current = task.id;
        setMarkingId(task.id);
        try {
            const result = await startHousekeepingTask(task.id);
            if (!result.success) {
                Alert.alert('Unable to start', result.message || 'Please try again.');
                return;
            }
            setTasks((prev) =>
                sortTasks(
                    (prev || []).map((row) =>
                        row.id === task.id
                            ? {
                                  ...row,
                                  ...(result.data || {}),
                                  status: 'IN_PROGRESS',
                                  statusLabel: 'In Progress',
                                  roomStatus: 'CLEANING',
                              }
                            : row
                    )
                )
            );
        } finally {
            markingIdRef.current = null;
            setMarkingId(null);
        }
    };

    const handleComplete = async (task) => {
        markingIdRef.current = task.id;
        setMarkingId(task.id);
        try {
            const result = await completeHousekeepingTask(task.id);
            if (!result.success) {
                Alert.alert('Unable to complete', result.message || 'Please try again.');
                return;
            }
            setTasks((prev) =>
                removeTasksForRoom(prev, {
                    taskId: task.id,
                    roomId: result.data?.room_id || result.data?.roomId,
                    roomNumber: result.data?.roomNumber || result.data?.room_number,
                })
            );
            showToast(`Room ${task.roomNumber || '—'} is clean and available.`);
        } finally {
            markingIdRef.current = null;
            setMarkingId(null);
        }
    };

    const busy = Boolean(markingId);

    return (
        <TabScreenLayout backgroundColor={UI.screenBg}>
            <View style={styles.inner}>
                <View style={styles.headerPad}>
                    <StaffBranchHeader
                        user={user}
                        branchName={branch?.name}
                        branchAddress={branch?.address}
                        branchImage={branch?.image}
                    />
                    <Text className="font-sf-bold text-2xl text-slate-800">Housekeeping Tasks</Text>
                    <Text className="font-sf text-sm text-gray-500 mt-1 mb-2">
                        Dirty or cleaning rooms — start work, then complete when ready for guests.
                    </Text>
                </View>

                {!isLoading && !!successMessage ? (
                    <View style={styles.toast}>
                        <Text style={styles.toastText}>{successMessage}</Text>
                    </View>
                ) : null}

                {isLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#8294FF" />
                    </View>
                ) : (
                    <FlatList
                        data={taskList}
                        keyExtractor={(item) => String(item.id)}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8294FF" />
                        }
                        renderItem={({item}) => (
                            <HousekeepingTaskCard
                                item={item}
                                markingId={markingId}
                                busy={busy}
                                onStart={handleStart}
                                onComplete={handleComplete}
                            />
                        )}
                        ItemSeparatorComponent={() => <View style={{height: UI.sectionGap}} />}
                        ListEmptyComponent={
                            <EmptyState
                                title="All caught up!"
                                description="No rooms need cleaning right now."
                            />
                        }
                    />
                )}
                {!isLoading && !!errorMessage ? (
                    <Text className="font-sf text-center text-red-500 px-6 pb-4">{errorMessage}</Text>
                ) : null}
            </View>
        </TabScreenLayout>
    );
}

const styles = StyleSheet.create({
    inner: {flex: 1},
    headerPad: {paddingHorizontal: 20, paddingTop: 8},
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
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    cardLeft: {flex: 1, minWidth: 0, paddingRight: 4},
    roomNumber: {fontSize: 22, fontWeight: '800', color: '#0f172a'},
    roomMeta: {fontSize: 14, fontWeight: '600', color: '#475569', marginTop: 4},
    taskNote: {fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 17},
    statusPill: {
        marginTop: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    statusDirty: {backgroundColor: '#fef9c3'},
    statusCleaning: {backgroundColor: '#ffedd5'},
    statusText: {fontSize: 11, fontWeight: '700', color: '#854d0e'},
    actionBtn: {
        borderRadius: 12,
        minHeight: 48,
        minWidth: 132,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 14,
        flexShrink: 0,
    },
    startBtn: {backgroundColor: '#8294FF'},
    completeBtn: {backgroundColor: '#059669'},
    actionBtnDisabled: {opacity: 0.75},
    actionBtnInner: {flexDirection: 'row', alignItems: 'center', gap: 8},
    actionBtnText: {color: '#ffffff', fontSize: 14, fontWeight: '700'},
});
