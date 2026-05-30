import {useCallback, useEffect, useState} from 'react';
import {getSession} from '../../utils/authStorage';
import {
    AUTH_ROLES,
    STAFF_UI_FLOWS,
    isCustomer,
    isHousekeepingRole,
    isServiceRole,
    isReceptionistRole,
    resolveStaffUiFlow,
} from '../../constants/authRoles';
import {resolveServiceCategoryForUser} from '../../constants/staffRoleMapping';
import api, {endpoints} from '../../configuration/Apis';
import {normalizeUser} from '../../utils/apiShape';

export function useStaffSession() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [groups, setGroups] = useState([]);
    const [sessionKind, setSessionKind] = useState('');
    const [staffUiFlow, setStaffUiFlow] = useState('');
    const [serviceCategory, setServiceCategory] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const loadSession = useCallback(async () => {
        setIsLoading(true);
        try {
            const session = await getSession();
            let currentUser = session.user || null;
            try {
                const response = await api.get(endpoints['current-user']);
                currentUser = normalizeUser(response.data) || currentUser;
            } catch (error) {
                console.error('API Error: ', error.response?.data || error.message);
            }
            const resolvedSessionKind = String(session?.sessionKind || '').trim().toLowerCase();
            const resolvedRole = String(session?.role || currentUser?.role || '').trim().toUpperCase();
            const mergedUser = currentUser || session.user || {role: resolvedRole};
            const uiFlow = resolveStaffUiFlow(mergedUser, resolvedRole);
            const category = resolveServiceCategoryForUser(mergedUser);

            setRole(resolvedRole || null);
            setSessionKind(resolvedSessionKind);
            setUser({...mergedUser, service_category: category, ui_flow: uiFlow});
            setStaffUiFlow(uiFlow);
            setServiceCategory(category);
            setGroups(Array.isArray(mergedUser?.groups) ? mergedUser.groups : []);
        } catch {
            setRole(null);
            setSessionKind('');
            setUser(null);
            setStaffUiFlow('');
            setServiceCategory('');
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
        role: role || '',
        sessionKind,
        staffUiFlow,
        serviceCategory,
        branchId: user?.branch_id || '',
        isLoading,
        reload: loadSession,
        isCustomer: isCustomer(role) || sessionKind === 'customer' || staffUiFlow === STAFF_UI_FLOWS.CUSTOMER,
        isReceptionist:
            staffUiFlow === STAFF_UI_FLOWS.RECEPTION || isReceptionistRole(role),
        isHousekeeping:
            staffUiFlow === STAFF_UI_FLOWS.HOUSEKEEPING || isHousekeepingRole(role),
        isService: staffUiFlow === STAFF_UI_FLOWS.SERVICE || isServiceRole(role),
    };
}
