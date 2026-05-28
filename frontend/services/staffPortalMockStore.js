/** Mock operational data for the staff portal (reception, housekeeping, F&B) */

import {QUICK_ADD_SERVICES} from '../constants/staffMedia';
import {bookingMatchesDate, getOperationalBadges, toDateKey} from '../utils/staffBookingOps';
import {calculateOvertimeCharge, parseStaffDisplayDateTime} from '../utils/staffOvertimeBilling';

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));

const normalizeRoomStatus = (status) => String(status || '').toLowerCase();

/** @deprecated Use canBookWalkInRoom — only strictly "available" rooms */
export const isRoomAvailableForBooking = (status) => normalizeRoomStatus(status) === 'available';

/** Walk-in allowed: clean/available, dirty, or still being cleaned (guest may wait in lobby) */
export const canBookWalkInRoom = (status) => {
    const key = normalizeRoomStatus(status);
    return key === 'available' || key === 'dirty' || key === 'cleaning';
};

export const isRoomBlockedForBooking = (status) => !canBookWalkInRoom(status);

/** Room grid: only occupied / maintenance blocks card tap */
export const isRoomGridBlocked = (status) => {
    const key = normalizeRoomStatus(status);
    return (
        key === 'occupied' ||
        key === 'maintenance' ||
        key === 'booked' ||
        key === 'reserved'
    );
};

export function getRoomStatusDisplayLabel(status) {
    const key = normalizeRoomStatus(status);
    if (key === 'available') return 'Clean';
    if (key === 'dirty') return 'Dirty';
    if (key === 'cleaning') return 'Cleaning';
    if (key === 'occupied' || key === 'booked' || key === 'reserved') return 'Occupied';
    if (key === 'maintenance') return 'Maintenance';
    if (key === 'unassigned') return 'Unassigned';
    return 'Unknown';
}

/** Badge colors aligned with the room grid */
export function getRoomStatusBadgeColors(labelOrStatus) {
    const raw = String(labelOrStatus || '').toLowerCase();
    const label =
        raw === 'clean' || raw === 'available'
            ? 'clean'
            : raw === 'dirty'
              ? 'dirty'
              : raw === 'cleaning'
                ? 'cleaning'
                : raw === 'maintenance'
                  ? 'maintenance'
                  : raw === 'occupied' || raw === 'booked' || raw === 'reserved'
                    ? 'occupied'
                    : raw === 'unassigned'
                      ? 'unassigned'
                      : raw;

    if (label === 'clean') return {backgroundColor: '#dcfce7', color: '#166534'};
    if (label === 'dirty') return {backgroundColor: '#fef9c3', color: '#854d0e'};
    if (label === 'cleaning') return {backgroundColor: '#ffedd5', color: '#c2410c'};
    if (label === 'maintenance' || label === 'occupied') {
        return {backgroundColor: '#fee2e2', color: '#991b1b'};
    }
    if (label === 'unassigned') return {backgroundColor: '#f1f5f9', color: '#64748b'};
    return {backgroundColor: '#f1f5f9', color: '#475569'};
}

function resolveBookingRoom(booking) {
    if (!booking?.roomNumber) return null;
    if (booking.roomId) {
        return receptionRooms.find((r) => r.id === booking.roomId) || null;
    }
    return findReceptionRoom(booking.branchId, booking.roomNumber);
}

function releasePhysicalRoom(room) {
    if (!room) return;
    room.status = 'dirty';
    room.activeBookingId = null;
}

function findReceptionRoom(branchId, roomNumber) {
    return receptionRooms.find(
        (r) => r.branchId === branchId && String(r.roomNumber) === String(roomNumber)
    );
}

function daysFromToday(offset) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return toDateKey(d);
}

function formatStaffDateTime(date) {
    const d = date instanceof Date ? date : new Date(date);
    const h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const day = d.getDate();
    const month = d.toLocaleString('en-GB', {month: 'short'});
    const year = d.getFullYear();
    return `${h}h${m}' ${day} ${month} ${year}`;
}

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
        roomNumber: null,
        roomId: null,
        roomType: 'Deluxe',
        arrivalDate: daysFromToday(0),
        departureDate: daysFromToday(1),
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
        roomId: 'rm_201',
        roomType: 'Suite',
        arrivalDate: daysFromToday(-1),
        departureDate: daysFromToday(0),
        hotelName: 'Swiss Hotel',
        hotelAddress: '211B Baker Street, London, England',
        dateRangeLabel: 'July 10 - July 12',
        bookingCode: 'BK-90217',
        checkInTime: formatStaffDateTime(new Date(Date.now() - 46 * 60 * 60 * 1000)),
        checkOutTime: formatStaffDateTime(new Date(Date.now() - 2.5 * 60 * 60 * 1000)),
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
        hourlyRate: 85_000,
        expectedCheckOutAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
        checkedInAt: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
    },
];

let bookingSeq = 3;

/** @type {Array<{id: string, branchId: string, roomNumber: string, category: 'RESTAURANT' | 'SPA' | 'TRANSPORT' | 'ROOM_SERVICE', items: string[], status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED', timestamp: string, summary: string, createdAt: string, amount?: number}>} */
let serviceOrders = [
    {
        id: 'sv_br2_01',
        branchId: 'br2',
        roomNumber: 'Room 102',
        category: 'TRANSPORT',
        items: ['Airport pickup at 10:30'],
        guestName: 'Michael Scott',
        guestPhone: '0909 123 456',
        assignedStaff: null,
        status: 'PENDING',
        timestamp: '5 mins ago',
        summary: 'Airport pickup at 10:30',
        createdAt: '5 mins ago',
        amount: 150000,
    },
    {
        id: 'sv_br2_02',
        branchId: 'br2',
        roomNumber: 'Room 205',
        category: 'SPA',
        items: ['90-minute relaxation massage'],
        guestName: 'Pam Beesly',
        guestPhone: '0910 222 333',
        assignedStaff: null,
        status: 'IN_PROGRESS',
        timestamp: '15 mins ago',
        summary: '90-minute relaxation massage',
        createdAt: '15 mins ago',
        amount: 520000,
    },
    {
        id: 'sv_br2_03',
        branchId: 'br2',
        roomNumber: 'Room 306',
        category: 'RESTAURANT',
        items: ['Table for 4', 'Window seat requested'],
        guestName: 'Jim Halpert',
        guestPhone: '0911 333 444',
        assignedStaff: null,
        status: 'PENDING',
        timestamp: '22 mins ago',
        summary: 'Table reservation · 4 guests',
        createdAt: '22 mins ago',
        amount: 195000,
    },
    {
        id: 'sv_br2_04',
        branchId: 'br2',
        roomNumber: 'Room 412',
        category: 'ROOM_SERVICE',
        items: ['2x Extra Towel', '1x Pillow set'],
        guestName: 'Dwight Schrute',
        guestPhone: '0912 444 555',
        assignedStaff: null,
        status: 'PENDING',
        timestamp: '31 mins ago',
        summary: '2x Extra Towel + 1x Pillow set',
        createdAt: '31 mins ago',
        amount: 0,
    },
];

const normalizeServiceOrderStatus = (status) => String(status || '').trim().toUpperCase();

function getRoomServiceOrders(booking) {
    return serviceOrders.filter(
        (o) =>
            o.branchId === booking.branchId &&
            o.roomNumber === booking.roomNumber &&
            o.bookingId === booking.id &&
            normalizeServiceOrderStatus(o.status) === 'COMPLETED' &&
            o.amount > 0
    );
}

function getExtraServicesTotal(booking) {
    return (booking.extraServices || []).reduce((sum, item) => sum + (item.amount || 0), 0);
}

export function buildCheckoutBill(booking, asOf = new Date()) {
    const roomSubtotal = booking.basePrice - (booking.discount || 0);
    const orders = getRoomServiceOrders(booking);
    const legacyServiceTotal = orders.reduce((sum, o) => sum + o.amount, 0);
    const extraServicesTotal = getExtraServicesTotal(booking);
    const serviceTotal = legacyServiceTotal + extraServicesTotal;

    let overtime = {hours: 0, amount: 0, hoursLabel: ''};
    if (booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT') {
        const billAt =
            booking.status === 'CHECKED_OUT' && booking.checkedOutAt
                ? new Date(booking.checkedOutAt)
                : asOf;
        overtime = calculateOvertimeCharge(booking, billAt);
    }

    const subtotal = roomSubtotal + serviceTotal + overtime.amount;
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
        overtimeHours: overtime.hours,
        overtimeSurcharge: overtime.amount,
        overtimeHoursLabel: overtime.hoursLabel,
        subtotal,
        vat,
        totalPrice,
        deposit,
        finalPayment,
    };
}

function applyCheckoutTotals(booking, asOf = new Date()) {
    const bill = buildCheckoutBill(booking, asOf);
    booking.vat = bill.vat;
    booking.totalPrice = bill.totalPrice;
    booking.deposit = bill.deposit;
    booking.finalPayment = bill.finalPayment;
    return bill;
}

/** List-row shape (legacy fields for BookingsScreen) */
function toBookingListItem(booking, filterDateKey) {
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

    const room = resolveBookingRoom(booking);
    const dateKey = filterDateKey || toDateKey(new Date());
    const isUnassigned = !booking.roomNumber;

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
        isUnassigned,
        roomStatusLabel: isUnassigned
            ? 'Unassigned'
            : room
              ? getRoomStatusDisplayLabel(room.status)
              : 'Unknown',
        operationalBadges: getOperationalBadges(booking, dateKey),
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
    {
        id: 'rm_105',
        branchId: 'br1',
        roomNumber: '105',
        type: 'Standard',
        feature: 'Garden view',
        price: 980_000,
        hourlyRate: 35_000,
        status: 'dirty',
    },
    {
        id: 'rm_108',
        branchId: 'br1',
        roomNumber: '108',
        type: 'Standard',
        feature: 'Quiet floor',
        price: 980_000,
        hourlyRate: 35_000,
        status: 'cleaning',
    },
    // Nesto Beach Front (br2) housekeeping inventory
    {
        id: 'rm_101_br2',
        branchId: 'br2',
        roomNumber: '101',
        type: 'Standard',
        feature: 'Ocean glimpse',
        price: 1_050_000,
        hourlyRate: 38_000,
        status: 'dirty',
    },
    {
        id: 'rm_102_br2',
        branchId: 'br2',
        roomNumber: '102',
        type: 'Standard',
        feature: 'Ocean glimpse',
        price: 1_050_000,
        hourlyRate: 38_000,
        status: 'dirty',
    },
    {
        id: 'rm_103_br2',
        branchId: 'br2',
        roomNumber: '103',
        type: 'Deluxe',
        feature: 'Balcony view',
        price: 1_450_000,
        hourlyRate: 48_000,
        status: 'dirty',
    },
    {
        id: 'rm_104_br2',
        branchId: 'br2',
        roomNumber: '104',
        type: 'Deluxe',
        feature: 'Balcony view',
        price: 1_450_000,
        hourlyRate: 48_000,
        status: 'dirty',
    },
    {
        id: 'rm_205_br2',
        branchId: 'br2',
        roomNumber: '205',
        type: 'Suite',
        feature: 'Sea front',
        price: 1_980_000,
        hourlyRate: 62_000,
        status: 'cleaning',
    },
    {
        id: 'rm_206_br2',
        branchId: 'br2',
        roomNumber: '206',
        type: 'Suite',
        feature: 'Sea front',
        price: 1_980_000,
        hourlyRate: 62_000,
        status: 'cleaning',
    },
    {
        id: 'rm_301_br2',
        branchId: 'br2',
        roomNumber: '301',
        type: 'Standard',
        feature: 'Ready room',
        price: 990_000,
        hourlyRate: 35_000,
        status: 'available',
    },
    {
        id: 'rm_302_br2',
        branchId: 'br2',
        roomNumber: '302',
        type: 'Family',
        feature: 'Checked-in room',
        price: 2_100_000,
        hourlyRate: 70_000,
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

        if (!canBookWalkInRoom(room.status)) {
            const blocker = normalizeRoomStatus(room.status);
            if (blocker === 'maintenance') throw new Error('Room is under maintenance.');
            if (blocker === 'occupied' || blocker === 'booked' || blocker === 'reserved') {
                throw new Error('Room is already occupied.');
            }
            throw new Error('Room cannot be booked in its current state.');
        }

        const days = Math.max(0, Number(payload.durationDays) || 0);
        const hours = Math.max(0, Number(payload.durationHours) || 0);
        const legacyAmount = Number(payload.durationAmount) || 0;
        const legacyUnit = payload.durationUnit === 'nights' ? 'nights' : 'hours';

        let totalHours = days * 24 + hours;
        if (totalHours < 1 && legacyAmount > 0) {
            totalHours = legacyUnit === 'nights' ? legacyAmount * 24 : legacyAmount;
        }
        if (totalHours < 1) throw new Error('Total duration must be at least 1 hour.');

        const basePrice = Math.round(room.hourlyRate * totalHours);
        const durationParts = [];
        if (days > 0) durationParts.push(`${days} day(s)`);
        if (hours > 0 || days === 0) durationParts.push(`${hours || (days === 0 ? totalHours : 0)} hour(s)`);
        const durationLabel = durationParts.join(' + ') || `${totalHours} hour(s)`;

        const isWalkIn = payload.walkIn !== false;
        const checkInAt = isWalkIn ? new Date() : new Date(payload.checkInAt || Date.now());
        const checkOutAt = new Date(checkInAt.getTime() + totalHours * 60 * 60 * 1000);
        const checkInTime = formatStaffDateTime(checkInAt);
        const checkOutTime = formatStaffDateTime(checkOutAt);

        const booking = {
            id: `bk_${String(bookingSeq++).padStart(3, '0')}`,
            branchId: payload.branchId || room.branchId,
            guestName: payload.guestName?.trim() || 'Walk-in Guest',
            email: payload.email?.trim() || `${Date.now()}@walkin.guest`,
            phone: payload.phone?.trim() || '',
            roomNumber: room.roomNumber,
            roomId: room.id,
            roomType: room.type,
            arrivalDate: toDateKey(checkInAt),
            departureDate: toDateKey(checkOutAt),
            expectedCheckOutAt: checkOutAt.toISOString(),
            hourlyRate: room.hourlyRate,
            hotelName: payload.hotelName || 'Swiss Hotel',
            hotelAddress: payload.hotelAddress || '211B Baker Street, London, England',
            dateRangeLabel: isWalkIn ? 'Walk-in · Today' : 'Today',
            bookingCode: `BK-${Math.floor(10000 + Math.random() * 89999)}`,
            checkInTime,
            checkOutTime,
            checkedInAt: checkInAt.toISOString(),
            duration: durationLabel,
            basePrice,
            discount: 0,
            vat: 0,
            totalPrice: 0,
            deposit: 0,
            finalPayment: 0,
            status: isWalkIn ? 'CHECKED_IN' : 'PENDING',
            isWalkIn,
            paymentMethod: null,
            extraServices: [],
        };

        bookings.unshift(booking);

        const roomKey = normalizeRoomStatus(room.status);
        if (isWalkIn) {
            booking.awaitingRoomReady = roomKey === 'dirty' || roomKey === 'cleaning';
            if (roomKey === 'available') {
                room.status = 'occupied';
            }
            room.activeBookingId = booking.id;
        } else if (roomKey === 'available') {
            room.status = 'reserved';
        }

        if (booking.status === 'CHECKED_IN') {
            applyCheckoutTotals(booking);
        }

        return booking;
    },

    async addExtraService(bookingId, serviceKey) {
        const booking = bookings.find((b) => b.id === bookingId);
        if (!booking) throw new Error('Booking not found');
        if (booking.status !== 'PENDING' && booking.status !== 'CHECKED_IN') {
            throw new Error('Services can only be added for a pending or checked-in booking');
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

    async listBookings(branchId, options = {}) {
        await delay();
        const dateKey = options.date || toDateKey(new Date());
        return filterByBranch(bookings, branchId)
            .filter((b) => bookingMatchesDate(b, dateKey))
            .map((b) => toBookingListItem(b, dateKey));
    },

    async getRoomStatusForBooking(branchId, roomNumber) {
        await delay(80);
        const room = findReceptionRoom(branchId, roomNumber);
        if (!room) return {status: 'unknown', label: 'Unknown'};
        return {status: room.status, label: getRoomStatusDisplayLabel(room.status)};
    },

    /**
     * Assignable rooms only: strictly AVAILABLE (clean) + matching category.
     * Dirty, cleaning, occupied, and maintenance rooms are never returned.
     */
    async listAvailableRoomsForSwitch(branchId, roomType) {
        await delay(120);
        return filterByBranch(receptionRooms, branchId).filter((r) => {
            if (normalizeRoomStatus(r.status) !== 'available') return false;
            if (roomType && r.type !== roomType) return false;
            return true;
        });
    },

    async assignRoomAndCheckIn(bookingId, newRoomId) {
        await delay(250);
        const booking = bookings.find((b) => b.id === bookingId);
        if (!booking) throw new Error('Booking not found');
        if (booking.status !== 'PENDING') {
            throw new Error('Only pending reservations can be assigned at check-in');
        }
        if (booking.roomNumber) {
            throw new Error('Room is already assigned. Use room change instead.');
        }
        if (!booking.roomType) throw new Error('Booking is missing a room type');

        const newRoom = receptionRooms.find((r) => r.id === newRoomId);
        if (!newRoom) throw new Error('Room not found');
        if (normalizeRoomStatus(newRoom.status) !== 'available') {
            throw new Error('Selected room is not clean and available');
        }
        if (newRoom.type !== booking.roomType) {
            throw new Error('Room must match the booked category');
        }

        booking.roomNumber = newRoom.roomNumber;
        booking.roomId = newRoom.id;
        booking.hourlyRate = newRoom.hourlyRate;
        booking.status = 'CHECKED_IN';
        booking.paymentMethod = null;
        booking.assignedAtCheckIn = true;
        booking.checkedInAt = new Date().toISOString();
        if (!booking.expectedCheckOutAt && booking.checkOutTime) {
            const expected = parseStaffDisplayDateTime(booking.checkOutTime);
            if (expected) booking.expectedCheckOutAt = expected.toISOString();
        }

        newRoom.status = 'occupied';
        newRoom.activeBookingId = booking.id;

        applyCheckoutTotals(booking);
        return this.getBookingDetails(bookingId);
    },

    async switchBookingRoom(bookingId, newRoomId) {
        await delay(200);
        const booking = bookings.find((b) => b.id === bookingId);
        if (!booking) throw new Error('Booking not found');
        if (booking.status !== 'PENDING' && booking.status !== 'CHECKED_IN') {
            throw new Error('Room can only be changed while pending or checked in');
        }

        const newRoom = receptionRooms.find((r) => r.id === newRoomId);
        if (!newRoom) throw new Error('Room not found');
        if (normalizeRoomStatus(newRoom.status) !== 'available') {
            throw new Error('Selected room is not clean and available');
        }
        if (booking.roomType && newRoom.type !== booking.roomType) {
            throw new Error('Replacement room must be the same category');
        }

        const oldRoom = resolveBookingRoom(booking);
        const previousRoomNumber = booking.roomNumber;

        if (previousRoomNumber && !booking.originalRoomNumber) {
            booking.originalRoomNumber = previousRoomNumber;
        }

        if (oldRoom && oldRoom.id !== newRoom.id) {
            releasePhysicalRoom(oldRoom);
        }

        booking.roomNumber = newRoom.roomNumber;
        booking.roomId = newRoom.id;
        booking.roomType = newRoom.type;
        booking.roomChangedTo = newRoom.roomNumber;
        booking.roomChangeNote = `Room changed to ${newRoom.roomNumber}`;
        booking.roomChangedAt = new Date().toISOString();

        newRoom.status = 'occupied';
        newRoom.activeBookingId = booking.id;

        if (booking.status === 'CHECKED_IN') {
            applyCheckoutTotals(booking);
        }

        return this.getBookingDetails(bookingId);
    },

    async getBooking(bookingId) {
        await delay();
        const booking = bookings.find((b) => b.id === bookingId);
        return booking ? toBookingListItem(booking, toDateKey(new Date())) : null;
    },

    async getBookingDetails(bookingId) {
        const booking = bookings.find((b) => b.id === bookingId);
        if (!booking) return null;

        const subtotal = booking.basePrice - (booking.discount || 0);
        const room = resolveBookingRoom(booking);
        const dateKey = toDateKey(new Date());
        const isUnassigned = !booking.roomNumber;
        const payload = {
            ...booking,
            subtotal,
            isUnassigned,
            roomStatusLabel: isUnassigned
                ? 'Unassigned'
                : room
                  ? getRoomStatusDisplayLabel(room.status)
                  : 'Unknown',
            operationalBadges: getOperationalBadges(booking, dateKey),
        };

        if (booking.status === 'CHECKED_IN' || booking.status === 'CHECKED_OUT') {
            const checkoutBill = applyCheckoutTotals(booking, new Date());
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
        if (!booking.roomNumber) {
            throw new Error('Assign a physical room before checking in');
        }

        booking.status = 'CHECKED_IN';
        booking.paymentMethod = null;

        const room = resolveBookingRoom(booking);
        if (room) {
            room.status = 'occupied';
            room.activeBookingId = booking.id;
            if (!booking.hourlyRate) booking.hourlyRate = room.hourlyRate;
        }

        applyCheckoutTotals(booking, new Date());
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

        booking.checkedOutAt = new Date().toISOString();
        const checkoutBill = applyCheckoutTotals(booking, new Date(booking.checkedOutAt));
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
        // Physical rooms only: return the actual room inventory for the active branch.
        return filterByBranch(receptionRooms, branchId)
            .filter((r) => {
                const status = normalizeRoomStatus(r.status);
                return status === 'dirty' || status === 'cleaning';
            })
            .map((r) => ({
                id: r.id,
                branchId: r.branchId,
                roomNumber: r.roomNumber,
                status: normalizeRoomStatus(r.status),
            }))
            .sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));
    },

    async markRoomClean(roomId) {
        await delay(300);
        const room = receptionRooms.find((r) => r.id === roomId);
        if (room) {
            room.status = 'available';
            return {success: true};
        }

        const hkRoom = housekeepingRooms.find((r) => r.id === roomId);
        if (hkRoom) {
            housekeepingRooms = housekeepingRooms.filter((r) => r.id !== roomId);
            const physical = receptionRooms.find(
                (r) => r.branchId === hkRoom.branchId && String(r.roomNumber) === String(hkRoom.roomNumber)
            );
            if (physical) physical.status = 'available';
        }

        return {success: true};
    },

    async listServiceOrders(branchId) {
        await delay();
        return filterByBranch(serviceOrders, branchId).filter(
            (o) => normalizeServiceOrderStatus(o.status) !== 'COMPLETED'
        );
    },

    async acceptServiceOrder(orderId) {
        await delay(300);
        // allow optional staffName to be passed so the mock store can record who accepted the order
        const args = Array.from(arguments);
        const staffName = args.length > 1 ? args[1] : null;
        const order = serviceOrders.find((o) => o.id === orderId);
        if (order && normalizeServiceOrderStatus(order.status) === 'PENDING') {
            order.status = 'IN_PROGRESS';
            if (staffName) order.assignedStaff = String(staffName || '').trim() || null;
        }
        return order;
    },

    async completeServiceOrder(orderId) {
        await delay(300);
        const order = serviceOrders.find((o) => o.id === orderId);
        if (order && normalizeServiceOrderStatus(order.status) === 'IN_PROGRESS') {
            order.status = 'COMPLETED';
        }
        return order;
    },
};
