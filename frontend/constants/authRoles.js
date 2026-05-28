/** App-level roles used for navigation and RBAC */
export const AUTH_ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    BUSINESS_OWNER: 'BUSINESS_OWNER',
    CUSTOMER: 'CUSTOMER',
    MANAGER: 'MANAGER',
    RECEPTIONIST: 'RECEPTIONIST',
    HOUSEKEEPING: 'HOUSEKEEPING',
    SERVICE: 'SERVICE',
    CUSTOMER: 'CUSTOMER',
};

export const isSuperAdmin = (role) => role === AUTH_ROLES.SUPER_ADMIN;

export const isBusinessOwner = (role) => role === AUTH_ROLES.BUSINESS_OWNER;

export const isCustomer = (role) => role === AUTH_ROLES.CUSTOMER;

/** Map hotel staff job title → auth role */
export const staffJobToAuthRole = (jobRole) => {
    switch (jobRole) {
        case 'Manager':
            return AUTH_ROLES.MANAGER;
        case 'Receptionist':
            return AUTH_ROLES.RECEPTIONIST;
        case 'Housekeeping':
            return AUTH_ROLES.HOUSEKEEPING;
        case 'Service':
            return AUTH_ROLES.SERVICE;
        default:
            return AUTH_ROLES.RECEPTIONIST;
    }
};

export const isReceptionistRole = (role) =>
    role === AUTH_ROLES.RECEPTIONIST || role === AUTH_ROLES.MANAGER;

export const isHousekeepingRole = (role) => role === AUTH_ROLES.HOUSEKEEPING;

export const isServiceRole = (role) => role === AUTH_ROLES.SERVICE;

export const resolveHomeFlowName = (role) => {
    if (role === AUTH_ROLES.SUPER_ADMIN) return 'BusinessFlow';
    if (role === AUTH_ROLES.CUSTOMER) return 'CustomerFlow';
    return 'StaffFlow';
};
