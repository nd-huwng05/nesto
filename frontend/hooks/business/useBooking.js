import {useCallback, useState} from 'react';
import {getErrorMessage} from '../../utils/authErrors';
import {createMyBooking, fetchMyBookings} from '../../services/CustomerBookingService';

export const useBooking = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [bookingData, setBookingData] = useState(null);

    const createBooking = useCallback(async (bookingPayload) => {
        setIsLoading(true);
        try {
            const res = await createMyBooking(bookingPayload);
            if (res?.status === 'success') {
                setBookingData(res.data);
                return {success: true, data: res.data};
            }
            return {success: false, error: res?.message || 'Failed to create booking'};
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to create booking');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchBooking = useCallback(async (bookingCode) => {
        setIsLoading(true);
        try {
            const res = await fetchMyBookings();
            if (res?.status !== 'success') return {success: false, error: res?.message || 'Unable to load bookings'};
            const rows = Array.isArray(res.data) ? res.data : [];
            const normalized = String(bookingCode || '').trim();
            const found = rows.find((b) => String(b?.booking_code || b?.bookingCode || '') === normalized) || null;
            if (!found) return {success: false, error: 'Booking not found'};
            setBookingData(found);
            return {success: true, data: found};
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to fetch booking');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchBookingHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetchMyBookings();
            if (res?.status === 'success') return {success: true, data: Array.isArray(res?.data) ? res.data : []};
            return {success: false, error: res?.message || 'Failed to fetch booking history'};
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to fetch booking history');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const cancelBooking = useCallback(async (bookingId) => {
        setIsLoading(true);
        try {
            return {success: false, error: 'Cancel booking is not available yet.'};
        } catch (err) {
            const errorMessage = getErrorMessage(err, 'Failed to cancel booking');
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchUpcomingBookings = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetchMyBookings();
            if (res?.status !== 'success') return {success: false, error: res?.message || 'Failed to fetch upcoming bookings'};
            const rows = Array.isArray(res.data) ? res.data : [];
            const upcoming = rows.filter((b) => String(b?.status || '').toUpperCase() === 'PENDING');
            return {success: true, data: upcoming};
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
