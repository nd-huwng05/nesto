# Nesto API Specification (inferred from frontend services)

This document is an API specification inferred from the frontend `services/` code and mock stores. It is intended for building a Django REST Framework backend compatible with the frontend.

Important global constraint (must be followed by all endpoints):
Every API response MUST follow this exact JSON envelope (no nested `response` objects):

{
  "status": "success" | "error",
  "message": "Human readable message",
  "data": { ... } // Optional, contains payload
}

All endpoints follow Django convention and end with a trailing slash. Base path: `/api/v1/`.

---

Table of contents
- Auth
- Booking (guest)
- Reception (staff)
- Branch & Business
- Staff
- Report
- Payment
- Customer
- Favorites
- Hotel

For each endpoint: Module & Frontend Function, Method & Endpoint (Django-style), Request Payload example, Response example (conforms to envelope above).

---

AUTH
====

1) Login
- Frontend function: `authApi(identifier, password)` (in `AuthService.js`)
- Method & Endpoint:
  - POST /api/v1/auth/login/
- Request payload (JSON):

{
  "username": "user identifier (email or phone)",
  "password": "string"
}

- Response (success):

{
  "status": "success",
  "message": "Login successfully",
  "data": {
    "access_token": "jwt_or_token_string",
    "user": {
      "id": "st1",
      "email": "lan.nguyen@swiss.vn",
      "phone": "0901234567",
      "name": "Lan Nguyễn",
      "role": "RECEPTIONIST", // or SUPER_ADMIN, etc.
      "branchId": "br1" | null,
      "businessId": "b1" | null,
      // staff-specific optional fields
      "jobRole": "Receptionist",
      "department": "TRANSPORT",
      "managerId": "manager_01"
    }
  }
}

- Response (error):

{
  "status": "error",
  "message": "Email or password is incorrect",
  "data": null
}

Notes: Frontend expects `access_token` and `user` keys in `data` when using mock stores.

2) Send OTP
- Frontend function: `sendOTP(email)`
- Method & Endpoint:
  - POST /api/v1/auth/otp/send/
- Request payload:

{
  "email": "user@example.com"
}

- Response (success):

{
  "status": "success",
  "message": "Send OTP successfully",
  "data": null
}

3) Verify OTP
- Frontend function: `checkOTP(otp)`
- Method & Endpoint:
  - POST /api/v1/auth/otp/verify/
- Request payload:

{
  "otp": "000000"
}

- Response (success - mock accepts '000000'):

{
  "status": "success",
  "message": "Check OTP successfully",
  "data": null
}

- Response (error):

{
  "status": "error",
  "message": "OTP Incorrect",
  "data": null
}

4) Check email availability
- Frontend function: `checkEmailExist(email)`
- Method & Endpoint:
  - POST /api/v1/auth/check-email/
- Request payload:

{
  "email": "user@example.com"
}

- Response (available):

{
  "status": "success",
  "message": "Email is available",
  "data": null
}

- Response (already registered):

{
  "status": "error",
  "message": "This email is already registered",
  "data": null
}

5) Register (email/password)
- Frontend function: `registerEmail(email, password, role)`
- Method & Endpoint:
  - POST /api/v1/auth/register/
- Request payload:

{
  "email": "user@example.com",
  "password": "PlainTextPassword",
  "role": "SUPER_ADMIN" // or other role
}

- Response (success - mock):

{
  "status": "success",
  "message": "Register successfully",
  "data": {
    "access_token": "mock_token_...",
    "user": {
      "id": "manager_new",
      "email": "user@example.com",
      "name": "user",
      "role": "SUPER_ADMIN",
      "branchId": null,
      "businessId": null
    }
  }
}

6) Request password reset
- Frontend function: `requestPasswordReset(email)`
- Method & Endpoint:
  - POST /api/v1/auth/forgot-password/
- Request payload:

{
  "email": "user@example.com"
}

- Response (success):

{
  "status": "success",
  "message": "If an account exists, a reset link has been sent to your email.",
  "data": null
}

---

BOOKING (Guest)
================

A. Create booking (guest)
- Frontend function: `BookingService.createBooking(bookingPayload)`
- Method & Endpoint suggestion:
  - POST /api/v1/bookings/

- Request payload (example inferred from `staffPortalMockStore.createBooking` / `BookingService`):

{
  "branchId": "br1",
  "roomId": "rm_121",          // optional if user selected a specific physical room
  "roomType": "Deluxe",       // optional
  "durationDays": 0,            // integer
  "durationHours": 24,          // integer
  "durationAmount": 1,         // legacy alternative
  "durationUnit": "nights",   // "nights" or "hours"
  "walkIn": false,              // boolean (true means immediate check-in)
  "checkInAt": "2026-06-01T14:00:00.000Z", // optional for scheduled
  "guestName": "Nguyễn A",
  "email": "guest@example.com",
  "phone": "0909123456",
  "hotelName": "Swiss Hotel",
  "hotelAddress": "211B Baker Street, London"
}

- Response (success):

{
  "status": "success",
  "message": "Booking created",
  "data": {
    "id": "bk_003",
    "branchId": "br1",
    "guestName": "Nguyễn A",
    "email": "guest@example.com",
    "phone": "0909123456",
    "roomNumber": "121",         // present if assigned
    "roomId": "rm_121",
    "roomType": "Deluxe",
    "arrivalDate": "2026-06-01",
    "departureDate": "2026-06-02",
    "expectedCheckOutAt": "2026-06-02T14:00:00.000Z",
    "bookingCode": "BK-12345",
    "checkInTime": "9h00' 23 Mar 2026",
    "checkOutTime": "12h00' 24 Mar 2026",
    "duration": "24h00",
    "hourlyRate": 50000,
    "basePrice": 1200000,
    "discount": 0,
    "vat": 0,
    "totalPrice": 0,
    "deposit": 0,
    "finalPayment": 0,
    "status": "PENDING",        // or "CHECKED_IN" for walk-ins
    "isWalkIn": false,
    "paymentMethod": null,
    "extraServices": []
  }
}

- Response (error):

{
  "status": "error",
  "message": "Room not found",
  "data": null
}

B. Fetch booking (detail)
- Frontend function: `BookingService.fetchBooking(bookingId)`
- Method & Endpoint:
  - GET /api/v1/bookings/<booking_id>/
- Request: path param `<booking_id>`
- Response (success - simple guest-facing):

{
  "status": "success",
  "message": "OK",
  "data": {
    "id": "bk_001",
    "bookingId": "#AQRZO01",
    "status": "confirmed",
    "hotelName": "Swiss Hotel",
    "roomName": "Room 121",
    "checkIn": "2026-05-01T14:00:00.000Z",
    "checkOut": "2026-05-02T12:00:00.000Z"
  }
}

- For staff/detailed view, return the full booking object (see `getBookingDetails` in mock store) under `data`.

C. Fetch booking history (guest)
- Frontend function: `BookingService.fetchBookingHistory()`
- Method & Endpoint:
  - GET /api/v1/customers/me/bookings/  (or GET /api/v1/bookings/?guestId=<id>)
- Request: authenticated user (guest) or query param guestId
- Response (success - list):

{
  "status": "success",
  "message": "OK",
  "data": [
    {
      "id": "history-1",
      "bookingId": "#AQRZO01",
      "status": "completed",
      "hotelName": "Swiss Hotel",
      "roomName": "Room 301",
      "checkIn": "2026-03-10",
      "checkOut": "2026-03-12"
    }
  ]
}

D. Fetch upcoming bookings (guest)
- Frontend function: `BookingService.fetchUpcomingBookings()`
- Method & Endpoint:
  - GET /api/v1/customers/me/bookings/?status=upcoming
- Response (success):

{
  "status": "success",
  "message": "OK",
  "data": [
    {
      "id": "upcoming-1",
      "bookingId": "#AQRZO01",
      "hotelName": "Sun Suites Hotel",
      "roomName": "Room 101",
      "checkIn": "2026-04-15",
      "checkOut": "2026-04-17",
      "status": "pending_payment",
      "actionLabel": "Payment"
    }
  ]
}

E. Cancel booking (guest)
- Frontend function: `BookingService.cancelBooking(bookingId)`
- Method & Endpoint (RESTful):
  - PATCH /api/v1/bookings/<booking_id>/
  - Payload to cancel: { "status": "cancelled" }
- Request payload example:

{
  "status": "cancelled"
}

- Response (success):

{
  "status": "success",
  "message": "Booking cancelled",
  "data": {
    "id": "bk_001",
    "status": "cancelled"
  }
}

---

RECEPTION (Staff / Staff Portal)
================================
(All reception staff endpoints live under `/api/v1/reception/`)

1) Fetch booking details (staff)
- Frontend function: `fetchBookingDetails(bookingId)` in `ReceptionService.js`
- Method & Endpoint:
  - GET /api/v1/reception/bookings/<booking_id>/
- Response (success - full booking payload, see `staffPortalMockStore.getBookingDetails`):

{
  "status": "success",
  "message": "OK",
  "data": {
    "id": "bk_002",
    "branchId": "br1",
    "guestName": "Trần Minh Khôi",
    "email": "khoi.tran@email.com",
    "phone": "0918222333",
    "roomNumber": "201",
    "roomId": "rm_201",
    "roomType": "Suite",
    "arrivalDate": "2026-03-09",
    "departureDate": "2026-03-10",
    "bookingCode": "BK-90217",
    "checkInTime": "...",
    "checkOutTime": "...",
    "checkedInAt": "2026-03-09T10:00:00.000Z",
    "duration": "44h00",
    "basePrice": 2800000,
    "discount": 200000,
    "vat": 0,
    "totalPrice": 0,
    "deposit": 0,
    "finalPayment": 0,
    "status": "CHECKED_IN",
    "paymentMethod": null,
    "extraServices": [],
    "hourlyRate": 85000,
    "expectedCheckOutAt": "2026-03-10T08:00:00.000Z",
    "subtotal": 2600000,
    "isUnassigned": false,
    "roomStatusLabel": "Occupied",
    "operationalBadges": [ /* array of operational badge objects */ ],
    "checkoutBill": {
      /* checkout bill object as defined below */
    }
  }
}

2) Confirm check-in
- Frontend function: `confirmCheckIn(bookingId)`
- Method & Endpoint:
  - POST /api/v1/reception/bookings/<booking_id>/check-in/
- Request: no payload required
- Response (success):

{
  "status": "success",
  "message": "Guest checked in successfully",
  "data": {
    /* updated booking object with status CHECKED_IN, checkedInAt, room occupied, subtotal and checkoutBill */
  }
}

3) Process payment and check-out
- Frontend function: `processPaymentAndCheckOut(bookingId, method)`
- Method & Endpoint:
  - POST /api/v1/reception/bookings/<booking_id>/check-out/
- Request payload:

{
  "paymentMethod": "MOMO" // or ZALOPAY, CASH
}

- Response (success):

{
  "status": "success",
  "message": "Payment processed. Guest checked out.",
  "data": {
    /* booking object with status CHECKED_OUT, checkedOutAt, paymentMethod, checkoutBill */
  }
}

4) Create staff booking / walk-in (reception)
- Frontend function: `createStaffBooking(payload)`
- Method & Endpoint:
  - POST /api/v1/reception/bookings/
- Request payload: same shape as guest create but staff can provide `walkIn: true` and staff-specific fields.

{
  "branchId": "br1",
  "roomId": "rm_101",
  "durationHours": 4,
  "guestName": "Walk-in Guest",
  "email": "162345@walkin.guest",
  "phone": "",
  "walkIn": true
}

- Response (success):

{
  "status": "success",
  "message": "Walk-in guest checked in successfully",
  "data": {
    /* booking object (status CHECKED_IN, checkedInAt, room assigned if available) */
  }
}

5) Add booking extra service
- Frontend function: `addBookingExtraService(bookingId, serviceKey)`
- Method & Endpoint:
  - POST /api/v1/reception/bookings/<booking_id>/services/
- Request payload:

{
  "serviceKey": "es_br1_1"
}

- Response (success - mock returns updated booking with subtotal & checkoutBill):

{
  "status": "success",
  "message": "Service added",
  "data": {
    /* updated booking object including extraServices array and checkoutBill */
  }
}

6) Fetch bookings for a day (reception/day view)
- Frontend function: `fetchBookingsForDay(branchId, dateKey)`
- Method & Endpoint:
  - GET /api/v1/reception/bookings/?branchId=<branchId>&date=<YYYY-MM-DD>
- Response (success):

{
  "status": "success",
  "message": "OK",
  "data": [ /* array of booking list items (toBookingListItem) */ ]
}

7) Fetch available rooms for room switch
- Frontend function: `fetchAvailableRoomsForSwitch(branchId, roomType)`
- Method & Endpoint:
  - GET /api/v1/reception/rooms/available/?branchId=<branchId>&roomType=<type>
- Response (success):

{
  "status": "success",
  "message": "OK",
  "data": [
    {
      "id": "rm_121",
      "branchId": "br1",
      "roomNumber": "121",
      "type": "Family",
      "feature": "View beach",
      "price": 1999000,
      "hourlyRate": 50000,
      "status": "available"
    }
  ]
}

8) Assign room & check-in (staff)
- Frontend function: `assignRoomAndCheckIn(bookingId, newRoomId)`
- Method & Endpoint:
  - POST /api/v1/reception/bookings/<booking_id>/assign-and-check-in/
- Request payload:

{
  "roomId": "rm_121"
}

- Response (success):

{
  "status": "success",
  "message": "Guest checked in to Room 121",
  "data": {
    /* updated booking object (status CHECKED_IN, roomNumber, roomId, checkedInAt, checkoutBill) */
  }
}

9) Switch booking room (change room)
- Frontend function: `switchBookingRoom(bookingId, newRoomId)`
- Method & Endpoint:
  - PATCH /api/v1/reception/bookings/<booking_id>/room/
- Request payload:

{
  "roomId": "rm_301"
}

- Response (success):

{
  "status": "success",
  "message": "Room assignment updated",
  "data": {
    /* updated booking object */
  }
}

10) Housekeeping endpoints
- List housekeeping rooms
  - GET /api/v1/reception/housekeeping/rooms/?branchId=<branchId>
  - Response `data`: [{ id, branchId, roomNumber, status }]

- Mark room clean
  - POST /api/v1/reception/housekeeping/rooms/<room_id>/mark-clean/
  - Payload: none
  - Response: updated small object or success message

11) Service orders (F&B / SPA / Transport)
- List service orders
  - GET /api/v1/reception/service-orders/?branchId=<branchId>
  - Response `data`: array of orders (id, branchId, roomNumber, category, items, guestName, guestPhone, assignedStaff, status, timestamp, summary, amount)

- Accept service order
  - POST /api/v1/reception/service-orders/<order_id>/accept/
  - Optional payload: {"staffName": "Receptionist A"}
  - Response: order object with updated status

- Complete service order
  - POST /api/v1/reception/service-orders/<order_id>/complete/
  - Response: order object with updated status

---

BRANCH & BUSINESS
=================
(Functions located in `BranchService.js` and `branchMockStore.js`)

1) List businesses (manager)
- Frontend function: `fetchBusinessList(managerId)`
- Method & Endpoint:
  - GET /api/v1/businesses/?managerId=<manager_id>
- Response example:

{
  "status": "success",
  "message": "OK",
  "data": [
    {
      "id": "b1",
      "managerId": "manager_01",
      "name": "Swiss",
      "logo": "https://...",
      "branches": [ /* summary objects of branches */ ]
    }
  ]
}

2) Business detail
- Frontend function: `fetchBusinessDetail(businessId)`
- Method & Endpoint:
  - GET /api/v1/businesses/<business_id>/?managerId=<managerId>
- Response `data`: full business object with `branches` array

3) Create / Update / Delete business
- Create: POST /api/v1/businesses/
  - Request payload:

{
  "name": "New Business",
  "legalName": "...",
  "taxCode": "...",
  "lodgingType": "Hotel",
  "contact": { "email": "...", "phone": "..." }
}

- Response (success): envelope with `data` = created business summary

- Update: PUT /api/v1/businesses/<business_id>/
- Delete: DELETE /api/v1/businesses/<business_id>/?managerId=<managerId>

4) Branch CRUD
- Create branch: POST /api/v1/businesses/<business_id>/branches/
  - Payload: { name, lodgingType, address, image, contact, amenities, guestSegments, images, payoutAccount }
  - Response: created branch summary

- Get branch detail: GET /api/v1/branches/<branch_id>/?managerId=<managerId>
  - Response `data`: branch object including `roomTypes`, `extraServices`, `physicalRooms`

- Update branch: PUT /api/v1/branches/<branch_id>/
- Delete branch: DELETE /api/v1/branches/<branch_id>/?managerId=<managerId>

5) Lodging types, guest segments, amenity options
- GET /api/v1/branches/lodging-types/
  - Response `data`: ["Hotel","Homestay","Resort",...]

- GET /api/v1/branches/guest-segments/
  - Response `data`: branchMockStore.GUEST_SEGMENTS

- GET /api/v1/branches/amenity-options/
  - Response `data`: branchMockStore.AMENITY_OPTIONS

6) Room Types (per branch)
- List: GET /api/v1/branches/<branch_id>/room-types/
- Create: POST /api/v1/branches/<branch_id>/room-types/
  - Payload example:

{
  "name": "Deluxe Room",
  "basePrice": 1500000,
  "capacity": 2,
  "description": "...",
  "roomAmenities": ["Air Conditioning","King Bed"],
  "images": ["https://..."]
}

- Update: PUT /api/v1/branches/<branch_id>/room-types/<room_type_id>/
- Delete: DELETE /api/v1/branches/<branch_id>/room-types/<room_type_id>/

Response `data` should be the room type object (id, branchId, name, basePrice, capacity, description, roomAmenities, images).

7) Extra Services (per branch)
- List: GET /api/v1/branches/<branch_id>/extra-services/
- Create: POST /api/v1/branches/<branch_id>/extra-services/
  - Payload example: { name, description, price, category }
- Update: PUT /api/v1/branches/<branch_id>/extra-services/<service_id>/
- Delete: DELETE /api/v1/branches/<branch_id>/extra-services/<service_id>/

8) Physical Rooms (inventory)
- List: GET /api/v1/branches/<branch_id>/rooms/
- Create: POST /api/v1/branches/<branch_id>/rooms/
  - Payload: { roomNumber, floor, roomTypeId }
- Update: PUT /api/v1/branches/<branch_id>/rooms/<physical_room_id>/
- Delete: DELETE /api/v1/branches/<branch_id>/rooms/<physical_room_id>/

All responses follow the envelope and return created/updated objects in `data`.

---

STAFF
=====
(See `StaffService.js`, `staffMockStore.js`)

1) List staff
- Frontend function: `fetchStaffList(managerId, filters)`
- Method & Endpoint:
  - GET /api/v1/staff/?managerId=<manager_id>&branchId=<branchId>&businessId=<businessId>
- Response `data`: array of public staff objects (id, businessId, branchId, name, email, phone, role, jobRole, department, branchId)

2) Get staff by id
- Frontend function: `fetchStaffById(staffId)`
- Method & Endpoint:
  - GET /api/v1/staff/<staff_id>/?managerId=<managerId>
- Response `data`: staff object (without password)

3) Create staff
- Frontend function: `createStaff(payload)`
- Method & Endpoint:
  - POST /api/v1/staff/
- Request payload:

{
  "branchId": "br1",
  "name": "New Staff",
  "email": "staff@example.com",
  "phone": "090...",
  "role": "Receptionist",
  "password": "Abc123@"
}

- Response `data`: created staff object (safe public fields)

4) Update staff
- Frontend function: `updateStaff(staffId, payload)`
- Method & Endpoint:
  - PUT /api/v1/staff/<staff_id>/
- Response `data`: updated staff object

5) Delete staff
- Frontend function: `deleteStaff(staffId)`
- Method & Endpoint:
  - DELETE /api/v1/staff/<staff_id>/?managerId=<managerId>
- Response (success): envelope with message and optionally { "id": "st_..." } in data.

6) Staff branch options
- Frontend function: `fetchStaffBranchOptions(managerId)`
- Method & Endpoint:
  - GET /api/v1/staff/branches/?managerId=<managerId>
- Response `data`: array of { id, name, businessId, businessName }

---

REPORT
======
(See `ReportService.js`, `reportMockStore.js`)

1) Report business filters
- Frontend function: `fetchReportBusinessFilters(managerId)`
- Method & Endpoint:
  - GET /api/v1/reports/businesses/?managerId=<managerId>
- Response `data`: [ { id: "all", name: "All Businesses" }, { id: "b1", name: "Swiss" } ... ]

2) Report branch filters
- Frontend function: `fetchReportBranchFilters(managerId)`
- Method & Endpoint:
  - GET /api/v1/reports/branches/?managerId=<managerId>
- Response `data`: [ { id: "all", name: "All Branches", businessId: "all" }, ... ]

3) Report dashboard
- Frontend function: `fetchReportDashboard(businessId, branchId, managerId)`
- Method & Endpoint:
  - GET /api/v1/reports/dashboard/?managerId=<managerId>&businessId=<businessId>&branchId=<branchId>
- Response `data` (example aggregated metrics):

{
  "businessId": "all",
  "branchId": "all",
  "filterLabel": "All Businesses · All Branches",
  "totalRevenue": 1_239_550_000,
  "occupancyRate": 80,
  "totalBookings": 831,
  "csatScore": 4.7,
  "monthlyRevenue": [ {"month":"2025-12","label":"Dec","revenue":...}, ... ],
  "periodLabel": "Last 6 months"
}

---

PAYMENT
=======
(See `PaymentService.js`)

1) Process payment
- Frontend function: `PaymentService.processPayment(paymentPayload)`
- Method & Endpoint:
  - POST /api/v1/payments/process/
- Request payload example:

{
  "bookingId": "bk_003",
  "amount": 1200000,
  "currency": "VND",
  "paymentMethod": "MOMO",
  "customerInfo": {
    "email": "guest@example.com",
    "phone": "0909...",
    "name": "Guest Name"
  }
}

- Response (success - mock):

{
  "status": "success",
  "message": "Payment completed",
  "data": {
    "id": "payment-165...",
    "bookingId": "bk_003",
    "amount": 1200000,
    "paymentMethod": "MOMO",
    "status": "completed",
    "transactionId": "TXNABC123",
    "processedAt": "2026-05-19T10:00:00.000Z"
  }
}

- Response (error):

{
  "status": "error",
  "message": "Payment processing failed. Please try again.",
  "data": null
}

2) Verify payment
- Frontend function: `PaymentService.verifyPayment(transactionId)`
- Method & Endpoint:
  - GET /api/v1/payments/verify/<transaction_id>/
- Response (success):

{
  "status": "success",
  "message": "OK",
  "data": {
    "transactionId": "TXNABC123",
    "status": "completed",
    "verifiedAt": "2026-05-19T10:01:00.000Z"
  }
}

3) Refund payment
- Frontend function: `PaymentService.refundPayment(transactionId, reason)`
- Method & Endpoint:
  - POST /api/v1/payments/<transaction_id>/refund/
- Request payload:

{
  "reason": "Guest cancellation"
}

- Response (success):

{
  "status": "success",
  "message": "Refund processed",
  "data": {
    "refundId": "REFUND-165...",
    "transactionId": "TXNABC123",
    "status": "processed",
    "reason": "Guest cancellation"
  }
}

---

CUSTOMER
========
(See `CustomerService.js`)

Note: Frontend stores session locally and many customer endpoints are mocked. Suggested Django endpoints to match functionality:

1) Load profile (current user)
- Frontend function: `CustomerService.loadProfile()`
- Method & Endpoint:
  - GET /api/v1/customers/me/
- Response (success):

{
  "status": "success",
  "message": "OK",
  "data": {
    "id": "guest_01",
    "name": "Guest Name",
    "email": "guest@example.com",
    "phone": "0909...",
    "role": "GUEST",
    "avatar": "https://...",
    "createdAt": "2026-01-12T08:00:00.000Z",
    "updatedAt": "2026-05-01T10:00:00.000Z"
  }
}

2) Update profile
- Frontend function: `CustomerService.updateProfile(userId, updates)`
- Method & Endpoint:
  - PUT /api/v1/customers/<user_id>/
- Request payload (partial allowed):

{
  "name": "New Name",
  "phone": "0909...",
  "avatar": "https://..."
}

- Response (success): return updated user object in `data`.

3) Update avatar
- Frontend function: `CustomerService.updateAvatar(userId, avatarUrl)`
- Method & Endpoint:
  - PATCH /api/v1/customers/<user_id>/avatar/
- Request payload:

{
  "avatar": "https://..."
}

- Response `data`: updated user object

4) Verify email / phone
- Frontend functions: `verifyEmail(userId)`, `verifyPhone(userId)`
- Methods & Endpoints:
  - POST /api/v1/customers/<user_id>/verify-email/
  - POST /api/v1/customers/<user_id>/verify-phone/
- Responses: success envelopes

---

FAVORITES
=========
(Frontend currently persists favorites client-side with AsyncStorage in `FavoritesService.js`.)
We propose backend endpoints (optional) to synchronize favorites across devices.

1) Load favorites
- Frontend function equivalent: `FavoritesService.loadFavorites()`
- Method & Endpoint:
  - GET /api/v1/customers/me/favorites/
- Response `data`: array of favorite items (id, type, title, addedAt, ...)

2) Add favorite
- POST /api/v1/customers/me/favorites/
- Payload example:

{
  "id": "hotel_123",
  "type": "hotel",
  "title": "Swiss Hotel",
  "metadata": { ... }
}

- Response `data`: updated favorites array or created favorite entry

3) Remove favorite
- DELETE /api/v1/customers/me/favorites/<item_id>/
- Response `data`: updated favorites array

4) Toggle favorite
- POST /api/v1/customers/me/favorites/toggle/
- Payload: { "id": "hotel_123", "type": "hotel" }
- Response: { status, message, data: updatedFavorites, action: "added" | "removed" }

5) Get favorites count
- GET /api/v1/customers/me/favorites/count/
- Response `data`: integer

---

HOTEL
=====
(See `HotelService.js` and `configuration/hotelsData` used by frontend)

1) Search hotels
- Frontend function: `HotelService.searchHotels(query)`
- Method & Endpoint:
  - GET /api/v1/hotels/search/?q=<query>
- Response `data`: array of hotel objects (id, title, city, address, price, rating, description, images...)

2) Filter hotels
- Frontend function: `HotelService.filterHotels(filters)`
- Method & Endpoint:
  - GET /api/v1/hotels/?minPrice=<min>&maxPrice=<max>&minRating=<r>&roomType=<type>&location=<loc>
- Response `data`: filtered array

3) Get hotel by id
- Frontend function: `getHotelById(hotelId)`
- Method & Endpoint:
  - GET /api/v1/hotels/<hotel_id>/
- Response `data`: hotel object or null

4) Similar hotels
- Frontend function: `getSimilarHotels(hotelId, limit)`
- Method & Endpoint:
  - GET /api/v1/hotels/<hotel_id>/similar/?limit=3
- Response `data`: array of hotels

5) Featured / stats endpoints
- GET /api/v1/hotels/featured/?limit=5
- GET /api/v1/hotels/stats/
- Responses follow envelope; stats `data` contains totalHotels, priceRange, averageRating

---

ADDITIONAL DATA SHAPES
======================

Checkout bill (returned under booking.checkoutBill) — shape (from `staffPortalMockStore.buildCheckoutBill`):

{
  "serviceOrders": [ /* array of completed service order objects */ ],
  "extraServices": [ /* booking.extraServices */ ],
  "roomSubtotal": 1230000,
  "extraServicesTotal": 0,
  "legacyServiceTotal": 0,
  "serviceTotal": 0,
  "overtimeHours": 0,
  "overtimeSurcharge": 0,
  "overtimeHoursLabel": "",
  "subtotal": 1230000,
  "vat": 123000,
  "totalPrice": 1353000,
  "deposit": 270600,
  "finalPayment": 1082400
}

Operational booking list item (toBookingListItem) — minimal fields used by frontend lists:

{
  "id": "bk_001",
  "bookingId": "#AQRZO01",
  "status": "pending" | "checked_in" | "checked_out",
  "hotelName": "Swiss Hotel",
  "roomName": "Room 301",
  "checkIn": "...",
  "checkOut": "...",
  "subtotal": 1200000,
  "total": 1353000,
  "isUnassigned": false,
  "roomStatusLabel": "Clean",
  "operationalBadges": [ /* small badge objects */ ]
}

---

AUTHENTICATION & ERRORS
=======================
- Use HTTP status codes appropriately (200/201 for success, 400 for validation errors, 401/403 for auth errors, 404 for not found, 500 for server errors).
- Regardless of HTTP status code, the JSON body MUST use the envelope stated at the top.
- Example error response for validation:

HTTP 400
{
  "status": "error",
  "message": "Invalid request",
  "data": { "errors": { "email": ["This field is required."] } }
}

---

RECOMMENDATIONS FOR DJANGO/DRF IMPLEMENTATION
============================================
- Use Django REST Framework ViewSets where appropriate (BusinessesViewSet, BranchesViewSet, BookingsViewSet, ReceptionBookingsViewSet).
- Namespace reception endpoints under a router prefix `reception` (e.g., `reception-bookings` viewset) or create dedicated function-based endpoints for actions (check-in/check-out) registered with `@action(detail=True)`.
- Use serializers that output the fields used by the frontend (do not nest response in additional keys). Return the serialized object inside the `data` field of the envelope.
- Add permissions to restrict staff endpoints to staff accounts and manager-scoped resources to the owning manager.
- Implement `customers/me/` endpoints for profile operations that the frontend expects via session token.

---

NEXT STEPS
==========
- If you confirm this shape I can:
  - Generate a concrete Django DRF router mapping and example serializers/models for each resource described here.
  - Or produce a machine-readable OpenAPI (Swagger) spec derived from this document.




