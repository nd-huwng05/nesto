import { useCallback, useEffect, useState, useMemo } from 'react';
import CustomerService from '../../services/CustomerService';

export const useHotelSearch = () => {
    const [allHotels, setAllHotels] = useState([]);
    const [filteredHotels, setFilteredHotels] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        minPrice: 0,
        maxPrice: 999999,
        minRating: 0,
        roomType: null,
        location: null,
    });

    useEffect(() => {
        let mounted = true;

        const loadHotels = async () => {
            setIsLoading(true);
            try {
                const response = await CustomerService.listHotels();
                const payload = response?.data;
                const hotels = Array.isArray(payload?.results)
                    ? payload.results
                    : Array.isArray(payload)
                        ? payload
                        : [];

                if (!mounted) return;
                setAllHotels(hotels);
                setFilteredHotels(applyFilters(hotels, filters));
            } catch {
                if (!mounted) return;
                setAllHotels([]);
                setFilteredHotels([]);
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        loadHotels();

        return () => {
            mounted = false;
        };
    }, []);

    const applyFilters = (hotels, filterObj) => {
        return hotels.filter((hotel) => {
            const price = parseFloat(hotel.price) || 0;
            const rating = parseFloat(hotel.rating) || 0;

            if (price < filterObj.minPrice || price > filterObj.maxPrice) {
                return false;
            }

            if (rating < filterObj.minRating) {
                return false;
            }

            if (filterObj.roomType && hotel.roomType !== filterObj.roomType) {
                return false;
            }

            if (filterObj.location) {
                const hotelLocation = (hotel.city || '').toLowerCase();
                const filterLocation = filterObj.location.toLowerCase();
                if (!hotelLocation.includes(filterLocation)) {
                    return false;
                }
            }

            return true;
        });
    };

    const search = useCallback(
        (query) => {
            setSearchQuery(query);
            const q = query.toLowerCase().trim();

            if (!q) {
                setFilteredHotels(applyFilters(allHotels, filters));
                return;
            }

            const results = allHotels.filter((hotel) => {
                const searchFields = [
                    hotel.title,
                    hotel.city,
                    hotel.address,
                    hotel.description,
                ].map((f) => (f || '').toLowerCase());

                return searchFields.some((field) => field.includes(q));
            });

            setFilteredHotels(applyFilters(results, filters));
        },
        [allHotels, filters]
    );

    const updateFilters = useCallback(
        (newFilters) => {
            const updatedFilters = { ...filters, ...newFilters };
            setFilters(updatedFilters);
            setFilteredHotels(applyFilters(allHotels, updatedFilters));
        },
        [allHotels, filters]
    );

    const sortHotels = useCallback((field, order = 'asc') => {
        const sortMap = {
            price: (a, b) => {
                const priceA = parseFloat(a.price) || 0;
                const priceB = parseFloat(b.price) || 0;
                return order === 'asc' ? priceA - priceB : priceB - priceA;
            },
            rating: (a, b) => {
                const ratingA = parseFloat(a.rating) || 0;
                const ratingB = parseFloat(b.rating) || 0;
                return order === 'asc' ? ratingA - ratingB : ratingB - ratingA;
            },
            name: (a, b) => {
                const nameA = (a.title || '').toLowerCase();
                const nameB = (b.title || '').toLowerCase();
                return order === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            },
        };

        if (sortMap[field]) {
            const sorted = [...filteredHotels].sort(sortMap[field]);
            setFilteredHotels(sorted);
        }
    }, [filteredHotels]);

    const resetSearch = useCallback(() => {
        setSearchQuery('');
        setFilters({
            minPrice: 0,
            maxPrice: 999999,
            minRating: 0,
            roomType: null,
            location: null,
        });
        setFilteredHotels(allHotels);
    }, [allHotels]);

    const getHotelById = useCallback(
        (hotelId) => {
            return allHotels.find((h) => h.id === hotelId) || null;
        },
        [allHotels]
    );

    const getSimilarHotels = useCallback(
        (hotelId, limit = 3) => {
            const refHotel = getHotelById(hotelId);
            if (!refHotel) return [];

            return allHotels
                .filter((h) => h.id !== hotelId && h.type === refHotel.type)
                .slice(0, limit);
        },
        [allHotels, getHotelById]
    );

    const getHotelsInPriceRange = useCallback(
        (minPrice, maxPrice) => {
            return allHotels.filter((hotel) => {
                const price = parseFloat(hotel.price) || 0;
                return price >= minPrice && price <= maxPrice;
            });
        },
        [allHotels]
    );

    const getFeaturedHotels = useCallback((limit = 5) => {
        return [...allHotels]
            .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
            .slice(0, limit);
    }, [allHotels]);

    const getStats = useMemo(() => {
        const priceRange = allHotels.reduce(
            (acc, hotel) => {
                const price = parseFloat(hotel.price) || 0;
                return {
                    min: Math.min(acc.min, price),
                    max: Math.max(acc.max, price),
                };
            },
            { min: Infinity, max: -Infinity }
        );

        const avgRating =
            allHotels.reduce((sum, h) => sum + (parseFloat(h.rating) || 0), 0) /
            (allHotels.length || 1);

        return {
            totalHotels: allHotels.length,
            filteredCount: filteredHotels.length,
            priceRange: {
                min: priceRange.min === Infinity ? 0 : priceRange.min,
                max: priceRange.max === -Infinity ? 0 : priceRange.max,
            },
            averageRating: avgRating.toFixed(1),
        };
    }, [allHotels, filteredHotels]);

    return {
        allHotels,
        filteredHotels,
        isLoading,
        searchQuery,
        filters,
        search,
        updateFilters,
        sortHotels,
        resetSearch,
        getHotelById,
        getSimilarHotels,
        getHotelsInPriceRange,
        getFeaturedHotels,
        getStats,
    };
};
