import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { endpoints } from '../configuration/Apis';

export const CUSTOMER_NOTIFICATIONS_KEY = 'customer_notifications_v1';

const toSafeArray = (value) => {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item === 'object');
};

const normalizeNotification = (item) => ({
    id: String(item?.id || item?.notificationId || ''),
    title: String(item?.title || 'Notification').trim() || 'Notification',
    message: String(item?.message || '').trim(),
    type: String(item?.type || item?.notification_type || 'general').trim() || 'general',
    meta: item?.meta && typeof item.meta === 'object' ? item.meta : null,
    read: Boolean(item?.read),
    createdAt: item?.createdAt || item?.created_at || new Date().toISOString(),
});

const cacheNotifications = async (items) => {
    await AsyncStorage.setItem(CUSTOMER_NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, 200)));
};

const fetchServerNotifications = async () => {
    const response = await api.get(endpoints.notifications);
    const rows = response.data?.results || response.data || [];
    const normalized = toSafeArray(rows).map(normalizeNotification).filter((item) => item.id);
    normalized.sort(
        (left, right) => (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0)
    );
    await cacheNotifications(normalized);
    return normalized;
};

export const listCustomerNotifications = async () => {
    try {
        return await fetchServerNotifications();
    } catch (error) {
        const raw = await AsyncStorage.getItem(CUSTOMER_NOTIFICATIONS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const safe = toSafeArray(parsed).map(normalizeNotification);
        return safe.sort(
            (left, right) => (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0)
        );
    }
};

export const markAllCustomerNotificationsRead = async () => {
    try {
        await api.post(endpoints['notifications-mark-all-read']);
    } catch (error) {
        // Fall back to local cache when offline.
    }

    const notifications = await listCustomerNotifications();
    const next = notifications.map((item) => ({ ...item, read: true }));
    await cacheNotifications(next);
    return next;
};

export const markCustomerNotificationRead = async (notificationId) => {
    const id = String(notificationId || '').trim();
    if (!id) return null;

    try {
        await api.post(endpoints['notification-mark-read'](id));
    } catch (error) {
        // Offline fallback below.
    }

    const notifications = await listCustomerNotifications();
    const next = notifications.map((item) =>
        item.id === id ? { ...item, read: true } : item
    );
    await cacheNotifications(next);
    return next.find((item) => item.id === id) || null;
};

export const getUnreadCustomerNotificationCount = async () => {
    const notifications = await listCustomerNotifications();
    return notifications.reduce((count, item) => count + (item?.read ? 0 : 1), 0);
};
