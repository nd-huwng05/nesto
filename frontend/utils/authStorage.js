import AsyncStorage from '@react-native-async-storage/async-storage';
import {AUTH_ROLES, isSuperAdmin} from '../constants/authRoles';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ROLE_KEY = 'role';
const USER_KEY = 'user';
const LAST_LOGIN_IDENTIFIER_KEY = 'lastLoginIdentifier';
const SESSION_KIND_KEY = 'sessionKind';

const STAFF_ROLES = new Set([
    AUTH_ROLES.MANAGER,
    AUTH_ROLES.RECEPTIONIST,
    AUTH_ROLES.HOUSEKEEPING,
    AUTH_ROLES.SERVICE,
]);

const resolveSessionKindFromRole = (role) => {
    const normalized = String(role || '').trim().toUpperCase();
    if (normalized === AUTH_ROLES.SUPER_ADMIN) return 'business';
    if (normalized === AUTH_ROLES.BUSINESS_OWNER) return 'business';
    if (normalized === AUTH_ROLES.CUSTOMER) return 'customer';
    if (STAFF_ROLES.has(normalized)) return 'staff';
    return '';
};

const normalizeRole = (role) => {
    const raw = String(role || '').trim();
    if (!raw) return '';
    const upper = raw.toUpperCase();
    // Handle legacy / display values.
    if (upper === 'BUSINESS' || upper === 'BUSSINESS') return AUTH_ROLES.BUSINESS_OWNER;
    if (upper === 'SUPERADMIN' || upper === 'SUPER-ADMIN') return AUTH_ROLES.SUPER_ADMIN;
    if (upper === 'MANAGER' || upper === 'BRANCH MANAGER') return AUTH_ROLES.MANAGER;
    if (upper === 'RECEPTIONIST') return AUTH_ROLES.RECEPTIONIST;
    if (upper === 'HOUSEKEEPING') return AUTH_ROLES.HOUSEKEEPING;
    if (upper === 'SERVICE') return AUTH_ROLES.SERVICE;
    if (upper === 'BUSINESS_OWNER' || upper === 'BUSINESS OWNER') return AUTH_ROLES.BUSINESS_OWNER;
    if (upper === 'CUSTOMER') return AUTH_ROLES.CUSTOMER;
    if (upper === 'SUPER_ADMIN') return AUTH_ROLES.SUPER_ADMIN;
    return upper;
};

export const saveSession = async (token, userOrLegacyRole) => {
    if (typeof userOrLegacyRole === 'string') {
        const role = normalizeRole(userOrLegacyRole);
        const sessionKind = resolveSessionKindFromRole(role);
        await AsyncStorage.multiSet([
            [TOKEN_KEY, token],
            [ROLE_KEY, role],
            [SESSION_KIND_KEY, sessionKind],
        ]);
        await AsyncStorage.removeItem(USER_KEY);
        return;
    }

    const user = userOrLegacyRole;
    const role = normalizeRole(user?.role);
    let sessionKind = resolveSessionKindFromRole(role);
    if (!sessionKind) {
        const existing = await AsyncStorage.getItem(SESSION_KIND_KEY);
        sessionKind = String(existing || '').trim();
    }

    await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [ROLE_KEY, role],
        [USER_KEY, JSON.stringify(user)],
        [SESSION_KIND_KEY, sessionKind],
    ]);
};

export const saveTokens = async ({accessToken, refreshToken, user, role} = {}) => {
    const pairs = [];
    if (accessToken) pairs.push([TOKEN_KEY, accessToken]);
    if (refreshToken) pairs.push([REFRESH_TOKEN_KEY, refreshToken]);

    const resolvedRole = normalizeRole(role || user?.role);
    if (resolvedRole) pairs.push([ROLE_KEY, resolvedRole]);
    if (user) pairs.push([USER_KEY, JSON.stringify(user)]);
    const sessionKind = resolveSessionKindFromRole(resolvedRole);
    if (sessionKind) pairs.push([SESSION_KIND_KEY, sessionKind]);

    if (pairs.length) {
        await AsyncStorage.multiSet(pairs);
    }
};

export const clearSession = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, ROLE_KEY, USER_KEY, LAST_LOGIN_IDENTIFIER_KEY, SESSION_KIND_KEY]);
};

export const saveLastLoginIdentifier = async (identifier) => {
    const normalized = String(identifier || '').trim().toLowerCase().replace(/\.@/g, '@');
    await AsyncStorage.setItem(LAST_LOGIN_IDENTIFIER_KEY, normalized);
};

export const getLastLoginIdentifier = async () => {
    const value = await AsyncStorage.getItem(LAST_LOGIN_IDENTIFIER_KEY);
    return String(value || '').trim().toLowerCase().replace(/\.@/g, '@');
};

export const getSession = async () => {
    const pairs = await AsyncStorage.multiGet([TOKEN_KEY, ROLE_KEY, USER_KEY, SESSION_KIND_KEY]);
    const token = pairs[0][1];
    const storedRole = normalizeRole(pairs[1][1]);
    let sessionKind = String(pairs[3][1] || '').trim();
    let user = null;
    if (pairs[2][1]) {
        try {
            user = JSON.parse(pairs[2][1]);
        } catch {
            user = null;
        }
    }

    const role = storedRole || normalizeRole(user?.role);

    if (!sessionKind) {
        sessionKind = resolveSessionKindFromRole(role);
    }

    return {token, role, user, sessionKind, isSuperAdmin: isSuperAdmin(role)};
};

export {TOKEN_KEY, REFRESH_TOKEN_KEY, ROLE_KEY, USER_KEY, LAST_LOGIN_IDENTIFIER_KEY, SESSION_KIND_KEY};
