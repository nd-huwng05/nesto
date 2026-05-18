import { familyHotels, businessHotels } from '../configuration/hotelsData';
import { getErrorMessage } from '../utils/authErrors';

export const HotelService = {
    getAllHotels() {
        return [...familyHotels, ...businessHotels];
    },

    searchHotels(query) {
        try {
            const allHotels = this.getAllHotels();
            const q = query.toLowerCase().trim();

            if (!q) return { success: true, data: allHotels };

            const results = allHotels.filter((hotel) => {
                const searchFields = [hotel.title, hotel.city, hotel.address, hotel.description].map(
                    (f) => (f || '').toLowerCase()
                );
                return searchFields.some((field) => field.includes(q));
            });

            return { success: true, data: results };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to search hotels') };
        }
    },

    filterHotels(filters) {
        try {
            const allHotels = this.getAllHotels();

            return {
                success: true,
                data: allHotels.filter((hotel) => {
                    const price = parseFloat(hotel.price) || 0;
                    const rating = parseFloat(hotel.rating) || 0;

                    if (price < filters.minPrice || price > filters.maxPrice) return false;
                    if (rating < filters.minRating) return false;
                    if (filters.roomType && hotel.roomType !== filters.roomType) return false;

                    if (filters.location) {
                        const hotelLocation = (hotel.city || '').toLowerCase();
                        const filterLocation = filters.location.toLowerCase();
                        if (!hotelLocation.includes(filterLocation)) return false;
                    }

                    return true;
                }),
            };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to filter hotels') };
        }
    },

    sortHotels(hotels, field, order = 'asc') {
        try {
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
                    return order === 'asc'
                        ? nameA.localeCompare(nameB)
                        : nameB.localeCompare(nameA);
                },
            };

            if (sortMap[field]) {
                const sorted = [...hotels].sort(sortMap[field]);
                return { success: true, data: sorted };
            }

            return { success: false, error: 'Invalid sort field' };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to sort hotels') };
        }
    },

    getHotelById(hotelId) {
        try {
            const allHotels = this.getAllHotels();
            const hotel = allHotels.find((h) => h.id === hotelId);
            return hotel || null;
        } catch (err) {
            return null;
        }
    },

    getSimilarHotels(hotelId, limit = 3) {
        try {
            const allHotels = this.getAllHotels();
            const refHotel = this.getHotelById(hotelId);

            if (!refHotel) {
                return { success: false, error: 'Hotel not found' };
            }

            const similar = allHotels
                .filter((h) => h.id !== hotelId && h.type === refHotel.type)
                .slice(0, limit);

            return { success: true, data: similar };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to get similar hotels') };
        }
    },

    getHotelsInPriceRange(minPrice, maxPrice) {
        try {
            const allHotels = this.getAllHotels();
            const filtered = allHotels.filter((hotel) => {
                const price = parseFloat(hotel.price) || 0;
                return price >= minPrice && price <= maxPrice;
            });

            return { success: true, data: filtered };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to filter by price') };
        }
    },

    getFeaturedHotels(limit = 5) {
        try {
            const allHotels = this.getAllHotels();
            const featured = [...allHotels]
                .sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0))
                .slice(0, limit);

            return { success: true, data: featured };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to get featured hotels') };
        }
    },

    getStats() {
        try {
            const allHotels = this.getAllHotels();

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
                success: true,
                data: {
                    totalHotels: allHotels.length,
                    priceRange: {
                        min: priceRange.min === Infinity ? 0 : priceRange.min,
                        max: priceRange.max === -Infinity ? 0 : priceRange.max,
                    },
                    averageRating: avgRating.toFixed(1),
                },
            };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to get stats') };
        }
    },
};
