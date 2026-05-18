/** Human-readable permission summaries shown when assigning staff roles */
export const STAFF_ROLE_PERMISSIONS = {
    Manager:
        'Full access. Can edit branch info, manage rooms, view revenue, and manage staff.',
    Receptionist:
        'Front desk access. Can manage bookings, check-in/out guests, and view room status.',
    Housekeeping:
        'Limited access. Can only view assigned rooms and update cleaning status.',
    Service:
        'Department-scoped service access. Can only view and fulfill orders for their assigned department, then mark requests in progress or completed.',
};
