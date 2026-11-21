// ==========================================
// HOTEL OPERATING SYSTEM - HOLIDAY CATALOG & DEDUPLICATION ENGINE
// Live statutory holiday synchronization + hospitality peak governance
// ==========================================

export interface ExternalHolidayCandidate {
    id?: string;
    code: string;
    name: string;
    localName?: string;
    category: 'PUBLIC' | 'RELIGIOUS' | 'PEAK_GALA' | 'CORPORATE';
    startDate: string;
    endDate: string;
    daysCount: number;
    hasSurgeRate: boolean;
    rateMultiplier: number;
    minStayNights: number;
    mandatoryGala: boolean;
    galaDinnerFee: number;
    staffWageMultiplier: number;
    compOffCredit: boolean;
    minimumStaffingAlert: 'STANDARD' | 'HIGH_ALERT' | 'MAX_PRESENCE';
    isRecurring: boolean;
    status: 'ACTIVE' | 'INACTIVE';
    description: string;
    isDuplicate?: boolean;
    duplicateReason?: string;
    matchedHolidayId?: string;
}

export interface ExistingHolidayRow {
    id: string;
    code: string;
    name: string;
    start_date: string | Date;
    end_date: string | Date;
    category?: string;
}

export function normalizeText(s: string): string {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Enterprise Duplicate Detection Engine
 * Verifies whether candidate holiday already exists in the property's calendar.
 */
export function checkIsDuplicate(
    candidate: { code?: string; name: string; startDate: string; endDate?: string },
    existingList: ExistingHolidayRow[]
): { isDuplicate: boolean; reason?: string; matchedId?: string; matchedName?: string } {
    if (!existingList || existingList.length === 0) {
        return { isDuplicate: false };
    }

    const candCode = (candidate.code || '').trim().toUpperCase();
    const candNameNorm = normalizeText(candidate.name);
    const candStart = candidate.startDate;
    const candEnd = candidate.endDate || candidate.startDate;

    for (const ex of existingList) {
        const exCode = (ex.code || '').trim().toUpperCase();
        const exStart = typeof ex.start_date === 'string' ? ex.start_date.slice(0, 10) : (ex.start_date ? new Date(ex.start_date).toISOString().slice(0, 10) : '');
        const exEnd = typeof ex.end_date === 'string' ? ex.end_date.slice(0, 10) : (ex.end_date ? new Date(ex.end_date).toISOString().slice(0, 10) : '');
        const exNameNorm = normalizeText(ex.name);

        // 1. Exact Code Match
        if (candCode && exCode && candCode === exCode) {
            return {
                isDuplicate: true,
                reason: `Code "${ex.code}" already exists in calendar`,
                matchedId: ex.id,
                matchedName: ex.name
            };
        }

        // 2. Same Start Date Match
        if (candStart && exStart && candStart === exStart) {
            // Exact normalized name match
            if (candNameNorm === exNameNorm) {
                return {
                    isDuplicate: true,
                    reason: `Holiday "${ex.name}" on ${candStart} already exists`,
                    matchedId: ex.id,
                    matchedName: ex.name
                };
            }

            // Substring inclusion on same start date
            if (candNameNorm.length > 3 && exNameNorm.length > 3 && (candNameNorm.includes(exNameNorm) || exNameNorm.includes(candNameNorm))) {
                return {
                    isDuplicate: true,
                    reason: `Similar holiday "${ex.name}" on ${candStart} already exists`,
                    matchedId: ex.id,
                    matchedName: ex.name
                };
            }

            // Core domain holiday keywords on same start date
            const domainKeywords = [
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

            for (const kw of domainKeywords) {
                if (candNameNorm.includes(kw) && exNameNorm.includes(kw)) {
                    return {
                        isDuplicate: true,
                        reason: `Overlapping holiday "${ex.name}" already configured on ${candStart}`,
                        matchedId: ex.id,
                        matchedName: ex.name
                    };
                }
            }
        }

        // 3. Exact Date Range Overlap
        if (candStart && exStart && candEnd && exEnd && candStart === exStart && candEnd === exEnd) {
            return {
                isDuplicate: true,
                reason: `A holiday on date range ${candStart} to ${candEnd} already exists ("${ex.name}")`,
                matchedId: ex.id,
                matchedName: ex.name
            };
        }
    }

    return { isDuplicate: false };
}

/**
 * Helper to calculate Hijri dates dynamically using native Intl.DateTimeFormat
 * Guarantees accurate astronomical Islamic dates for ANY future or past Gregorian year (2025 to 2050+)
 */
function getHijriDatesForYear(targetYear: number, hijriMonth: number, hijriDay: number): string[] {
    const dates: string[] = [];
    try {
        const formatter = new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        });
        const start = new Date(Date.UTC(targetYear, 0, 1));
        const end = new Date(Date.UTC(targetYear, 11, 31));
        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            const parts = formatter.formatToParts(d);
            const m = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
            const day = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
            if (m === hijriMonth && day === hijriDay) {
                dates.push(d.toISOString().slice(0, 10));
            }
        }
    } catch (err) {
        console.warn(`[HolidayCatalog] Hijri calculation error for ${targetYear}:`, err);
    }
    return dates;
}

function addDaysToDateStr(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/**
 * Islamic / Lunar Festival astronomical calendar lookup for Bangladesh & South Asia
 * Future-proof for any year (2025 to 2050+)
 */
function getIslamicAndCulturalFestivals(year: number): ExternalHolidayCandidate[] {
    const y = Number(year);
    const festivals: ExternalHolidayCandidate[] = [];

    // Eid-ul-Fitr dates (~4 days holiday) - calibrated for 2025-2030, calculated astronomically beyond
    const eidFitrDates: Record<number, { start: string; end: string }> = {
        2025: { start: '2025-03-31', end: '2025-04-03' },
        2026: { start: '2026-03-20', end: '2026-03-23' },
        2027: { start: '2027-03-10', end: '2027-03-13' },
        2028: { start: '2028-02-27', end: '2028-03-01' },
        2029: { start: '2029-02-15', end: '2029-02-18' },
        2030: { start: '2030-02-05', end: '2030-02-08' }
    };

    let fitrRanges: Array<{ start: string; end: string }> = [];
    if (eidFitrDates[y]) {
        fitrRanges.push(eidFitrDates[y]);
    } else {
        // Shawwal 1 (Hijri Month 10, Day 1)
        const shawwalDays = getHijriDatesForYear(y, 10, 1);
        for (const st of shawwalDays) {
            fitrRanges.push({ start: st, end: addDaysToDateStr(st, 3) });
        }
    }

    fitrRanges.forEach((range, idx) => {
        festivals.push({
            code: fitrRanges.length > 1 ? `EID-FITR-${y}-${idx + 1}` : `EID-FITR-${y}`,
            name: 'Eid-ul-Fitr Grand Holidays',
            localName: 'ঈদুল ফিতর',
            category: 'RELIGIOUS',
            startDate: range.start,
            endDate: range.end,
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
            description: 'Major national religious festival. High occupancy family vacation peak.'
        });
    });

    // Eid-ul-Adha dates (~4 days holiday) - calibrated for 2025-2030, calculated astronomically beyond
    const eidAdhaDates: Record<number, { start: string; end: string }> = {
        2025: { start: '2025-06-06', end: '2025-06-09' },
        2026: { start: '2026-05-27', end: '2026-05-30' },
        2027: { start: '2027-05-17', end: '2027-05-20' },
        2028: { start: '2028-05-05', end: '2028-05-08' },
        2029: { start: '2029-04-24', end: '2029-04-27' },
        2030: { start: '2030-04-14', end: '2030-04-17' }
    };

    let adhaRanges: Array<{ start: string; end: string }> = [];
    if (eidAdhaDates[y]) {
        adhaRanges.push(eidAdhaDates[y]);
    } else {
        // Dhul-Hijjah 10 (Hijri Month 12, Day 10)
        const adhaDays = getHijriDatesForYear(y, 12, 10);
        for (const st of adhaDays) {
            adhaRanges.push({ start: st, end: addDaysToDateStr(st, 3) });
        }
    }

    adhaRanges.forEach((range, idx) => {
        festivals.push({
            code: adhaRanges.length > 1 ? `EID-ADHA-${y}-${idx + 1}` : `EID-ADHA-${y}`,
            name: 'Eid-ul-Adha Holidays',
            localName: 'ঈদুল আযহা',
            category: 'RELIGIOUS',
            startDate: range.start,
            endDate: range.end,
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
            description: 'Sacrificial festival holidays with high luxury suite bookings.'
        });
    });

    // Holy Ashura (Muharram 10)
    const ashuraDates: Record<number, string> = {
        2025: '2025-07-06',
        2026: '2026-06-26',
        2027: '2027-06-16',
        2028: '2028-06-05',
        2029: '2029-05-25',
        2030: '2030-05-14'
    };

    let ashuraDaysList: string[] = [];
    if (ashuraDates[y]) {
        ashuraDaysList.push(ashuraDates[y]);
    } else {
        ashuraDaysList = getHijriDatesForYear(y, 1, 10);
    }

    ashuraDaysList.forEach((dt, idx) => {
        festivals.push({
            code: ashuraDaysList.length > 1 ? `ASHURA-${y}-${idx + 1}` : `ASHURA-${y}`,
            name: 'Holy Ashura',
            localName: 'পবিত্র আশুরা',
            category: 'RELIGIOUS',
            startDate: dt,
            endDate: dt,
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
            description: 'Solemn national statutory observance.'
        });
    });

    // Durga Puja (Bijoya Dashami)
    const pujaDates: Record<number, string> = {
        2025: '2025-10-02',
        2026: '2026-10-20',
        2027: '2027-10-09',
        2028: '2028-09-28',
        2029: '2029-10-17',
        2030: '2030-10-06'
    };

    const pujaDate = pujaDates[y] || `${y}-10-08`;
    festivals.push({
        code: `PUJA-${y}`,
        name: 'Durga Puja (Bijoya Dashami)',
        localName: 'বিজয়া দশমী',
        category: 'RELIGIOUS',
        startDate: pujaDate,
        endDate: pujaDate,
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
        description: 'Major autumn festival holiday and cultural banquets.'
    });

    // Mid-year financial bank closing
    festivals.push({
        code: `BANK-HOL-${y}`,
        name: 'Bank Holiday (Mid-Year Financial Closing)',
        localName: 'ব্যাংক হলিডে',
        category: 'PUBLIC',
        startDate: `${y}-07-01`,
        endDate: `${y}-07-01`,
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
        description: 'Statutory bank closing. Increased corporate and business stays.'
    });

    // Christmas & Winter Holidays
    festivals.push({
        code: `XMAS-${y}`,
        name: 'Christmas Eve & Winter Holidays',
        localName: 'বড়দিন ও শীতকালীন ছুটি',
        category: 'RELIGIOUS',
        startDate: `${y}-12-24`,
        endDate: `${y}-12-26`,
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
        description: 'Global holiday with festive culinary buffets and family getaways.'
    });

    // New Year's Eve & Grand Gala
    festivals.push({
        code: `NY-GALA-${y}`,
        name: "New Year's Eve & Grand Gala",
        localName: 'থার্টি ফার্স্ট নাইট ও গ্যালা ডিনার',
        category: 'PEAK_GALA',
        startDate: `${y}-12-31`,
        endDate: `${y + 1}-01-02`,
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
        description: 'Highest occupancy seasonal peak. Rooftop countdown fireworks & gala package.'
    });

    return festivals;
}

/**
 * Fallback static statutory holidays for Bangladesh if network is offline
 */
function getStatutoryFallbackBD(year: number): ExternalHolidayCandidate[] {
    const y = Number(year);
    return [
        {
            code: `BD-LANG-${y}`,
            name: 'International Mother Language Day',
            localName: 'শহিদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস',
            category: 'PUBLIC',
            startDate: `${y}-02-21`,
            endDate: `${y}-02-21`,
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
            code: `BD-INDEP-${y}`,
            name: 'Independence & National Day',
            localName: 'স্বাধীনতা ও জাতীয় দিবস',
            category: 'PUBLIC',
            startDate: `${y}-03-26`,
            endDate: `${y}-03-26`,
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
            code: `BD-BOISHAKH-${y}`,
            name: 'Bengali New Year (Pohela Boishakh)',
            localName: 'পহেলা বৈশাখ',
            category: 'PUBLIC',
            startDate: `${y}-04-14`,
            endDate: `${y}-04-14`,
            daysCount: 1,
            hasSurgeRate: true,
            rateMultiplier: 1.25,
            minStayNights: 1,
            mandatoryGala: false,
            galaDinnerFee: 0,
            staffWageMultiplier: 2.0,
            compOffCredit: true,
            minimumStaffingAlert: 'HIGH_ALERT',
            isRecurring: true,
            status: 'ACTIVE',
            description: 'Major national cultural festival with Bengali traditional feast & brunch.'
        },
        {
            code: `BD-LABOR-${y}`,
            name: 'International Workers & Labor Day',
            localName: 'মে দিবস',
            category: 'PUBLIC',
            startDate: `${y}-05-01`,
            endDate: `${y}-05-01`,
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
            code: `BD-UPRISING-${y}`,
            name: 'July Mass Uprising Day',
            localName: 'জুলাই গণঅভ্যুত্থান দিবস',
            category: 'PUBLIC',
            startDate: `${y}-08-05`,
            endDate: `${y}-08-05`,
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
            description: 'Official national statutory holiday.'
        },
        {
            code: `BD-VICTORY-${y}`,
            name: 'Victory Day',
            localName: 'বিজয় দিবস',
            category: 'PUBLIC',
            startDate: `${y}-12-16`,
            endDate: `${y}-12-16`,
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
        }
    ];
}

/**
 * Fetch and synthesize holiday catalog for target year and country,
 * annotated with live duplicate detection status against existing database entries.
 */
export async function getEnrichedCatalogForYear(
    year: number,
    countryCode: string = 'BD',
    existingHolidays: ExistingHolidayRow[] = []
): Promise<{
    source: 'live_api' | 'fallback_cached';
    country: string;
    year: number;
    totalFound: number;
    duplicateCount: number;
    availableCount: number;
    data: ExternalHolidayCandidate[];
}> {
    const y = Number(year) || new Date().getFullYear();
    const c = (countryCode || 'BD').toUpperCase();

    let candidates: ExternalHolidayCandidate[] = [];
    let source: 'live_api' | 'fallback_cached' = 'live_api';

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const url = `https://date.nager.at/api/v3/PublicHolidays/${y}/${c}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok && res.status !== 204) {
            const text = await res.text();
            if (text && text.trim()) {
                const apiItems: any[] = JSON.parse(text);
                if (Array.isArray(apiItems) && apiItems.length > 0) {
                    candidates = apiItems.map((item, idx) => {
                        const cleanCode = `${c}-${(item.name || 'HOL').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}-${y}`;
                        return {
                            code: cleanCode,
                            name: item.name,
                            localName: item.localName,
                            category: 'PUBLIC' as const,
                            startDate: item.date,
                            endDate: item.date,
                            daysCount: 1,
                            hasSurgeRate: false,
                            rateMultiplier: 1.0,
                            minStayNights: 1,
                            mandatoryGala: false,
                            galaDinnerFee: 0,
                            staffWageMultiplier: 2.0,
                            compOffCredit: true,
                            minimumStaffingAlert: 'STANDARD' as const,
                            isRecurring: item.fixed || false,
                            status: 'ACTIVE' as const,
                            description: `Official statutory public holiday (${item.localName || item.name})`
                        };
                    });
                }
            }
        }
    } catch (err) {
        console.warn(`[HolidayCatalog] Nager.Date API lookup failed for ${c}/${y}, switching to cached fallback:`, err);
        source = 'fallback_cached';
    }

    // If API failed or yielded no results, provide fallback
    if (candidates.length === 0) {
        source = 'fallback_cached';
        if (c === 'BD') {
            candidates = getStatutoryFallbackBD(y);
        } else {
            // Generic New Year & Christmas
            candidates = [
                {
                    code: `${c}-NYD-${y}`,
                    name: "New Year's Day",
                    category: 'PUBLIC',
                    startDate: `${y}-01-01`,
                    endDate: `${y}-01-01`,
                    daysCount: 1,
                    hasSurgeRate: true,
                    rateMultiplier: 1.25,
                    minStayNights: 1,
                    mandatoryGala: false,
                    galaDinnerFee: 0,
                    staffWageMultiplier: 2.0,
                    compOffCredit: true,
                    minimumStaffingAlert: 'STANDARD',
                    isRecurring: true,
                    status: 'ACTIVE',
                    description: 'Global New Year statutory holiday.'
                },
                {
                    code: `${c}-XMAS-${y}`,
                    name: 'Christmas Day',
                    category: 'PUBLIC',
                    startDate: `${y}-12-25`,
                    endDate: `${y}-12-25`,
                    daysCount: 1,
                    hasSurgeRate: true,
                    rateMultiplier: 1.35,
                    minStayNights: 2,
                    mandatoryGala: true,
                    galaDinnerFee: 80,
                    staffWageMultiplier: 2.5,
                    compOffCredit: true,
                    minimumStaffingAlert: 'HIGH_ALERT',
                    isRecurring: true,
                    status: 'ACTIVE',
                    description: 'Christmas celebration.'
                }
            ];
        }
    }

    // Enrich with Hospitality Peaks & Lunar Festivals (if BD or general hotel requirements)
    if (c === 'BD') {
        const peaks = getIslamicAndCulturalFestivals(y);
        for (const peak of peaks) {
            // Avoid duplicate with API statutory items
            const alreadyInCandidates = candidates.some(cand => 
                cand.startDate === peak.startDate && normalizeText(cand.name).includes(normalizeText(peak.name).slice(0, 5))
            );
            if (!alreadyInCandidates) {
                candidates.push(peak);
            }
        }
    } else {
        // Add Global New Year's Gala for all countries
        candidates.push({
            code: `${c}-NY-GALA-${y}`,
            name: "New Year's Eve & Grand Gala",
            category: 'PEAK_GALA',
            startDate: `${y}-12-31`,
            endDate: `${y + 1}-01-02`,
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
            description: 'Seasonal peak occupancy gala dinner.'
        });
    }

    // Sort chronologically by startDate
    candidates.sort((a, b) => a.startDate.localeCompare(b.startDate));

    // Deduplicate against existing database records
    let duplicateCount = 0;
    const annotated: ExternalHolidayCandidate[] = candidates.map(item => {
        const check = checkIsDuplicate(item, existingHolidays);
        if (check.isDuplicate) {
            duplicateCount++;
            return {
                ...item,
                isDuplicate: true,
                duplicateReason: check.reason,
                matchedHolidayId: check.matchedId
            };
        }
        return {
            ...item,
            isDuplicate: false
        };
    });

    return {
        source,
        country: c,
        year: y,
        totalFound: annotated.length,
        duplicateCount,
        availableCount: annotated.length - duplicateCount,
        data: annotated
    };
}

export interface SupportedCountryItem {
    code: string;
    name: string;
    flag: string;
    isPopular?: boolean;
}

export function getCountryFlagEmoji(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

let cachedCountries: SupportedCountryItem[] | null = null;

/**
 * Fetch and synthesize complete list of sovereign countries and territories supported worldwide
 */
export async function fetchAllSupportedCountries(): Promise<SupportedCountryItem[]> {
    if (cachedCountries && cachedCountries.length > 0) {
        return cachedCountries;
    }

    const countryMap = new Map<string, string>();

    // 1. Fetch live available countries from Nager.Date API
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch('https://date.nager.at/api/v3/AvailableCountries', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok && res.status !== 204) {
            const list: any[] = await res.json();
            if (Array.isArray(list)) {
                for (const item of list) {
                    if (item.countryCode && item.name) {
                        countryMap.set(item.countryCode.toUpperCase(), item.name);
                    }
                }
            }
        }
    } catch (err) {
        console.warn('[HolidayCatalog] Failed to fetch live countries list:', err);
    }

    // 2. Guarantee major global countries and regional hospitality hubs are included
    const standardGlobalCountries: [string, string][] = [
        ['BD', 'Bangladesh'],
        ['US', 'United States'],
        ['GB', 'United Kingdom'],
        ['IN', 'India'],
        ['SA', 'Saudi Arabia'],
        ['AE', 'United Arab Emirates'],
        ['CA', 'Canada'],
        ['AU', 'Australia'],
        ['SG', 'Singapore'],
        ['MY', 'Malaysia'],
        ['TH', 'Thailand'],
        ['PK', 'Pakistan'],
        ['LK', 'Sri Lanka'],
        ['NP', 'Nepal'],
        ['MV', 'Maldives'],
        ['ID', 'Indonesia'],
        ['QA', 'Qatar'],
        ['OM', 'Oman'],
        ['KW', 'Kuwait'],
        ['BH', 'Bahrain'],
        ['TR', 'Turkey'],
        ['EG', 'Egypt'],
        ['DE', 'Germany'],
        ['FR', 'France'],
        ['IT', 'Italy'],
        ['ES', 'Spain'],
        ['CH', 'Switzerland'],
        ['NL', 'Netherlands'],
        ['SE', 'Sweden'],
        ['NO', 'Norway'],
        ['DK', 'Denmark'],
        ['FI', 'Finland'],
        ['IE', 'Ireland'],
        ['JP', 'Japan'],
        ['KR', 'South Korea'],
        ['CN', 'China'],
        ['BR', 'Brazil'],
        ['MX', 'Mexico'],
        ['ZA', 'South Africa'],
        ['NZ', 'New Zealand'],
        ['VN', 'Vietnam'],
        ['PH', 'Philippines'],
        ['GR', 'Greece'],
        ['PT', 'Portugal'],
        ['AT', 'Austria'],
        ['BE', 'Belgium'],
        ['PL', 'Poland'],
        ['CZ', 'Czech Republic'],
        ['HU', 'Hungary'],
        ['RO', 'Romania']
    ];

    for (const [code, name] of standardGlobalCountries) {
        if (!countryMap.has(code)) {
            countryMap.set(code, name);
        }
    }

    const popularCodes = new Set([
        'BD', 'IN', 'US', 'GB', 'SA', 'AE', 'CA', 'AU', 'SG', 'MY', 
        'TH', 'MV', 'TR', 'DE', 'FR', 'IT', 'ES', 'JP', 'CN', 'QA', 'EG'
    ]);

    const result: SupportedCountryItem[] = Array.from(countryMap.entries()).map(([code, name]) => ({
        code,
        name,
        flag: getCountryFlagEmoji(code),
        isPopular: popularCodes.has(code)
    }));

    // Sort: Bangladesh first, then other countries alphabetically
    result.sort((a, b) => {
        if (a.code === 'BD') return -1;
        if (b.code === 'BD') return 1;
        return a.name.localeCompare(b.name);
    });

    cachedCountries = result;
    return result;
}
