import Apis, {endpoints} from '../configuration/Apis';
import {staffPortalMockStore} from './staffPortalMockStore';
import {connectBookingUpdates, connectServiceOrderUpdates, wsManager} from './WebSocketService';

const useMock = () => Boolean(process.env.EXPO_PRIVATE_MOCK);

const networkDelay = (minMs = 500, maxMs = 800) => {
    const ms = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const fetchBookingDetails = async (bookingId) => {
    await networkDelay();
    if (useMock()) {
        const data = await staffPortalMockStore.getBookingDetails(bookingId);
        if (!data) return {status: 'error', message: 'Booking not found'};
        return {status: 'success', data};
    }
    try {
        const response = await Apis.get(`${endpoints.get_booking}/${bookingId}/`);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load booking'};
    }
};

export const confirmCheckIn = async (bookingId, physicalRoomId) => {
    await networkDelay();
    if (useMock()) {
        try {
            const data = await staffPortalMockStore.confirmCheckIn(bookingId, physicalRoomId);
            return {status: 'success', data, message: 'Guest checked in successfully'};
        } catch (err) {
            return {status: 'error', message: err.message || 'Check-in failed'};
        }
    }
    try {
        const response = await Apis.post(`${endpoints.check_in_booking}/${bookingId}/check_in/`, {physical_room: physicalRoomId});
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Check-in failed'};
    }
};

export const processPaymentAndCheckOut = async (bookingId, paymentMethod) => {
    await networkDelay();
    if (useMock()) {
        try {
            const data = await staffPortalMockStore.processPaymentAndCheckOut(bookingId, paymentMethod);
            return {status: 'success', data, message: 'Payment processed. Guest checked out.'};
        } catch (err) {
            return {status: 'error', message: err.message || 'Checkout failed'};
        }
    }
    try {
        const paymentResult = await Apis.post(endpoints.process_payment, {
            booking_id: bookingId,
            amount: 0,
            payment_method: paymentMethod,
            transaction_type: 'PAYMENT',
        });
        await Apis.post(`${endpoints.check_out_booking}/${bookingId}/check_out/`, {payment_method: paymentMethod});
        return {status: 'success', data: paymentResult.data};
    } catch (err) {
        return {status: 'error', message: err.message || 'Checkout failed'};
    }
};

export const createStaffBooking = async (payload) => {
    await networkDelay();
    if (useMock()) {
        try {
            const data = await staffPortalMockStore.createBooking(payload);
            return {status: 'success', data, message: payload.walkIn ? 'Walk-in guest checked in successfully' : 'Booking created'};
        } catch (err) {
            return {status: 'error', message: err.message || 'Unable to create booking'};
        }
    }
    try {
        const response = await Apis.post(endpoints.create_booking, payload);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to create booking'};
    }
};

export const addBookingExtraService = async (bookingId, serviceId, quantity = 1) => {
    await networkDelay(300, 500);
    if (useMock()) {
        try {
            const data = await staffPortalMockStore.addExtraService(bookingId, serviceId);
            return {status: 'success', data};
        } catch (err) {
            return {status: 'error', message: err.message || 'Unable to add service'};
        }
    }
    try {
        const response = await Apis.post(`${endpoints.add_service_to_booking}/${bookingId}/add_service/`, {service_id: serviceId, quantity});
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to add service'};
    }
};

export const fetchBookingsForDay = async (branchId, dateKey) => {
    await networkDelay(300, 500);
    if (useMock()) {
        const data = await staffPortalMockStore.listBookings(branchId, {date: dateKey});
        return {status: 'success', data};
    }
    try {
        const response = await Apis.get(endpoints.list_bookings, {params: {branch: branchId, date: dateKey}});
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load bookings'};
    }
};

export const fetchAvailableRoomsForSwitch = async (bookingId) => {
    await networkDelay(200, 400);
    if (useMock()) {
        const data = await staffPortalMockStore.listAvailableRoomsForSwitch(bookingId);
        return {status: 'success', data};
    }
    try {
        const response = await Apis.get(`${endpoints.get_available_rooms}/${bookingId}/available_rooms/`);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load rooms'};
    }
};

export const assignRoomAndCheckIn = async (bookingId, physicalRoomId) => {
    await networkDelay(300, 500);
    if (useMock()) {
        try {
            const data = await staffPortalMockStore.assignRoomAndCheckIn(bookingId, physicalRoomId);
            return {status: 'success', data, message: `Guest checked in to Room ${data.roomNumber}`};
        } catch (err) {
            return {status: 'error', message: err.message || 'Unable to assign room'};
        }
    }
    try {
        const response = await Apis.post(`${endpoints.check_in_booking}/${bookingId}/check_in/`, {physical_room: physicalRoomId});
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to assign room'};
    }
};

export const switchBookingRoom = async (bookingId, newRoomId) => {
    await networkDelay(300, 500);
    if (useMock()) {
        try {
            const data = await staffPortalMockStore.switchBookingRoom(bookingId, newRoomId);
            return {status: 'success', data, message: 'Room assignment updated'};
        } catch (err) {
            return {status: 'error', message: err.message || 'Unable to change room'};
        }
    }
    return {status: 'error', message: 'Switch room not implemented'};
};

export const fetchHousekeepingRooms = async (branchId) => {
    await networkDelay(300, 500);
    if (useMock()) {
        const data = await staffPortalMockStore.listHousekeepingRooms(branchId);
        return {status: 'success', data};
    }
    try {
        const response = await Apis.get(endpoints.housekeeping_rooms, {params: {branch: branchId}});
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load rooms'};
    }
};

export const markRoomClean = async (roomId) => {
    await networkDelay(300, 500);
    if (useMock()) {
        const data = await staffPortalMockStore.markRoomClean(roomId);
        return {status: 'success', data, message: 'Room marked as clean'};
    }
    try {
        const response = await Apis.post(`${endpoints.mark_room_clean}/${roomId}/mark_clean/`);
        return {status: 'success', data: response.data};
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to mark room clean'};
    }
};

export const fetchServiceOrders = async (branchId, category) => {
    await networkDelay(300, 500);
    if (useMock()) {
        const data = await staffPortalMockStore.listServiceOrders(branchId);
        return {status: 'success', data};
    }
    try {
        const params = {branch: branchId};
        if (category) params.category = category;
        const response = await Apis.get(endpoints.get_service_orders, {params});
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load orders'};
    }
};

export const acceptServiceOrder = async (orderId) => {
    await networkDelay(300, 500);
    if (useMock()) {
        const data = await staffPortalMockStore.acceptServiceOrder(orderId);
        return {status: 'success', data};
    }
    try {
        const response = await Apis.post(`${endpoints.accept_service_order}/${orderId}/accept/`);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to accept order'};
    }
};

export const completeServiceOrder = async (orderId) => {
    await networkDelay(300, 500);
    if (useMock()) {
        const data = await staffPortalMockStore.completeServiceOrder(orderId);
        return {status: 'success', data};
    }
    try {
        const response = await Apis.post(`${endpoints.complete_service_order}/${orderId}/complete/`);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to complete order'};
    }
};

export const subscribeToBookingUpdates = (branchId, onUpdate) => {
    if (useMock()) {
        return wsManager.subscribe(`bookings_${branchId}`, onUpdate);
    }
    const channel = `bookings/${branchId}/`;
    connectBookingUpdates(branchId, {
        onMessage: (data) => {
            onUpdate(data);
        },
        onError: (err) => {
            console.log('Booking WS error:', err);
        },
    });
    return wsManager.subscribe(channel, onUpdate);
};

export const subscribeToServiceOrderUpdates = (branchId, onUpdate) => {
    if (useMock()) {
        return wsManager.subscribe(`services_${branchId}`, onUpdate);
    }
    const channel = `services/${branchId}/`;
    connectServiceOrderUpdates(branchId, {
        onMessage: (data) => {
            onUpdate(data);
        },
        onError: (err) => {
            console.log('Service WS error:', err);
        },
    });
    return wsManager.subscribe(channel, onUpdate);
};

export const connectStaffWebSocket = (branchId, callbacks = {}) => {
    if (useMock()) return;
    connectBookingUpdates(branchId, {
        onOpen: callbacks.onBookingOpen,
        onMessage: callbacks.onBookingMessage,
        onError: callbacks.onBookingError,
        onClose: callbacks.onBookingClose,
    });
    connectServiceOrderUpdates(branchId, {
        onOpen: callbacks.onServiceOpen,
        onMessage: callbacks.onServiceMessage,
        onError: callbacks.onServiceError,
        onClose: callbacks.onServiceClose,
    });
};

export const disconnectStaffWebSocket = (branchId) => {
    if (useMock()) return;
    wsManager.disconnect(`bookings/${branchId}/`);
    wsManager.disconnect(`services/${branchId}/`);
};

export const processPaymentAndCheckIn = processPaymentAndCheckOut;
