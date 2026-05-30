import AsyncStorage from '@react-native-async-storage/async-storage';
import {AUTH_ROLES, isSuperAdmin} from '../constants/authRoles';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ROLE_KEY = 'role';
const UI_FLOW_KEY = 'ui_flow';
const USER_KEY = 'user';
const LAST_LOGIN_IDENTIFIER_KEY = 'lastLoginIdentifier';
const SESSION_KIND_KEY = 'sessionKind';

const STAFF_ROLES = new Set([
    AUTH_ROLES.RECEPTIONIST,
    AUTH_ROLES.HOUSEKEEPING,
    AUTH_ROLES.SERVICE,
    AUTH_ROLES.STAFF,
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
    if (upper === 'BUSINESS' || upper === 'BUSSINESS') return AUTH_ROLES.BUSINESS_OWNER;
    if (upper === 'SUPERADMIN' || upper === 'SUPER-ADMIN') return AUTH_ROLES.SUPER_ADMIN;
    if (upper === 'MANAGER' || upper === 'BRANCH MANAGER') return AUTH_ROLES.BUSINESS_OWNER;
    if (upper === 'RECEPTIONIST') return AUTH_ROLES.RECEPTIONIST;
    if (upper === 'HOUSEKEEPING') return AUTH_ROLES.HOUSEKEEPING;
    if (upper === 'SERVICE') return AUTH_ROLES.SERVICE;
    if (upper === 'STAFF') return AUTH_ROLES.STAFF;
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

    const pairs = [
        [TOKEN_KEY, token],
        [ROLE_KEY, role],
        [USER_KEY, JSON.stringify(user)],
        [SESSION_KIND_KEY, sessionKind],
    ];
    const uiFlow = String(user?.uiFlow || user?.ui_flow || '').trim();
    if (uiFlow) pairs.push([UI_FLOW_KEY, uiFlow]);
    await AsyncStorage.multiSet(pairs);
};

export const saveTokens = async ({accessToken, refreshToken, user, role, uiFlow} = {}) => {
    const pairs = [];
    if (accessToken) pairs.push([TOKEN_KEY, accessToken]);
    if (refreshToken) pairs.push([REFRESH_TOKEN_KEY, refreshToken]);

    const resolvedRole = normalizeRole(role || user?.role);
    if (resolvedRole) pairs.push([ROLE_KEY, resolvedRole]);

    const resolvedUiFlow = String(uiFlow || user?.uiFlow || user?.ui_flow || '').trim();
    if (resolvedUiFlow) pairs.push([UI_FLOW_KEY, resolvedUiFlow]);

    if (user) pairs.push([USER_KEY, JSON.stringify(user)]);

    const sessionKind = resolveSessionKindFromRole(resolvedRole);
    if (sessionKind) pairs.push([SESSION_KIND_KEY, sessionKind]);

    if (pairs.length) {
        await AsyncStorage.multiSet(pairs);
    }
};

export const clearSession = async () => {
    await AsyncStorage.multiRemove([
        TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        ROLE_KEY,
        UI_FLOW_KEY,
        USER_KEY,
        LAST_LOGIN_IDENTIFIER_KEY,
        SESSION_KIND_KEY,
    ]);
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
    const pairs = await AsyncStorage.multiGet([
        TOKEN_KEY,
        ROLE_KEY,
        UI_FLOW_KEY,
        USER_KEY,
        SESSION_KIND_KEY,
    ]);
    const token = pairs[0][1];
    const storedRole = normalizeRole(pairs[1][1]);
    const uiFlow = String(pairs[2][1] || '').trim();
    let sessionKind = String(pairs[4][1] || '').trim();
    let user = null;
    if (pairs[3][1]) {
        try {
            user = JSON.parse(pairs[3][1]);
        } catch {
            user = null;
        }
    }

    const role = storedRole || normalizeRole(user?.role);

    if (!sessionKind) {
        sessionKind = resolveSessionKindFromRole(role);
    }

    return {token, role, uiFlow, user, sessionKind, isSuperAdmin: isSuperAdmin(role)};
};

export {TOKEN_KEY, REFRESH_TOKEN_KEY, ROLE_KEY, UI_FLOW_KEY, USER_KEY, LAST_LOGIN_IDENTIFIER_KEY, SESSION_KIND_KEY};
