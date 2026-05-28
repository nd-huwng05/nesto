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
        const response = await Apis.get(endpoints.create_branch, {
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
        const response = await Apis.get(`${endpoints.get_branch_detail}/${branchId}/`);
        return response;
    } catch (err) {
        return {status: 'error', message: err.message || 'Unable to load branch details'};
    }
};

export const fetchRoomTypes = async (branchId) => {
    await networkDelay();
    try {
        const response = await Apis.get(endpoints.get_room_types, {
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
        const response = await Apis.get(endpoints.get_room_availability, {
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
        const response = await Apis.get(endpoints.get_extra_services, {
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
        const response = await Apis.get(endpoints.get_service_categories, {
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
            const response = await Apis.get(endpoints.me);
            const payload = response?.data?.data || response?.data || null;
            if (payload) {
                return {
                    success: true,
                    data: {
                        id: payload.id,
                        name: payload.name || payload.first_name,
                        email: payload.email,
                        phone: payload.phone,
                        role: payload.role,
                        avatar: payload.avatar,
                        createdAt: payload.created_at || payload.createdAt,
                        updatedAt: payload.updated_at || payload.updatedAt,
                    },
                };
            }
        } catch {
            // Fallback to local session if API is unavailable.
        }

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
        let sessionData = null;
        try {
            sessionData = await getSession();
            const response = await Apis.patch(endpoints.me, updates);
            const payload = response?.data?.data || response?.data || {};
            const currentUser = sessionData?.user || {};
            const token = sessionData?.token;

            if (token) {
                const syncedUser = {
                    ...currentUser,
                    ...payload,
                    ...updates,
                    updated_at: payload?.updated_at || new Date().toISOString(),
                };
                await saveSession(token, syncedUser);
            }

            return {
                success: true,
                data: {
                    ...payload,
                    ...updates,
                },
            };
        } catch {
            // Fallback to local session update when API fails.
        }

        try {
            const {token, user: sessionUser} = sessionData || await getSession();
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

    async listBookingSnapshots(params = {}) {
        try {
            const response = await Apis.get(endpoints.customer_booking_snapshots, {params});
            return {success: true, data: response?.data || response};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to load booking snapshots')};
        }
    },

    async upsertBookingSnapshot(snapshotId, payload) {
        try {
            const response = await Apis.put(`${endpoints.customer_booking_snapshot_detail}/${snapshotId}`, payload);
            return {success: true, data: response?.data || response};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to update booking snapshot')};
        }
    },

    async listNotifications(params = {}) {
        try {
            const response = await Apis.get(endpoints.customer_notifications, {params});
            return {success: true, data: response?.data || response};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to load notifications')};
        }
    },

    async createNotification(payload) {
        try {
            const response = await Apis.post(endpoints.customer_notifications, payload);
            return {success: true, data: response?.data || response};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to create notification')};
        }
    },

    async markAllNotificationsRead() {
        try {
            const response = await Apis.post(endpoints.customer_notifications_mark_all_read);
            return {success: true, data: response?.data || response};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to mark notifications as read')};
        }
    },

    async markNotificationRead(notificationId) {
        try {
            const response = await Apis.post(`${endpoints.customer_notification_mark_read}/${notificationId}/read`);
            return {success: true, data: response?.data || response};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to mark notification as read')};
        }
    },

    async listWatchlistPosts(params = {}) {
        try {
            const response = await Apis.get(endpoints.customer_watchlist_posts, {params});
            return {success: true, data: response?.data || response};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to load watchlist posts')};
        }
    },

    async createWatchlistPost(payload) {
        try {
            const response = await Apis.post(endpoints.customer_watchlist_posts, payload);
            return {success: true, data: response?.data || response};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to create watchlist post')};
        }
    },

    async deleteWatchlistPost(postId) {
        try {
            const response = await Apis.delete(`${endpoints.customer_watchlist_post_detail}/${postId}`);
            return {success: true, data: response?.data || null};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to delete watchlist post')};
        }
    },

    async listHotelRatings() {
        try {
            const response = await Apis.get(endpoints.customer_hotel_ratings);
            return {success: true, data: response?.data || response};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to load hotel ratings')};
        }
    },

    async createHotelRating(payload) {
        try {
            const response = await Apis.post(endpoints.customer_hotel_ratings, payload);
            return {success: true, data: response?.data || response};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to create hotel rating')};
        }
    },

    async getHotelRatingStats(hotelSlug, params = {}) {
        try {
            const response = await Apis.get(`${endpoints.customer_hotel_rating_stats}/${hotelSlug}/rating-stats`, {params});
            return {success: true, data: response?.data || response};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to load hotel rating stats')};
        }
    },

    async listHotels(params = {}) {
        try {
            const response = await Apis.get(endpoints.customer_hotels, {params});
            return {success: true, data: response?.data || response};
        } catch (err) {
            return {success: false, error: getErrorMessage(err, 'Failed to load hotel catalog')};
        }
    },
};
