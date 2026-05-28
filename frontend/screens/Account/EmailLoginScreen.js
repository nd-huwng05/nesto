import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { QuestionLayout } from '../../layout/QuestionLayout';
import { AuthTextField } from '../../components/auth/AuthTextField';
import { AuthAlternateButton } from '../../components/auth/AuthAlternateButton';
import { emailSchema } from '../../validation/authSchemas';
import { useGoogleAuth } from '../../hooks/account/useGoogleAuth';

const TERMS_FOOTER = (
    <Text className="text-[12px] font-sf text-gray-400 mb-4 text-center w-3/4">
        By tapping Continue, you agree to our
        <Text className="text-gray-600 font-sf-semi"> Terms of Service</Text> and
        <Text className="text-gray-600 font-sf-semi"> Privacy Policy</Text>
    </Text>
);

const navigateByRole = (navigation, user) => {
    navigation.reset({
        index: 0,
        routes: [{ name: 'HomeFlow' }],
    });
};

export default function EmailLoginScreen({ navigation }) {
    const { login: googleLogin, isLoading: isGoogleLoading } = useGoogleAuth();

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

    const handleGoogleLogin = async () => {
        const result = await googleLogin();
        if (result.success && result.user) {
            navigateByRole(navigation, result.user);
        }
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
                label={isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
                onPress={handleGoogleLogin}
            />
        </QuestionLayout>
    );
}
