import {useCallback, useEffect, useState} from 'react';
import {getSession} from '../../utils/authStorage';
import {AUTH_ROLES, isHousekeepingRole, isReceptionistRole, isServiceRole} from '../../constants/authRoles';
import api, {endpoints} from '../../configuration/Apis';

const DEFAULT_ROLE = AUTH_ROLES.RECEPTIONIST;

export function useStaffSession() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [groups, setGroups] = useState([]);
    const [sessionKind, setSessionKind] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const loadSession = useCallback(async () => {
        setIsLoading(true);
        try {
            const session = await getSession();
            let currentUser = session.user || null;
            try {
                const response = await api.get(endpoints['current-user']);
                currentUser = response.data || currentUser;
            } catch (error) {
                console.error('API Error: ', error.response?.data || error.message);
            }
            const resolvedSessionKind = String(session?.sessionKind || '').trim().toLowerCase();
            const resolvedRole = session?.role || currentUser?.role || DEFAULT_ROLE;

            setRole(resolvedRole);
            setSessionKind(resolvedSessionKind);
            setUser(currentUser || session.user || {role: resolvedRole});
            setGroups(Array.isArray((currentUser || session.user)?.groups) ? (currentUser || session.user).groups : []);
        } catch {
            setRole(DEFAULT_ROLE);
            setSessionKind('');
            setUser(null);
            setGroups([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSession();
    }, [loadSession]);

    return {
        user,
        groups,
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
