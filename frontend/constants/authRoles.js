/** App-level roles used for navigation and RBAC */
export const AUTH_ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    MANAGER: 'MANAGER',
    RECEPTIONIST: 'RECEPTIONIST',
    HOUSEKEEPING: 'HOUSEKEEPING',
    SERVICE: 'SERVICE',
};

export const isSuperAdmin = (role) => role === AUTH_ROLES.SUPER_ADMIN;

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
