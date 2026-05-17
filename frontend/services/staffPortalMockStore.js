/** Mock operational data for the staff portal (reception, housekeeping, F&B) */

import {QUICK_ADD_SERVICES} from '../constants/staffMedia';

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

/**
 * @typedef {'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT'} BookingStatus
 * @typedef {'MOMO' | 'ZALOPAY' | 'CASH' | null} PaymentMethod
 */

let bookings = [
    {
        id: 'bk_001',
        branchId: 'br1',
        guestName: 'Nguyễn Ngọc Lan',
        email: 'lan.guest@email.com',
        phone: '0909111222',
        roomNumber: '121',
        hotelName: 'Swiss Hotel',
        hotelAddress: '211B Baker Street, London, England',
        dateRangeLabel: 'July 08 - July 15',
        bookingCode: 'BK-88421',
        checkInTime: "9h00' 23 Mar 2026",
        checkOutTime: "12h00' 24 Mar 2026",
        duration: '24h00',
        basePrice: 1_999_000,
        discount: 0,
        vat: 0,
        totalPrice: 0,
        deposit: 0,
        finalPayment: 0,
        status: 'PENDING',
        paymentMethod: null,
        extraServices: [],
    },
    {
        id: 'bk_002',
        branchId: 'br1',
        guestName: 'Trần Minh Khôi',
        email: 'khoi.tran@email.com',
        phone: '0918222333',
        roomNumber: '201',
        hotelName: 'Swiss Hotel',
        hotelAddress: '211B Baker Street, London, England',
        dateRangeLabel: 'July 10 - July 12',
        bookingCode: 'BK-90217',
        checkInTime: "15h00' 10 Jul 2026",
        checkOutTime: "11h00' 12 Jul 2026",
        duration: '44h00',
        basePrice: 2_800_000,
        discount: 200_000,
        vat: 0,
        totalPrice: 0,
        deposit: 0,
        finalPayment: 0,
        status: 'CHECKED_IN',
        paymentMethod: null,
        extraServices: [],
    },
];

let bookingSeq = 3;

/** @type {Array<{id: string, branchId: string, roomNumber: string, bookingId?: string, summary: string, amount: number, status: string, createdAt: string}>} */
let serviceOrders = [
    {
        id: 'so_br1_1',
        branchId: 'br1',
        roomNumber: '201',
        bookingId: 'bk_002',
        summary: '2× Iced Coffee',
        amount: 120_000,
        status: 'done',
        createdAt: 'Today, 08:30',
    },
    {
        id: 'so_br1_2',
        branchId: 'br1',
        roomNumber: '201',
        bookingId: 'bk_002',
        summary: 'Club Sandwich + Orange Juice',
        amount: 285_000,
        status: 'done',
        createdAt: 'Today, 12:15',
    },
    {
        id: 'so_1',
        branchId: 'br2',
        roomNumber: '102',
        summary: '2× Iced Coffee',
        amount: 90_000,
        status: 'pending',
        createdAt: '10 min ago',
    },
    {
        id: 'so_2',
        branchId: 'br2',
        roomNumber: '305',
        summary: 'Extra Towels',
        amount: 0,
        status: 'pending',
        createdAt: '25 min ago',
    },
    {
        id: 'so_3',
        branchId: 'br2',
        roomNumber: '118',
        summary: 'Club Sandwich + Orange Juice',
        amount: 195_000,
        status: 'in_progress',
        createdAt: '1 hr ago',
    },
];

function getRoomServiceOrders(booking) {
    return serviceOrders.filter(
        (o) =>
            o.branchId === booking.branchId &&
            o.roomNumber === booking.roomNumber &&
            o.bookingId === booking.id &&
            o.status === 'done' &&
            o.amount > 0
    );
}

function getExtraServicesTotal(booking) {
    return (booking.extraServices || []).reduce((sum, item) => sum + (item.amount || 0), 0);
}

export function buildCheckoutBill(booking) {
    const roomSubtotal = booking.basePrice - (booking.discount || 0);
    const orders = getRoomServiceOrders(booking);
    const legacyServiceTotal = orders.reduce((sum, o) => sum + o.amount, 0);
    const extraServicesTotal = getExtraServicesTotal(booking);
    const serviceTotal = legacyServiceTotal + extraServicesTotal;
    const subtotal = roomSubtotal + serviceTotal;
    const vat = Math.round(subtotal * 0.1);
    const totalPrice = subtotal + vat;
    const deposit = Math.round(totalPrice * 0.2);
    const finalPayment = Math.max(0, totalPrice - deposit);

    return {
        serviceOrders: orders,
        extraServices: booking.extraServices || [],
        roomSubtotal,
        extraServicesTotal,
        legacyServiceTotal,
        serviceTotal,
        subtotal,
        vat,
        totalPrice,
        deposit,
        finalPayment,
    };
}

function applyCheckoutTotals(booking) {
    const bill = buildCheckoutBill(booking);
    booking.vat = bill.vat;
    booking.totalPrice = bill.totalPrice;
    booking.deposit = bill.deposit;
    booking.finalPayment = bill.finalPayment;
    return bill;
}

/** List-row shape (legacy fields for BookingsScreen) */
function toBookingListItem(booking) {
    const bill =
        booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT'
            ? buildCheckoutBill(booking)
            : null;
    const listStatus =
        booking.status === 'CHECKED_OUT'
            ? 'checked_out'
            : booking.status === 'CHECKED_IN'
              ? 'checked_in'
              : 'pending';

    return {
        ...booking,
        subtotal: booking.basePrice - (booking.discount || 0),
        checkIn: booking.checkInTime,
        checkOut: booking.checkOutTime,
        total: bill?.totalPrice ?? booking.basePrice,
        status: listStatus,
        statusLabel:
            booking.status === 'CHECKED_OUT'
                ? 'Checked out'
                : booking.status === 'CHECKED_IN'
                  ? 'In house'
                  : 'Pending',
    };
}

/** @type {Array<{id: string, branchId: string, roomNumber: string, type: string, feature: string, price: number, hourlyRate: number, status: string}>} */
let receptionRooms = [
    {
        id: 'rm_121',
        branchId: 'br1',
        roomNumber: '121',
        type: 'Family',
        feature: 'View beach',
        price: 1_999_000,
        hourlyRate: 50_000,
        status: 'available',
    },
    {
        id: 'rm_122',
        branchId: 'br1',
        roomNumber: '122',
        type: 'Deluxe',
        feature: 'City view',
        price: 1_450_000,
        hourlyRate: 45_000,
        status: 'available',
    },
    {
        id: 'rm_201',
        branchId: 'br1',
        roomNumber: '201',
        type: 'Suite',
        feature: 'Ocean view',
        price: 2_800_000,
        hourlyRate: 85_000,
        status: 'occupied',
    },
];

/** @type {Array<{id: string, branchId: string, roomNumber: string, status: 'dirty' | 'cleaning'}>} */
let housekeepingRooms = [
    {id: 'hk_101', branchId: 'br1', roomNumber: '101', status: 'dirty'},
    {id: 'hk_102', branchId: 'br1', roomNumber: '102', status: 'cleaning'},
    {id: 'hk_205', branchId: 'br1', roomNumber: '205', status: 'dirty'},
    {id: 'hk_306', branchId: 'br1', roomNumber: '306', status: 'cleaning'},
];

const filterByBranch = (rows, branchId) => rows.filter((r) => r.branchId === branchId);

const normalizePaymentMethod = (method) => {
    const key = String(method || '').toLowerCase();
    if (key === 'momo') return 'MOMO';
    if (key === 'zalopay') return 'ZALOPAY';
    if (key === 'cash') return 'CASH';
    return null;
};

export const staffPortalMockStore = {
    async listReceptionRooms(branchId) {
        await delay();
        return filterByBranch(receptionRooms, branchId);
    },

    async getReceptionRoom(roomId) {
        await delay(100);
        return receptionRooms.find((r) => r.id === roomId) || null;
    },

    async createBooking(payload) {
        await delay(400);
        const room = receptionRooms.find((r) => r.id === payload.roomId);
        if (!room) throw new Error('Room not found');

        const unit = payload.durationUnit === 'nights' ? 'nights' : 'hours';
        const amount = Number(payload.durationAmount) || 1;
        const basePrice =
            unit === 'nights'
                ? Math.round(room.price * amount)
                : Math.round(room.hourlyRate * amount);
        const durationLabel = unit === 'nights' ? `${amount} night(s)` : `${amount}h00`;

        const booking = {
            id: `bk_${String(bookingSeq++).padStart(3, '0')}`,
            branchId: payload.branchId || room.branchId,
            guestName: payload.guestName?.trim() || 'Walk-in Guest',
            email: payload.email?.trim() || `${Date.now()}@walkin.guest`,
            phone: payload.phone?.trim() || '',
            roomNumber: room.roomNumber,
            hotelName: payload.hotelName || 'Swiss Hotel',
            hotelAddress: payload.hotelAddress || '211B Baker Street, London, England',
            dateRangeLabel: 'Today',
            bookingCode: `BK-${Math.floor(10000 + Math.random() * 89999)}`,
            checkInTime: "Now",
            checkOutTime: `After ${durationLabel}`,
            duration: durationLabel,
            basePrice,
            discount: 0,
            vat: 0,
            totalPrice: 0,
            deposit: 0,
            finalPayment: 0,
            status: 'PENDING',
            paymentMethod: null,
            extraServices: [],
        };

        bookings.unshift(booking);
        if (room.status === 'available') {
            room.status = 'reserved';
        }
        return booking;
    },

    async addExtraService(bookingId, serviceKey) {
        const booking = bookings.find((b) => b.id === bookingId);
        if (!booking) throw new Error('Booking not found');
        if (booking.status !== 'CHECKED_IN') {
            throw new Error('Services can only be added while guest is checked in');
        }

        const catalog = QUICK_ADD_SERVICES.find((s) => s.id === serviceKey);
        if (!catalog) throw new Error('Unknown service');

        if (!booking.extraServices) booking.extraServices = [];

        const entry = {
            id: `ex_${Date.now()}`,
            serviceId: catalog.id,
            summary: catalog.summary,
            amount: catalog.price,
            addedAt: new Date().toISOString(),
        };
        booking.extraServices.push(entry);

        const checkoutBill = applyCheckoutTotals(booking);
        const subtotal = booking.basePrice - booking.discount;
        return {...booking, subtotal, checkoutBill};
    },

    async listBookings(branchId) {
        await delay();
        return filterByBranch(bookings, branchId).map(toBookingListItem);
    },

    async getBooking(bookingId) {
        await delay();
        const booking = bookings.find((b) => b.id === bookingId);
        return booking ? toBookingListItem(booking) : null;
    },

    async getBookingDetails(bookingId) {
        const booking = bookings.find((b) => b.id === bookingId);
        if (!booking) return null;

        const subtotal = booking.basePrice - (booking.discount || 0);
        const payload = {...booking, subtotal};

        if (booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT') {
            const checkoutBill = applyCheckoutTotals(booking);
            payload.checkoutBill = checkoutBill;
        }

        return payload;
    },

    async confirmCheckIn(bookingId) {
        const booking = bookings.find((b) => b.id === bookingId);
        if (!booking) throw new Error('Booking not found');
        if (booking.status !== 'PENDING') {
            throw new Error('Only pending reservations can be checked in');
        }
        booking.status = 'CHECKED_IN';
        booking.paymentMethod = null;
        applyCheckoutTotals(booking);
        const subtotal = booking.basePrice - booking.discount;
        return {...booking, subtotal, checkoutBill: buildCheckoutBill(booking)};
    },

    async processPaymentAndCheckOut(bookingId, paymentMethod) {
        const booking = bookings.find((b) => b.id === bookingId);
        if (!booking) throw new Error('Booking not found');
        if (booking.status !== 'CHECKED_IN') {
            throw new Error('Guest must be checked in before checkout');
        }
        const normalized = normalizePaymentMethod(paymentMethod);
        if (!normalized) throw new Error('Invalid payment method');

        const checkoutBill = applyCheckoutTotals(booking);
        booking.status = 'CHECKED_OUT';
        booking.paymentMethod = normalized;

        const subtotal = booking.basePrice - booking.discount;
        return {...booking, subtotal, checkoutBill};
    },

    /** @deprecated */
    async processPaymentAndCheckIn(bookingId, paymentMethod) {
        return this.processPaymentAndCheckOut(bookingId, paymentMethod);
    },

    async listHousekeepingRooms(branchId) {
        await delay();
        return filterByBranch(housekeepingRooms, branchId).filter(
            (r) => r.status === 'dirty' || r.status === 'cleaning'
        );
    },

    async markRoomClean(roomId) {
        await delay(300);
        housekeepingRooms = housekeepingRooms.filter((r) => r.id !== roomId);
        return {success: true};
    },

    async listServiceOrders(branchId) {
        await delay();
        return filterByBranch(serviceOrders, branchId).filter((o) => o.status !== 'done');
    },

    async acceptServiceOrder(orderId) {
        await delay(300);
        const order = serviceOrders.find((o) => o.id === orderId);
        if (order && order.status === 'pending') {
            order.status = 'in_progress';
        }
        return order;
    },

    async completeServiceOrder(orderId) {
        await delay(300);
        const order = serviceOrders.find((o) => o.id === orderId);
        if (order) {
            order.status = 'done';
        }
        return order;
    },
};
