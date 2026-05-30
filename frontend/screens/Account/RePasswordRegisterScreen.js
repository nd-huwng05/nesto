import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { QuestionLayout } from '../../layout/QuestionLayout';
import { PasswordField } from '../../components/auth/PasswordField';
import { buildConfirmPasswordSchema } from '../../validation/authSchemas';

export default function RePasswordRegisterScreen({ navigation, route }) {
    const { email, password, role } = route.params || {};

    const schema = useMemo(
        () => buildConfirmPasswordSchema(password),
        [password]
    );

    const {
        control,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm({
        resolver: yupResolver(schema),
        mode: 'onChange',
        defaultValues: { confirmPassword: '' },
    });

    const onSubmit = () => {
        navigation.navigate('ProfileRegisterScreen', { email, password, role });
    };

    return (
        <QuestionLayout
            navigation={navigation}
            title="Confirm your password"
            subtitle="Re-enter your password to finish registration"
            isValid={isValid}
            continueLabel="Continue"
            onContinue={handleSubmit(onSubmit)}
        >
            <PasswordField
                control={control}
                name="confirmPassword"
                placeholder="Re-enter password"
                autoFocus
                textContentType="newPassword"
                error={errors.confirmPassword?.message}
            />
        </QuestionLayout>
    );
}
