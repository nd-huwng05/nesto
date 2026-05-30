export const AUTH_ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    BUSINESS_OWNER: 'BUSINESS_OWNER',
    CUSTOMER: 'CUSTOMER',
    RECEPTIONIST: 'RECEPTIONIST',
    HOUSEKEEPING: 'HOUSEKEEPING',
    SERVICE: 'SERVICE',
    STAFF: 'STAFF',
};

export const STAFF_UI_FLOWS = {
    BUSINESS: 'business',
    CUSTOMER: 'customer',
    RECEPTION: 'reception',
    HOUSEKEEPING: 'housekeeping',
    SERVICE: 'service',
};

export const isSuperAdmin = (role) => role === AUTH_ROLES.SUPER_ADMIN;

export const isBusinessOwner = (role) => role === AUTH_ROLES.BUSINESS_OWNER;

export const isBusinessRole = (role) =>
    isSuperAdmin(role) || isBusinessOwner(role);

/** Business owner / admin portfolio screens (reports, staff roster). */
export const canManageBusinessPortfolio = (profile = {}) => {
    const normalizedRole = String(profile?.rawRole || profile?.role || '').trim().toUpperCase();
    const groups = Array.isArray(profile?.groups) ? profile.groups : [];
    return (
        isBusinessRole(normalizedRole) ||
        groups.some((g) => ['Admin_Group', 'Business_Group'].includes(g))
    );
};

export const isCustomer = (role) => role === AUTH_ROLES.CUSTOMER;

export const isHousekeepingRole = (role) => role === AUTH_ROLES.HOUSEKEEPING;

export const isServiceRole = (role) => role === AUTH_ROLES.SERVICE;

export const isReceptionistRole = (role) =>
    role === AUTH_ROLES.RECEPTIONIST || role === AUTH_ROLES.STAFF;

/** Operational staff only — excludes business owner accounts. */
export const isOperationalStaffRole = (role) =>
    isReceptionistRole(role) || isHousekeepingRole(role) || isServiceRole(role);

export const resolveStaffUiFlow = (user = {}, role = '') => {
    const explicit = String(user?.uiFlow || user?.ui_flow || '').trim().toLowerCase();
    if (explicit && Object.values(STAFF_UI_FLOWS).includes(explicit)) {
        return explicit;
    }

    const normalizedRole = String(role || user?.role || '').trim().toUpperCase();
    const department = String(user?.department || '').trim().toUpperCase();
    const serviceCategory = normalizeCategoryToken(user?.serviceCategory || user?.service_category);

    if (isBusinessRole(normalizedRole)) {
        return STAFF_UI_FLOWS.BUSINESS;
    }
    if (isCustomer(normalizedRole)) {
        return STAFF_UI_FLOWS.CUSTOMER;
    }
    if (department === AUTH_ROLES.HOUSEKEEPING || isHousekeepingRole(normalizedRole)) {
        return STAFF_UI_FLOWS.HOUSEKEEPING;
    }
    if (department === AUTH_ROLES.SERVICE || isServiceRole(normalizedRole) || serviceCategory) {
        return STAFF_UI_FLOWS.SERVICE;
    }
    if (department === AUTH_ROLES.RECEPTIONIST || isReceptionistRole(normalizedRole)) {
        return STAFF_UI_FLOWS.RECEPTION;
    }
    return '';
};

const normalizeCategoryToken = (value) => {
    const token = String(value || '').trim().toUpperCase();
    if (token === 'DRIVER') return 'TRANSPORT';
    return token;
};

export const resolveHomeFlowName = (role, user = null) => {
    const uiFlow = resolveStaffUiFlow(user || {}, role);
    if (uiFlow === STAFF_UI_FLOWS.BUSINESS) return 'BusinessFlow';
    if (uiFlow === STAFF_UI_FLOWS.CUSTOMER) return 'CustomerFlow';
    if (uiFlow === STAFF_UI_FLOWS.RECEPTION || uiFlow === STAFF_UI_FLOWS.HOUSEKEEPING || uiFlow === STAFF_UI_FLOWS.SERVICE) {
        return 'StaffFlow';
    }
    return '';
};

/** @deprecated use resolveStaffUiFlow */
export const staffJobToAuthRole = (jobRole) => {
    switch (jobRole) {
        case 'Receptionist':
            return AUTH_ROLES.RECEPTIONIST;
        case 'Housekeeping':
            return AUTH_ROLES.HOUSEKEEPING;
        case 'Service':
            return AUTH_ROLES.SERVICE;
        default:
            return '';
    }
};

/** @deprecated use isOperationalStaffRole */
export const isStaffRole = (role) => isOperationalStaffRole(role);
