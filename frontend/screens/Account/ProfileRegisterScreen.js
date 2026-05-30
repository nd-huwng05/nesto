import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { QuestionLayout } from '../../layout/QuestionLayout';
import { AuthTextField } from '../../components/auth/AuthTextField';
import { useRegister } from '../../hooks/account/useRegister';
import { nameSchema } from '../../validation/authSchemas';
import { resetToHomeFlow } from '../../utils/navigation';

export default function ProfileRegisterScreen({ navigation, route }) {
    const { email, password, role } = route.params || {};
    const { handleRegister, isLoading } = useRegister();

    const {
        control,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm({
        resolver: yupResolver(nameSchema),
        mode: 'onChange',
        defaultValues: {
            name: '',
        },
    });

    const onSubmit = async ({ name }) => {
        const result = await handleRegister({
            email,
            password,
            confirmPassword: password,
            name,
            role,
        });

        if (result.status === 'success') {
            resetToHomeFlow(navigation);
        }
    };

    return (
        <QuestionLayout
            navigation={navigation}
            title="What's your name?"
            subtitle="This will be displayed on your profile"
            isValid={isValid}
            isLoading={isLoading}
            continueLabel="Create account"
            onContinue={handleSubmit(onSubmit)}
        >
            <AuthTextField
                control={control}
                name="name"
                placeholder="Full Name"
                textContentType="name"
                autoFocus
                error={errors.name?.message}
            />
        </QuestionLayout>
    );
}
