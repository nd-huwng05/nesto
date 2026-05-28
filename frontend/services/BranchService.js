import api, {endpoints} from '../configuration/Apis';

const ok = (response, dataOverride = undefined) => ({
    status: 'success',
    data: dataOverride === undefined ? response?.data : dataOverride,
});

const fail = (err, fallback) => {
    const data = err?.response?.data;
    let message = err?.message || fallback;
    if (typeof data?.detail === 'string') {
        message = data.detail;
    } else if (data && typeof data === 'object') {
        const parts = Object.entries(data).flatMap(([key, value]) => {
            if (key === 'status_code' || key === 'code') return [];
            if (Array.isArray(value)) return value.map((item) => `${key}: ${item}`);
            if (typeof value === 'string') return [`${key}: ${value}`];
            return [];
        });
        if (parts.length) message = parts.join('\n');
    }
    return {status: 'error', message, data: data || null};
};

const pickList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const fetchBusinessMetadata = async () => {
    try {
        const response = await api.get(endpoints['business-metadata']);
        return ok(response, response?.data || {});
    } catch (error) {
        console.error('API Error: ', error.response?.data || error.message);
        return fail(error, 'Unable to load business metadata.');
    }
};

export const fetchLodgingTypes = async () => {
    const res = await fetchBusinessMetadata();
    if (res.status !== 'success') return res;
    return {status: 'success', data: res.data?.lodgingTypes || []};
};

export const fetchAmenityOptions = async () => {
    const res = await fetchBusinessMetadata();
    if (res.status !== 'success') return res;
    return {status: 'success', data: res.data?.amenityOptions || []};
};

export const fetchGuestSegments = async () => {
    const res = await fetchBusinessMetadata();
    if (res.status !== 'success') return res;
    return {status: 'success', data: res.data?.guestSegments || []};
};

export const fetchRoomAmenityOptions = async () => {
    const res = await fetchBusinessMetadata();
    if (res.status !== 'success') return res;
    return {status: 'success', data: res.data?.roomAmenities || []};
};

export const fetchBusinessList = async () => {
    try {
        const response = await api.get(endpoints['companies']);
        return ok(response, pickList(response.data));
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to fetch businesses.');
    }
};

export const fetchBusinessDetail = async (businessId) => {
    try {
        const response = await api.get(endpoints['company-detail'](businessId));
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to fetch business detail.');
    }
};

export const createBusiness = async (payload) => {
    try {
        const response = await api.post(endpoints['companies'], payload);
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to create business.');
    }
};

export const updateBusiness = async (businessId, payload) => {
    try {
        const response = await api.patch(endpoints['company-detail'](businessId), payload);
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to update business.');
    }
};

export const deleteBusiness = async (businessId) => {
    try {
        await api.delete(endpoints['company-detail'](businessId));
        return {status: 'success', data: null};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to delete business.');
    }
};

export const fetchBranchList = async (businessId) => {
    try {
        const response = await api.get(endpoints['branches'], {params: {businessId}});
        return ok(response, pickList(response.data));
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to fetch branches.');
    }
};

export const fetchBranchDetail = async (branchId) => {
    try {
        const response = await api.get(endpoints['branch-detail'](branchId));
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to fetch branch detail.');
    }
};

export const createBranch = async (businessId, payload) => {
    try {
        const response = await api.post(endpoints['branches'], {...payload, businessId});
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to create branch.');
    }
};

export const updateBranch = async (branchId, payload) => {
    try {
        const response = await api.patch(endpoints['branch-detail'](branchId), payload);
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to update branch.');
    }
};

export const deleteBranch = async (branchId) => {
    try {
        await api.delete(endpoints['branch-detail'](branchId));
        return {status: 'success', data: null};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to delete branch.');
    }
};

export const fetchRoomTypes = async (branchId) => {
    try {
        const response = await api.get(endpoints['room-types'], {params: {branch_id: branchId}});
        return ok(response, pickList(response.data));
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to fetch room types.');
    }
};

export const createRoomType = async (branchId, payload) => {
    try {
        const response = await api.post(endpoints['room-types'], {branch: branchId, ...payload});
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to create room type.');
    }
};

export const updateRoomType = async (branchId, roomTypeId, payload) => {
    try {
        const response = await api.patch(endpoints['room-type-detail'](roomTypeId), payload);
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to update room type.');
    }
};

export const deleteRoomType = async (branchId, roomTypeId) => {
    try {
        await api.delete(endpoints['room-type-detail'](roomTypeId));
        return {status: 'success', data: null};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to delete room type.');
    }
};

export const fetchPhysicalRooms = async (branchId) => {
    try {
        const response = await api.get(endpoints['rooms'], {params: {branch_id: branchId}});
        return ok(response, pickList(response.data));
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to fetch physical rooms.');
    }
};

export const createPhysicalRoom = async (branchId, payload) => {
    try {
        const response = await api.post(endpoints['rooms'], {
            branch: branchId,
            roomNumber: payload.roomNumber,
            floor: payload.floor,
            roomTypeId: payload.roomTypeId,
            status: payload.status || 'AVAILABLE',
        });
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to create physical room.');
    }
};

export const updatePhysicalRoom = async (branchId, roomId, payload) => {
    try {
        const response = await api.patch(endpoints['room-detail'](roomId), {
            roomNumber: payload.roomNumber,
            floor: payload.floor,
            roomTypeId: payload.roomTypeId,
            status: payload.status,
        });
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to update physical room.');
    }
};

export const deletePhysicalRoom = async (branchId, roomId) => {
    try {
        await api.delete(endpoints['room-detail'](roomId));
        return {status: 'success', data: null};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to delete physical room.');
    }
};

export const fetchExtraServices = async (branchId) => {
    try {
        const response = await api.get(endpoints['extra-services'], {params: {branch_id: branchId}});
        return ok(response, pickList(response.data));
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to fetch extra services.');
    }
};

export const createExtraService = async (branchId, payload) => {
    try {
        const response = await api.post(endpoints['extra-services'], {branch: branchId, ...payload});
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to create extra service.');
    }
};

export const updateExtraService = async (branchId, serviceId, payload) => {
    try {
        const response = await api.patch(endpoints['extra-service-detail'](serviceId), payload);
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to update extra service.');
    }
};

export const deleteExtraService = async (branchId, serviceId) => {
    try {
        await api.delete(endpoints['extra-service-detail'](serviceId));
        return {status: 'success', data: null};
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to delete extra service.');
    }
};

export const fetchStaffById = async (staffId) => {
    try {
        const response = await api.get(endpoints['staff-profile-detail'](staffId));
        return ok(response);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to fetch staff profile.');
    }
};
