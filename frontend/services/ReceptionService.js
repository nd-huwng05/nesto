import api, { endpoints } from '../configuration/Apis';

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
        const payload = {
            branch: data.branchId,
            room: data.roomId,
            guestName: data.guestName,
            phone: data.phone,
            walk_in: Boolean(data.walkIn),
            hotel_name: data.hotelName || '',
            hotel_address: data.hotelAddress || '',
            hourlyRate: Math.max(1, Number(data.hourlyRate || 50000)),
        };
        const res = await api.post(endpoints['bookings'], payload);
        return {status: 'success', data: res.data};
    } catch (err) {
        console.error("API Error: ", err.response?.data || err.message);
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
        return {status: 'success', data: res.data?.results || res.data || []};
    } catch (err) {
        console.error("API Error: ", err.response?.data || err.message);
        return fail(err, 'Unable to fetch bookings.');
    }
};

export const fetchBookingDetails = async (bookingId) => {
    try {
        const res = await api.get(endpoints['booking-detail'](bookingId));
        return {status: 'success', data: res.data};
    } catch (err) {
        console.error("API Error: ", err.response?.data || err.message);
        return {status: 'error', message: err?.response?.data?.detail || err?.message};
    }
};

export const confirmCheckIn = async (bookingId) => {
    try {
        const res = await api.post(endpoints['booking-checkin'](bookingId));
        return {status: 'success', data: res.data};
    } catch (err) {
        console.error("API Error: ", err.response?.data || err.message);
        return {status: 'error', message: err?.response?.data?.detail || err?.message};
    }
};

export const fetchAvailableRoomsForSwitch = async (branchId, roomType) => {
    try {
        const res = await api.get(endpoints['rooms'], {params: {branch_id: branchId}});
        const rows = (res.data?.results || res.data || []).filter((room) =>
            roomType ? String(room.roomTypeName || room.room_type_name || '').toLowerCase() === String(roomType).toLowerCase() : true
        );
        return {status: 'success', data: rows};
    } catch (err) {
        console.error("API Error: ", err.response?.data || err.message);
        return {status: 'error', message: err?.response?.data?.detail || err?.message};
    }
};

export const switchBookingRoom = async (bookingId, roomId) => {
    try {
        const res = await api.post(endpoints['booking-switch-room'](bookingId), {room_id: roomId});
        return {status: 'success', data: res.data};
    } catch (err) {
        console.error("API Error: ", err.response?.data || err.message);
        return {status: 'error', message: err?.response?.data?.detail || err?.message};
    }
};

export const assignRoomAndCheckIn = async (bookingId, roomId) => {
    try {
        const res = await api.post(endpoints['booking-assign-checkin'](bookingId), {room_id: roomId});
        return {status: 'success', data: res.data};
    } catch (err) {
        console.error("API Error: ", err.response?.data || err.message);
        return {status: 'error', message: err?.response?.data?.detail || err?.message};
    }
};

export const processPaymentAndCheckOut = async (bookingId, paymentMethod) => {
    try {
        const res = await api.post(endpoints['booking-checkout'](bookingId), {payment_method: paymentMethod});
        return {status: 'success', data: res.data};
    } catch (err) {
        console.error("API Error: ", err.response?.data || err.message);
        return {status: 'error', message: err?.response?.data?.detail || err?.message};
    }
};

export const addBookingExtraService = async (bookingId, serviceId) => {
    try {
        const res = await api.post(endpoints['booking-add-extra-service'](bookingId), {
            service_id: serviceId,
            summary: serviceId,
            amount: 0,
        });
        return {status: 'success', data: res.data};
    } catch (err) {
        console.error("API Error: ", err.response?.data || err.message);
        return {status: 'error', message: err?.response?.data?.detail || err?.message};
    }
};
