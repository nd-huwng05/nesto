import Apis, {endpoints} from '../configuration/Apis';
import {branchMockStore, MANAGER_ID} from './branchMockStore';

const useMock = () => Boolean(process.env.EXPO_PRIVATE_MOCK);

export {MANAGER_ID};

export const fetchBusinessList = async () => {
    if (useMock()) {
        const data = await branchMockStore.listBusinesses(MANAGER_ID);
        return {status: 'success', data};
    }
    return Apis.get(endpoints.get_business_list);
};

export const fetchBusinessDetail = async (businessId) => {
    if (useMock()) {
        const data = await branchMockStore.getBusiness(businessId, MANAGER_ID);
        if (!data) return {status: 'error', message: 'Business not found'};
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints.get_business_detail}/${businessId}/`);
};

export const createBusiness = async (businessData) => {
    if (useMock()) {
        const data = await branchMockStore.createBusiness(MANAGER_ID, businessData);
        return {status: 'success', message: 'Business created successfully!', data};
    }
    return Apis.post(endpoints.create_business, businessData);
};

export const updateBusiness = async (businessId, updates) => {
    if (useMock()) {
        const data = await branchMockStore.updateBusiness(businessId, MANAGER_ID, updates);
        return {status: 'success', message: 'Business updated successfully!', data};
    }
    return Apis.patch(`${endpoints.update_business}/${businessId}/`, updates);
};

export const deleteBusiness = async (businessId) => {
    if (useMock()) {
        await branchMockStore.deleteBusiness(businessId, MANAGER_ID);
        return {status: 'success', message: 'Business deleted successfully!'};
    }
    return Apis.delete(`${endpoints.delete_business}/${businessId}/`);
};

export const fetchBranchDetail = async (branchId) => {
    if (useMock()) {
        const data = await branchMockStore.getBranch(branchId, MANAGER_ID);
        if (!data) return {status: 'error', message: 'Branch not found'};
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints.get_branch_detail}/${branchId}/`);
};

export const createBranch = async (businessId, branchData) => {
    if (useMock()) {
        const data = await branchMockStore.createBranch(businessId, MANAGER_ID, branchData);
        return {status: 'success', message: 'Branch created successfully!', data};
    }
    return Apis.post(endpoints.create_branch, {...branchData, business: businessId});
};

export const updateBranch = async (branchId, updates) => {
    if (useMock()) {
        const data = await branchMockStore.updateBranch(branchId, MANAGER_ID, updates);
        return {status: 'success', message: 'Branch updated successfully!', data};
    }
    return Apis.patch(`${endpoints.update_branch}/${branchId}/`, updates);
};

export const deleteBranch = async (branchId) => {
    if (useMock()) {
        await branchMockStore.deleteBranch(branchId, MANAGER_ID);
        return {status: 'success', message: 'Branch deleted successfully!'};
    }
    return Apis.delete(`${endpoints.delete_branch}/${branchId}/`);
};

export const fetchRoomTypes = async (branchId) => {
    if (useMock()) {
        const data = await branchMockStore.listRoomTypes(branchId, MANAGER_ID);
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints.get_room_types}?branch=${branchId}`);
};

export const createRoomType = async (branchId, payload) => {
    if (useMock()) {
        const data = await branchMockStore.createRoomType(branchId, MANAGER_ID, payload);
        return {status: 'success', data};
    }
    return Apis.post(endpoints.create_room_type, {...payload, branch: branchId});
};

export const updateRoomType = async (branchId, roomTypeId, updates) => {
    if (useMock()) {
        const data = await branchMockStore.updateRoomType(branchId, roomTypeId, MANAGER_ID, updates);
        return {status: 'success', data};
    }
    return Apis.patch(`${endpoints.update_room_type}/${roomTypeId}/`, updates);
};

export const deleteRoomType = async (roomTypeId) => {
    if (useMock()) {
        await branchMockStore.deleteRoomType(null, roomTypeId, MANAGER_ID);
        return {status: 'success'};
    }
    return Apis.delete(`${endpoints.delete_room_type}/${roomTypeId}/`);
};

export const fetchExtraServices = async (branchId) => {
    if (useMock()) {
        const data = await branchMockStore.listExtraServices(branchId, MANAGER_ID);
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints.get_extra_services}?branch=${branchId}`);
};

export const createExtraService = async (branchId, payload) => {
    if (useMock()) {
        const data = await branchMockStore.createExtraService(branchId, MANAGER_ID, payload);
        return {status: 'success', data};
    }
    return Apis.post(endpoints.create_extra_service, {...payload, branch: branchId});
};

export const updateExtraService = async (serviceId, updates) => {
    if (useMock()) {
        const data = await branchMockStore.updateExtraService(null, serviceId, MANAGER_ID, updates);
        return {status: 'success', data};
    }
    return Apis.patch(`${endpoints.update_extra_service}/${serviceId}/`, updates);
};

export const deleteExtraService = async (serviceId) => {
    if (useMock()) {
        await branchMockStore.deleteExtraService(null, serviceId, MANAGER_ID);
        return {status: 'success'};
    }
    return Apis.delete(`${endpoints.delete_extra_service}/${serviceId}/`);
};

export const fetchPhysicalRooms = async (branchId) => {
    if (useMock()) {
        const data = await branchMockStore.listPhysicalRooms(branchId, MANAGER_ID);
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints.get_physical_rooms}?branch=${branchId}`);
};

export const createPhysicalRoom = async (branchId, payload) => {
    if (useMock()) {
        const data = await branchMockStore.createPhysicalRoom(branchId, MANAGER_ID, payload);
        return {status: 'success', data};
    }
    return Apis.post(endpoints.create_physical_room, payload);
};

export const updatePhysicalRoom = async (physicalRoomId, updates) => {
    if (useMock()) {
        const data = await branchMockStore.updatePhysicalRoom(null, physicalRoomId, MANAGER_ID, updates);
        return {status: 'success', data};
    }
    return Apis.patch(`${endpoints.update_physical_room}/${physicalRoomId}/`, updates);
};

export const deletePhysicalRoom = async (physicalRoomId) => {
    if (useMock()) {
        await branchMockStore.deletePhysicalRoom(null, physicalRoomId, MANAGER_ID);
        return {status: 'success'};
    }
    return Apis.delete(`${endpoints.delete_physical_room}/${physicalRoomId}/`);
};
