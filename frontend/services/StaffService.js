import Apis, {endpoints} from '../configuration/Apis';
import {MANAGER_ID} from './branchMockStore';
import {staffMockStore} from './staffMockStore';

const useMock = () => Boolean(process.env.EXPO_PRIVATE_MOCK);

export {MANAGER_ID};
export {STAFF_ROLES} from './staffMockStore';

export const fetchStaffList = async (managerId = MANAGER_ID, filters = {}) => {
    if (useMock()) {
        const data = await staffMockStore.listStaff(managerId, filters);
        return {status: 'success', data};
    }
    const params = new URLSearchParams({managerId});
    if (filters.branchId && filters.branchId !== 'all') params.append('branchId', filters.branchId);
    if (filters.businessId && filters.businessId !== 'all') params.append('businessId', filters.businessId);
    return Apis.get(`${endpoints['get_staff_list']}?${params.toString()}`);
};

export const fetchStaffById = async (staffId, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await staffMockStore.getStaff(staffId, managerId);
        if (!data) return {status: 'error', message: 'Staff member not found'};
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints['get_staff_list']}/${staffId}?managerId=${managerId}`);
};

export const createStaff = async (payload, managerId = MANAGER_ID) => {
    if (useMock()) {
        try {
            const data = await staffMockStore.createStaff(managerId, payload);
            return {status: 'success', data};
        } catch (err) {
            return {status: 'error', message: err.message || 'Unable to create staff'};
        }
    }
    return Apis.post(endpoints['create_staff'], {...payload, managerId});
};

export const updateStaff = async (staffId, payload, managerId = MANAGER_ID) => {
    if (useMock()) {
        try {
            const data = await staffMockStore.updateStaff(staffId, managerId, payload);
            return {status: 'success', data};
        } catch (err) {
            return {status: 'error', message: err.message || 'Unable to update staff'};
        }
    }
    return Apis.put(`${endpoints['update_staff']}/${staffId}`, {...payload, managerId});
};

export const deleteStaff = async (staffId, managerId = MANAGER_ID) => {
    if (useMock()) {
        try {
            const data = await staffMockStore.deleteStaff(staffId, managerId);
            return {status: 'success', data};
        } catch (err) {
            return {status: 'error', message: err.message || 'Unable to delete staff'};
        }
    }
    return Apis.delete(`${endpoints['delete_staff']}/${staffId}?managerId=${managerId}`);
};

export const fetchStaffBranchOptions = async (managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await staffMockStore.listBranchOptions(managerId);
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints['get_staff_list']}/branches?managerId=${managerId}`);
};
