import {View, Text, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, StyleSheet} from 'react-native';
import {Plus} from 'lucide-react-native';
import {TabScreenLayout} from '../../../components/common/TabScreenLayout';
import {useCallback, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {useBusinessCRUD} from '../../../hooks/business/useBusinessCRUD';
import {UI} from '../../../styles/uiTokens';
import BusinessCard from '../../../components/business/BusinessCard';

export default function HomeBusinessScreen({navigation}) {
    const {businesses, isLoading, loadList} = useBusinessCRUD();
    const safeBusinesses = Array.isArray(businesses) ? businesses : [];
    const [refreshing, setRefreshing] = useState(false);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        await loadList();
        setRefreshing(false);
    }, [loadList]);

    useFocusEffect(
        useCallback(() => {
            loadList();
        }, [loadList])
    );

    return (
        <TabScreenLayout backgroundColor={UI.screenBg}>
            <View style={styles.inner}>
                <View style={styles.header}>
                    <Text className="font-sf-bold text-2xl text-slate-800">Branch</Text>
                    <Text className="font-sf text-sm text-gray-500 mt-1">
                        Manage your businesses and branch structure across the platform.
                    </Text>
                </View>

                {isLoading && safeBusinesses.length === 0 ? (
                    <View className="flex-1 items-center justify-center py-20">
                        <ActivityIndicator size="large" color="#8294FF" />
                    </View>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        className="flex-1"
                        contentContainerStyle={styles.scrollContent}
                        contentInsetAdjustmentBehavior="automatic"
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8294FF" />
                        }
                    >
                        {safeBusinesses.map((item) => (
                            <BusinessCard
                                key={item.id}
                                business={item}
                                onBusinessPress={(business) =>
                                    navigation.navigate('BusinessDetailScreen', {
                                        businessId: business.id,
                                    })
                                }
                                onAddBranch={(businessId) =>
                                    navigation.navigate('CreateBranchWizard', {
                                        businessId,
                                    })
                                }
                                onBranchPress={(branch, businessId) =>
                                    navigation.navigate('BranchDetailScreen', {
                                        businessId,
                                        branchId: branch.id,
                                    })
                                }
                            />
                        ))}

                        {safeBusinesses.length === 0 && !isLoading && (
                            <Text className="text-center text-gray-400 font-sf py-8">
                                No businesses yet. Add your first business below.
                            </Text>
                        )}

                        <TouchableOpacity
                            onPress={() =>
                                navigation.navigate('CreateBusinessWizard')
                            }
                            style={styles.addBtn}
                            className="flex-row items-center justify-center border border-gray-200 bg-white rounded-2xl py-3.5 mb-4"
                        >
                            <Plus size={22} color="#6b7280" />
                            <Text className="text-gray-500 font-sf-bold text-base ml-2">Add business</Text>
                        </TouchableOpacity>
                    </ScrollView>
                )}
            </View>
        </TabScreenLayout>
    );
}

const styles = StyleSheet.create({
    inner: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    header: {
        marginBottom: 16,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    addBtn: {
        borderWidth: 1,
    },
});
