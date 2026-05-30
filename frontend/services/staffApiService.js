import {
    fetchRooms,
    updateRoom,
    fetchServiceOrders,
    updateServiceOrder,
} from './ReceptionService';
import api, {endpoints} from '../configuration/Apis';

const normalizeStaffRoom = (room) => {
    if (!room || typeof room !== 'object') return room;
    const themes = Array.isArray(room.themes) ? room.themes : [];
    const feature = themes.length
        ? themes.map((t) => t.name).filter(Boolean).join(', ')
        : String(room.floor || '').trim()
            ? `Floor ${room.floor}`
            : '';
    return {
        ...room,
        roomNumber: room.roomNumber ?? room.room_number,
        type: room.type ?? room.roomTypeName ?? room.room_type_name ?? 'Standard',
        hourlyRate: Number(room.hourlyRate ?? room.pricePerHour ?? 50000) || 50000,
        feature,
        status: String(room.status || 'AVAILABLE').toUpperCase(),
    };
};

export const listRooms = async (branchId) => {
    try {
        const response = await fetchRooms({ branch_id: branchId });
        const data = response?.data;
        let rows = [];
        if (Array.isArray(data)) {
            rows = data;
        } else if (data?.results) {
            rows = data.results;
        }
        return rows.map(normalizeStaffRoom).sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return [];
    }
};

export const getRoom = async (roomId) => {
    try {
        const response = await fetchRooms({ id: roomId });
        const data = response?.data;
        if (Array.isArray(data) && data.length > 0) return normalizeStaffRoom(data[0]);
        if (data?.results && data.results.length > 0) return normalizeStaffRoom(data.results[0]);
        if (data?.id) return normalizeStaffRoom(data);
        return null;
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return null;
    }
};

export const markRoomClean = async (roomId) => {
    try {
        await updateRoom(roomId, { status: 'AVAILABLE' });
        return { success: true };
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return { success: false };
    }
};

export const listHousekeepingTasks = async (branchId) => {
    try {
        const response = await api.get(endpoints['housekeeping-tasks'], {params: {branch_id: branchId}});
        const data = response?.data;
        if (Array.isArray(data)) return data;
        if (data?.results) return data.results;
        return [];
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return [];
    }
};

export const completeHousekeepingTask = async (taskId) => {
    try {
        const response = await api.post(endpoints['housekeeping-task-complete'](taskId));
        return {success: true, data: response.data};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return {success: false, message: error?.response?.data?.detail || error?.message};
    }
};

export const startHousekeepingTask = async (taskId) => {
    try {
        const response = await api.post(endpoints['housekeeping-task-start'](taskId));
        return {success: true, data: response.data};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return {success: false, message: error?.response?.data?.detail || error?.message};
    }
};

export const listServiceOrders = async (branchId) => {
    try {
        const response = await fetchServiceOrders({ branch_id: branchId });
        const data = response?.data;
        if (Array.isArray(data)) return data;
        if (data?.results) return data.results;
        return [];
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return [];
    }
};

export const acceptServiceOrder = async (orderId, staffName) => {
    try {
        const response = await api.post(endpoints['service-order-accept'](orderId), {
            staff_name: staffName || null,
        });
        return {success: true, data: response.data};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return {success: false, message: error?.response?.data?.detail || error?.message};
    }
};

export const startServiceOrder = async (orderId) => {
    try {
        const response = await api.post(endpoints['service-order-start'](orderId));
        return {success: true, data: response.data};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return {success: false, message: error?.response?.data?.detail || error?.message};
    }
};

export const completeServiceOrder = async (orderId) => {
    try {
        const response = await api.post(endpoints['service-order-complete'](orderId));
        return {success: true, data: response.data};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return {success: false, message: error?.response?.data?.detail || error?.message};
    }
};

export const cancelServiceOrder = async (orderId) => {
    try {
        const response = await api.post(endpoints['service-order-cancel'](orderId));
        return {success: true, data: response.data};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return {success: false, message: error?.response?.data?.detail || error?.message};
    }
};

const WALK_IN_READY = new Set(['AVAILABLE', 'CLEAN']);

export const isRoomGridBlocked = (status) => {
    const key = String(status || '').trim().toUpperCase();
    return !WALK_IN_READY.has(key);
};

export const canBookWalkInRoom = (status) => {
    const key = String(status || '').trim().toUpperCase();
    return WALK_IN_READY.has(key);
};
