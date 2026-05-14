import {useState} from "react";
import {checkOTP, sendOTP} from "../../services/AuthService";

export const useAuthOTP = () => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSendOTP  = async (email) => {
        setLoading(true);
        setError(null);
        try {
            const res = await sendOTP(email);
            return res.response;
        } catch (err) {
            setError(err.response?.message || "Send OTP failed");
            throw err;
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyOTP = async (otp) => {
        setLoading(true);
        setError(null);
        try {
            const res = await checkOTP(otp);
            return res.response;
        } catch (err) {
            const msg = err.response?.message || "OTP Incorrect"
            setError(msg)
            throw msg;
        } finally {
            setLoading(false)
        }
    }

    return {
        handleSendOTP, handleVerifyOTP, loading, error, setError
    }
}