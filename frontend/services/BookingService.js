import Apis from '../configuration/Apis';
import { getSession } from '../utils/authStorage';
import { getErrorMessage } from '../utils/authErrors';

export const BookingService = {
    async createBooking(bookingPayload) {
        try {
            const { user } = await getSession();
            if (!user) {
                return { success: false, error: 'User not authenticated' };
            }

            const payload = {
                ...bookingPayload,
                guestId: user.id,
                guestEmail: user.email,
                guestPhone: user.phone,
                guestName: user.name,
                createdAt: new Date().toISOString(),
            };

            if (process.env.EXPO_PUBLIC_MOCK === 'true' || !process.env.EXPO_PUBLIC_BASE_URL) {
                await new Promise((resolve) => setTimeout(resolve, 800));
                const mockBooking = {
                    id: `booking-${Date.now()}`,
                    bookingId: `#AQRZO${Math.floor(Math.random() * 10000)}`,
                    status: 'pending',
                    ...payload,
                };
                return { success: true, data: mockBooking };
            }

            const response = await Apis.post('/reception/bookings', payload);
            if (response.data?.status === 'success') {
                return { success: true, data: response.data.data };
            }

            return { success: false, error: response.data?.message || 'Failed to create booking' };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to create booking') };
        }
    },

    async fetchBooking(bookingId) {
        try {
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
                return { success: true, data: response.data.data };
            }

            return { success: false, error: 'Booking not found' };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to fetch booking') };
        }
    },

    async fetchBookingHistory() {
        try {
            const { user } = await getSession();
            if (!user) {
                return { success: false, error: 'User not authenticated' };
            }

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
            return { success: false, error: getErrorMessage(err, 'Failed to fetch booking history') };
        }
    },

    async fetchUpcomingBookings() {
        try {
            const { user } = await getSession();
            if (!user) {
                return { success: false, error: 'User not authenticated' };
            }

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

            const response = await Apis.get(`/reception/bookings?guestId=${user.id}&status=upcoming`);
            if (response.data?.status === 'success') {
                return { success: true, data: response.data.data || [] };
            }

            return { success: false, error: 'Failed to fetch upcoming bookings' };
        } catch (err) {
            return { success: false, error: getErrorMessage(err, 'Failed to fetch upcoming bookings') };
        }
    },

    async cancelBooking(bookingId) {
        try {
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
            return { success: false, error: getErrorMessage(err, 'Failed to cancel booking') };
        }
    },
};
