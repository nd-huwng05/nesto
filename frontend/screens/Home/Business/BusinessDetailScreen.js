import {useCallback} from 'react';
import {ActivityIndicator, Image, Text, TouchableOpacity, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {ScreenWrapper} from '../../../components/common/ScreenWrapper';
import {DetailRow, DetailSection} from '../../../components/business/DetailSection';
import {DetailScreenHeader} from '../../../components/business/DetailScreenHeader';
import {useBusinessCRUD} from '../../../hooks/business/useBusinessCRUD';

export default function BusinessDetailScreen({navigation, route}) {
    const {businessId} = route.params || {};
    const {businessDetail, isLoading, isSaving, loadDetail, remove} = useBusinessCRUD();

    useFocusEffect(
        useCallback(() => {
            loadDetail(businessId);
        }, [businessId, loadDetail])
    );

    const handleDelete = async () => {
        const deleted = await remove(businessId, businessDetail?.name || 'this business');
        if (deleted) navigation.goBack();
    };

    if (isLoading && !businessDetail) {
        return (
            <ScreenWrapper scrollable={false} className="flex-1 bg-gray-100">
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#8294FF" />
                </View>
            </ScreenWrapper>
        );
    }

    if (!businessDetail) {
        return (
            <ScreenWrapper className="flex-1 bg-gray-100">
                <Text className="text-center text-gray-500 font-sf mt-10">Business not found.</Text>
            </ScreenWrapper>
        );
    }

    const branchCount = businessDetail.branches?.length ?? 0;

    return (
        <ScreenWrapper className="flex-1 bg-gray-100" contentClassName="px-5 pt-2">
            <DetailScreenHeader
                onBack={() => navigation.goBack()}
                editLabel="Edit"
                onEdit={() => navigation.navigate('EditBusinessScreen', {businessId})}
                onDelete={handleDelete}
                isSaving={isSaving}
            />

            <View className="bg-white rounded-2xl p-5 items-center mb-4 border border-gray-100 shadow-sm">
                <Image
                    source={{uri: businessDetail.logo}}
                    className="w-24 h-24 rounded-2xl mb-3 bg-gray-50"
                    resizeMode="cover"
                />
                <Text className="font-sf-bold text-2xl text-slate-800 text-center">{businessDetail.name}</Text>
                <Text className="font-sf text-gray-500 text-sm mt-1">{businessDetail.businessType}</Text>
            </View>

            <DetailSection title="Corporate Information">
                <DetailRow label="Legal / Company Name" value={businessDetail.legalName} />
                <DetailRow label="Tax Registration Code" value={businessDetail.taxCode} />
                <DetailRow label="Business Type" value={businessDetail.businessType} />
                <DetailRow label="Legal Representative" value={businessDetail.legalRepresentative} />
            </DetailSection>

            <DetailSection title="Contact & Headquarters">
                <DetailRow label="Corporate Email" value={businessDetail.contact?.email} />
                <DetailRow label="Corporate Phone" value={businessDetail.contact?.phone} />
                <DetailRow label="Headquarters Address" value={businessDetail.contact?.headquartersAddress} />
            </DetailSection>

            <DetailSection title="Branch Directory">
                <DetailRow label="Total Branches" value={String(branchCount)} />
                {businessDetail.branches?.length === 0 ? (
                    <Text className="font-sf text-gray-400 text-sm">No branches yet.</Text>
                ) : (
                    businessDetail.branches.map((branch) => (
                        <TouchableOpacity
                            key={branch.id}
                            onPress={() =>
                                navigation.navigate('BranchDetailScreen', {
                                    businessId,
                                    branchId: branch.id,
                                })
                            }
                            className="flex-row items-center py-3 border-b border-gray-50 last:border-0"
                        >
                            <Image
                                source={{uri: branch.image}}
                                className="w-11 h-11 rounded-xl mr-3 bg-gray-100"
                                resizeMode="cover"
                            />
                            <View className="flex-1">
                                <Text className="font-sf-semi text-slate-800">{branch.name}</Text>
                                <Text className="font-sf text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                                    {branch.address}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
                <TouchableOpacity
                    onPress={() => navigation.navigate('CreateBranchWizard', {businessId})}
                    className="mt-3 py-3 border border-dashed border-primary/50 rounded-xl items-center bg-primary/5"
                >
                    <Text className="text-primary font-sf-semi text-sm">+ Add branch</Text>
                </TouchableOpacity>
            </DetailSection>
        </ScreenWrapper>
    );
}
