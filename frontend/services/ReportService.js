import api, { endpoints } from '../configuration/Apis';

const ok = (response, dataOverride = undefined) => ({
    status: 'success',
    data: dataOverride === undefined ? response?.data : dataOverride,
});

const fail = (err, fallback) => ({
    status: 'error',
    message: err?.response?.data?.detail || err?.message || fallback,
    data: null,
});

export const fetchReportDashboard = async (businessId = 'all', branchId = 'all', period = 'month') => {
    try {
        const response = await api.get(endpoints['business-analytics-dashboard'], {
            params: {businessId, branchId, months: 6, period},
        });
        return ok(response, response?.data);
    } catch (error) {
        console.error("API Error: ", error.response?.data || error.message);
        return fail(error, 'Unable to fetch dashboard report.');
    }
};

export const fetchReportBusinessFilters = async () => {
    const response = await fetchReportDashboard('all', 'all');
    if (response.status !== 'success') return response;
    return {status: 'success', data: response.data?.businessOptions || []};
};

export const fetchReportBranchFilters = async () => {
    const response = await fetchReportDashboard('all', 'all');
    if (response.status !== 'success') return response;
    return {status: 'success', data: response.data?.branchOptions || []};
};
