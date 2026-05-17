import {useState, useCallback} from 'react';
import {Alert, Vibration} from 'react-native';
import {authApi} from '../../services/AuthService';
import {saveSession} from '../../utils/authStorage';
import {getErrorMessage} from '../../utils/authErrors';

export const useAuth = () => {
    const [isLoading, setIsLoading] = useState(false);

    const login = useCallback(async (identifier, password, role = 'business') => {
        setIsLoading(true);
        try {
            const response = await authApi(identifier, password);
            const token = response?.data?.access_token;
            const user = response?.data?.user;

            if ((response?.status === 'success' || response?.status === 200) && token) {
                await saveSession(token, user || role);
                return {success: true, data: response.data, user};
            }

            const message = 'Login failed. Please check your credentials.';
            Alert.alert('Sign in failed', message);
            Vibration.vibrate([0, 100, 50, 100]);
            return {success: false, message};
        } catch (err) {
            const message = getErrorMessage(err, 'Email or password is incorrect');
            Alert.alert('Sign in failed', message);
            Vibration.vibrate([0, 100, 50, 100]);
            return {success: false, message};
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {login, isLoading};
};
