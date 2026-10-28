/**
 * Housekeeping Settings & Operations Engine
 * 
 * Implements Yanolja Cloud Solution (eZee PMS) and International Hospitality Standards:
 * 1. Automation & Turnover Rules (Auto Dirty on Checkout / Night Audit, Strict Check-In Guard).
 * 2. Long-Stay Cleaning Schedules & Frequencies (Stayover clean, Linen change cycles, Deep Clean).
 * 3. Housekeeper (Maid) Workload Management (Room Credits per type, Max Shift Credits, Auto-allocation).
 * 4. Priority & Rush Controls (Rush Room alerts, DND auto-escalation, Guest request sync).
 */

export interface HousekeepingSettings {
    // 1. Automation & Turnover Rules
    autoDirtyOnCheckout: boolean;
    autoDirtyOnNightAudit: boolean;
    requireInspectionBeforeCheckIn: boolean; // Strict Check-In Gate
    autoMarkCleanOnInspection: boolean;

    // 2. Long-Stay Cleaning Schedules & Frequencies
    defaultStayoverFrequency: 'daily' | 'every-2-days' | 'every-3-days' | 'on-request';
    linenChangeFrequencyDays: number; // e.g. every 2 or 3 days
    deepCleanIntervalDays: number; // e.g. every 30, 60 or 90 days
    towelPolicy: 'eco' | 'daily' | 'on-floor';

    // 3. Workload & Room Credits
    creditPerStandardRoom: number; // Default 1.0 (approx 30 mins)
    creditPerSuite: number; // Default 2.0 (approx 60 mins)
    creditPerConnectingSuite: number; // Default 3.0 (approx 90 mins)
    maxCreditsPerHousekeeper: number; // Default 14.0 credits per 8-hr shift
    autoAssignStrategy: 'by-credits' | 'by-floor' | 'equal-count';

    // 4. Operational Alerts & Quality Assurance
    rushRoomAlertMinutes: number; // e.g. 120 mins before arrival
    dndMaxHoursAlert: number; // e.g. 24 hrs
    showGuestRequestsInHousekeeping: boolean;
    enableInspectionChecklist: boolean;

    // 5. Room Status Configuration & Colors (eZee / YCS Standard)
    statusColors: {
        clean: string;
        inspected: string;
        dirty: string;
        outOfOrder: string;
        outOfService: string;
    };
    statusWorkflow: 'standard' | 'simplified'; // standard: Dirty -> Clean -> Inspected; simplified: Dirty -> Clean (auto sellable)
}

export interface Housekeeper {
    id: string;
    employeeId: string;
    name: string;
    phone: string;
    shift: 'Morning (07:00 - 15:30)' | 'Evening (15:00 - 23:30)' | 'Night (23:00 - 07:30)';
    assignedZone: string; // e.g. "Floor 1 & 2", "All Floors", "Building 1"
    status: 'active' | 'on-leave' | 'break';
    maxCredits: number;
    currentCredits?: number;
    assignedRoomsCount?: number;
}

export const DEFAULT_HOUSEKEEPING_SETTINGS: HousekeepingSettings = {
    autoDirtyOnCheckout: true,
    autoDirtyOnNightAudit: true,
    requireInspectionBeforeCheckIn: true,
    autoMarkCleanOnInspection: true,

    defaultStayoverFrequency: 'daily',
    linenChangeFrequencyDays: 3,
    deepCleanIntervalDays: 30,
    towelPolicy: 'eco',

    creditPerStandardRoom: 1.0,
    creditPerSuite: 2.0,
    creditPerConnectingSuite: 3.0,
    maxCreditsPerHousekeeper: 14.0,
    autoAssignStrategy: 'by-credits',

    rushRoomAlertMinutes: 120,
    dndMaxHoursAlert: 24,
    showGuestRequestsInHousekeeping: true,
    enableInspectionChecklist: true,

    statusColors: {
        clean: '#10b981',
        inspected: '#3b82f6',
        dirty: '#f43f5e',
        outOfOrder: '#475569',
        outOfService: '#f59e0b',
    },
    statusWorkflow: 'standard'
};

export const DEFAULT_HOUSEKEEPERS: Housekeeper[] = [
    {
        id: 'hk-1',
        employeeId: 'HK-101',
        name: 'Fatima Begum',
        phone: '+880 1711 223344',
        shift: 'Morning (07:00 - 15:30)',
        assignedZone: 'Floor 1',
        status: 'active',
        maxCredits: 14
    },
    {
        id: 'hk-2',
        employeeId: 'HK-102',
        name: 'Rahima Khatun',
        phone: '+880 1711 223355',
        shift: 'Morning (07:00 - 15:30)',
        assignedZone: 'Floor 2',
        status: 'active',
        maxCredits: 14
    },
    {
        id: 'hk-3',
        employeeId: 'HK-103',
        name: 'Salma Akter',
        phone: '+880 1711 223366',
        shift: 'Morning (07:00 - 15:30)',
        assignedZone: 'Floor 3',
        status: 'active',
        maxCredits: 14
    },
    {
        id: 'hk-4',
        employeeId: 'HK-104',
        name: 'Akhtar Hossain',
        phone: '+880 1711 223377',
        shift: 'Evening (15:00 - 23:30)',
        assignedZone: 'Floor 4 & 5',
        status: 'active',
        maxCredits: 14
    }
];

export const STORAGE_KEY_HK_SETTINGS = 'hotel_housekeeping_settings_v1';
export const STORAGE_KEY_HOUSEKEEPERS = 'hotel_housekeepers_roster_v1';

/**
 * Retrieve current Housekeeping Settings (scoped per property)
 */
export const getHousekeepingSettings = (propertyId: number = 1): HousekeepingSettings => {
    try {
        if (typeof window === 'undefined') return DEFAULT_HOUSEKEEPING_SETTINGS;
        const key = `${STORAGE_KEY_HK_SETTINGS}_prop_${propertyId}`;
        const raw = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEY_HK_SETTINGS);
        if (raw) {
            return { ...DEFAULT_HOUSEKEEPING_SETTINGS, ...JSON.parse(raw) };
        }
    } catch (e) {
        console.warn('Failed to load housekeeping settings', e);
    }
    return DEFAULT_HOUSEKEEPING_SETTINGS;
};

/**
 * Save Housekeeping Settings and broadcast update event
 */
export const saveHousekeepingSettings = (
    updated: Partial<HousekeepingSettings>,
    propertyId: number = 1
): HousekeepingSettings => {
    const current = getHousekeepingSettings(propertyId);
    const merged = { ...current, ...updated };
    try {
        if (typeof window !== 'undefined') {
            const key = `${STORAGE_KEY_HK_SETTINGS}_prop_${propertyId}`;
            localStorage.setItem(key, JSON.stringify(merged));
            localStorage.setItem(STORAGE_KEY_HK_SETTINGS, JSON.stringify(merged));
            window.dispatchEvent(new CustomEvent('hotel_housekeeping_settings_updated', {
                detail: { propertyId, settings: merged }
            }));
        }
    } catch (e) {
        console.warn('Failed to save housekeeping settings', e);
    }
    return merged;
};

/**
 * Retrieve Housekeepers roster
 */
export const getHousekeepersList = (propertyId: number = 1): Housekeeper[] => {
    try {
        if (typeof window === 'undefined') return DEFAULT_HOUSEKEEPERS;
        const key = `${STORAGE_KEY_HOUSEKEEPERS}_prop_${propertyId}`;
        const raw = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEY_HOUSEKEEPERS);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.warn('Failed to load housekeepers', e);
    }
    return DEFAULT_HOUSEKEEPERS;
};

/**
 * Save Housekeepers roster
 */
export const saveHousekeepersList = (list: Housekeeper[], propertyId: number = 1): void => {
    try {
        if (typeof window !== 'undefined') {
            const key = `${STORAGE_KEY_HOUSEKEEPERS}_prop_${propertyId}`;
            localStorage.setItem(key, JSON.stringify(list));
            localStorage.setItem(STORAGE_KEY_HOUSEKEEPERS, JSON.stringify(list));
            window.dispatchEvent(new CustomEvent('hotel_housekeepers_roster_updated', {
                detail: { propertyId, housekeepers: list }
            }));
        }
    } catch (e) {
        console.warn('Failed to save housekeepers', e);
    }
};

/**
 * Calculate workload credits for a room based on room type
 */
export const getRoomCredits = (roomType: string, settings: HousekeepingSettings): number => {
    const t = (roomType || '').toLowerCase();
    if (t.includes('presidential') || t.includes('connecting') || t.includes('royal')) {
        return settings.creditPerConnectingSuite || 3.0;
    }
    if (t.includes('suite') || t.includes('executive')) {
        return settings.creditPerSuite || 2.0;
    }
    return settings.creditPerStandardRoom || 1.0;
};

/**
 * Determines whether a stayover guest's room is due for full linen & bedsheet replacement today
 */
export const isLinenChangeDue = (
    checkInDate: string | undefined,
    currentDate: string | undefined,
    frequencyDays: number = 3
): boolean => {
    if (!checkInDate || !currentDate) return false;
    const inTime = new Date(checkInDate).getTime();
    const currTime = new Date(currentDate).getTime();
    const diffNights = Math.floor((currTime - inTime) / (1000 * 60 * 60 * 24));
    if (diffNights <= 0) return false;
    return diffNights % frequencyDays === 0;
};
