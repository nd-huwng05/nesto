const NETWORK_ERROR_CODES = new Set([
    'ERR_NETWORK',
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
]);

export function isTimeoutError(error) {
    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || '').toLowerCase();
    return code === 'ECONNABORTED' || message.includes('timeout');
}

/** True when the device likely has no internet or cannot reach the server. */
export function isNetworkError(error) {
    if (!error || error.response) {
        return false;
    }

    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || '').trim().toLowerCase();

    if (NETWORK_ERROR_CODES.has(code)) {
        return true;
    }
    if (message === 'network error' || message.includes('network request failed')) {
        return true;
    }
    if (error.request && !error.response) {
        return true;
    }

    return false;
}

export function getApiErrorAlertTitle(error, fallback = 'Lỗi') {
    if (isNetworkError(error)) {
        return 'Không có kết nối mạng';
    }
    if (isTimeoutError(error)) {
        return 'Kết nối quá chậm';
    }
    return fallback;
}

export function extractApiErrorMessage(error, fallback = 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.') {
    if (isTimeoutError(error)) {
        return 'Kết nối quá chậm hoặc máy chủ không phản hồi. Vui lòng thử lại sau.';
    }

    if (isNetworkError(error)) {
        const code = String(error?.code || '').toUpperCase();
        const message = String(error?.message || '').toLowerCase();
        if (code === 'ENOTFOUND' || message.includes('getaddrinfo')) {
            return (
                'Không thể kết nối máy chủ API.\n\n' +
                'Backend local: bật EXPO_PUBLIC_USE_LOCAL_API=true trong frontend/.env ' +
                'và chạy backend (python manage.py runserver 0.0.0.0:8000).'
            );
        }
        return 'Không có kết nối mạng. Vui lòng bật WiFi hoặc dữ liệu di động rồi thử lại.';
    }

    const data = error?.response?.data;
    if (data?.error === 'invalid_grant') {
        return 'Email hoặc mật khẩu không đúng.';
    }
    if (data?.error === 'invalid_client') {
        return (
            'OAuth client chưa được đăng ký trên server.\n\n' +
            'Chạy backend: python manage.py seed_dev\n' +
            'và đảm bảo EXPO_PUBLIC_CLIENT_ID khớp OAUTH_CLIENT_ID trong backend/.env.'
        );
    }
    if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail;
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object') {
        const parts = Object.entries(data).flatMap(([key, value]) => {
            if (key === 'status_code' || key === 'code') return [];
            if (Array.isArray(value)) return value.map((v) => `${key}: ${String(v)}`);
            if (typeof value === 'string') return [`${key}: ${value}`];
            return [];
        });
        if (parts.length) return parts.join('\n');
    }

    const rawMessage = String(error?.message || '').trim();
    if (rawMessage && rawMessage.toLowerCase() !== 'network error') {
        return rawMessage;
    }

    return fallback;
}
