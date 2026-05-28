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
    if (normalized === AUTH_ROLES.CUSTOMER) return 'customer';
    if (STAFF_ROLES.has(normalized)) return 'staff';
    return '';
};

const inferCustomerFromSession = ({token, role, user}) => {
    const normalizedRole = String(role || user?.role || '').trim().toUpperCase();
    const normalizedEmail = String(user?.email || '').trim().toLowerCase().replace(/\.@/g, '@');
    const normalizedToken = String(token || '');

    return normalizedRole === AUTH_ROLES.CUSTOMER
        || normalizedEmail === 'customer@nesto.vn'
        || normalizedEmail === 'custumer@nesto.vn'
        || normalizedToken.startsWith('mock_customer_');
};

const legacyRoleToAuth = (role) => {
    if (!role || role === 'business' || role === 'bussiness') return AUTH_ROLES.SUPER_ADMIN;
    return role;
};

export const saveSession = async (token, userOrLegacyRole) => {
    if (typeof userOrLegacyRole === 'string') {
        const role = legacyRoleToAuth(userOrLegacyRole);
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
    const role = String(user?.role || '').trim();
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
    const storedRole = legacyRoleToAuth(pairs[1][1]);
    let sessionKind = String(pairs[3][1] || '').trim();

    let user = null;
    if (pairs[2][1]) {
        try {
            user = JSON.parse(pairs[2][1]);
        } catch {
            user = null;
        }
    }

    const role = inferCustomerFromSession({token, role: storedRole, user})
        ? AUTH_ROLES.CUSTOMER
        : storedRole;

    if (!sessionKind) {
        sessionKind = resolveSessionKindFromRole(role);
    }

    if (inferCustomerFromSession({token, role, user})) {
        sessionKind = 'customer';
    }

    return {token, role, user, sessionKind, isSuperAdmin: isSuperAdmin(role)};
};

export {TOKEN_KEY, REFRESH_TOKEN_KEY, ROLE_KEY, USER_KEY, LAST_LOGIN_IDENTIFIER_KEY, SESSION_KIND_KEY};
