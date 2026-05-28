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

export const fetchMyBookingDetail = async (bookingId) => {
  try {
    const res = await api.get(endpoints['customer-booking-detail'](bookingId));
    return ok(res, res.data);
  } catch (err) {
    return fail(err, 'Unable to load booking details.');
  }
};

export const customerCheckInBooking = async (bookingId) => {
  try {
    const res = await api.post(endpoints['customer-booking-check-in'](bookingId));
    return ok(res, res.data);
  } catch (err) {
    return fail(err, 'Unable to check in right now.');
  }
};

export const addServicesToBooking = async (bookingId, serviceIds = []) => {
  try {
    const res = await api.post(endpoints['customer-booking-add-service'](bookingId), {
      service_ids: Array.isArray(serviceIds) ? serviceIds.filter(Boolean) : [],
    });
    return ok(res, res.data);
  } catch (err) {
    return fail(err, 'Unable to add services to this booking.');
  }
};

export const createMyBooking = async ({
  branchId,
  hotelName,
  hotelAddress,
  roomType,
  roomTypeId,
  guestName,
  email,
  phone,
  checkInAt,
  expectedCheckOutAt,
  serviceIds = [],
} = {}) => {
  try {
    const payload = {
      branch: branchId,
      hotel_name: String(hotelName || '').trim(),
      hotel_address: String(hotelAddress || '').trim(),
      room_type: String(roomType || '').trim(),
      room_type_id: roomTypeId || null,
      guest_name: String(guestName || '').trim(),
      email: String(email || '').trim(),
      phone: String(phone || '').trim(),
      check_in_at: checkInAt || null,
      expected_check_out_at: expectedCheckOutAt || null,
      service_ids: Array.isArray(serviceIds) ? serviceIds.filter(Boolean) : [],
    };
    const res = await api.post(endpoints['customer-bookings'], payload);
    return ok(res, res.data);
  } catch (err) {
    return fail(err, 'Unable to create booking.');
  }
};

