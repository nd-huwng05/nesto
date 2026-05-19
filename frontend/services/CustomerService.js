import Apis from '../configuration/Apis';
import { getSession, saveSession } from '../utils/authStorage';
import { getErrorMessage } from '../utils/authErrors';

export const CustomerService = {
    async loadProfile() {
        try {
            const { user } = await getSession();
            if (user) {
                return {
                    success: true,
                    data: {
                        id: user.id,
                        name: user.name || user.first_name,
                        email: user.email,
                        phone: user.phone,
                        role: user.role,
                        avatar: user.avatar,
                        createdAt: user.created_at,
                        updatedAt: user.updated_at,
                    },
                };
            }
            return { success: false, error: 'User not found' };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to load profile') };
        }
    },

    async updateProfile(userId, updates) {
        try {
            const { user: sessionUser } = await getSession();
            if (!sessionUser) {
                return { success: false, error: 'User not authenticated' };
            }

            const updatedUser = {
                ...sessionUser,
                ...updates,
                updated_at: new Date().toISOString(),
            };

            await saveSession(userId, updatedUser);
            return { success: true, data: updatedUser };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to update profile') };
        }
    },

    async updateAvatar(userId, avatarUrl) {
        return this.updateProfile(userId, { avatar: avatarUrl });
    },

    async verifyEmail(userId) {
        try {
            const { user } = await getSession();
            if (!user) {
                return { success: false, error: 'User not authenticated' };
            }

            const updatedUser = { ...user, emailVerified: true };
            await saveSession(userId, updatedUser);
            return { success: true };
        } catch (err) {
            return { success: false, error: getErrorMessage(err) };
        }
    },

    async verifyPhone(userId) {
        try {
            const { user } = await getSession();
            if (!user) {
                return { success: false, error: 'User not authenticated' };
            }

            const updatedUser = { ...user, phoneVerified: true };
            await saveSession(userId, updatedUser);
            return { success: true };
        } catch (err) {
            return { success: false, error: getErrorMessage(err) };
        }
    },
};
