import * as yup from 'yup';

/** Booking date validation schema */
export const bookingDateSchema = yup.object({
    checkIn: yup
        .date()
        .typeError('Check-in date is required')
        .required('Check-in date is required')
        .min(new Date(), 'Check-in date cannot be in the past'),
    checkOut: yup
        .date()
        .typeError('Check-out date is required')
        .required('Check-out date is required')
        .min(yup.ref('checkIn'), 'Check-out date must be after check-in date'),
});

/** Guest information validation schema */
export const guestInfoSchema = yup.object({
    name: yup
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must not exceed 100 characters')
        .required('Guest name is required'),
    email: yup
        .string()
        .trim()
        .email('Please enter a valid email address')
        .required('Email is required'),
    phone: yup
        .string()
        .trim()
        .matches(/^(0[3|5|7|8|9])([0-9]{8})$/, 'Please enter a valid Vietnamese phone number')
        .required('Phone number is required'),
});

/** Special requests validation schema */
export const specialRequestSchema = yup.object({
    specialRequests: yup
        .string()
        .trim()
        .max(500, 'Special requests must not exceed 500 characters'),
});

/** Room selection validation schema */
export const roomSelectionSchema = yup.object({
    roomId: yup
        .string()
        .required('Please select a room'),
    roomType: yup
        .string()
        .required('Room type is required'),
});

/** Payment information validation schema */
export const paymentSchema = yup.object({
    paymentMethod: yup
        .string()
        .oneOf(['momo', 'zalo', 'card', 'bank_transfer'], 'Invalid payment method')
        .required('Payment method is required'),
    agreeToTerms: yup
        .boolean()
        .oneOf([true], 'You must agree to the terms and conditions'),
});

/** Complete booking form validation schema */
export const completeBookingSchema = yup.object().shape({
    ...bookingDateSchema.fields,
    ...guestInfoSchema.fields,
    ...roomSelectionSchema.fields,
    ...specialRequestSchema.fields,
    ...paymentSchema.fields,
});
