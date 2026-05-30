import React, {useCallback, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {Plus, Wrench} from 'lucide-react-native';
import Apis, {endpoints} from '../../../configuration/Apis';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {StaffBranchHeader} from '../../../components/staff/StaffBranchHeader';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {useStaffBranch} from '../../../hooks/staff/useStaffBranch';

function getStatusStyle(isResolved) {
    if (isResolved) {
        return {badge: styles.badgeGreen, text: styles.textGreen};
    }
    return {badge: styles.badgeRed, text: styles.textRed};
}

function MaintenanceCard({item, onPress}) {
    const statusStyle = getStatusStyle(item.is_resolved);
    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.cardHeader}>
                <View style={styles.roomInfo}>
                    <Text style={styles.roomNumber}>Room {item.room_number || 'N/A'}</Text>
                    <View style={[styles.statusBadge, statusStyle.badge]}>
                        <Text style={[styles.statusText, statusStyle.text]}>
                            {item.is_resolved ? 'Resolved' : 'Pending'}
                        </Text>
                    </View>
                </View>
                <Wrench size={20} color="#64748b"/>
            </View>
            <Text style={styles.issueType}>{item.issue_type || 'Maintenance'}</Text>
            <Text style={styles.description} numberOfLines={2}>{item.description || ''}</Text>
        </TouchableOpacity>
    );
}

export default function RoomMaintenanceScreen({navigation}) {
    const {user, branchId} = useStaffSession();
    const {branch} = useStaffBranch(branchId);
    const [maintenance, setMaintenance] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [roomNumber, setRoomNumber] = useState('');
    const [issueType, setIssueType] = useState('');
    const [description, setDescription] = useState('');

    const loadMaintenance = useCallback(async () => {
        if (!branchId) {
            setMaintenance([]);
            setIsLoading(false);
            return;
        }
        try {
            const response = await Apis.get(endpoints.maintenance_rooms, {
                params: {branch: branchId},
            });
            if (response.status === 200) {
                const raw = response.data;
                const list = raw?.results ?? raw;
                setMaintenance(Array.isArray(list) ? list : []);
            }
        } catch (err) {
            console.log('Failed to load maintenance:', err);
            Alert.alert(
                'Error',
                err?.response?.data?.detail || err?.message || 'Failed to load maintenance issues.'
            );
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useFocusEffect(
        useCallback(() => {
            setIsLoading(true);
            loadMaintenance();
        }, [loadMaintenance])
    );

    const refresh = async () => {
        setRefreshing(true);
        await loadMaintenance();
        setRefreshing(false);
    };

    const submitReport = async () => {
        if (!roomNumber.trim() || !issueType.trim() || !description.trim()) {
            Alert.alert('Missing Info', 'Please fill in all fields.');
            return;
        }
        try {
            const response = await Apis.post(endpoints.maintenance_rooms, {
                branch: branchId,
                room_number: roomNumber.trim(),
                issue_type: issueType.trim(),
                description: description.trim(),
            });
            if (response.status === 201 || response.status === 200) {
                Alert.alert('Success', 'Maintenance issue reported.');
                setShowForm(false);
                setRoomNumber('');
                setIssueType('');
                setDescription('');
                loadMaintenance();
            }
        } catch (err) {
            Alert.alert(
                'Error',
                err?.response?.data?.detail || err?.message || 'Failed to submit report.'
            );
        }
    };

    const resolveIssue = async (item) => {
        if (item.is_resolved) return;
        Alert.alert('Mark resolved?', `Room ${item.room_number}: ${item.issue_type}`, [
            {text: 'Cancel', style: 'cancel'},
            {
                text: 'Resolve',
                onPress: async () => {
                    try {
                        await Apis.patch(`${endpoints.maintenance_rooms}${item.id}/`, {is_resolved: true});
                        loadMaintenance();
                    } catch (err) {
                        Alert.alert('Error', err?.response?.data?.detail || 'Unable to resolve issue.');
                    }
                },
            },
        ]);
    };

    return (
        <TabScreenLayout backgroundColor="#F8FAFC">
            <View style={styles.inner}>
                <View style={styles.headerPad}>
                    <StaffBranchHeader
                        user={user}
                        branchName={branch?.name}
                        branchAddress={branch?.address}
                        branchImage={branch?.image}
                    />
                    <Text style={styles.title}>Room Maintenance</Text>
                    <Text style={styles.subtitle}>Report and track maintenance issues.</Text>
                    <TouchableOpacity
                        style={styles.reportBtn}
                        onPress={() => setShowForm(!showForm)}
                    >
                        <Plus size={18} color="#fff"/>
                        <Text style={styles.reportBtnText}>
                            {showForm ? 'Cancel' : 'Report Issue'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {showForm && (
                    <View style={styles.formCard}>
                        <TextInput
                            placeholder="Room Number"
                            value={roomNumber}
                            onChangeText={setRoomNumber}
                            style={styles.input}
                            placeholderTextColor="#94a3b8"
                        />
                        <TextInput
                            placeholder="Issue Type (e.g., AC broken, Plumbing)"
                            value={issueType}
                            onChangeText={setIssueType}
                            style={styles.input}
                            placeholderTextColor="#94a3b8"
                        />
                        <TextInput
                            placeholder="Description"
                            value={description}
                            onChangeText={setDescription}
                            style={[styles.input, styles.textArea]}
                            multiline
                            numberOfLines={3}
                            placeholderTextColor="#94a3b8"
                        />
                        <TouchableOpacity style={styles.submitBtn} onPress={submitReport}>
                            <Text style={styles.submitBtnText}>Submit Report</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isLoading ? (
                    <ActivityIndicator size="large" color="#8294FF" style={{marginTop: 40}}/>
                ) : (
                    <FlatList
                        data={maintenance}
                        keyExtractor={(item, index) => String(item?.id ?? `${item?.room_number ?? 'room'}-${index}`)}
                        contentContainerStyle={styles.listContent}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8294FF"/>
                        }
                        renderItem={({item}) => (
                            <MaintenanceCard item={item} onPress={() => resolveIssue(item)}/>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No maintenance issues reported.</Text>
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
    subtitle: {fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 12},
    reportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8294FF',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
        marginBottom: 12,
    },
    reportBtnText: {color: '#fff', fontSize: 15, fontWeight: '700'},
    formCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
        color: '#0f172a',
        marginBottom: 10,
    },
    textArea: {minHeight: 80, textAlignVertical: 'top'},
    submitBtn: {
        backgroundColor: '#059669',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    submitBtnText: {color: '#fff', fontSize: 15, fontWeight: '700'},
    listContent: {paddingHorizontal: 20, paddingBottom: 24},
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    roomInfo: {flexDirection: 'row', alignItems: 'center', gap: 10},
    roomNumber: {fontSize: 18, fontWeight: '700', color: '#1E293B'},
    statusBadge: {paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12},
    statusText: {fontSize: 11, fontWeight: '700'},
    badgeGreen: {backgroundColor: '#dcfce7'},
    badgeRed: {backgroundColor: '#fee2e2'},
    textGreen: {color: '#166534'},
    textRed: {color: '#991b1b'},
    issueType: {fontSize: 16, fontWeight: '600', color: '#334155', marginBottom: 4},
    description: {fontSize: 13, color: '#64748b'},
    emptyText: {textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40},
});
