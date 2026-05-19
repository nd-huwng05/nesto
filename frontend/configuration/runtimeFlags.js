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
    const raw = readEnv('EXPO_PUBLIC_MOCK', 'EXPO_PRIVATE_MOCK');
    if (!raw) {
        return true;
    }

    const normalized = raw.toLowerCase();
    return normalized !== 'false' && normalized !== '0' && normalized !== 'off' && normalized !== 'no';
};

export const getApiBaseUrl = () => readEnv('EXPO_PUBLIC_BASE_URL', 'EXPO_BASE_URL');