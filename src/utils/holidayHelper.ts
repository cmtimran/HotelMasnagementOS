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
    status: 'ACTIVE' | 'INACTIVE';
    description?: string;
    createdAt?: string;
}

export const STORAGE_KEY_HOLIDAYS = 'hotel_holidays_v1';

export const INITIAL_HOLIDAYS: HolidayItem[] = [
    {
        id: 'hol-001',
        code: 'NY-GALA-26',
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
        status: 'ACTIVE',
        description: "High occupancy seasonal peak. Compulsory rooftop ballroom gala & fireworks package.",
    },
    {
        id: 'hol-002',
        code: 'LANG-DAY-26',
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
        status: 'ACTIVE',
        description: 'Statutory government holiday. Standard rooms with diplomatic morning protocol.',
    },
    {
        id: 'hol-003',
        code: 'EID-FITR-26',
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
        status: 'ACTIVE',
        description: 'Major family vacation peak. High occupancy banquet and buffet dining operations.',
    },
    {
        id: 'hol-004',
        code: 'INDEP-26',
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
        status: 'ACTIVE',
        description: 'National commemoration. State diplomatic flags hoisted and security heightened.',
    },
    {
        id: 'hol-005',
        code: 'LABOR-26',
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
        status: 'ACTIVE',
        description: 'Statutory labor day. Roster compensation applied per labor court regulation.',
    },
    {
        id: 'hol-006',
        code: 'EID-ADHA-26',
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
        status: 'ACTIVE',
        description: 'Festival period with high suite bookings and specialized culinary menu rotations.',
    },
    {
        id: 'hol-006b',
        code: 'BANK-HOL-26',
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
        status: 'ACTIVE',
        description: 'Statutory bank holiday in Bangladesh. Banking transactions paused, corporate travel heightened.',
    },
    {
        id: 'hol-006c',
        code: 'ASHURA-26',
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
        status: 'ACTIVE',
        description: 'National religious public holiday. Peaceful atmosphere and diplomatic security vigilance.',
    },
    {
        id: 'hol-007',
        code: 'SUMMER-PEAK-26',
        name: 'Mid-Summer Tourism High Season',
        category: 'PEAK_GALA',
        startDate: '2026-08-01',
        endDate: '2026-08-08',
        daysCount: 8,
        hasSurgeRate: true,
        rateMultiplier: 1.25,
        minStayNights: 3,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 1.5,
        compOffCredit: false,
        minimumStaffingAlert: 'HIGH_ALERT',
        status: 'ACTIVE',
        description: 'International travel peak period with heightened pool & wellness activities.',
    },
    {
        id: 'hol-008',
        code: 'VICTORY-26',
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
        status: 'ACTIVE',
        description: 'National holiday with celebratory executive brunch at the Grand Dining Hall.',
    },
    {
        id: 'hol-009',
        code: 'XMAS-26',
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
        status: 'ACTIVE',
        description: 'Global holiday with festive Christmas Eve dinner buffet and gingerbread lobby house.',
    }
];

export function getStoredHolidays(): HolidayItem[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_HOLIDAYS);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Merge default holidays that might be missing in older stored lists
                const existingCodes = new Set(parsed.map((p: any) => p.code));
                const missingDefaults = INITIAL_HOLIDAYS.filter(d => !existingCodes.has(d.code));
                if (missingDefaults.length > 0) {
                    const combined = [...parsed, ...missingDefaults];
                    localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(combined));
                    return combined;
                }
                return parsed;
            }
        }
    } catch (e) {
        console.error('Failed to parse stored holidays:', e);
    }
    return INITIAL_HOLIDAYS;
}

export function getActiveHolidays(): HolidayItem[] {
    return getStoredHolidays().filter(h => h.status === 'ACTIVE');
}

export function getHolidayForDate(isoDate: string): HolidayItem | null {
    const list = getActiveHolidays();
    return list.find(h => isoDate >= h.startDate && isoDate <= h.endDate) || null;
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
