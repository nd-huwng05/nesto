import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import api, {endpoints} from './Apis';
import { resolveMediaUrl } from '../utils/mediaUrl';
import {getSession} from '../utils/authStorage';
import {normalizeUser} from '../utils/apiShape';
import {resolveStaffUiFlow} from '../constants/authRoles';
import {normalizeAuthRole} from '../utils/roleNormalize';

export const ManagerProfileContext = createContext(null);

export function ManagerProfileProvider({children}) {
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        role: '',
        rawRole: '',
        roleDisplay: '',
        uiFlow: '',
        groups: [],
        avatar: '',
    });
    const [isLoading, setIsLoading] = useState(true);

    const normalizeAvatarUri = useCallback((value) => resolveMediaUrl(value), []);

    const mapUserToProfile = useCallback((user) => {
        const normalized = normalizeUser(user) || {};
        const roleCode = normalizeAuthRole(normalized.role || user?.rawRole);
        const roleDisplay = String(
            normalized.role_display || user?.roleDisplay || normalized.role || ''
        ).trim();
        const rawRole = roleCode || normalizeAuthRole(roleDisplay);
        let uiFlow = String(normalized.ui_flow || user?.uiFlow || '').trim().toLowerCase();
        if (!uiFlow) {
            uiFlow = resolveStaffUiFlow(normalized, rawRole);
        }
        const sessionKind = String(user?.sessionKind || user?.session_kind || '').trim().toLowerCase();
        return {
            name: String(normalized.name || '').trim(),
            email: String(normalized.email || '').trim(),
            phone: String(normalized.phone || '').trim(),
            role: roleDisplay || rawRole,
            rawRole,
            roleDisplay: roleDisplay || rawRole,
            uiFlow,
            sessionKind,
            groups: Array.isArray(normalized.groups) ? normalized.groups : [],
            avatar: normalizeAvatarUri(normalized.avatar),
        };
    }, [normalizeAvatarUri]);

    const profileHasAccessData = useCallback((nextProfile) => {
        return Boolean(
            nextProfile?.rawRole ||
                nextProfile?.uiFlow === 'business' ||
                nextProfile?.sessionKind === 'business' ||
                (Array.isArray(nextProfile?.groups) && nextProfile.groups.length > 0)
        );
    }, []);

    const reloadProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const session = await getSession();
            const sessionProfile = session?.user
                ? mapUserToProfile({
                      ...session.user,
                      sessionKind: session.sessionKind,
                  })
                : session?.role
                  ? mapUserToProfile({
                        role: session.role,
                        ui_flow: session.uiFlow,
                        sessionKind: session.sessionKind,
                    })
                  : null;
            if (sessionProfile && profileHasAccessData(sessionProfile)) {
                setProfile(sessionProfile);
            }

            const response = await api.get(endpoints['current-user']);
            const nextProfile = mapUserToProfile(response.data || {});
            setProfile((prev) => {
                if (profileHasAccessData(nextProfile)) return nextProfile;
                if (profileHasAccessData(prev)) return prev;
                if (sessionProfile && profileHasAccessData(sessionProfile)) return sessionProfile;
                return nextProfile.rawRole || nextProfile.uiFlow ? nextProfile : prev;
            });
        } catch (error) {
            console.error('API Error: ', error.response?.data || error.message);
            try {
                const session = await getSession();
                if (session?.user) {
                    setProfile(
                        mapUserToProfile({
                            ...session.user,
                            sessionKind: session.sessionKind,
                        })
                    );
                } else if (session?.role) {
                    setProfile(
                        mapUserToProfile({
                            role: session.role,
                            ui_flow: session.uiFlow,
                            sessionKind: session.sessionKind,
                        })
                    );
                }
            } catch {
                // keep previously loaded profile
            }
        } finally {
            setIsLoading(false);
        }
    }, [mapUserToProfile, profileHasAccessData]);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const session = await getSession();
                if (!mounted) return;
                if (session?.user) {
                    setProfile(
                        mapUserToProfile({
                            ...session.user,
                            sessionKind: session.sessionKind,
                        })
                    );
                } else if (session?.role) {
                    setProfile(
                        mapUserToProfile({
                            role: session.role,
                            ui_flow: session.uiFlow,
                            sessionKind: session.sessionKind,
                        })
                    );
                }
            } catch {
            }
            if (mounted) {
                await reloadProfile();
            }
        })();

        return () => {
            mounted = false;
        };
    }, [mapUserToProfile, reloadProfile]);

    const updateProfile = (updates) => {
        setProfile((prev) => ({...prev, ...updates}));
    };

    const value = useMemo(
        () => ({profile, updateProfile, reloadProfile, isLoading}),
        [profile, reloadProfile, isLoading]
    );

    return <ManagerProfileContext.Provider value={value}>{children}</ManagerProfileContext.Provider>;
}

export function useManagerProfile() {
    const ctx = useContext(ManagerProfileContext);
    if (!ctx) {
        throw new Error('useManagerProfile must be used within ManagerProfileProvider');
    }
    return ctx;
}
