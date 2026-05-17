import {Alert, Text} from 'react-native';
import {QuestionLayout} from '../../layout/QuestionLayout';
import {OtpCodeInput} from '../../components/auth/OtpCodeInput';
import {useAuthOTP} from '../../hooks/account/useAuthOTP';
import {getErrorMessage} from '../../utils/authErrors';

export default function OtpRegisterScreen({navigation, route}) {
    const {email, role} = route.params || {};
    const {handleVerifyOTP, handleSendOTP, loading, error, setError} = useAuthOTP();

    const maskedEmail = email
        ? email.replace(/(.{2})(.*)(@.*)/, (_, start, mid, domain) => `${start}${'*'.repeat(Math.min(mid.length, 6))}${domain}`)
        : '';

    const handleComplete = async (otp) => {
        try {
            await handleVerifyOTP(otp);
            navigation.navigate('PasswordRegisterScreen', {email, role});
        } catch {
            // Inline error is set by useAuthOTP
        }
    };

    const handleResend = async () => {
        try {
            await handleSendOTP(email);
        } catch (err) {
            Alert.alert('Verification error', getErrorMessage(err, 'Failed to resend code.'));
        }
    };

    return (
        <QuestionLayout
            navigation={navigation}
            title="Verify your email"
            subtitle={`Enter the 6-digit code sent to ${maskedEmail || 'your email'}`}
            hideContinue
            footerText={
                <Text className="text-[12px] font-sf text-gray-400 mb-4 text-center w-full">
                    Mock code for testing: <Text className="font-sf-semi">000000</Text>
                </Text>
            }
        >
            <OtpCodeInput
                onComplete={handleComplete}
                onResend={handleResend}
                loading={loading}
                error={error}
                onClearError={() => setError(null)}
            />
        </QuestionLayout>
    );
}
