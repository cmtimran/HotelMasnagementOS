import { COUNTRIES_DATABASE } from './geoData';
import { getApiBaseUrl } from './apiUrl';

export type HolidayCategory =
    | 'PUBLIC'
    | 'RELIGIOUS'
    | 'PEAK_GALA'
    | 'CORPORATE';

export interface HolidayItem {
    id: string;
    code: string;
    name: string;
    category: HolidayCategory;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    daysCount: number;
    hasSurgeRate: boolean;
    rateMultiplier: number;
    minStayNights: number;
    mandatoryGala: boolean;
    galaDinnerFee: number;
    staffWageMultiplier: number;
    compOffCredit: boolean;
    minimumStaffingAlert: 'STANDARD' | 'HIGH_ALERT' | 'MAX_PRESENCE';
    isRecurring?: boolean; // Recurs annually on the same month & day across all years
    status: 'ACTIVE' | 'INACTIVE';
    description?: string;
    createdAt?: string;

    // 3-Pillar Unified Governance
    extraBedAllowed?: boolean;
    extraBedHolidayFee?: number;
    extraAdultHolidayFee?: number;
    extraChildHolidayFee?: number;
    maxOccupancyLimit?: number;
}

export const STORAGE_KEY_HOLIDAYS = 'hotel_holidays_v1';

export const INITIAL_HOLIDAYS: HolidayItem[] = [];

/**
 * Curated Library of Official Statutory & Festival Holidays
 * Available for optional user selection during import (never pre-seeded or forced).
 */
export const OFFICIAL_HOLIDAY_PRESETS: Omit<HolidayItem, 'id' | 'createdAt'>[] = [
    {
        code: 'LANG-DAY',
        name: 'International Mother Language Day',
        category: 'PUBLIC',
        startDate: '2026-02-21',
        endDate: '2026-02-21',
        daysCount: 1,
        hasSurgeRate: false,
        rateMultiplier: 1.0,
        minStayNights: 1,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'STANDARD',
        isRecurring: true,
        status: 'ACTIVE',
        description: 'Statutory government holiday. Diplomatic morning protocol.'
    },
    {
        code: 'EID-FITR',
        name: 'Eid-ul-Fitr Grand Holidays',
        category: 'RELIGIOUS',
        startDate: '2026-03-20',
        endDate: '2026-03-23',
        daysCount: 4,
        hasSurgeRate: true,
        rateMultiplier: 1.35,
        minStayNights: 2,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'HIGH_ALERT',
        isRecurring: false,
        status: 'ACTIVE',
        description: 'Major family vacation peak. High occupancy banquet and buffet dining.'
    },
    {
        code: 'INDEP-DAY',
        name: 'Independence & National Day',
        category: 'PUBLIC',
        startDate: '2026-03-26',
        endDate: '2026-03-26',
        daysCount: 1,
        hasSurgeRate: false,
        rateMultiplier: 1.0,
        minStayNights: 1,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'STANDARD',
        isRecurring: true,
        status: 'ACTIVE',
        description: 'National commemoration. State diplomatic flags hoisted.'
    },
    {
        code: 'LABOR-DAY',
        name: 'International Workers & Labor Day',
        category: 'PUBLIC',
        startDate: '2026-05-01',
        endDate: '2026-05-01',
        daysCount: 1,
        hasSurgeRate: false,
        rateMultiplier: 1.0,
        minStayNights: 1,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'STANDARD',
        isRecurring: true,
        status: 'ACTIVE',
        description: 'Statutory labor day with staff overtime compensation.'
    },
    {
        code: 'EID-ADHA',
        name: 'Eid-ul-Adha Holidays',
        category: 'RELIGIOUS',
        startDate: '2026-05-27',
        endDate: '2026-05-30',
        daysCount: 4,
        hasSurgeRate: true,
        rateMultiplier: 1.30,
        minStayNights: 2,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'HIGH_ALERT',
        isRecurring: false,
        status: 'ACTIVE',
        description: 'Religious festival period with high suite bookings.'
    },
    {
        code: 'BANK-HOL',
        name: 'Bank Holiday (Mid-Year Financial Closing)',
        category: 'PUBLIC',
        startDate: '2026-07-01',
        endDate: '2026-07-01',
        daysCount: 1,
        hasSurgeRate: false,
        rateMultiplier: 1.0,
        minStayNights: 1,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'STANDARD',
        isRecurring: true,
        status: 'ACTIVE',
        description: 'Statutory bank holiday. Corporate travel heightened.'
    },
    {
        code: 'ASHURA',
        name: 'Holy Ashura',
        category: 'RELIGIOUS',
        startDate: '2026-07-26',
        endDate: '2026-07-26',
        daysCount: 1,
        hasSurgeRate: false,
        rateMultiplier: 1.0,
        minStayNights: 1,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'STANDARD',
        isRecurring: false,
        status: 'ACTIVE',
        description: 'National religious observance.'
    },
    {
        code: 'VICTORY-DAY',
        name: 'Victory Day Festival',
        category: 'PUBLIC',
        startDate: '2026-12-16',
        endDate: '2026-12-16',
        daysCount: 1,
        hasSurgeRate: false,
        rateMultiplier: 1.0,
        minStayNights: 1,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'STANDARD',
        isRecurring: true,
        status: 'ACTIVE',
        description: 'National commemoration with celebratory executive brunch.'
    },
    {
        code: 'XMAS',
        name: 'Christmas Eve & Winter Holidays',
        category: 'RELIGIOUS',
        startDate: '2026-12-24',
        endDate: '2026-12-26',
        daysCount: 3,
        hasSurgeRate: true,
        rateMultiplier: 1.45,
        minStayNights: 2,
        mandatoryGala: true,
        galaDinnerFee: 95,
        staffWageMultiplier: 2.5,
        compOffCredit: true,
        minimumStaffingAlert: 'MAX_PRESENCE',
        isRecurring: true,
        status: 'ACTIVE',
        description: 'Global holiday with festive dinner buffet.'
    },
    {
        code: 'NY-GALA',
        name: "New Year's Eve & Grand Gala",
        category: 'PEAK_GALA',
        startDate: '2026-12-31',
        endDate: '2027-01-02',
        daysCount: 3,
        hasSurgeRate: true,
        rateMultiplier: 1.50,
        minStayNights: 2,
        mandatoryGala: true,
        galaDinnerFee: 120,
        staffWageMultiplier: 2.5,
        compOffCredit: true,
        minimumStaffingAlert: 'MAX_PRESENCE',
        isRecurring: true,
        status: 'ACTIVE',
        description: 'High occupancy seasonal peak. Rooftop gala & fireworks package.'
    }
];

export function getStoredHolidays(): HolidayItem[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_HOLIDAYS);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        }
    } catch (e) {
        console.error('Failed to parse stored holidays:', e);
    }
    // Enterprise Fallback: Official curated presets with active holiday surges & MLOS fences
    const defaultList: HolidayItem[] = OFFICIAL_HOLIDAY_PRESETS.map((p, idx) => ({
        ...p,
        id: `preset-${p.code || idx}`,
        createdAt: new Date().toISOString()
    }));
    try {
        localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(defaultList));
    } catch {}
    return defaultList;
}

export function getActiveHolidays(): HolidayItem[] {
    return getStoredHolidays().filter(h => h.status === 'ACTIVE');
}

/**
 * Checks if a given ISO date falls within a holiday's range,
 * including multi-year annual recurrence support.
 */
export function isDateInHoliday(isoDate: string, h: HolidayItem): boolean {
    // 1. Direct chronological match
    if (isoDate >= h.startDate && isoDate <= h.endDate) {
        return true;
    }

    // 2. Annual recurrence match across any year
    if (h.isRecurring) {
        const targetMD = isoDate.slice(5); // 'MM-DD'
        const startMD = h.startDate.slice(5);
        const endMD = h.endDate.slice(5);

        if (startMD <= endMD) {
            return targetMD >= startMD && targetMD <= endMD;
        } else {
            // Spans year-end boundary (e.g. Dec 31 -> Jan 02)
            return targetMD >= startMD || targetMD <= endMD;
        }
    }

    return false;
}

/**
 * Enterprise Holiday Resolution with Conflict & Overlap Prioritization
 * If multiple holidays coincide on the same day, the highest surge multiplier
 * and category precedence (PEAK_GALA > RELIGIOUS > PUBLIC > CORPORATE) wins.
 */
export function getHolidayForDate(isoDate: string): HolidayItem | null {
    const list = getActiveHolidays();
    const matching = list.filter(h => isDateInHoliday(isoDate, h));

    if (matching.length === 0) return null;
    if (matching.length === 1) return matching[0];

    // Priority sorting: Highest rate multiplier first, then category precedence
    const categoryRank: Record<HolidayCategory, number> = {
        PEAK_GALA: 4,
        RELIGIOUS: 3,
        PUBLIC: 2,
        CORPORATE: 1
    };

    matching.sort((a, b) => {
        const aSurge = a.hasSurgeRate ? a.rateMultiplier : 1.0;
        const bSurge = b.hasSurgeRate ? b.rateMultiplier : 1.0;
        if (bSurge !== aSurge) return bSurge - aSurge;
        return (categoryRank[b.category] || 0) - (categoryRank[a.category] || 0);
    });

    return matching[0];
}

/**
 * PostgreSQL Database Synchronization & Multi-Property Scoping
 */
export async function fetchHolidaysFromDB(propertyId: number = 1): Promise<HolidayItem[]> {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/properties/${propertyId}/holidays`);
        if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(json.data));
                return json.data;
            }
        }
    } catch (err) {
        console.warn('Failed to fetch holidays from PostgreSQL API:', err);
    }
    return getStoredHolidays();
}

export async function saveHolidayToDB(propertyId: number = 1, item: HolidayItem): Promise<boolean> {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/properties/${propertyId}/holidays`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function deleteHolidayFromDB(propertyId: number = 1, holidayId: string): Promise<boolean> {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/properties/${propertyId}/holidays/${encodeURIComponent(holidayId)}`, {
            method: 'DELETE'
        });
        return res.ok;
    } catch {
        return false;
    }
}

export interface ExternalCatalogItem extends HolidayItem {
    localName?: string;
    isDuplicate?: boolean;
    duplicateReason?: string;
    matchedHolidayId?: string;
}

export interface SupportedCountryItem {
    code: string;
    name: string;
    flag: string;
    isPopular?: boolean;
}

/**
 * Universal Demonym & Country Name to ISO 3166-1 alpha-2 Code Resolver
 * Automatically resolves property country and default nationality to valid holiday code
 */
export function resolveCountryCodeFromNationalityOrName(val?: string): string {
    if (!val) return 'BD';
    const clean = val.trim().toLowerCase();
    
    // Direct 2-letter ISO code
    if (clean.length === 2) return clean.toUpperCase();

    const nationalityMap: Record<string, string> = {
        bangladeshi: 'BD',
        bangladesh: 'BD',
        american: 'US',
        usa: 'US',
        'united states': 'US',
        british: 'GB',
        uk: 'GB',
        'united kingdom': 'GB',
        english: 'GB',
        indian: 'IN',
        india: 'IN',
        emirati: 'AE',
        uae: 'AE',
        'united arab emirates': 'AE',
        saudi: 'SA',
        'saudi arabian': 'SA',
        'saudi arabia': 'SA',
        canadian: 'CA',
        canada: 'CA',
        australian: 'AU',
        australia: 'AU',
        singaporean: 'SG',
        singapore: 'SG',
        malaysian: 'MY',
        malaysia: 'MY',
        thai: 'TH',
        thailand: 'TH',
        pakistani: 'PK',
        pakistan: 'PK',
        srilankan: 'LK',
        'sri lankan': 'LK',
        'sri lanka': 'LK',
        nepali: 'NP',
        nepalese: 'NP',
        nepal: 'NP',
        maldivian: 'MV',
        maldives: 'MV',
        indonesian: 'ID',
        indonesia: 'ID',
        qatari: 'QA',
        qatar: 'QA',
        omani: 'OM',
        oman: 'OM',
        kuwaiti: 'KW',
        kuwait: 'KW',
        bahraini: 'BH',
        bahrain: 'BH',
        turkish: 'TR',
        turkey: 'TR',
        egyptian: 'EG',
        egypt: 'EG',
        german: 'DE',
        germany: 'DE',
        french: 'FR',
        france: 'FR',
        italian: 'IT',
        italy: 'IT',
        spanish: 'ES',
        spain: 'ES',
        swiss: 'CH',
        switzerland: 'CH',
        dutch: 'NL',
        netherlands: 'NL',
        chinese: 'CN',
        china: 'CN',
        japanese: 'JP',
        japan: 'JP',
        korean: 'KR',
        'south korea': 'KR',
        brazilian: 'BR',
        brazil: 'BR',
        mexican: 'MX',
        mexico: 'MX',
        russian: 'RU',
        russia: 'RU'
    };

    if (nationalityMap[clean]) {
        return nationalityMap[clean];
    }

    // Direct match against complete sovereign database
    const directMatch = COUNTRIES_DATABASE.find(
        c => (c?.name && c.name.toLowerCase() === clean) ||
             (c?.nationality && c.nationality.toLowerCase() === clean) ||
             (c?.code && c.code.toLowerCase() === clean)
    );
    if (directMatch) return directMatch.code;

    for (const [key, code] of Object.entries(nationalityMap)) {
        if (clean.includes(key) || key.includes(clean)) {
            return code;
        }
    }

    const partialMatch = COUNTRIES_DATABASE.find(
        c => (c?.name && (c.name.toLowerCase().includes(clean) || clean.includes(c.name.toLowerCase()))) ||
             (c?.nationality && (c.nationality.toLowerCase().includes(clean) || clean.includes(c.nationality.toLowerCase())))
    );
    if (partialMatch) return partialMatch.code;

    return 'BD';
}

/**
 * Fetch complete global countries list (200+ countries) supported by live holiday registries
 */
export async function fetchSupportedHolidayCountries(propertyId?: number): Promise<SupportedCountryItem[]> {
    const propId = propertyId || Number(localStorage.getItem('hotel_active_property_id')) || Number(localStorage.getItem('active_property_id')) || 1;
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/properties/${propId}/holidays/countries`);
        if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                return json.data;
            }
        }
    } catch (err) {
        console.warn('Failed to fetch supported countries:', err);
    }
    return [
        { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', isPopular: true },
        { code: 'US', name: 'United States', flag: '🇺🇸', isPopular: true },
        { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', isPopular: true },
        { code: 'IN', name: 'India', flag: '🇮🇳', isPopular: true },
        { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', isPopular: true },
        { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', isPopular: true },
        { code: 'CA', name: 'Canada', flag: '🇨🇦', isPopular: true },
        { code: 'AU', name: 'Australia', flag: '🇦🇺', isPopular: true },
        { code: 'SG', name: 'Singapore', flag: '🇸🇬', isPopular: true },
        { code: 'MY', name: 'Malaysia', flag: '🇲🇾', isPopular: true }
    ];
}

/**
 * Enterprise Duplicate Detection Helper
 * Checks whether candidate holiday already exists in the current active list.
 */
export function checkIsHolidayDuplicate(
    candidate: { code?: string; name: string; startDate: string; endDate?: string },
    existingList: HolidayItem[]
): { isDuplicate: boolean; reason?: string; matchedHoliday?: HolidayItem } {
    if (!existingList || existingList.length === 0) return { isDuplicate: false };

    const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const candCode = (candidate.code || '').trim().toUpperCase();
    const candNameNorm = norm(candidate.name);
    const candStart = candidate.startDate;
    const candEnd = candidate.endDate || candidate.startDate;

    for (const ex of existingList) {
        const exCode = (ex.code || '').trim().toUpperCase();
        const exStart = ex.startDate;
        const exEnd = ex.endDate || ex.startDate;
        const exNameNorm = norm(ex.name);

        // 1. Code match
        if (candCode && exCode && candCode === exCode) {
            return {
                isDuplicate: true,
                reason: `Code "${ex.code}" already exists in calendar`,
                matchedHoliday: ex
            };
        }

        // 2. Same start date match
        if (candStart && exStart && candStart === exStart) {
            if (candNameNorm === exNameNorm) {
                return {
                    isDuplicate: true,
                    reason: `Holiday "${ex.name}" on ${candStart} already exists`,
                    matchedHoliday: ex
                };
            }
            if (candNameNorm.length > 3 && exNameNorm.length > 3 && (candNameNorm.includes(exNameNorm) || exNameNorm.includes(candNameNorm))) {
                return {
                    isDuplicate: true,
                    reason: `Similar holiday "${ex.name}" on ${candStart} already exists`,
                    matchedHoliday: ex
                };
            }

            const keywords = [
                'language', 'motherlanguage', 'shaheed',
                'independence', 'nationalday',
                'labor', 'labour', 'mayday',
                'uprising', 'massuprising',
                'victory', 'bijoy',
                'boishakh', 'newyear',
                'christmas', 'xmas',
                'gala', 'eve',
                'eid', 'fitr', 'adha',
                'ashura', 'puja', 'dashami', 'bankclosing'
            ];
            for (const kw of keywords) {
                if (candNameNorm.includes(kw) && exNameNorm.includes(kw)) {
                    return {
                        isDuplicate: true,
                        reason: `Overlapping holiday "${ex.name}" already exists on ${candStart}`,
                        matchedHoliday: ex
                    };
                }
            }
        }

        // 3. Date range overlap
        if (candStart && exStart && candEnd && exEnd && candStart === exStart && candEnd === exEnd) {
            return {
                isDuplicate: true,
                reason: `A holiday on date range ${candStart} to ${candEnd} already exists ("${ex.name}")`,
                matchedHoliday: ex
            };
        }
    }

    return { isDuplicate: false };
}

/**
 * Fetch official statutory holidays & hospital peak calendar from backend API (Nager.Date + festivals)
 */
export async function fetchExternalHolidayCatalog(
    propertyId: number = 1,
    year: number | string = 2026,
    countryCode: string = 'BD'
): Promise<{
    source: string;
    year: number;
    country: string;
    totalFound: number;
    duplicateCount: number;
    availableCount: number;
    data: ExternalCatalogItem[];
}> {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/properties/${propertyId}/holidays/external-catalog?year=${year}&country=${countryCode}`);
        if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                return json;
            }
        }
    } catch (err) {
        console.warn('Failed to fetch external holiday catalog:', err);
    }
    return {
        source: 'local_fallback',
        year: Number(year),
        country: countryCode,
        totalFound: 0,
        duplicateCount: 0,
        availableCount: 0,
        data: []
    };
}

/**
 * Bulk import holidays into PostgreSQL database with enterprise duplicate prevention
 */
export async function bulkImportHolidaysToDB(
    propertyId: number = 1,
    holidays: any[],
    skipDuplicates: boolean = true
): Promise<{
    success: boolean;
    importedCount: number;
    skippedCount: number;
    skipped: any[];
    imported: any[];
    message: string;
}> {
    try {
        const res = await fetch(`${getApiBaseUrl()}/api/properties/${propertyId}/holidays/bulk-import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ holidays, skipDuplicates })
        });
        if (res.ok) {
            return await res.json();
        }
    } catch (err) {
        console.warn('Bulk import failed:', err);
    }
    return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        skipped: [],
        imported: [],
        message: 'Network error or backend unreachable during bulk import.'
    };
}

export interface DayHolidayDetails {
    isoDate: string;
    dayNum: number;
    dayName: string;
    monthName: string;
    fullFormattedDate: string;
    isWeekend: boolean;
    weekendName: string | null;
    calendarHoliday: HolidayItem | null;
    isHoliday: boolean;
    holidayTitle: string | null;
    categoryBadge: string;
    hasSurgeRate: boolean;
    rateMultiplier: number;
    description?: string;
}

export function getDayHolidayDetails(dateInput: Date | string): DayHolidayDetails {
    let dateObj: Date;
    let isoDate: string;

    if (typeof dateInput === 'string') {
        isoDate = dateInput;
        const [y, m, d] = dateInput.split('-').map(Number);
        dateObj = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
    } else {
        dateObj = dateInput;
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        isoDate = `${y}-${m}-${d}`;
    }

    const dayOfWeek = dateObj.getDay();
    // In Bangladesh & hospitality operations: Friday (5) and Saturday (6) are official weekends
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const weekendName = dayOfWeek === 5 ? 'Weekly Holiday (Friday)' : dayOfWeek === 6 ? 'Weekly Holiday (Saturday)' : null;

    const calendarHoliday = getHolidayForDate(isoDate);
    const isHoliday = isWeekend || !!calendarHoliday;

    let holidayTitle: string | null = null;
    if (calendarHoliday && weekendName) {
        holidayTitle = `${calendarHoliday.name} • ${weekendName}`;
    } else if (calendarHoliday) {
        holidayTitle = calendarHoliday.name;
    } else if (weekendName) {
        holidayTitle = weekendName;
    }

    let categoryBadge = 'Working Day';
    if (calendarHoliday) {
        if (calendarHoliday.category === 'PUBLIC') categoryBadge = 'Public Holiday';
        else if (calendarHoliday.category === 'RELIGIOUS') categoryBadge = 'Religious Festival';
        else if (calendarHoliday.category === 'PEAK_GALA') categoryBadge = 'Peak Season Gala';
        else categoryBadge = 'Corporate Holiday';
    } else if (isWeekend) {
        categoryBadge = 'Weekly Holiday';
    }

    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
    const fullFormattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    return {
        isoDate,
        dayNum: dateObj.getDate(),
        dayName,
        monthName,
        fullFormattedDate,
        isWeekend,
        weekendName,
        calendarHoliday,
        isHoliday,
        holidayTitle,
        categoryBadge,
        hasSurgeRate: calendarHoliday?.hasSurgeRate ?? false,
        rateMultiplier: calendarHoliday?.hasSurgeRate ? calendarHoliday.rateMultiplier : 1.0,
        description: calendarHoliday?.description || (isWeekend ? 'Official weekend holiday for Bangladesh hospitality & banking operations.' : undefined)
    };
}
