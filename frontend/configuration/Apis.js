import axios from 'axios'
import AsyncStorage from "@react-native-async-storage/async-storage";

export const endpoints = {
    get_report_businesses: '/reports/businesses',
    get_report_branches: '/reports/branches',
    get_report_dashboard: '/reports/dashboard',
    get_staff_list: '/staff',
    create_staff: '/staff',
    update_staff: '/staff',
    delete_staff: '/staff',
    get_booking: '/reception/bookings',
    check_in_booking: '/reception/bookings',
}

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