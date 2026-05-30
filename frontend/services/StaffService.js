import api, {endpoints} from '../configuration/Apis';
import {extractApiErrorMessage} from '../utils/apiError';

const ok = (response, dataOverride = undefined) => ({
    status: 'success',
    data: dataOverride === undefined ? response?.data : dataOverride,
});

const fail = (err, fallback) => ({
    status: 'error',
    message: extractApiErrorMessage(err, fallback),
    data: err?.response?.data || null,
});

const pickList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export const STAFF_ROLES = [
    'RECEPTIONIST',
    'HOUSEKEEPING',
    'SPA',
    'RESTAURANT',
    'DRIVER',
];

export const DEFAULT_STAFF_PASSWORD = 'Staff@123456';

export const fetchStaffProfiles = async (params = {}) => {
    try {
        const response = await api.get(endpoints['staff-profiles'], {params});
        return ok(response, pickList(response.data));
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load staff list.');
    }
};

export const fetchStaffProfile = async (id) => {
    try {
        const response = await api.get(endpoints['staff-profile-detail'](id));
        return ok(response, response.data);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load staff profile.');
    }
};

export const createStaffProfile = async (data) => {
    try {
        const response = await api.post(endpoints['staff-profiles'], data);
        return ok(response, response.data);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to create staff.');
    }
};

export const updateStaffProfile = async (id, data) => {
    try {
        const response = await api.patch(endpoints['staff-profile-detail'](id), data);
        return ok(response, response.data);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to update staff.');
    }
};

export const deleteStaffProfile = async (id) => {
    try {
        const response = await api.delete(endpoints['staff-profile-detail'](id));
        return ok(response, null);
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to delete staff.');
    }
};

export const fetchStaffById = async (id) => {
    return await fetchStaffProfile(id);
};

export const fetchStaffList = async (params = {}) => {
    return await fetchStaffProfiles(params);
};

export const createStaff = async (data) => {
    return await createStaffProfile(data);
};

export const updateStaff = async (id, data) => {
    return await updateStaffProfile(id, data);
};

export const deleteStaff = async (id) => {
    return await deleteStaffProfile(id);
};

export const fetchStaffBranchOptions = async () => {
    try {
        const response = await api.get(endpoints['branches']);
        return ok(response, pickList(response.data));
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load branches.');
    }
};

export const fetchBusinessList = async () => {
    try {
        const response = await api.get(endpoints['companies']);
        return ok(response, pickList(response.data));
    } catch (err) {
        console.error('API Error: ', err.response?.data || err.message);
        return fail(err, 'Unable to load businesses.');
    }
};
