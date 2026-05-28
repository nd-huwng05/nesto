import AsyncStorage from '@react-native-async-storage/async-storage';

export const CUSTOMER_NOTIFICATIONS_KEY = 'customer_notifications_v1';

const toSafeArray = (value) => {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item === 'object');
};

export const listCustomerNotifications = async () => {
    const raw = await AsyncStorage.getItem(CUSTOMER_NOTIFICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const safe = toSafeArray(parsed);
    return safe.sort((left, right) => (Date.parse(right?.createdAt || 0) || 0) - (Date.parse(left?.createdAt || 0) || 0));
};

export const pushCustomerNotification = async ({title, message, type = 'general', meta = null}) => {
    const notifications = await listCustomerNotifications();
    const nextNotification = {
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        title: String(title || 'Notification').trim() || 'Notification',
        message: String(message || '').trim(),
        type: String(type || 'general').trim() || 'general',
        meta: meta && typeof meta === 'object' ? meta : null,
        read: false,
        createdAt: new Date().toISOString(),
    };

    const next = [nextNotification, ...notifications].slice(0, 200);
    await AsyncStorage.setItem(CUSTOMER_NOTIFICATIONS_KEY, JSON.stringify(next));
    return nextNotification;
};

export const markAllCustomerNotificationsRead = async () => {
    const notifications = await listCustomerNotifications();
    const next = notifications.map((item) => ({...item, read: true}));
    await AsyncStorage.setItem(CUSTOMER_NOTIFICATIONS_KEY, JSON.stringify(next));
    return next;
};

export const getUnreadCustomerNotificationCount = async () => {
    const notifications = await listCustomerNotifications();
    return notifications.reduce((count, item) => count + (item?.read ? 0 : 1), 0);
};
