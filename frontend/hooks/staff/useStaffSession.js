import {useCallback, useEffect, useState} from 'react';
import {getSession} from '../../utils/authStorage';
import {AUTH_ROLES, isHousekeepingRole, isReceptionistRole, isServiceRole} from '../../constants/authRoles';

const DEFAULT_ROLE = AUTH_ROLES.RECEPTIONIST;

export function useStaffSession() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadSession = useCallback(async () => {
        setIsLoading(true);
        try {
            const session = await getSession();
            const resolvedRole = session.role || session.user?.role || DEFAULT_ROLE;
            setRole(resolvedRole);
            setUser(session.user || {role: resolvedRole});
        } catch {
            setRole(DEFAULT_ROLE);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSession();
    }, [loadSession]);

    return {
        user,
        role: role || DEFAULT_ROLE,
        branchId: user?.branchId || '',
        isLoading,
        reload: loadSession,
        isReceptionist: isReceptionistRole(role || DEFAULT_ROLE),
        isHousekeeping: isHousekeepingRole(role || DEFAULT_ROLE),
        isService: isServiceRole(role || DEFAULT_ROLE),
    };
}
