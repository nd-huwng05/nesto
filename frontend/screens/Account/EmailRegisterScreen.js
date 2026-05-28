import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { QuestionLayout } from '../../layout/QuestionLayout';
import { AuthTextField } from '../../components/auth/AuthTextField';
import { registerEmailSchema } from '../../validation/authSchemas';
import { useRegister } from '../../hooks/account/useRegister';

export default function EmailRegisterScreen({ navigation, route }) {
    const { role } = route.params || {};
    const { sendVerificationOtp, isCheckingEmail, isSendingOtp } = useRegister();

    const {
        control,
        handleSubmit,
        setError,
        formState: { errors, isValid },
    } = useForm({
        resolver: yupResolver(registerEmailSchema),
        mode: 'onChange',
        defaultValues: { email: '' },
    });

    const isBusy = isCheckingEmail || isSendingOtp;

    const onSubmit = async ({ email }) => {
        const trimmed = email.trim().toLowerCase();
        const result = await sendVerificationOtp(trimmed);
        if (result.success) {
            navigation.navigate('OtpRegisterScreen', { email: trimmed, role });
        }
    };

    const roleLabel = role === 'BUSINESS_OWNER' ? 'Business Manager' : 'Customer';

    return (
        <QuestionLayout
            navigation={navigation}
            title="What's your email?"
            subtitle={`Creating a ${roleLabel} account`}
            isValid={isValid}
            isLoading={isBusy}
            continueLabel={
                isCheckingEmail ? 'Checking...' : isSendingOtp ? 'Sending code...' : 'Continue'
            }
            onContinue={handleSubmit(onSubmit)}
            footerText={
                <Text className="text-[12px] font-sf text-gray-400 mb-4 text-center w-full">
                    We will verify this email is available, then send a one-time code.
                </Text>
            }
        >
            <AuthTextField
                control={control}
                name="email"
                placeholder="Email address"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoFocus
                editable={!isBusy}
                error={errors.email?.message}
            />
        </QuestionLayout>
    );
}
