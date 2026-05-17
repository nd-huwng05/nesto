export const getErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    return (
        error.response?.message ||
        error.response?.data?.message ||
        error.message ||
        fallback
    );
};
