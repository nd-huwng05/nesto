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
import {isRoomGridBlocked, staffPortalMockStore} from '../../../services/staffPortalMockStore';
import {UI} from '../../../styles/uiTokens';

function formatHourly(amount) {
    return `${Number(amount).toLocaleString('vi-VN')} VND/h`;
}

function normalizeStatus(status) {
    return String(status || '').toLowerCase();
}

function getStatusBadge(status) {
    const key = normalizeStatus(status);
    if (key === 'dirty' || key === 'cleaning') {
        return {
            label: key === 'cleaning' ? 'Cleaning' : 'Dirty',
            badgeStyle: styles.badgeYellow,
            textStyle: styles.badgeTextYellow,
        };
    }
    if (key === 'maintenance') {
        return {
            label: 'Maintenance',
            badgeStyle: styles.badgeYellow,
            textStyle: styles.badgeTextYellow,
        };
    }
    if (key === 'occupied' || key === 'booked' || key === 'reserved') {
        return {
            label: key === 'occupied' ? 'Occupied' : 'Booked',
            badgeStyle: styles.badgeRed,
            textStyle: styles.badgeTextRed,
        };
    }
    return {
        label: 'Available',
        badgeStyle: styles.badgeGreen,
        textStyle: styles.badgeTextGreen,
    };
}

function getBlockedLabel(status) {
    const key = normalizeStatus(status);
    if (key === 'maintenance') return 'Maintenance';
    return 'Occupied';
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

    const openBooking = (item) => {
        navigation.navigate('StaffCreateBookingScreen', {
            roomId: item.id,
            roomNumber: item.roomNumber,
            hourlyRate: item.hourlyRate,
            roomType: item.type,
        });
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
                        Tap a room to start a walk-in. Occupied and maintenance rooms cannot be
                        booked.
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
                        renderItem={({item}) => {
                            const statusBadge = getStatusBadge(item.status);
                            const blocked = isRoomGridBlocked(item.status);

                            return (
                                <TouchableOpacity
                                    activeOpacity={blocked ? 1 : 0.88}
                                    disabled={blocked}
                                    onPress={() => openBooking(item)}
                                    style={[
                                        styles.roomCard,
                                        blocked && styles.roomCardBlocked,
                                    ]}
                                >
                                    <View style={styles.cardTop}>
                                        <View style={styles.cardLeft}>
                                            <Text style={styles.roomNumber}>
                                                Room {item.roomNumber}
                                            </Text>
                                            <Text style={styles.roomType}>{item.type}</Text>
                                            <Text style={styles.roomFeature}>{item.feature}</Text>
                                        </View>
                                        <View style={[styles.statusBadge, statusBadge.badgeStyle]}>
                                            <Text
                                                style={[styles.statusBadgeText, statusBadge.textStyle]}
                                            >
                                                {statusBadge.label}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.cardFooter}>
                                        <Text style={styles.hourlyRate}>
                                            {formatHourly(item.hourlyRate)}
                                        </Text>
                                        {blocked ? (
                                            <Text style={styles.blockedHint}>
                                                {getBlockedLabel(item.status)}
                                            </Text>
                                        ) : (
                                            <Text style={styles.bookHint}>Tap to book walk-in</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
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
    roomCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: UI.sectionGap,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    roomCardBlocked: {
        opacity: 0.72,
        backgroundColor: '#f8fafc',
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
    },
    cardLeft: {
        flex: 1,
        minWidth: 0,
    },
    roomNumber: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f172a',
    },
    roomType: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
        marginTop: 4,
    },
    roomFeature: {
        fontSize: 12,
        color: '#94a3b8',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    badgeGreen: {backgroundColor: '#dcfce7'},
    badgeTextGreen: {color: '#166534'},
    badgeYellow: {backgroundColor: '#fef9c3'},
    badgeTextYellow: {color: '#854d0e'},
    badgeRed: {backgroundColor: '#fee2e2'},
    badgeTextRed: {color: '#991b1b'},
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    hourlyRate: {
        fontSize: 14,
        fontWeight: '700',
        color: '#059669',
    },
    bookHint: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8294FF',
    },
    blockedHint: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94a3b8',
    },
});
