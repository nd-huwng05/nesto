import Apis, {endpoints} from '../configuration/Apis';
import {MANAGER_ID} from './branchMockStore';
import {staffMockStore} from './staffMockStore';

const useMock = () => process.env.EXPO_PUBLIC_MOCK === 'true';

export {MANAGER_ID};
export {STAFF_ROLES} from './staffMockStore';

export const fetchStaffList = async (filters = {}) => {
    if (useMock()) {
        const data = await staffMockStore.listStaff(MANAGER_ID, filters);
        return {status: 'success', data};
    }
    const params = new URLSearchParams();
    if (filters.branchId && filters.branchId !== 'all') params.append('branch', filters.branchId);
    if (filters.businessId && filters.businessId !== 'all') {
        return Apis.get(`${endpoints.get_staff_list}?${params.toString()}&branch__business=${filters.businessId}`);
    }
    return Apis.get(`${endpoints.get_staff_list}?${params.toString()}`);
};

export const fetchStaffById = async (staffId) => {
    if (useMock()) {
        const data = await staffMockStore.getStaff(staffId, MANAGER_ID);
        if (!data) return {status: 'error', message: 'Staff member not found'};
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints.get_staff_list}${staffId}/`);
};

export const createStaff = async (payload) => {
    if (useMock()) {
        try {
            const data = await staffMockStore.createStaff(MANAGER_ID, payload);
            return {status: 'success', data};
        } catch (err) {
            return {status: 'error', message: err.message || 'Unable to create staff'};
        }
    }
    return Apis.post(endpoints.create_staff, payload);
};

export const updateStaff = async (staffId, payload) => {
    if (useMock()) {
        try {
            const data = await staffMockStore.updateStaff(staffId, MANAGER_ID, payload);
            return {status: 'success', data};
        } catch (err) {
            return {status: 'error', message: err.message || 'Unable to update staff'};
        }
    }
    return Apis.patch(`${endpoints.update_staff}/${staffId}/`, payload);
};

export const deleteStaff = async (staffId) => {
    if (useMock()) {
        try {
            const data = await staffMockStore.deleteStaff(staffId, MANAGER_ID);
            return {status: 'success', data};
        } catch (err) {
            return {status: 'error', message: err.message || 'Unable to delete staff'};
        }
    }
    return Apis.delete(`${endpoints.delete_staff}/${staffId}/`);
};

export const fetchStaffBranchOptions = async () => {
    if (useMock()) {
        const data = await staffMockStore.listBranchOptions(MANAGER_ID);
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints.get_business_list}`);
};
