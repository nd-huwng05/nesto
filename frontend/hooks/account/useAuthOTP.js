import {useState, useCallback} from 'react';
import {checkOTP, sendOTP} from '../../services/AuthService';
import {getErrorMessage} from '../../utils/authErrors';

export const useAuthOTP = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSendOTP = useCallback(async (contact) => {
        setLoading(true);
        setError(null);
        try {
            const res = await sendOTP(contact);
            return res?.response ?? res;
        } catch (err) {
            const message = getErrorMessage(err, 'Failed to send verification code');
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const handleVerifyOTP = useCallback(async (otp) => {
        setLoading(true);
        setError(null);
        try {
            const res = await checkOTP(otp);
            return res?.response ?? res;
        } catch (err) {
            const message = getErrorMessage(err, 'Incorrect verification code');
            setError(message);
            throw message;
        } finally {
            setLoading(false);
        }
    }, []);

    return {handleSendOTP, handleVerifyOTP, loading, error, setError};
};
