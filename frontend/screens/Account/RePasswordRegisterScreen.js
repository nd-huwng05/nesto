import {useMemo} from 'react';
import {useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import {QuestionLayout} from '../../layout/QuestionLayout';
import {PasswordField} from '../../components/auth/PasswordField';
import {buildConfirmPasswordSchema} from '../../validation/authSchemas';
import {useRegister} from '../../hooks/account/useRegister';

export default function RePasswordRegisterScreen({navigation, route}) {
    const {email, password: originalPassword, role} = route.params || {};
    const {handleRegister, isLoading} = useRegister();

    const schema = useMemo(
        () => buildConfirmPasswordSchema(originalPassword),
        [originalPassword]
    );

    const {
        control,
        handleSubmit,
        reset,
        formState: {errors, isValid},
    } = useForm({
        resolver: yupResolver(schema),
        mode: 'onChange',
        defaultValues: {confirmPassword: ''},
    });

    const onSubmit = async () => {
        const result = await handleRegister(email, originalPassword, role);
        if (result.status === 'success') {
            navigation.replace('HomeFlow');
        } else {
            reset({confirmPassword: ''});
        }
    };

    return (
        <QuestionLayout
            navigation={navigation}
            title="Confirm your password"
            subtitle="Re-enter your password to finish registration"
            isValid={isValid}
            isLoading={isLoading}
            continueLabel="Create account"
            onContinue={handleSubmit(onSubmit)}
        >
            <PasswordField
                control={control}
                name="confirmPassword"
                placeholder="Re-enter password"
                autoFocus
                textContentType="newPassword"
                editable={!isLoading}
                error={errors.confirmPassword?.message}
            />
        </QuestionLayout>
    );
}
