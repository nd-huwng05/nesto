import {useCallback, useState, useEffect, useRef} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    Dimensions,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {TabScreenLayout} from '../../components/common/TabScreenLayout';
import {StaffBranchHeader} from '../../components/staff/StaffBranchHeader';
import {UI} from '../../styles/uiTokens';
import {roomService, bookingService} from '../../services/HotelService';
import {useStaffSession} from '../../hooks/staff/useStaffSession';

const {width} = Dimensions.get('window');
const ROOM_CARD_WIDTH = (width - 48) / 2;

const STATUS_COLORS = {
    available: {bg: '#dcfce7', text: '#166534', label: 'Available'},
    occupied: {bg: '#fee2e2', text: '#991b1b', label: 'Occupied'},
    cleaning: {bg: '#fef9c3', text: '#854d0e', label: 'Cleaning'},
    dirty: {bg: '#fef3c7', text: '#92400e', label: 'Dirty'},
    maintenance: {bg: '#f3f4f6', text: '#6b7280', label: 'Maintenance'},
};

export default function StaffRoomGridScreen({navigation}) {
    const {user, branchId} = useStaffSession();
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const wsRef = useRef(null);

    const loadRooms = useCallback(async () => {
        if (!branchId) {
            setRooms([]);
            setIsLoading(false);
            return;
        }
        try {
            const response = await roomService.list({branch_id: branchId});
            setRooms(response.results || response);
        } catch (error) {
            console.error('Load rooms error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    const connectWebSocket = useCallback(() => {
        if (!branchId) return;
        const WS_URL = `${process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/rooms/${branchId}/`;
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('Room WebSocket connected');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'room_status') {
                loadRooms();
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('Room WebSocket disconnected');
        };

        wsRef.current = ws;
    }, [branchId, loadRooms]);

    useEffect(() => {
        loadRooms();
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [loadRooms]);

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            loadRooms();
            connectWebSocket();
        }, [loadRooms, connectWebSocket])
    );

    const refresh = async () => {
        setRefreshing(true);
        await loadRooms();
        setRefreshing(false);
    };

    const updateRoomStatus = async (roomId, newStatus) => {
        try {
            await roomService.updateStatus(roomId, newStatus);
            await loadRooms();
        } catch (error) {
            console.error('Update status error:', error);
        }
    };

    const handleRoomPress = (room) => {
        if (room.status === 'available') {
            navigation.navigate('StaffCreateBookingScreen', {
                roomId: room.id,
                roomNumber: room.room_number,
            });
        }
    };

    const renderRoom = ({item}) => {
        const statusConfig = STATUS_COLORS[item.status] || STATUS_COLORS.available;

        return (
            <TouchableOpacity
                style={[
                    styles.roomCard,
                    item.status !== 'available' && styles.roomCardBlocked,
                ]}
                onPress={() => handleRoomPress(item)}
                disabled={item.status !== 'available'}
            >
                <View style={styles.cardTop}>
                    <View style={styles.cardLeft}>
                        <Text style={styles.roomNumber}>{item.room_number}</Text>
                        <Text style={styles.roomType}>{item.room_type_name}</Text>
                        <Text style={styles.floorText}>Floor {item.floor}</Text>
                    </View>
                    <View style={[styles.statusBadge, {backgroundColor: statusConfig.bg}]}>
                        <Text style={[styles.statusText, {color: statusConfig.text}]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                </View>

                {item.status === 'available' && (
                    <View style={styles.cardFooter}>
                        <Text style={styles.tapHint}>Tap to book</Text>
                    </View>
                )}

                {item.status === 'dirty' && (
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => updateRoomStatus(item.id, 'cleaning')}
                    >
                        <Text style={styles.actionBtnText}>Mark Cleaning</Text>
                    </TouchableOpacity>
                )}

                {item.status === 'cleaning' && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnGreen]}
                        onPress={() => updateRoomStatus(item.id, 'available')}
                    >
                        <Text style={[styles.actionBtnText, styles.actionBtnTextGreen]}>
                            Mark Available
                        </Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    const groupedRooms = rooms.reduce((acc, room) => {
        const type = room.room_type_name || 'Standard';
        if (!acc[type]) {
            acc[type] = [];
        }
        acc[type].push(room);
        return acc;
    }, {});

    return (
        <TabScreenLayout backgroundColor={UI.screenBg}>
            <View style={styles.inner}>
                <View style={styles.headerPad}>
                    <StaffBranchHeader user={user} />
                    <Text style={styles.title}>Room Management</Text>
                    <Text style={styles.subtitle}>
                        Real-time room status updates
                    </Text>
                </View>

                <View style={styles.legendRow}>
                    {Object.entries(STATUS_COLORS).map(([key, config]) => (
                        <View key={key} style={styles.legendItem}>
                            <View style={[styles.legendDot, {backgroundColor: config.bg}]} />
                            <Text style={styles.legendText}>{config.label}</Text>
                        </View>
                    ))}
                </View>

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#8294FF" />
                    </View>
                ) : (
                    <FlatList
                        data={Object.entries(groupedRooms)}
                        keyExtractor={([type]) => type}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8294FF" />
                        }
                        renderItem={({item: [type, typeRooms]}) => (
                            <View style={styles.roomTypeSection}>
                                <Text style={styles.roomTypeTitle}>{type}</Text>
                                <View style={styles.roomsGrid}>
                                    {typeRooms.map((room) => (
                                        <View key={room.id} style={styles.roomCardWrapper}>
                                            {renderRoom({item: room})}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>No rooms configured</Text>
                                <Text style={styles.emptySubtext}>
                                    Contact your admin to add rooms
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
    inner: {
        flex: 1,
    },
    headerPad: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0f172a',
        marginTop: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 4,
        marginBottom: 16,
    },
    legendRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 11,
        color: '#64748b',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    roomTypeSection: {
        marginBottom: 24,
    },
    roomTypeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 12,
    },
    roomsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    roomCardWrapper: {
        width: ROOM_CARD_WIDTH,
    },
    roomCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    roomCardBlocked: {
        opacity: 0.85,
    },
    cardTop: {
        marginBottom: 8,
    },
    cardLeft: {
        marginBottom: 8,
    },
    roomNumber: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0f172a',
    },
    roomType: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginTop: 4,
    },
    floorText: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardFooter: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    tapHint: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8294FF',
    },
    actionBtn: {
        backgroundColor: '#fef9c3',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    actionBtnGreen: {
        backgroundColor: '#dcfce7',
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#854d0e',
    },
    actionBtnTextGreen: {
        color: '#166534',
    },
    emptyState: {
        padding: 48,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748b',
    },
    emptySubtext: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: 4,
    },
});
