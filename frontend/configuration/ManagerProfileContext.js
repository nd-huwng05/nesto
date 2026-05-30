import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import api, {endpoints} from './Apis';
import { resolveMediaUrl } from '../utils/mediaUrl';
import {getSession} from '../utils/authStorage';

export const ManagerProfileContext = createContext(null);

export function ManagerProfileProvider({children}) {
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        role: '',
        rawRole: '',
        groups: [],
        avatar: '',
    });
    const [isLoading, setIsLoading] = useState(true);

    const normalizeAvatarUri = useCallback((value) => resolveMediaUrl(value), []);

    const mapUserToProfile = useCallback((user) => {
        const roleValue = user?.role_display || user?.role || '';
        return {
            name: String(user?.name || '').trim(),
            email: String(user?.email || '').trim(),
            phone: String(user?.phone || '').trim(),
            role: String(roleValue).trim(),
            rawRole: String(user?.role || '').trim().toUpperCase(),
            groups: Array.isArray(user?.groups) ? user.groups : [],
            avatar: normalizeAvatarUri(user?.avatar),
        };
    }, [normalizeAvatarUri]);

    const reloadProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.get(endpoints['current-user']);
            setProfile(mapUserToProfile(response.data || {}));
        } catch (error) {
            console.error('API Error: ', error.response?.data || error.message);
        } finally {
            setIsLoading(false);
        }
    }, [mapUserToProfile]);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const session = await getSession();
                if (mounted && session?.user) {
                    setProfile(mapUserToProfile(session.user));
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
