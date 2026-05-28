const readEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }
    return '';
};

export const shouldUseMockApi = () => {
    return false;
};

export const getApiBaseUrl = () => readEnv('EXPO_PUBLIC_BASE_URL', 'EXPO_BASE_URL');