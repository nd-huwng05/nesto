import * as yup from 'yup';

export const emailSchema = yup.object({
    email: yup
        .string()
        .trim()
        .email('Please enter a valid email address')
        .required('Email is required'),
});

export const loginPasswordSchema = yup.object({
    password: yup.string().required('Password is required'),
});

export const passwordSchema = yup.object({
    password: yup
        .string()
        .min(8, 'Password must be at least 8 characters')
        .matches(/[A-Z]/, 'Must include an uppercase letter')
        .matches(/[0-9]/, 'Must include a number')
        .matches(/[@$!%*?&#]/, 'Must include a special character (@$!%*?&#)')
        .required('Password is required'),
});

export const buildConfirmPasswordSchema = (originalPassword) =>
    yup.object({
        confirmPassword: yup
            .string()
            .required('Please confirm your password')
            .oneOf([originalPassword], 'Passwords do not match'),
    });

export const registerEmailSchema = yup.object({
    email: yup
        .string()
        .trim()
        .email('Please enter a valid email address')
        .required('Email is required'),
});

export const forgotPasswordSchema = yup.object({
    email: yup
        .string()
        .trim()
        .email('Please enter a valid email address')
        .required('Email is required'),
});

export const nameSchema = yup.object({
    name: yup
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .required('Name is required'),
});

export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REGEX_PHONE = /^(0[3|5|7|8|9])([0-9]{8})$/;

export const validateEmail = (val) => {
    if (!val || typeof val !== 'string') return false;
    return REGEX_EMAIL.test(val.trim());
};

export const validatePhone = (val) => {
    if (!val || typeof val !== 'string') return false;
    return REGEX_PHONE.test(val.trim().replace(/[\s\-()]+/g, ''));
};

export const validatePassword = (val) => {
    if (!val || typeof val !== 'string') return false;
    if (val.length < 8) return false;
    if (!/[A-Z]/.test(val)) return false;
    if (!/[0-9]/.test(val)) return false;
    if (!/[@$!%*?&#]/.test(val)) return false;
    return true;
};

export const validateName = (val) => {
    if (!val || typeof val !== 'string') return false;
    return val.trim().length >= 2;
};
