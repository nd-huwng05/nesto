import {Text, TouchableOpacity} from 'react-native';
import {useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import {QuestionLayout} from '../../layout/QuestionLayout';
import {PasswordField} from '../../components/auth/PasswordField';
import {loginPasswordSchema} from '../../validation/authSchemas';
import {useAuth} from '../../hooks/account/useAuth';

export default function PasswordScreen({navigation, route}) {
    const {identifier, type} = route.params || {};
    const {login, isLoading} = useAuth();

    const {
        control,
        handleSubmit,
        reset,
        formState: {errors, isValid},
    } = useForm({
        resolver: yupResolver(loginPasswordSchema),
        mode: 'onChange',
        defaultValues: {password: ''},
    });

    const onSubmit = async ({password}) => {
        const result = await login(identifier, password);
        if (result.success) {
            navigation.replace('HomeFlow');
        } else {
            reset({password: ''});
        }
    };

    const identifierLabel = type === 'phone' ? 'phone number' : 'email';

    return (
        <QuestionLayout
            navigation={navigation}
            title="What's your password?"
            subtitle={`Signing in with your ${identifierLabel}`}
            isValid={isValid}
            isLoading={isLoading}
            continueLabel="Sign in"
            onContinue={handleSubmit(onSubmit)}
        >
            <PasswordField
                control={control}
                name="password"
                placeholder="Password"
                autoFocus
                editable={!isLoading}
                error={errors.password?.message}
            />

            <TouchableOpacity
                className="bg-gray-100 px-4 py-2 rounded-full self-center mt-4"
                onPress={() => navigation.navigate('ForgotPasswordScreen')}
                disabled={isLoading}
            >
                <Text className="font-sf-semi text-gray-700 text-sm">Forgot password?</Text>
            </TouchableOpacity>
        </QuestionLayout>
    );
}
