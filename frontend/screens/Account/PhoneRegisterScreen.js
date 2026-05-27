import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { QuestionLayout } from '../../layout/QuestionLayout';
import { AuthTextField } from '../../components/auth/AuthTextField';
import { phoneSchema } from '../../validation/authSchemas';

export default function PhoneRegisterScreen({ navigation, route }) {
    const { email, password, role } = route.params || {};

    const {
        control,
        handleSubmit,
        formState: { errors, isValid },
    } = useForm({
        resolver: yupResolver(phoneSchema),
        mode: 'onChange',
        defaultValues: { phone: '' },
    });

    const onSubmit = ({ phone }) => {
        navigation.navigate('ProfileRegisterScreen', { email, password, role, phone });
    };

    return (
        <QuestionLayout
            navigation={navigation}
            title="What's your phone number?"
            subtitle="We'll use this to contact you about your bookings"
            isValid={isValid}
            onContinue={handleSubmit(onSubmit)}
        >
            <AuthTextField
                control={control}
                name="phone"
                placeholder="Phone Number"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoFocus
                error={errors.phone?.message}
            />
        </QuestionLayout>
    );
}
