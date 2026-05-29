import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {extractApiErrorMessage} from '../utils/apiError';
import {
    getValidAccessToken,
    onAuthFailure,
    refreshAccessToken,
} from '../utils/tokenRefresh';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
});

export const endpoints = {
    'login': '/token/',
    'refresh-token': '/token/',
    'revoke-token': '/revoke_token/',
    'current-user': '/accounts/users/me/',
    'send-otp': '/accounts/auth/send_otp/',
    'verify-otp': '/accounts/auth/verify_otp/',
    'send-business-otp': '/accounts/auth/send_business_otp/',
    'verify-business-otp': '/accounts/auth/verify_business_otp/',
    'google-auth': '/accounts/auth/google/',
    'register': '/accounts/auth/register/',
    'forgot-password': '/accounts/auth/forgot_password/',
    'reset-password': '/accounts/auth/reset_password/',
    'change-password': '/accounts/auth/change_password/',
    'companies': '/businesses/companies/',
    'company-detail': (companyId) => `/businesses/companies/${companyId}/`,
    'business-metadata': '/businesses/metadata/options/',
    'business-analytics-dashboard': '/businesses/analytics/dashboard/',
    'branches': '/businesses/branches/',
    'branch-detail': (branchId) => `/businesses/branches/${branchId}/`,
    'departments': '/businesses/departments/',
    'department-detail': (departmentId) => `/businesses/departments/${departmentId}/`,
    'staff-profiles': '/businesses/staff-profiles/',
    'staff-profile-detail': (staffId) => `/businesses/staff-profiles/${staffId}/`,
    'room-types': '/operations/room-types/',
    'room-type-detail': (roomTypeId) => `/operations/room-types/${roomTypeId}/`,
    'rooms': '/operations/rooms/',
    'room-detail': (roomId) => `/operations/rooms/${roomId}/`,
    'customer-catalog': '/operations/customer-catalog/',
    'branch-room-types': '/operations/branch-room-types/',
    'housekeeping-tasks': '/operations/housekeeping-tasks/',
    'housekeeping-task-detail': (taskId) => `/operations/housekeeping-tasks/${taskId}/`,
    'housekeeping-task-complete': (taskId) => `/operations/housekeeping-tasks/${taskId}/complete/`,
    'housekeeping-task-start': (taskId) => `/operations/housekeeping-tasks/${taskId}/start/`,
    'bookings': '/operations/bookings/',
    'booking-detail': (bookingId) => `/operations/bookings/${bookingId}/`,
    'bookings-for-day': '/operations/bookings/for-day/',
    'booking-checkin': (bookingId) => `/operations/bookings/${bookingId}/confirm-checkin/`,
    'booking-assign-checkin': (bookingId) => `/operations/bookings/${bookingId}/assign-room-and-checkin/`,
    'booking-switch-room': (bookingId) => `/operations/bookings/${bookingId}/switch-room/`,
    'booking-checkout': (bookingId) => `/operations/bookings/${bookingId}/checkout/`,
    'booking-add-extra-service': (bookingId) => `/operations/bookings/${bookingId}/add-extra-service/`,
    'booking-lookup': '/operations/bookings/lookup/',
    'booking-available-rooms': (bookingId) => `/operations/bookings/${bookingId}/available-rooms/`,
    'booking-final-bill': (bookingId) => `/operations/bookings/${bookingId}/final-bill/`,
    'customer-bookings': '/operations/customer-bookings/',
    'customer-booking-detail': (bookingId) => `/operations/customer-bookings/${bookingId}/`,
    'customer-booking-check-in': (bookingId) => `/operations/customer-bookings/${bookingId}/check-in/`,
    'customer-booking-add-service': (bookingId) => `/operations/customer-bookings/${bookingId}/add-service/`,
    'customer-booking-live-bill': (bookingId) => `/operations/customer-bookings/${bookingId}/live-bill/`,
    'booking-live-bill': (bookingId) => `/operations/bookings/${bookingId}/live-bill/`,
    'customer-booking-quote': '/operations/customer-bookings/quote/',
    'reviews': '/operations/reviews/',
    'review-locket-feed': '/operations/reviews/locket-feed/',
    'review-toggle-heart': (reviewId) => `/operations/reviews/${reviewId}/toggle-heart/`,
    'cloudinary-upload': '/media/cloudinary-upload/',
    'ai-search': '/operations/ai-search/',
    'search-suggestions': '/search/suggestions/',
    'favorites': '/operations/favorites/',
    'themes': '/operations/themes/',
    'branch-themes': '/operations/branch-themes/',
    'branch-theme-toggle': '/operations/branch-themes/toggle/',
    'service-orders': '/operations/service-orders/',
    'service-order-detail': (orderId) => `/operations/service-orders/${orderId}/`,
    'service-order-accept': (orderId) => `/operations/service-orders/${orderId}/accept/`,
    'service-order-complete': (orderId) => `/operations/service-orders/${orderId}/complete/`,
    'service-order-cancel': (orderId) => `/operations/service-orders/${orderId}/cancel/`,
    'extra-services': '/operations/extra-services/',
    'extra-service-detail': (serviceId) => `/operations/extra-services/${serviceId}/`,
    'maintenance-rooms': '/operations/maintenance-rooms/',
    'maintenance_rooms': '/operations/maintenance-rooms/',
    'reports': '/billing/reports/',
    'report-detail': (reportId) => `/billing/reports/${reportId}/`,
    'invoices': '/billing/invoices/',
    'invoice-detail': (invoiceId) => `/billing/invoices/${invoiceId}/`,
    'transactions': '/billing/transactions/',
    'transaction-detail': (transactionId) => `/billing/transactions/${transactionId}/`,
    'payments-momo': '/payments/momo/',
    'payments-zalopay': '/payments/zalopay/',
};

api.interceptors.request.use(async (config) => {
    const token = await getValidAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;
        const newToken = await refreshAccessToken();
        if (!newToken) {
            return Promise.reject(error);
        }

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
    }
);

export {onAuthFailure};

export default api;
