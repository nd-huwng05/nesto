import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { QuestionLayout } from '../../layout/QuestionLayout';
import { OtpCodeInput } from '../../components/auth/OtpCodeInput';
import { useRegister } from '../../hooks/account/useRegister';

export default function OtpRegisterScreen({ navigation, route }) {
    const role = route?.params?.role || 'CUSTOMER';
    const emailFromParams = route?.params?.email || route?.params?.payload?.email || '';
    const email = String(emailFromParams || '').trim().toLowerCase();
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
        const normalizedOtp = String(otp || '').trim();
        if (!email) {
            setError('Email is missing. Please go back and try again.');
            return;
        }
        if (normalizedOtp.length !== 6) {
            setError('Invalid OTP. Please enter all 6 digits.');
            return;
        }
        setVerifying(true);
        setError(null);

        try {
            const result = await verifyOtpCode(email, normalizedOtp);
            if (result.success) {
                navigation.navigate('PasswordRegisterScreen', { email, role });
            }
        } catch (err) {
            const errorMessage = err?.message || 'Incorrect verification code. Please try again.';
            Alert.alert('Verification failed', errorMessage);
            setError(errorMessage);
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        if (isSendingOtp) return;
        if (!email) {
            Alert.alert('Error', 'Email is missing. Please restart registration.');
            return;
        }
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
            <View>
                <OtpCodeInput
                    onComplete={handleComplete}
                    onResend={handleResend}
                    verifying={verifying}
                    isSending={isSendingOtp}
                    error={error}
                    onClearError={() => setError(null)}
                />
                {(verifying || isSendingOtp) ? (
                    <View className="absolute inset-0 items-center justify-center bg-white/70">
                        <ActivityIndicator size="large" color="#8294FF" />
                    </View>
                ) : null}
            </View>
        </QuestionLayout>
    );
}
