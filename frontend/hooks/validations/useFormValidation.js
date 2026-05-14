import {useState} from "react";

export const useValidation = (initialValue = '', validator) => {
    const [value, setValue] = useState(initialValue);

   const isValid = (typeof validator === 'function')
        ? validator(value)
        : validator.test(value);

    return {value, setValue, isValid};
};

export const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REGEX_PHONE = /^(0[3|5|7|8|9])([0-9]{8})$/;
export const VALIDATE_PASSWORD = (val) => val.length >= 8;