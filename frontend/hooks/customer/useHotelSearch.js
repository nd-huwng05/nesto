import { useCallback, useState, useMemo } from 'react';
import { familyHotels, businessHotels } from '../../configuration/hotelsData';

export const useHotelSearch = () => {
    const [allHotels, setAllHotels] = useState([...familyHotels, ...businessHotels]);
    const [filteredHotels, setFilteredHotels] = useState(allHotels);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        minPrice: 0,
        maxPrice: 999999,
        minRating: 0,
        roomType: null,
        location: null,
    });

    const applyFilters = (hotels, filterObj) => {
        return hotels.filter((hotel) => {
            const price = parseFloat(hotel.price) || 0;
            const rating = parseFloat(hotel.rating) || 0;

            // Price filter
            if (price < filterObj.minPrice || price > filterObj.maxPrice) {
                return false;
            }

            // Rating filter
            if (rating < filterObj.minRating) {
                return false;
            }

            // Room type filter
            if (filterObj.roomType && hotel.roomType !== filterObj.roomType) {
                return false;
            }

            // Location filter
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

    /**
     * Search hotels by query string
     * @param {string} query - Search query
     */
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

    /**
     * Update filter criteria
     * @param {Object} newFilters - New filter values
     */
    const updateFilters = useCallback(
        (newFilters) => {
            const updatedFilters = { ...filters, ...newFilters };
            setFilters(updatedFilters);
            setFilteredHotels(applyFilters(allHotels, updatedFilters));
        },
        [allHotels, filters]
    );

    /**
     * Sort hotels by field
     * @param {string} field - Field to sort by (price, rating, name)
     * @param {string} order - 'asc' or 'desc'
     */
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

    /**
     * Reset all filters and search
     */
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

    /**
     * Get hotel by ID
     * @param {string} hotelId - Hotel ID
     * @returns {Object|null}
     */
    const getHotelById = useCallback(
        (hotelId) => {
            return allHotels.find((h) => h.id === hotelId) || null;
        },
        [allHotels]
    );

    /**
     * Get similar hotels based on reference hotel
     * @param {string} hotelId - Reference hotel ID
     * @param {number} limit - Number of results
     * @returns {Array}
     */
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

    /**
     * Get hotels in specific price range
     * @param {number} minPrice - Minimum price
     * @param {number} maxPrice - Maximum price
     * @returns {Array}
     */
    const getHotelsInPriceRange = useCallback(
        (minPrice, maxPrice) => {
            return allHotels.filter((hotel) => {
                const price = parseFloat(hotel.price) || 0;
                return price >= minPrice && price <= maxPrice;
            });
        },
        [allHotels]
    );

    /**
     * Get featured/popular hotels
     * @param {number} limit - Number of hotels to return
     * @returns {Array}
     */
    const getFeaturedHotels = useCallback((limit = 5) => {
        return [...allHotels]
            .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
            .slice(0, limit);
    }, [allHotels]);

    /**
     * Get search statistics
     * @returns {Object}
     */
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
