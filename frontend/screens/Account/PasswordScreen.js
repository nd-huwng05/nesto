import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { QuestionLayout } from '../../layout/QuestionLayout';
import { PasswordField } from '../../components/auth/PasswordField';
import { AuthAlternateButton } from '../../components/auth/AuthAlternateButton';
import { passwordSchema } from '../../validation/authSchemas';
import { useAuth } from '../../hooks/account/useAuth';

export default function PasswordScreen({ navigation, route }) {
    const { email, identifier } = route.params || {};
    const loginIdentifier = String(identifier || email || '').trim();
    const normalizedIdentifier = loginIdentifier.toLowerCase().replace(/\.@/g, '@');
    const { login, isLoading } = useAuth();

    const customerIdentifiers = [
        'customer@nesto.vn',
        'custumer@nesto.vn',
        '0901234567',
    ];

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isValid },
    } = useForm({
        resolver: yupResolver(passwordSchema),
        mode: 'onChange',
        defaultValues: { password: '' },
    });

    const onSubmit = async ({ password }) => {
        const result = await login(loginIdentifier, password);
        if (result.success) {
            const normalizedRole = String(result?.user?.role || '').trim().toUpperCase();
            const token = String(result?.data?.access_token || '');
            const isCustomerIdentifier = customerIdentifiers.includes(normalizedIdentifier) || normalizedIdentifier.includes('customer');
            const isCustomerResult = normalizedRole === 'CUSTOMER' || token.startsWith('mock_customer_');
            const forceFlow = (isCustomerIdentifier || isCustomerResult) ? 'CustomerFlow' : undefined;

            let root = navigation;
            while (root.getParent?.()) {
                root = root.getParent();
            }

            root.reset({
                index: 0,
                routes: [{ name: 'HomeFlow', params: forceFlow ? { forceFlow } : undefined }],
            });
            return;
        }

        reset({ password: '' });
    };

    return (
        <QuestionLayout
            navigation={navigation}
            title="What's your password?"
            subtitle={`Signing in as ${loginIdentifier}`}
            isValid={isValid}
            isLoading={isLoading}
            onContinue={handleSubmit(onSubmit)}
        >
            <PasswordField
                control={control}
                name="password"
                placeholder="Password"
                autoFocus
                textContentType="password"
                error={errors.password?.message}
            />

            <AuthAlternateButton
                label="Forgot password?"
                onPress={() => navigation.navigate('ForgotPasswordScreen', { email: loginIdentifier })}
            />
        </QuestionLayout>
    );
}
