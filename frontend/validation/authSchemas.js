import * as yup from 'yup';

export const emailSchema = yup.object({
    email: yup
        .string()
        .trim()
        .email('Please enter a valid email address')
        .required('Email is required'),
});

export const phoneSchema = yup.object({
    phone: yup
        .string()
        .trim()
        .matches(/^(0[3|5|7|8|9])([0-9]{8})$/, 'Please enter a valid Vietnamese phone number')
        .required('Phone number is required'),
});

/** Login: only ensure the field is not empty. Format checks happen via API after submit. */
export const loginPasswordSchema = yup.object({
    password: yup.string().required('Password is required'),
});

/** Register: strict password strength rules. */
export const passwordSchema = yup.object({
    password: yup
        .string()
        .min(8, 'Password must be at least 8 characters')
        .matches(/[A-Z]/, 'Must include an uppercase letter')
        .matches(/[0-9]/, 'Must include a number')
        .matches(/[@$!%*?&#]/, 'Must include a special character (@$!%*?&#)')
        .required('Password is required'),
});

export const confirmPasswordSchema = (passwordRef = 'password') =>
    yup.object({
        confirmPassword: yup
            .string()
            .oneOf([yup.ref(passwordRef)], 'Passwords do not match')
            .required('Please confirm your password'),
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
