/**
 * Unified Hotel Room Inventory & Anti-Overbooking Concurrency Engine
 * 
 * Provides:
 * 1. Mathematical Interval Overlap Engine with Hotel Same-Day Turnaround support.
 * 2. Distributed Optimistic Soft Lock Engine (hotel_room_locks) with auto-expiry TTL.
 * 3. Cross-Tab / Cross-Executive Real-Time Broadcasting (hotel_pms_sync).
 * 4. Atomic Two-Phase Pre-Commit Verification Guard.
 * 5. Single Source of Truth (SSOT) room inventory synced with RoomManagement.
 */

import { getApiBaseUrl } from './apiUrl';
import { isRoomOOOForDates, isRoomOOSForDates } from './outOfOrderEngine';

export interface CanonicalRoom {
    id: number;
    number: string;
    name: string;
    buildingId: string;
    floorId: string;
    roomTypeId: string;
    roomTypeName: string;
    status: 'Active' | 'Out of Order' | 'Maintenance';
    housekeepingStatus: 'Clean' | 'Dirty' | 'Inspected';
    remarks?: string;
    isConnecting?: boolean;
    connectedTo?: string;
    viewType?: string;
    smokingAllowed?: boolean;
    smokingStatus?: string;
    smokingPolicy?: string;
    phoneExt?: string;
    lockId?: string;
    nearElevator?: boolean;
    baseRate?: number;
    bedConfiguration?: string;
}

export interface RoomLock {
    lockId: string;
    roomNumber: string;
    checkIn: string;
    checkOut: string;
    heldBy: string;
    createdAt: number;
    expiresAt: number; // epoch ms
}

export interface StoredReservation {
    id: number | string;
    reservationNumber: string;
    groupCode?: string;
    subBookingNumber?: string;
    registrationNumber?: string;
    registeredAt?: string;
    folioNumber?: string;
    guestName: string;
    roomNumber: string;
    roomType: string;
    allocatedRooms?: string[];
    roomsList?: any[];
    groupRoomsList?: any[];
    checkIn: string;
    checkOut: string;
    status: string;
    [key: string]: any;
}

export const generateMasterReservationNumber = (dateStr?: string): string => {
    const today = dateStr || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seqKey = `pms_daily_seq_res_${today}`;
    let current = parseInt(localStorage.getItem(seqKey) || '0', 10);
    current += 1;
    localStorage.setItem(seqKey, String(current));
    return `RES-${today}${String(current).padStart(4, '0')}`;
};

export const generateGroupCode = (dateStr?: string): string => {
    const today = dateStr || new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seqKey = `pms_daily_seq_grp_${today}`;
    let current = parseInt(localStorage.getItem(seqKey) || '0', 10);
    current += 1;
    localStorage.setItem(seqKey, String(current));
    return `GRP-${today}-${String(current).padStart(4, '0')}`;
};

export const generateSubBookingNumber = (masterResNo: string, roomIndex: number): string => {
    return `${masterResNo}-${String(roomIndex).padStart(2, '0')}`;
};

export const generateRegistrationNumber = (resNo: string): string => {
    const clean = String(resNo || '').replace(/^RES-/, '') || Math.floor(100000 + Math.random() * 900000).toString();
    return `REG-${clean}`;
};

export const generateFolioNumber = (resNo: string): string => {
    const clean = String(resNo || '').replace(/^RES-/, '') || Math.floor(100000 + Math.random() * 900000).toString();
    return `FOL-${clean}`;
};

export interface DynamicRoomType {
    id: string | number;
    propertyId?: string | number;
    code: string;
    name: string;
    baseOccupancy: number;
    maxAdults: number;
    maxChildren: number;
    baseRate: number;
    extraBedRate: number;
    extraAdultPrice?: number;
    extraChildPrice?: number;
    size?: number;
    bedType?: string;
    viewType?: string;
    smokingPolicy?: string;
    amenities?: string[];
    photos?: string[];
    isConnecting?: boolean;
    showOnWebsite?: boolean;
    status?: string;
    description?: string;
}

export interface ConnectingSuiteComponent {
    roomTypeId: string;
    count: number;
    roomNumbers: string[];
}

export interface ConnectingSuite {
    id: number | string;
    propertyId?: number;
    name: string;
    inventoryLogic?: string;
    pricingStrategy?: string;
    fixedPrice?: number;
    status: string;
    componentRooms: ConnectingSuiteComponent[];
}

export const STORAGE_KEY_CONNECTING_SUITES = 'hotel_connecting_rooms_v1';

// One-time clean baseline purge of legacy mock demo data
if (typeof window !== 'undefined') {
    const PURGE_KEY = 'hotel_baseline_purged_v2';
    if (!localStorage.getItem(PURGE_KEY)) {
        try {
            [
                'hotel_rooms_inventory_v1',
                'hotel_rooms_prop_1',
                'hotel_rooms_prop_2',
                'hotel_room_types_v1',
                'hotel_room_types_prop_1',
                'hotel_room_types_prop_2',
                'hotel_connecting_rooms_v1',
                'hotel_connecting_rooms_prop_1',
                'hotel_connecting_rooms_prop_2',
                'hotel_reservations_v2',
                'hotel_reservations_v3',
                'hotel_reservations_prop_1',
                'hotel_reservations_prop_2',
                'hotel_guest_profiles_v2',
                'hotel_maintenance_tasks_v2',
                'hotel_housekeeping_discrepancies_v1',
                'hotel_housekeepers_roster_v1',
                'hotel_lost_and_found_v1',
                'hotel_rate_calendar_v2',
                'hotel_packages_v2',
                'hotel_meal_plans_v1'
            ].forEach(k => localStorage.removeItem(k));
            localStorage.setItem(PURGE_KEY, 'true');
        } catch {}
    }
}

export const getStoredConnectingSuites = (propertyId: number = 1): ConnectingSuite[] => {
    const propId = propertyId || getActivePropertyId();
    try {
        if (typeof window !== 'undefined') {
            const scopedKey = `hotel_connecting_rooms_prop_${propId}`;
            const saved = localStorage.getItem(scopedKey) || (propId === 1 ? localStorage.getItem(STORAGE_KEY_CONNECTING_SUITES) : null);
            if (saved !== null) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        }
    } catch {}
    return [];
};

export const saveConnectingSuites = (suites: ConnectingSuite[], propertyId?: number): void => {
    const propId = propertyId || getActivePropertyId();
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`hotel_connecting_rooms_prop_${propId}`, JSON.stringify(suites));
            if (propId === 1) {
                localStorage.setItem(STORAGE_KEY_CONNECTING_SUITES, JSON.stringify(suites));
            }
        }
    } catch {}
};

export const syncConnectingSuitesFromDB = async (propertyId: number = 1): Promise<ConnectingSuite[]> => {
    const propId = propertyId || getActivePropertyId();
    try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}/api/connecting-rooms?propertyId=${propId}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            saveConnectingSuites(json.data, propId);
            return json.data;
        }
    } catch {}
    return getStoredConnectingSuites(propId);
};

/**
 * Dynamically builds a mapping from room number to comma-separated partner room numbers
 * based on all active connecting suites configured in Settings.
 */
export const getConnectingPartnerMap = (propertyId?: number): Map<string, string> => {
    const propId = propertyId || getActivePropertyId();
    const suites = getStoredConnectingSuites(propId);
    const partnerMap = new Map<string, string>();
    suites.filter(s => s.status === 'Active').forEach(suite => {
        const suiteRooms: string[] = [];
        suite.componentRooms?.forEach(cr => {
            if (Array.isArray(cr.roomNumbers)) {
                cr.roomNumbers.forEach(n => {
                    const num = String(n).trim();
                    if (num && !suiteRooms.includes(num)) suiteRooms.push(num);
                });
            }
        });
        if (suiteRooms.length >= 2) {
            suiteRooms.forEach(rm => {
                const others = suiteRooms.filter(x => x !== rm);
                const existing = partnerMap.get(rm);
                const combined = existing ? Array.from(new Set([...existing.split(', ').map(s => s.trim()), ...others])) : others;
                partnerMap.set(rm, combined.join(', '));
            });
        }
    });
    return partnerMap;
};

const STORAGE_KEY_ROOM_TYPES = 'hotel_room_types_v1';

// Dynamic Database Baseline Seeds (synced directly with PostgreSQL room_types table)
export const DEFAULT_ROOM_TYPES: DynamicRoomType[] = [];

// Room Type ID to Name Map (dynamic compatibility helper powered by dynamic DB cache)
export const getRoomTypeNameById = (id: string | number): string => {
    const list = getDynamicRoomTypes();
    const found = list.find(t => String(t.id) === String(id));
    return found ? found.name : 'Room Category';
};

export const ROOM_TYPE_MAP: Record<string, string> = new Proxy({} as Record<string, string>, {
    get: (_target, prop: string) => {
        return getRoomTypeNameById(prop);
    }
});

/**
 * Canonical Room Type Matcher:
 * Matches room type names reliably even when one is "Presidential Royal Suite"
 * and the other is "Presidential Suite", or "Deluxe Twin" vs "Deluxe Double".
 */
export const isMatchingRoomType = (typeA?: string, typeB?: string): boolean => {
    if (!typeA || !typeB) return false;
    const a = typeA.trim().toLowerCase();
    const b = typeB.trim().toLowerCase();
    if (a === b) return true;
    const aIsConnecting = a.includes('connecting') || a.includes('interconnecting');
    const bIsConnecting = b.includes('connecting') || b.includes('interconnecting');
    if (aIsConnecting || bIsConnecting) {
        return aIsConnecting && bIsConnecting && (a.includes(b) || b.includes(a));
    }
    if (a.includes(b) || b.includes(a)) return true;
    if (a.includes('presidential') && b.includes('presidential')) return true;
    if (a.includes('executive') && b.includes('executive')) return true;
    if (a.includes('superior') && b.includes('superior')) return true;
    if (a.includes('deluxe') && b.includes('deluxe')) return true;
    if (a.includes('standard') && b.includes('standard')) return true;
    return false;
};

/**
 * Retrieves all registered Room Types dynamically cached from the database
 */
export const getDynamicRoomTypes = (propertyId?: number): DynamicRoomType[] => {
    const propId = propertyId || getActivePropertyId();
    try {
        if (typeof window !== 'undefined') {
            const scopedKey = `hotel_room_types_prop_${propId}`;
            const saved = localStorage.getItem(scopedKey) || (propId === 1 ? localStorage.getItem(STORAGE_KEY_ROOM_TYPES) : null);
            if (saved !== null) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        }
    } catch {}
    return [];
};

export const saveDynamicRoomTypes = (roomTypes: DynamicRoomType[], propertyId?: number): void => {
    const propId = propertyId || getActivePropertyId();
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`hotel_room_types_prop_${propId}`, JSON.stringify(roomTypes));
            if (propId === 1) {
                localStorage.setItem(STORAGE_KEY_ROOM_TYPES, JSON.stringify(roomTypes));
            }
        }
    } catch {}
};

export const saveCanonicalRooms = (rooms: CanonicalRoom[], propertyId?: number): void => {
    const propId = propertyId || getActivePropertyId();
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(`hotel_rooms_prop_${propId}`, JSON.stringify(rooms));
            if (propId === 1) {
                localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(rooms));
            }
        }
    } catch {}
};

export interface HotelGeneralSettings {
    checkInTime: string;
    checkOutTime: string;
    visitorIdentityRule: string;
    cancellationText?: string;
    childStayPolicy?: string;
    petPolicyText?: string;
    smokingPolicyText?: string;
    noShowPolicy?: string;
}

export const getHotelGeneralSettings = (propertyId?: number): HotelGeneralSettings => {
    const propId = propertyId || getActivePropertyId();
    try {
        if (typeof window !== 'undefined') {
            const unified = localStorage.getItem(`hotel_unified_settings_prop_${propId}`);
            if (unified) {
                const parsed = JSON.parse(unified);
                if (parsed.settings) {
                    return {
                        checkInTime: parsed.settings.checkInTime || '14:00',
                        checkOutTime: parsed.settings.checkOutTime || '12:00',
                        visitorIdentityRule: parsed.settings.visitorIdentityRule || 'Government-issued Photo ID / Passport required upon arrival.',
                        cancellationText: parsed.settings.cancellationText || 'Free cancellation up to 48 hours prior to standard check-in time.',
                        childStayPolicy: parsed.settings.childStayPolicy,
                        petPolicyText: parsed.settings.petPolicyText,
                        smokingPolicyText: parsed.settings.smokingPolicyText,
                        noShowPolicy: parsed.settings.noShowPolicy
                    };
                }
            }
            const general = localStorage.getItem('hotel_general_settings_v1');
            if (general) {
                const parsed = JSON.parse(general);
                return {
                    checkInTime: parsed.checkInTime || '14:00',
                    checkOutTime: parsed.checkOutTime || '12:00',
                    visitorIdentityRule: parsed.visitorIdentityRule || 'Government-issued Photo ID / Passport required upon arrival.',
                    cancellationText: parsed.cancellationText || 'Free cancellation up to 48 hours prior to standard check-in time.',
                    childStayPolicy: parsed.childStayPolicy,
                    petPolicyText: parsed.petPolicyText,
                    smokingPolicyText: parsed.smokingPolicyText,
                    noShowPolicy: parsed.noShowPolicy
                };
            }
        }
    } catch {}
    return {
        checkInTime: '14:00',
        checkOutTime: '12:00',
        visitorIdentityRule: 'Government-issued Photo ID / Passport required upon arrival.',
        cancellationText: 'Free cancellation up to 48 hours prior to standard check-in time.'
    };
};

/**
 * Dynamically resolves full reservation policies from General Settings and assigned room smoking policy
 */
export const getHotelReservationPolicies = (roomNumber?: string, propertyId?: number): string[] => {
    const settings = getHotelGeneralSettings(propertyId);
    const smoking = getRoomSmokingPolicy(roomNumber || '', propertyId);
    const policies: string[] = [
        smoking.guestFacingClause,
        `Standard Hotel Check-In: ${settings.checkInTime} | Check-Out: ${settings.checkOutTime}`,
        settings.visitorIdentityRule
    ];
    if (settings.cancellationText) {
        policies.push(settings.cancellationText);
    }
    if (settings.childStayPolicy) {
        policies.push(`Child Policy: ${settings.childStayPolicy}`);
    }
    return policies;
};

/**
 * Resolves standard rack rate for a room or room type dynamically from the database repository
 */
export const getStandardDailyRateForRoom = (roomNumber?: string, roomTypeName?: string): number => {
    const dynamicTypes = getDynamicRoomTypes();

    if (roomNumber) {
        const canonical = getCanonicalRooms().find(r => String(r.number) === String(roomNumber));
        if (canonical) {
            // Match by roomTypeId
            const matchedById = dynamicTypes.find(t => String(t.id) === String(canonical.roomTypeId));
            if (matchedById && Number(matchedById.baseRate) > 0) {
                return Number(matchedById.baseRate);
            }
            // Match by roomTypeName
            const matchedByName = dynamicTypes.find(t => 
                t.name.toLowerCase() === canonical.roomTypeName.toLowerCase() ||
                canonical.roomTypeName.toLowerCase().includes(t.name.toLowerCase())
            );
            if (matchedByName && Number(matchedByName.baseRate) > 0) {
                return Number(matchedByName.baseRate);
            }
        }
    }

    if (roomTypeName) {
        const suites = getStoredConnectingSuites();
        const foundSuite = suites.find(s => s.name.trim().toLowerCase() === roomTypeName.trim().toLowerCase());
        if (foundSuite) {
            if (Number(foundSuite.fixedPrice) > 0) return Number(foundSuite.fixedPrice);
            const suiteRooms = foundSuite.componentRooms.flatMap(c => c.roomNumbers || []);
            const sum = suiteRooms.reduce((acc, rn) => acc + getStandardDailyRateForRoom(rn), 0);
            if (sum > 0) return sum;
            return 6000;
        }

        const query = roomTypeName.trim().toLowerCase();
        const matched = dynamicTypes.find(t => 
            t.name.toLowerCase() === query ||
            t.code.toLowerCase() === query ||
            isMatchingRoomType(t.name, roomTypeName)
        );
        if (matched && Number(matched.baseRate) > 0) {
            return Number(matched.baseRate);
        }
    }

    return Number(dynamicTypes[0]?.baseRate || 3000);
};

/**
 * Dynamically resolves the base daily rate (before taxes) for any reservation or room
 */
export const resolveReservationDailyBaseRate = (res: any, roomNumber?: string): number => {
    if (!res) return getStandardDailyRateForRoom(roomNumber);
    // 1. Direct baseAmount / nights
    if (res.baseAmount && res.nights && res.nights > 0) {
        return Math.round(Number(res.baseAmount) / Number(res.nights));
    }
    // 2. roomsList item price/rate
    if (Array.isArray(res.roomsList) && res.roomsList.length > 0) {
        const matching = roomNumber 
            ? res.roomsList.find((r: any) => String(r.roomNumber) === String(roomNumber))
            : res.roomsList[0];
        const targetRoom = matching || res.roomsList[0];
        if (targetRoom && (targetRoom.rate || targetRoom.price || targetRoom.basePrice)) {
            return Number(targetRoom.rate || targetRoom.price || targetRoom.basePrice);
        }
    }
    // 3. direct ratePerNight / dailyRate / avgDailyRate
    if (res.ratePerNight) return Number(res.ratePerNight);
    if (res.dailyRate) return Number(res.dailyRate);
    if (res.avgDailyRate) return Number(res.avgDailyRate);
    // 4. totalAmount minus tax / nights
    if (res.totalAmount && res.nights && res.nights > 0) {
        const tax = Number(res.totalTaxAmount || res.taxDetails?.totalTaxAmount || 0);
        return Math.max(0, Math.round((Number(res.totalAmount) - tax) / Number(res.nights)));
    }
    return getStandardDailyRateForRoom(roomNumber || res.roomNumber, res.roomType);
};

export interface RoomTypeCapacity {
    baseOccupancy: number;
    maxAdults: number;
    maxChildren: number;
    maxOccupancy: number;
    extraAdultPrice: number;
    extraChildPrice: number;
    baseRate: number;
}

/**
 * Dynamically resolves capacity rules (base occupancy, max adults, max children, surcharges)
 * for any room type from the database cache or fallback heuristics.
 */
export const getRoomTypeCapacity = (roomTypeNameOrId?: string | number): RoomTypeCapacity => {
    const dynamicTypes = getDynamicRoomTypes();
    let matched: DynamicRoomType | undefined;

    if (roomTypeNameOrId !== undefined && roomTypeNameOrId !== null) {
        const queryStr = String(roomTypeNameOrId).trim().toLowerCase();
        if (queryStr.includes('connecting') || queryStr.includes('interconnecting')) {
            const suites = getStoredConnectingSuites();
            const foundSuite = suites.find(s => s.name.trim().toLowerCase() === queryStr || queryStr.includes(s.name.trim().toLowerCase()));
            const numRooms = foundSuite ? foundSuite.componentRooms.flatMap(c => c.roomNumbers || []).length : 2;
            const multiplier = Math.max(2, numRooms);
            return {
                baseOccupancy: multiplier * 2,
                maxAdults: multiplier * 2,
                maxChildren: multiplier * 1,
                maxOccupancy: multiplier * 3,
                extraAdultPrice: 1000,
                extraChildPrice: 500,
                baseRate: Number(foundSuite?.fixedPrice) || (multiplier * 3000)
            };
        }
        matched = dynamicTypes.find(t => 
            String(t.id) === String(roomTypeNameOrId) ||
            t.name.toLowerCase() === queryStr ||
            t.code.toLowerCase() === queryStr ||
            isMatchingRoomType(t.name, queryStr)
        );
    }

    if (!matched && dynamicTypes.length > 0) {
        matched = dynamicTypes[0];
    }

    const typeName = matched?.name?.toLowerCase() || String(roomTypeNameOrId || '').toLowerCase();
    const isSingle = typeName.includes('single');
    const isSuite = typeName.includes('suite') || typeName.includes('presidential') || typeName.includes('royal');
    const isKingOrDouble = typeName.includes('king') || typeName.includes('double') || typeName.includes('twin');

    const defaultBaseOccupancy = isSingle ? 1 : (isSuite ? 3 : 2);
    const defaultMaxAdults = isSingle ? 1 : (isSuite ? 4 : (isKingOrDouble ? 3 : 2));
    const defaultMaxChildren = isSingle ? 0 : 2;

    const baseOccupancy = Number(matched?.baseOccupancy) > 0 ? Number(matched!.baseOccupancy) : defaultBaseOccupancy;
    const maxAdults = Number(matched?.maxAdults) > 0 ? Number(matched!.maxAdults) : defaultMaxAdults;
    const maxChildren = matched?.maxChildren !== undefined ? Number(matched.maxChildren) : defaultMaxChildren;
    const maxOccupancy = Math.max(maxAdults + maxChildren, baseOccupancy);

    const extraAdultPrice = Number(matched?.extraAdultPrice || matched?.extraBedRate || 1000);
    const extraChildPrice = Number(matched?.extraChildPrice || Math.round(extraAdultPrice * 0.5));
    const baseRate = Number(matched?.baseRate || 3000);

    return {
        baseOccupancy,
        maxAdults,
        maxChildren,
        maxOccupancy,
        extraAdultPrice,
        extraChildPrice,
        baseRate
    };
};

/**
 * Dynamic Meal Plans cache helper (synced with PostgreSQL/SQLite meal_plans table)
 */
export const getDynamicMealPlans = (): any[] => {
    try {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hotel_meal_plans_v1');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        }
    } catch {}
    return [];
};

/**
 * Dynamic Hotel Packages cache helper (synced with PostgreSQL/SQLite packages table)
 */
export const getDynamicPackages = (): any[] => {
    try {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hotel_packages_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        }
    } catch {}
    return [];
};

/**
 * Hospitality Standard: Dynamically calculate room tariff based on Rate Plan, Room Type, and Occupancy
 */
export const calculateTariffForRatePlan = (
    ratePlanNameOrId: string | number,
    roomTypeName: string,
    canonicalBaseRate: number,
    adults: number = 2,
    children: number = 0,
    ratePlansList?: any[]
): number => {
    const capacity = getRoomTypeCapacity(roomTypeName);
    const safeAdults = Math.max(1, adults);
    const safeChildren = Math.max(0, children);

    if (!ratePlanNameOrId) {
        let standardTariff = canonicalBaseRate;
        if (safeAdults > capacity.baseOccupancy) {
            standardTariff += (safeAdults - capacity.baseOccupancy) * capacity.extraAdultPrice;
        }
        if (safeChildren > 0) {
            standardTariff += safeChildren * capacity.extraChildPrice;
        }
        return Math.max(0, Math.round(standardTariff));
    }

    // 1. Retrieve rate plans from argument or local storage
    let plans: any[] = ratePlansList || [];
    if (!plans || plans.length === 0) {
        try {
            const saved = localStorage.getItem('hotel_rate_plans_v1');
            if (saved) plans = JSON.parse(saved);
        } catch {}
    }

    if (!plans || plans.length === 0) {
        let fallbackTariff = canonicalBaseRate;
        if (safeAdults > capacity.baseOccupancy) {
            fallbackTariff += (safeAdults - capacity.baseOccupancy) * capacity.extraAdultPrice;
        }
        if (safeChildren > 0) {
            fallbackTariff += safeChildren * capacity.extraChildPrice;
        }
        return Math.max(0, Math.round(fallbackTariff));
    }

    const planQuery = String(ratePlanNameOrId).trim().toLowerCase();
    const plan = plans.find(p =>
        String(p.id) === String(ratePlanNameOrId) ||
        (p.name && p.name.trim().toLowerCase() === planQuery) ||
        (p.shortCode && p.shortCode.trim().toLowerCase() === planQuery)
    );

    if (!plan) {
        let fallbackTariff = canonicalBaseRate;
        if (safeAdults > capacity.baseOccupancy) {
            fallbackTariff += (safeAdults - capacity.baseOccupancy) * capacity.extraAdultPrice;
        }
        if (safeChildren > 0) {
            fallbackTariff += safeChildren * capacity.extraChildPrice;
        }
        return Math.max(0, Math.round(fallbackTariff));
    }

    // 2. Check explicit pricing for this room type within the selected Rate Plan
    const roomTypeQuery = roomTypeName.trim().toLowerCase();
    const pricingEntry = plan.pricing?.find((pr: any) => {
        const prType = String(pr.roomTypeId || '').trim().toLowerCase();
        return prType === roomTypeQuery ||
               roomTypeQuery.includes(prType) ||
               prType.includes(roomTypeQuery);
    });

    if (pricingEntry) {
        let tariff = 0;
        if (safeAdults <= 1) {
            tariff = Number(pricingEntry.baseRate) || canonicalBaseRate;
        } else if (safeAdults === 2) {
            tariff = Number(pricingEntry.doubleRate) || Number(pricingEntry.baseRate) || canonicalBaseRate;
        } else if (safeAdults === 3 && Number(pricingEntry.tripleRate) > 0) {
            tariff = Number(pricingEntry.tripleRate);
        } else {
            const baseOccRate = (safeAdults >= 3 && Number(pricingEntry.tripleRate) > 0)
                ? Number(pricingEntry.tripleRate)
                : (Number(pricingEntry.doubleRate) || Number(pricingEntry.baseRate) || canonicalBaseRate);
            const extraAdultRate = Number(pricingEntry.extraAdult) || capacity.extraAdultPrice || Math.round(baseOccRate * 0.25);
            const extraPaxCount = (safeAdults >= 3 && Number(pricingEntry.tripleRate) > 0) ? (safeAdults - 3) : (safeAdults - 2);
            tariff = baseOccRate + (extraAdultRate * extraPaxCount);
        }

        if (safeChildren > 0) {
            const extraChildRate = Number(pricingEntry.extraChild) || capacity.extraChildPrice || 0;
            tariff += extraChildRate * safeChildren;
        }
        return Math.max(0, Math.round(tariff));
    }

    // 3. If no room-type-specific pricing row, calculate based on base rate + occupant surcharges
    let base = canonicalBaseRate;
    if (safeAdults > capacity.baseOccupancy) {
        base += (safeAdults - capacity.baseOccupancy) * capacity.extraAdultPrice;
    }
    if (safeChildren > 0) {
        base += safeChildren * capacity.extraChildPrice;
    }

    // 4. Dynamic Meal plan supplements directly from Database & Hotel Configuration
    if (plan.mealPlan) {
        const mealPlans = getDynamicMealPlans();
        const mealQuery = String(plan.mealPlan).trim().toUpperCase();
        const matchedMeal = mealPlans.find(m =>
            String(m.id) === String(plan.mealPlan) ||
            (m.shortCode && m.shortCode.trim().toUpperCase() === mealQuery) ||
            (m.name && m.name.trim().toUpperCase() === mealQuery)
        );

        if (matchedMeal) {
            const adultMealRate = Number(matchedMeal.sellingPriceAdult) || 0;
            const childMealRate = Number(matchedMeal.sellingPriceChild) || 0;
            base += (adultMealRate * safeAdults) + (childMealRate * safeChildren);
        } else {
            // Baseline fallback only if database meal plan table has not yet been seeded
            if (mealQuery === 'CP') {
                base += 500 * safeAdults + 300 * safeChildren;
            } else if (mealQuery === 'MAP') {
                base += 1200 * safeAdults + 700 * safeChildren;
            } else if (mealQuery === 'AP') {
                base += 2000 * safeAdults + 1200 * safeChildren;
            }
        }
    }

    return Math.max(0, Math.round(base));
};

// Canonical Property Inventory (Dynamic Baseline)
export const DEFAULT_CANONICAL_ROOMS: CanonicalRoom[] = [];

const STORAGE_KEY_ROOMS = 'hotel_rooms_inventory_v1';
const STORAGE_KEY_RESERVATIONS = 'hotel_reservations_v2';
const STORAGE_KEY_LOCKS = 'hotel_room_locks_v1';

/**
 * Parse any date representation (ISO YYYY-MM-DD, DD MMM YYYY, or Date object) into pure YYYY-MM-DD
 * completely immune to local timezone rollback bugs.
 */
export const formatToISODate = (input: string | Date | null | undefined): string => {
    if (!input) return '2026-07-01';
    if (typeof input === 'string') {
        const trimmed = input.trim();
        // 1. If already YYYY-MM-DD
        const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) {
            return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
        }
        // 2. If DD MMM YYYY (e.g. "02 Jul 2026" or "2 Jul 2026")
        const textMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
        if (textMatch) {
            const monthMap: Record<string, string> = {
                jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
            };
            const m = monthMap[textMatch[2].toLowerCase()];
            if (m) {
                return `${textMatch[3]}-${m}-${textMatch[1].padStart(2, '0')}`;
            }
        }
    }
    const d = typeof input === 'string' ? new Date(input) : input;
    if (d && !isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    return '2026-07-01';
};

/**
 * Format date to "DD MMM YYYY" (e.g. "02 Jul 2026") for Header display
 */
export const formatToDisplayDate = (isoOrText: string | null | undefined): string => {
    const iso = formatToISODate(isoOrText);
    const parts = iso.split('-');
    if (parts.length === 3) {
        const year = parts[0];
        const monthNum = parseInt(parts[1], 10);
        const day = parts[2].padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[monthNum - 1] || 'Jul';
        return `${day} ${monthName} ${year}`;
    }
    return '01 Jul 2026';
};

/**
 * Retrieve system operating date as YYYY-MM-DD
 */
export const getOperatingSystemDate = (): string => {
    try {
        const sys = typeof window !== 'undefined' ? (localStorage.getItem('hotel_system_date_iso') || localStorage.getItem('hotel_system_date')) : null;
        return formatToISODate(sys);
    } catch {
        return '2026-07-01';
    }
};

/**
 * Set system operating date, sync localStorage and broadcast across all tabs and components
 */
export const setOperatingSystemDate = (newDateStr: string): void => {
    const iso = formatToISODate(newDateStr);
    const display = formatToDisplayDate(iso);
    if (typeof window !== 'undefined') {
        localStorage.setItem('hotel_system_date', display);
        localStorage.setItem('hotel_system_date_iso', iso);
    }
    broadcastPMSEvent({
        type: 'SYSTEM_DATE_CHANGED',
        systemDate: iso,
        displayDate: display
    });
};

// Cross-tab real-time event bus
let pmsBroadcastChannel: BroadcastChannel | null = null;
try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        pmsBroadcastChannel = new BroadcastChannel('hotel_pms_sync');
    }
} catch (e) {
    console.warn('BroadcastChannel not supported in this environment', e);
}

export type PMSBroadcastMessage = (
    | { type: 'ROOM_LOCK_ACQUIRED'; lock: RoomLock }
    | { type: 'ROOM_LOCK_RELEASED'; lockId: string }
    | { type: 'RESERVATION_COMMITTED'; reservation: StoredReservation }
    | { type: 'RESERVATION_UPDATED'; reservationId: string | number }
    | { type: 'ROOM_STATUS_CHANGED'; roomNo: string; hkStatus?: string; foStatus?: string }
    | { type: 'FOLIO_UPDATED'; folioId?: string | number }
    | { type: 'SYSTEM_DATE_CHANGED'; systemDate: string; displayDate: string }
    | { type: 'INVENTORY_REFRESH' }
    | { type: 'GUESTS_UPDATED'; guestId?: string | number }
) & { propertyId?: number | string };

export const broadcastPMSEvent = (message: PMSBroadcastMessage) => {
    try {
        if (pmsBroadcastChannel) {
            pmsBroadcastChannel.postMessage(message);
        }
        // Trigger storage event for local tabs
        window.dispatchEvent(new CustomEvent('hotel_pms_sync_event', { detail: message }));

        // Cross-PC Real-Time Network Broadcast over LAN / Internet
        if (typeof window !== 'undefined') {
            const API_BASE = getApiBaseUrl();
            fetch(`${API_BASE}/api/realtime/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderClientId: localStorage.getItem('hotel_pms_terminal_id') || 'local',
                    event: {
                        ...message,
                        senderTerminal: localStorage.getItem('hotel_pms_terminal_id') || 'Desk',
                        timestamp: Date.now()
                    }
                })
            }).catch(() => {
                // Server offline fallback
            });
        }
    } catch (e) {
        console.warn('Failed to broadcast PMS event', e);
    }
};

export const subscribeToPMSEvents = (handler: (msg: PMSBroadcastMessage) => void): (() => void) => {
    const channelListener = (event: MessageEvent) => {
        handler(event.data);
    };

    const customEventListener = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        if (detail) handler(detail);
    };

    if (pmsBroadcastChannel) {
        pmsBroadcastChannel.addEventListener('message', channelListener);
    }
    window.addEventListener('hotel_pms_sync_event', customEventListener);

    return () => {
        if (pmsBroadcastChannel) {
            pmsBroadcastChannel.removeEventListener('message', channelListener);
        }
        window.removeEventListener('hotel_pms_sync_event', customEventListener);
    };
};

// =========================================================================
// 1. INTERVAL OVERLAP & TURNAROUND ENGINE
// =========================================================================

/**
 * Standard Hotel Date Interval Overlap Formula:
 * Two reservations overlap if and only if max(checkInA, checkInB) < min(checkOutA, checkOutB).
 * 
 * Same-day turnaround rule:
 * If Res A checks out on 2026-07-04 and Res B checks in on 2026-07-04,
 * max("2026-07-01", "2026-07-04") = "2026-07-04"
 * min("2026-07-04", "2026-07-06") = "2026-07-04"
 * Since "2026-07-04" < "2026-07-04" is FALSE, there is NO collision!
 */
export const checkIntervalOverlap = (
    checkInA: string,
    checkOutA: string,
    checkInB: string,
    checkOutB: string
): boolean => {
    if (!checkInA || !checkOutA || !checkInB || !checkOutB) return false;

    // Handle day-use (same-day in and out)
    const isDayUseA = checkInA === checkOutA;
    const isDayUseB = checkInB === checkOutB;

    if (isDayUseA && isDayUseB) {
        return checkInA === checkInB;
    }
    if (isDayUseA) {
        return checkInA >= checkInB && checkInA < checkOutB;
    }
    if (isDayUseB) {
        return checkInB >= checkInA && checkInB < checkOutA;
    }

    const maxCheckIn = checkInA > checkInB ? checkInA : checkInB;
    const minCheckOut = checkOutA < checkOutB ? checkOutA : checkOutB;

    return maxCheckIn < minCheckOut;
};

// =========================================================================
// 2. CANONICAL ROOM INVENTORY REPOSITORY (Scoped per Property)
// =========================================================================

export const getActivePropertyId = (): number => {
    if (typeof window === 'undefined') return 1;
    return Number(localStorage.getItem('hotel_active_property_id')) || 1;
};

export const getCanonicalRooms = (propertyId?: number): CanonicalRoom[] => {
    try {
        const propId = propertyId || getActivePropertyId();
        const scopedKey = `hotel_rooms_prop_${propId}`;
        const saved = typeof window !== 'undefined' 
            ? (localStorage.getItem(scopedKey) || (propId === 1 ? localStorage.getItem(STORAGE_KEY_ROOMS) : null))
            : null;
        const partnerMap = getConnectingPartnerMap(propId);

        if (saved !== null) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const dynamicTypes = getDynamicRoomTypes(propId);
                return parsed.map((r: any) => {
                    const roomNum = String(r.number).trim();
                    const dynamicPartner = partnerMap.get(roomNum);
                    const isConnecting = Boolean(dynamicPartner || r.isConnecting);
                    const connectedTo = dynamicPartner || r.connectedTo || '';
                    const matchedType = dynamicTypes.find(t => String(t.id) === String(r.roomTypeId));
                    return {
                        id: r.id,
                        number: roomNum,
                        name: r.name || `Room ${r.number}`,
                        buildingId: String(r.buildingId || '1'),
                        floorId: String(r.floorId || '1'),
                        roomTypeId: String(r.roomTypeId || '1'),
                        roomTypeName: r.roomTypeName || matchedType?.name || ROOM_TYPE_MAP[String(r.roomTypeId)] || 'Deluxe Double',
                        status: r.status || 'Active',
                        housekeepingStatus: r.housekeepingStatus || 'Clean',
                        isConnecting,
                        connectedTo,
                        smokingStatus: r.smokingStatus || r.smoking_status || matchedType?.smokingPolicy || 'Non-Smoking',
                        smokingAllowed: Boolean(r.smokingAllowed ?? ((r.smokingStatus || r.smoking_status || matchedType?.smokingPolicy || '') === 'Smoking')),
                        smokingPolicy: r.smokingPolicy || r.smokingStatus || matchedType?.smokingPolicy || 'Non-Smoking',
                        remarks: r.remarks
                    };
                });
            }
        }

        return [];
    } catch {}
    return [];
};

export interface RoomSmokingPolicyInfo {
    roomNumber: string;
    smokingStatus: 'Smoking' | 'Non-Smoking' | 'Balcony Smoking Only';
    isSmokingAllowed: boolean;
    policyBadgeText: string;
    guestFacingClause: string;
}

export const getRoomSmokingPolicy = (roomNumber: string | number, propertyId?: number): RoomSmokingPolicyInfo => {
    const rooms = getCanonicalRooms(propertyId);
    const room = rooms.find(r => String(r.number).trim() === String(roomNumber).trim());
    const dynamicTypes = getDynamicRoomTypes();
    const roomType = dynamicTypes.find(t => String(t.id) === String(room?.roomTypeId) || t.name === room?.roomTypeName);

    const rawStatus = String(room?.smokingStatus || room?.smokingPolicy || roomType?.smokingPolicy || 'Non-Smoking').trim();
    const isSmokingAllowed = rawStatus.toLowerCase().includes('smoking') && !rawStatus.toLowerCase().includes('non');
    const isBalconyOnly = rawStatus.toLowerCase().includes('balcony');

    const smokingStatus: 'Smoking' | 'Non-Smoking' | 'Balcony Smoking Only' = isBalconyOnly
        ? 'Balcony Smoking Only'
        : (isSmokingAllowed ? 'Smoking' : 'Non-Smoking');

    const policyBadgeText = isBalconyOnly
        ? 'Balcony Smoking Only'
        : (isSmokingAllowed ? 'Smoking Permitted' : 'Non-Smoking Room');

    const guestFacingClause = isBalconyOnly
        ? 'Balcony Smoking Only: Smoking is strictly prohibited inside the bedroom. Permitted exclusively on outdoor balconies with ashtray provided. BDT 5,000 ozone sanitization penalty for indoor smoking.'
        : (isSmokingAllowed
            ? 'Smoking Permitted Room: Designated smoking accommodation. Guest agrees to utilize safety ashtrays and adhere to hotel fire safety protocols.'
            : 'Strict Non-Smoking Room Policy: This room is 100% smoke-free (including tobacco, e-cigarettes, vaping & shisha). An automatic BDT 5,000 deep cleaning and ozone sanitization fee will be charged to the folio for violations.');

    return {
        roomNumber: String(roomNumber),
        smokingStatus,
        isSmokingAllowed,
        policyBadgeText,
        guestFacingClause
    };
};

// =========================================================================
// 3. OPTIMISTIC SOFT LOCK ENGINE (hotel_room_locks)
// =========================================================================

export const getActiveLocks = (): RoomLock[] => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LOCKS);
        if (!raw) return [];
        const locks: RoomLock[] = JSON.parse(raw);
        const now = Date.now();
        // Clean up expired locks automatically (TTL enforcement)
        const validLocks = locks.filter(l => l.expiresAt > now);
        if (validLocks.length !== locks.length) {
            localStorage.setItem(STORAGE_KEY_LOCKS, JSON.stringify(validLocks));
        }
        return validLocks;
    } catch {
        return [];
    }
};

export const acquireRoomLock = (
    roomNumber: string,
    checkIn: string,
    checkOut: string,
    heldBy: string = 'Reservation Desk',
    durationMinutes: number = 7
): { success: boolean; lock?: RoomLock; conflict?: string } => {
    const activeLocks = getActiveLocks();
    const now = Date.now();

    // Check if another executive holds this room for overlapping stay
    const existingLock = activeLocks.find(l => 
        l.roomNumber === roomNumber &&
        checkIntervalOverlap(l.checkIn, l.checkOut, checkIn, checkOut)
    );

    if (existingLock) {
        const remainingSec = Math.max(0, Math.round((existingLock.expiresAt - now) / 1000));
        return {
            success: false,
            conflict: `Room ${roomNumber} is temporarily held by ${existingLock.heldBy} (${Math.floor(remainingSec / 60)}m ${remainingSec % 60}s remaining).`
        };
    }

    const newLock: RoomLock = {
        lockId: `lock-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        roomNumber,
        checkIn,
        checkOut,
        heldBy,
        createdAt: now,
        expiresAt: now + durationMinutes * 60 * 1000
    };

    activeLocks.push(newLock);
    localStorage.setItem(STORAGE_KEY_LOCKS, JSON.stringify(activeLocks));
    broadcastPMSEvent({ type: 'ROOM_LOCK_ACQUIRED', lock: newLock });

    return { success: true, lock: newLock };
};

export const releaseRoomLock = (lockId: string): void => {
    try {
        const activeLocks = getActiveLocks();
        const filtered = activeLocks.filter(l => l.lockId !== lockId);
        localStorage.setItem(STORAGE_KEY_LOCKS, JSON.stringify(filtered));
        broadcastPMSEvent({ type: 'ROOM_LOCK_RELEASED', lockId });
    } catch {}
};

export const releaseLocksForRooms = (roomNumbers: string[]): void => {
    try {
        const activeLocks = getActiveLocks();
        const roomSet = new Set(roomNumbers);
        const filtered = activeLocks.filter(l => !roomSet.has(l.roomNumber));
        localStorage.setItem(STORAGE_KEY_LOCKS, JSON.stringify(filtered));
    } catch {}
};

// =========================================================================
// 4. RESERVATIONS REPOSITORY & AVAILABILITY ENGINE
// =========================================================================

export const DEFAULT_STORED_RESERVATIONS: StoredReservation[] = [];

/**
 * Centralized Canonical Persistence for Reservations Cache.
 * Consolidates all legacy cache keys into a single source of truth.
 */
export const saveStoredReservations = (reservations: StoredReservation[], propertyId?: number): void => {
    try {
        if (typeof window !== 'undefined') {
            const propId = propertyId || getActivePropertyId();
            const scopedKey = `hotel_reservations_prop_${propId}`;
            const json = JSON.stringify(reservations);
            localStorage.setItem(scopedKey, json);
            if (propId === 1) {
                localStorage.setItem(STORAGE_KEY_RESERVATIONS, json);
            }
            // Clean up obsolete duplicate keys so browser storage is not wasted
            localStorage.removeItem('hotel_reservations_v3');
            localStorage.removeItem('hotel_reservations_v10');
        }
    } catch (e) {
        console.error('Failed to save reservations cache', e);
    }
};

export const getAllStoredReservations = (propertyId?: number): StoredReservation[] => {
    try {
        if (typeof window !== 'undefined') {
            const propId = propertyId || getActivePropertyId();
            const scopedKey = `hotel_reservations_prop_${propId}`;
            const saved = localStorage.getItem(scopedKey) || (propId === 1 ? (localStorage.getItem(STORAGE_KEY_RESERVATIONS) || localStorage.getItem('hotel_reservations_v2') || localStorage.getItem('hotel_reservations_v3')) : null);
            if (saved !== null) {
                const list = JSON.parse(saved);
                if (Array.isArray(list)) {
                    return list;
                }
            }
        }
    } catch {}
    return [];
};

/**
 * Reset all local storage reservations and inventory caches to a clean state
 */
export const clearAllLocalReservationsAndInventory = async () => {
    try {
        saveStoredReservations([]);
        localStorage.removeItem(STORAGE_KEY_RESERVATIONS);
        localStorage.removeItem('hotel_reservations_v3');
        localStorage.removeItem('hotel_reservations_v10');
        localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify([]));
        localStorage.setItem('hotel_room_locks', JSON.stringify([]));
        localStorage.setItem('hotel_holds_v2', JSON.stringify([]));
        localStorage.removeItem('hotel_folios_v2');
        localStorage.removeItem('hotel_folio_charges_v1');
        localStorage.removeItem('hotel_payments_v2');
        localStorage.removeItem('hotel_frontdesk_records_v1');

        if (typeof window !== 'undefined') {
            const API_BASE = getApiBaseUrl();
            await fetch(`${API_BASE}/api/bookings/reset`, { method: 'POST' }).catch(() => {});
        }
    } catch (e) {
        console.warn('Error clearing inventory:', e);
    }
    broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
};

export interface RoomAvailabilityStatus {
    room: CanonicalRoom;
    isAvailable: boolean;
    reason?: 'Out of Order' | 'Occupied' | 'Locked' | 'Maintenance';
    conflictingReservation?: {
        reservationNumber: string;
        guestName: string;
        checkIn: string;
        checkOut: string;
    };
    conflictingLock?: RoomLock;
    maintenanceBlock?: any;
    isOOSWarning?: boolean;
    oosWarningReason?: string;
}

/**
 * Returns full availability report for all or targeted rooms for a specific stay window.
 */
export const getAvailableRoomsForStay = (
    checkIn: string,
    checkOut: string,
    filterRoomType?: string,
    options?: {
        excludeReservationId?: string | number;
        currentSessionLockId?: string;
    }
): {
    availableRooms: CanonicalRoom[];
    allRoomsStatus: RoomAvailabilityStatus[];
    availableCount: number;
    totalCount: number;
} => {
    const allRooms = getCanonicalRooms();
    const allReservations = getAllStoredReservations();
    const activeLocks = getActiveLocks();

    const normalizedFilterType = filterRoomType?.trim().toLowerCase();

    const resultStatus: RoomAvailabilityStatus[] = allRooms.map(room => {
        // 1a. Check Date-Range Out Of Order (OOO) Blocks (Strict Inventory Deduction)
        const oooCheck = isRoomOOOForDates(room.number, checkIn, checkOut);
        if (oooCheck.isBlocked) {
            return {
                room,
                isAvailable: false,
                reason: 'Out of Order',
                maintenanceBlock: oooCheck.block
            };
        }

        // 1b. Check Date-Range Out Of Service (OOS) Warning
        const oosCheck = isRoomOOSForDates(room.number, checkIn, checkOut);

        // 1c. Check Legacy Physical Status (OOO / Maintenance)
        if (room.status === 'Out of Order') {
            return {
                room,
                isAvailable: false,
                reason: 'Out of Order'
            };
        }
        if (room.status === 'Maintenance') {
            return {
                room,
                isAvailable: false,
                reason: 'Maintenance'
            };
        }

        // 2. Check Overlapping Existing Reservations (including multi-room & split sub-stays)
        let matchedSubStayIn = '';
        let matchedSubStayOut = '';
        const conflictBooking = allReservations.find(res => {
            if (options?.excludeReservationId) {
                const excl = String(options.excludeReservationId);
                if (
                    String(res.id) === excl ||
                    String(res.reservationNumber) === excl ||
                    excl.startsWith(`${res.reservationNumber}-`)
                ) {
                    return false;
                }
            }
            const normStatus = String(res.status || '').toLowerCase();
            if (normStatus === 'cancelled' || normStatus === 'voided' || normStatus === 'checked-out' || normStatus === 'completed') {
                return false;
            }

            // First check room-level sub-stays in roomsList if present
            if (res.roomsList && Array.isArray(res.roomsList) && res.roomsList.length > 0) {
                const matchingSubs = res.roomsList.filter((sub: any) => {
                    const subStatus = String(sub.status || '').toLowerCase();
                    if (subStatus === 'cancelled' || subStatus === 'voided' || subStatus === 'checked-out') return false;
                    const assigned = Array.isArray(sub.assignedRooms) && sub.assignedRooms.length > 0
                        ? sub.assignedRooms.map(String)
                        : [String(sub.roomNumber || '')];
                    return assigned.includes(String(room.number));
                });

                for (const sub of matchingSubs) {
                    const subIn = sub.checkInDate || sub.checkIn || res.checkIn;
                    const subOut = sub.checkOutDate || sub.checkOut || res.checkOut;
                    if (checkIntervalOverlap(subIn, subOut, checkIn, checkOut)) {
                        matchedSubStayIn = subIn;
                        matchedSubStayOut = subOut;
                        return true;
                    }
                }
            }

            const allocatedRoomsList = res.allocatedRooms && res.allocatedRooms.length > 0
                ? res.allocatedRooms.map(String)
                : [String(res.roomNumber)];

            if (!allocatedRoomsList.includes(String(room.number))) {
                return false;
            }

            // If roomsList had entries for this room and none overlapped above, don't false-positive on master horizon
            if (res.roomsList && Array.isArray(res.roomsList) && res.roomsList.some((sub: any) => String(sub.roomNumber) === String(room.number))) {
                return false;
            }

            if (checkIntervalOverlap(res.checkIn, res.checkOut, checkIn, checkOut)) {
                matchedSubStayIn = res.checkIn;
                matchedSubStayOut = res.checkOut;
                return true;
            }
            return false;
        });

        if (conflictBooking) {
            return {
                room,
                isAvailable: false,
                reason: 'Occupied',
                conflictingReservation: {
                    reservationNumber: conflictBooking.reservationNumber,
                    guestName: conflictBooking.guestName,
                    checkIn: matchedSubStayIn || conflictBooking.checkIn,
                    checkOut: matchedSubStayOut || conflictBooking.checkOut
                }
            };
        }

        // 3. Check Overlapping Soft Locks (exclude current session's lock)
        const conflictLock = activeLocks.find(l => {
            if (options?.currentSessionLockId && l.lockId === options.currentSessionLockId) {
                return false;
            }
            if (l.roomNumber !== room.number) return false;
            return checkIntervalOverlap(l.checkIn, l.checkOut, checkIn, checkOut);
        });

        if (conflictLock) {
            return {
                room,
                isAvailable: false,
                reason: 'Locked',
                conflictingLock: conflictLock
            };
        }

        return {
            room,
            isAvailable: true,
            isOOSWarning: oosCheck.isWarning,
            oosWarningReason: oosCheck.reason,
            maintenanceBlock: oosCheck.block
        };
    });

    // Filter by roomType if specified
    const filteredStatus = normalizedFilterType
        ? resultStatus.filter(s => isMatchingRoomType(s.room.roomTypeName, normalizedFilterType))
        : resultStatus;

    const available = filteredStatus.filter(s => s.isAvailable).map(s => s.room);

    return {
        availableRooms: available,
        allRoomsStatus: resultStatus,
        availableCount: available.length,
        totalCount: filteredStatus.length
    };
};

// =========================================================================
// 5. ATOMIC TWO-PHASE PRE-COMMIT VALIDATION GUARD
// =========================================================================

export interface CommitValidationResult {
    success: boolean;
    errorTitle?: string;
    errorMessage?: string;
    conflictingRooms?: string[];
    suggestedAlternates?: {
        requestedRoom: string;
        roomType: string;
        alternatives: CanonicalRoom[];
    }[];
}

export const validateAndCommitReservation = (
    reservationData: StoredReservation,
    sessionLockIds?: string[]
): CommitValidationResult => {
    const { checkIn, checkOut, allocatedRooms, roomNumber } = reservationData;
    const targetRooms = allocatedRooms && allocatedRooms.length > 0 ? allocatedRooms : [roomNumber];

    // Phase 0: Prevent duplicate room selection within the same reservation payload
    const seenInRequest = new Set<string>();
    for (const rm of targetRooms) {
        const normRm = String(rm).trim();
        if (seenInRequest.has(normRm)) {
            return {
                success: false,
                errorTitle: 'Duplicate Room Selected',
                errorMessage: `Room ${normRm} is selected more than once in this reservation! Each room row must have a unique physical room.`,
                conflictingRooms: [normRm]
            };
        }
        seenInRequest.add(normRm);
    }

    // Phase 1: Re-verify all allocated rooms in real time right now
    const conflictingRooms: string[] = [];
    const conflictDetails: string[] = [];
    const suggestedAlternates: { requestedRoom: string; roomType: string; alternatives: CanonicalRoom[] }[] = [];

    const canonicalRooms = getCanonicalRooms();

    for (const roomNum of targetRooms) {
        const canonical = canonicalRooms.find(r => r.number === roomNum);
        const roomType = canonical?.roomTypeName || reservationData.roomType || 'Deluxe Double';

        // Check if there is a specific sub-stay date range for this room (Group Staggered Stay)
        const rowData = reservationData.roomsList?.find((r: any) => r.roomNumber === roomNum || (r.assignedRooms && r.assignedRooms.includes(roomNum)));
        const roomIn = rowData?.checkInDate || checkIn;
        const roomOut = rowData?.checkOutDate || checkOut;

        const check = getAvailableRoomsForStay(roomIn, roomOut, undefined, {
            excludeReservationId: reservationData.reservationNumber || reservationData.id
        });

        const status = check.allRoomsStatus.find(s => s.room.number === roomNum);

        if (!status || !status.isAvailable) {
            // Is it locked by our own session lock?
            const isOurOwnLock = sessionLockIds && status?.conflictingLock && sessionLockIds.includes(status.conflictingLock.lockId);
            if (!isOurOwnLock) {
                conflictingRooms.push(roomNum);
                if (status?.conflictingReservation) {
                    const cr = status.conflictingReservation;
                    conflictDetails.push(`Room ${roomNum} is already booked by ${cr.guestName} (${cr.reservationNumber}) from ${cr.checkIn} to ${cr.checkOut}`);
                } else {
                    conflictDetails.push(`Room ${roomNum} is currently ${status?.reason || 'unavailable'} for ${roomIn} to ${roomOut}`);
                }

                // Find same category available alternatives
                const sameCatAvailable = check.availableRooms.filter(r => 
                    r.roomTypeName === roomType && !targetRooms.includes(r.number)
                );
                suggestedAlternates.push({
                    requestedRoom: roomNum,
                    roomType,
                    alternatives: sameCatAvailable.slice(0, 3)
                });
            }
        }
    }

    if (conflictingRooms.length > 0) {
        return {
            success: false,
            errorTitle: 'Overbooking Prevented — Room Already Booked',
            errorMessage: conflictDetails.length > 0
                ? `${conflictDetails.join('; ')}.`
                : `Room(s) ${conflictingRooms.join(', ')} cannot be booked because they are already occupied or locked for ${checkIn} to ${checkOut}.`,
            conflictingRooms,
            suggestedAlternates
        };
    }

    // Phase 2: Commit Atomically to LocalStorage & Database
    try {
        const existing = getAllStoredReservations();
        const updated = [
            reservationData,
            ...existing.filter(r => String(r.id) !== String(reservationData.id) && r.reservationNumber !== reservationData.reservationNumber)
        ];
        saveStoredReservations(updated);

        // Direct Real-Time PostgreSQL Database Persistence
        if (typeof window !== 'undefined') {
            const API_BASE = getApiBaseUrl();
            fetch(`${API_BASE}/api/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reservationData)
            }).then(res => res.json()).then(resp => {
                if (resp.success && resp.data?.id) {
                    console.log(`✅ Reservation ${reservationData.reservationNumber} successfully persisted into relational PostgreSQL DB! (ID: ${resp.data.id})`);
                }
            }).catch(err => {
                console.warn('⚠️ Offline / Local cache fallback for DB reservation persistence:', err);
            });
        }

        // Release temporary session locks
        if (sessionLockIds && sessionLockIds.length > 0) {
            sessionLockIds.forEach(id => releaseRoomLock(id));
        } else {
            releaseLocksForRooms(targetRooms);
        }

        // Broadcast to all tabs/windows
        broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: reservationData });

        return { success: true };
    } catch (e: any) {
        return {
            success: false,
            errorTitle: 'Storage Commit Error',
            errorMessage: e?.message || 'Failed to persist reservation to storage.'
        };
    }
};

/**
 * Synchronize Reservations from PostgreSQL Relational Database
 */
export const syncReservationsFromDB = async (propertyId?: number | string): Promise<StoredReservation[]> => {
    if (typeof window === 'undefined') return getAllStoredReservations();
    try {
        const propId = propertyId || getActivePropertyId();
        const API_BASE = getApiBaseUrl();
        const url = `${API_BASE}/api/bookings?propertyId=${propId}`;
        const res = await fetch(url, {
            headers: {
                'x-property-id': String(propId)
            }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            const dbList: StoredReservation[] = json.data;
            saveStoredReservations(dbList, Number(propId));
            return dbList;
        }
    } catch (err) {
        console.warn('Could not sync reservations from PostgreSQL DB:', err);
    }
    return getAllStoredReservations();
};

/**
 * Update reservation status directly in PostgreSQL Database
 */
export const updateReservationStatusInDB = async (
    reservationId: string | number,
    newStatus: string
): Promise<boolean> => {
    const rawLower = String(newStatus || '').toLowerCase().replace(/_/g, '-');
    const normalizedUIStatus = (rawLower === 'in-house' || rawLower === 'arrived' || rawLower === 'checked-in')
        ? 'in-house'
        : (rawLower === 'completed' || rawLower === 'checked-out')
            ? 'checked-out'
            : (rawLower === 'hold' || rawLower === 'tentative')
                ? 'hold'
                : 'confirmed';

    const dbStatus = normalizedUIStatus === 'in-house'
        ? 'IN_HOUSE'
        : normalizedUIStatus === 'checked-out'
            ? 'COMPLETED'
            : normalizedUIStatus === 'hold'
                ? 'HOLD'
                : 'CONFIRMED';

    // 1. Optimistic immediate local storage update & instant event broadcast
    try {
        const existing = getAllStoredReservations();
        const targetStr = String(reservationId);
        const isCheckIn = normalizedUIStatus === 'in-house';
        const updated = existing.map(r => {
            if (String(r.id) === targetStr || r.reservationNumber === targetStr) {
                const regNo = isCheckIn ? (r.registrationNumber || generateRegistrationNumber(r.reservationNumber)) : r.registrationNumber;
                const folioNo = r.folioNumber || generateFolioNumber(r.reservationNumber);
                const regAt = isCheckIn ? (r.registeredAt || new Date().toISOString()) : r.registeredAt;
                return {
                    ...r,
                    status: normalizedUIStatus,
                    registrationNumber: regNo,
                    folioNumber: folioNo,
                    registeredAt: regAt
                };
            }
            return r;
        });
        saveStoredReservations(updated);
        broadcastPMSEvent({ type: 'RESERVATION_UPDATED', reservationId });
    } catch (storageErr) {
        console.warn('Failed to update local reservation cache:', storageErr);
    }

    // 2. Direct Relational Database update via REST API
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/${reservationId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: dbStatus })
        });
        const data = await res.json();
        if (data.success && data.data) {
            const rec = data.data;
            const existing = getAllStoredReservations();
            const targetStr = String(reservationId);
            const synced = existing.map(r => (String(r.id) === targetStr || r.reservationNumber === targetStr) ? { ...r, ...rec } : r);
            saveStoredReservations(synced);
        }
        return Boolean(data.success);
    } catch (err) {
        console.warn('Failed to update status in DB:', err);
        return true;
    }
};

/**
 * Update Room Housekeeping Status directly in Central Database & Broadcast to PMS
 */
export const updateRoomHousekeepingInDB = async (
    roomNo: string,
    housekeepingStatus: 'Clean' | 'Dirty' | 'Inspected',
    propertyId?: number
): Promise<boolean> => {
    try {
        const propId = propertyId || getActivePropertyId();
        const rooms = getCanonicalRooms(propId);
        const updated = rooms.map(r => r.number === roomNo ? { ...r, housekeepingStatus } : r);
        localStorage.setItem(`hotel_rooms_prop_${propId}`, JSON.stringify(updated));
        if (propId === 1) {
            localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(updated));
        }

        broadcastPMSEvent({
            type: 'ROOM_STATUS_CHANGED',
            propertyId: propId,
            roomNo,
            hkStatus: housekeepingStatus
        });

        if (typeof window !== 'undefined') {
            const API_BASE = getApiBaseUrl();
            await fetch(`${API_BASE}/api/rooms/${roomNo}/housekeeping`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-property-id': String(propId)
                },
                body: JSON.stringify({ status: housekeepingStatus.toUpperCase() })
            });
        }
        return true;
    } catch (e) {
        console.warn('Failed to update housekeeping status in DB:', e);
        return false;
    }
};

/**
 * Amend Stay directly in PostgreSQL Database (Persists across page refresh)
 */
export const amendStayInDB = async (
    reservationIdOrNo: string | number,
    newDeparture: string,
    newNights: number,
    extraData?: {
        roomNumber?: string;
        newTotalAmount?: number;
        newDueAmount?: number;
        newBaseAmount?: number;
        taxDetails?: any;
    }
): Promise<StoredReservation | null> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/${reservationIdOrNo}/amend`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                newDeparture,
                newNights,
                roomNumber: extraData?.roomNumber,
                newTotalAmount: extraData?.newTotalAmount,
                newDueAmount: extraData?.newDueAmount,
                newBaseAmount: extraData?.newBaseAmount,
                taxDetails: extraData?.taxDetails
            })
        });
        const data = await res.json();
        if (data.success && data.data) {
            const updatedRec: StoredReservation = data.data;
            const existing = getAllStoredReservations();
            const idx = existing.findIndex(r => String(r.id) === String(reservationIdOrNo) || r.reservationNumber === String(reservationIdOrNo));
            let newList: StoredReservation[];
            if (idx !== -1) {
                newList = existing.map((r, i) => i === idx ? { ...r, ...updatedRec } : r);
            } else {
                newList = [updatedRec, ...existing];
            }
            saveStoredReservations(newList);
            broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updatedRec });
            return updatedRec;
        }
    } catch (err) {
        console.warn('Failed to amend stay in DB:', err);
    }
    return null;
};

/**
 * Move Reservation Room directly in Database
 */
export const moveRoomInDB = async (
    reservationIdOrNo: string | number,
    newRoomNumber: string,
    newFromDate?: string,
    newToDate?: string,
    oldRoomNumber?: string
): Promise<StoredReservation | null> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/${reservationIdOrNo}/move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                newRoomNumber,
                newFromDate,
                newToDate,
                oldRoomNumber
            })
        });
        const data = await res.json();
        if (data.success && data.data) {
            const updatedRec: StoredReservation = data.data;
            const existing = getAllStoredReservations();
            const idx = existing.findIndex(r => String(r.id) === String(reservationIdOrNo) || r.reservationNumber === String(reservationIdOrNo));
            let newList: StoredReservation[];
            if (idx !== -1) {
                newList = existing.map((r, i) => i === idx ? { ...r, ...updatedRec } : r);
            } else {
                newList = [updatedRec, ...existing];
            }
            saveStoredReservations(newList);
            broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updatedRec });
            return updatedRec;
        }
    } catch (err) {
        console.warn('Failed to move room in DB:', err);
    }
    return null;
};

/**
 * Record Payment on Reservation in Database
 */
export const recordPaymentInDB = async (
    reservationIdOrNo: string | number,
    amount: number,
    paymentMethod: string = 'Cash',
    remarks: string = ''
): Promise<StoredReservation | null> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/${reservationIdOrNo}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, paymentMethod, remarks })
        });
        const data = await res.json();
        if (data.success && data.data) {
            const updatedRec: StoredReservation = data.data;
            const existing = getAllStoredReservations();
            const idx = existing.findIndex(r => String(r.id) === String(reservationIdOrNo) || r.reservationNumber === String(reservationIdOrNo));
            let newList: StoredReservation[];
            if (idx !== -1) {
                newList = existing.map((r, i) => i === idx ? { ...r, ...updatedRec } : r);
            } else {
                newList = [updatedRec, ...existing];
            }
            saveStoredReservations(newList);
            broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updatedRec });
            return updatedRec;
        }
    } catch (err) {
        console.warn('Failed to record payment in DB:', err);
    }
    return null;
};

/**
 * Split Room Stay in Database
 */
export const splitStayInDB = async (
    reservationIdOrNo: string | number,
    targetRoomNumber: string,
    splitDate?: string,
    fromDate?: string,
    toDate?: string
): Promise<StoredReservation | null> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/${reservationIdOrNo}/split`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetRoomNumber, splitDate, fromDate, toDate })
        });
        const data = await res.json();
        if (data.success && data.data) {
            const updatedRec: StoredReservation = data.data;
            const existing = getAllStoredReservations();
            const idx = existing.findIndex(r => String(r.id) === String(reservationIdOrNo) || r.reservationNumber === String(reservationIdOrNo));
            let newList: StoredReservation[];
            if (idx !== -1) {
                newList = existing.map((r, i) => i === idx ? { ...r, ...updatedRec } : r);
            } else {
                newList = [updatedRec, ...existing];
            }
            saveStoredReservations(newList);
            broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updatedRec });
            return updatedRec;
        }
    } catch (err) {
        console.warn('Failed to split room stay in DB:', err);
    }
    return null;
};

/**
 * Hold Reservation in Database
 */
export const holdReservationInDB = async (
    reservationIdOrNo: string | number,
    startDate?: string,
    endDate?: string,
    reason?: string
): Promise<StoredReservation | null> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/${reservationIdOrNo}/hold`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ startDate, endDate, reason })
        });
        const data = await res.json();
        if (data.success && data.data) {
            const updatedRec: StoredReservation = data.data;
            const existing = getAllStoredReservations();
            const idx = existing.findIndex(r => String(r.id) === String(reservationIdOrNo) || r.reservationNumber === String(reservationIdOrNo));
            let newList: StoredReservation[];
            if (idx !== -1) {
                newList = existing.map((r, i) => i === idx ? { ...r, ...updatedRec } : r);
            } else {
                newList = [updatedRec, ...existing];
            }
            saveStoredReservations(newList);
            broadcastPMSEvent({ type: 'RESERVATION_UPDATED', reservationId: reservationIdOrNo });
            return updatedRec;
        }
    } catch (err) {
        console.warn('Failed to hold reservation in DB:', err);
    }
    return null;
};

/**
 * Void Reservation in Database
 */
export const voidReservationInDB = async (
    reservationIdOrNo: string | number,
    reason: string = 'Voided'
): Promise<StoredReservation | null> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/${reservationIdOrNo}/void`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        const data = await res.json();
        if (data.success && data.data) {
            const updatedRec: StoredReservation = data.data;
            const existing = getAllStoredReservations();
            const newList = existing.filter(r => String(r.id) !== String(reservationIdOrNo) && r.reservationNumber !== String(reservationIdOrNo));
            saveStoredReservations(newList);
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            return updatedRec;
        }
    } catch (err) {
        console.warn('Failed to void reservation in DB:', err);
    }
    return null;
};

/**
 * Unassign Room in Database
 */
export const unassignRoomInDB = async (
    reservationIdOrNo: string | number,
    roomNumber?: string
): Promise<StoredReservation | null> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/${reservationIdOrNo}/unassign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomNumber })
        });
        const data = await res.json();
        if (data.success && data.data) {
            const updatedRec: StoredReservation = data.data;
            const existing = getAllStoredReservations();
            const newList = existing.map(r => (String(r.id) === String(reservationIdOrNo) || r.reservationNumber === String(reservationIdOrNo)) ? { ...r, roomNumber: 'Unassigned', allocatedRooms: [] } : r);
            saveStoredReservations(newList);
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            return updatedRec;
        }
    } catch (err) {
        console.warn('Failed to unassign room in DB:', err);
    }
    return null;
};

/**
 * Ungroup Reservation in Database
 */
export const ungroupReservationInDB = async (
    reservationIdOrNo: string | number,
    selectedRooms?: string[]
): Promise<StoredReservation | null> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/${reservationIdOrNo}/ungroup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selectedRooms })
        });
        const data = await res.json();
        if (data.success && data.data) {
            const updatedRec: StoredReservation = data.data;
            const existing = getAllStoredReservations();
            const newList = existing.map(r => (String(r.id) === String(reservationIdOrNo) || r.reservationNumber === String(reservationIdOrNo)) ? { ...r, isGroup: false } : r);
            saveStoredReservations(newList);
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            return updatedRec;
        }
    } catch (err) {
        console.warn('Failed to ungroup reservation in DB:', err);
    }
    return null;
};

/**
 * Change Group Owner in Database
 */
export const changeGroupOwnerInDB = async (
    reservationIdOrNo: string | number,
    newOwner: string
): Promise<StoredReservation | null> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/${reservationIdOrNo}/change-owner`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newOwner })
        });
        const data = await res.json();
        if (data.success && data.data) {
            const updatedRec: StoredReservation = data.data;
            const existing = getAllStoredReservations();
            const newList = existing.map(r => (String(r.id) === String(reservationIdOrNo) || r.reservationNumber === String(reservationIdOrNo)) ? { ...r, guestName: newOwner } : r);
            saveStoredReservations(newList);
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            return updatedRec;
        }
    } catch (err) {
        console.warn('Failed to change group owner in DB:', err);
    }
    return null;
};

/**
 * Link two reservations into a shared group code in Database without renumbering confirmation numbers
 */
export const linkBookingsInDB = async (
    targetReservationNumber: string,
    reservationToLinkNumber: string,
    propertyId: number = 1
): Promise<{ success: boolean; groupCode?: string; message?: string }> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/group/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetReservationNumber, reservationToLinkNumber, propertyId })
        });
        const data = await res.json();
        if (data.success) {
            await syncReservationsFromDB(propertyId);
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            return data;
        }
        return { success: false, message: data.error || 'Failed to link bookings' };
    } catch (err: any) {
        console.warn('Failed to link bookings in DB:', err);
        return { success: false, message: err?.message || 'Network error' };
    }
};

/**
 * Unlink reservation from its group in Database without changing confirmation number
 */
export const unlinkBookingInDB = async (
    reservationNumber: string,
    propertyId: number = 1
): Promise<{ success: boolean; message?: string }> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/group/unlink`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservationNumber, propertyId })
        });
        const data = await res.json();
        if (data.success) {
            await syncReservationsFromDB(propertyId);
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            return data;
        }
        return { success: false, message: data.error || 'Failed to unlink booking' };
    } catch (err: any) {
        console.warn('Failed to unlink booking in DB:', err);
        return { success: false, message: err?.message || 'Network error' };
    }
};

/**
 * Full Reservation Update in Database
 */
export const updateReservationInDB = async (
    reservationIdOrNo: string | number,
    payload: any
): Promise<StoredReservation | null> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/${reservationIdOrNo}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success && data.data) {
            const updatedRec: StoredReservation = data.data;
            const existing = getAllStoredReservations();
            const idx = existing.findIndex(r => String(r.id) === String(reservationIdOrNo) || r.reservationNumber === String(reservationIdOrNo));
            let newList: StoredReservation[];
            if (idx !== -1) {
                newList = existing.map((r, i) => i === idx ? { ...r, ...updatedRec } : r);
            } else {
                newList = [updatedRec, ...existing];
            }
            localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(newList));
            localStorage.setItem('hotel_reservations_v3', JSON.stringify(newList));
            broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updatedRec });
            return updatedRec;
        }
    } catch (err) {
        console.warn('Failed to update reservation in DB:', err);
    }
    return null;
};

/**
 * Delete or cancel reservation directly in PostgreSQL Database
 */
export const deleteReservationInDB = async (
    reservationId: string | number
): Promise<boolean> => {
    try {
        const API_BASE = getApiBaseUrl();
        const res = await fetch(`${API_BASE}/api/bookings/${reservationId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            const existing = getAllStoredReservations();
            const updated = existing.filter(r => String(r.id) !== String(reservationId));
            localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(updated));
            localStorage.setItem('hotel_reservations_v3', JSON.stringify(updated));
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            return true;
        }
    } catch (err) {
        console.warn('Failed to delete reservation in DB:', err);
    }
    return false;
};

/**
 * Synchronize Dynamic Room Types and Canonical Rooms directly from the PostgreSQL database
 */
export const syncRoomTypesAndRoomsFromDB = async (
    targetPropertyId?: number
): Promise<{ roomTypes: DynamicRoomType[]; rooms: CanonicalRoom[] }> => {
    if (typeof window === 'undefined') {
        return { roomTypes: getDynamicRoomTypes(), rooms: getCanonicalRooms() };
    }
    const propId = targetPropertyId || Number(localStorage.getItem('hotel_active_property_id')) || 1;
    try {
        const API_BASE = getApiBaseUrl();
        // Fetch property details containing dynamic roomTypes and physical rooms from database
        const res = await fetch(`${API_BASE}/api/properties/${propId}`);
        const json = await res.json();
        if (json.success && json.data) {
            const { roomTypes, rooms } = json.data;
            let mappedTypes: DynamicRoomType[] = [];
            if (Array.isArray(roomTypes) && roomTypes.length > 0) {
                mappedTypes = roomTypes.map((rt: any) => ({
                    id: rt.id,
                    propertyId: rt.property_id,
                    code: rt.code,
                    name: rt.name,
                    baseOccupancy: Number(rt.base_occupancy || 2),
                    maxAdults: Number(rt.max_adults || rt.max_occupancy || 2),
                    maxChildren: Number(rt.max_children || rt.max_child || 1),
                    baseRate: Number(rt.base_rate || 3000),
                    extraBedRate: Number(rt.extra_bed_rate || 1000),
                    extraAdultPrice: Number(rt.extra_adult_price || 1000),
                    extraChildPrice: Number(rt.extra_child_price || 500),
                    size: Number(rt.size || 350),
                    bedType: rt.bed_type || 'King',
                    viewType: rt.view_type || 'City View',
                    smokingPolicy: rt.smoking_policy || 'Non-Smoking',
                    amenities: Array.isArray(rt.amenities) ? rt.amenities : (typeof rt.amenities === 'string' ? JSON.parse(rt.amenities || '[]') : []),
                    photos: Array.isArray(rt.photos) ? rt.photos : (typeof rt.photos === 'string' ? JSON.parse(rt.photos || '[]') : []),
                    isConnecting: Boolean(rt.is_connecting),
                    showOnWebsite: rt.show_on_website ?? true,
                    status: rt.status || 'Active',
                    description: rt.description
                }));
                localStorage.setItem(`hotel_room_types_prop_${propId}`, JSON.stringify(mappedTypes));
                if (propId === 1) {
                    localStorage.setItem(STORAGE_KEY_ROOM_TYPES, JSON.stringify(mappedTypes));
                }
            }

            let mappedRooms: CanonicalRoom[] = [];
            if (Array.isArray(rooms) && rooms.length > 0) {
                mappedRooms = rooms.map((r: any) => ({
                    id: r.id,
                    number: String(r.room_number || r.number || r.roomNo || ''),
                    name: r.name || `Room ${r.room_number || r.number || r.roomNo || ''}`,
                    buildingId: String(r.building_id || r.buildingId || '1'),
                    floorId: String(r.floor_id || r.floorId || '1'),
                    roomTypeId: String(r.room_type_id || r.roomTypeId || '1'),
                    roomTypeName: r.room_type_name || (mappedTypes.find(t => String(t.id) === String(r.room_type_id || r.roomTypeId))?.name) || 'Deluxe Double',
                    status: r.status === 'ACTIVE' || r.status === 'Active' ? 'Active' : (r.status === 'OUT_OF_ORDER' || r.status === 'Out of Order' ? 'Out of Order' : 'Maintenance'),
                    housekeepingStatus: r.housekeeping_status === 'CLEAN' || r.housekeepingStatus === 'Clean' ? 'Clean' : (r.housekeeping_status === 'DIRTY' || r.housekeepingStatus === 'Dirty' ? 'Dirty' : 'Inspected'),
                    phoneExt: r.phone_ext || r.phoneExt || '',
                    lockId: r.lock_id || r.lockId || '',
                    isConnecting: Boolean(r.is_connecting || r.isConnecting),
                    connectedTo: r.connected_to || r.connectedTo || '',
                    smokingStatus: r.smoking_status || r.smokingStatus || (mappedTypes.find(t => String(t.id) === String(r.room_type_id || r.roomTypeId))?.smokingPolicy) || 'Non-Smoking',
                    smokingAllowed: (r.smoking_status || r.smokingStatus || '') === 'Smoking' || (mappedTypes.find(t => String(t.id) === String(r.room_type_id || r.roomTypeId))?.smokingPolicy) === 'Smoking',
                    smokingPolicy: r.smoking_status || r.smokingStatus || (mappedTypes.find(t => String(t.id) === String(r.room_type_id || r.roomTypeId))?.smokingPolicy) || 'Non-Smoking',
                    nearElevator: Boolean(r.near_elevator || r.nearElevator),
                    remarks: r.remarks
                }));
            }
            localStorage.setItem(`hotel_rooms_prop_${propId}`, JSON.stringify(mappedRooms));
            if (propId === 1) {
                localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(mappedRooms));
            }

            return {
                roomTypes: mappedTypes.length > 0 ? mappedTypes : getDynamicRoomTypes(),
                rooms: mappedRooms.length > 0 ? mappedRooms : getCanonicalRooms()
            };
        }
    } catch (err) {
        console.warn('Could not sync dynamic room types from relational DB, using cached repository:', err);
    }
    return { roomTypes: getDynamicRoomTypes(), rooms: getCanonicalRooms() };
};

/**
 * Synchronize Dynamic Rate Plans, Meal Plans, and Packages directly from the database
 */
export const syncRatesAndPlansFromDB = async (targetPropertyId?: number): Promise<void> => {
    if (typeof window === 'undefined') return;
    const propId = targetPropertyId || Number(localStorage.getItem('hotel_active_property_id')) || 1;
    const API_BASE = getApiBaseUrl();
    try {
        const [plansRes, mealsRes, pkgsRes] = await Promise.all([
            fetch(`${API_BASE}/api/rates/plans?propertyId=${propId}`).catch(() => null),
            fetch(`${API_BASE}/api/rates/meal-plans?propertyId=${propId}`).catch(() => null),
            fetch(`${API_BASE}/api/rates/packages?propertyId=${propId}`).catch(() => null)
        ]);

        if (plansRes && plansRes.ok) {
            const json = await plansRes.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                localStorage.setItem('hotel_rate_plans_v1', JSON.stringify(json.data));
            }
        }
        if (mealsRes && mealsRes.ok) {
            const json = await mealsRes.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                localStorage.setItem('hotel_meal_plans_v1', JSON.stringify(json.data));
            }
        }
        if (pkgsRes && pkgsRes.ok) {
            const json = await pkgsRes.json();
            if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                localStorage.setItem('hotel_packages_v2', JSON.stringify(json.data));
            }
        }
    } catch (err) {
        console.warn('Could not sync rates and plans from DB:', err);
    }
};

// Initial background sync with Database on boot
if (typeof window !== 'undefined') {
    setTimeout(() => {
        syncRoomTypesAndRoomsFromDB();
        syncConnectingSuitesFromDB();
        syncReservationsFromDB();
        syncRatesAndPlansFromDB();
    }, 500);
}
