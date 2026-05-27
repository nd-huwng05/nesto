import Apis, {endpoints} from '../configuration/Apis';
import {reportMockStore} from './reportMockStore';

const useMock = () => Boolean(process.env.EXPO_PRIVATE_MOCK);

export const fetchReportBusinessFilters = async () => {
    if (useMock()) {
        const data = await reportMockStore.listBusinessFilters();
        return {status: 'success', data};
    }
    return Apis.get(endpoints.get_report_businesses);
};

export const fetchReportBranchFilters = async (businessId) => {
    if (useMock()) {
        const data = await reportMockStore.listBranchFilters();
        return {status: 'success', data};
    }
    return Apis.get(`${endpoints.get_report_branches}?business=${businessId}`);
};

export const fetchReportDashboard = async (businessId, branchId) => {
    if (useMock()) {
        const data = await reportMockStore.getDashboard(businessId, branchId);
        if (!data) return {status: 'error', message: 'Report data not found'};
        return {status: 'success', data};
    }
    const params = new URLSearchParams();
    if (businessId && businessId !== 'all') params.append('business', businessId);
    if (branchId && branchId !== 'all') params.append('branch', branchId);
    return Apis.get(`${endpoints.get_report_dashboard}?${params.toString()}`);
};
