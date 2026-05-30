/**
 * Payment provider logos only (static brand assets).
 * Room/hotel/user images must come from API (Cloudinary / catalog).
 */
export const PAYMENT_LOGOS = {
    MOMO: 'https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png',
    ZALOPAY: 'https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-ZaloPay-Square.png',
};

/** @deprecated use PAYMENT_LOGOS */
export const STAFF_MEDIA = {
    MOMO_LOGO: PAYMENT_LOGOS.MOMO,
    ZALOPAY_LOGO: PAYMENT_LOGOS.ZALOPAY,
};
