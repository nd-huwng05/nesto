import {MANAGER_ID, branchMockStore} from './branchMockStore';

/** Last 6 months ending May 2026 */
const MONTH_LABELS = [
    {key: '2025-12', label: 'Dec'},
    {key: '2026-01', label: 'Jan'},
    {key: '2026-02', label: 'Feb'},
    {key: '2026-03', label: 'Mar'},
    {key: '2026-04', label: 'Apr'},
    {key: '2026-05', label: 'May'},
];

const branchMetrics = {
    br1: {
        totalRevenue: 428_500_000,
        occupancyRate: 76,
        totalBookings: 284,
        csatScore: 4.5,
        monthlyRevenue: {
            '2025-12': 62_000_000,
            '2026-01': 58_500_000,
            '2026-02': 64_200_000,
            '2026-03': 71_800_000,
            '2026-04': 82_400_000,
            '2026-05': 89_600_000,
        },
    },
    br2: {
        totalRevenue: 612_300_000,
        occupancyRate: 84,
        totalBookings: 391,
        csatScore: 4.8,
        monthlyRevenue: {
            '2025-12': 88_000_000,
            '2026-01': 92_400_000,
            '2026-02': 95_100_000,
            '2026-03': 98_600_000,
            '2026-04': 112_200_000,
            '2026-05': 126_000_000,
        },
    },
    br3: {
        totalRevenue: 198_750_000,
        occupancyRate: 68,
        totalBookings: 156,
        csatScore: 4.6,
        monthlyRevenue: {
            '2025-12': 24_500_000,
            '2026-01': 28_200_000,
            '2026-02': 31_400_000,
            '2026-03': 33_800_000,
            '2026-04': 38_350_000,
            '2026-05': 42_500_000,
        },
    },
};

const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

const buildMonthlySeries = (revenueMap) =>
    MONTH_LABELS.map(({key, label}) => ({
        month: key,
        label,
        revenue: revenueMap[key] ?? 0,
    }));

const aggregateMetrics = (branchIds) => {
    const rows = branchIds.map((id) => branchMetrics[id]).filter(Boolean);
    if (rows.length === 0) {
        return {
            totalRevenue: 0,
            occupancyRate: 0,
            totalBookings: 0,
            csatScore: 0,
            monthlyRevenue: buildMonthlySeries({}),
        };
    }

    const totalBookings = rows.reduce((s, r) => s + r.totalBookings, 0);
    const totalRevenue = rows.reduce((s, r) => s + r.totalRevenue, 0);
    const occupancyRate = Math.round(
        rows.reduce((s, r) => s + r.occupancyRate * r.totalBookings, 0) / totalBookings
    );
    const csatScore =
        Math.round((rows.reduce((s, r) => s + r.csatScore * r.totalBookings, 0) / totalBookings) * 10) /
        10;

    const mergedRevenue = {};
    MONTH_LABELS.forEach(({key}) => {
        mergedRevenue[key] = rows.reduce((s, r) => s + (r.monthlyRevenue[key] ?? 0), 0);
    });

    return {
        totalRevenue,
        occupancyRate,
        totalBookings,
        csatScore,
        monthlyRevenue: buildMonthlySeries(mergedRevenue),
    };
};

const resolveBranchIds = (businesses, businessId, branchId) => {
    const scopedBusinesses =
        !businessId || businessId === 'all'
            ? businesses
            : businesses.filter((b) => b.id === businessId);

    const branchIds = scopedBusinesses.flatMap((b) => (b.branches || []).map((br) => br.id));

    if (!branchId || branchId === 'all') {
        return branchIds;
    }
    return branchIds.includes(branchId) ? [branchId] : [];
};

const buildFilterLabel = (businesses, businessId, branchId) => {
    const businessName =
        !businessId || businessId === 'all'
            ? 'All Businesses'
            : businesses.find((b) => b.id === businessId)?.name || 'Business';

    if (!branchId || branchId === 'all') {
        return businessId === 'all' || !businessId
            ? 'All Branches'
            : `${businessName} · All Branches`;
    }

    const branchName = businesses
        .flatMap((b) => b.branches || [])
        .find((br) => br.id === branchId)?.name;

    return branchName ? `${businessName} · ${branchName}` : 'Branch';
};

export const reportMockStore = {
    async listBusinessFilters(managerId) {
        await delay(300);
        const businesses = await branchMockStore.listBusinesses(managerId);
        return [
            {id: 'all', name: 'All Businesses'},
            ...businesses.map((b) => ({id: b.id, name: b.name})),
        ];
    },

    async listBranchFilters(managerId) {
        await delay(300);
        const businesses = await branchMockStore.listBusinesses(managerId);
        const branches = businesses.flatMap((b) =>
            (b.branches || []).map((br) => ({
                id: br.id,
                name: br.name,
                businessId: b.id,
                businessName: b.name,
            }))
        );
        return [{id: 'all', name: 'All Branches', businessId: 'all'}, ...branches];
    },

    async getDashboard(managerId, businessId = 'all', branchId = 'all') {
        await delay(500);
        const businesses = await branchMockStore.listBusinesses(managerId);
        const targetBranchIds = resolveBranchIds(businesses, businessId, branchId);

        if (targetBranchIds.length === 0) {
            return null;
        }

        const isSingleBranch = targetBranchIds.length === 1 && branchId !== 'all';
        const metrics = isSingleBranch
            ? branchMetrics[targetBranchIds[0]]
                ? {
                      ...branchMetrics[targetBranchIds[0]],
                      monthlyRevenue: buildMonthlySeries(
                          branchMetrics[targetBranchIds[0]].monthlyRevenue
                      ),
                  }
                : null
            : aggregateMetrics(targetBranchIds);

        if (!metrics) return null;

        return {
            businessId: businessId || 'all',
            branchId: branchId || 'all',
            filterLabel: buildFilterLabel(businesses, businessId, branchId),
            totalRevenue: metrics.totalRevenue,
            occupancyRate: metrics.occupancyRate,
            totalBookings: metrics.totalBookings,
            csatScore: metrics.csatScore,
            monthlyRevenue: metrics.monthlyRevenue,
            periodLabel: 'Last 6 months',
        };
    },
};
