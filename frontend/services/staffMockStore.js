import {MANAGER_ID, branchMockStore} from './branchMockStore';
import {staffJobToAuthRole} from '../constants/authRoles';

export const STAFF_ROLES = ['Manager', 'Receptionist', 'Housekeeping', 'Service'];
export const DEFAULT_STAFF_PASSWORD = 'Abc123@';

const normalizeIdentifier = (value) => String(value || '').trim().toLowerCase();

/** @type {Record<string, object>} */
let staffById = {
    st1: {
        id: 'st1',
        managerId: MANAGER_ID,
        businessId: 'b1',
        branchId: 'br1',
        name: 'Lan Nguyễn',
        email: 'lan.nguyen@swiss.vn',
        phone: '0901234567',
        role: 'Receptionist',
        password: DEFAULT_STAFF_PASSWORD,
    },
    st2: {
        id: 'st2',
        managerId: MANAGER_ID,
        businessId: 'b1',
        branchId: 'br1',
        name: 'Minh Trần',
        email: 'minh.tran@swiss.vn',
        phone: '0912345678',
        role: 'Housekeeping',
        password: DEFAULT_STAFF_PASSWORD,
    },
    st3: {
        id: 'st3',
        managerId: MANAGER_ID,
        businessId: 'b2',
        branchId: 'br2',
        name: 'Hoa Lê',
        email: 'hoa.le@nesto.vn',
        phone: '0923456789',
        role: 'Manager',
        password: DEFAULT_STAFF_PASSWORD,
    },
    st4: {
        id: 'st4',
        managerId: MANAGER_ID,
        businessId: 'b2',
        branchId: 'br2',
        name: 'Đức Phạm',
        email: 'duc.pham@nesto.vn',
        phone: '0934567890',
        role: 'Receptionist',
        password: DEFAULT_STAFF_PASSWORD,
    },
    st5: {
        id: 'st5',
        managerId: MANAGER_ID,
        businessId: 'b2',
        branchId: 'br3',
        name: 'An Vũ',
        email: 'an.vu@nesto.vn',
        phone: '0945678901',
        role: 'Housekeeping',
        password: DEFAULT_STAFF_PASSWORD,
    },
    st6: {
        id: 'st6',
        managerId: MANAGER_ID,
        businessId: 'b2',
        branchId: 'br2',
        name: 'Thảo Nguyễn',
        email: 'thao.nguyen@nesto.vn',
        phone: '0956789012',
        role: 'Service',
        password: DEFAULT_STAFF_PASSWORD,
    },
};

const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

const nextStaffId = () => `st_${Date.now()}`;

const toPublicStaff = (row) => {
    if (!row) return null;
    const {password, ...safe} = row;
    return safe;
};

const assertBranchOwned = async (branchId, managerId) => {
    const businesses = await branchMockStore.listBusinesses(managerId);
    const branch = businesses.flatMap((b) => b.branches || []).find((br) => br.id === branchId);
    if (!branch) throw new Error('Branch not found or not in your portfolio');
    const business = businesses.find((b) => (b.branches || []).some((br) => br.id === branchId));
    return {businessId: business?.id, branch};
};

export const staffMockStore = {
    STAFF_ROLES,
    DEFAULT_STAFF_PASSWORD,

    async authenticateByCredentials(identifier, password) {
        await delay(300);
        const key = normalizeIdentifier(identifier);
        const row = Object.values(staffById).find(
            (s) =>
                normalizeIdentifier(s.email) === key ||
                (s.phone && s.phone.replace(/\s/g, '') === String(identifier).replace(/\s/g, ''))
        );
        if (!row || row.password !== password) return null;

        return {
            id: row.id,
            email: row.email,
            phone: row.phone,
            name: row.name,
            role: staffJobToAuthRole(row.role),
            jobRole: row.role,
            branchId: row.branchId,
            businessId: row.businessId,
            managerId: row.managerId,
        };
    },

    async listStaff(managerId, filters = {}) {
        await delay(400);
        const {branchId, businessId} = filters;
        return Object.values(staffById)
            .filter((s) => s.managerId === managerId)
            .filter((s) => !businessId || businessId === 'all' || s.businessId === businessId)
            .filter((s) => !branchId || branchId === 'all' || s.branchId === branchId)
            .map(toPublicStaff)
            .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    },

    async getStaff(staffId, managerId) {
        await delay(300);
        const row = staffById[staffId];
        if (!row || row.managerId !== managerId) return null;
        return toPublicStaff(row);
    },

    async createStaff(managerId, payload) {
        await delay(500);
        const {branchId, name, email, phone, role, password} = payload;
        if (!name?.trim()) throw new Error('Name is required');
        if (!email?.trim()) throw new Error('Email is required');
        if (!STAFF_ROLES.includes(role)) throw new Error('Invalid role');
        const finalPassword = password?.trim() || DEFAULT_STAFF_PASSWORD;

        const emailKey = normalizeIdentifier(email);
        const duplicate = Object.values(staffById).find((s) => normalizeIdentifier(s.email) === emailKey);
        if (duplicate) throw new Error('A staff member with this email already exists');

        const {businessId} = await assertBranchOwned(branchId, managerId);
        const id = nextStaffId();
        const row = {
            id,
            managerId,
            businessId,
            branchId,
            name: name.trim(),
            email: email.trim(),
            phone: (phone || '').trim(),
            role,
            password: finalPassword,
        };
        staffById[id] = row;
        return toPublicStaff(row);
    },

    async updateStaff(staffId, managerId, payload) {
        await delay(500);
        const existing = staffById[staffId];
        if (!existing || existing.managerId !== managerId) throw new Error('Staff member not found');

        const branchId = payload.branchId ?? existing.branchId;
        const {businessId} = await assertBranchOwned(branchId, managerId);

        if (payload.email) {
            const emailKey = normalizeIdentifier(payload.email);
            const duplicate = Object.values(staffById).find(
                (s) => s.id !== staffId && normalizeIdentifier(s.email) === emailKey
            );
            if (duplicate) throw new Error('A staff member with this email already exists');
        }

        staffById[staffId] = {
            ...existing,
            businessId,
            branchId,
            name: (payload.name ?? existing.name).trim(),
            email: (payload.email ?? existing.email).trim(),
            phone: (payload.phone ?? existing.phone).trim(),
            role: payload.role ?? existing.role,
            password: payload.password?.trim() ? payload.password.trim() : existing.password,
        };
        return toPublicStaff(staffById[staffId]);
    },

    async deleteStaff(staffId, managerId) {
        await delay(400);
        const existing = staffById[staffId];
        if (!existing || existing.managerId !== managerId) throw new Error('Staff member not found');
        delete staffById[staffId];
        return {id: staffId};
    },

    async listBranchOptions(managerId) {
        const businesses = await branchMockStore.listBusinesses(managerId);
        return businesses.flatMap((b) =>
            (b.branches || []).map((br) => ({
                id: br.id,
                name: br.name,
                businessId: b.id,
                businessName: b.name,
            }))
        );
    },
};
