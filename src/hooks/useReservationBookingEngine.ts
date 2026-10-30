import { useState, useEffect, useCallback } from 'react';
import {
    getDynamicRatePlans,
    getDynamicPackages,
    calculateTariffForRatePlan,
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
}

export interface CalculateRoomRateParams {
    roomType: string;
    ratePlan: string;
    packageId?: number | string;
    adults: number;
    children: number;
    baseRate?: number;
    nights?: number;
}

export const useReservationBookingEngine = () => {
    // 1. Dynamic Rate Plans
    const [availableRatePlans, setAvailableRatePlans] = useState<any[]>(() => {
        const dyn = getDynamicRatePlans();
        return dyn.length > 0 ? dyn : [];
    });

    // 2. Dynamic Packages
    const [availablePackages, setAvailablePackages] = useState<any[]>(() => {
        const pkgs = getDynamicPackages();
        return pkgs.length > 0 ? pkgs : [];
    });

    const [isLoading, setIsLoading] = useState(false);

    // Sync Rate Plans & Packages dynamically from PostgreSQL Database & Local Storage
    const reloadOffers = useCallback(() => {
        const propId = getActivePropertyId();
        setIsLoading(true);

        Promise.all([
            fetch(`${getApiBaseUrl()}/api/rates/plans?propertyId=${propId}`)
                .then(r => r.json())
                .then(res => {
                    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                        setAvailableRatePlans(res.data);
                        try {
                            localStorage.setItem('hotel_rate_plans_v1', JSON.stringify(res.data));
                        } catch {}
                    }
                })
                .catch(() => null),

            fetch(`${getApiBaseUrl()}/api/rates/packages?propertyId=${propId}`)
                .then(r => r.json())
                .then(res => {
                    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
                        setAvailablePackages(res.data);
                        try {
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
            return applicable.some((t: string) => t.toLowerCase() === 'all' || t.toLowerCase() === roomTypeName.toLowerCase());
        });
    }, [availablePackages]);

    // Calculate unified Room Rate considering Rate Plan, Occupancy and Package Surcharges
    const calculateRoomRate = useCallback((params: CalculateRoomRateParams): number => {
        const { roomType, ratePlan, packageId, adults, children, baseRate } = params;
        const canonicalRate = baseRate !== undefined && baseRate > 0
            ? baseRate
            : getStandardDailyRateForRoom(undefined, roomType);

        // 1. Calculate rate plan tariff based on base occupancy & extra guests
        const planTariff = calculateTariffForRatePlan(
            ratePlan,
            roomType,
            canonicalRate,
            adults,
            children,
            availableRatePlans
        );

        // 2. Add Package Surcharge / Inclusions if a package is selected
        const pkg = getPackageById(packageId);
        let packageSurcharge = 0;
        if (pkg) {
            packageSurcharge = Number(pkg.finance?.baseSurcharge || 0);
        }

        return Math.max(0, Math.round(planTariff + packageSurcharge));
    }, [availableRatePlans, getPackageById]);

    // Validate room occupancy against category configuration
    const validateRoomOccupancy = useCallback((roomTypeName: string, adults: number, children: number) => {
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

    // Validate package stay duration rules
    const validatePackageRestrictions = useCallback((packageId: number | string | undefined, nights: number): { isValid: boolean; error?: string } => {
        const pkg = getPackageById(packageId);
        if (!pkg || !pkg.validity) return { isValid: true };

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
        return { isValid: true };
    }, [getPackageById]);

    // Unified restrictions validation across all room rows in a reservation
    const validateAllRoomRestrictions = useCallback((rooms: BookingEngineRoomItem[], nights: number, checkInDate?: string): { isValid: boolean; error?: string } => {
        for (const r of rooms) {
            // Check rate plan
            if (r.ratePlan) {
                const planCheck = checkRatePlanRestrictions(r.ratePlan, nights, checkInDate);
                if (!planCheck.isValid) {
                    return planCheck;
                }
            }
            // Check package
            if (r.packageId) {
                const pkgCheck = validatePackageRestrictions(r.packageId, nights);
                if (!pkgCheck.isValid) {
                    return pkgCheck;
                }
            }
        }
        return { isValid: true };
    }, [checkRatePlanRestrictions, validatePackageRestrictions]);

    // Unified multi-tier financial totals calculation
    const calculateBookingTotals = useCallback((params: BookingEngineTotalsParams) => {
        const {
            roomsList,
            stayNights,
            discountType,
            discountValue,
            taxApplicable,
            selectedTaxConfigId,
            totalPaidAmount = 0
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
            totalDue
        };
    }, []);

    // Helper: Determine the unified offer dropdown value ('pkg:<id>' or 'plan:<name>')
    const getOfferValue = useCallback((item: { ratePlan?: string; packageId?: number | string }): string => {
        if (item.packageId && item.packageId !== 'none' && item.packageId !== 0) return `pkg:${item.packageId}`;
        if (item.ratePlan) return item.ratePlan.startsWith('plan:') ? item.ratePlan : `plan:${item.ratePlan}`;
        const defPlan = availableRatePlans[0]?.name || '';
        return defPlan ? `plan:${defPlan}` : '';
    }, [availableRatePlans]);

    // Helper: Resolve offer selection from unified dropdown
    const resolveOfferSelection = useCallback((params: {
        offerKey: string;
        roomType: string;
        adults: number;
        children: number;
        baseRate?: number;
        nights?: number;
    }) => {
        const { offerKey, roomType, adults, children, baseRate, nights } = params;
        const canonicalRate = baseRate !== undefined && baseRate > 0
            ? baseRate
            : getStandardDailyRateForRoom(undefined, roomType);

        if (offerKey.startsWith('pkg:')) {
            const pkgId = offerKey.replace(/^pkg:/, '');
            const pkg = getPackageById(pkgId);
            const defaultBasePlan = availableRatePlans[0]?.name || 'Standard Rate';

            // Check if package requires a specific room category
            const applicable = pkg?.roomConfig?.applicableRoomTypes;
            const hasRoomTypeRestriction = applicable && Array.isArray(applicable) && applicable.length > 0 && !applicable.some((t: string) => t.toLowerCase() === 'all');
            const isCurrentTypeApplicable = !hasRoomTypeRestriction || applicable.some((t: string) => t.toLowerCase() === roomType.toLowerCase());

            const targetRoomType = (!isCurrentTypeApplicable && hasRoomTypeRestriction) ? applicable[0] : roomType;
            const effectiveCanonicalRate = (targetRoomType.toLowerCase() !== roomType.toLowerCase() || !baseRate || baseRate <= 0)
                ? getStandardDailyRateForRoom(undefined, targetRoomType)
                : baseRate;

            const rate = calculateRoomRate({
                roomType: targetRoomType,
                ratePlan: defaultBasePlan,
                packageId: pkgId,
                adults,
                children,
                baseRate: effectiveCanonicalRate,
                nights
            });
            return {
                offerKey: `pkg:${pkgId}`,
                offerType: 'package' as const,
                ratePlan: pkg?.name || defaultBasePlan,
                packageId: pkg?.id || pkgId,
                packageName: pkg?.name,
                rate,
                targetRoomType,
                roomTypeChanged: targetRoomType.toLowerCase() !== roomType.toLowerCase()
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
                nights
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
        getOfferValue,
        resolveOfferSelection
    };
};
