import { useState, useEffect, useCallback } from 'react';
import {
    getDynamicRatePlans,
    getDynamicPackages,
    calculateTariffForRatePlan,
    calculateStayTariffWithCalendar,
    validateRatePlanRestrictions,
    getRoomTypeCapacity,
    getStandardDailyRateForRoom,
    getActivePropertyId,
    subscribeToPMSEvents,
    type RatePlanRestrictionResult
} from '../utils/roomInventoryEngine';
import {
    calculateReservationTaxes,
    type TaxCalculationResult
} from '../utils/taxCalculationEngine';
import { getApiBaseUrl } from '../utils/apiUrl';
import { getHolidayForDate } from '../utils/holidayHelper';

export interface BookingEngineRoomItem {
    id?: number | string;
    roomType: string;
    ratePlan: string;
    packageId?: number | string;
    packageName?: string;
    roomNumber?: string;
    assignedRooms?: string[];
    adults: number;
    children: number;
    childrenAges?: number[];
    rate: number;
    noOfRooms?: number;
    roomsCount?: number;
    checkInDate?: string;
    checkOutDate?: string;
    nights?: number;
    roomDatesMap?: Record<string, { checkIn: string; checkOut: string; nights: number }>;
    extraBed?: {
        enabled?: boolean;
        count?: number;
        ratePerNight?: number;
    };
    pickup?: {
        enabled?: boolean;
        charge?: number;
    };
    servicesBundle?: {
        totalPrice?: number;
        [key: string]: any;
    };
}

export interface BookingEngineTotalsParams {
    roomsList: BookingEngineRoomItem[];
    stayNights: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    taxApplicable: boolean;
    selectedTaxConfigId?: number | string;
    totalPaidAmount?: number;
    checkInDate?: string;
}

export interface CalculateRoomRateParams {
    roomType: string;
    ratePlan: string;
    packageId?: number | string;
    adults: number;
    children: number;
    baseRate?: number;
    nights?: number;
    checkInDate?: string;
    childrenAges?: number[];
    extraBed?: boolean;
    extraBedFee?: number;
}

export const useReservationBookingEngine = () => {
    // 1. Dynamic Rate Plans
    const [availableRatePlans, setAvailableRatePlans] = useState<any[]>(() => {
        const dyn = getDynamicRatePlans();
        return dyn.length > 0 ? dyn : [];
    });

    // 2. Dynamic Packages
    const [availablePackages, setAvailablePackages] = useState<any[]>(() => {
        const propId = getActivePropertyId();
        const pkgs = getDynamicPackages(propId);
        return pkgs.length > 0 ? pkgs : [];
    });

    const [isLoading, setIsLoading] = useState(false);

    // Sync Rate Plans & Packages dynamically from PostgreSQL Database & Local Storage
    const reloadOffers = useCallback(() => {
        const propId = getActivePropertyId();
        setIsLoading(true);

        const plansUrl = propId > 0 ? `${getApiBaseUrl()}/api/rates/plans?propertyId=${propId}` : `${getApiBaseUrl()}/api/rates/plans`;
        const pkgsUrl = propId > 0 ? `${getApiBaseUrl()}/api/rates/packages?propertyId=${propId}` : `${getApiBaseUrl()}/api/rates/packages`;

        Promise.all([
            fetch(plansUrl)
                .then(r => r.json())
                .then(res => {
                    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                        setAvailableRatePlans(res.data);
                        try {
                            if (propId > 0) {
                                localStorage.setItem(`hotel_rate_plans_prop_${propId}`, JSON.stringify(res.data));
                            }
                            localStorage.setItem('hotel_rate_plans_v1', JSON.stringify(res.data));
                        } catch {}
                    }
                })
                .catch(() => null),

            fetch(pkgsUrl)
                .then(r => r.json())
                .then(res => {
                    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                        setAvailablePackages(res.data);
                        try {
                            if (propId > 0) {
                                localStorage.setItem(`hotel_packages_prop_${propId}`, JSON.stringify(res.data));
                            }
                            localStorage.setItem('hotel_packages_v2', JSON.stringify(res.data));
                        } catch {}
                    }
                })
                .catch(() => null)
        ]).finally(() => {
            setIsLoading(false);
        });
    }, []);

    useEffect(() => {
        reloadOffers();

        // Subscribe to PMS events (e.g., when a package or rate plan is created or modified)
        const unsubscribe = subscribeToPMSEvents((msg) => {
            if (msg.type === 'INVENTORY_REFRESH') {
                reloadOffers();
            }
        });

        // Cross-tab storage synchronization
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'hotel_packages_v2' || e.key === 'hotel_rate_plans_v1') {
                reloadOffers();
            }
        };
        window.addEventListener('storage', handleStorage);

        return () => {
            unsubscribe();
            window.removeEventListener('storage', handleStorage);
        };
    }, [reloadOffers]);

    // Helper: Find package by ID
    const getPackageById = useCallback((packageId?: number | string) => {
        if (!packageId || packageId === 'none' || packageId === 0 || packageId === '0') return undefined;
        return availablePackages.find(p => String(p.id) === String(packageId));
    }, [availablePackages]);

    // Helper: Filter packages applicable to a specific room type
    const getApplicablePackagesForRoomType = useCallback((roomTypeName?: string) => {
        return availablePackages.filter(p => {
            if (p.status && p.status !== 'Active') return false;
            if (!roomTypeName) return true;
            const applicable = p.roomConfig?.applicableRoomTypes;
            if (!applicable || !Array.isArray(applicable) || applicable.length === 0) return true;
            const targetLower = String(roomTypeName || '').toLowerCase();
            return applicable.some((t: any) => {
                const s = String(t || '').toLowerCase();
                return s === 'all' || s === targetLower;
            });
        });
    }, [availablePackages]);

    // Calculate unified Room Rate considering Rate Plan, Occupancy and Package Surcharges
    const calculateRoomRate = useCallback((params: CalculateRoomRateParams): number => {
        const { roomType, ratePlan, packageId, adults, children, baseRate, nights, checkInDate, childrenAges, extraBed, extraBedFee } = params;
        const canonicalRate = baseRate !== undefined && baseRate > 0
            ? baseRate
            : getStandardDailyRateForRoom(undefined, roomType);

        // 1. Calculate rate plan tariff based on base occupancy, extra guests, rate calendar overrides
        let planTariff = 0;
        if (checkInDate && nights && nights > 0) {
            const stayCalc = calculateStayTariffWithCalendar(
                roomType,
                ratePlan,
                canonicalRate,
                checkInDate,
                nights,
                adults,
                children,
                availableRatePlans,
                childrenAges,
                extraBed,
                extraBedFee
            );
            planTariff = stayCalc.averageDailyRate;
        } else {
            planTariff = calculateTariffForRatePlan(
                ratePlan,
                roomType,
                canonicalRate,
                adults,
                children,
                availableRatePlans,
                childrenAges,
                extraBed,
                extraBedFee
            );
        }

        // 2. Add Package Surcharge / Inclusions if a package is selected
        const pkg = getPackageById(packageId);
        let packageSurcharge = 0;
        if (pkg) {
            packageSurcharge = Number(pkg.finance?.baseSurcharge || 0);

            // Layer package extra occupant supplements if defined:
            const capacity = getRoomTypeCapacity(roomType);
            const safeAdults = Math.max(1, adults);
            if (safeAdults > capacity.baseOccupancy && Number(pkg.roomConfig?.extraAdultRate) > 0) {
                packageSurcharge += (safeAdults - capacity.baseOccupancy) * Number(pkg.roomConfig.extraAdultRate);
            }
            if (children > 0 && Number(pkg.roomConfig?.extraChildRate) > 0) {
                let payingPkgChildren = children;
                if (pkg.roomConfig?.infantFree && Array.isArray(childrenAges) && childrenAges.length > 0) {
                    const infantMaxAge = Number(pkg.roomConfig?.infantMaxAge ?? 4);
                    payingPkgChildren = childrenAges.filter(age => Number(age) > infantMaxAge).length;
                }
                packageSurcharge += payingPkgChildren * Number(pkg.roomConfig.extraChildRate);
            }
        }

        return Math.max(0, Math.round(planTariff + packageSurcharge));
    }, [availableRatePlans, getPackageById]);

    // Validate room occupancy against category configuration
    const validateRoomOccupancy = useCallback((roomTypeName: string, adults: number, children: number, extraBed?: boolean) => {
        const capacity = getRoomTypeCapacity(roomTypeName);
        const totalGuests = Math.max(1, adults) + Math.max(0, children);
        if (capacity.maxOccupancy > 0 && totalGuests > capacity.maxOccupancy) {
            return {
                isValid: false,
                maxOccupancy: capacity.maxOccupancy,
                baseOccupancy: capacity.baseOccupancy,
                error: `Exceeds max capacity of ${capacity.maxOccupancy} guests (${adults} adults, ${children} children)`
            };
        }

        // Hardware physical constraint validation
        if (extraBed && capacity.extraBedAllowed === false) {
            return {
                isValid: false,
                maxOccupancy: capacity.maxOccupancy,
                baseOccupancy: capacity.baseOccupancy,
                error: `Extra rollaway bed is physically prohibited for "${roomTypeName}". Room dimensions do not permit extra bedding.`
            };
        }

        return {
            isValid: true,
            maxOccupancy: capacity.maxOccupancy,
            baseOccupancy: capacity.baseOccupancy
        };
    }, []);

    // Validate rate plan restrictions (MinLOS, MaxLOS, StopSell, CTA, Inactive)
    const checkRatePlanRestrictions = useCallback((ratePlanName: string, nights: number, checkInDate?: string): { isValid: boolean; error?: string } => {
        const res: RatePlanRestrictionResult = validateRatePlanRestrictions(ratePlanName, nights, checkInDate, availableRatePlans);
        return {
            isValid: res.allowed,
            error: res.reason
        };
    }, [availableRatePlans]);

    // Validate package stay duration rules and room type applicability
    const validatePackageRestrictions = useCallback((packageId: number | string | undefined, nights: number, roomTypeName?: string, extraBed?: boolean): { isValid: boolean; error?: string } => {
        const pkg = getPackageById(packageId);
        if (!pkg) return { isValid: true };

        // Check if package is applicable to this room type
        if (roomTypeName && Array.isArray(pkg.roomConfig?.applicableRoomTypes) && pkg.roomConfig.applicableRoomTypes.length > 0) {
            const isApplicable = pkg.roomConfig.applicableRoomTypes.some((rt: string) => 
                rt.toLowerCase() === roomTypeName.toLowerCase() || 
                roomTypeName.toLowerCase().includes(rt.toLowerCase()) ||
                rt.toLowerCase().includes(roomTypeName.toLowerCase())
            );
            if (!isApplicable) {
                return {
                    isValid: false,
                    error: `Package "${pkg.name}" is not applicable to room category "${roomTypeName}".`
                };
            }
        }

        // Check physical extra bed conflict
        if (extraBed && roomTypeName) {
            const capacity = getRoomTypeCapacity(roomTypeName);
            if (capacity.extraBedAllowed === false) {
                return {
                    isValid: false,
                    error: `Room category "${roomTypeName}" physically does not allow extra beds. Extra bed cannot be allocated with package "${pkg.name}".`
                };
            }
        }

        if (pkg.validity) {
            const minN = Number(pkg.validity.minNights || 0);
            const maxN = Number(pkg.validity.maxNights || 0);

            if (minN > 0 && nights < minN) {
                return {
                    isValid: false,
                    error: `Package "${pkg.name}" requires a minimum stay of ${minN} night${minN > 1 ? 's' : ''}.`
                };
            }
            if (maxN > 0 && nights > maxN) {
                return {
                    isValid: false,
                    error: `Package "${pkg.name}" allows a maximum stay of ${maxN} night${maxN > 1 ? 's' : ''}.`
                };
            }
        }
        return { isValid: true };
    }, [getPackageById]);

    // Unified restrictions validation across all room rows in a reservation
    const validateAllRoomRestrictions = useCallback((rooms: BookingEngineRoomItem[], nights: number, checkInDate?: string): { isValid: boolean; error?: string } => {
        // 1. Holiday & Peak Governance: Minimum Length of Stay (MLOS) Validation
        if (checkInDate && nights > 0) {
            const startDate = new Date(checkInDate);
            for (let i = 0; i < nights; i++) {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i);
                const dateIso = d.toISOString().slice(0, 10);
                const holiday = getHolidayForDate(dateIso);
                if (holiday && holiday.minStayNights > 1 && nights < holiday.minStayNights) {
                    return {
                        isValid: false,
                        error: `Minimum Stay Policy: "${holiday.name}" on ${dateIso} requires a minimum stay of ${holiday.minStayNights} nights (current stay is ${nights} night${nights > 1 ? 's' : ''}).`
                    };
                }
            }
        }

        // 2. Room rows rate plan, package and physical occupancy restrictions
        for (const r of rooms) {
            const hasExtraBed = Boolean((r as any).servicesBundle?.extraBed?.enabled || (r as any).extraBed?.enabled || (r as any).extraBed);
            
            // Check physical occupancy & extra bed limits
            if (r.roomType) {
                const occCheck = validateRoomOccupancy(r.roomType, r.adults, r.children, hasExtraBed);
                if (!occCheck.isValid) {
                    return { isValid: false, error: occCheck.error };
                }
            }

            // Check rate plan
            if (r.ratePlan) {
                const planCheck = checkRatePlanRestrictions(r.ratePlan, nights, checkInDate);
                if (!planCheck.isValid) {
                    return planCheck;
                }
            }
            // Check package
            if (r.packageId) {
                const pkgCheck = validatePackageRestrictions(r.packageId, nights, r.roomType, hasExtraBed);
                if (!pkgCheck.isValid) {
                    return pkgCheck;
                }
            }
        }
        return { isValid: true };
    }, [checkRatePlanRestrictions, validatePackageRestrictions, validateRoomOccupancy]);

    // Unified multi-tier financial totals calculation
    const calculateBookingTotals = useCallback((params: BookingEngineTotalsParams) => {
        const {
            roomsList,
            stayNights,
            discountType,
            discountValue,
            taxApplicable,
            selectedTaxConfigId,
            totalPaidAmount = 0,
            checkInDate
        } = params;

        let grossTotal = 0;

        roomsList.forEach(room => {
            const count = room.noOfRooms || room.roomsCount || 1;
            const assigned = room.assignedRooms && room.assignedRooms.length > 0 ? room.assignedRooms : [];

            // If per-room custom dates exist in roomDatesMap
            if (assigned.length > 0 && room.roomDatesMap) {
                let rowSum = 0;
                assigned.forEach(rmNum => {
                    const conf = room.roomDatesMap?.[rmNum];
                    const rNights = conf ? conf.nights : stayNights;
                    rowSum += (room.rate || 0) * rNights;
                });
                grossTotal += rowSum;
            } else {
                const rNights = room.nights || stayNights;
                grossTotal += (room.rate || 0) * rNights * count;
            }

            // Extra bed charges
            if (room.extraBed?.enabled) {
                const ebCount = room.extraBed.count || 1;
                const ebRate = room.extraBed.ratePerNight || 0;
                grossTotal += ebRate * stayNights * ebCount * count;
            }

            // Pickup charges
            if (room.pickup?.enabled) {
                grossTotal += (room.pickup.charge || 0) * count;
            }

            // Custom services bundle
            if (room.servicesBundle?.totalPrice) {
                grossTotal += (room.servicesBundle.totalPrice || 0) * count;
            }
        });

        // Mandatory Holiday Gala Dinner calculation (New Year Eve, Christmas Eve Gala)
        let galaDinnerTotal = 0;
        const galaEvents: Array<{ date: string; holidayName: string; feePerGuest: number; guestCount: number; totalFee: number }> = [];

        if (checkInDate && stayNights > 0) {
            const startD = new Date(checkInDate);
            for (let i = 0; i < stayNights; i++) {
                const cur = new Date(startD);
                cur.setDate(startD.getDate() + i);
                const iso = cur.toISOString().slice(0, 10);
                const hol = getHolidayForDate(iso);
                if (hol && hol.mandatoryGala && (hol.galaDinnerFee || 0) > 0) {
                    const feePerGuest = Number(hol.galaDinnerFee);
                    let nightGuests = 0;
                    roomsList.forEach(r => {
                        const count = r.noOfRooms || r.roomsCount || 1;
                        const guests = Math.max(1, (r.adults || 1) + (r.children || 0));
                        nightGuests += guests * count;
                    });
                    const eventTotal = feePerGuest * nightGuests;
                    galaDinnerTotal += eventTotal;
                    galaEvents.push({
                        date: iso,
                        holidayName: hol.name,
                        feePerGuest,
                        guestCount: nightGuests,
                        totalFee: eventTotal
                    });
                }
            }
        }

        grossTotal += galaDinnerTotal;

        // Calculate discount
        const discountedAmount = discountType === 'percentage'
            ? (grossTotal * (discountValue || 0)) / 100
            : (discountValue || 0);

        const netBaseAmount = Math.max(0, grossTotal - discountedAmount);

        // Calculate taxes
        const taxCalculation: TaxCalculationResult = calculateReservationTaxes(
            netBaseAmount,
            taxApplicable,
            selectedTaxConfigId ? String(selectedTaxConfigId) : undefined
        );

        const grandTotal = taxCalculation.grandTotal;
        const totalDue = Math.max(0, grandTotal - totalPaidAmount);

        return {
            grossTotal,
            discountedAmount,
            netBaseAmount,
            taxCalculation,
            grandTotal,
            totalDue,
            galaDinnerTotal,
            galaEvents
        };
    }, []);

    // Summary of Holiday status for a given stay date range
    const getStayHolidaySummary = useCallback((checkIn?: string, stayNights: number = 1, adults: number = 2, children: number = 0) => {
        if (!checkIn || stayNights <= 0) {
            return {
                hasHoliday: false,
                hasSurge: false,
                maxMultiplier: 1.0,
                activeHolidays: [] as string[],
                isMlosViolated: false,
                mlosRequiredNights: 1,
                mlosHolidayName: undefined as string | undefined,
                hasGalaDinner: false,
                totalGalaFee: 0,
                galaEvents: [] as Array<{ date: string; name: string; feePerGuest: number; totalFee: number }>
            };
        }

        let hasHoliday = false;
        let hasSurge = false;
        let maxMultiplier = 1.0;
        const holidayNames = new Set<string>();
        let isMlosViolated = false;
        let mlosRequiredNights = 1;
        let mlosHolidayName: string | undefined;
        let hasGalaDinner = false;
        let totalGalaFee = 0;
        const galaEvents: Array<{ date: string; name: string; feePerGuest: number; totalFee: number }> = [];

        const startD = new Date(checkIn);
        const guestCount = Math.max(1, adults + (children || 0));

        for (let i = 0; i < stayNights; i++) {
            const cur = new Date(startD);
            cur.setDate(startD.getDate() + i);
            const iso = cur.toISOString().slice(0, 10);
            const hol = getHolidayForDate(iso);

            if (hol) {
                hasHoliday = true;
                holidayNames.add(hol.name);

                if (hol.hasSurgeRate && hol.rateMultiplier > 1.0) {
                    hasSurge = true;
                    if (hol.rateMultiplier > maxMultiplier) {
                        maxMultiplier = hol.rateMultiplier;
                    }
                }

                if (hol.minStayNights > 1 && stayNights < hol.minStayNights) {
                    isMlosViolated = true;
                    if (hol.minStayNights > mlosRequiredNights) {
                        mlosRequiredNights = hol.minStayNights;
                        mlosHolidayName = hol.name;
                    }
                }

                if (hol.mandatoryGala && (hol.galaDinnerFee || 0) > 0) {
                    hasGalaDinner = true;
                    const eventTotal = Number(hol.galaDinnerFee) * guestCount;
                    totalGalaFee += eventTotal;
                    galaEvents.push({
                        date: iso,
                        name: hol.name,
                        feePerGuest: Number(hol.galaDinnerFee),
                        totalFee: eventTotal
                    });
                }
            }
        }

        return {
            hasHoliday,
            hasSurge,
            maxMultiplier,
            activeHolidays: Array.from(holidayNames),
            isMlosViolated,
            mlosRequiredNights,
            mlosHolidayName,
            hasGalaDinner,
            totalGalaFee,
            galaEvents
        };
    }, []);

    // Helper: Determine the unified offer dropdown value ('pkg:<id>' or 'plan:<name>' or 'direct:<name>')
    const getOfferValue = useCallback((item: { ratePlan?: string; packageId?: number | string }): string => {
        if (item.packageId && item.packageId !== 'none' && item.packageId !== 0) return `pkg:${item.packageId}`;
        if (item.ratePlan) {
            if (item.ratePlan.startsWith('direct:') || item.ratePlan === 'Direct Standard Room Rate (Rack Rate)') {
                return 'direct:Direct Standard Room Rate (Rack Rate)';
            }
            return item.ratePlan.startsWith('plan:') ? item.ratePlan : `plan:${item.ratePlan}`;
        }
        const defPlan = availableRatePlans[0]?.name || '';
        return defPlan ? `plan:${defPlan}` : 'direct:Direct Standard Room Rate (Rack Rate)';
    }, [availableRatePlans]);

    // Helper: Resolve offer selection from unified dropdown
    const resolveOfferSelection = useCallback((params: {
        offerKey: string;
        roomType: string;
        adults: number;
        children: number;
        baseRate?: number;
        nights?: number;
        checkInDate?: string;
        childrenAges?: number[];
        extraBed?: boolean;
    }) => {
        const { offerKey, roomType, adults, children, baseRate, nights, checkInDate, childrenAges, extraBed } = params;
        const canonicalRate = baseRate !== undefined && baseRate > 0
            ? baseRate
            : getStandardDailyRateForRoom(undefined, roomType);

        if (offerKey.startsWith('pkg:')) {
            const pkgId = offerKey.replace(/^pkg:/, '');
            const pkg = getPackageById(pkgId);
            const defaultBasePlan = availableRatePlans[0]?.name || 'Direct Standard Room Rate (Rack Rate)';

            // Check if package requires a specific room category
            const applicable = pkg?.roomConfig?.applicableRoomTypes;
            const currentRoomTypeLower = String(roomType || '').toLowerCase();
            const hasRoomTypeRestriction = applicable && Array.isArray(applicable) && applicable.length > 0 && !applicable.some((t: any) => String(t || '').toLowerCase() === 'all');
            const isCurrentTypeApplicable = !hasRoomTypeRestriction || applicable.some((t: any) => String(t || '').toLowerCase() === currentRoomTypeLower);

            const targetRoomType = (!isCurrentTypeApplicable && hasRoomTypeRestriction) ? applicable[0] : roomType;
            const targetLower = String(targetRoomType || '').toLowerCase();
            const effectiveCanonicalRate = (targetLower !== currentRoomTypeLower || !baseRate || baseRate <= 0)
                ? getStandardDailyRateForRoom(undefined, targetRoomType)
                : baseRate;

            const rate = calculateRoomRate({
                roomType: targetRoomType,
                ratePlan: defaultBasePlan,
                packageId: pkgId,
                adults,
                children,
                baseRate: effectiveCanonicalRate,
                nights,
                checkInDate,
                childrenAges,
                extraBed
            });
            return {
                offerKey: `pkg:${pkgId}`,
                offerType: 'package' as const,
                ratePlan: pkg?.name || defaultBasePlan,
                packageId: pkg?.id || pkgId,
                packageName: pkg?.name,
                rate,
                targetRoomType,
                roomTypeChanged: targetLower !== currentRoomTypeLower
            };
        } else if (String(offerKey || '').startsWith('direct:') || offerKey === 'direct' || String(offerKey || '').toLowerCase().includes('rack rate')) {
            const rate = calculateRoomRate({
                roomType,
                ratePlan: 'Direct Standard Room Rate (Rack Rate)',
                packageId: undefined,
                adults,
                children,
                baseRate: canonicalRate,
                nights,
                checkInDate,
                childrenAges,
                extraBed
            });
            return {
                offerKey: 'direct:Direct Standard Room Rate (Rack Rate)',
                offerType: 'rate_plan' as const,
                ratePlan: 'Direct Standard Room Rate (Rack Rate)',
                packageId: undefined,
                packageName: undefined,
                rate,
                targetRoomType: roomType,
                roomTypeChanged: false
            };
        } else {
            const planName = offerKey.startsWith('plan:') ? offerKey.replace(/^plan:/, '') : offerKey;
            const rate = calculateRoomRate({
                roomType,
                ratePlan: planName,
                packageId: undefined,
                adults,
                children,
                baseRate: canonicalRate,
                nights,
                checkInDate,
                childrenAges,
                extraBed
            });
            return {
                offerKey: `plan:${planName}`,
                offerType: 'rate_plan' as const,
                ratePlan: planName,
                packageId: undefined,
                packageName: undefined,
                rate,
                targetRoomType: roomType,
                roomTypeChanged: false
            };
        }
    }, [availableRatePlans, getPackageById, calculateRoomRate]);

    return {
        availableRatePlans,
        availablePackages,
        isLoading,
        calculateRoomRate,
        getPackageById,
        getApplicablePackagesForRoomType,
        validateRoomOccupancy,
        checkRatePlanRestrictions,
        validatePackageRestrictions,
        validateAllRoomRestrictions,
        calculateBookingTotals,
        getStayHolidaySummary,
        getOfferValue,
        resolveOfferSelection,
        reloadOffers
    };
};

/**
 * Common Shared PMS Domain Functions for Reservation Wizards
 */

export interface GroupHorizonResult {
    minIn: string;
    maxOut: string;
    spanNights: number;
    totalRoomNights: number;
    hasCustomDates: boolean;
}

export const calculateGroupHorizon = (
    roomsList: BookingEngineRoomItem[],
    defaultCheckIn: string,
    defaultCheckOut: string,
    defaultNights: number
): GroupHorizonResult => {
    let minIn = defaultCheckIn;
    let maxOut = defaultCheckOut;
    let totalRoomNights = 0;
    let hasCustomDates = false;

    roomsList.forEach(r => {
        const count = Number(r.noOfRooms || r.roomsCount) || 1;
        const assigned = r.assignedRooms && r.assignedRooms.length === count
            ? r.assignedRooms
            : (r.roomNumber ? [r.roomNumber] : []);

        if (r.roomDatesMap && Object.keys(r.roomDatesMap).length > 0) {
            assigned.forEach(rm => {
                const conf = r.roomDatesMap?.[rm];
                if (conf) {
                    hasCustomDates = true;
                    totalRoomNights += conf.nights;
                    if (!minIn || conf.checkIn < minIn) minIn = conf.checkIn;
                    if (!maxOut || conf.checkOut > maxOut) maxOut = conf.checkOut;
                } else {
                    totalRoomNights += (r.nights || defaultNights);
                }
            });
        } else {
            if (r.checkInDate && r.checkInDate !== defaultCheckIn) hasCustomDates = true;
            if (r.checkOutDate && r.checkOutDate !== defaultCheckOut) hasCustomDates = true;
            const rIn = r.checkInDate || defaultCheckIn;
            const rOut = r.checkOutDate || defaultCheckOut;
            const rN = r.nights || defaultNights;
            totalRoomNights += rN * count;
            if (!minIn || rIn < minIn) minIn = rIn;
            if (!maxOut || rOut > maxOut) maxOut = rOut;
        }
    });

    const span = Math.max(1, Math.round((new Date(maxOut).getTime() - new Date(minIn).getTime()) / (1000 * 60 * 60 * 24)));
    return {
        minIn,
        maxOut,
        spanNights: isNaN(span) ? Math.max(1, defaultNights) : span,
        totalRoomNights: Math.max(1, totalRoomNights),
        hasCustomDates
    };
};

export const splitMultiRoomRow = <T extends BookingEngineRoomItem>(
    roomsList: T[],
    rowId: number | string,
    fallbackAssignedRooms?: (row: T) => string[]
): { updatedList: T[]; assigned: string[]; count: number } | null => {
    const targetRow = roomsList.find(r => r.id === rowId);
    if (!targetRow) return null;
    const count = Number(targetRow.noOfRooms || targetRow.roomsCount) || 1;
    if (count <= 1) return null;

    const assigned = targetRow.assignedRooms && targetRow.assignedRooms.length === count
        ? targetRow.assignedRooms
        : (fallbackAssignedRooms ? fallbackAssignedRooms(targetRow) : [targetRow.roomNumber || '']);

    const targetIndex = roomsList.findIndex(r => r.id === rowId);
    let maxId = Math.max(...roomsList.map(r => Number(r.id) || 0), 0);

    const newRows: T[] = assigned.map((roomNum, idx) => {
        const dateConf = targetRow.roomDatesMap?.[roomNum];
        return {
            ...targetRow,
            id: idx === 0 ? targetRow.id : ++maxId,
            roomsCount: 1,
            noOfRooms: 1,
            roomNumber: roomNum,
            assignedRooms: [roomNum],
            checkInDate: dateConf?.checkIn || targetRow.checkInDate,
            checkOutDate: dateConf?.checkOut || targetRow.checkOutDate,
            nights: dateConf?.nights || targetRow.nights,
            adults: idx === 0 ? targetRow.adults : 1,
            children: idx === 0 ? targetRow.children : 0,
            childrenAges: idx === 0 ? targetRow.childrenAges : [],
            roomDatesMap: undefined
        };
    });

    const updatedList = [...roomsList];
    updatedList.splice(targetIndex, 1, ...newRows);
    return { updatedList, assigned, count };
};

export const duplicateRoomRowHelper = <T extends BookingEngineRoomItem>(
    roomsList: T[],
    sourceRow: T,
    availableRooms: any[],
    nights: number,
    calculateRate: (params: CalculateRoomRateParams) => number
): { updatedList: T[]; newRow: T } | null => {
    const nextId = Math.max(...roomsList.map(r => Number(r.id) || 0), 0) + 1;
    const usedRooms = new Set<string>();
    roomsList.forEach(r => {
        if (r.assignedRooms && r.assignedRooms.length > 0) {
            r.assignedRooms.forEach(rn => usedRooms.add(String(rn)));
        } else if (r.roomNumber) {
            usedRooms.add(String(r.roomNumber));
        }
    });

    const freeRoom = availableRooms.find(r =>
        (r.roomTypeName === sourceRow.roomType || String(r.roomTypeName || '').includes(sourceRow.roomType)) && !usedRooms.has(String(r.number))
    ) || availableRooms.find(r => !usedRooms.has(String(r.number)));

    if (!freeRoom) return null;
    const nextRoom = String(freeRoom.number);
    const copiedType = freeRoom.roomTypeName || sourceRow.roomType;
    const capacity = getRoomTypeCapacity(copiedType);
    const safeAdults = Math.max(1, Math.min(sourceRow.adults, capacity.maxAdults));
    const safeChildren = Math.min(sourceRow.children, capacity.maxChildren);
    const standardRate = getStandardDailyRateForRoom(nextRoom, copiedType);

    const resolvedRate = calculateRate({
        roomType: copiedType,
        ratePlan: sourceRow.ratePlan,
        packageId: sourceRow.packageId,
        adults: safeAdults,
        children: safeChildren,
        baseRate: standardRate,
        nights
    });

    const newRow = {
        ...sourceRow,
        id: nextId,
        roomType: copiedType,
        roomsCount: 1,
        noOfRooms: 1,
        roomNumber: nextRoom,
        assignedRooms: [nextRoom],
        adults: safeAdults,
        children: safeChildren,
        childrenAges: (sourceRow.childrenAges || []).slice(0, safeChildren),
        rate: resolvedRate
    } as T;

    return {
        updatedList: [...roomsList, newRow],
        newRow
    };
};

export const addNewRoomRowHelper = <T extends BookingEngineRoomItem>(
    roomsList: T[],
    availableRooms: any[],
    checkIn: string,
    checkOut: string,
    nights: number,
    defaultRatePlan: string,
    calculateRate: (params: CalculateRoomRateParams) => number
): { updatedList: T[]; newRow: T } | null => {
    const nextId = Math.max(...roomsList.map(r => Number(r.id) || 0), 0) + 1;
    const usedRooms = new Set<string>();
    roomsList.forEach(r => {
        if (r.assignedRooms && r.assignedRooms.length > 0) {
            r.assignedRooms.forEach(rn => usedRooms.add(String(rn)));
        } else if (r.roomNumber) {
            usedRooms.add(String(r.roomNumber));
        }
    });

    const freeRoom = availableRooms.find(r =>
        (String(r.roomTypeName || '').includes('Deluxe') || r.roomTypeName === 'Deluxe Double') && !usedRooms.has(String(r.number))
    ) || availableRooms.find(r => !usedRooms.has(String(r.number)));

    if (!freeRoom) return null;
    const nextRoom = String(freeRoom.number);
    const roomType = freeRoom.roomTypeName || 'Deluxe Double';
    const defPlan = defaultRatePlan || 'Standard Rate';
    const defRate = calculateRate({
        roomType,
        ratePlan: defPlan,
        adults: 1,
        children: 0,
        baseRate: freeRoom.baseRate || 3000,
        nights
    });

    const newRow = {
        id: nextId,
        roomType,
        roomsCount: 1,
        noOfRooms: 1,
        ratePlan: defPlan,
        roomNumber: nextRoom,
        assignedRooms: [nextRoom],
        checkInDate: checkIn,
        checkOutDate: checkOut,
        nights: Math.max(1, nights),
        adults: 1,
        children: 0,
        childrenAges: [],
        rate: defRate,
        isAssign: true
    } as unknown as T;

    return {
        updatedList: [...roomsList, newRow],
        newRow
    };
};

export interface PreBookingFlightParams {
    actionType: 'reserve' | 'checkin' | 'hold';
    checkIn: string;
    operatingDate: string;
    availableRatePlans: any[];
    roomsList: BookingEngineRoomItem[];
    nights: number;
    guestName?: string;
    phone?: string;
    hasOverbookingError?: boolean;
    validateAllRestrictions: (rooms: BookingEngineRoomItem[], nights: number, checkIn?: string) => { isValid: boolean; error?: string };
}

export const validatePreBookingFlight = (params: PreBookingFlightParams): { allowed: boolean; error?: string; stepRequired?: number } => {
    const {
        actionType,
        checkIn,
        operatingDate,
        availableRatePlans: _availableRatePlans,
        roomsList,
        nights,
        guestName = '',
        phone = '',
        hasOverbookingError = false,
        validateAllRestrictions
    } = params;
    void _availableRatePlans;

    if (actionType === 'checkin' && checkIn !== operatingDate) {
        return {
            allowed: false,
            error: `Check-in is only allowed on the PMS Business Date (${operatingDate}). Arrival date is ${checkIn}.`
        };
    }

    // Note: If no rate plans exist, bookings proceed under Direct Standard Room Rate (Rack Rate) automatically

    const restrictionCheck = validateAllRestrictions(roomsList, nights, checkIn);
    if (!restrictionCheck.isValid) {
        return {
            allowed: false,
            error: restrictionCheck.error || 'Stay parameters violate commercial policy.'
        };
    }

    if (hasOverbookingError) {
        return {
            allowed: false,
            error: 'Overbooking Prevented: Requested rooms exceed available inventory for the selected dates!'
        };
    }

    if (!guestName.trim()) {
        return {
            allowed: false,
            error: 'Guest full name is required.',
            stepRequired: 2
        };
    }

    if (!phone.trim()) {
        return {
            allowed: false,
            error: 'Guest mobile or contact phone is required.',
            stepRequired: 2
        };
    }

    return { allowed: true };
};
