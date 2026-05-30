import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { QuestionLayout } from '../../layout/QuestionLayout';
import { AuthTextField } from '../../components/auth/AuthTextField';
import { AuthAlternateButton } from '../../components/auth/AuthAlternateButton';
import { emailSchema } from '../../validation/authSchemas';
import { useGoogleAuth } from '../../hooks/account/useGoogleAuth';
import { Text } from 'react-native';

const TERMS_FOOTER = (
    <Text className="text-[12px] font-sf text-gray-400 mb-4 text-center w-3/4">
        By tapping Continue, you agree to our
        <Text className="text-gray-600 font-sf-semi"> Terms of Service</Text> and
        <Text className="text-gray-600 font-sf-semi"> Privacy Policy</Text>
    </Text>
);

export default function EmailLoginScreen({ navigation }) {
    const { login: googleLogin, googleTemporarilyDisabled } = useGoogleAuth(navigation);

    const {
        control,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm({
        resolver: yupResolver(emailSchema),
        mode: 'onChange',
        defaultValues: { email: '' },
    });

    const onSubmit = ({ email }) => {
        navigation.navigate('PasswordScreen', { email: email.trim().toLowerCase() });
    };

    const handleGoogleLogin = () => {
        googleLogin();
    };

    return (
        <QuestionLayout
            navigation={navigation}
            title="What's your email?"
            isValid={isValid}
            onContinue={handleSubmit(onSubmit)}
            footerText={TERMS_FOOTER}
        >
            <AuthTextField
                control={control}
                name="email"
                placeholder="Email address"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoFocus
                error={errors.email?.message}
            />

            <AuthAlternateButton
                icon="google"
                label="Continue with Google"
                onPress={handleGoogleLogin}
            />

            {googleTemporarilyDisabled ? (
                <Text className="text-[11px] font-sf text-gray-400 mt-2 text-center px-2">
                    Google Sign-In cần build dev app — dùng email/mật khẩu hoặc cấu hình EXPO_PUBLIC_WEB_CLIENT_ID.
                </Text>
            ) : null}
        </QuestionLayout>
    );
}
