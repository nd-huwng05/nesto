import Apis, {endpoints} from '../configuration/Apis';
import {MANAGER_ID} from './branchMockStore';
import {reportMockStore} from './reportMockStore';

const useMock = () => Boolean(process.env.EXPO_PRIVATE_MOCK);

export {MANAGER_ID};

export const fetchReportBusinessFilters = async (managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await reportMockStore.listBusinessFilters(managerId);
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints['get_report_businesses']}?managerId=${managerId}`);
};

export const fetchReportBranchFilters = async (managerId = MANAGER_ID) => {
    if (useMock()) {
        const data = await reportMockStore.listBranchFilters(managerId);
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints['get_report_branches']}?managerId=${managerId}`);
};

export const fetchReportDashboard = async (
    businessId = 'all',
    branchId = 'all',
    managerId = MANAGER_ID
) => {
    if (useMock()) {
        const data = await reportMockStore.getDashboard(managerId, businessId, branchId);
        if (!data) return {status: 'error', message: 'Report data not found'};
        return {status: 'success', data};
    }
    const params = new URLSearchParams({managerId});
    if (businessId && businessId !== 'all') params.append('businessId', businessId);
    if (branchId && branchId !== 'all') params.append('branchId', branchId);
    return Apis.get(`${endpoints['get_report_dashboard']}?${params.toString()}`);
};
