import AsyncStorage from '@react-native-async-storage/async-storage';
import { getErrorMessage } from '../utils/authErrors';

const FAVORITES_STORAGE_KEY = 'customer_favorites';

export const FavoritesService = {
    async loadFavorites() {
        try {
            const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return { success: true, data: Array.isArray(parsed) ? parsed : [] };
            }
            return { success: true, data: [] };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to load favorites') };
        }
    },

    async addFavorite(item) {
        try {
            if (!item || !item.id) {
                return { success: false, error: 'Invalid item' };
            }

            const { data: favorites } = await this.loadFavorites();

            const exists = favorites.some((fav) => fav.id === item.id);
            if (exists) {
                return { success: false, error: 'Already in favorites' };
            }

            const newFavorite = {
                ...item,
                addedAt: new Date().toISOString(),
            };

            const updated = [...favorites, newFavorite];
            await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));

            return { success: true, data: updated };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to add favorite') };
        }
    },

    async removeFavorite(itemId) {
        try {
            if (!itemId) {
                return { success: false, error: 'Invalid item ID' };
            }

            const { data: favorites } = await this.loadFavorites();
            const updated = favorites.filter((fav) => fav.id !== itemId);

            await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));

            return { success: true, data: updated };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to remove favorite') };
        }
    },

    async toggleFavorite(item) {
        try {
            if (!item || !item.id) {
                return { success: false, error: 'Invalid item' };
            }

            const { data: favorites } = await this.loadFavorites();
            const isFav = favorites.some((fav) => fav.id === item.id);

            if (isFav) {
                const updated = favorites.filter((fav) => fav.id !== item.id);
                await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
                return { success: true, data: updated, action: 'removed' };
            } else {
                const newFavorite = {
                    ...item,
                    addedAt: new Date().toISOString(),
                };
                const updated = [...favorites, newFavorite];
                await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
                return { success: true, data: updated, action: 'added' };
            }
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to toggle favorite') };
        }
    },

    async isFavorite(itemId) {
        try {
            const { data: favorites } = await this.loadFavorites();
            return favorites.some((fav) => fav.id === itemId);
        } catch (err) {
            return false;
        }
    },

    async getFavoritesByType(type) {
        try {
            const { data: favorites } = await this.loadFavorites();
            if (!type) return { success: true, data: favorites };

            const filtered = favorites.filter((fav) => fav.type === type);
            return { success: true, data: filtered };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to get favorites') };
        }
    },

    async getFavoriteCount() {
        try {
            const { data: favorites } = await this.loadFavorites();
            return { success: true, data: favorites.length };
        } catch (err) {
            return { success: false, error: 0 };
        }
    },

    async clearAllFavorites() {
        try {
            await AsyncStorage.removeItem(FAVORITES_STORAGE_KEY);
            return { success: true };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to clear favorites') };
        }
    },
};
