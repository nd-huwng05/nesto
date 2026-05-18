import { useCallback, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_STORAGE_KEY = 'customer_favorites';

export const useFavorites = () => {
    const [favorites, setFavorites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Load favorites from AsyncStorage
     */
    const loadFavorites = useCallback(async () => {
        setIsLoading(true);
        try {
            const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                setFavorites(Array.isArray(parsed) ? parsed : []);
            } else {
                setFavorites([]);
            }
        } catch (error) {
            console.error('Failed to load favorites:', error);
            setFavorites([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Add item to favorites
     * @param {Object} item - Item to add
     * @returns {boolean}
     */
    const addFavorite = useCallback(
        async (item) => {
            if (!item || !item.id) return false;

            const exists = favorites.some((fav) => fav.id === item.id);
            if (exists) return false;

            const newFavorite = {
                ...item,
                addedAt: new Date().toISOString(),
            };

            const updated = [...favorites, newFavorite];
            setFavorites(updated);

            try {
                await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
                return true;
            } catch (error) {
                console.error('Failed to save favorite:', error);
                setFavorites(favorites); // Rollback
                return false;
            }
        },
        [favorites]
    );

    /**
     * Remove item from favorites
     * @param {string} itemId - Item ID to remove
     * @returns {boolean}
     */
    const removeFavorite = useCallback(
        async (itemId) => {
            if (!itemId) return false;

            const updated = favorites.filter((fav) => fav.id !== itemId);
            setFavorites(updated);

            try {
                await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
                return true;
            } catch (error) {
                console.error('Failed to remove favorite:', error);
                setFavorites(favorites); // Rollback
                return false;
            }
        },
        [favorites]
    );

    /**
     * Toggle item favorite status
     * @param {Object} item - Item to toggle
     * @returns {boolean|null}
     */
    const toggleFavorite = useCallback(
        async (item) => {
            if (!item || !item.id) return null;

            const isFav = favorites.some((fav) => fav.id === item.id);

            if (isFav) {
                await removeFavorite(item.id);
                return false;
            } else {
                const success = await addFavorite(item);
                return success ? true : null;
            }
        },
        [favorites, addFavorite, removeFavorite]
    );

    /**
     * Check if item is favorited
     * @param {string} itemId - Item ID to check
     * @returns {boolean}
     */
    const isFavorite = useCallback(
        (itemId) => {
            return favorites.some((fav) => fav.id === itemId);
        },
        [favorites]
    );

    /**
     * Get all favorites
     * @returns {Array}
     */
    const getFavorites = useCallback(() => {
        return [...favorites];
    }, [favorites]);

    /**
     * Get favorites by type
     * @param {string} type - Filter type
     * @returns {Array}
     */
    const getFavoritesByType = useCallback(
        (type) => {
            if (!type) return favorites;
            return favorites.filter((fav) => fav.type === type);
        },
        [favorites]
    );

    /**
     * Clear all favorites
     * @returns {boolean}
     */
    const clearAllFavorites = useCallback(async () => {
        setFavorites([]);
        try {
            await AsyncStorage.removeItem(FAVORITES_STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Failed to clear favorites:', error);
            return false;
        }
    }, []);

    /**
     * Get favorite count
     * @returns {number}
     */
    const getFavoriteCount = useCallback(() => {
        return favorites.length;
    }, [favorites]);

    // Load favorites on mount
    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    return {
        favorites,
        isLoading,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        isFavorite,
        getFavorites,
        getFavoritesByType,
        clearAllFavorites,
        getFavoriteCount,
        loadFavorites,
    };
};
