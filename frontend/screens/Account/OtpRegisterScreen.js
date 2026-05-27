import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { QuestionLayout } from '../../layout/QuestionLayout';
import { OtpCodeInput } from '../../components/auth/OtpCodeInput';
import { useRegister } from '../../hooks/account/useRegister';

export default function OtpRegisterScreen({ navigation, route }) {
    const { email, role } = route.params || {};
    const { verifyOtpCode, sendVerificationOtp } = useRegister();

    const [verifying, setVerifying] = useState(false);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [error, setError] = useState(null);

    const maskedEmail = email
        ? email.replace(/(.{2})(.*)(@.*)/, (_, start, mid, domain) =>
              `${start}${'*'.repeat(Math.min(mid.length, 6))}${domain}`
          )
        : '';

    const handleComplete = async (otp) => {
        setVerifying(true);
        setError(null);

        try {
            const result = await verifyOtpCode(email, otp);
            if (result.success) {
                navigation.navigate('PasswordRegisterScreen', { email, role });
            }
        } catch (err) {
            const errorMessage = err?.message || 'Incorrect verification code. Please try again.';
            setError(errorMessage);
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        if (isSendingOtp) return;
        setIsSendingOtp(true);
        setError(null);

        try {
            const result = await sendVerificationOtp(email);
            if (result.success) {
                Alert.alert('Success', 'A new verification code has been sent to your email.');
            } else {
                Alert.alert('Error', result?.message || 'Failed to resend code. Please try again.');
            }
        } catch (err) {
            Alert.alert('Error', err?.message || 'Failed to resend code. Please try again.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    return (
        <QuestionLayout
            navigation={navigation}
            title="Verify your email"
            subtitle={`Enter the 6-digit code sent to ${maskedEmail || 'your email'}`}
            hideContinue
        >
            <OtpCodeInput
                onComplete={handleComplete}
                onResend={handleResend}
                verifying={verifying}
                isSending={isSendingOtp}
                error={error}
                onClearError={() => setError(null)}
            />
        </QuestionLayout>
    );
}
