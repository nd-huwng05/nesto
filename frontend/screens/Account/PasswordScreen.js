import { useState } from 'react';
import { Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { QuestionLayout } from '../../layout/QuestionLayout';
import { PasswordField } from '../../components/auth/PasswordField';
import { AuthAlternateButton } from '../../components/auth/AuthAlternateButton';
import { passwordSchema } from '../../validation/authSchemas';
import { useAuth } from '../../hooks/account/useAuth';

const navigateByRole = (navigation, user) => {
    const role = user?.role;
    if (role === 'BUSINESS_OWNER') {
        navigation.reset({
            index: 0,
            routes: [{ name: 'HomeFlow' }],
        });
    } else {
        navigation.reset({
            index: 0,
            routes: [{ name: 'HomeFlow' }],
        });
    }
};

export default function PasswordScreen({ navigation, route }) {
    const { email } = route.params || {};
    const { login, isLoading } = useAuth();

    const {
        control,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm({
        resolver: yupResolver(passwordSchema),
        mode: 'onChange',
        defaultValues: { password: '' },
    });

    const onSubmit = async ({ password }) => {
        try {
            const result = await login(email, password);
            if (result.success && result.user) {
                navigateByRole(navigation, result.user);
            }
        } catch (err) {
            Alert.alert('Sign in failed', err?.message || 'Email or password is incorrect');
        }
    };

    return (
        <QuestionLayout
            navigation={navigation}
            title="What's your password?"
            subtitle={`Signing in as ${email}`}
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
                onPress={() => navigation.navigate('ForgotPasswordScreen', { email })}
            />
        </QuestionLayout>
    );
}
