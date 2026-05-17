import {QuestionLayout} from '../../layout/QuestionLayout';
import {PasswordField} from '../../components/auth/PasswordField';
import {useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import {passwordSchema} from '../../validation/authSchemas';

const PASSWORD_HINT =
    'Use at least 8 characters with uppercase, a number, and a special character (@$!%*?&#).';

export default function PasswordRegisterScreen({navigation, route}) {
    const {email, role} = route.params || {};

    const {
        control,
        handleSubmit,
        formState: {errors, isValid},
    } = useForm({
        resolver: yupResolver(passwordSchema),
        mode: 'onChange',
        defaultValues: {password: ''},
    });

    const onSubmit = ({password}) => {
        navigation.navigate('RePasswordRegisterScreen', {email, password, role});
    };

    return (
        <QuestionLayout
            navigation={navigation}
            title="Create a password"
            subtitle="Choose a strong password for your account"
            isValid={isValid}
            onContinue={handleSubmit(onSubmit)}
        >
            <PasswordField
                control={control}
                name="password"
                placeholder="Password"
                autoFocus
                textContentType="newPassword"
                error={errors.password?.message}
                hint={PASSWORD_HINT}
            />
        </QuestionLayout>
    );
}
