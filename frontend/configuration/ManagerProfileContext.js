import React, {createContext, useContext, useMemo, useState} from 'react';

const DEFAULT_PROFILE = {
    name: 'Trọng Bảo An',
    email: 'business@nesto.vn',
    phone: '0899718965',
    role: 'Super Admin',
    avatar: 'https://i.pravatar.cc/200?img=11',
};

export const ManagerProfileContext = createContext(null);

export function ManagerProfileProvider({children}) {
    const [profile, setProfile] = useState(DEFAULT_PROFILE);

    const updateProfile = (updates) => {
        setProfile((prev) => ({...prev, ...updates}));
    };

    const value = useMemo(() => ({profile, updateProfile}), [profile]);

    return <ManagerProfileContext.Provider value={value}>{children}</ManagerProfileContext.Provider>;
}

export function useManagerProfile() {
    const ctx = useContext(ManagerProfileContext);
    if (!ctx) {
        throw new Error('useManagerProfile must be used within ManagerProfileProvider');
    }
    return ctx;
}
