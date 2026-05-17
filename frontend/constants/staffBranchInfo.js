/** Display names/addresses for staff portal headers (presentation design) */
export const STAFF_BRANCH_INFO = {
    br1: {
        name: 'Swiss Hotel',
        address: '211B Baker Street, London, England',
    },
    br2: {
        name: 'Nesto Beach Front',
        address: '246 Trần Phú, Phường 5, Vũng Tàu',
    },
};

export function getStaffBranchInfo(branchId) {
    return STAFF_BRANCH_INFO[branchId] || {name: 'Your branch', address: ''};
}
