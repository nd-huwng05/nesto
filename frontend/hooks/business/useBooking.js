import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import Apis from '../configuration/Apis';
import { getErrorMessage } from '../utils/authErrors';
import { getSession } from '../utils/authStorage';

export const useBooking = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [bookingData, setBookingData] = useState(null);

    /**
     * Create a new booking
     * @param {Object} bookingPayload - Booking details
     * @returns {Object} - {success, data, error}
     */
    const createBooking = useCallback(async (bookingPayload) => {
        setIsLoading(true);
        try {
            const { user } = await getSession();
            if (!user) {
                return {
                    success: false,
                    error: 'User not authenticated. Please login first.',
                };
            }

            const payload = {
                ...bookingPayload,
                guestId: user.id,
                guestEmail: user.email,
                guestPhone: user.phone,
                guestName: user.name,
                createdAt: new Date().toISOString(),
            };

            // For mock API, simulate booking creation
            if (process.env.EXPO_PUBLIC_MOCK === 'true' || !process.env.EXPO_PUBLIC_BASE_URL) {
                await new Promise((resolve) => setTimeout(resolve, 800));
                const mockBooking = {
                    id: `booking-${Date.now()}`,
                    bookingId: `#AQRZO${Math.floor(Math.random() * 10000)}`,
                    status: 'pending',
                    ...payload,
                };
                setBookingData(mockBooking);
                return { success: true, data: mockBooking };
            }

            // Real API call
            const response = await Apis.post('/reception/bookings', payload);
            if (response.data?.status === 'success') {
                setBookingData(response.data.data);
                return { success: true, data: response.data.data };
            }

            return {
                success: false,
                error: response.data?.message || 'Failed to create booking',
            };
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to create booking');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetch booking details
     * @param {string} bookingId - Booking ID or booking number
     * @returns {Object} - {success, data, error}
     */
    const fetchBooking = useCallback(async (bookingId) => {
        setIsLoading(true);
        try {
            // Mock API
            if (process.env.EXPO_PUBLIC_MOCK === 'true' || !process.env.EXPO_PUBLIC_BASE_URL) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                return {
                    success: true,
                    data: {
                        id: bookingId,
                        bookingId: '#AQRZO01',
                        status: 'confirmed',
                        hotelName: 'Swiss Hotel',
                        roomName: 'Room 121',
                        checkIn: new Date(),
                        checkOut: new Date(Date.now() + 86400000),
                    },
                };
            }

            const response = await Apis.get(`/reception/bookings/${bookingId}`);
            if (response.data?.status === 'success') {
                setBookingData(response.data.data);
                return { success: true, data: response.data.data };
            }

            return { success: false, error: 'Booking not found' };
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to fetch booking');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetch user's booking history
     * @returns {Object} - {success, data, error}
     */
    const fetchBookingHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const { user } = await getSession();
            if (!user) {
                return {
                    success: false,
                    error: 'User not authenticated',
                };
            }

            // Mock API
            if (process.env.EXPO_PUBLIC_MOCK === 'true' || !process.env.EXPO_PUBLIC_BASE_URL) {
                await new Promise((resolve) => setTimeout(resolve, 600));
                return {
                    success: true,
                    data: [
                        {
                            id: 'history-1',
                            bookingId: '#AQRZO01',
                            status: 'completed',
                            hotelName: 'Swiss Hotel',
                            roomName: 'Room 301',
                            checkIn: '2026-03-10',
                            checkOut: '2026-03-12',
                        },
                        {
                            id: 'history-2',
                            bookingId: '#AQRZO02',
                            status: 'completed',
                            hotelName: 'Marina Bay Resort',
                            roomName: 'Room 305',
                            checkIn: '2026-02-15',
                            checkOut: '2026-02-18',
                        },
                    ],
                };
            }

            const response = await Apis.get(`/reception/bookings?guestId=${user.id}`);
            if (response.data?.status === 'success') {
                return { success: true, data: response.data.data || [] };
            }

            return { success: false, error: 'Failed to fetch booking history' };
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to fetch booking history');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Cancel a booking
     * @param {string} bookingId - Booking ID to cancel
     * @returns {Object} - {success, data, error}
     */
    const cancelBooking = useCallback(async (bookingId) => {
        setIsLoading(true);
        try {
            // Mock API
            if (process.env.EXPO_PUBLIC_MOCK === 'true' || !process.env.EXPO_PUBLIC_BASE_URL) {
                await new Promise((resolve) => setTimeout(resolve, 600));
                return { success: true, data: { bookingId, status: 'cancelled' } };
            }

            const response = await Apis.put(`/reception/bookings/${bookingId}`, {
                status: 'cancelled',
            });

            if (response.data?.status === 'success') {
                return { success: true, data: response.data.data };
            }

            return { success: false, error: 'Failed to cancel booking' };
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to cancel booking');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetch upcoming bookings for customer
     * @returns {Object} - {success, data, error}
     */
    const fetchUpcomingBookings = useCallback(async () => {
        setIsLoading(true);
        try {
            const { user } = await getSession();
            if (!user) {
                return { success: false, error: 'User not authenticated' };
            }

            // Mock API
            if (process.env.EXPO_PUBLIC_MOCK === 'true' || !process.env.EXPO_PUBLIC_BASE_URL) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                return {
                    success: true,
                    data: [
                        {
                            id: 'upcoming-1',
                            bookingId: '#AQRZO01',
                            hotelName: 'Sun Suites Hotel',
                            roomName: 'Room 101',
                            checkIn: '2026-04-15',
                            checkOut: '2026-04-17',
                            status: 'pending_payment',
                            actionLabel: 'Payment',
                        },
                    ],
                };
            }

            const response = await Apis.get(
                `/reception/bookings?guestId=${user.id}&status=upcoming`
            );
            if (response.data?.status === 'success') {
                return { success: true, data: response.data.data || [] };
            }

            return { success: false, error: 'Failed to fetch upcoming bookings' };
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to fetch upcoming bookings');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const resetBookingData = useCallback(() => {
        setBookingData(null);
    }, []);

    return {
        isLoading,
        bookingData,
        createBooking,
        fetchBooking,
        fetchBookingHistory,
        cancelBooking,
        fetchUpcomingBookings,
        resetBookingData,
    };
};
