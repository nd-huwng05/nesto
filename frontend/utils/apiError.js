export function extractApiErrorMessage(error, fallback = 'Request failed.') {
    const data = error?.response?.data;
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
    return error?.message || fallback;
}

