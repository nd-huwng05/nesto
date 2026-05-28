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

export const fetchMyBookings = async () => {
  try {
    const res = await api.get(endpoints['customer-bookings']);
    return ok(res, pickList(res.data));
  } catch (err) {
    return fail(err, 'Unable to load bookings.');
  }
};

export const createMyBooking = async ({
  branchId,
  hotelName,
  hotelAddress,
  roomType,
  guestName,
  email,
  phone,
  expectedCheckOutAt,
} = {}) => {
  try {
    const payload = {
      branch: branchId,
      hotel_name: String(hotelName || '').trim(),
      hotel_address: String(hotelAddress || '').trim(),
      room_type: String(roomType || '').trim(),
      guest_name: String(guestName || '').trim(),
      email: String(email || '').trim(),
      phone: String(phone || '').trim(),
      expected_check_out_at: expectedCheckOutAt || null,
    };
    const res = await api.post(endpoints['customer-bookings'], payload);
    return ok(res, res.data);
  } catch (err) {
    return fail(err, 'Unable to create booking.');
  }
};

