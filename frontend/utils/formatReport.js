export function formatReportVnd(amount) {
    const num = Number(amount) || 0;
    if (num >= 1_000_000_000) {
        return `${(num / 1_000_000_000).toFixed(2)}B ₫`;
    }
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M ₫`;
    }
    return `${num.toLocaleString('en-US')} ₫`;
}

export function formatReportNumber(value) {
    return Number(value || 0).toLocaleString('en-US');
}
