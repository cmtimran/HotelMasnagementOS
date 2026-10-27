import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Calendar as CalendarIcon,
    Trash2,
    X,
    Building2,
    MoreVertical,
    Car,
    Plane,
    BedDouble,
    Utensils,
    Gift,
    Clock,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    Split,
    Link2
} from 'lucide-react';
import { StayPeriodPicker, getSystemDateISO, getNextDayISO } from '../common/StayPeriodPicker';
import { ChildAgeSelector } from '../common/ChildAgeSelector';
import { RoomAddonServicesModal, type ServiceTabType } from './RoomAddonServicesModal';
import { MultiRoomSelectorModal } from './MultiRoomSelectorModal';
import type {
    RoomServicesBundle,
    ExtraBedConfig,
    PickupConfig
} from '../../types/reservationServices';
import {
    getExtraBedTotal,
    getMealPlanTotal,
    getCelebrationTotal,
    getSpaWellnessTotal,
    getTimingFlexTotal,
    getCustomAddonsTotal,
    getRoomBundleTotal
} from '../../types/reservationServices';
import {
    acquireRoomLock,
    releaseRoomLock,
    validateAndCommitReservation,
    getAvailableRoomsForStay,
    getCanonicalRooms,
    getDynamicRoomTypes,
    calculateTariffForRatePlan,
    getRoomTypeCapacity,
    generateMasterReservationNumber,
    generateGroupCode,
    generateSubBookingNumber,
    generateRegistrationNumber,
    generateFolioNumber
} from '../../utils/roomInventoryEngine';
import {
    calculateReservationTaxes,
    getActiveTaxConfiguration,
    getTaxConfigurations,
    type TaxCalculationResult
} from '../../utils/taxCalculationEngine';
import { getApiBaseUrl } from '../../utils/apiUrl';
import { toast } from '../../context/ToastContext';
import {
    getConnectingRoomsMap,
    getActiveConnectingSuites,
    syncConnectingRoomsFromDB,
    type ConnectingSuiteConfig
} from '../../utils/connectingRoomHelper';

export interface QuickReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomInfo?: {
        room?: string;
        roomNumber?: string;
        startDate?: string;
        checkIn?: string;
        endDate?: string;
        checkOut?: string;
        nights?: number;
        startIndex?: number;
        endIndex?: number;
        roomType?: string;
        baseRate?: number;
        connectPartner?: boolean;
    };
    onReserve?: (booking: {
        room: string;
        startIndex?: number;
        endIndex?: number;
        guestName: string;
        status: string;
    }) => void;
    onReservationCreated?: (res: any) => void;
}

interface RoomItem {
    id: number;
    roomType: string;
    noOfRooms: number;
    ratePlan: string;
    roomNumber: string;
    assignedRooms?: string[];
    adults: number;
    children: number;
    childrenAges?: number[];
    rate: number;
    servicesBundle?: RoomServicesBundle;
    extraBed?: ExtraBedConfig;
    pickup?: PickupConfig;
    checkInDate?: string;
    checkOutDate?: string;
    nights?: number;
    roomDatesMap?: Record<string, { checkIn: string; checkOut: string; nights: number }>;
}

interface PaymentRow {
    id: number;
    method: 'Cash' | 'Card' | 'bKash' | 'Bank Transfer';
    amount: number;
}

export const QuickReservationModal: React.FC<QuickReservationModalProps> = ({
    isOpen,
    onClose,
    roomInfo,
    onReserve,
    onReservationCreated
}) => {
    const [activeTab, setActiveTab] = useState<'reservation' | 'payment'>('reservation');

    // Options
    const [dayUse, setDayUse] = useState<boolean>(false);
    const [taxApplicable, setTaxApplicable] = useState<boolean>(true);
    const [selectedTaxConfigId, setSelectedTaxConfigId] = useState<string>(() => {
        return getActiveTaxConfiguration().id;
    });
    const availableTaxConfigs = useMemo(() => getTaxConfigurations().filter(c => c.status === 'Active'), []);

    const [dbRatePlans, setDbRatePlans] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('hotel_rate_plans_v1');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch {}
        return [];
    });

    useEffect(() => {
        fetch(`${getApiBaseUrl()}/api/rates/plans?propertyId=1`)
            .then(res => res.json())
            .then(json => {
                if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                    setDbRatePlans(json.data);
                    localStorage.setItem('hotel_rate_plans_v1', JSON.stringify(json.data));
                }
            })
            .catch(() => {});
    }, []);

    const availableRatePlans = dbRatePlans;

    // Reservation Details
    const [checkInDate, setCheckInDate] = useState<string>(() => getSystemDateISO());
    const [nights, setNights] = useState<number>(1);
    const [checkOutDate, setCheckOutDate] = useState<string>(() => getNextDayISO(getSystemDateISO(), 1));
    const [businessSource, setBusinessSource] = useState<string>('Direct');
    const [businessAgent, setBusinessAgent] = useState<string>('Direct');

    // Rooms list
    const [roomsList, setRoomsList] = useState<RoomItem[]>(() => {
        const sysDate = getSystemDateISO();
        const nextDate = getNextDayISO(sysDate, 1);
        const report = getAvailableRoomsForStay(sysDate, nextDate, 'Deluxe Double');
        const freeRoom = report.availableRooms.find(r => r.roomTypeName.includes('Deluxe') || r.roomTypeName === 'Deluxe Double') || report.availableRooms[0];
        const defaultRoomNumber = freeRoom ? freeRoom.number : '102';
        return [
            {
                id: 1,
                roomType: 'Deluxe Double',
                noOfRooms: 1,
                ratePlan: '',
                roomNumber: defaultRoomNumber,
                assignedRooms: [defaultRoomNumber],
                adults: 2,
                children: 1,
                childrenAges: [5],
                rate: 3000
            }
        ];
    });

    // Handle Day Use toggle
    const handleDayUseToggle = (isDayUse: boolean) => {
        setDayUse(isDayUse);
        if (isDayUse) {
            setCheckOutDate(checkInDate);
            setNights(0);
        } else {
            const nextDay = getNextDayISO(checkInDate, 1);
            setCheckOutDate(nextDay);
            setNights(1);
        }
    };

    // Guest Info
    const [title, setTitle] = useState<string>('Mr.');
    const [name, setName] = useState<string>('');
    const [mobile, setMobile] = useState<string>('');
    const [email, setEmail] = useState<string>('');

    // Payment Details
    const [discountType, setDiscountType] = useState<'Percentage' | 'Fixed'>('Fixed');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([
        { id: 1, method: 'Cash', amount: 3000 }
    ]);

    const [connectingSuites, setConnectingSuites] = useState<ConnectingSuiteConfig[]>(() => getActiveConnectingSuites());
    const connectingRoomsMap = useMemo(() => getConnectingRoomsMap(), [connectingSuites, isOpen]);

    useEffect(() => {
        syncConnectingRoomsFromDB().then(suites => setConnectingSuites(suites)).catch(() => {});
        const handleConn = () => setConnectingSuites(getActiveConnectingSuites());
        window.addEventListener('hotel_connecting_rooms_updated', handleConn);
        return () => window.removeEventListener('hotel_connecting_rooms_updated', handleConn);
    }, []);

    // Initialize from roomInfo prop when opened
    useEffect(() => {
        if (!isOpen) return;

        // Reset guest info for new express booking
        setName('');
        setMobile('');
        setEmail('');
        setActiveTab('reservation');

        const targetStart = roomInfo?.startDate || roomInfo?.checkIn || getSystemDateISO();
        const isDayUseInit = Boolean((roomInfo as any)?.isDayUse || (roomInfo as any)?.dayUse || (roomInfo?.startDate && roomInfo?.endDate && roomInfo.startDate === roomInfo.endDate));
        const targetEnd = isDayUseInit ? targetStart : (roomInfo?.endDate || roomInfo?.checkOut || getNextDayISO(targetStart, 1));
        const targetRoom = roomInfo?.room || roomInfo?.roomNumber || '101';

        setDayUse(isDayUseInit);
        setCheckInDate(targetStart);
        setCheckOutDate(targetEnd);

        let targetNights = isDayUseInit ? 0 : roomInfo?.nights;
        if (!isDayUseInit && !targetNights) {
            const s = new Date(targetStart);
            const e = new Date(targetEnd);
            targetNights = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
        }
        setNights(targetNights ?? 0);

        const cleanRoom = targetRoom.replace(/[^0-9a-zA-Z-]/g, '') || '101';
        const allCanonical = getCanonicalRooms();
        const canonical = allCanonical.find(r => r.number === cleanRoom);
        const resolvedType = roomInfo?.roomType || canonical?.roomTypeName || 'Deluxe Double';
        const canonicalRate = roomInfo?.baseRate || canonical?.baseRate || 3000;
        const defaultPlan = availableRatePlans[0]?.name || '';
        const initialCalculatedRate = calculateTariffForRatePlan(defaultPlan, resolvedType, canonicalRate, 2, 0, availableRatePlans);

        const connMap = getConnectingRoomsMap();
        const connInfo = connMap.get(cleanRoom);

        if (roomInfo?.connectPartner && connInfo && connInfo.allSuiteRooms.length >= 2) {
            const availReport = getAvailableRoomsForStay(targetStart, targetEnd);
            const suiteRooms = connInfo.allSuiteRooms;
            const fixedPerRoom = connInfo.pricingStrategy === 'Fixed Rate' && connInfo.fixedPrice
                ? Math.round(connInfo.fixedPrice / suiteRooms.length)
                : null;

            const builtRows: RoomItem[] = [];
            suiteRooms.forEach((rmNum, idx) => {
                const isFree = availReport.availableRooms.some(ar => ar.number === rmNum);
                if (!isFree && idx > 0) {
                    toast.warning(`Connecting Partner Room ${rmNum} is not available for ${targetStart} to ${targetEnd}!`);
                    return;
                }
                const rmCanon = allCanonical.find(r => r.number === rmNum);
                const rmType = rmCanon?.roomTypeName || resolvedType;
                const rmBase = rmCanon?.baseRate || canonicalRate;
                const rmRate = fixedPerRoom !== null
                    ? fixedPerRoom
                    : calculateTariffForRatePlan(defaultPlan, rmType, rmBase, 2, 0, availableRatePlans);

                builtRows.push({
                    id: idx + 1,
                    roomType: rmType,
                    noOfRooms: 1,
                    ratePlan: defaultPlan,
                    roomNumber: rmNum,
                    assignedRooms: [rmNum],
                    adults: 2,
                    children: 0,
                    childrenAges: [],
                    rate: rmRate,
                    checkInDate: targetStart,
                    checkOutDate: targetEnd,
                    nights: targetNights
                });
            });

            if (builtRows.length > 0) {
                setRoomsList(builtRows);
                const sumRates = builtRows.reduce((s, r) => s + r.rate, 0);
                setPaymentRows([{ id: 1, method: 'Cash', amount: sumRates * (targetNights || 1) }]);
                if (builtRows.length >= 2) {
                    toast.success(`🔗 Connecting Suite Ready: Rooms ${builtRows.map(b => b.roomNumber).join(' & ')} (${connInfo.name})`);
                }
                return;
            }
        }

        setRoomsList([
            {
                id: 1,
                roomType: resolvedType,
                noOfRooms: 1,
                ratePlan: defaultPlan,
                roomNumber: cleanRoom,
                assignedRooms: [cleanRoom],
                adults: 2,
                children: 0,
                childrenAges: [],
                rate: initialCalculatedRate,
                checkInDate: targetStart,
                checkOutDate: targetEnd,
                nights: targetNights
            }
        ]);
        setPaymentRows([
            { id: 1, method: 'Cash', amount: initialCalculatedRate * (targetNights || 1) }
        ]);
    }, [roomInfo, isOpen]);


    // Room Add-On Services (Full Bundle) State
    const [serviceModalConfig, setServiceModalConfig] = useState<{
        isOpen: boolean;
        rowId: number | null;
        initialTab: ServiceTabType;
    }>({
        isOpen: false,
        rowId: null,
        initialTab: 'pickup'
    });

    // Multi-Room Assignment Modal State
    const [multiRoomModal, setMultiRoomModal] = useState<{
        isOpen: boolean;
        rowId: number | null;
        roomType: string;
        requiredCount: number;
        isAutoMode: boolean;
    }>({
        isOpen: false,
        rowId: null,
        roomType: '',
        requiredCount: 1,
        isAutoMode: true
    });
    
    const [sessionLockId, setSessionLockId] = useState<string | null>(null);

    // Live Availability Report for selected dates (excluding this modal's own session lock)
    const liveAvailabilityReport = useMemo(() => {
        return getAvailableRoomsForStay(checkInDate, checkOutDate, undefined, {
            currentSessionLockId: sessionLockId || undefined
        });
    }, [checkInDate, checkOutDate, sessionLockId]);

    // Self-healing room validation: Ensure no row is assigned to an Occupied room or duplicate room!
    useEffect(() => {
        setRoomsList(prev => {
            let changed = false;
            const usedInForm = new Set<string>();

            const updated = prev.map(row => {
                const count = Number(row.noOfRooms) || 1;
                const isCurrentAvailable =
                    liveAvailabilityReport.availableRooms.some(ar => ar.number === row.roomNumber) &&
                    !usedInForm.has(row.roomNumber);

                if (!isCurrentAvailable && liveAvailabilityReport.availableRooms.length > 0) {
                    const freeMatches = liveAvailabilityReport.availableRooms.filter(ar =>
                        !usedInForm.has(ar.number) && (
                            ar.roomTypeName.toLowerCase().includes(row.roomType.toLowerCase()) ||
                            row.roomType.toLowerCase().includes(ar.roomTypeName.toLowerCase())
                        )
                    );
                    const fallbackFree = liveAvailabilityReport.availableRooms.filter(ar => !usedInForm.has(ar.number));
                    const chosenPool = freeMatches.length > 0 ? freeMatches : fallbackFree;
                    const freeMatch = chosenPool[0];

                    if (freeMatch) {
                        if (freeMatch.number !== row.roomNumber) {
                            changed = true;
                        }
                        const autoAssigned = chosenPool.slice(0, count).map(ar => ar.number);
                        autoAssigned.forEach(rn => usedInForm.add(rn));
                        return {
                            ...row,
                            roomNumber: freeMatch.number,
                            assignedRooms: autoAssigned.length > 0 ? autoAssigned : [freeMatch.number]
                        };
                    }
                } else {
                    if (row.assignedRooms && row.assignedRooms.length === count) {
                        row.assignedRooms.forEach(rn => usedInForm.add(rn));
                    } else {
                        usedInForm.add(row.roomNumber);
                    }
                }
                return row;
            });
            return changed ? updated : prev;
        });
    }, [checkInDate, checkOutDate, liveAvailabilityReport]);

    // Total actual room count across all rows in this form
    const totalRoomsAllocatedInForm = useMemo(() => {
        return roomsList.reduce((acc, r) => acc + (Number(r.noOfRooms) || 1), 0);
    }, [roomsList]);

    // Live remaining rooms after deducting this form's selected rooms
    const remainingOverallFreeRooms = Math.max(0, liveAvailabilityReport.availableCount - totalRoomsAllocatedInForm);

    // Total inventory free for this type in the hotel (before any form selection)
    const getTotalInventoryForType = (typeName: string): number => {
        return liveAvailabilityReport.allRoomsStatus.filter(st => {
            const matches = st.room.roomTypeName.toLowerCase().includes(typeName.toLowerCase()) ||
                            typeName.toLowerCase().includes(st.room.roomTypeName.toLowerCase());
            return matches && st.isAvailable;
        }).length;
    };

    // Rooms of this type already allocated across ALL rows in this form
    const getAllocatedCountForType = (typeName: string): number => {
        return roomsList
            .filter(r => (
                r.roomType.toLowerCase().includes(typeName.toLowerCase()) ||
                typeName.toLowerCase().includes(r.roomType.toLowerCase())
            ))
            .reduce((sum, r) => sum + (Number(r.noOfRooms) || 1), 0);
    };

    // Rooms of this type allocated in OTHER rows (excluding currentItemId)
    const getAllocatedCountInOtherRows = (typeName: string, currentItemId?: number): number => {
        return roomsList
            .filter(r => r.id !== currentItemId && (
                r.roomType.toLowerCase().includes(typeName.toLowerCase()) ||
                typeName.toLowerCase().includes(r.roomType.toLowerCase())
            ))
            .reduce((sum, r) => sum + (Number(r.noOfRooms) || 1), 0);
    };

    // Remaining free rooms of this type in the hotel AFTER what is allocated across all rows in this form
    const getRemainingFreeCountForType = (typeName: string): number => {
        const totalFree = getTotalInventoryForType(typeName);
        const totalAllocated = getAllocatedCountForType(typeName);
        return Math.max(0, totalFree - totalAllocated);
    };

    // Maximum rooms the CURRENT row can take without exceeding hotel inventory:
    const getMaxRoomsAllowedForRow = (typeName: string, currentItemId: number): number => {
        const totalFree = getTotalInventoryForType(typeName);
        const takenInOthers = getAllocatedCountInOtherRows(typeName, currentItemId);
        return Math.max(0, totalFree - takenInOthers);
    };

    // Overbooking validation check across the quick modal form
    const hasOverbookingError = useMemo(() => {
        if (totalRoomsAllocatedInForm > liveAvailabilityReport.availableCount) return true;
        for (const r of roomsList) {
            const maxForThis = getMaxRoomsAllowedForRow(r.roomType, r.id);
            if (maxForThis <= 0 || (Number(r.noOfRooms) || 1) > maxForThis) return true;
        }
        return false;
    }, [totalRoomsAllocatedInForm, liveAvailabilityReport.availableCount, roomsList]);

    // Helper to get auto-allocated physical room numbers for a given row based on its noOfRooms
    const getAutoAssignedRoomsForRow = (item: RoomItem): string[] => {
        const takenBefore = new Set<string>();
        for (const r of roomsList) {
            if (r.id === item.id) break;
            const rCount = Number(r.noOfRooms) || 1;
            const freeForPrev = liveAvailabilityReport.availableRooms
                .filter(ar => (ar.roomTypeName.toLowerCase().includes(r.roomType.toLowerCase()) || r.roomType.toLowerCase().includes(ar.roomTypeName.toLowerCase())) && !takenBefore.has(ar.number))
                .slice(0, rCount)
                .map(ar => ar.number);
            freeForPrev.forEach(rn => takenBefore.add(rn));
        }

        const countNeeded = Number(item.noOfRooms) || 1;
        const matchingAvailable = liveAvailabilityReport.availableRooms
            .filter(ar => (ar.roomTypeName.toLowerCase().includes(item.roomType.toLowerCase()) || item.roomType.toLowerCase().includes(ar.roomTypeName.toLowerCase())) && !takenBefore.has(ar.number))
            .slice(0, countNeeded)
            .map(ar => ar.number);

        if (matchingAvailable.length > 0) {
            return matchingAvailable;
        }
        return [item.roomNumber || '101'];
    };

    // Acquire soft hold lock on modal open, release on unmount/close
    useEffect(() => {
        let createdLockId: string | null = null;
        if (isOpen && roomsList[0]?.roomNumber) {
            const targetRoom = roomsList[0].roomNumber;
            const res = acquireRoomLock(targetRoom, checkInDate, checkOutDate, 'Quick Reserve Express', 7);
            if (res.success && res.lock) {
                createdLockId = res.lock.lockId;
                setSessionLockId(res.lock.lockId);
            } else if (res.conflict) {
                toast.warning(res.conflict);
            }
        }
        return () => {
            if (createdLockId) {
                releaseRoomLock(createdLockId);
            }
        };
    }, [isOpen, roomsList[0]?.roomNumber, checkInDate, checkOutDate]);

    // Anchored portal state for 3-dots dropdown menu
    const [menuAnchor, setMenuAnchor] = useState<{
        rowId: number;
        top?: number;
        bottom?: number;
        right: number;
        maxHeight: number;
    } | null>(null);

    const handleToggleRowMenu = (e: React.MouseEvent<HTMLButtonElement>, rowId: number) => {
        e.stopPropagation();
        if (menuAnchor && menuAnchor.rowId === rowId) {
            setMenuAnchor(null);
        } else {
            const rect = e.currentTarget.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const menuEstimatedHeight = 320;
            const openUpwards = spaceBelow < menuEstimatedHeight && spaceAbove > spaceBelow;

            setMenuAnchor({
                rowId,
                top: openUpwards ? undefined : rect.bottom + 4,
                bottom: openUpwards ? Math.max(8, window.innerHeight - rect.top + 4) : undefined,
                right: Math.max(16, window.innerWidth - rect.right),
                maxHeight: openUpwards ? Math.max(180, spaceAbove - 16) : Math.max(180, spaceBelow - 16)
            });
        }
    };

    useEffect(() => {
        const handleScrollOrResize = () => {
            if (menuAnchor) setMenuAnchor(null);
        };
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [menuAnchor]);

    const handleSaveRoomServices = (rowId: number, bundle: RoomServicesBundle) => {
        setRoomsList(prev => prev.map(r => r.id === rowId ? {
            ...r,
            servicesBundle: bundle,
            extraBed: bundle.extraBed,
            pickup: bundle.pickup
        } : r));
    };

    const activeRowForService = roomsList.find(r => r.id === serviceModalConfig.rowId);

    // Calculate financials
    const nightMultiplier = dayUse ? 1 : Math.max(1, nights);
    const roomBaseTotal = roomsList.reduce((acc, r) => acc + (r.rate * r.noOfRooms * nightMultiplier), 0);
    const totalExtraBedCharge = roomsList.reduce((acc, r) => acc + getExtraBedTotal(r.servicesBundle?.extraBed || r.extraBed, nightMultiplier), 0);
    const totalPickupArrivalCharge = roomsList.reduce((acc, r) => {
        const p = r.servicesBundle?.pickup || r.pickup;
        return acc + (p?.enabled && !p.isComplimentary ? (Number(p.chargeAmount) || 0) : 0);
    }, 0);
    const totalDropDepartureCharge = roomsList.reduce((acc, r) => {
        const p = r.servicesBundle?.pickup || r.pickup;
        return acc + (p?.dropEnabled && !p.dropIsComplimentary ? (Number(p.dropChargeAmount) || 0) : 0);
    }, 0);
    const totalPickupCharge = totalPickupArrivalCharge + totalDropDepartureCharge;
    const totalMealPlanCharge = roomsList.reduce((acc, r) => acc + getMealPlanTotal(r.servicesBundle?.mealPlan, nightMultiplier), 0);
    const totalCelebrationCharge = roomsList.reduce((acc, r) => acc + getCelebrationTotal(r.servicesBundle?.celebration), 0);
    const totalSpaCharge = roomsList.reduce((acc, r) => acc + getSpaWellnessTotal(r.servicesBundle?.spaWellness), 0);
    const totalTimingCharge = roomsList.reduce((acc, r) => acc + getTimingFlexTotal(r.servicesBundle?.timingFlex), 0);
    const totalCustomCharge = roomsList.reduce((acc, r) => acc + getCustomAddonsTotal(r.servicesBundle?.customAddons, nightMultiplier), 0);

    const totalAllAddonsCharges = totalExtraBedCharge + totalPickupCharge + totalMealPlanCharge + totalCelebrationCharge + totalSpaCharge + totalTimingCharge + totalCustomCharge;
    const totalAmount = roomBaseTotal + totalAllAddonsCharges;
    const discountedAmount = discountType === 'Percentage'
        ? (totalAmount * (discountValue || 0)) / 100
        : (discountValue || 0);
    const netBaseAmount = Math.max(0, totalAmount - discountedAmount);

    // Multi-tier dynamic Tax & VAT calculation based on /taxes-vat policy
    const taxCalculation: TaxCalculationResult = useMemo(() => {
        return calculateReservationTaxes(netBaseAmount, taxApplicable, selectedTaxConfigId);
    }, [netBaseAmount, taxApplicable, selectedTaxConfigId]);

    const finalPayable = taxCalculation.grandTotal;
    const totalPaid = paymentRows.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalDue = Math.max(0, finalPayable - totalPaid);

    // Keep payment row default in sync if only 1 cash row
    useEffect(() => {
        if (paymentRows.length === 1 && paymentRows[0].method === 'Cash') {
            setPaymentRows([{ id: 1, method: 'Cash', amount: finalPayable }]);
        }
    }, [finalPayable]);

    // Room handlers
    const handleAddRoom = () => {
        if (remainingOverallFreeRooms <= 0) {
            toast.error('Overbooking Prevented: No more available rooms in inventory for the selected dates!');
            return;
        }
        const nextId = roomsList.length > 0 ? Math.max(...roomsList.map(r => r.id)) + 1 : 1;
        const usedRooms = new Set<string>();
        roomsList.forEach(r => {
            if (r.assignedRooms && r.assignedRooms.length > 0) {
                r.assignedRooms.forEach(rn => usedRooms.add(rn));
            } else if (r.roomNumber) {
                usedRooms.add(r.roomNumber);
            }
        });
        const freeRoom =
            liveAvailabilityReport.availableRooms.find(r =>
                (r.roomTypeName === 'Deluxe Double' || r.roomTypeName.includes('Deluxe')) && !usedRooms.has(r.number)
            ) || liveAvailabilityReport.availableRooms.find(r => !usedRooms.has(r.number));

        if (!freeRoom) {
            toast.error('Overbooking Prevented: All available rooms are already assigned in this form!');
            return;
        }

        const defPlan = availableRatePlans[0]?.name || '';
        const defRate = calculateTariffForRatePlan(defPlan, freeRoom.roomTypeName || 'Deluxe Double', freeRoom.baseRate || 3000, 2, 0, availableRatePlans);

        setRoomsList([
            ...roomsList,
            {
                id: nextId,
                roomType: freeRoom.roomTypeName || 'Deluxe Double',
                noOfRooms: 1,
                ratePlan: defPlan,
                roomNumber: freeRoom.number,
                assignedRooms: [freeRoom.number],
                adults: 2,
                children: 0,
                rate: defRate
            }
        ]);
    };

    const handleRemoveRoom = (id: number) => {
        if (roomsList.length <= 1) return;
        setRoomsList(roomsList.filter(r => r.id !== id));
    };

    // Book / Pair Connecting Room Suite (1-Click from Quick Reservation)
    const handleBookConnectingSuite = (suite: ConnectingSuiteConfig, replaceAll = false) => {
        const allCanonical = getCanonicalRooms();
        const defPlan = availableRatePlans[0]?.name || '';
        const usedRooms = new Set<string>();
        if (!replaceAll) {
            roomsList.forEach(r => {
                if (r.assignedRooms && r.assignedRooms.length > 0) {
                    r.assignedRooms.forEach(rn => usedRooms.add(rn));
                } else if (r.roomNumber) {
                    usedRooms.add(r.roomNumber);
                }
            });
        }

        const missingRooms = suite.roomNumbers.filter(rn => !usedRooms.has(rn));
        if (missingRooms.length === 0 && !replaceAll) {
            toast.info(`All rooms of "${suite.name}" (${suite.roomNumbers.join(', ')}) are already in this booking!`);
            return;
        }

        const targetRooms = replaceAll ? suite.roomNumbers : missingRooms;
        const unavailable = targetRooms.filter(
            rn => !liveAvailabilityReport.availableRooms.some(ar => ar.number === rn)
        );
        if (unavailable.length > 0) {
            toast.error(`Connecting Room(s) ${unavailable.join(', ')} are already occupied or unavailable for ${checkInDate} to ${checkOutDate}!`);
            return;
        }

        const fixedPerRoom = suite.pricingStrategy === 'Fixed Rate' && suite.fixedPrice
            ? Math.round(suite.fixedPrice / suite.roomNumbers.length)
            : null;

        let maxId = replaceAll || roomsList.length === 0 ? 0 : Math.max(...roomsList.map(r => r.id));
        const newItems: RoomItem[] = targetRooms.map(rmNum => {
            const rmCanon = allCanonical.find(r => r.number === rmNum);
            const rmType = rmCanon?.roomTypeName || 'Deluxe Double';
            const rmBase = rmCanon?.baseRate || 3000;
            const rmRate = fixedPerRoom !== null
                ? fixedPerRoom
                : calculateTariffForRatePlan(defPlan, rmType, rmBase, 2, 0, availableRatePlans);

            return {
                id: ++maxId,
                roomType: rmType,
                noOfRooms: 1,
                ratePlan: defPlan,
                roomNumber: rmNum,
                assignedRooms: [rmNum],
                adults: 2,
                children: 0,
                childrenAges: [],
                rate: rmRate,
                checkInDate,
                checkOutDate,
                nights
            };
        });

        if (replaceAll) {
            setRoomsList(newItems);
        } else {
            // Also update existing partner room rate if Fixed Rate strategy applies
            const updatedExisting = fixedPerRoom !== null
                ? roomsList.map(r => suite.roomNumbers.includes(r.roomNumber) ? { ...r, rate: fixedPerRoom } : r)
                : roomsList;
            setRoomsList([...updatedExisting, ...newItems]);
        }
        toast.success(`🔗 Added Connecting Rooms (${ suite.roomNumbers.join(' & ') }) — ${suite.name}!`);
    };

    // Front Desk Split Action: Split multi-room group row into individual 1-room rows
    const handleSplitRowIntoRooms = (rowId: number) => {
        const targetRow = roomsList.find(r => r.id === rowId);
        if (!targetRow || targetRow.noOfRooms <= 1) return;

        const count = targetRow.noOfRooms;
        const assigned = targetRow.assignedRooms && targetRow.assignedRooms.length === count
            ? targetRow.assignedRooms
            : getAutoAssignedRoomsForRow(targetRow);

        const targetIndex = roomsList.findIndex(r => r.id === rowId);
        let maxId = Math.max(...roomsList.map(r => r.id));

        const newRows: RoomItem[] = assigned.map((roomNum, idx) => {
            const dateConf = targetRow.roomDatesMap?.[roomNum];
            return {
                ...targetRow,
                id: idx === 0 ? targetRow.id : ++maxId,
                noOfRooms: 1,
                roomNumber: roomNum,
                assignedRooms: [roomNum],
                adults: Math.max(1, Math.round(targetRow.adults / count)) || 1,
                children: 0,
                checkInDate: dateConf?.checkIn || targetRow.checkInDate || checkInDate,
                checkOutDate: dateConf?.checkOut || targetRow.checkOutDate || checkOutDate,
                nights: dateConf?.nights || targetRow.nights || nights,
                roomDatesMap: undefined
            };
        });

        const updatedList = [...roomsList];
        updatedList.splice(targetIndex, 1, ...newRows);
        setRoomsList(updatedList);
        toast.success(`Split into ${count} individual room rows (${assigned.join(', ')})!`);
    };

    const handleRoomFieldChange = <K extends keyof RoomItem>(id: number, field: K, value: RoomItem[K]) => {
        setRoomsList(roomsList.map(r => {
            if (r.id !== id) return r;
            if (field === 'ratePlan') {
                const planName = String(value);
                const assignedRm = r.roomNumber;
                const canonicalRoom = getCanonicalRooms().find(cr => cr.number === assignedRm);
                const dynamicTypes = getDynamicRoomTypes();
                const matchedType = dynamicTypes.find(t => t.name === r.roomType);
                const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || r.rate || 3000;
                const newRate = calculateTariffForRatePlan(planName, r.roomType, canonicalRate, r.adults, r.children, availableRatePlans);
                return {
                    ...r,
                    ratePlan: planName,
                    rate: newRate
                };
            }
            if (field === 'adults') {
                const capacity = getRoomTypeCapacity(r.roomType);
                const rawAdults = Number(value) || 1;
                const newAdults = Math.max(1, Math.min(rawAdults, capacity.maxAdults));
                if (rawAdults > capacity.maxAdults) {
                    toast.warning(`Capacity Limit: Maximum ${capacity.maxAdults} adult(s) allowed for ${r.roomType}!`);
                }
                const assignedRm = r.roomNumber;
                const canonicalRoom = getCanonicalRooms().find(cr => cr.number === assignedRm);
                const dynamicTypes = getDynamicRoomTypes();
                const matchedType = dynamicTypes.find(t => t.name === r.roomType);
                const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || r.rate || 3000;
                const newRate = calculateTariffForRatePlan(r.ratePlan, r.roomType, canonicalRate, newAdults, r.children, availableRatePlans);
                return {
                    ...r,
                    adults: newAdults,
                    rate: newRate
                };
            }
            if (field === 'children') {
                const capacity = getRoomTypeCapacity(r.roomType);
                const rawChildren = Math.max(0, Number(value) || 0);
                const newChildren = Math.min(rawChildren, capacity.maxChildren);
                if (rawChildren > capacity.maxChildren) {
                    toast.warning(`Capacity Limit: Maximum ${capacity.maxChildren} child(ren) allowed for ${r.roomType}!`);
                }
                const assignedRm = r.roomNumber;
                const canonicalRoom = getCanonicalRooms().find(cr => cr.number === assignedRm);
                const dynamicTypes = getDynamicRoomTypes();
                const matchedType = dynamicTypes.find(t => t.name === r.roomType);
                const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || r.rate || 3000;
                const newRate = calculateTariffForRatePlan(r.ratePlan, r.roomType, canonicalRate, r.adults, newChildren, availableRatePlans);
                return {
                    ...r,
                    children: newChildren,
                    rate: newRate
                };
            }
            if (field === 'roomType') {
                const newType = String(value);
                const maxForNewType = getMaxRoomsAllowedForRow(newType, id);
                if (maxForNewType <= 0) {
                    toast.error(`Overbooking Prevented: No rooms available in "${newType}" for the selected dates!`);
                    return r;
                }
                const safeCount = Math.min(r.noOfRooms, maxForNewType);
                const autoAssigned = getAutoAssignedRoomsForRow({ ...r, roomType: newType, noOfRooms: safeCount });
                const assignedRm = autoAssigned[0] || r.roomNumber;
                const canonicalRoom = getCanonicalRooms().find(cr => cr.number === assignedRm);
                const dynamicTypes = getDynamicRoomTypes();
                const matchedType = dynamicTypes.find(t => t.name === newType);
                const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || r.rate || 3000;

                const newCapacity = getRoomTypeCapacity(newType);
                const clampedAdults = Math.max(1, Math.min(r.adults, newCapacity.maxAdults));
                const clampedChildren = Math.min(r.children, newCapacity.maxChildren);
                const clampedAges = (r.childrenAges || []).slice(0, clampedChildren);
                if (r.adults > newCapacity.maxAdults || r.children > newCapacity.maxChildren) {
                    toast.info(`Occupancy adjusted to fit ${newType} limits (Max Adults: ${newCapacity.maxAdults}, Max Children: ${newCapacity.maxChildren}).`);
                }

                const resolvedRate = calculateTariffForRatePlan(r.ratePlan, newType, canonicalRate, clampedAdults, clampedChildren, availableRatePlans);
                return { 
                    ...r, 
                    roomType: newType, 
                    adults: clampedAdults,
                    children: clampedChildren,
                    childrenAges: clampedAges,
                    noOfRooms: Math.max(1, safeCount),
                    assignedRooms: autoAssigned,
                    roomNumber: assignedRm,
                    rate: resolvedRate
                };
            }
            if (field === 'roomNumber') {
                const selectedRoomNum = String(value);
                const canonicalRoom = getCanonicalRooms().find(cr => cr.number === selectedRoomNum);
                const dynamicTypes = getDynamicRoomTypes();
                const matchedType = dynamicTypes.find(t => t.name === r.roomType);
                const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || r.rate || 3000;
                const newRate = calculateTariffForRatePlan(r.ratePlan, r.roomType, canonicalRate, r.adults, r.children, availableRatePlans);
                return {
                    ...r,
                    roomNumber: selectedRoomNum,
                    assignedRooms: [selectedRoomNum],
                    rate: newRate
                };
            }
            if (field === 'noOfRooms') {
                const rawVal = Number(value);
                const maxAllowed = getMaxRoomsAllowedForRow(r.roomType, id);
                const safeCount = Math.max(1, isNaN(rawVal) ? 1 : Math.min(rawVal, maxAllowed));
                if (!isNaN(rawVal) && rawVal > maxAllowed) {
                    toast.warning(`Overbooking Prevented: Only ${maxAllowed} room(s) available for ${r.roomType}!`);
                }
                const autoAssigned = getAutoAssignedRoomsForRow({ ...r, noOfRooms: safeCount });
                return { 
                    ...r, 
                    noOfRooms: safeCount,
                    assignedRooms: autoAssigned,
                    roomNumber: autoAssigned[0] || r.roomNumber
                };
            }
            if (field === 'assignedRooms') {
                const list = Array.isArray(value) ? value : [];
                return {
                    ...r,
                    assignedRooms: list,
                    roomNumber: list[0] || r.roomNumber
                };
            }
            return { ...r, [field]: value };
        }));
    };

    // Payment handlers
    const handleAddPaymentRow = () => {
        const nextId = paymentRows.length > 0 ? Math.max(...paymentRows.map(p => p.id)) + 1 : 1;
        setPaymentRows([
            ...paymentRows,
            { id: nextId, method: 'Cash', amount: totalDue > 0 ? totalDue : 0 }
        ]);
    };

    const handleRemovePaymentRow = (id: number) => {
        if (paymentRows.length <= 1) return;
        setPaymentRows(paymentRows.filter(p => p.id !== id));
    };

    const handlePaymentRowChange = <K extends keyof PaymentRow>(id: number, field: K, value: PaymentRow[K]) => {
        setPaymentRows(paymentRows.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    // Submit reservation action
    const handleCompleteReservation = (status: 'hold' | 'confirmed' | 'stayover' | 'arrived') => {
        if (availableRatePlans.length === 0) {
            toast.error('Cannot proceed: No Rate Plans configured. Please configure Rate Plans in Rate Plan Management (/rate-plans) first!');
            return;
        }

        if (hasOverbookingError) {
            toast.error('Overbooking Prevented: Requested rooms exceed available inventory for the selected dates!');
            return;
        }

        // Allocate physical rooms strictly from genuinely available rooms across ALL rows and their quantities
        const usedRoomsAcrossBooking = new Set<string>();
        const allocatedRoomNumbers: string[] = [];
        const rowAllocatedMap = new Map<number, string[]>();

        for (const r of roomsList) {
            const countNeeded = Number(r.noOfRooms) || 1;
            let roomsForThisRow: string[] = [];

            if (r.assignedRooms && r.assignedRooms.length === countNeeded && r.assignedRooms.every(rm => !usedRoomsAcrossBooking.has(rm))) {
                roomsForThisRow = [...r.assignedRooms];
            } else if (countNeeded === 1 && r.roomNumber && !usedRoomsAcrossBooking.has(r.roomNumber)) {
                roomsForThisRow = [r.roomNumber];
            } else {
                const report = getAvailableRoomsForStay(checkInDate, checkOutDate, r.roomType, {
                    currentSessionLockId: sessionLockId || undefined
                });
                const freeRooms = report.availableRooms.filter(ar => !usedRoomsAcrossBooking.has(ar.number));
                roomsForThisRow = freeRooms.slice(0, countNeeded).map(ar => ar.number);

                if (roomsForThisRow.length < countNeeded) {
                    const fallback = getAutoAssignedRoomsForRow(r);
                    fallback.forEach(f => {
                        if (roomsForThisRow.length < countNeeded && !roomsForThisRow.includes(f) && !usedRoomsAcrossBooking.has(f)) {
                            roomsForThisRow.push(f);
                        }
                    });
                }
            }

            if (roomsForThisRow.length < countNeeded) {
                toast.error(`Overbooking Prevented: Only ${roomsForThisRow.length} available room(s) found for ${r.roomType} (requested ${countNeeded})!`);
                return;
            }

            rowAllocatedMap.set(r.id, roomsForThisRow);
            roomsForThisRow.forEach(rm => {
                allocatedRoomNumbers.push(rm);
                usedRoomsAcrossBooking.add(rm);
            });
        }

        const primaryRoom = allocatedRoomNumbers[0] || roomsList[0]?.roomNumber || roomInfo?.room || '101';
        const guestDisplayName = name.trim() ? `${title} ${name.trim()}` : `Walk-In Guest (${primaryRoom})`;

        const isGroup = allocatedRoomNumbers.length > 1;
        const reservationNumber = generateMasterReservationNumber();
        const groupCode = isGroup ? generateGroupCode() : undefined;
        const regNo = (status === 'arrived' || (status as string) === 'in-house') ? generateRegistrationNumber(reservationNumber) : undefined;
        const folioNo = generateFolioNumber(reservationNumber);

        const assignedRoomsExpanded = roomsList.flatMap((r) => {
            const countNeeded = Number(r.noOfRooms) || 1;
            const assigned = rowAllocatedMap.get(r.id) || (
                (r.assignedRooms && r.assignedRooms.length === countNeeded)
                    ? r.assignedRooms
                    : [r.roomNumber]
            );
            return assigned.map(rm => {
                const dateConf = r.roomDatesMap?.[rm];
                return {
                    ...r,
                    noOfRooms: 1,
                    roomNumber: rm,
                    assignedRooms: [rm],
                    checkInDate: dateConf?.checkIn || checkInDate,
                    checkOutDate: dayUse ? checkInDate : (dateConf?.checkOut || checkOutDate),
                    nights: dayUse ? 0 : (dateConf?.nights || nights),
                    dayUse,
                    isDayUse: dayUse
                };
            });
        });

        const subRoomsWithNumbers = assignedRoomsExpanded.map((rm, idx) => {
            const subBookingNum = isGroup ? generateSubBookingNumber(reservationNumber, idx + 1) : `${reservationNumber}-01`;
            const roomRegNo = (status === 'arrived' || (status as string) === 'in-house') ? generateRegistrationNumber(subBookingNum) : undefined;
            const roomFolioNo = generateFolioNumber(subBookingNum);
            return {
                ...rm,
                subBookingNumber: subBookingNum,
                registrationNumber: roomRegNo,
                folioNumber: roomFolioNo
            };
        });

        // Save to localStorage for full application persistence
        const newRecord = {
            id: Date.now(),
            reservationNumber,
            groupCode,
            subBookingNumber: isGroup ? `${reservationNumber}-01` : `${reservationNumber}-01`,
            isGroup,
            registrationNumber: regNo,
            registeredAt: (status === 'arrived' || (status as string) === 'in-house') ? new Date().toISOString() : undefined,
            folioNumber: folioNo,
            guestName: guestDisplayName,
            phone: mobile || 'N/A',
            roomNumber: primaryRoom,
            roomType: roomsList[0]?.roomType || 'Standard Room',
            allocatedRooms: allocatedRoomNumbers,
            roomsCount: totalRoomsAllocatedInForm,
            checkIn: checkInDate,
            checkOut: dayUse ? checkInDate : checkOutDate,
            nights: dayUse ? 0 : nights,
            dayUse,
            isDayUse: dayUse,
            adults: roomsList.reduce((acc, r) => acc + r.adults, 0),
            children: roomsList.reduce((acc, r) => acc + r.children, 0),
            status,
            totalAmount: finalPayable,
            paidAmount: status === 'hold' ? 0 : totalPaid,
            dueAmount: status === 'hold' ? finalPayable : totalDue,
            taxApplicable,
            taxConfigId: selectedTaxConfigId,
            taxConfigCode: taxCalculation.configCode,
            baseAmount: netBaseAmount,
            serviceChargeAmount: taxCalculation.serviceChargeAmount,
            vatAmount: taxCalculation.vatAmount,
            otherTaxesAmount: taxCalculation.otherTaxesAmount,
            totalTaxAmount: taxCalculation.totalTaxAmount,
            taxDetails: {
                isTaxApplicable: taxApplicable,
                configId: taxCalculation.configId,
                configName: taxCalculation.configName,
                configCode: taxCalculation.configCode,
                baseAmount: netBaseAmount,
                serviceChargeAmount: taxCalculation.serviceChargeAmount,
                vatAmount: taxCalculation.vatAmount,
                otherTaxesAmount: taxCalculation.otherTaxesAmount,
                totalTaxAmount: taxCalculation.totalTaxAmount,
                breakdown: taxCalculation.breakdown
            },
            source: businessSource,
            roomsList: subRoomsWithNumbers,
            groupRoomsList: subRoomsWithNumbers.map((rm, idx) => ({
                reservationNumber: rm.subBookingNumber,
                masterReservationNumber: reservationNumber,
                subBookingNumber: rm.subBookingNumber,
                registrationNumber: rm.registrationNumber,
                folioNumber: rm.folioNumber,
                roomNumber: rm.roomNumber,
                roomType: rm.roomType || roomsList[0]?.roomType || 'Standard Room',
                ratePlan: rm.ratePlan || roomsList[0]?.ratePlan || 'Standard Rate',
                guestName: guestDisplayName,
                adults: rm.adults || 1,
                children: rm.children || 0,
                status,
                checkIn: rm.checkInDate || checkInDate,
                checkOut: rm.checkOutDate || (dayUse ? checkInDate : checkOutDate),
                isPrimary: idx === 0,
                groupCode
            })),
            servicesBundle: roomsList[0]?.servicesBundle || { extraBed: roomsList[0]?.extraBed, pickup: roomsList[0]?.pickup },
            extraBed: roomsList[0]?.servicesBundle?.extraBed || roomsList[0]?.extraBed || null,
            pickup: roomsList[0]?.servicesBundle?.pickup || roomsList[0]?.pickup || null,
            mealPlan: roomsList[0]?.servicesBundle?.mealPlan || null,
            celebration: roomsList[0]?.servicesBundle?.celebration || null,
            spaWellness: roomsList[0]?.servicesBundle?.spaWellness || null,
            timingFlex: roomsList[0]?.servicesBundle?.timingFlex || null,
            customAddons: roomsList[0]?.servicesBundle?.customAddons || [],
            addonCharges: {
                extraBed: totalExtraBedCharge,
                pickup: totalPickupArrivalCharge,
                drop: totalDropDepartureCharge,
                transferTotal: totalPickupCharge,
                mealPlan: totalMealPlanCharge,
                celebration: totalCelebrationCharge,
                spa: totalSpaCharge,
                timingFlex: totalTimingCharge,
                custom: totalCustomCharge,
                total: totalAllAddonsCharges
            },
            createdAt: new Date().toISOString()
        };

        // Validate and Commit Atomically using room inventory engine
        const validation = validateAndCommitReservation(newRecord, sessionLockId ? [sessionLockId] : undefined);
        if (!validation.success) {
            const altMsg = validation.suggestedAlternates && validation.suggestedAlternates.length > 0
                ? ` Suggested available rooms: ${validation.suggestedAlternates.map(a => `${a.requestedRoom} → [${a.alternatives.map(r => r.number).join(', ')}]`).join('; ')}`
                : '';
            toast.error(`${validation.errorTitle || 'Booking Failed'}: ${validation.errorMessage}${altMsg}`);
            return;
        }

        toast.success(
            status === 'hold' 
                ? `Reservation ${newRecord.reservationNumber} placed on Hold!` 
                : status === 'arrived' 
                    ? `Guest checked in immediately to Room ${primaryRoom}!` 
                    : `Reservation ${newRecord.reservationNumber} confirmed successfully!`
        );

        // Call parent callbacks
        if (onReserve) {
            onReserve({
                room: primaryRoom,
                startIndex: roomInfo?.startIndex !== undefined ? roomInfo.startIndex : 0,
                endIndex: roomInfo?.endIndex !== undefined ? roomInfo.endIndex : ((roomInfo?.startIndex || 0) + nights - 1),
                guestName: guestDisplayName,
                status
            });
        }
        if (onReservationCreated) {
            onReservationCreated(newRecord);
        }

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
            <div className="bg-white w-[96%] max-w-[880px] max-h-[88vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-200">
                {/* Modern Light Header */}
                <div className="bg-slate-50/90 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                            <CalendarIcon size={14} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm text-slate-800 tracking-tight m-0">Quick Reservation</h2>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    Express Mode
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500 m-0 font-medium">Fast Front Desk Walk-In &amp; Express Booking</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-1.5 rounded-lg transition-colors cursor-pointer"
                        title="Close Modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Compact Segmented Tabs */}
                <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div className="flex p-0.5 bg-slate-100/90 rounded-lg border border-slate-200/80">
                        <button
                            type="button"
                            onClick={() => setActiveTab('reservation')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                                activeTab === 'reservation'
                                    ? 'bg-white text-blue-900 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            1. Reservation Details
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('payment')}
                            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                                activeTab === 'payment'
                                    ? 'bg-white text-blue-900 shadow-2xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            2. Payment &amp; Billing
                        </button>
                    </div>

                    <div className="text-[11px] font-medium text-slate-500 hidden sm:block">
                        Total: <strong className="text-slate-900 font-bold">BDT {finalPayable.toLocaleString()}</strong>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 bg-white space-y-3.5">
                    {activeTab === 'reservation' && (
                        <div className="space-y-3 animate-in fade-in duration-100">
                            {/* Parameters Card Container (matching Add Reservation) */}
                            <div className="bg-slate-50/70 border border-slate-200/90 rounded-lg p-3 shadow-2xs space-y-2.5">
                                {/* Top Grid Fields: Consolidated Stay Period Picker + Day Use + Source + Agent */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                                    {/* Consolidated Single Stay Dates Controller */}
                                    <div className="md:col-span-6">
                                        <StayPeriodPicker
                                            checkIn={checkInDate}
                                            checkOut={checkOutDate}
                                            nights={nights}
                                            dayUse={dayUse}
                                            onDateChange={(newIn, newOut, newNights) => {
                                                setCheckInDate(newIn);
                                                if (dayUse) {
                                                    setCheckOutDate(newIn);
                                                    setNights(0);
                                                } else {
                                                    setCheckOutDate(newOut);
                                                    setNights(newNights);
                                                }
                                            }}
                                            compact
                                            label="Stay Period (Check In - Check Out)"
                                        />
                                    </div>

                                    {/* Day Use Card (Matching Add Reservation) */}
                                    <div className="md:col-span-2 flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <Clock size={11} className="text-amber-600" />
                                            <span>Day Use</span>
                                        </label>
                                        <label
                                            className={`w-full h-7.5 px-2 rounded-md border flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer select-none transition-all shadow-2xs ${
                                                dayUse
                                                    ? 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-300'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300'
                                            }`}
                                            title="Toggle Day Use (Check-in and Check-out on same day, 0 nights)"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={dayUse}
                                                onChange={e => handleDayUseToggle(e.target.checked)}
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                            />
                                            <span className="whitespace-nowrap">Day Use</span>
                                        </label>
                                    </div>

                                    <div className="md:col-span-2 flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <span>Source</span>
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={businessSource}
                                            onChange={e => setBusinessSource(e.target.value)}
                                            className="w-full h-7.5 px-2 border border-slate-200 rounded-md text-[11px] bg-white text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-medium transition-all"
                                        >
                                            <option value="Direct">Direct</option>
                                            <option value="Booking.com">Booking.com</option>
                                            <option value="Agoda">Agoda</option>
                                            <option value="Expedia">Expedia</option>
                                            <option value="Corporate">Corporate</option>
                                            <option value="Walk-In">Walk-In</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2 flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <span>Agent</span>
                                            <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={businessAgent}
                                            onChange={e => setBusinessAgent(e.target.value)}
                                            className="w-full h-7.5 px-2 border border-slate-200 rounded-md text-[11px] bg-white text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-medium transition-all"
                                        >
                                            <option value="Direct">Direct</option>
                                            <option value="Front Desk">Front Desk</option>
                                            <option value="Agent A">Agent A</option>
                                            <option value="Corporate Rep">Corporate Rep</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Options Row */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer select-none hover:text-slate-900">
                                            <input
                                                type="checkbox"
                                                checked={taxApplicable}
                                                onChange={e => setTaxApplicable(e.target.checked)}
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <span>Tax &amp; VAT Applicable</span>
                                        </label>

                                        {taxApplicable && (
                                            <select
                                                value={selectedTaxConfigId}
                                                onChange={e => setSelectedTaxConfigId(e.target.value)}
                                                className="text-[10px] font-medium text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 max-w-[210px] truncate shadow-2xs focus:outline-none focus:border-blue-500 cursor-pointer"
                                                title="Select Active Tax Policy from /taxes-vat"
                                            >
                                                {availableTaxConfigs.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {dayUse && (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded shadow-2xs">
                                            <Clock size={11} className="text-amber-700" />
                                            <span>Day Use Active (0 Nights • Same-Day Departure)</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Rooms Table (Compact & Perfectly Sized - Zero Horizontal Overflow) */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-slate-700 uppercase tracking-wider">
                                            Room Allocation &amp; Inventory Check
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] shadow-2xs transition-all ${
                                            remainingOverallFreeRooms > 0 
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                                : 'bg-amber-50 text-amber-800 border-amber-300'
                                        }`}>
                                            <CheckCircle2 size={12} className={remainingOverallFreeRooms > 0 ? "text-emerald-600" : "text-amber-600"} />
                                            <span>{remainingOverallFreeRooms} of {liveAvailabilityReport.totalCount} Rooms Available</span>
                                            <span className="text-[9.5px] font-normal text-slate-500 font-mono">({totalRoomsAllocatedInForm} Selected)</span>
                                        </span>
                                    </div>
                                    <span className="text-[10.5px] text-slate-500 font-medium">
                                        Dates: <strong className="text-blue-900">{checkInDate}</strong> to <strong className="text-blue-900">{dayUse ? checkInDate : checkOutDate}</strong> ({dayUse ? 'Day Use • 0N' : `${nights}N`})
                                    </span>
                                </div>

                                {hasOverbookingError && (
                                    <div className="mx-3 my-2 p-2 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-red-600 flex-shrink-0 animate-pulse" />
                                        <span>⚠️ Overbooking Warning: Room quantity exceeds total available rooms in this category! Please adjust room counts.</span>
                                    </div>
                                )}

                                {availableRatePlans.length === 0 && (
                                    <div className="mx-3 my-2 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-2 shadow-2xs">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                                            <span>
                                                <strong>No Active Rate Plans Found:</strong> Please configure Rate Plans in{' '}
                                                <a href="/rate-plans" className="underline text-blue-700 hover:text-blue-900">
                                                    Rate Plan Management (/rate-plans)
                                                </a>{' '}
                                                first before booking.
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="overflow-x-hidden">
                                    <table className="w-full text-left border-collapse text-[11px] table-auto">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                                                <th className="py-2 px-2.5 min-w-[120px]">Room Type</th>
                                                <th className="py-2 px-1 text-center w-11">Qty</th>
                                                <th className="py-2 px-2 min-w-[120px]">Rate Plan</th>
                                                <th className="py-2 px-1 text-center w-16">Room No.</th>
                                                <th className="py-2 px-1 text-center w-11">Adult</th>
                                                <th className="py-2 px-1 text-center w-22">Child</th>
                                                <th className="py-2 px-1.5 text-right w-20">Rate</th>
                                                <th className="py-2 px-2 text-right w-24">Total</th>
                                                <th className="py-2 px-1.5 text-center w-16">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {roomsList.map(item => {
                                                const bundle = item.servicesBundle || { extraBed: item.extraBed, pickup: item.pickup };
                                                const itemAddons = getRoomBundleTotal(bundle, nightMultiplier);
                                                const baseLineTotal = item.rate * item.noOfRooms * nightMultiplier;
                                                const lineTotal = baseLineTotal + itemAddons;

                                                return (
                                                    <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                                                        <td className="py-1.5 px-2.5">
                                                            <select
                                                                value={item.roomType}
                                                                onChange={e => handleRoomFieldChange(item.id, 'roomType', e.target.value)}
                                                                className="w-full min-w-[130px] max-w-[155px] h-7 px-1.5 border border-slate-200 rounded text-[11px] bg-white outline-none cursor-pointer font-medium text-slate-800"
                                                            >
                                                                {getDynamicRoomTypes().map(typeObj => typeObj.name).map(typeOpt => {
                                                                    const availForRow = getMaxRoomsAllowedForRow(typeOpt, item.id);
                                                                    const isSoldOut = availForRow <= 0;
                                                                    return (
                                                                        <option key={typeOpt} value={typeOpt} disabled={isSoldOut && typeOpt !== item.roomType}>
                                                                            {typeOpt} {isSoldOut ? '[Sold Out]' : `[${availForRow} Available]`}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                            {/* Ultra-Compact & Elegant Active Addons Pill */}
                                                            {(() => {
                                                                const b = item.servicesBundle || { extraBed: item.extraBed, pickup: item.pickup };
                                                                const activeNames: string[] = [];
                                                                if (b.pickup?.enabled) activeNames.push('Pickup');
                                                                if (b.pickup?.dropEnabled) activeNames.push('Drop');
                                                                if (b.extraBed?.enabled) activeNames.push(`${b.extraBed.quantity || 1}x Bed`);
                                                                if (b.mealPlan?.enabled) activeNames.push(b.mealPlan.planType.split(' ')[0]);
                                                                if (b.celebration?.enabled) activeNames.push('Decor');
                                                                if (b.spaWellness?.enabled) activeNames.push('Spa');
                                                                if (b.timingFlex?.earlyCheckIn || b.timingFlex?.lateCheckOut) activeNames.push('Flex');
                                                                if (b.customAddons && b.customAddons.length > 0) activeNames.push(`+${b.customAddons.length} Extra`);

                                                                if (activeNames.length === 0) return null;

                                                                const addonsCost = getRoomBundleTotal(b, nightMultiplier);
                                                                const scopeLabel = b.targetRoomNumber && b.targetRoomNumber !== 'All Rooms' ? ` (${b.targetRoomNumber})` : '';

                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'pickup' })}
                                                                        className="mt-1 w-full max-w-[155px] h-5.5 px-1.5 rounded-md bg-blue-50/90 hover:bg-blue-100 border border-blue-200/80 text-blue-900 text-[10px] font-semibold flex items-center justify-between shadow-2xs cursor-pointer transition-all select-none group"
                                                                        title={`Configured Services${scopeLabel}: ${activeNames.join(', ')} (Click to edit)`}
                                                                    >
                                                                        <div className="flex items-center gap-1 truncate">
                                                                            <Sparkles size={10} className="text-blue-600 flex-shrink-0" />
                                                                            <span className="truncate">{activeNames.slice(0, 2).join(', ')}{activeNames.length > 2 ? ` +${activeNames.length - 2}` : ''}{scopeLabel}</span>
                                                                        </div>
                                                                        <span className="text-[8.5px] text-blue-700 bg-white/90 px-1 rounded border border-blue-200/60 flex-shrink-0 ml-1">
                                                                            +৳{addonsCost.toLocaleString()}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="py-1.5 px-1 text-center">
                                                            {(() => {
                                                                const maxAllowed = getMaxRoomsAllowedForRow(item.roomType, item.id);
                                                                const freeLeft = getRemainingFreeCountForType(item.roomType);
                                                                const isExceeded = (Number(item.noOfRooms) || 1) > maxAllowed;
                                                                return (
                                                                    <div className="flex flex-col items-center">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            max={maxAllowed}
                                                                            value={item.noOfRooms}
                                                                            onChange={e => {
                                                                                const raw = parseInt(e.target.value);
                                                                                if (isNaN(raw) || raw < 1) {
                                                                                    handleRoomFieldChange(item.id, 'noOfRooms', 1);
                                                                                    return;
                                                                                }
                                                                                if (raw > maxAllowed) {
                                                                                    toast.warning(`Overbooking Prevented: Only ${maxAllowed} room(s) available for ${item.roomType}!`);
                                                                                    handleRoomFieldChange(item.id, 'noOfRooms', maxAllowed);
                                                                                } else {
                                                                                    handleRoomFieldChange(item.id, 'noOfRooms', raw);
                                                                                }
                                                                            }}
                                                                            className={`w-10 h-7 px-0.5 border rounded text-[11px] text-center outline-none mx-auto block transition-all ${
                                                                                isExceeded 
                                                                                    ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-400' 
                                                                                    : 'border-slate-200 focus:border-blue-500'
                                                                            }`}
                                                                        />
                                                                        <span className={`text-[8.5px] font-semibold mt-0.5 whitespace-nowrap ${isExceeded ? 'text-red-600 font-bold' : 'text-slate-400'}`} title="Maximum available inventory">
                                                                            Max: {maxAllowed} ({freeLeft} free)
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="py-1.5 px-2">
                                                            <select
                                                                value={item.ratePlan}
                                                                onChange={e => handleRoomFieldChange(item.id, 'ratePlan', e.target.value)}
                                                                className="w-full min-w-[115px] max-w-[140px] h-7 px-1.5 border border-slate-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                            >
                                                                {availableRatePlans.length === 0 ? (
                                                                    <option value="" disabled>No rate plans configured (Configure in Rate Plans)</option>
                                                                ) : (
                                                                    availableRatePlans.map(p => (
                                                                        <option key={p.id} value={p.name}>{p.name}</option>
                                                                    ))
                                                                )}
                                                            </select>
                                                        </td>
                                                        <td className="py-1.5 px-1 text-center">
                                                            {item.noOfRooms > 1 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setMultiRoomModal({
                                                                        isOpen: true,
                                                                        rowId: item.id,
                                                                        roomType: item.roomType,
                                                                        requiredCount: item.noOfRooms,
                                                                        isAutoMode: true
                                                                    })}
                                                                    className="w-24 h-7 px-1.5 border border-blue-300 bg-blue-50/80 hover:bg-blue-100 text-blue-900 rounded text-[10px] flex items-center justify-between cursor-pointer select-none shadow-2xs mx-auto transition-all"
                                                                    title={`Assigned Rooms: ${(item.assignedRooms && item.assignedRooms.length === item.noOfRooms ? item.assignedRooms : getAutoAssignedRoomsForRow(item)).join(', ')} (Click to view/customize)`}
                                                                >
                                                                    <div className="flex items-center gap-1 truncate">
                                                                        <Sparkles size={11} className="text-blue-600 flex-shrink-0" />
                                                                        <span className="text-blue-700 font-extrabold truncate">Auto ({item.noOfRooms})</span>
                                                                    </div>
                                                                    <span className="text-[9px] font-mono text-slate-700 bg-white/90 px-1 py-0.5 rounded border border-blue-200/60 ml-1 truncate max-w-[50px]">
                                                                        {(item.assignedRooms && item.assignedRooms.length === item.noOfRooms ? item.assignedRooms : getAutoAssignedRoomsForRow(item)).map(rm => {
                                                                            const conf = item.roomDatesMap?.[rm];
                                                                            return conf && conf.nights !== nights ? `${rm}(${conf.nights}N)` : rm;
                                                                        }).slice(0, 2).join(',')}{(item.assignedRooms?.length || item.noOfRooms) > 2 ? '..' : ''}
                                                                    </span>
                                                                </button>
                                                            ) : (
                                                                <select
                                                                    value={item.roomNumber}
                                                                    onChange={e => {
                                                                        const val = e.target.value;
                                                                        handleRoomFieldChange(item.id, 'roomNumber', val);
                                                                        handleRoomFieldChange(item.id, 'assignedRooms', [val]);
                                                                    }}
                                                                    className="w-24 h-7 px-1 border border-slate-200 rounded text-[11px] font-mono text-blue-700 bg-white outline-none text-center mx-auto block cursor-pointer"
                                                                >
                                                                    {(() => {
                                                                        const otherRowsRooms = new Set<string>();
                                                                        roomsList.forEach(other => {
                                                                            if (other.id === item.id) return;
                                                                            if (other.assignedRooms && other.assignedRooms.length > 0) {
                                                                                other.assignedRooms.forEach(rn => otherRowsRooms.add(rn));
                                                                            } else if (other.roomNumber) {
                                                                                otherRowsRooms.add(other.roomNumber);
                                                                            }
                                                                        });
                                                                        const matchingStatus = liveAvailabilityReport.allRoomsStatus.filter(st =>
                                                                            st.room.roomTypeName.toLowerCase().includes(item.roomType.toLowerCase()) ||
                                                                            item.roomType.toLowerCase().includes(st.room.roomTypeName.toLowerCase())
                                                                        );
                                                                        const listToDisplay = matchingStatus.length > 0 ? matchingStatus : liveAvailabilityReport.allRoomsStatus;

                                                                        return listToDisplay.map(st => {
                                                                            const isUsedInOther = otherRowsRooms.has(st.room.number);
                                                                            const isAvail = st.isAvailable && !isUsedInOther;
                                                                            let tag = 'Free';
                                                                            if (isUsedInOther) tag = 'In Form';
                                                                            else if (!st.isAvailable) tag = 'Booked';
                                                                            const conn = connectingRoomsMap.get(String(st.room.number));

                                                                            return (
                                                                                <option
                                                                                    key={st.room.number}
                                                                                    value={st.room.number}
                                                                                    disabled={!isAvail && item.roomNumber !== st.room.number}
                                                                                >
                                                                                    {st.room.number}{conn ? ` 🔗${conn.partnerRoom}` : ''} ({tag})
                                                                                </option>
                                                                            );
                                                                        });
                                                                    })()}
                                                                </select>
                                                            )}
                                                        </td>
                                                        {(() => {
                                                            const capacity = getRoomTypeCapacity(item.roomType);
                                                            return (
                                                                <>
                                                                    <td className="py-1.5 px-1 text-center">
                                                                        <div className="flex flex-col items-center">
                                                                            <input
                                                                                type="number"
                                                                                min={1}
                                                                                max={capacity.maxAdults}
                                                                                value={item.adults}
                                                                                onChange={e => handleRoomFieldChange(item.id, 'adults', parseInt(e.target.value) || 1)}
                                                                                className="w-10 h-7 px-0.5 border border-slate-200 rounded text-[11px] font-semibold text-center outline-none mx-auto block focus:border-blue-500"
                                                                                title={`Adults: 1 to ${capacity.maxAdults} for ${item.roomType}`}
                                                                            />
                                                                            <span className="text-[8.5px] text-slate-400">max {capacity.maxAdults}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-1.5 px-1 text-center">
                                                                        <ChildAgeSelector
                                                                            childrenCount={item.children}
                                                                            childrenAges={item.childrenAges}
                                                                            maxChildren={capacity.maxChildren}
                                                                            onChange={(count, ages) => {
                                                                                const assignedRm = item.roomNumber;
                                                                                const canonicalRoom = getCanonicalRooms().find(cr => cr.number === assignedRm);
                                                                                const dynamicTypes = getDynamicRoomTypes();
                                                                                const matchedType = dynamicTypes.find(t => t.name === item.roomType);
                                                                                const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || item.rate || 3000;
                                                                                const newRate = calculateTariffForRatePlan(item.ratePlan, item.roomType, canonicalRate, item.adults, count, availableRatePlans);
                                                                                setRoomsList(prev => prev.map(r => r.id === item.id ? { ...r, children: count, childrenAges: ages, rate: newRate } : r));
                                                                            }}
                                                                            compact
                                                                        />
                                                                    </td>
                                                                </>
                                                            );
                                                        })()}
                                                        <td className="py-1.5 px-1.5 text-right">
                                                            <input
                                                                type="number"
                                                                value={item.rate}
                                                                onChange={e => handleRoomFieldChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                                                className="w-16 h-7 px-1 border border-slate-200 rounded text-[11px] font-semibold text-right outline-none ml-auto block"
                                                            />
                                                        </td>
                                                        <td className="py-1.5 px-2 text-right text-slate-800 whitespace-nowrap text-[11px]">
                                                            <div>৳{lineTotal.toLocaleString()}</div>
                                                            {itemAddons > 0 && (
                                                                <div className="text-[9px] text-slate-400 font-normal">
                                                                    Base: {baseLineTotal.toLocaleString()} + Svc: {itemAddons.toLocaleString()}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-1.5 px-1.5 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                {item.noOfRooms > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSplitRowIntoRooms(item.id)}
                                                                        title={`Split group row into ${item.noOfRooms} separate room rows`}
                                                                        className="px-1.5 py-0.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer transition-colors flex items-center gap-0.5 text-[9px] shadow-2xs"
                                                                    >
                                                                        <Split size={11} className="text-blue-600" />
                                                                        <span>Split</span>
                                                                    </button>
                                                                )}
                                                                {/* 3-dots Menu Button anchored cleanly with Portal */}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleToggleRowMenu(e, item.id)}
                                                                    title="Room Add-On Services (Transfer, Bed, Dining, Spa, Romance, Flex)"
                                                                    className={`p-1 rounded cursor-pointer transition-all ${
                                                                        (item.servicesBundle || item.extraBed?.enabled || item.pickup?.enabled)
                                                                            ? 'text-blue-700 bg-blue-100/70 hover:bg-blue-200/70 ring-1 ring-blue-300'
                                                                            : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                                                                    }`}
                                                                >
                                                                    <MoreVertical size={13} />
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveRoom(item.id)}
                                                                    disabled={roomsList.length <= 1}
                                                                    className="text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer p-1 transition-colors"
                                                                    title="Delete Room Row"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleAddRoom}
                                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md shadow-2xs cursor-pointer inline-flex items-center gap-1 transition-colors"
                                >
                                    + Add Room
                                </button>

                                {/* 1-Click Partner Room Pairing if a selected room belongs to a Connecting Suite */}
                                {(() => {
                                    const currentSelectedSet = new Set(
                                        roomsList.flatMap(r => (r.assignedRooms && r.assignedRooms.length > 0 ? r.assignedRooms : [r.roomNumber]))
                                    );
                                    const matchedSuites = connectingSuites.filter(suite =>
                                        suite.roomNumbers.some(rn => currentSelectedSet.has(rn)) &&
                                        suite.roomNumbers.some(rn => !currentSelectedSet.has(rn))
                                    );
                                    return matchedSuites.map(suite => {
                                        const missing = suite.roomNumbers.filter(rn => !currentSelectedSet.has(rn));
                                        const allFree = missing.every(rn => liveAvailabilityReport.availableRooms.some(ar => ar.number === rn));
                                        return (
                                            <button
                                                key={`pair-${suite.id}`}
                                                type="button"
                                                disabled={!allFree}
                                                onClick={() => handleBookConnectingSuite(suite, false)}
                                                className={`text-xs font-semibold px-2.5 py-1 rounded-md shadow-2xs inline-flex items-center gap-1.5 transition-all ${
                                                    allFree
                                                        ? 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 hover:border-indigo-600 cursor-pointer'
                                                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                                }`}
                                                title={allFree ? `Pair with connecting Room ${missing.join(', ')} (${suite.name})` : `Partner Room ${missing.join(', ')} is currently occupied`}
                                            >
                                                <Link2 size={12} />
                                                <span>
                                                    + Pair Connecting Room {missing.join(', ')} ({suite.name})
                                                    {!allFree ? ' [Occupied]' : ''}
                                                </span>
                                            </button>
                                        );
                                    });
                                })()}

                                {/* Dropdown / Button to Book Any Configured Connecting Suite */}
                                {connectingSuites.length > 0 && (
                                    <div className="inline-flex items-center gap-1.5">
                                        {connectingSuites.map(suite => {
                                            const currentSelectedSet = new Set(
                                                roomsList.flatMap(r => (r.assignedRooms && r.assignedRooms.length > 0 ? r.assignedRooms : [r.roomNumber]))
                                            );
                                            const isAlreadyFull = suite.roomNumbers.every(rn => currentSelectedSet.has(rn));
                                            if (isAlreadyFull) {
                                                return (
                                                    <span
                                                        key={`active-${suite.id}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold"
                                                    >
                                                        <Link2 size={11} className="text-emerald-600" />
                                                        <span>{suite.name} ({suite.roomNumbers.join(' & ')}) Active</span>
                                                    </span>
                                                );
                                            }
                                            const allFree = suite.roomNumbers.every(rn =>
                                                currentSelectedSet.has(rn) || liveAvailabilityReport.availableRooms.some(ar => ar.number === rn)
                                            );
                                            return (
                                                <button
                                                    key={`suite-${suite.id}`}
                                                    type="button"
                                                    disabled={!allFree}
                                                    onClick={() => handleBookConnectingSuite(suite, true)}
                                                    className={`text-xs font-semibold px-2.5 py-1 rounded-md shadow-2xs inline-flex items-center gap-1.5 transition-all ${
                                                        allFree
                                                            ? 'border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 cursor-pointer'
                                                            : 'border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                                                    }`}
                                                    title={`Book entire Connecting Suite: ${suite.name} (Rooms ${suite.roomNumbers.join(' & ')})`}
                                                >
                                                    <Link2 size={12} />
                                                    <span>Book {suite.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Guest Quick Info */}
                            <div className="bg-slate-50/50 border border-slate-200/90 rounded-lg p-3 shadow-2xs space-y-2">
                                <h3 className="text-[10px] text-slate-700 uppercase tracking-wider m-0">
                                    Guest Profile
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold text-slate-600">Title</label>
                                        <select
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            className="w-full h-7.5 px-2 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500"
                                        >
                                            <option value="Mr.">Mr.</option>
                                            <option value="Mrs.">Mrs.</option>
                                            <option value="Ms.">Ms.</option>
                                            <option value="Dr.">Dr.</option>
                                            <option value="Prof.">Prof.</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold text-slate-600">
                                            Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Guest full name..."
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full h-7.5 px-2.5 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500 font-medium"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold text-slate-600">
                                            Mobile No. <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 01712-345678"
                                            value={mobile}
                                            onChange={e => setMobile(e.target.value)}
                                            className="w-full h-7.5 px-2.5 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-semibold text-slate-600">Email</label>
                                        <input
                                            type="email"
                                            placeholder="guest@example.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full h-7.5 px-2.5 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payment' && (
                        <div className="animate-in fade-in duration-100">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                                {/* Left: Discount & Payment Methods (7 cols) */}
                                <div className="lg:col-span-7 space-y-3.5">
                                    {/* Discount Section */}
                                    <div className="bg-slate-50/70 border border-slate-200/90 rounded-lg p-3 shadow-2xs">
                                        <h3 className="text-[10px] text-slate-700 uppercase tracking-wider mb-2">Discount</h3>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={discountType}
                                                onChange={e => setDiscountType(e.target.value as any)}
                                                className="w-32 h-7.5 px-2 border border-slate-200 rounded-md text-[11px] bg-white outline-none cursor-pointer"
                                            >
                                                <option value="Fixed">Fixed (BDT)</option>
                                                <option value="Percentage">Percentage (%)</option>
                                            </select>
                                            <input
                                                type="number"
                                                min={0}
                                                value={discountValue || ''}
                                                onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                                                placeholder="0"
                                                className="flex-1 h-7.5 px-2.5 border border-slate-200 rounded-md text-[11px] bg-white outline-none font-bold"
                                            />
                                            {discountValue > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDiscountValue(0)}
                                                    className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                                    title="Clear Discount"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Payment Method Section */}
                                    <div className="bg-slate-50/70 border border-slate-200/90 rounded-lg p-3 shadow-2xs">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-[10px] text-slate-700 uppercase tracking-wider">Payment Method</h3>
                                            <button
                                                type="button"
                                                onClick={handleAddPaymentRow}
                                                className="text-[#1e3a8a] hover:text-blue-900 text-[11px] font-semibold cursor-pointer"
                                            >
                                                + Add Method
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {paymentRows.map(row => (
                                                <div
                                                    key={row.id}
                                                    className="flex items-center gap-2 bg-white p-2 border border-slate-200/80 rounded-md"
                                                >
                                                    <div className="w-1/2 flex flex-col gap-0.5">
                                                        <label className="text-[9.5px] font-semibold text-slate-500">Method</label>
                                                        <select
                                                            value={row.method}
                                                            onChange={e => handlePaymentRowChange(row.id, 'method', e.target.value as any)}
                                                            className="w-full h-7 px-2 border border-slate-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                        >
                                                            <option value="Cash">Cash</option>
                                                            <option value="Card">Card</option>
                                                            <option value="bKash">bKash</option>
                                                            <option value="Bank Transfer">Bank Transfer</option>
                                                        </select>
                                                    </div>

                                                    <div className="w-1/2 flex flex-col gap-0.5">
                                                        <label className="text-[9.5px] font-semibold text-slate-500">Amount (BDT)</label>
                                                        <input
                                                            type="number"
                                                            value={row.amount || ''}
                                                            onChange={e => handlePaymentRowChange(row.id, 'amount', parseFloat(e.target.value) || 0)}
                                                            placeholder="0.00"
                                                            className="w-full h-7 px-2 border border-slate-200 rounded text-[11px] bg-white outline-none font-bold"
                                                        />
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePaymentRow(row.id)}
                                                        disabled={paymentRows.length <= 1}
                                                        className="text-red-400 hover:text-red-600 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer self-end mb-0.5 p-1"
                                                        title="Delete Payment Row"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Summary Box (5 cols) */}
                                <div className="lg:col-span-5">
                                    <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3 shadow-2xs">
                                        <div className="space-y-1 text-[11px]">
                                            <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                                                <span>Room Base ({nights}N)</span>
                                                <span className="font-semibold text-slate-900">৳{roomBaseTotal.toLocaleString()}</span>
                                            </div>

                                            {totalPickupArrivalCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-blue-700">
                                                    <span className="flex items-center gap-1"><Car size={11} /> Airport Pickup (Inbound)</span>
                                                    <span className="font-mono">+৳{totalPickupArrivalCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {totalDropDepartureCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-sky-700">
                                                    <span className="flex items-center gap-1"><Plane size={11} /> Airport Drop (Outbound)</span>
                                                    <span className="font-mono">+৳{totalDropDepartureCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {totalExtraBedCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-indigo-700">
                                                    <span className="flex items-center gap-1"><BedDouble size={11} /> Extra Bed &amp; Cot</span>
                                                    <span className="font-mono">+৳{totalExtraBedCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {totalMealPlanCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-amber-700">
                                                    <span className="flex items-center gap-1"><Utensils size={11} /> Meal Plans</span>
                                                    <span className="font-mono">+৳{totalMealPlanCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {totalCelebrationCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-rose-700">
                                                    <span className="flex items-center gap-1"><Gift size={11} /> Decor &amp; Romance</span>
                                                    <span className="font-mono">+৳{totalCelebrationCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {totalSpaCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-teal-700">
                                                    <span className="flex items-center gap-1"><Sparkles size={11} /> Wellness &amp; Spa</span>
                                                    <span className="font-mono">+৳{totalSpaCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            {totalTimingCharge > 0 && (
                                                <div className="flex justify-between py-0.5 text-sky-700">
                                                    <span className="flex items-center gap-1"><Clock size={11} /> Time Flex</span>
                                                    <span className="font-mono">+৳{totalTimingCharge.toLocaleString()}</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between py-1 border-t border-slate-200 text-slate-700 font-semibold">
                                                <span>Total Gross (Tariff + Addons)</span>
                                                <span className="text-slate-900">৳{totalAmount.toLocaleString()}</span>
                                            </div>

                                            {discountedAmount > 0 && (
                                                <div className="flex justify-between py-1 text-slate-600">
                                                    <span>Discount ({discountType === 'Percentage' ? `${discountValue}%` : 'Flat'})</span>
                                                    <span className="font-semibold text-emerald-700">-৳{discountedAmount.toLocaleString()}</span>
                                                </div>
                                            )}

                                            <div className="flex justify-between py-1 text-slate-800 border-t border-dashed border-slate-200">
                                                <span>Subtotal (Net Base)</span>
                                                <span className="text-slate-900">৳{netBaseAmount.toLocaleString()}</span>
                                            </div>

                                            {taxApplicable && taxCalculation.breakdown.length > 0 && (
                                                <div className="py-1.5 space-y-1 bg-amber-50/70 p-2 rounded-lg border border-amber-200/80 my-1">
                                                    <div className="flex justify-between items-center text-[10px] text-amber-900 uppercase tracking-wider">
                                                        <span>Taxes, VAT &amp; Surcharge</span>
                                                        <span className="font-mono text-amber-900">+৳{taxCalculation.totalTaxAmount.toLocaleString()}</span>
                                                    </div>
                                                    {taxCalculation.breakdown.map((item, idx) => (
                                                        <div key={idx} className="flex justify-between text-[11px] text-slate-600 pl-1">
                                                            <span>{item.name} ({item.rate}%):</span>
                                                            <span className="font-mono font-medium">+৳{item.amount.toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex justify-between py-1 text-slate-900 font-extrabold border-t border-slate-300 text-sm">
                                                <span>Grand Total (Payable)</span>
                                                <span className="text-blue-900">৳{finalPayable.toLocaleString()}</span>
                                            </div>

                                            <div className="flex justify-between py-1 text-slate-600">
                                                <span>Total Advance Paid</span>
                                                <span className="text-emerald-700">৳{totalPaid.toLocaleString()}</span>
                                            </div>

                                            <div className="bg-white -mx-3 -mb-3 px-3 py-2.5 flex justify-between text-xs border-t border-slate-200 rounded-b-lg">
                                                <span className="text-slate-800">Remaining Balance Due:</span>
                                                <span className={totalDue > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                                                    ৳{totalDue.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modern Compact Footer */}
                <div className="border-t border-slate-200 px-4 py-2.5 bg-slate-50/70 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Building2 size={14} className="text-blue-700" />
                        <span>Room: <strong className="text-slate-900 font-mono">{roomsList[0]?.roomNumber || '101'}</strong> ({nights} Night{nights > 1 ? 's' : ''})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={hasOverbookingError}
                            onClick={() => {
                                if (hasOverbookingError) {
                                    toast.error('Cannot proceed: Selected rooms exceed available inventory!');
                                    return;
                                }
                                handleCompleteReservation('hold');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                hasOverbookingError
                                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                    : 'bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 cursor-pointer'
                            }`}
                        >
                            Hold
                        </button>
                        <button
                            type="button"
                            disabled={hasOverbookingError}
                            onClick={() => {
                                if (hasOverbookingError) {
                                    toast.error('Cannot proceed: Selected rooms exceed available inventory!');
                                    return;
                                }
                                handleCompleteReservation('confirmed');
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors ${
                                hasOverbookingError
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-[#1e3a8a] hover:bg-blue-900 text-white cursor-pointer'
                            }`}
                        >
                            Reserve
                        </button>
                        <button
                            type="button"
                            disabled={hasOverbookingError}
                            onClick={() => {
                                if (hasOverbookingError) {
                                    toast.error('Cannot proceed: Selected rooms exceed available inventory!');
                                    return;
                                }
                                handleCompleteReservation('arrived');
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors ${
                                hasOverbookingError
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                            }`}
                        >
                            Check In
                        </button>
                    </div>
                </div>
            </div>

            {/* Room Add-On Services Modal (All Services Bundle) */}
            {serviceModalConfig.isOpen && activeRowForService && (
                <RoomAddonServicesModal
                    isOpen={serviceModalConfig.isOpen}
                    onClose={() => setServiceModalConfig(prev => ({ ...prev, isOpen: false, rowId: null }))}
                    roomNumber={
                        (Number(activeRowForService.noOfRooms) || 1) > 1
                            ? getAutoAssignedRoomsForRow(activeRowForService).join(', ')
                            : activeRowForService.roomNumber
                    }
                    roomsCount={Number(activeRowForService.noOfRooms) || 1}
                    assignedRooms={getAutoAssignedRoomsForRow(activeRowForService)}
                    roomType={activeRowForService.roomType}
                    baseRate={activeRowForService.rate}
                    nights={nightMultiplier}
                    initialTab={serviceModalConfig.initialTab}
                    currentServices={activeRowForService.servicesBundle}
                    currentExtraBed={activeRowForService.extraBed}
                    currentPickup={activeRowForService.pickup}
                    onSave={(bundle) => handleSaveRoomServices(activeRowForService.id, bundle)}
                />
            )}

            {/* Multi-Room Assignment Modal */}
            {multiRoomModal.isOpen && (
                <MultiRoomSelectorModal
                    isOpen={multiRoomModal.isOpen}
                    onClose={() => setMultiRoomModal(prev => ({ ...prev, isOpen: false, rowId: null }))}
                    roomType={multiRoomModal.roomType}
                    requiredCount={multiRoomModal.requiredCount}
                    checkIn={checkInDate}
                    checkOut={checkOutDate}
                    currentSelected={(() => {
                        const row = roomsList.find(r => r.id === multiRoomModal.rowId);
                        return row?.assignedRooms || (row ? getAutoAssignedRoomsForRow(row) : []);
                    })()}
                    initialRoomDatesMap={(() => {
                        const row = roomsList.find(r => r.id === multiRoomModal.rowId);
                        return row?.roomDatesMap;
                    })()}
                    onConfirm={(selected, datesMap) => {
                        if (multiRoomModal.rowId !== null) {
                            setRoomsList(prev => prev.map(r => {
                                if (r.id !== multiRoomModal.rowId) return r;
                                return {
                                    ...r,
                                    assignedRooms: selected,
                                    roomNumber: selected[0] || r.roomNumber,
                                    roomDatesMap: datesMap
                                };
                            }));
                        }
                    }}
                    otherRowsTakenRooms={(() => {
                        const otherRows = roomsList.filter(r => r.id !== multiRoomModal.rowId);
                        const taken: string[] = [];
                        otherRows.forEach(r => {
                            if (r.assignedRooms && r.assignedRooms.length > 0) {
                                taken.push(...r.assignedRooms);
                            } else if (r.roomNumber) {
                                taken.push(r.roomNumber);
                            }
                        });
                        return taken;
                    })()}
                    isAutoMode={multiRoomModal.isAutoMode}
                />
            )}

            {/* Floating 3-dots Menu rendered outside overflow containers via createPortal */}
            {menuAnchor && (() => {
                const item = roomsList.find(r => r.id === menuAnchor.rowId);
                if (!item) return null;

                return createPortal(
                    <>
                        <div 
                            className="fixed inset-0 z-[99998]"
                            onClick={() => setMenuAnchor(null)}
                        />
                        <div 
                            style={{
                                top: menuAnchor.top !== undefined ? `${menuAnchor.top}px` : undefined,
                                bottom: menuAnchor.bottom !== undefined ? `${menuAnchor.bottom}px` : undefined,
                                right: `${menuAnchor.right}px`,
                                maxHeight: `${menuAnchor.maxHeight}px`
                            }}
                            className="fixed z-[99999] w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 text-left animate-in fade-in zoom-in-95 duration-100 select-none overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                                <span>Room #{item.roomNumber || item.id} Services</span>
                                <span className="text-[9px] text-blue-600 font-semibold">Expert Addons</span>
                            </div>
                            
                            <button
                                type="button"
                                onClick={() => {
                                    setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'pickup' });
                                    setMenuAnchor(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Car size={13} className="text-blue-600" />
                                    <span>Airport Pickup (Arrival)</span>
                                </span>
                                {item.servicesBundle?.pickup?.enabled || item.pickup?.enabled ? (
                                    <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                ) : (
                                    <span className="text-[10px] text-slate-400">+ Add</span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'pickup' });
                                    setMenuAnchor(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Plane size={13} className="text-sky-600" />
                                    <span>Airport Drop (Departure)</span>
                                </span>
                                {item.servicesBundle?.pickup?.dropEnabled || item.pickup?.dropEnabled ? (
                                    <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                ) : (
                                    <span className="text-[10px] text-slate-400">+ Add</span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'extrabed' });
                                    setMenuAnchor(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <BedDouble size={13} className="text-indigo-600" />
                                    <span>Extra Bed &amp; Baby Cot</span>
                                </span>
                                {item.servicesBundle?.extraBed?.enabled || item.extraBed?.enabled ? (
                                    <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                ) : (
                                    <span className="text-[10px] text-slate-400">+ Add</span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'mealplan' });
                                    setMenuAnchor(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Utensils size={13} className="text-amber-600" />
                                    <span>Meal Plans &amp; Dining</span>
                                </span>
                                {item.servicesBundle?.mealPlan?.enabled ? (
                                    <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                ) : (
                                    <span className="text-[10px] text-slate-400">+ Add</span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'celebration' });
                                    setMenuAnchor(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Gift size={13} className="text-rose-600" />
                                    <span>Honeymoon &amp; Decor</span>
                                </span>
                                {item.servicesBundle?.celebration?.enabled ? (
                                    <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                ) : (
                                    <span className="text-[10px] text-slate-400">+ Add</span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'spa' });
                                    setMenuAnchor(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Sparkles size={13} className="text-teal-600" />
                                    <span>Spa &amp; Wellness</span>
                                </span>
                                {item.servicesBundle?.spaWellness?.enabled ? (
                                    <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                ) : (
                                    <span className="text-[10px] text-slate-400">+ Add</span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'timing' });
                                    setMenuAnchor(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <Clock size={13} className="text-sky-600" />
                                    <span>Early / Late Check-Out</span>
                                </span>
                                {item.servicesBundle?.timingFlex?.earlyCheckIn || item.servicesBundle?.timingFlex?.lateCheckOut ? (
                                    <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                ) : (
                                    <span className="text-[10px] text-slate-400">+ Add</span>
                                )}
                            </button>

                            <div className="my-1 border-t border-slate-100" />

                            <button
                                type="button"
                                onClick={() => {
                                    setServiceModalConfig({ isOpen: true, rowId: item.id, initialTab: 'pickup' });
                                    setMenuAnchor(null);
                                }}
                                className="w-full px-3 py-1.5 text-left text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 transition-colors"
                            >
                                <Sparkles size={13} />
                                <span>Manage All Services...</span>
                            </button>
                        </div>
                    </> as any,
                    document.body
                );
            })()}
        </div>
    );
};

export default QuickReservationModal;
