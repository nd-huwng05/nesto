import {Alert, Text} from 'react-native';
import {useForm} from 'react-hook-form';
import {yupResolver} from '@hookform/resolvers/yup';
import {QuestionLayout} from '../../layout/QuestionLayout';
import {AuthTextField} from '../../components/auth/AuthTextField';
import {AuthAlternateButton} from '../../components/auth/AuthAlternateButton';
import {phoneSchema} from '../../validation/authSchemas';

const TERMS_FOOTER = (
    <Text className="text-[12px] font-sf text-gray-400 mb-4 text-center w-3/4">
        By tapping Continue, you agree to our
        <Text className="text-gray-600 font-sf-semi"> Terms of Service</Text> and
        <Text className="text-gray-600 font-sf-semi"> Privacy Policy</Text>
    </Text>
);

export default function PhoneLoginScreen({navigation}) {
    const {
        control,
        handleSubmit,
        formState: {errors, isValid},
    } = useForm({
        resolver: yupResolver(phoneSchema),
        mode: 'onChange',
        defaultValues: {phone: ''},
    });

    const onSubmit = ({phone}) => {
        navigation.navigate('PasswordScreen', {identifier: phone.trim(), type: 'phone'});
    };

    return (
        <QuestionLayout
            navigation={navigation}
            title="What's your phone number?"
            isValid={isValid}
            onContinue={handleSubmit(onSubmit)}
            footerText={TERMS_FOOTER}
        >
            <AuthTextField
                control={control}
                name="phone"
                placeholder="Phone number"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoFocus
                error={errors.phone?.message}
            />

            <AuthAlternateButton
                icon="mail"
                label="Use email instead"
                onPress={() => navigation.replace('EmailLoginScreen')}
            />
            <AuthAlternateButton
                icon="google"
                label="Use Google instead"
                onPress={() =>
                    Alert.alert(
                        'Coming soon',
                        'Google sign-in will be available in a future release.'
                    )
                }
            />
        </QuestionLayout>
    );
}
