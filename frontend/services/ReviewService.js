import api, {endpoints} from '../configuration/Apis';
import {extractApiErrorMessage} from '../utils/apiError';

const ok = (response, dataOverride = undefined) => ({
  status: 'success',
  data: dataOverride === undefined ? response?.data : dataOverride,
});

const fail = (err, fallback) => ({
  status: 'error',
  message: extractApiErrorMessage(err, fallback),
  data: err?.response?.data || null,
});

const pickList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

export const fetchReviews = async ({hotelName, roomName, branchId, mine} = {}) => {
  try {
    const params = {};
    if (hotelName) params.hotel_name = String(hotelName).trim();
    if (roomName) params.room_name = String(roomName).trim();
    if (branchId) params.branch_id = String(branchId).trim();
    if (mine) params.mine = '1';
    const res = await api.get(endpoints['reviews'], {params});
    return ok(res, pickList(res.data));
  } catch (err) {
    return fail(err, 'Unable to load reviews.');
  }
};

export const createReview = async ({bookingId, hotelName, roomName, content, rating, imageUrl} = {}) => {
  try {
    const payload = {
      booking_id: String(bookingId || '').trim().replace(/^#/, ''),
      hotel_name: String(hotelName || '').trim(),
      room_name: String(roomName || '').trim(),
      content: String(content || '').trim(),
      rating: Number(rating || 0),
      image_url: String(imageUrl || '').trim(),
    };
    const res = await api.post(endpoints['reviews'], payload);
    return ok(res, res.data);
  } catch (err) {
    return fail(err, 'Unable to create review.');
  }
};

export const toggleReviewHeart = async (reviewId) => {
  try {
    const res = await api.post(endpoints['review-toggle-heart'](reviewId));
    return ok(res, res.data);
  } catch (err) {
    return fail(err, 'Unable to react to review.');
  }
};

