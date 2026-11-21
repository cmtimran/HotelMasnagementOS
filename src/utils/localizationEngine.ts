/**
 * HotelManagementOS - Centralized Regional & Localization Engine
 * 
 * Provides unified, reactive formatting and calculations across the entire PMS & RMS:
 * 1. Time Zone: Property local time conversion, night audit scheduling, and audit trail timestamps.
 * 2. Date Format: Universal display layer formatting (DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY).
 * 3. Time Format: 12-Hour (AM/PM) vs 24-Hour (14:00) conversions.
 * 4. Fiscal Year: Accounting cycles (July-June, Jan-Dec, Apr-Mar), YTD calculations, and quarterly buckets.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface PropertyLocalizationConfig {
    timezone: string;
    dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY' | string;
    timeFormat: '12-Hour (AM/PM)' | '24-Hour' | string;
    fiscalYearStart: 'July - June' | 'January - December' | 'April - March' | string;
    checkInTime?: string;
    checkOutTime?: string;
}

export interface FiscalYearInfo {
    fyCode: string;
    startDate: string;
    endDate: string;
    quarter: string;
    quarterNumber: 1 | 2 | 3 | 4;
    isCurrent: boolean;
}

const DEFAULT_CONFIG: PropertyLocalizationConfig = {
    timezone: 'Asia/Dhaka (GMT+06:00)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12-Hour (AM/PM)',
    fiscalYearStart: 'July - June',
    checkInTime: '14:00',
    checkOutTime: '12:00'
};

/**
 * Extracts a clean IANA time zone identifier (e.g. 'Asia/Dhaka' from 'Asia/Dhaka (GMT+06:00)')
 */
export function extractIanaTimeZone(tzString?: string): string {
    if (!tzString) return 'Asia/Dhaka';
    const clean = tzString.split(' ')[0].trim();
    try {
        Intl.DateTimeFormat(undefined, { timeZone: clean });
        return clean;
    } catch {
        return 'Asia/Dhaka';
    }
}

/**
 * Reads active property localization configuration from localStorage with robust fallback
 */
export function getStoredLocalizationConfig(): PropertyLocalizationConfig {
    try {
        const activeId = localStorage.getItem('hotel_active_property_id');
        if (activeId) {
            const rawProp = localStorage.getItem(`hotel_unified_settings_prop_${activeId}`);
            if (rawProp) {
                const parsed = JSON.parse(rawProp);
                const s = parsed.settings || parsed;
                if (s.timezone || s.dateFormat || s.timeFormat || s.fiscalYearStart || s.checkInTime || s.checkOutTime) {
                    return {
                        timezone: s.timezone || DEFAULT_CONFIG.timezone,
                        dateFormat: s.dateFormat || DEFAULT_CONFIG.dateFormat,
                        timeFormat: s.timeFormat || DEFAULT_CONFIG.timeFormat,
                        fiscalYearStart: s.fiscalYearStart || DEFAULT_CONFIG.fiscalYearStart,
                        checkInTime: s.checkInTime || DEFAULT_CONFIG.checkInTime,
                        checkOutTime: s.checkOutTime || DEFAULT_CONFIG.checkOutTime
                    };
                }
            }
        }

        const rawGen = localStorage.getItem('hotel_general_settings_v1');
        if (rawGen) {
            const parsed = JSON.parse(rawGen);
            return {
                timezone: parsed.timezone || DEFAULT_CONFIG.timezone,
                dateFormat: parsed.dateFormat || DEFAULT_CONFIG.dateFormat,
                timeFormat: parsed.timeFormat || DEFAULT_CONFIG.timeFormat,
                fiscalYearStart: parsed.fiscalYearStart || DEFAULT_CONFIG.fiscalYearStart,
                checkInTime: parsed.checkInTime || DEFAULT_CONFIG.checkInTime,
                checkOutTime: parsed.checkOutTime || DEFAULT_CONFIG.checkOutTime
            };
        }
    } catch {
        // Fallback to default
    }
    return DEFAULT_CONFIG;
}

/**
 * Formats a Date, ISO string, or timestamp into the property's configured Date Format
 */
export function formatDate(
    input: string | Date | number | null | undefined,
    configOverride?: Partial<PropertyLocalizationConfig>
): string {
    if (!input) return '—';

    let year: number;
    let month: number;
    let day: number;

    if (typeof input === 'string') {
        const isoMatch = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) {
            year = parseInt(isoMatch[1], 10);
            month = parseInt(isoMatch[2], 10);
            day = parseInt(isoMatch[3], 10);
        } else {
            const parsed = new Date(input);
            if (isNaN(parsed.getTime())) return String(input);
            year = parsed.getFullYear();
            month = parsed.getMonth() + 1;
            day = parsed.getDate();
        }
    } else {
        const d = input instanceof Date ? input : new Date(input);
        if (isNaN(d.getTime())) return '—';
        year = d.getFullYear();
        month = d.getMonth() + 1;
        day = d.getDate();
    }

    const cfg = { ...getStoredLocalizationConfig(), ...configOverride };
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const yyyy = String(year);

    switch (cfg.dateFormat) {
        case 'DD/MM/YYYY':
            return `${dd}/${mm}/${yyyy}`;
        case 'MM/DD/YYYY':
            return `${mm}/${dd}/${yyyy}`;
        case 'YYYY-MM-DD':
        default:
            return `${yyyy}-${mm}-${dd}`;
    }
}

/**
 * Formats a date into a human-readable format e.g. "02 Jul 2026"
 */
export function formatDateDisplay(
    input: string | Date | number | null | undefined,
    configOverride?: Partial<PropertyLocalizationConfig>
): string {
    if (!input) return '—';
    const d = typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)
        ? new Date(`${input}T00:00:00`)
        : new Date(input);

    if (isNaN(d.getTime())) return String(input);

    const cfg = { ...getStoredLocalizationConfig(), ...configOverride };
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = months[d.getMonth()];
    const yyyy = d.getFullYear();

    if (cfg.dateFormat === 'MM/DD/YYYY') {
        return `${mmm} ${dd}, ${yyyy}`;
    }
    return `${dd} ${mmm} ${yyyy}`;
}

/**
 * Formats a time string (e.g. "14:30" or ISO timestamp) according to configured Time Format
 */
export function formatTime(
    input: string | Date | number | null | undefined,
    configOverride?: Partial<PropertyLocalizationConfig>
): string {
    if (!input) return '—';

    let hours: number;
    let minutes: number;

    if (typeof input === 'string') {
        const timeMatch = input.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
        if (timeMatch && !input.includes('T')) {
            hours = parseInt(timeMatch[1], 10);
            minutes = parseInt(timeMatch[2], 10);
        } else {
            const d = new Date(input);
            if (isNaN(d.getTime())) return input;
            hours = d.getHours();
            minutes = d.getMinutes();
        }
    } else {
        const d = input instanceof Date ? input : new Date(input);
        if (isNaN(d.getTime())) return '—';
        hours = d.getHours();
        minutes = d.getMinutes();
    }

    const cfg = { ...getStoredLocalizationConfig(), ...configOverride };
    const mm = String(minutes).padStart(2, '0');

    if (cfg.timeFormat === '24-Hour') {
        return `${String(hours).padStart(2, '0')}:${mm}`;
    }

    // 12-Hour format (AM/PM)
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${mm} ${period}`;
}

/**
 * Combined Date & Time formatter
 */
export function formatDateTime(
    input: string | Date | number | null | undefined,
    configOverride?: Partial<PropertyLocalizationConfig>
): string {
    if (!input) return '—';
    return `${formatDate(input, configOverride)} ${formatTime(input, configOverride)}`;
}

/**
 * Calculates Fiscal Year ranges, codes, and quarters based on property Fiscal Year Start
 */
export function getFiscalYearRange(
    targetDateInput?: string | Date | number,
    configOverride?: Partial<PropertyLocalizationConfig>
): FiscalYearInfo {
    const d = targetDateInput
        ? (typeof targetDateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(targetDateInput)
            ? new Date(`${targetDateInput}T00:00:00`)
            : new Date(targetDateInput))
        : new Date();

    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-12
    const cfg = { ...getStoredLocalizationConfig(), ...configOverride };
    const fyType = cfg.fiscalYearStart;

    let fyCode = '';
    let startDate = '';
    let endDate = '';
    let quarter = '';
    let quarterNumber: 1 | 2 | 3 | 4 = 1;

    if (fyType.toLowerCase().includes('july')) {
        // July - June (e.g. Bangladesh, Australia, Pakistan)
        if (month >= 7) {
            fyCode = `FY ${year}-${String(year + 1).slice(-2)}`;
            startDate = `${year}-07-01`;
            endDate = `${year + 1}-06-30`;
            if (month <= 9) { quarterNumber = 1; quarter = 'Q1 (Jul - Sep)'; }
            else { quarterNumber = 2; quarter = 'Q2 (Oct - Dec)'; }
        } else {
            fyCode = `FY ${year - 1}-${String(year).slice(-2)}`;
            startDate = `${year - 1}-07-01`;
            endDate = `${year}-06-30`;
            if (month <= 3) { quarterNumber = 3; quarter = 'Q3 (Jan - Mar)'; }
            else { quarterNumber = 4; quarter = 'Q4 (Apr - Jun)'; }
        }
    } else if (fyType.toLowerCase().includes('april')) {
        // April - March (e.g. India, UK, Canada)
        if (month >= 4) {
            fyCode = `FY ${year}-${String(year + 1).slice(-2)}`;
            startDate = `${year}-04-01`;
            endDate = `${year + 1}-03-31`;
            if (month <= 6) { quarterNumber = 1; quarter = 'Q1 (Apr - Jun)'; }
            else if (month <= 9) { quarterNumber = 2; quarter = 'Q2 (Jul - Sep)'; }
            else { quarterNumber = 3; quarter = 'Q3 (Oct - Dec)'; }
        } else {
            fyCode = `FY ${year - 1}-${String(year).slice(-2)}`;
            startDate = `${year - 1}-04-01`;
            endDate = `${year}-03-31`;
            quarterNumber = 4; quarter = 'Q4 (Jan - Mar)';
        }
    } else {
        // January - December (Calendar Year, USA, EU, UAE)
        fyCode = `FY ${year}`;
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
        if (month <= 3) { quarterNumber = 1; quarter = 'Q1 (Jan - Mar)'; }
        else if (month <= 6) { quarterNumber = 2; quarter = 'Q2 (Apr - Jun)'; }
        else if (month <= 9) { quarterNumber = 3; quarter = 'Q3 (Jul - Sep)'; }
        else { quarterNumber = 4; quarter = 'Q4 (Oct - Dec)'; }
    }

    const now = new Date();
    const isCurrent = d.getFullYear() === now.getFullYear() && (d.getMonth() + 1) === (now.getMonth() + 1);

    return {
        fyCode,
        startDate,
        endDate,
        quarter,
        quarterNumber,
        isCurrent
    };
}

/**
 * Returns current property operating date string in YYYY-MM-DD according to hotel time zone
 */
export function getPropertyLocalDate(): string {
    const cfg = getStoredLocalizationConfig();
    const iana = extractIanaTimeZone(cfg.timezone);
    try {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: iana,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        return formatter.format(new Date()); // Formats as YYYY-MM-DD
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}

/**
 * Universal React Hook for components needing reactive localization updates
 */
export function usePropertyLocalization() {
    const [config, setConfig] = useState<PropertyLocalizationConfig>(getStoredLocalizationConfig);

    useEffect(() => {
        const handleUpdate = () => {
            setConfig(getStoredLocalizationConfig());
        };

        window.addEventListener('hotel_localization_changed', handleUpdate);
        window.addEventListener('storage', handleUpdate);

        return () => {
            window.removeEventListener('hotel_localization_changed', handleUpdate);
            window.removeEventListener('storage', handleUpdate);
        };
    }, []);

    const formatDt = useCallback(
        (val: string | Date | number | null | undefined) => formatDate(val, config),
        [config]
    );

    const formatDtDisplay = useCallback(
        (val: string | Date | number | null | undefined) => formatDateDisplay(val, config),
        [config]
    );

    const formatTm = useCallback(
        (val: string | Date | number | null | undefined) => formatTime(val, config),
        [config]
    );

    const formatDtTm = useCallback(
        (val: string | Date | number | null | undefined) => formatDateTime(val, config),
        [config]
    );

    const getFY = useCallback(
        (targetDate?: string | Date | number) => getFiscalYearRange(targetDate, config),
        [config]
    );

    const localDate = useMemo(() => getPropertyLocalDate(), [config]);

    return {
        config,
        formatDate: formatDt,
        formatDateDisplay: formatDtDisplay,
        formatTime: formatTm,
        formatDateTime: formatDtTm,
        getFiscalYearRange: getFY,
        localDate,
        ianaTimeZone: extractIanaTimeZone(config.timezone)
    };
}
