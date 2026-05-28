import {useCallback, useEffect, useState} from 'react';
import api, {endpoints} from '../../configuration/Apis';
import {getSession, saveSession} from '../../utils/authStorage';
import {getErrorMessage} from '../../utils/authErrors';
import {fetchMyBookings} from '../../services/CustomerBookingService';

export const useCustomerProfile = () => {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [bookingStats, setBookingStats] = useState({totalBookings: 0, upcomingBookings: 0, completedBookings: 0});

    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const {token, user} = await getSession();
            let nextUser = user || null;
            try {
                const res = await api.get(endpoints['current-user']);
                if (res?.data) nextUser = res.data;
            } catch {
            }
            if (nextUser) {
                setProfile({
                    id: nextUser.id,
                    name: nextUser.name || nextUser.first_name || '',
                    email: nextUser.email || '',
                    phone: nextUser.phone || '',
                    role: nextUser.role,
                    avatar: nextUser.avatar || '',
                    preferredLocation: nextUser.preferredLocation || '',
                    preferredLatitude: nextUser.preferredLatitude ?? null,
                    preferredLongitude: nextUser.preferredLongitude ?? null,
                    createdAt: nextUser.created_at,
                    updatedAt: nextUser.updated_at,
                });
                if (token) await saveSession(token, nextUser);
            }
            const bookingsRes = await fetchMyBookings();
            const rows = bookingsRes.status === 'success' && Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
            const upcoming = rows.filter((b) => String(b?.status || '').toUpperCase() === 'PENDING').length;
            const checkedOut = rows.filter((b) => String(b?.status || '').toUpperCase() === 'CHECKED_OUT').length;
            setBookingStats({totalBookings: rows.length, upcomingBookings: upcoming, completedBookings: checkedOut});
        } catch (error) {
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateProfile = useCallback(async (updates) => {
        if (!profile) {
            return { success: false, error: 'No profile loaded' };
        }

        setIsSaving(true);
        try {
            const payload = {};
            if (updates?.name !== undefined) payload.name = String(updates.name || '').trim();
            if (updates?.phone !== undefined) payload.phone = String(updates.phone || '').trim();
            if (updates?.preferredLocation !== undefined) payload.preferredLocation = String(updates.preferredLocation || '').trim();
            if (updates?.preferredLatitude !== undefined) payload.preferredLatitude = updates.preferredLatitude;
            if (updates?.preferredLongitude !== undefined) payload.preferredLongitude = updates.preferredLongitude;
            const res = await api.patch(endpoints['current-user'], payload);
            const updatedUser = res?.data || null;
            if (!updatedUser) return {success: false, error: 'Failed to update profile'};
            const {token} = await getSession();
            if (token) await saveSession(token, updatedUser);
            setProfile((prev) => ({...(prev || {}), ...updatedUser}));
            return {success: true};
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to update profile');
            return { success: false, error: errorMessage };
        } finally {
            setIsSaving(false);
        }
    }, [profile]);

    const updateAvatar = useCallback(
        async (avatarUrl) => {
            if (!avatarUrl) {
                return { success: false, error: 'Avatar URL is required' };
            }
            return updateProfile({ avatar: avatarUrl });
        },
        [updateProfile]
    );

    const getStats = useCallback(() => {
        return {
            totalBookings: Number(bookingStats.totalBookings || 0),
            upcomingBookings: Number(bookingStats.upcomingBookings || 0),
            completedBookings: Number(bookingStats.completedBookings || 0),
            memberSince: profile?.createdAt || null,
        };
    }, [bookingStats.completedBookings, bookingStats.totalBookings, bookingStats.upcomingBookings, profile]);

    const verifyEmail = useCallback(async () => {
        try {
            setIsSaving(true);
            const res = await api.get(endpoints['current-user']);
            if (!res?.data) return {success: false, error: 'Failed to verify email'};
            const {token} = await getSession();
            if (token) await saveSession(token, res.data);
            setProfile((prev) => ({...(prev || {}), ...res.data}));
            return {success: true};
        } catch (err) {
            return { success: false, error: getErrorMessage(err) };
        } finally {
            setIsSaving(false);
        }
    }, []);

    const verifyPhone = useCallback(async () => {
        try {
            setIsSaving(true);
            const res = await api.get(endpoints['current-user']);
            if (!res?.data) return {success: false, error: 'Failed to verify phone'};
            const {token} = await getSession();
            if (token) await saveSession(token, res.data);
            setProfile((prev) => ({...(prev || {}), ...res.data}));
            return {success: true};
        } catch (err) {
            return { success: false, error: getErrorMessage(err) };
        } finally {
            setIsSaving(false);
        }
    }, []);
    
    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    return {
        profile,
        isLoading,
        isSaving,
        loadProfile,
        updateProfile,
        updateAvatar,
        getStats,
        verifyEmail,
        verifyPhone,
    };
};
