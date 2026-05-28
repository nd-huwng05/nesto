import {useCallback, useMemo, useState} from 'react';
import api, {endpoints} from '../../configuration/Apis';

const pickList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export const useHotelSearch = () => {
    const [hotels, setHotels] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadCatalog = useCallback(async ({latitude, longitude} = {}) => {
        setIsLoading(true);
        try {
            const params = {};
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                params.latitude = String(latitude);
                params.longitude = String(longitude);
            }
            const res = await api.get(endpoints['customer-catalog'], {params});
            const rows = pickList(res?.data);
            setHotels(rows);
            return {success: true, data: rows};
        } catch (err) {
            setHotels([]);
            return {success: false, error: String(err?.response?.data?.detail || err?.message || 'Unable to load hotels')};
        } finally {
            setIsLoading(false);
        }
    }, []);

    const search = useCallback(async ({q, latitude, longitude} = {}) => {
        const next = String(q ?? '').trim();
        setSearchQuery(next);
        if (!next) return loadCatalog({latitude, longitude});
        setIsLoading(true);
        try {
            const params = {q: next};
            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                params.latitude = String(latitude);
                params.longitude = String(longitude);
            }
            const res = await api.get(endpoints['ai-search'], {params});
            const branches = res?.data?.results?.branches || [];
            const rows = Array.isArray(branches) ? branches : [];
            setHotels(rows);
            return {success: true, data: rows};
        } catch (err) {
            setHotels([]);
            return {success: false, error: String(err?.response?.data?.detail || err?.message || 'Unable to search')};
        } finally {
            setIsLoading(false);
        }
    }, [loadCatalog]);

    const stats = useMemo(() => ({totalHotels: hotels.length, searchQuery}), [hotels.length, searchQuery]);

    return {
        hotels,
        isLoading,
        searchQuery,
        loadCatalog,
        search,
        stats,
    };
};

