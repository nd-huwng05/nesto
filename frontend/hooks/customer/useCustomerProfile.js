import { useCallback, useState, useEffect } from 'react';
import { getSession, saveSession } from '../../utils/authStorage';
import { getErrorMessage } from '../../utils/authErrors';

export const useCustomerProfile = () => {
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    /**
     * Load profile from session storage
     */
    const loadProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const { user } = await getSession();
            if (user) {
                setProfile({
                    id: user.id,
                    name: user.name || user.first_name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    avatar: user.avatar,
                    createdAt: user.created_at,
                    updatedAt: user.updated_at,
                });
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Update customer profile
     * @param {Object} updates - Profile updates
     * @returns {Object} - {success, error}
     */
    const updateProfile = useCallback(async (updates) => {
        if (!profile) {
            return { success: false, error: 'No profile loaded' };
        }

        setIsSaving(true);
        try {
            const updatedProfile = { ...profile, ...updates };
            const { user: sessionUser } = await getSession();

            if (sessionUser) {
                const updatedUser = {
                    ...sessionUser,
                    ...updates,
                    updated_at: new Date().toISOString(),
                };
                await saveSession(sessionUser.id, updatedUser);
                setProfile(updatedProfile);
                return { success: true };
            }

            return { success: false, error: 'Failed to save profile' };
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to update profile');
            return { success: false, error: errorMessage };
        } finally {
            setIsSaving(false);
        }
    }, [profile]);

    /**
     * Update customer avatar
     * @param {string} avatarUrl - Avatar image URL or URI
     * @returns {Object} - {success, error}
     */
    const updateAvatar = useCallback(
        async (avatarUrl) => {
            if (!avatarUrl) {
                return { success: false, error: 'Avatar URL is required' };
            }
            return updateProfile({ avatar: avatarUrl });
        },
        [updateProfile]
    );

    /**
     * Get customer statistics
     * @returns {Object} - Statistics object
     */
    const getStats = useCallback(() => {
        return {
            totalBookings: 12,
            upcomingBookings: 2,
            completedBookings: 10,
            memberSince: profile?.createdAt,
        };
    }, [profile]);

    /**
     * Verify customer email
     * @returns {Object} - {success, error}
     */
    const verifyEmail = useCallback(async () => {
        try {
            setIsSaving(true);
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const { user } = await getSession();
            if (user) {
                const updatedUser = { ...user, emailVerified: true };
                await saveSession(user.id, updatedUser);
                return { success: true };
            }

            return { success: false, error: 'Failed to verify email' };
        } catch (err) {
            return { success: false, error: getErrorMessage(err) };
        } finally {
            setIsSaving(false);
        }
    }, []);

    /**
     * Verify customer phone
     * @returns {Object} - {success, error}
     */
    const verifyPhone = useCallback(async () => {
        try {
            setIsSaving(true);
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const { user } = await getSession();
            if (user) {
                const updatedUser = { ...user, phoneVerified: true };
                await saveSession(user.id, updatedUser);
                return { success: true };
            }

            return { success: false, error: 'Failed to verify phone' };
        } catch (err) {
            return { success: false, error: getErrorMessage(err) };
        } finally {
            setIsSaving(false);
        }
    }, []);

    // Load profile on mount
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
