import api, { endpoints } from '../configuration/Apis';

const normalizeList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export const companyService = {
    list: async () => (await api.get(endpoints['companies'])).data,
    branches: async (companyId) => {
        const res = await api.get(endpoints['branches'], {params: {businessId: companyId}});
        return normalizeList(res.data);
    },
};

export const branchService = {
    list: async (params = {}) => (await api.get(endpoints['branches'], {params})).data,
    get: async (id) => (await api.get(endpoints['branch-detail'](id))).data,
};

export const roomService = {
    list: async (params = {}) => (await api.get(endpoints['rooms'], {params})).data,
    updateStatus: async (id, status) => (await api.patch(endpoints['room-detail'](id), {status})).data,
};

export const bookingService = {
    list: async (params = {}) => (await api.get(endpoints['bookings'], {params})).data,
    upcoming: async () => (await api.get(endpoints['bookings'])).data,
    today: async () => {
        const now = new Date();
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
            now.getDate()
        ).padStart(2, '0')}`;
        const res = await api.get(endpoints['bookings-for-day'], {params: {date}});
        return res.data;
    },
    checkIn: async (bookingId) => (await api.post(endpoints['booking-checkin'](bookingId))).data,
};

export const reportService = {
    dashboard: async () => {
        const res = await api.get(endpoints['reports']);
        return res.data?.data || res.data;
    },
};
