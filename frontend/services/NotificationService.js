import AsyncStorage from '@react-native-async-storage/async-storage';
import {CustomerService} from './CustomerService';

export const CUSTOMER_NOTIFICATIONS_KEY = 'customer_notifications_v1';

const toSafeArray = (value) => {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item === 'object');
};

const sortByCreatedAtDesc = (items) => {
    return [...items].sort((left, right) => (Date.parse(right?.createdAt || right?.created_at || 0) || 0) - (Date.parse(left?.createdAt || left?.created_at || 0) || 0));
};

const normalizeNotification = (item) => {
    if (!item || typeof item !== 'object') return null;
    return {
        ...item,
        id: item?.id || item?.notification_id || item?.notificationId || '',
        type: item?.type || item?.notification_type || 'general',
        read: Boolean(item?.read ?? item?.is_read),
        createdAt: item?.createdAt || item?.created_at || new Date().toISOString(),
    };
};

const extractResultItems = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;
    return [];
};

export const listCustomerNotifications = async () => {
    try {
        const response = await CustomerService.listNotifications();
        if (response?.success) {
            const mapped = toSafeArray(extractResultItems(response?.data))
                .map(normalizeNotification)
                .filter(Boolean);

            await AsyncStorage.setItem(CUSTOMER_NOTIFICATIONS_KEY, JSON.stringify(mapped));
            return sortByCreatedAtDesc(mapped);
        }
    } catch {
        // Fall back to local cache.
    }

    const raw = await AsyncStorage.getItem(CUSTOMER_NOTIFICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const safe = toSafeArray(parsed).map(normalizeNotification).filter(Boolean);
    return sortByCreatedAtDesc(safe);
};

export const pushCustomerNotification = async ({title, message, type = 'general', meta = null}) => {
    const payload = {
        title: String(title || 'Notification').trim() || 'Notification',
        message: String(message || '').trim(),
        type: String(type || 'general').trim() || 'general',
        meta: meta && typeof meta === 'object' ? meta : null,
        read: false,
    };

    try {
        const response = await CustomerService.listNotifications();
        const existing = response?.success ? toSafeArray(extractResultItems(response?.data)) : [];
        const createResult = await CustomerService.createNotification?.(payload);
        if (createResult?.success) {
            const nextNotification = normalizeNotification(createResult?.data);
            const next = sortByCreatedAtDesc([nextNotification, ...existing.map(normalizeNotification).filter(Boolean)]).slice(0, 200);
            await AsyncStorage.setItem(CUSTOMER_NOTIFICATIONS_KEY, JSON.stringify(next));
            return nextNotification;
        }
    } catch {
        // Fall back to local cache.
    }

    const notifications = await listCustomerNotifications();
    const nextNotification = normalizeNotification({
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        ...payload,
        createdAt: new Date().toISOString(),
    });
    const next = [nextNotification, ...notifications].slice(0, 200);
    await AsyncStorage.setItem(CUSTOMER_NOTIFICATIONS_KEY, JSON.stringify(next));
    return nextNotification;
};

export const markAllCustomerNotificationsRead = async () => {
    try {
        const response = await CustomerService.markAllNotificationsRead();
        if (response?.success) {
            const refreshed = await listCustomerNotifications();
            return refreshed.map((item) => ({...item, read: true}));
        }
    } catch {
        // Fall back to local cache.
    }

    const notifications = await listCustomerNotifications();
    const next = notifications.map((item) => ({...item, read: true}));
    await AsyncStorage.setItem(CUSTOMER_NOTIFICATIONS_KEY, JSON.stringify(next));
    return next;
};

export const getUnreadCustomerNotificationCount = async () => {
    const notifications = await listCustomerNotifications();
    return notifications.reduce((count, item) => count + (item?.read ? 0 : 1), 0);
};
