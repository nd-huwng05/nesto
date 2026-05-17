import {MANAGER_ID} from './branchMockStore';
import {AUTH_ROLES} from '../constants/authRoles';

const normalizeIdentifier = (value) => String(value || '').trim().toLowerCase();

/** Platform super-admin / business owner accounts */
const adminAccounts = [
    {
        id: MANAGER_ID,
        email: 'test@gmail.com',
        phone: '0899718965',
        password: 'Abc12345@',
        role: AUTH_ROLES.SUPER_ADMIN,
        name: 'Trọng Bảo An',
    },
    {
        id: MANAGER_ID,
        email: 'business@nesto.vn',
        phone: '',
        password: 'Abc12345@',
        role: AUTH_ROLES.SUPER_ADMIN,
        name: 'Nesto Manager',
    },
];

export const authenticateAdmin = (identifier, password) => {
    const key = normalizeIdentifier(identifier);
    const match = adminAccounts.find(
        (a) => normalizeIdentifier(a.email) === key || (a.phone && a.phone === identifier.trim())
    );
    if (!match || match.password !== password) return null;

    return {
        id: match.id,
        email: match.email,
        phone: match.phone || '',
        name: match.name,
        role: match.role,
        branchId: null,
        businessId: null,
    };
};
