import { useState } from 'react';
import * as authSchemas from '../../validation/authSchemas';

export const useValidation = (initialValue = '', validator) => {
    const [value, setValue] = useState(initialValue);
    const isValid =
        typeof validator === 'function'
            ? validator(value)
            : String(validator || '').length > 0;
    return { value, setValue, isValid };
};

export const REGEX_EMAIL = authSchemas.REGEX_EMAIL;
export const REGEX_PHONE = authSchemas.REGEX_PHONE;
export const validateEmail = authSchemas.validateEmail;
export const validatePhone = authSchemas.validatePhone;
export const validatePassword = authSchemas.validatePassword;
export const validateName = authSchemas.validateName;
