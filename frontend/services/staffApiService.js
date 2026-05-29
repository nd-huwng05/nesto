import {
    fetchRooms,
    updateRoom,
    fetchServiceOrders,
    updateServiceOrder,
} from './ReceptionService';
import api, {endpoints} from '../configuration/Apis';

export const listRooms = async (branchId) => {
    try {
        const response = await fetchRooms({ branch_id: branchId });
        const data = response?.data;
        if (Array.isArray(data)) {
            return data.sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
        }
        if (data?.results) {
            return data.results.sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
        }
        return [];
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return [];
    }
};

export const getRoom = async (roomId) => {
    try {
        const response = await fetchRooms({ id: roomId });
        const data = response?.data;
        if (Array.isArray(data) && data.length > 0) return data[0];
        if (data?.results && data.results.length > 0) return data.results[0];
        if (data?.id) return data;
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
