import {
    fetchRooms,
    updateRoom,
    fetchServiceTasks,
} from './ReceptionService';
import api, {endpoints} from '../configuration/Apis';
import {pickResults} from '../utils/apiShape';
import {normalizeRoomStatus} from '../utils/roomStatus';

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
        id: String(room.id || ''),
        room_number: room.room_number,
        type: room.room_type_name ?? 'Standard',
        hourly_rate: Number(room.hourly_rate ?? room.price_per_hour ?? 50000) || 50000,
        feature,
        status: normalizeRoomStatus(room.status),
    };
};

export const listRooms = async (branchId) => {
    try {
        const response = await fetchRooms({ branch_id: branchId });
        const rows = pickResults(response?.data);
        return rows.map(normalizeStaffRoom).sort((a, b) => Number(a.room_number) - Number(b.room_number));
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
        const results = pickResults(data);
        if (results.length > 0) return normalizeStaffRoom(results[0]);
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

export const normalizeHousekeepingTask = (row) => {
    if (!row || typeof row !== 'object') return null;
    const roomNumber = String(row.room_number || row.roomNumber || '').trim();
    const roomType = String(row.room_type_name || row.roomTypeName || row.room_type || '').trim();
    const floorRaw = row.floor ?? row.room_floor;
    const floor = floorRaw == null || floorRaw === '' ? null : Number(floorRaw);
    const status = String(row.status || 'PENDING').trim().toUpperCase();
    const roomStatus = normalizeRoomStatus(row.room_status || row.roomStatus || '');
    const statusLabel = String(row.status_label || row.statusLabel || '').trim()
        || (status === 'IN_PROGRESS' ? 'In Progress' : status === 'PENDING' ? 'Needs Cleaning' : status.replace(/_/g, ' '));

    return {
        ...row,
        id: String(row.id || ''),
        room_id: String(row.room_id || row.room || ''),
        roomId: String(row.room_id || row.room || ''),
        room_number: roomNumber,
        roomNumber,
        room_type: roomType,
        roomType,
        room_status: roomStatus,
        roomStatus,
        floor,
        floorLabel: Number.isFinite(floor) ? `Floor ${floor}` : '',
        status,
        statusLabel,
        note: String(row.note || '').trim(),
    };
};

/** One active task per physical room — keep the newest row. */
export const dedupeHousekeepingTasks = (rows) => {
    if (!Array.isArray(rows)) return [];
    const byRoom = new Map();
    for (const row of rows) {
        const normalized = normalizeHousekeepingTask(row);
        if (!normalized) continue;
        const key = String(normalized.roomNumber || normalized.room_number || normalized.id);
        const existing = byRoom.get(key);
        if (!existing) {
            byRoom.set(key, normalized);
            continue;
        }
        const existingTs = Date.parse(existing.updated_at || existing.created_at || '');
        const nextTs = Date.parse(normalized.updated_at || normalized.created_at || '');
        if (nextTs >= existingTs) {
            byRoom.set(key, normalized);
        }
    }
    return Array.from(byRoom.values()).sort(
        (a, b) => Number(a.roomNumber) - Number(b.roomNumber)
    );
};

export const listHousekeepingTasks = async (branchId) => {
    try {
        const response = await api.get(endpoints['housekeeping-tasks'], {
            params: {branch_id: branchId, active: 'true'},
        });
        return dedupeHousekeepingTasks(pickResults(response?.data));
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return [];
    }
};

export const completeHousekeepingTask = async (taskId) => {
    try {
        const response = await api.post(endpoints['housekeeping-task-complete'](taskId));
        return {success: true, data: normalizeHousekeepingTask(response.data)};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return {success: false, message: error?.response?.data?.detail || error?.message};
    }
};

export const startHousekeepingTask = async (taskId) => {
    try {
        const response = await api.post(endpoints['housekeeping-task-start'](taskId));
        return {success: true, data: normalizeHousekeepingTask(response.data)};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return {success: false, message: error?.response?.data?.detail || error?.message};
    }
};

export const listServiceTasks = async (branchId) => {
    try {
        const response = await fetchServiceTasks({ branch_id: branchId });
        return pickResults(response?.data);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return [];
    }
};

export const acceptServiceTask = async (taskId, staffName) => {
    try {
        const response = await api.post(endpoints['service-task-accept'](taskId), {
            staff_name: staffName || null,
        });
        return {success: true, data: response.data};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return {success: false, message: error?.response?.data?.detail || error?.message};
    }
};

export const startServiceTask = async (taskId) => {
    try {
        const response = await api.post(endpoints['service-task-start'](taskId));
        return {success: true, data: response.data};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return {success: false, message: error?.response?.data?.detail || error?.message};
    }
};

export const completeServiceTask = async (taskId) => {
    try {
        const response = await api.post(endpoints['service-task-complete'](taskId));
        return {success: true, data: response.data};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return {success: false, message: error?.response?.data?.detail || error?.message};
    }
};

export const cancelServiceTask = async (taskId) => {
    try {
        const response = await api.post(endpoints['service-task-cancel'](taskId));
        return {success: true, data: response.data};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return {success: false, message: error?.response?.data?.detail || error?.message};
    }
};

/** @deprecated Use listServiceTasks */
export const listServiceOrders = listServiceTasks;
/** @deprecated Use acceptServiceTask */
export const acceptServiceOrder = acceptServiceTask;
/** @deprecated Use startServiceTask */
export const startServiceOrder = startServiceTask;
/** @deprecated Use completeServiceTask */
export const completeServiceOrder = completeServiceTask;
/** @deprecated Use cancelServiceTask */
export const cancelServiceOrder = cancelServiceTask;

export {
    canBookWalkInRoom,
    getRoomBlockedHint,
    getRoomStatusLabel,
    isRoomGridBlocked,
    isRoomSelectableForReception,
    normalizeRoomStatus,
} from '../utils/roomStatus';
