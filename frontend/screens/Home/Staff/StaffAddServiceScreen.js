import {useCallback, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ChevronLeft} from 'lucide-react-native';
import {useFocusEffect} from '@react-navigation/native';
import {addBookingExtraService} from '../../../services/ReceptionService';
import {fetchExtraServices} from '../../../services/BranchService';
import {useStaffSession} from '../../../hooks/staff/useStaffSession';
import {UI} from '../../../styles/uiTokens';

function formatVnd(amount) {
    return `${Number(amount).toLocaleString('en-US')} VND`;
}

export default function StaffAddServiceScreen({navigation, route}) {
    const {bookingId} = route.params || {};
    const [addingId, setAddingId] = useState(null);
    const {branchId} = useStaffSession();
    const [services, setServices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    const loadServices = useCallback(async () => {
        if (!branchId) {
            setServices([]);
            setErrorMessage('Missing branch context.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setErrorMessage('');
        const result = await fetchExtraServices(branchId);
        if (result.status === 'success') {
            setServices(Array.isArray(result.data) ? result.data : []);
        } else {
            setServices([]);
            setErrorMessage(result.message || 'Unable to load extra services.');
        }
        setIsLoading(false);
    }, [branchId]);

    useFocusEffect(
        useCallback(() => {
            loadServices();
        }, [loadServices])
    );

    const handleSelect = async (service) => {
        if (!bookingId) {
            Alert.alert('Error', 'Missing booking reference.');
            return;
        }

        setAddingId(service.id);
        const result = await addBookingExtraService(bookingId, service.id);
        setAddingId(null);

        if (result.status === 'success') {
            navigation.goBack();
            return;
        }
        Alert.alert('Unable to add service', result.message || 'Please try again.');
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
                    <ChevronLeft size={24} color="#334155" />
                </TouchableOpacity>
                <Text style={styles.topTitle}>Add service</Text>
                <View style={{width: 24}} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.subtitle}>Select a service to add to this stay</Text>

                {isLoading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator size="large" color="#8294FF" />
                    </View>
                ) : errorMessage ? (
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>{errorMessage}</Text>
                    </View>
                ) : services.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Text style={styles.emptyText}>No extra services configured for this branch.</Text>
                    </View>
                ) : (
                    services.map((service) => {
                        const busy = addingId === service.id;
                        return (
                            <TouchableOpacity
                                key={service.id}
                                activeOpacity={0.85}
                                disabled={Boolean(addingId)}
                                onPress={() => handleSelect(service)}
                                style={[styles.serviceRow, busy && styles.serviceRowBusy]}
                            >
                                <Text style={styles.serviceEmoji}>＋</Text>
                                <View style={styles.serviceBody}>
                                    <Text style={styles.serviceLabel}>{service.name}</Text>
                                    <Text style={styles.servicePrice}>{formatVnd(service.price)}</Text>
                                </View>
                                {busy ? <ActivityIndicator size="small" color="#8294FF" /> : null}
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {flex: 1, backgroundColor: UI.screenBg},
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    topTitle: {fontSize: 17, fontWeight: '700', color: '#0f172a'},
    scroll: {paddingHorizontal: 20, paddingBottom: 32},
    subtitle: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 16,
    },
    serviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    serviceRowBusy: {
        opacity: 0.7,
    },
    loadingWrap: {paddingVertical: 48, alignItems: 'center'},
    emptyWrap: {paddingVertical: 40},
    emptyText: {textAlign: 'center', color: '#94a3b8', fontSize: 14},
    serviceEmoji: {
        fontSize: 28,
        marginRight: 14,
    },
    serviceBody: {
        flex: 1,
    },
    serviceLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    servicePrice: {
        fontSize: 13,
        color: '#059669',
        fontWeight: '600',
        marginTop: 4,
    },
});
