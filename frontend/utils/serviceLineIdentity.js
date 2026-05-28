const toPositiveInt = (value, fallback = 1) => {
    const parsed = Number.parseInt(String(value ?? '').trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return fallback;
};

export const buildServiceDisplayCode = (serviceCode, lineNo) => {
    const baseCode = String(serviceCode || '').trim();
    if (!baseCode) return 'N/A';

    const safeLineNo = toPositiveInt(lineNo, 1);
    if (safeLineNo <= 1) return baseCode;

    return `${baseCode}-${String(safeLineNo).padStart(2, '0')}`;
};

export const normalizeServiceLine = (service, fallback = {}) => {
    const item = service && typeof service === 'object' ? service : {};

    const lineNo = toPositiveInt(
        item.line_no ?? item.lineNo ?? fallback.lineNo,
        1
    );

    const serviceCode = String(
        item.service_code ?? item.serviceCode ?? item.code ?? fallback.serviceCode ?? ''
    ).trim();

    const lineId = String(
        item.line_id ?? item.lineId ?? fallback.lineId ?? ''
    ).trim();

    const displayCode = String(item.display_code ?? item.displayCode ?? '').trim() ||
        buildServiceDisplayCode(serviceCode, lineNo);

    return {
        ...item,
        line_id: lineId,
        service_code: serviceCode,
        line_no: lineNo,
        display_code: displayCode,
    };
};
