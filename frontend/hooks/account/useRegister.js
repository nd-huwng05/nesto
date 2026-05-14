import {useState} from "react";
import {registerEmail} from "../../services/AuthService";

export const useRegister = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleRegister = async (email, password) => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await registerEmail(email, password)
            return res.response;
        } catch (err) {
            const msg = err.response?.message || "Register successfully"
            setError(msg)
            throw err
        } finally {
            setIsLoading(false)
        }
    }

    return {handleRegister, isLoading, error, setError}
}