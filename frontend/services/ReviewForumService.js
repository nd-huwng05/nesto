import Apis, {endpoints} from '../configuration/Apis';

const FORUM_ENDPOINT = endpoints.review_forum;

const unwrapPayload = (response) => {
    if (!response || typeof response !== 'object') return null;
    if ('data' in response && response.data && typeof response.data === 'object') {
        const nested = response.data;
        if ('data' in nested) return nested.data;
        return nested;
    }
    return response;
};

const getApiErrorMessage = (error, fallbackMessage) => {
    const message = error?.response?.data?.message
        || error?.response?.data?.detail
        || error?.message;

    return String(message || fallbackMessage || 'Request failed').trim();
};

export const fetchReviewForumPosts = async ({hotelName, roomName}) => {
    try {
        const response = await Apis.get(FORUM_ENDPOINT, {
            params: {
                hotel_name: hotelName,
                room_name: roomName,
            },
        });

        const payload = unwrapPayload(response);
        const results = Array.isArray(payload?.results) ? payload.results : [];
        return results;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Unable to load review forum posts.'));
    }
};

export const createReviewForumPost = async ({hotelName, roomName, content, bookingId}) => {
    try {
        const response = await Apis.post(FORUM_ENDPOINT, {
            hotel_name: hotelName,
            room_name: roomName,
            content,
            booking_id: bookingId || '',
        });

        const payload = unwrapPayload(response);
        return payload || null;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Unable to submit review post.'));
    }
};

export const toggleReviewForumHeart = async (postId) => {
    try {
        const response = await Apis.post(`${endpoints.review_forum_toggle_heart}/${postId}/toggle-heart`);
        const payload = unwrapPayload(response);
        return payload || null;
    } catch (error) {
        throw new Error(getApiErrorMessage(error, 'Unable to update heart reaction.'));
    }
};
