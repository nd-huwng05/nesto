import api, { endpoints } from '../configuration/Apis';
import {normalizeStaffBooking, normalizeStaffBookingList} from '../utils/staffBookingMapper';

const fail = (err, fallback) => {
    const data = err?.response?.data;
    const message = data?.detail || err?.message || fallback;
    return {status: 'error', message, data: data || null};
};

export const fetchBooking = async (id) => {
    return await api.get(endpoints['booking-detail'](id));
};

export const fetchBookings = async (params) => {
    return await api.get(endpoints['bookings'], {params});
};

export const createBooking = async (data) => {
    return await api.post(endpoints['bookings'], data);
};

export const createStaffBooking = async (data) => {
    try {
        const totalHours = Math.max(
            1,
            Number(data.durationDays || 0) * 24 + Number(data.durationHours || 0)
        );
        const payload = {
            branch: data.branchId,
            room: data.roomId,
            guest_name: data.guestName,
            phone: data.phone,
            walk_in: Boolean(data.walkIn),
            hotel_name: data.hotelName || '',
            hotel_address: data.hotelAddress || '',
            duration_hours: totalHours,
            hourlyRate: Math.max(1, Number(data.hourlyRate || 50000)),
        };
        const res = await api.post(endpoints['bookings'], payload);
        return {status: 'success', data: normalizeStaffBooking(res.data)};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to create booking.');
    }
};

export const updateBooking = async (id, data) => {
    return await api.patch(endpoints['booking-detail'](id), data);
};

export const fetchRooms = async (params) => {
    return await api.get(endpoints['rooms'], {params});
};

export const updateRoom = async (id, data) => {
    return await api.patch(endpoints['room-detail'](id), data);
};

export const fetchServiceOrders = async (params) => {
    return await api.get(endpoints['service-orders'], {params});
};

export const updateServiceOrder = async (id, data) => {
    return await api.patch(endpoints['service-order-detail'](id), data);
};

export const fetchTransactions = async (params) => {
    return await api.get(endpoints['transactions'], {params});
};

export const createTransaction = async (data) => {
    return await api.post(endpoints['transactions'], data);
};

export const fetchBookingsForDay = async (branchId, dateKey) => {
    try {
        const res = await api.get(endpoints['bookings-for-day'], {params: {branch_id: branchId, date: dateKey}});
        const rows = res.data?.results || res.data || [];
        return {status: 'success', data: normalizeStaffBookingList(rows)};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to fetch bookings.');
    }
};

export const fetchBookingDetails = async (bookingId) => {
    try {
        const res = await api.get(endpoints['booking-detail'](bookingId));
        return {status: 'success', data: normalizeStaffBooking(res.data)};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load booking details.');
    }
};

export const confirmCheckIn = async (bookingId) => {
    try {
        const res = await api.post(endpoints['booking-checkin'](bookingId));
        return {status: 'success', data: normalizeStaffBooking(res.data)};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Check-in failed.');
    }
};

export const lookupBookingByQr = async (payload) => {
    try {
        const res = await api.get(endpoints['booking-lookup'], {
            params: {booking_id: payload},
        });
        return {status: 'success', data: normalizeStaffBooking(res.data)};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Booking not found.');
    }
};

export const fetchAvailableRoomsForBooking = async (bookingId) => {
    try {
        const res = await api.get(endpoints['booking-available-rooms'](bookingId));
        const rows = (res.data?.rooms || []).map((room) => ({
            id: room.id,
            roomNumber: room.roomNumber,
            type: room.roomTypeName || '',
            feature: room.status || 'AVAILABLE',
        }));
        return {status: 'success', data: rows, meta: res.data};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load available rooms.');
    }
};

export const fetchLiveBill = async (bookingId) => {
    try {
        const res = await api.get(endpoints['booking-live-bill'](bookingId));
        return {status: 'success', data: res.data};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to refresh live bill.');
    }
};

export const fetchFinalBill = async (bookingId) => {
    try {
        const res = await api.get(endpoints['booking-final-bill'](bookingId));
        return {status: 'success', data: res.data};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load final bill.');
    }
};

export const fetchAvailableRoomsForSwitch = async (branchId, roomType, bookingId) => {
    if (bookingId) {
        return fetchAvailableRoomsForBooking(bookingId);
    }
    try {
        const res = await api.get(endpoints['rooms'], {params: {branch_id: branchId}});
        const rows = (res.data?.results || res.data || []).filter((room) =>
            roomType ? String(room.roomTypeName || room.room_type_name || '').toLowerCase() === String(roomType).toLowerCase() : true
        );
        return {status: 'success', data: rows};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load rooms.');
    }
};

export const reassignBookingRoom = async (bookingId, roomId) => {
    try {
        const res = await api.post(endpoints['booking-reassign-room'](bookingId), {room_id: roomId});
        return {status: 'success', data: normalizeStaffBooking(res.data)};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Room reassignment failed.');
    }
};

export const switchBookingRoom = async (bookingId, roomId) => {
    try {
        const res = await api.post(endpoints['booking-switch-room'](bookingId), {room_id: roomId});
        return {status: 'success', data: normalizeStaffBooking(res.data)};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Room change failed.');
    }
};

export const assignRoomAndCheckIn = async (bookingId, roomId) => {
    try {
        const res = await api.post(endpoints['booking-assign-checkin'](bookingId), {room_id: roomId});
        return {status: 'success', data: normalizeStaffBooking(res.data)};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Check-in failed.');
    }
};

export const processPaymentAndCheckOut = async (bookingId, paymentMethod, amountCollected) => {
    try {
        const body = {payment_method: paymentMethod};
        if (amountCollected != null) {
            body.amount_collected = amountCollected;
        }
        const res = await api.post(endpoints['booking-checkout'](bookingId), body);
        const invoiceEmailed = Boolean(res.data?.invoiceEmailed);
        return {
            status: 'success',
            data: normalizeStaffBooking(res.data),
            message: invoiceEmailed
                ? 'Checkout complete. Invoice emailed to guest.'
                : 'Checkout complete.',
        };
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Checkout failed.');
    }
};

export const addBookingExtraService = async (bookingId, serviceId) => {
    try {
        const res = await api.post(endpoints['booking-add-extra-service'](bookingId), {
            service_id: serviceId,
        });
        return {status: 'success', data: res.data};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to add service.');
    }
};

export const cancelStaffBooking = async (bookingId, reason = '') => {
    try {
        const res = await api.post(endpoints['booking-cancel'](bookingId), {
            reason,
            cancelReason: reason,
        });
        return {status: 'success', data: normalizeStaffBooking(res.data)};
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to cancel booking.');
    }
};
