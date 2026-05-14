import {useState} from "react";
import {authApi} from "../../services/AuthService";
import {Vibration} from "react-native";

export const useAuth = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = async (email, password) => {
        setIsLoading(true)
        setError(null);

        try {
            const response = await authApi(email, password);
            if(response.status === 'success' || response.status === 200) {
                return {success: true, data: response.data};
            }
        } catch (err) {
            const errMsg = err.response?.message || "Something went wrong";
            setError(errMsg);
            Vibration.vibrate([0,100,50,100])
            return {success: false, message: errMsg}
        } finally {
            setIsLoading(false)
        }
    };

    return { login, isLoading, error, setError}
}