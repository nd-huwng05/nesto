import apiClient, {endpoints} from '../configuration/Apis';

export const companyService = {
    list: async () => {
        const response = await apiClient.get(endpoints.get_companies);
        return response.data;
    },
    retrieve: async (id) => {
        const response = await apiClient.get(`${endpoints.get_company_detail}/${id}/`);
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post(endpoints.create_company, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.patch(`${endpoints.update_company}/${id}/`, data);
        return response.data;
    },
    dashboard: async (id) => {
        const response = await apiClient.get(`${endpoints.get_company_detail}/${id}/dashboard/`);
        return response.data;
    },
    branches: async (id) => {
        const response = await apiClient.get(`${endpoints.get_company_detail}/${id}/branches/`);
        return response.data;
    },
};

export const businessService = {
    list: async () => {
        const response = await apiClient.get(endpoints.get_business_list);
        return response.data;
    },
    retrieve: async (id) => {
        const response = await apiClient.get(`${endpoints.get_business_detail}/${id}/`);
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post(endpoints.create_business, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.patch(`${endpoints.update_business}/${id}/`, data);
        return response.data;
    },
    branches: async (id) => {
        const response = await apiClient.get(`${endpoints.get_business_detail}/${id}/branches/`);
        return response.data;
    },
};

export const branchService = {
    list: async (params = {}) => {
        const response = await apiClient.get(endpoints.create_branch, {params});
        return response.data;
    },
    retrieve: async (id) => {
        const response = await apiClient.get(`${endpoints.get_branch_detail}/${id}/`);
        return response.data;
    },
    create: async (businessId, data) => {
        const response = await apiClient.post(`${endpoints.get_business_detail}/${businessId}/add_branch/`, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.patch(`${endpoints.update_branch}/${id}/`, data);
        return response.data;
    },
    analytics: async (id) => {
        const response = await apiClient.get(`${endpoints.get_branch_detail}/${id}/analytics/`);
        return response.data;
    },
};

export const departmentService = {
    list: async (branchId) => {
        const response = await apiClient.get(endpoints.get_departments, {
            params: {branch_id: branchId},
        });
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post(endpoints.create_department, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.patch(`${endpoints.update_department}/${id}/`, data);
        return response.data;
    },
};

export const roomTypeService = {
    list: async (branchId) => {
        const response = await apiClient.get(endpoints.get_room_types, {
            params: {branch_id: branchId},
        });
        return response.data;
    },
    retrieve: async (id) => {
        const response = await apiClient.get(`${endpoints.get_room_types}${id}/`);
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post(endpoints.create_room_type, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.patch(`${endpoints.update_room_type}/${id}/`, data);
        return response.data;
    },
};

export const roomService = {
    list: async (params = {}) => {
        const response = await apiClient.get(endpoints.get_rooms, {params});
        return response.data;
    },
    retrieve: async (id) => {
        const response = await apiClient.get(`${endpoints.get_rooms}${id}/`);
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post(endpoints.create_room, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.patch(`${endpoints.update_room}/${id}/`, data);
        return response.data;
    },
    availability: async (params = {}) => {
        const response = await apiClient.get(endpoints.get_room_availability, {params});
        return response.data;
    },
    updateStatus: async (id, status) => {
        const response = await apiClient.post(`${endpoints.update_room}/${id}/update_status/`, {status});
        return response.data;
    },
    byStatus: async (params = {}) => {
        const response = await apiClient.get(`${endpoints.get_rooms}by_status/`, {params});
        return response.data;
    },
};

export const bookingService = {
    list: async (params = {}) => {
        const response = await apiClient.get(endpoints.list_bookings, {params});
        return response.data;
    },
    retrieve: async (id) => {
        const response = await apiClient.get(`${endpoints.get_booking}/${id}/`);
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post(endpoints.create_booking, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.patch(`${endpoints.get_booking}/${id}/`, data);
        return response.data;
    },
    checkIn: async (id, data = {}) => {
        const response = await apiClient.post(`${endpoints.get_booking}/${id}/check_in/`, data);
        return response.data;
    },
    checkOut: async (id, data = {}) => {
        const response = await apiClient.post(`${endpoints.get_booking}/${id}/check_out/`, data);
        return response.data;
    },
    confirm: async (id) => {
        const response = await apiClient.post(`${endpoints.get_booking}/${id}/confirm/`);
        return response.data;
    },
    cancel: async (id) => {
        const response = await apiClient.post(`${endpoints.get_booking}/${id}/cancel/`);
        return response.data;
    },
    addRoom: async (bookingId, data) => {
        const response = await apiClient.post(`${endpoints.get_booking}/${bookingId}/add_room/`, data);
        return response.data;
    },
    addService: async (bookingId, data) => {
        const response = await apiClient.post(`${endpoints.get_booking}/${bookingId}/add_service/`, data);
        return response.data;
    },
    upcoming: async () => {
        const response = await apiClient.get(endpoints.upcoming_bookings);
        return response.data;
    },
    today: async () => {
        const response = await apiClient.get(endpoints.today_bookings);
        return response.data;
    },
    calendar: async (params = {}) => {
        const response = await apiClient.get(endpoints.calendar_bookings, {params});
        return response.data;
    },
};

export const customerService = {
    list: async (params = {}) => {
        const response = await apiClient.get(endpoints.get_customers, {params});
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post(endpoints.create_customer, data);
        return response.data;
    },
};

export const serviceOrderService = {
    list: async (params = {}) => {
        const response = await apiClient.get(endpoints.get_service_orders, {params});
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post(endpoints.create_service_order, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.patch(`${endpoints.update_service_order}/${id}/`, data);
        return response.data;
    },
    assign: async (id, staffId) => {
        const response = await apiClient.post(`${endpoints.update_service_order}/${id}/assign/`, {staff_id: staffId});
        return response.data;
    },
    pending: async () => {
        const response = await apiClient.get(endpoints.pending_service_orders);
        return response.data;
    },
    byCategory: async (category) => {
        const response = await apiClient.get(`${endpoints.get_service_orders}by_category/`, {
            params: {category},
        });
        return response.data;
    },
};

export const extraServiceService = {
    list: async (branchId) => {
        const response = await apiClient.get(endpoints.get_extra_services, {
            params: {branch_id: branchId},
        });
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post(endpoints.create_extra_service, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.patch(`${endpoints.update_extra_service}/${id}/`, data);
        return response.data;
    },
};

export const staffService = {
    list: async (params = {}) => {
        const response = await apiClient.get(endpoints.get_staff_list, {params});
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post(endpoints.create_staff, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.patch(`${endpoints.update_staff}/${id}/`, data);
        return response.data;
    },
    schedule: async (id) => {
        const response = await apiClient.get(`${endpoints.get_staff_schedule}/${id}/schedule/`);
        return response.data;
    },
    byRole: async (role) => {
        const response = await apiClient.get(`${endpoints.get_staff_list}by_role/`, {
            params: {role},
        });
        return response.data;
    },
    housekeeping: async () => {
        const response = await apiClient.get(`${endpoints.get_staff_list}housekeeping/`);
        return response.data;
    },
    receptionists: async () => {
        const response = await apiClient.get(`${endpoints.get_staff_list}receptionists/`);
        return response.data;
    },
};

export const paymentService = {
    listTransactions: async (params = {}) => {
        const response = await apiClient.get(endpoints.get_transactions, {params});
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post(endpoints.create_transaction, data);
        return response.data;
    },
    summary: async () => {
        const response = await apiClient.get(endpoints.transaction_summary);
        return response.data;
    },
    recent: async () => {
        const response = await apiClient.get(endpoints.recent_transactions);
        return response.data;
    },
};

export const invoiceService = {
    list: async (params = {}) => {
        const response = await apiClient.get(endpoints.get_invoices, {params});
        return response.data;
    },
    create: async (data) => {
        const response = await apiClient.post(endpoints.create_invoice, data);
        return response.data;
    },
    update: async (id, data) => {
        const response = await apiClient.patch(`${endpoints.update_invoice}/${id}/`, data);
        return response.data;
    },
};

export const reportService = {
    dashboard: async (branchId) => {
        const response = await apiClient.get(endpoints.get_report_dashboard, {
            params: {branch_id: branchId},
        });
        return response.data;
    },
    occupancy: async (params = {}) => {
        const response = await apiClient.get(endpoints.get_report_occupancy, {params});
        return response.data;
    },
    revenue: async (params = {}) => {
        const response = await apiClient.get(endpoints.get_report_revenue, {params});
        return response.data;
    },
    bookingStats: async (params = {}) => {
        const response = await apiClient.get(endpoints.get_report_booking_stats, {params});
        return response.data;
    },
};
