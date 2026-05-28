import Apis, {endpoints} from '../configuration/Apis';
import {getSession, saveSession} from '../utils/authStorage';
import {getErrorMessage} from '../utils/authErrors';

const networkDelay = (minMs = 400, maxMs = 700) => {
    const ms = minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const fetchMyBookings = async (customerId) => {
    await networkDelay();
    try {
        const response = await Apis.get(endpoints.list_bookings, {
            params: {customer: customerId},
        });
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load bookings'};
    }
};

export const fetchMyUpcomingBookings = async (customerId) => {
    await networkDelay();
    try {
        const response = await Apis.get(endpoints.upcoming_bookings, {
            params: {customer: customerId},
        });
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load upcoming bookings'};
    }
};

export const fetchMyPastBookings = async (customerId) => {
    await networkDelay();
    try {
        const response = await Apis.get(endpoints.list_bookings, {
            params: {customer: customerId, status: 'CHECKED_OUT'},
        });
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load booking history'};
    }
};

export const fetchBranches = async () => {
    await networkDelay();
    try {
        const response = await Apis.get('business/branches/', {
            params: {is_active: true},
        });
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load branches'};
    }
};

export const fetchBranchDetail = async (branchId) => {
    await networkDelay();
    try {
        const response = await Apis.get(`business/branches/${branchId}/`);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load branch details'};
    }
};

export const fetchRoomTypes = async (branchId) => {
    await networkDelay();
    try {
        const response = await Apis.get('rooms/room-types/', {
            params: {branch: branchId, is_active: true},
        });
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load room types'};
    }
};

export const fetchAvailableRooms = async (branchId, checkIn, checkOut) => {
    await networkDelay();
    try {
        const response = await Apis.get('rooms/rooms/availability/', {
            params: {branch: branchId, check_in: checkIn, check_out: checkOut},
        });
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to check availability'};
    }
};

export const createCustomerBooking = async (payload) => {
    await networkDelay();
    try {
        const response = await Apis.post(endpoints.create_booking, payload);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to create booking'};
    }
};

export const fetchBookingDetail = async (bookingId) => {
    await networkDelay();
    try {
        const response = await Apis.get(`${endpoints.get_booking}/${bookingId}/`);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load booking details'};
    }
};

export const confirmMyBooking = async (bookingId) => {
    await networkDelay();
    try {
        const response = await Apis.post(`${endpoints.confirm_booking}/${bookingId}/confirm/`);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to confirm booking'};
    }
};

export const cancelMyBooking = async (bookingId) => {
    await networkDelay();
    try {
        const response = await Apis.post(`${endpoints.cancel_booking}/${bookingId}/cancel/`);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to cancel booking'};
    }
};

export const fetchExtraServices = async (branchId) => {
    await networkDelay();
    try {
        const response = await Apis.get('services/extra-services/', {
            params: {branch: branchId, is_active: true},
        });
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load services'};
    }
};

export const fetchServiceCategories = async (branchId) => {
    await networkDelay();
    try {
        const response = await Apis.get('services/service-categories/', {
            params: {branch: branchId, is_active: true},
        });
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load service categories'};
    }
};

export const CustomerService = {
    async loadProfile() {
        try {
            const {user} = await getSession();
            if (user) {
                return {
                    success: true,
                    data: {
                        id: user.id,
                        name: user.name || user.first_name,
                        email: user.email,
                        phone: user.phone,
                        role: user.role,
                        avatar: user.avatar,
                        createdAt: user.created_at,
                        updatedAt: user.updated_at,
                    },
                };
            }
            return {success: false, error: 'User not found'};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to load profile')};
        }
    },

    async updateProfile(userId, updates) {
        try {
            const {token, user: sessionUser} = await getSession();
            if (!sessionUser) {
                return {success: false, error: 'User not authenticated'};
            }

            const updatedUser = {
                ...sessionUser,
                ...updates,
                updated_at: new Date().toISOString(),
            };

            await saveSession(token, updatedUser);
            return {success: true, data: updatedUser};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to update profile')};
        }
    },

    async updateAvatar(userId, avatarUrl) {
        return this.updateProfile(userId, {avatar: avatarUrl});
    },

    async verifyEmail(userId) {
        try {
            const {token, user} = await getSession();
            if (!user) {
                return {success: false, error: 'User not authenticated'};
            }

            const updatedUser = {...user, emailVerified: true};
            await saveSession(token, updatedUser);
            return {success: true};
        } catch (err) {
            return {success: false, error: getErrorMessage(err)};
        }
    },

    async verifyPhone(userId) {
        try {
            const {token, user} = await getSession();
            if (!user) {
                return {success: false, error: 'User not authenticated'};
            }

            const updatedUser = {...user, phoneVerified: true};
            await saveSession(token, updatedUser);
            return {success: true};
        } catch (err) {
            return {success: false, error: getErrorMessage(err)};
        }
    },
};
