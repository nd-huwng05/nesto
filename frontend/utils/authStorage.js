import AsyncStorage from '@react-native-async-storage/async-storage';
import {AUTH_ROLES, isSuperAdmin} from '../constants/authRoles';

const TOKEN_KEY = 'userToken';
const ROLE_KEY = 'role';
const USER_KEY = 'user';

const legacyRoleToAuth = (role) => {
    if (!role || role === 'business' || role === 'bussiness') return AUTH_ROLES.SUPER_ADMIN;
    return role;
};

export const saveSession = async (token, userOrLegacyRole) => {
    if (typeof userOrLegacyRole === 'string') {
        const role = legacyRoleToAuth(userOrLegacyRole);
        await AsyncStorage.multiSet([
            [TOKEN_KEY, token],
            [ROLE_KEY, role],
        ]);
        return;
    }

    const user = userOrLegacyRole;
    await AsyncStorage.multiSet([
        [TOKEN_KEY, token],
        [ROLE_KEY, user.role],
        [USER_KEY, JSON.stringify(user)],
    ]);
};

export const clearSession = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY, USER_KEY]);
};

export const getSession = async () => {
    const pairs = await AsyncStorage.multiGet([TOKEN_KEY, ROLE_KEY, USER_KEY]);
    const token = pairs[0][1];
    const role = legacyRoleToAuth(pairs[1][1]);
    let user = null;
    if (pairs[2][1]) {
        try {
            user = JSON.parse(pairs[2][1]);
        } catch {
            user = null;
        }
    }
    return {token, role, user, isSuperAdmin: isSuperAdmin(role)};
};

export {TOKEN_KEY, ROLE_KEY, USER_KEY};
