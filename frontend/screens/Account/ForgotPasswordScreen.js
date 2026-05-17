import {Text, View} from 'react-native';
import {useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import {QuestionLayout} from '../../layout/QuestionLayout';
import {AuthTextField} from '../../components/auth/AuthTextField';
import {forgotPasswordSchema} from '../../validation/authSchemas';
import {useForgotPassword} from '../../hooks/account/useForgotPassword';

export default function ForgotPasswordScreen({navigation}) {
    const {submitResetRequest, isLoading, isSubmitted} = useForgotPassword();

    const {
        control,
        handleSubmit,
        formState: {errors, isValid},
    } = useForm({
        resolver: yupResolver(forgotPasswordSchema),
        mode: 'onChange',
        defaultValues: {email: ''},
    });

    const onSubmit = async ({email}) => {
        const result = await submitResetRequest(email);
        if (result.success) {
            setTimeout(() => navigation.navigate('EmailLoginScreen'), 1500);
        }
    };

    return (
        <QuestionLayout
            navigation={navigation}
            title="Forgot password?"
            subtitle={
                isSubmitted
                    ? 'Check your email for reset instructions. You can return to sign in.'
                    : 'Enter the email linked to your account. We will send reset instructions.'
            }
            isValid={isSubmitted || isValid}
            isLoading={isLoading && !isSubmitted}
            continueLabel={isSubmitted ? 'Back to sign in' : 'Send reset link'}
            onContinue={isSubmitted ? () => navigation.navigate('EmailLoginScreen') : handleSubmit(onSubmit)}
            footerText={
                <Text className="text-[12px] font-sf text-gray-400 mb-4 text-center w-3/4">
                    This is a placeholder flow. Password reset is not fully implemented yet.
                </Text>
            }
        >
            {!isSubmitted && (
                <AuthTextField
                    control={control}
                    name="email"
                    placeholder="Email address"
                    keyboardType="email-address"
                    autoFocus
                    editable={!isLoading}
                    error={errors.email?.message}
                />
            )}
            {isSubmitted && (
                <View className="bg-green-50 border border-green-200 rounded-2xl p-4">
                    <Text className="text-green-700 font-sf-semi text-center text-sm">
                        If an account exists for this email, you will receive instructions shortly.
                    </Text>
                </View>
            )}
        </QuestionLayout>
    );
}
