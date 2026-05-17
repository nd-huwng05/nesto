import Apis, {endpoints} from '../configuration/Apis';
import {branchMockStore, MANAGER_ID} from './branchMockStore';

const useMock = () => Boolean(process.env.EXPO_PRIVATE_MOCK);

export {MANAGER_ID};

export const fetchBusinessList = async (managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.listBusinesses(managerId);
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints['get_business_list']}?managerId=${managerId}`);
};

export const fetchBusinessDetail = async (businessId, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.getBusiness(businessId, managerId);
        if (!data) return {status: 'error', message: 'Business not found'};
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints['get_business_detail']}/${businessId}?managerId=${managerId}`);
};

export const createBusiness = async (businessData, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.createBusiness(managerId, businessData);
        return {status: 'success', message: 'Business created successfully!', data};
    }
    return Apis.post(endpoints['create_business'], {...businessData, managerId});
};

export const updateBusiness = async (businessId, updates, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.updateBusiness(businessId, managerId, updates);
        return {status: 'success', message: 'Business updated successfully!', data};
    }
    return Apis.put(`${endpoints['update_business']}/${businessId}`, {...updates, managerId});
};

export const deleteBusiness = async (businessId, managerId = MANAGER_ID) => {
    if (useMock()) {
        await branchMockStore.deleteBusiness(businessId, managerId);
        return {status: 'success', message: 'Business deleted successfully!'};
    }
    return Apis.delete(`${endpoints['delete_business']}/${businessId}?managerId=${managerId}`);
};

export const fetchBranchDetail = async (branchId, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.getBranch(branchId, managerId);
        if (!data) return {status: 'error', message: 'Branch not found'};
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints['get_branch_detail']}/${branchId}?managerId=${managerId}`);
};

export const createBranch = async (businessId, branchData, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.createBranch(businessId, managerId, branchData);
        return {status: 'success', message: 'Branch created successfully!', data};
    }
    return Apis.post(endpoints['create_branch'], {...branchData, businessId, managerId});
};

export const updateBranch = async (branchId, updates, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.updateBranch(branchId, managerId, updates);
        return {status: 'success', message: 'Branch updated successfully!', data};
    }
    return Apis.put(`${endpoints['update_branch']}/${branchId}`, {...updates, managerId});
};

export const deleteBranch = async (branchId, managerId = MANAGER_ID) => {
    if (useMock()) {
        await branchMockStore.deleteBranch(branchId, managerId);
        return {status: 'success', message: 'Branch deleted successfully!'};
    }
    return Apis.delete(`${endpoints['delete_branch']}/${branchId}?managerId=${managerId}`);
};

export const fetchLodgingTypes = async () => {
    if (useMock()) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    status: 'success',
                    data: ['Hotel', 'Homestay', 'Resort', 'Villa', 'Glamping'],
                });
            }, 300);
        });
    }
    return Apis.get(endpoints['get_lodging_types']);
};

export const fetchGuestSegments = async () => {
    if (useMock()) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    status: 'success',
                    data: branchMockStore.GUEST_SEGMENTS,
                });
            }, 300);
        });
    }
    return Apis.get(endpoints['get_guest_segments']);
};

export const fetchAmenityOptions = async () => {
    if (useMock()) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({status: 'success', data: branchMockStore.AMENITY_OPTIONS});
            }, 200);
        });
    }
    return Apis.get(endpoints['get_amenity_options']);
};

export const fetchRoomAmenityOptions = async () => {
    if (useMock()) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({status: 'success', data: branchMockStore.ROOM_AMENITY_OPTIONS});
            }, 200);
        });
    }
    return Apis.get(endpoints['get_room_amenity_options']);
};

export const fetchRoomTypes = async (branchId, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.listRoomTypes(branchId, managerId);
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints['get_room_types']}/${branchId}?managerId=${managerId}`);
};

export const createRoomType = async (branchId, payload, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.createRoomType(branchId, managerId, payload);
        return {status: 'success', data};
    }
    return Apis.post(endpoints['create_room_type'], {...payload, branchId, managerId});
};

export const updateRoomType = async (branchId, roomTypeId, updates, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.updateRoomType(branchId, roomTypeId, managerId, updates);
        return {status: 'success', data};
    }
    return Apis.put(`${endpoints['update_room_type']}/${roomTypeId}`, {...updates, branchId, managerId});
};

export const deleteRoomType = async (branchId, roomTypeId, managerId = MANAGER_ID) => {
    if (useMock()) {
        await branchMockStore.deleteRoomType(branchId, roomTypeId, managerId);
        return {status: 'success'};
    }
    return Apis.delete(`${endpoints['delete_room_type']}/${roomTypeId}?branchId=${branchId}&managerId=${managerId}`);
};

export const fetchExtraServices = async (branchId, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.listExtraServices(branchId, managerId);
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints['get_extra_services']}/${branchId}?managerId=${managerId}`);
};

export const createExtraService = async (branchId, payload, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.createExtraService(branchId, managerId, payload);
        return {status: 'success', data};
    }
    return Apis.post(endpoints['create_extra_service'], {...payload, branchId, managerId});
};

export const updateExtraService = async (branchId, serviceId, updates, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.updateExtraService(branchId, serviceId, managerId, updates);
        return {status: 'success', data};
    }
    return Apis.put(`${endpoints['update_extra_service']}/${serviceId}`, {...updates, branchId, managerId});
};

export const deleteExtraService = async (branchId, serviceId, managerId = MANAGER_ID) => {
    if (useMock()) {
        await branchMockStore.deleteExtraService(branchId, serviceId, managerId);
        return {status: 'success'};
    }
    return Apis.delete(`${endpoints['delete_extra_service']}/${serviceId}?branchId=${branchId}&managerId=${managerId}`);
};

export const fetchPhysicalRooms = async (branchId, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.listPhysicalRooms(branchId, managerId);
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints['get_physical_rooms']}/${branchId}?managerId=${managerId}`);
};

export const createPhysicalRoom = async (branchId, payload, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.createPhysicalRoom(branchId, managerId, payload);
        return {status: 'success', data};
    }
    return Apis.post(endpoints['create_physical_room'], {...payload, branchId, managerId});
};

export const updatePhysicalRoom = async (branchId, physicalRoomId, updates, managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await branchMockStore.updatePhysicalRoom(branchId, physicalRoomId, managerId, updates);
        return {status: 'success', data};
    }
    return Apis.put(`${endpoints['update_physical_room']}/${physicalRoomId}`, {...updates, branchId, managerId});
};

export const deletePhysicalRoom = async (branchId, physicalRoomId, managerId = MANAGER_ID) => {
    if (useMock()) {
        await branchMockStore.deletePhysicalRoom(branchId, physicalRoomId, managerId);
        return {status: 'success'};
    }
    return Apis.delete(
        `${endpoints['delete_physical_room']}/${physicalRoomId}?branchId=${branchId}&managerId=${managerId}`
    );
};
