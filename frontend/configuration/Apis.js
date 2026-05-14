import axios from 'axios'
import AsyncStorage from "@react-native-async-storage/async-storage";

export const endpoints = {}

const axiosClient = axios.create({
    baseURL: process.env.EXPO_BASE_URL,
    timeout: 100000,
    headers: {
        'Content-Type': 'application/json'
    }
})

axiosClient.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
}, (error) => Promise.reject(error));

export default axiosClient