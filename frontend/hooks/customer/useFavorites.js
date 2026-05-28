import {useCallback, useEffect, useMemo, useState} from 'react';
import api, {endpoints} from '../../configuration/Apis';

const pickList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export const useFavorites = () => {
    const [favorites, setFavorites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadFavorites = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get(endpoints['favorites']);
            const rows = pickList(res?.data);
            setFavorites(rows);
            return {success: true, data: rows};
        } catch (err) {
            setFavorites([]);
            return {success: false, error: String(err?.response?.data?.detail || err?.message || 'Unable to load favorites')};
        } finally {
            setIsLoading(false);
        }
    }, []);

    const toggleFavorite = useCallback(async ({branchId} = {}) => {
        const id = String(branchId || '').trim();
        if (!id) return {success: false, error: 'branchId is required'};
        try {
            const res = await api.post(`${endpoints['favorites']}toggle/`, {branchId: id});
            const favorited = !!res?.data?.favorited;
            await loadFavorites();
            return {success: true, data: {branchId: id, favorited}};
        } catch (err) {
            return {success: false, error: String(err?.response?.data?.detail || err?.message || 'Unable to update favorites')};
        }
    }, [loadFavorites]);

    const favoriteBranchIds = useMemo(() => new Set((favorites || []).map((f) => String(f?.branchId || ''))), [favorites]);
    const isFavorite = useCallback((branchId) => favoriteBranchIds.has(String(branchId || '').trim()), [favoriteBranchIds]);

    useEffect(() => {
        loadFavorites();
    }, [loadFavorites]);

    return {
        favorites,
        isLoading,
        loadFavorites,
        toggleFavorite,
        isFavorite,
    };
};

