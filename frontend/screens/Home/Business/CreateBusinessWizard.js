import React from 'react';
import {TextInput, TouchableOpacity, View, Text, ActivityIndicator, Image} from 'react-native';
import {QuestionLayout} from '../../../layout/QuestionLayout';
import {Check, Image as ImageIcon} from 'lucide-react-native';
import {useCreateBusiness} from '../../../hooks/business/useCreateBusiness';
import {commonInputStyles} from '../../../styles/TextInputStyles';
import OtpBottomSheet from '../../../components/login/OtpBottomSheet';

export default function CreateBusinessWizard({navigation, route}) {
    const {
        step,
        name,
        setName,
        logo,
        type,
        setType,
        scale,
        setScale,
        corporateEmail,
        setCorporateEmail,
        contactPhone,
        setContactPhone,
        lodgingTypes,
        isLoading,
        handleContinue,
        handleBack,
        checkIsValid,
        getTitle,
        pickLogo,
        showOtpModal,
        setShowOtpModal,
        handleOtpSuccess,
        contactError,
        setContactError,
    } = useCreateBusiness(navigation, route);
    const lodgingTypeList = Array.isArray(lodgingTypes) ? lodgingTypes : [];

    if (isLoading && step === 1 && lodgingTypeList.length === 0) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" color="#8294FF" />
                <Text className="text-gray-500 mt-2 font-sf">Loading form configurations...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1">
            <QuestionLayout
                navigation={{goBack: handleBack}}
                title={getTitle()}
                isValid={checkIsValid()}
                isLoading={isLoading && step === 5}
                onContinue={handleContinue}
                footerText={
                    <Text className="text-gray-400 mb-2 font-sf text-center">Step {step} of 5</Text>
                }
            >
                {step === 1 && (
                    <View className="mt-4 flex-row items-center bg-gray-50 border rounded-2xl px-4 h-12 border-gray-100">
                        <TextInput
                            autoFocus
                            placeholder="Enter business name (e.g. Swiss, Nesto...)"
                            placeholderTextColor="#9ca3af"
                            value={name}
                            onChangeText={setName}
                            className="flex-1 font-sf-bold text-lg text-gray-900"
                            style={commonInputStyles.baseInput}
                        />
                    </View>
                )}

                {step === 2 && (
                    <View className="items-center mt-6">
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={pickLogo}
                            className="w-36 h-36 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 justify-center items-center overflow-hidden"
                        >
                            {logo ? (
                                <Image source={{uri: logo}} className="w-full h-full" />
                            ) : (
                                <View className="items-center px-4">
                                    <ImageIcon size={32} color="#94a3b8" />
                                    <Text className="text-xs text-gray-400 font-sf text-center mt-2">
                                        Upload Brand Logo
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {step === 3 && (
                    <View className="gap-3 mt-4">
                        {lodgingTypeList.map((item) => (
                            <TouchableOpacity
                                key={item}
                                activeOpacity={0.8}
                                onPress={() => setType(item)}
                                className={`p-4 rounded-2xl border flex-row justify-between items-center ${
                                    type === item
                                        ? 'border-primary bg-primary/5'
                                        : 'border-gray-200 bg-white'
                                }`}
                            >
                                <Text
                                    className={`text-base font-sf-medium ${
                                        type === item ? 'text-primary' : 'text-slate-700'
                                    }`}
                                >
                                    {item}
                                </Text>
                                {type === item && <Check size={18} color="#8294FF" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {step === 4 && (
                    <View className="gap-3 mt-4">
                        {['Single location', '2 - 5 branches', 'More than 5 branches'].map((item) => (
                            <TouchableOpacity
                                key={item}
                                activeOpacity={0.8}
                                onPress={() => setScale(item)}
                                className={`p-4 rounded-2xl border flex-row justify-between items-center ${
                                    scale === item
                                        ? 'border-primary bg-primary/5'
                                        : 'border-gray-200 bg-white'
                                }`}
                            >
                                <Text
                                    className={`text-base font-sf-medium ${
                                        scale === item ? 'text-primary' : 'text-slate-700'
                                    }`}
                                >
                                    {item}
                                </Text>
                                {scale === item && <Check size={18} color="#8294FF" />}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {step === 5 && (
                    <View className="mt-4 gap-3">
                        <View
                            className={`flex-row items-center bg-gray-50 border rounded-2xl px-4 h-12 ${
                                contactError ? 'border-red-400' : 'border-gray-100'
                            }`}
                        >
                            <TextInput
                                placeholder="Corporate Email *"
                                placeholderTextColor="#9ca3af"
                                autoFocus
                                autoCapitalize="none"
                                keyboardType="email-address"
                                className="flex-1 font-sf-bold text-base text-gray-900"
                                style={commonInputStyles.baseInput}
                                value={corporateEmail}
                                onChangeText={(text) => {
                                    setCorporateEmail(text);
                                    if (contactError) setContactError(null);
                                }}
                                editable={!isLoading}
                            />
                        </View>
                        <View className="flex-row items-center bg-gray-50 border rounded-2xl px-4 h-12 border-gray-100">
                            <TextInput
                                placeholder="Corporate Phone *"
                                placeholderTextColor="#9ca3af"
                                keyboardType="phone-pad"
                                className="flex-1 font-sf-bold text-base text-gray-900"
                                style={commonInputStyles.baseInput}
                                value={contactPhone}
                                onChangeText={(text) => {
                                    setContactPhone(text);
                                    if (contactError) setContactError(null);
                                }}
                                editable={!isLoading}
                            />
                            {isLoading && <ActivityIndicator size="small" color="#8294FF" />}
                        </View>
                        {contactError ? (
                            <Text className="text-red-500 text-xs font-sf text-center px-1">
                                {contactError}
                            </Text>
                        ) : (
                            <Text className="text-gray-400 text-xs font-sf text-center px-1">
                                We will send a verification code to your corporate email. Enter the latest code from your
                                inbox (check spam folder).
                            </Text>
                        )}
                    </View>
                )}
            </QuestionLayout>

            <OtpBottomSheet
                isVisible={showOtpModal}
                onClose={() => setShowOtpModal(false)}
                onSuccess={handleOtpSuccess}
                email={corporateEmail}
                variant="business"
            />
        </View>
    );
}
