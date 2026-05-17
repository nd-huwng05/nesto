import React from 'react';
import {TextInput, TouchableOpacity, View, Text, ActivityIndicator} from 'react-native';
import {QuestionLayout} from '../../../layout/QuestionLayout';
import {useCreateBranch} from '../../../hooks/business/useCreateBranch';
import {commonInputStyles} from '../../../styles/TextInputStyles';
import OtpBottomSheet from '../../../components/login/OtpBottomSheet';
import {MultiImagePicker} from '../../../components/business/MultiImagePicker';

export default function CreateBranchWizard({navigation, route}) {
    const {
        step,
        totalSteps,
        branchName,
        setBranchName,
        branchAddress,
        setBranchAddress,
        branchImages,
        setBranchImages,
        selectedAmenities,
        amenityOptions,
        toggleAmenity,
        bankName,
        setBankName,
        bankAccount,
        setBankAccount,
        branchPhone,
        setBranchPhone,
        isLoading,
        handleContinue,
        handleBack,
        checkIsValid,
        getTitle,
        showOtpModal,
        setShowOtpModal,
        handleOtpSuccess,
        phoneError,
        setPhoneError,
    } = useCreateBranch(navigation, route);

    return (
        <View className="flex-1">
            <QuestionLayout
                navigation={{goBack: handleBack}}
                title={getTitle()}
                isValid={checkIsValid()}
                isLoading={isLoading && step === 6}
                onContinue={handleContinue}
                footerText={
                    <Text className="text-gray-400 mb-2 font-sf text-center">
                        Step {step} of {totalSteps}
                    </Text>
                }
            >
                {step === 1 && (
                    <View className="mt-4 flex-row items-center bg-gray-50 border rounded-2xl px-4 h-12 border-gray-100">
                        <TextInput
                            autoFocus
                            placeholder="Enter branch name (e.g. Nesto Da Lat...)"
                            placeholderTextColor="#9ca3af"
                            value={branchName}
                            onChangeText={setBranchName}
                            className="flex-1 font-sf-bold text-lg text-gray-900"
                            style={commonInputStyles.baseInput}
                        />
                    </View>
                )}

                {step === 2 && (
                    <View className="mt-4 flex-row items-center bg-gray-50 border rounded-2xl px-4 h-12 border-gray-100">
                        <TextInput
                            autoFocus
                            placeholder="Full address (e.g. 123 Tran Phu, Vung Tau)"
                            placeholderTextColor="#9ca3af"
                            value={branchAddress}
                            onChangeText={setBranchAddress}
                            className="flex-1 font-sf-medium text-base text-gray-900"
                            style={commonInputStyles.baseInput}
                        />
                    </View>
                )}

                {step === 3 && (
                    <View className="flex-row flex-wrap gap-2.5 mt-4 justify-center">
                        {amenityOptions.map((amenity) => {
                            const isSelected = selectedAmenities.includes(amenity);
                            return (
                                <TouchableOpacity
                                    key={amenity}
                                    activeOpacity={0.8}
                                    onPress={() => toggleAmenity(amenity)}
                                    className={`px-5 py-3 rounded-full border ${
                                        isSelected ? 'border-primary bg-primary' : 'border-gray-300 bg-white'
                                    }`}
                                >
                                    <Text
                                        className={`text-sm font-sf-medium ${
                                            isSelected ? 'text-white' : 'text-slate-600'
                                        }`}
                                    >
                                        {amenity}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {step === 4 && (
                    <View className="gap-4 mt-4">
                        <View className="flex-row items-center bg-gray-50 border rounded-2xl px-4 h-12 border-gray-100">
                            <TextInput
                                placeholder="Bank Name (e.g. Vietcombank)"
                                placeholderTextColor="#9ca3af"
                                value={bankName}
                                onChangeText={setBankName}
                                className="flex-1 font-sf-medium text-base text-gray-900"
                                style={commonInputStyles.baseInput}
                            />
                        </View>
                        <View className="flex-row items-center bg-gray-50 border rounded-2xl px-4 h-12 border-gray-100">
                            <TextInput
                                placeholder="Account Number"
                                placeholderTextColor="#9ca3af"
                                keyboardType="number-pad"
                                value={bankAccount}
                                onChangeText={setBankAccount}
                                className="flex-1 font-sf-medium text-base text-gray-900"
                                style={commonInputStyles.baseInput}
                            />
                        </View>
                    </View>
                )}

                {step === 5 && (
                    <View className="mt-4">
                        <MultiImagePicker
                            images={branchImages}
                            onChange={setBranchImages}
                            label="Add facade, lobby, pool, and room photos. First image is the cover."
                        />
                    </View>
                )}

                {step === 6 && (
                    <View className="mb-4 mt-4">
                        <View
                            className={`flex-row items-center bg-gray-50 border rounded-2xl px-4 h-12 ${
                                phoneError ? 'border-red-400' : 'border-gray-100'
                            }`}
                        >
                            <TextInput
                                placeholder="Branch Hotline (e.g. 0912345678)"
                                placeholderTextColor="#9ca3af"
                                autoFocus
                                className="flex-1 font-sf-bold text-lg text-gray-900"
                                style={commonInputStyles.baseInput}
                                keyboardType="phone-pad"
                                value={branchPhone}
                                onChangeText={(text) => {
                                    setBranchPhone(text);
                                    if (phoneError) setPhoneError(null);
                                }}
                                editable={!isLoading}
                            />
                            {isLoading && <ActivityIndicator size="small" color="#8294FF" />}
                        </View>
                        {phoneError ? (
                            <Text className="text-red-500 text-xs font-sf text-center mt-2 px-1">
                                {phoneError}
                            </Text>
                        ) : null}
                    </View>
                )}
            </QuestionLayout>

            <OtpBottomSheet
                isVisible={showOtpModal}
                onClose={() => setShowOtpModal(false)}
                onSuccess={handleOtpSuccess}
                email={branchPhone}
            />
        </View>
    );
}
