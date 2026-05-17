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

const STATUS_STYLES = {
    pending: {bg: '#fef3c7', text: '#b45309', label: 'Pending'},
    in_progress: {bg: '#dbeafe', text: '#1d4ed8', label: 'In Progress'},
};

export default function ServiceOrderScreen() {
    const {user, branchId} = useStaffSession();
    const branch = getStaffBranchInfo(branchId);
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const loadOrders = useCallback(async () => {
        if (!branchId) {
            setOrders([]);
            setIsLoading(false);
            return;
        }
        const data = await staffPortalMockStore.listServiceOrders(branchId);
        setOrders(data);
        setIsLoading(false);
    }, [branchId]);

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            loadOrders();
        }, [loadOrders])
    );

    const refresh = async () => {
        setRefreshing(true);
        await loadOrders();
        setRefreshing(false);
    };

    const handleAccept = async (orderId) => {
        setBusyId(orderId);
        await staffPortalMockStore.acceptServiceOrder(orderId);
        await loadOrders();
        setBusyId(null);
    };

    const handleDone = async (orderId) => {
        setBusyId(orderId);
        await staffPortalMockStore.completeServiceOrder(orderId);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setBusyId(null);
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
                    <Text className="font-sf-bold text-2xl text-slate-800">Service Orders</Text>
                    <Text className="font-sf text-sm text-gray-500 mt-1 mb-2">
                        Room service and guest requests for your branch.
                    </Text>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color="#8294FF" style={{marginTop: 40}} />
                ) : (
                    <FlatList
                        data={orders}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8294FF" />
                        }
                        renderItem={({item}) => {
                            const st = STATUS_STYLES[item.status] || STATUS_STYLES.pending;
                            return (
                                <View style={[cardStyle, styles.orderCard]}>
                                    <View style={styles.orderTop}>
                                        <Text className="font-sf-bold text-base text-slate-800">
                                            Room {item.roomNumber}
                                        </Text>
                                        <View style={[styles.statusBadge, {backgroundColor: st.bg}]}>
                                            <Text style={[styles.statusLabel, {color: st.text}]}>{st.label}</Text>
                                        </View>
                                    </View>
                                    <Text className="font-sf text-slate-700 mt-2">{item.summary}</Text>
                                    <Text className="font-sf text-xs text-gray-400 mt-1">{item.createdAt}</Text>
                                    <View style={styles.actions}>
                                        {item.status === 'pending' ? (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, styles.acceptBtn]}
                                                disabled={busyId === item.id}
                                                onPress={() => handleAccept(item.id)}
                                            >
                                                <Text className="font-sf-bold text-white text-sm">Accept Order</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={[styles.actionBtn, styles.doneBtn]}
                                                disabled={busyId === item.id}
                                                onPress={() => handleDone(item.id)}
                                            >
                                                {busyId === item.id ? (
                                                    <ActivityIndicator color="#fff" size="small" />
                                                ) : (
                                                    <Text className="font-sf-bold text-white text-sm">Mark Done</Text>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text className="font-sf-bold text-slate-700 text-lg">No open orders</Text>
                                <Text className="font-sf text-sm text-gray-500 text-center mt-2">
                                    New guest requests will appear here.
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
    orderCard: {marginBottom: UI.sectionGap},
    orderTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    statusBadge: {paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20},
    statusLabel: {fontSize: 11, fontWeight: '600'},
    actions: {marginTop: 14},
    actionBtn: {
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    acceptBtn: {backgroundColor: '#8294FF'},
    doneBtn: {backgroundColor: '#059669'},
    empty: {alignItems: 'center', paddingVertical: 48},
});
