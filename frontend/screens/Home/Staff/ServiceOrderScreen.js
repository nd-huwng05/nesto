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
import {CheckCircle, Car, Utensils, Flower2, Bell, Phone} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {EmptyState} from '../../../components/common/EmptyState';
import {StaffBranchHeader} from '../../../components/staff/StaffBranchHeader';
import {getStaffBranchInfo} from '../../../constants/staffBranchInfo';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {connectServiceUpdates} from '../../../services/WebSocketService';
import {
    listServiceOrders,
    acceptServiceOrder,
    completeServiceOrder,
    cancelServiceOrder,
} from '../../../services/staffApiService';

const STATUS_STYLES = {
    PENDING: {bg: '#FEF3C7', text: '#92400E', label: 'Pending'},
    IN_PROGRESS: {bg: '#DBEAFE', text: '#1D4ED8', label: 'In Progress'},
    COMPLETED: {bg: '#DCFCE7', text: '#166534', label: 'Completed'},
    CANCELLED: {bg: '#FEE2E2', text: '#991b1b', label: 'Cancelled'},
};

const DEPARTMENT_META = {
    SPA: {title: 'Spa Appointments', subtitle: 'Massage and wellness requests for your branch.', icon: Flower2},
    TRANSPORT: {title: 'Transport Schedule', subtitle: 'Driver pickups and drop-offs for your branch.', icon: Car},
    RESTAURANT: {title: 'Restaurant Reservations', subtitle: 'Table reservations and hosting for your branch.', icon: Utensils},
    ROOM_SERVICE: {title: 'Room Service Requests', subtitle: 'Guest room service requests for your branch.', icon: Bell},
};

const normalizeStatus = (status) => String(status || '').toUpperCase();
const normalizeDepartment = (department) => String(department || '').trim().toUpperCase();

const formatRoomLabel = (roomNumber) => {
    const value = String(roomNumber || '').trim();
    if (!value) return 'Room';
    return /^room\s/i.test(value) ? value : `Room ${value}`;
};

const getDepartmentMeta = (department) =>
    DEPARTMENT_META[normalizeDepartment(department)] || {
        title: 'Service Requests',
        subtitle: 'Only your branch and department requests are shown.',
    };

export default function ServiceOrderScreen() {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }

    const {user, branchId} = useStaffSession();
    const branch = getStaffBranchInfo(branchId);
    const department = normalizeDepartment(user?.department);
    const departmentMeta = getDepartmentMeta(department);
    const [orders, setOrders] = useState([]);
    const orderList = Array.isArray(orders) ? orders : [];
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    const loadOrders = useCallback(async () => {
        if (!branchId || !department) {
            setOrders([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await listServiceOrders(branchId);
            setOrders(
                (data || []).filter(
                    (order) =>
                        order.branchId === branchId &&
                        normalizeDepartment(order.category) === department
                )
            );
            setErrorMessage('');
        } catch (error) {
            console.error("API Error: ", error.response?.data || error.message);
            setOrders([]);
            setErrorMessage('Unable to load service orders.');
        } finally {
            setIsLoading(false);
        }
    }, [branchId, department]);

    useFocusEffect(
        useCallback(() => {
            loadOrders();
        }, [loadOrders])
    );

    useEffect(() => {
        let unsubscribe;
        (async () => {
            if (!branchId) return;
            const token = await AsyncStorage.getItem('access_token');
            if (!token) return;
            unsubscribe = await connectServiceUpdates(branchId, {
                token,
                onMessage: (data) => {
                    if (data?.type === 'service' || data?.type === 'service_update') {
                        loadOrders();
                    }
                },
            });
        })().catch((error) => {
            console.error("API Error: ", error.response?.data || error.message);
        });
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [branchId, loadOrders]);

    const refresh = async () => {
        setRefreshing(true);
        await loadOrders();
        setRefreshing(false);
    };

    const confirmAccept = (order) => {
        Alert.alert(
            'Accept & Process?',
            `Start preparing the request for ${formatRoomLabel(order.roomNumber)}?`,
            [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Accept & Process', onPress: () => handleAccept(order.id)},
            ]
        );
    };

    const confirmDeliver = (order) => {
        Alert.alert(
            'Mark Completed?',
            `Confirm completion for ${formatRoomLabel(order.roomNumber)}?`,
            [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Mark Completed', onPress: () => handleDone(order.id)},
            ]
        );
    };

    const confirmCancel = (order) => {
        Alert.alert(
            'Cancel request?',
            `Cancel the request for ${formatRoomLabel(order.roomNumber)}?`,
            [
                {text: 'Keep', style: 'cancel'},
                {text: 'Cancel request', style: 'destructive', onPress: () => handleCancel(order.id)},
            ]
        );
    };

    const handleAccept = async (orderId) => {
        setBusyId(orderId);
        try {
            const result = await acceptServiceOrder(orderId, user?.name || null);
            if (!result.success) {
                Alert.alert('Unable to accept', result.message || 'Please try again.');
                return;
            }
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setOrders((prev) =>
                prev.map((order) =>
                    order.id === orderId ? (result.data || {...order, status: 'IN_PROGRESS'}) : order
                )
            );
        } finally {
            setBusyId(null);
        }
    };

    const handleDone = async (orderId) => {
        setBusyId(orderId);
        try {
            const result = await completeServiceOrder(orderId);
            if (!result.success) {
                Alert.alert('Unable to complete', result.message || 'Please try again.');
                return;
            }
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setOrders((prev) => prev.filter((o) => o.id !== orderId));
        } finally {
            setBusyId(null);
        }
    };

    const handleCancel = async (orderId) => {
        setBusyId(orderId);
        try {
            const result = await cancelServiceOrder(orderId);
            if (!result.success) {
                Alert.alert('Unable to cancel', result.message || 'Please try again.');
                return;
            }
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setOrders((prev) => prev.filter((o) => o.id !== orderId));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <TabScreenLayout backgroundColor="#F8FAFC">
            <View style={styles.inner}>
                <View style={styles.headerPad}>
                    <StaffBranchHeader user={user} branchName={branch.name} branchAddress={branch.address} />
                    <Text style={styles.title}>{departmentMeta.title}</Text>
                    <Text style={styles.subtitle}>{departmentMeta.subtitle}</Text>
                </View>

                {isLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#8294FF" />
                    </View>
                ) : (
                    <FlatList
                        data={orderList}
                        keyExtractor={(item) => String(item?.id ?? item?.roomNumber ?? Math.random())}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8294FF" />}
                        renderItem={({item}) => {
                            const statusKey = normalizeStatus(item.status);
                            const st = STATUS_STYLES[statusKey] || STATUS_STYLES.PENDING;
                            const Icon = departmentMeta.icon || Utensils;
                            return (
                                <View style={styles.orderCard}>
                                    <View style={styles.orderTop}>
                                        <Text style={styles.roomText}>{formatRoomLabel(item.roomNumber)}</Text>
                                        <View style={[styles.statusBadge, {backgroundColor: st.bg}]}>
                                            <Text style={[styles.statusLabel, {color: st.text}]}>{st.label}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.itemsWrap}>
                                        {(item.items || []).map((line, index) => (
                                            <View key={`${item.id}_${index}`} style={styles.itemRow}>
                                                <Text style={styles.bullet}>•</Text>
                                                <Text style={styles.itemText}>{line}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <Text style={styles.timestamp}>{item.timestamp}</Text>

                                    <View style={styles.guestRow}>
                                        <Text style={styles.guestName}>{item.guestName || 'Guest'}</Text>
                                        <TouchableOpacity
                                            onPress={() => {}}
                                            style={styles.phoneWrap}
                                        >
                                            <Phone size={16} color="#475569" />
                                            <Text style={styles.guestPhone}>{item.guestPhone || ''}</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {statusKey === 'IN_PROGRESS' && item.assignedStaff ? (
                                        <Text style={styles.assignedText}>Assigned to: {item.assignedStaff}</Text>
                                    ) : null}

                                    <View style={styles.actions}>
                                        {statusKey === 'PENDING' ? (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, styles.acceptBtn]}
                                                disabled={busyId === item.id}
                                                onPress={() => confirmAccept(item)}
                                            >
                                                <View style={styles.buttonContent}>
                                                    <Icon size={18} color="#fff" strokeWidth={2.25} />
                                                    <Text style={styles.actionText}>Accept & Process</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ) : statusKey === 'IN_PROGRESS' ? (
                                            <View style={styles.inProgressActions}>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, styles.doneBtn, styles.actionHalf]}
                                                    disabled={busyId === item.id}
                                                    onPress={() => confirmDeliver(item)}
                                                >
                                                    {busyId === item.id ? (
                                                        <ActivityIndicator color="#fff" size="small" />
                                                    ) : (
                                                        <View style={styles.buttonContent}>
                                                            <CheckCircle size={18} color="#fff" strokeWidth={2.25} />
                                                            <Text style={styles.actionText}>Complete</Text>
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, styles.cancelBtn, styles.actionHalf]}
                                                    disabled={busyId === item.id}
                                                    onPress={() => confirmCancel(item)}
                                                >
                                                    <Text style={styles.actionText}>Cancel</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : null}
                                    </View>
                                </View>
                            );
                        }}
                        ItemSeparatorComponent={() => <View style={{height: 16}} />}
                        ListEmptyComponent={
                            <EmptyState
                                title="No active requests"
                                description={`No active ${String(departmentMeta.title || 'requests').toLowerCase()} for your branch.`}
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
    listContent: {paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1},
    orderCard: {
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
    orderTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    roomText: {fontSize: 22, fontWeight: '700', color: '#1E293B'},
    statusBadge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999},
    statusLabel: {fontSize: 11, fontWeight: '700'},
    itemsWrap: {marginTop: 14},
    itemRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6},
    bullet: {fontSize: 16, lineHeight: 22, color: '#475569', marginRight: 8},
    itemText: {flex: 1, fontSize: 14, lineHeight: 22, color: '#334155'},
    timestamp: {fontSize: 12, color: '#94A3B8', marginTop: 4},
    guestRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10},
    guestName: {fontSize: 14, color: '#0F172A', fontWeight: '600'},
    guestPhone: {fontSize: 13, color: '#2563EB', marginLeft: 8},
    phoneWrap: {flexDirection: 'row', alignItems: 'center'},
    assignedText: {marginTop: 8, color: '#1D4ED8', fontWeight: '700'},
    actions: {marginTop: 16},
    inProgressActions: {flexDirection: 'row', gap: 10},
    actionHalf: {flex: 1},
    actionBtn: {
        borderRadius: 12,
        minHeight: 48,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptBtn: {backgroundColor: '#8294FF'},
    doneBtn: {backgroundColor: '#22C55E'},
    cancelBtn: {backgroundColor: '#ef4444'},
    buttonContent: {flexDirection: 'row', alignItems: 'center'},
    actionText: {color: '#FFFFFF', fontSize: 15, fontWeight: '700', marginLeft: 8},
    empty: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64},
    emptyText: {fontSize: 15, color: '#64748B', textAlign: 'center'},
    errorText: {fontSize: 13, color: '#dc2626', textAlign: 'center', paddingHorizontal: 20, paddingBottom: 12},
});
