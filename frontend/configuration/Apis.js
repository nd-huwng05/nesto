import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

const LOCAL_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_BASE_URL || process.env.EXPO_BASE_URL || `http://${LOCAL_HOST}:8000/api/v1`;
const OAUTH_URL = process.env.EXPO_PUBLIC_OAUTH_URL || process.env.EXPO_PUBLIC_OAUTH_BASE_URL || process.env.EXPO_PUBLIC_BASE_URL || process.env.EXPO_BASE_URL || `http://${LOCAL_HOST}:8000/o`;
const CLIENT_ID = process.env.EXPO_PUBLIC_CLIENT_ID;

export const authClient = axios.create({
    baseURL: OAUTH_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
});

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const currentRefreshToken = await AsyncStorage.getItem('refresh_token');
                if (currentRefreshToken) {
                    const params = new URLSearchParams();
                    params.append('grant_type', 'refresh_token');
                    params.append('refresh_token', currentRefreshToken);
                    params.append('client_id', CLIENT_ID);

                    const response = await authClient.post('/token/', params.toString());
                    const newAccessToken = response.data.access_token;
                    const newRefreshToken = response.data.refresh_token;

                    await AsyncStorage.setItem('access_token', newAccessToken);
                    if (newRefreshToken) {
                        await AsyncStorage.setItem('refresh_token', newRefreshToken);
                    }

                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                console.error('[Refresh Failed]', refreshError);
                await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user', 'role']);
            }
        }
        return Promise.reject(error);
    }
);


export const endpoints = {
    token: 'token/',
    revoke_token: 'revoke_token/',

    register: 'accounts/auth/register/',
    send_otp: 'accounts/auth/send_otp/',
    verify_otp: 'accounts/auth/verify_otp/',
    forgot_password: 'accounts/auth/forgot_password/',
    reset_password: 'accounts/auth/reset_password/',

    me: 'accounts/users/me/',
    user_me: 'accounts/users/me/',
    login: 'token/',

    get_companies: 'business/companies/',
    get_company_detail: 'business/companies',
    create_company: 'business/companies/',
    update_company: 'business/companies',
    delete_company: 'business/companies',

    get_business_list: 'business/businesses/',
    get_business_detail: 'business/businesses',
    create_business: 'business/businesses/',
    update_business: 'business/businesses',
    delete_business: 'business/businesses',

    get_branch_detail: 'business/branches',
    create_branch: 'business/branches/',
    update_branch: 'business/branches',
    delete_branch: 'business/branches',

    get_departments: 'business/departments/',
    create_department: 'business/departments/',
    update_department: 'business/departments/',
    delete_department: 'business/departments/',

    get_room_types: 'rooms/room-types/',
    create_room_type: 'rooms/room-types/',
    update_room_type: 'rooms/room-types',
    delete_room_type: 'rooms/room-types',

    get_rooms: 'rooms/rooms/',
    create_room: 'rooms/rooms/',
    update_room: 'rooms/rooms',
    delete_room: 'rooms/rooms',
    get_room_availability: 'rooms/rooms/availability/',
    update_room_status: 'rooms/rooms/update_status/',

    get_extra_services: 'services/extra-services/',
    create_extra_service: 'services/extra-services/',
    update_extra_service: 'services/extra-services',
    delete_extra_service: 'services/extra-services',

    get_service_categories: 'services/service-categories/',
    create_service_category: 'services/service-categories/',
    update_service_category: 'services/service-categories/',
    delete_service_category: 'services/service-categories/',

    get_service_orders: 'services/service-orders/',
    create_service_order: 'services/service-orders/',
    update_service_order: 'services/service-orders',
    pending_service_orders: 'services/service-orders/pending/',
    assign_service_order: 'services/service-orders',

    get_staff_list: 'hrm/staff/',
    create_staff: 'hrm/staff/',
    update_staff: 'hrm/staff',
    delete_staff: 'hrm/staff',
    get_staff_schedule: 'hrm/staff',

    get_booking: 'bookings/bookings',
    list_bookings: 'bookings/bookings/',
    create_booking: 'bookings/bookings/',
    check_in_booking: 'bookings/bookings/check_in/',
    check_out_booking: 'bookings/bookings/check_out/',
    confirm_booking: 'bookings/bookings/confirm/',
    cancel_booking: 'bookings/bookings/cancel/',
    add_room_to_booking: 'bookings/bookings',
    add_service_to_booking: 'bookings/bookings',
    upcoming_bookings: 'bookings/bookings/upcoming/',
    today_bookings: 'bookings/bookings/today/',
    calendar_bookings: 'bookings/bookings/calendar/',

    get_customers: 'bookings/customers/',
    create_customer: 'bookings/customers/',

    get_invoices: 'payments/invoices/',
    create_invoice: 'payments/invoices/',
    update_invoice: 'payments/invoices',

    get_transactions: 'payments/transactions/',
    create_transaction: 'payments/transactions/',
    transaction_summary: 'payments/transactions/summary/',
    recent_transactions: 'payments/transactions/recent/',

    get_payment_providers: 'payments/payment-providers/',
    create_payment_provider: 'payments/payment-providers/',

    get_report_dashboard: 'reports/reports/dashboard/',
    get_report_occupancy: 'reports/reports/occupancy/',
    get_report_revenue: 'reports/reports/revenue/',
    get_report_booking_stats: 'reports/reports/booking_stats/',

    review_forum: 'reviews/forum',
    review_forum_toggle_heart: 'reviews/forum',

    customer_booking_snapshots: 'customers/me/booking-snapshots',
    customer_booking_snapshot_detail: 'customers/me/booking-snapshots',

    customer_notifications: 'customers/me/notifications',
    customer_notifications_mark_all_read: 'customers/me/notifications/mark-all-read',
    customer_notification_mark_read: 'customers/me/notifications',

    customer_watchlist_posts: 'customers/watchlist/posts',
    customer_watchlist_post_detail: 'customers/watchlist/posts',

    customer_hotel_ratings: 'customers/me/hotel-ratings',
    customer_hotel_rating_stats: 'customers/hotels',
    customer_hotels: 'business/hotels/',

    mark_room_clean: 'rooms/rooms/update_status/',
    mark_room_dirty: 'rooms/rooms/update_status/',
    housekeeping_rooms: 'rooms/rooms/',
    maintenance_rooms: 'rooms/maintenance/',
};

export default apiClient;
export { apiClient, API_BASE_URL, OAUTH_URL, CLIENT_ID };
