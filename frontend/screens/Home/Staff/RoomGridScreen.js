import {useCallback, useMemo, useState, useEffect} from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {Wrench} from 'lucide-react-native';
import EmptyState from '../../../components/common/EmptyState';
import {StaffBranchHeader} from '../../../components/staff/StaffBranchHeader';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {useStaffBranch} from '../../../hooks/staff/useStaffBranch';
import {useStaffRoomLive} from '../../../contexts/StaffRoomLiveContext';
import {listRooms, isRoomGridBlocked, getRoomBlockedHint} from '../../../services/staffApiService';
import {patchRoomListWithStatus} from '../../../utils/roomStatus';
import {UI} from '../../../styles/uiTokens';
import {isReceptionistRole} from '../../../constants/authRoles';

function formatHourly(amount) {
    return `${Number(amount).toLocaleString('en-US')} VND/h`;
}

function normalizeStatus(status) {
    return String(status || '').toLowerCase();
}

function getStatusBadge(status) {
    const key = normalizeStatus(status);
    if (key === 'dirty' || key === 'cleaning') {
        return {label: key === 'cleaning' ? 'Cleaning' : 'Dirty', badgeStyle: styles.badgeYellow, textStyle: styles.badgeTextYellow};
    }
    if (key === 'maintenance') {
        return {label: 'Maintenance', badgeStyle: styles.badgeYellow, textStyle: styles.badgeTextYellow};
    }
    if (key === 'occupied' || key === 'booked' || key === 'reserved') {
        return {label: key === 'occupied' ? 'Occupied' : 'Booked', badgeStyle: styles.badgeRed, textStyle: styles.badgeTextRed};
    }
    return {label: 'Available', badgeStyle: styles.badgeGreen, textStyle: styles.badgeTextGreen};
}

function getBlockedHint(status) {
    return getRoomBlockedHint(status);
}

function buildRoomSections(rooms) {
    const groups = new Map();
    for (const room of rooms) {
        const typeName = String(room.type || room.room_type_name || 'Other').trim() || 'Other';
        if (!groups.has(typeName)) {
            groups.set(typeName, []);
        }
        groups.get(typeName).push(room);
    }

    return Array.from(groups.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([title, data]) => {
            const sorted = [...data].sort(
                (a, b) => Number(a.room_number) - Number(b.room_number)
            );
            const availableCount = sorted.filter((room) => !isRoomGridBlocked(room.status)).length;
            return {
                title,
                data: sorted,
                roomCount: sorted.length,
                availableCount,
                hourlyRate: sorted[0]?.hourly_rate ?? 0,
            };
        });
}

function RoomGridCard({item, onPress}) {
    const statusBadge = getStatusBadge(item.status);
    const blocked = isRoomGridBlocked(item.status);

    return (
        <TouchableOpacity
            activeOpacity={blocked ? 1 : 0.88}
            disabled={blocked}
            onPress={() => onPress(item)}
            style={[styles.roomCard, blocked && styles.roomCardBlocked]}
        >
            <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                    <Text style={styles.roomNumber}>Room {item.room_number}</Text>
                    <Text style={styles.roomFeature}>{item.feature || '—'}</Text>
                </View>
                <View style={[styles.statusBadge, statusBadge.badgeStyle]}>
                    <Text style={[styles.statusBadgeText, statusBadge.textStyle]}>
                        {statusBadge.label}
                    </Text>
                </View>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.hourlyRate}>{formatHourly(item.hourly_rate)}</Text>
                {blocked ? (
                    <Text style={styles.blockedHint}>{getBlockedHint(item.status)}</Text>
                ) : (
                    <Text style={styles.bookHint}>Tap to book walk-in</Text>
                )}
            </View>
        </TouchableOpacity>
    );
}

function RoomTypeSectionHeader({section}) {
    return (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTop}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionRate}>{formatHourly(section.hourlyRate)}</Text>
            </View>
            <Text style={styles.sectionMeta}>
                {section.roomCount} room{section.roomCount === 1 ? '' : 's'} · {section.availableCount} available
            </Text>
        </View>
    );
}

export default function RoomGridScreen({navigation}) {
    const {user, branchId, role} = useStaffSession();
    const {branch} = useStaffBranch(branchId);
    const {subscribe} = useStaffRoomLive();
    const [rooms, setRooms] = useState([]);
    const roomList = Array.isArray(rooms) ? rooms : [];
    const roomSections = useMemo(() => buildRoomSections(roomList), [roomList]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const loadRooms = useCallback(async ({silent = false} = {}) => {
        if (!branchId) {
            setRooms([]);
            setIsLoading(false);
            return;
        }
        if (!silent) {
            setIsLoading(true);
        }
        try {
            const data = await listRooms(branchId);
            setRooms(data);
            setErrorMessage('');
        } catch (error) {
            console.error('API Error: ', error.response?.data || error.message);
            if (!silent) {
                setRooms([]);
            }
            const message = 'Unable to load room grid.';
            setErrorMessage(message);
            if (!silent) {
                Alert.alert('Rooms unavailable', message);
            }
        } finally {
            if (!silent) {
                setIsLoading(false);
            }
        }
    }, [branchId]);

    useFocusEffect(
        useCallback(() => {
            loadRooms({silent: roomList.length > 0});
        }, [loadRooms, roomList.length])
    );

    useEffect(() => {
        return subscribe((payload) => {
            setRooms((prev) => patchRoomListWithStatus(prev, payload));
        });
    }, [subscribe]);

    const refresh = async () => {
        setRefreshing(true);
        await loadRooms({silent: true});
        setRefreshing(false);
    };

    const openBooking = (item) => {
        navigation.navigate('StaffCreateBookingScreen', {
            roomId: item.id,
            roomNumber: item.room_number,
            hourlyRate: item.hourly_rate,
            roomType: item.type,
        });
    };

    return (
        <TabScreenLayout backgroundColor={UI.screenBg}>
            <View style={styles.inner}>
                {!isReceptionistRole(role) ? (
                    <View style={styles.emptyWrap}>
                        <Text className="font-sf text-gray-500 text-center">You do not have permission for room booking actions.</Text>
                    </View>
                ) : null}
                <View style={styles.headerPad}>
                    <StaffBranchHeader
                        user={user}
                        branchName={branch?.name}
                        branchAddress={branch?.address}
                        branchImage={branch?.image}
                    />
                    <View style={styles.titleRow}>
                        <Text className="font-sf-bold text-2xl text-slate-800">Rooms</Text>
                        <TouchableOpacity
                            style={styles.maintenanceBtn}
                            onPress={() => navigation.navigate('RoomMaintenanceScreen')}
                        >
                            <Wrench size={18} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                    <Text className="font-sf text-sm text-gray-500 mt-1 mb-2">
                        Tap an available room for walk-in. Occupied, dirty, and maintenance rooms cannot be booked.
                    </Text>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color="#8294FF" style={{marginTop: 40}} />
                ) : (
                    <SectionList
                        sections={roomSections}
                        keyExtractor={(item) => String(item?.id ?? item?.room_number)}
                        contentContainerStyle={styles.listContent}
                        stickySectionHeadersEnabled={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8294FF" />
                        }
                        renderSectionHeader={({section}) => <RoomTypeSectionHeader section={section} />}
                        renderItem={({item}) => (
                            <RoomGridCard item={item} onPress={openBooking} />
                        )}
                        SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
                        ItemSeparatorComponent={() => <View style={{height: UI.sectionGap}} />}
                        ListEmptyComponent={
                            <EmptyState
                                icon="bed-outline"
                                title="No rooms found"
                                subtitle="Rooms for this branch will appear here when configured."
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
    titleRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4},
    maintenanceBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {paddingHorizontal: 20, paddingBottom: 24},
    sectionHeader: {
        paddingTop: 8,
        paddingBottom: 10,
    },
    sectionHeaderTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    sectionTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '800',
        color: '#0f172a',
    },
    sectionRate: {
        fontSize: 13,
        fontWeight: '700',
        color: '#059669',
    },
    sectionMeta: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    sectionGap: {
        height: 8,
    },
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
    roomCardBlocked: {opacity: 0.72, backgroundColor: '#f8fafc'},
    cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12},
    cardLeft: {flex: 1, minWidth: 0},
    roomNumber: {fontSize: 22, fontWeight: '800', color: '#0f172a'},
    roomFeature: {fontSize: 13, color: '#94a3b8', marginTop: 4},
    statusBadge: {paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10},
    statusBadgeText: {fontSize: 11, fontWeight: '700'},
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
    hourlyRate: {fontSize: 14, fontWeight: '700', color: '#059669'},
    bookHint: {fontSize: 12, fontWeight: '600', color: '#8294FF'},
    blockedHint: {fontSize: 12, fontWeight: '600', color: '#94a3b8'},
    emptyWrap: {paddingHorizontal: 20, paddingTop: 10},
});
