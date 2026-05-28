import {useCallback, useEffect, useState} from 'react';
import {getSession} from '../../utils/authStorage';
import {AUTH_ROLES, isHousekeepingRole, isReceptionistRole, isServiceRole} from '../../constants/authRoles';

const DEFAULT_ROLE = AUTH_ROLES.RECEPTIONIST;

export function useStaffSession() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [sessionKind, setSessionKind] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const loadSession = useCallback(async () => {
        setIsLoading(true);
        try {
            const session = await getSession();
            const resolvedSessionKind = String(session?.sessionKind || '').trim().toLowerCase();
            const rawRole = session?.role || session?.user?.role || null;
            const resolvedRole =
                resolvedSessionKind === 'customer'
                    ? AUTH_ROLES.CUSTOMER
                    : (rawRole || DEFAULT_ROLE);
            setRole(resolvedRole);
            setSessionKind(resolvedSessionKind);
            setUser(session.user || {role: resolvedRole});
        } catch {
            setRole(DEFAULT_ROLE);
            setSessionKind('');
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
        sessionKind,
        branchId: user?.branchId || '',
        isLoading,
        reload: loadSession,
        isCustomer: (role || DEFAULT_ROLE) === AUTH_ROLES.CUSTOMER || sessionKind === 'customer',
        isReceptionist: isReceptionistRole(role || DEFAULT_ROLE),
        isHousekeeping: isHousekeepingRole(role || DEFAULT_ROLE),
        isService: isServiceRole(role || DEFAULT_ROLE),
    };
}
