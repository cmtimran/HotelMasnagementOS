import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    ChevronDown,
    ChevronUp,
    Copy,
    Trash2,
    User as UserIcon,
    MapPin,
    Briefcase,
    Delete,
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
    Split
} from 'lucide-react';
import { RoomAddonServicesModal, type ServiceTabType } from './RoomAddonServicesModal';
import { MultiRoomSelectorModal } from './MultiRoomSelectorModal';
import { useProperty } from '../../context/PropertyContext';
import { getCurrencySymbol } from '../../utils/currencyUtils';
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
    getAvailableRoomsForStay,
    validateAndCommitReservation,
    getCanonicalRooms,
    getDynamicRoomTypes,
    validateRatePlanRestrictions,
    getRoomTypeCapacity,
    calculateTariffForRatePlan,
    generateMasterReservationNumber,
    generateGroupCode,
    generateSubBookingNumber,
    generateRegistrationNumber,
    generateFolioNumber,
    getRoomSmokingPolicy,
    getOperatingSystemDate,
    determineBookingStatusFromPayment,
    calculateHoldCutoffTimestamp
} from '../../utils/roomInventoryEngine';
import { getSystemDateISO, getNextDayISO } from '../common/StayPeriodPicker';
import {
    useReservationBookingEngine,
    splitMultiRoomRow,
    duplicateRoomRowHelper,
    addNewRoomRowHelper,
    validatePreBookingFlight
} from '../../hooks/useReservationBookingEngine';
import { toast } from '../../context/ToastContext';
import {
    calculateReservationTaxes,
    getActiveTaxConfiguration,
    getTaxConfigurations,
    type TaxCalculationResult
} from '../../utils/taxCalculationEngine';

export interface AddReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onReservationCreated?: (res: any) => void;
    initialRoom?: string;
    initialStartDate?: string;
    initialEndDate?: string;
    editingReservation?: any;
}

interface RoomRow {
    id: number;
    roomType: string;
    roomsCount: number;
    ratePlan: string;
    packageId?: number | string;
    packageName?: string;
    roomNumber: string;
    assignedRooms?: string[];
    adults: number;
    children: number;
    rate: number;
    isAssign: boolean;
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

export const AddReservationModal: React.FC<AddReservationModalProps> = ({
    isOpen,
    onClose,
    onReservationCreated,
    initialRoom = '101',
    initialStartDate = '2026-07-01',
    initialEndDate = '2026-07-02',
    editingReservation = null
}) => {
    const { activeProperty } = useProperty();
    const currencySymbol = getCurrencySymbol(activeProperty?.currency);

    const [step, setStep] = useState<1 | 2 | 3>(1);

    // ==========================================
    // STEP 1 STATE
    // ==========================================
    const [checkIn, setCheckIn] = useState(initialStartDate);
    const [nights, setNights] = useState(1);
    const [checkOut, setCheckOut] = useState(initialEndDate);
    const [roomsCountInput] = useState(1);
    const [businessSource, setBusinessSource] = useState('Direct');
    const [businessAgent, setBusinessAgent] = useState('Direct');
    const [dayUse, setDayUse] = useState(false);
    const [ratePerNight, setRatePerNight] = useState('Rate Per Night');
    const [taxApplicable, setTaxApplicable] = useState(true);
    const [selectedTaxConfigId, setSelectedTaxConfigId] = useState<string>(() => {
        return getActiveTaxConfiguration().id;
    });
    const availableTaxConfigs = useMemo(() => getTaxConfigurations().filter(c => c.status === 'Active'), []);

    const [roomsList, setRoomsList] = useState<RoomRow[]>(() => {
        const report = getAvailableRoomsForStay(initialStartDate, initialEndDate, 'Deluxe Double');
        const isInitialAvailable = initialRoom && report.availableRooms.some(r => r.number === initialRoom);
        const freeRoom = isInitialAvailable
            ? initialRoom
            : (report.availableRooms[0]?.number || '102');

        return [
            {
                id: 1,
                roomType: 'Deluxe Double',
                roomsCount: 1,
                ratePlan: '',
                roomNumber: freeRoom,
                assignedRooms: [freeRoom],
                adults: 2,
                children: 1,
                rate: 3000,
                isAssign: true
            }
        ];
    });

    const {
        availableRatePlans,
        availablePackages,
        calculateRoomRate,
        getPackageById,
        validateAllRoomRestrictions,
        getOfferValue,
        resolveOfferSelection,
        validatePackageRestrictions
    } = useReservationBookingEngine();
    const availableRoomTypesList = useMemo(() => {
        return getDynamicRoomTypes().map(t => t.name);
    }, []);

    // Hydrate form when opening or editing a reservation
    useEffect(() => {
        if (!isOpen) return;

        if (editingReservation) {
            setStep(1);
            if (editingReservation.checkIn || editingReservation.arrivalDate) setCheckIn(editingReservation.checkIn || editingReservation.arrivalDate);
            if (editingReservation.checkOut || editingReservation.departureDate) setCheckOut(editingReservation.checkOut || editingReservation.departureDate);
            if (editingReservation.nights) setNights(Number(editingReservation.nights) || 1);
            if (editingReservation.guestName) {
                const cleanName = editingReservation.guestName.replace(/^(Mr|Mrs|Ms|Dr|Prof)\.?\s+/i, '');
                setGuestName(cleanName);
                const matchSal = (editingReservation.guestName || '').match(/^(Mr|Mrs|Ms|Dr|Prof)\b/i);
                if (matchSal) {
                    setSalutation(matchSal[1].charAt(0).toUpperCase() + matchSal[1].slice(1).toLowerCase());
                }
            }
            if (editingReservation.salutation) setSalutation(editingReservation.salutation);
            if (editingReservation.phone) setPhone(editingReservation.phone);
            if (editingReservation.mobile) setMobile(editingReservation.mobile);
            else if (editingReservation.phone) setMobile(editingReservation.phone);
            if (editingReservation.email) setEmail(editingReservation.email);
            if (editingReservation.vip) setVipStatus(editingReservation.vip);
            if (editingReservation.vipTier) setVipStatus(editingReservation.vipTier);
            if (editingReservation.nationality) setNationality(editingReservation.nationality);
            if (editingReservation.companyName) setCompanyName(editingReservation.companyName);
            if (editingReservation.address || editingReservation.streetAddress) {
                setStreetAddress(editingReservation.address || editingReservation.streetAddress);
            }
            if (editingReservation.city || editingReservation.homeCity) {
                setHomeCity(editingReservation.city || editingReservation.homeCity);
            }
            if (editingReservation.source) setBusinessSource(editingReservation.source);
            if (editingReservation.agent) setBusinessAgent(editingReservation.agent);
            if (editingReservation.purpose) setPurposeOfVisit(editingReservation.purpose);
            if (editingReservation.idType) setIdType(editingReservation.idType);
            if (editingReservation.taxApplicable !== undefined) setTaxApplicable(editingReservation.taxApplicable);
            if (editingReservation.taxConfigId) setSelectedTaxConfigId(editingReservation.taxConfigId);
            if (editingReservation.specialRequests) {
                setRemarksMap(prev => ({ ...prev, Guest: editingReservation.specialRequests }));
            }

            const defaultPlan = availableRatePlans[0]?.name || 'Standard Rate';

            if (editingReservation.roomsList && Array.isArray(editingReservation.roomsList) && editingReservation.roomsList.length > 0 && !editingReservation.isNewBookingTemplate) {
                setRoomsList(editingReservation.roomsList.map((r: any, idx: number) => {
                    const cleanRm = String(r.roomNumber || '101');
                    const canonical = getCanonicalRooms().find(c => c.number === cleanRm);
                    return {
                        id: r.id || idx + 1,
                        roomType: r.roomType || canonical?.roomTypeName || 'Deluxe Double',
                        roomsCount: r.roomsCount || 1,
                        ratePlan: r.ratePlan || defaultPlan,
                        roomNumber: cleanRm,
                        assignedRooms: r.assignedRooms || [cleanRm],
                        adults: r.adults || 2,
                        children: r.children || 0,
                        rate: r.rate || canonical?.baseRate || 3000,
                        isAssign: true,
                        checkInDate: r.checkInDate || editingReservation.checkIn,
                        checkOutDate: r.checkOutDate || editingReservation.checkOut,
                        nights: r.nights || editingReservation.nights || 1,
                        servicesBundle: r.servicesBundle,
                        extraBed: r.extraBed,
                        pickup: r.pickup
                    };
                }));
            } else if (editingReservation.allocatedRooms && editingReservation.allocatedRooms.length > 0 && !editingReservation.isNewBookingTemplate) {
                setRoomsList(editingReservation.allocatedRooms.map((rm: string, idx: number) => {
                    const canonical = getCanonicalRooms().find(c => c.number === rm);
                    return {
                        id: idx + 1,
                        roomType: editingReservation.roomType || canonical?.roomTypeName || 'Deluxe Double',
                        roomsCount: 1,
                        ratePlan: defaultPlan,
                        roomNumber: rm,
                        assignedRooms: [rm],
                        adults: Number(editingReservation.adults) || 2,
                        children: Number(editingReservation.children) || 0,
                        rate: canonical?.baseRate || 3000,
                        isAssign: true,
                        checkInDate: editingReservation.checkIn,
                        checkOutDate: editingReservation.checkOut,
                        nights: editingReservation.nights || 1
                    };
                }));
            } else if (editingReservation.roomNumber) {
                const rm = String(editingReservation.roomNumber);
                const canonical = getCanonicalRooms().find(c => c.number === rm);
                const targetRoomType = editingReservation.roomType || canonical?.roomTypeName || 'Deluxe Double';
                const targetPlan = editingReservation.ratePlan || defaultPlan;
                const canonicalBase = canonical?.baseRate || 3000;
                const dynamicTariff = calculateTariffForRatePlan(
                    targetPlan,
                    targetRoomType,
                    canonicalBase,
                    Number(editingReservation.adults) || 2,
                    Number(editingReservation.children) || 0,
                    availableRatePlans
                );
                const effectiveRate = dynamicTariff > 0 ? dynamicTariff : canonicalBase;
                setRoomsList([
                    {
                        id: 1,
                        roomType: targetRoomType,
                        roomsCount: 1,
                        ratePlan: targetPlan,
                        roomNumber: rm,
                        assignedRooms: [rm],
                        adults: Number(editingReservation.adults) || 2,
                        children: Number(editingReservation.children) || 0,
                        rate: effectiveRate,
                        isAssign: true,
                        checkInDate: editingReservation.checkIn || checkIn,
                        checkOutDate: editingReservation.checkOut || checkOut,
                        nights: editingReservation.nights || nights || 1
                    }
                ]);
            }
            if (editingReservation.paidAmount !== undefined && !editingReservation.isNewBookingTemplate) {
                setPaymentRows([{ id: 1, method: 'Cash', amount: editingReservation.paidAmount }]);
            } else if (editingReservation.isNewBookingTemplate) {
                setPaymentRows([{ id: 1, method: 'Cash', amount: 0 }]);
            }
        } else {
            // Fresh Reservation from StayView or Header
            setStep(1);
            setGuestName('');
            setPhone('');
            setMobile('');
            setEmail('');
            setVipStatus('None');
            setBusinessSource('Direct');
            setBusinessAgent('Direct');
            setPurposeOfVisit('Business');
            setRemarksMap({
                Guest: '',
                'Check In': '',
                'Check Out': '',
                'House Keeping': '',
                'Payment Note': ''
            });

            const start = initialStartDate || getSystemDateISO();
            const end = initialEndDate || getNextDayISO(start, 1);
            setCheckIn(start);
            setCheckOut(end);
            const startD = new Date(start);
            const endD = new Date(end);
            const calculatedNights = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
            setNights(calculatedNights);

            const cleanRoom = (initialRoom || '101').replace(/[^0-9a-zA-Z-]/g, '') || '101';
            const canonicalList = getCanonicalRooms();
            const canonical = canonicalList.find(r => r.number === cleanRoom);
            const defaultType = canonical?.roomTypeName || 'Deluxe Double';
            const defaultRate = canonical?.baseRate || 3000;
            const defaultPlan = availableRatePlans[0]?.name || '';

            setRoomsList([
                {
                    id: 1,
                    roomType: defaultType,
                    roomsCount: 1,
                    ratePlan: defaultPlan,
                    roomNumber: cleanRoom,
                    assignedRooms: [cleanRoom],
                    adults: 2,
                    children: 1,
                    rate: defaultRate,
                    isAssign: true,
                    checkInDate: start,
                    checkOutDate: end,
                    nights: calculatedNights
                }
            ]);
            setPaymentRows([{ id: 1, method: 'Cash', amount: defaultRate * calculatedNights }]);
        }
    }, [isOpen, editingReservation, initialRoom, initialStartDate, initialEndDate]);

    // Live Availability Report for selected stay dates
    const liveAvailabilityReport = useMemo(() => {
        return getAvailableRoomsForStay(checkIn, checkOut, undefined, {
            excludeReservationId: editingReservation?.reservationNumber || editingReservation?.id
        });
    }, [checkIn, checkOut, editingReservation]);

    // Self-healing room validation: Ensure no row is assigned to an Occupied room or duplicate room!
    useEffect(() => {
        if (editingReservation) return; // When editing an existing reservation, preserve its rooms
        setRoomsList(prev => {
            let changed = false;
            const usedInForm = new Set<string>();

            const updated = prev.map(row => {
                const count = Number(row.roomsCount) || 1;
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
    }, [checkIn, checkOut, liveAvailabilityReport, editingReservation]);

    // Total actual room count across all rows in this form
    const totalRoomsAllocatedInForm = useMemo(() => {
        return roomsList.reduce((acc, r) => acc + (Number(r.roomsCount) || 1), 0);
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
            .reduce((sum, r) => sum + (Number(r.roomsCount) || 1), 0);
    };

    // Rooms of this type allocated in OTHER rows (excluding currentRowId)
    const getAllocatedCountInOtherRows = (typeName: string, currentRowId?: number): number => {
        return roomsList
            .filter(r => r.id !== currentRowId && (
                r.roomType.toLowerCase().includes(typeName.toLowerCase()) ||
                typeName.toLowerCase().includes(r.roomType.toLowerCase())
            ))
            .reduce((sum, r) => sum + (Number(r.roomsCount) || 1), 0);
    };

    // Remaining free rooms of this type in the hotel AFTER what is allocated across all rows in this form
    const getRemainingFreeCountForType = (typeName: string): number => {
        const totalFree = getTotalInventoryForType(typeName);
        const totalAllocated = getAllocatedCountForType(typeName);
        return Math.max(0, totalFree - totalAllocated);
    };

    // Maximum rooms the CURRENT row can take without exceeding hotel inventory:
    const getMaxRoomsAllowedForRow = (typeName: string, currentRowId: number): number => {
        const totalFree = getTotalInventoryForType(typeName);
        const takenInOthers = getAllocatedCountInOtherRows(typeName, currentRowId);
        return Math.max(0, totalFree - takenInOthers);
    };

    // Overbooking validation check across the entire modal form
    const hasOverbookingError = useMemo(() => {
        if (totalRoomsAllocatedInForm > liveAvailabilityReport.availableCount) return true;
        for (const r of roomsList) {
            const maxForThis = getMaxRoomsAllowedForRow(r.roomType, r.id);
            if (maxForThis <= 0 || (Number(r.roomsCount) || 1) > maxForThis) return true;
        }
        return false;
    }, [totalRoomsAllocatedInForm, liveAvailabilityReport.availableCount, roomsList]);

    // Helper to get auto-allocated physical room numbers for a given row based on its roomsCount
    const getAutoAssignedRoomsForRow = (row: RoomRow): string[] => {
        const takenBefore = new Set<string>();
        for (const r of roomsList) {
            if (r.id === row.id) break;
            const rCount = Number(r.roomsCount) || 1;
            const freeForPrev = liveAvailabilityReport.availableRooms
                .filter(ar => (ar.roomTypeName.toLowerCase().includes(r.roomType.toLowerCase()) || r.roomType.toLowerCase().includes(ar.roomTypeName.toLowerCase())) && !takenBefore.has(ar.number))
                .slice(0, rCount)
                .map(ar => ar.number);
            freeForPrev.forEach(rn => takenBefore.add(rn));
        }

        const countNeeded = Number(row.roomsCount) || 1;
        const matchingAvailable = liveAvailabilityReport.availableRooms
            .filter(ar => (ar.roomTypeName.toLowerCase().includes(row.roomType.toLowerCase()) || row.roomType.toLowerCase().includes(ar.roomTypeName.toLowerCase())) && !takenBefore.has(ar.number))
            .slice(0, countNeeded)
            .map(ar => ar.number);

        if (matchingAvailable.length > 0) {
            return matchingAvailable;
        }
        return [row.roomNumber || '101'];
    };

    // ==========================================
    // STEP 2 STATE
    // ==========================================
    const [openGuestProfile, setOpenGuestProfile] = useState(true);
    const [openAddress, setOpenAddress] = useState(false);
    const [openWork, setOpenWork] = useState(false);

    // Guest Profile
    const [salutation, setSalutation] = useState('Mr');
    const [guestName, setGuestName] = useState('');
    const [phone, setPhone] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [vipStatus, setVipStatus] = useState('');
    const [gender, setGender] = useState('Male');
    const [nationality, setNationality] = useState('Bangladeshi');
    const [guestType, setGuestType] = useState('Adult');
    const [dob, setDob] = useState('');
    const [birthCountry, setBirthCountry] = useState('Bangladesh');
    const [birthCity, setBirthCity] = useState('Dhaka');
    const [occupation, setOccupation] = useState('');
    const [purposeOfVisit, setPurposeOfVisit] = useState('Business');
    const [idType, setIdType] = useState('National ID (NID)');

    // Remarks & Preferences Tabs
    const [activePrefTab, setActivePrefTab] = useState<'Guest' | 'Check In' | 'Check Out' | 'House Keeping' | 'Payment Note'>('Guest');
    const [remarksMap, setRemarksMap] = useState<Record<string, string>>({
        Guest: '',
        'Check In': '',
        'Check Out': '',
        'House Keeping': '',
        'Payment Note': ''
    });

    // Home Address
    const [streetAddress, setStreetAddress] = useState('');
    const [homeCity, setHomeCity] = useState('');
    const [homeState, setHomeState] = useState('');
    const [homeCountry, setHomeCountry] = useState('Bangladesh');
    const [postalCode, setPostalCode] = useState('');

    // Work Details
    const [companyName, setCompanyName] = useState('');
    const [designation, setDesignation] = useState('');
    const [officePhone, setOfficePhone] = useState('');
    const [corporateEmail, setCorporateEmail] = useState('');
    const [taxVatId, setTaxVatId] = useState('');

    // ==========================================
    // STEP 3 STATE
    // ==========================================
    const [discountType, setDiscountType] = useState<'Percentage' | 'Fixed'>('Fixed');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([
        { id: 1, method: 'Cash', amount: 3000 }
    ]);
    const [keypadTargetIndex, setKeypadTargetIndex] = useState<number>(0);

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
        isAutoMode: false
    });
    
    // Anchored portal state for 3-dots dropdown menu (prevents table overflow clipping & scrollbars)
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

    // Close menu when clicking outside or scrolling
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

    const activeRowForService = useMemo(() => {
        return roomsList.find(r => r.id === serviceModalConfig.rowId);
    }, [roomsList, serviceModalConfig.rowId]);

    // Calculations (hoisted before early return for React hook order compliance)
    const roomBaseTotal = roomsList.reduce((acc, r) => acc + (r.rate * r.roomsCount * nights), 0);
    const totalExtraBedCharge = roomsList.reduce((acc, r) => acc + getExtraBedTotal(r.servicesBundle?.extraBed || r.extraBed, nights), 0);
    const totalPickupArrivalCharge = roomsList.reduce((acc, r) => {
        const p = r.servicesBundle?.pickup || r.pickup;
        return acc + (p?.enabled && !p.isComplimentary ? (Number(p.chargeAmount) || 0) : 0);
    }, 0);
    const totalDropDepartureCharge = roomsList.reduce((acc, r) => {
        const p = r.servicesBundle?.pickup || r.pickup;
        return acc + (p?.dropEnabled && !p.dropIsComplimentary ? (Number(p.dropChargeAmount) || 0) : 0);
    }, 0);
    const totalPickupCharge = totalPickupArrivalCharge + totalDropDepartureCharge;
    const totalMealPlanCharge = roomsList.reduce((acc, r) => acc + getMealPlanTotal(r.servicesBundle?.mealPlan, nights), 0);
    const totalCelebrationCharge = roomsList.reduce((acc, r) => acc + getCelebrationTotal(r.servicesBundle?.celebration), 0);
    const totalSpaCharge = roomsList.reduce((acc, r) => acc + getSpaWellnessTotal(r.servicesBundle?.spaWellness), 0);
    const totalTimingCharge = roomsList.reduce((acc, r) => acc + getTimingFlexTotal(r.servicesBundle?.timingFlex), 0);
    const totalCustomCharge = roomsList.reduce((acc, r) => acc + getCustomAddonsTotal(r.servicesBundle?.customAddons, nights), 0);

    const totalAllAddonsCharges = totalExtraBedCharge + totalPickupCharge + totalMealPlanCharge + totalCelebrationCharge + totalSpaCharge + totalTimingCharge + totalCustomCharge;
    const grossTotal = roomBaseTotal + totalAllAddonsCharges;

    const discountedAmount = discountType === 'Percentage'
        ? (grossTotal * discountValue) / 100
        : discountValue;
    const netBaseAmount = Math.max(0, grossTotal - discountedAmount);

    // Multi-tier dynamic Tax & VAT calculation based on /taxes-vat policy
    const taxCalculation: TaxCalculationResult = useMemo(() => {
        return calculateReservationTaxes(netBaseAmount, taxApplicable, selectedTaxConfigId);
    }, [netBaseAmount, taxApplicable, selectedTaxConfigId]);

    const finalPayable = taxCalculation.grandTotal;
    const totalPaid = paymentRows.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalDue = Math.max(0, finalPayable - totalPaid);

    if (!isOpen) return null;

    // Unified Rate / Package Offer Change Handler
    const handleUnifiedOfferChange = (rowId: number, offerKey: string) => {
        setRoomsList(prev => prev.map(r => {
            if (r.id !== rowId) return r;
            const canonicalRoom = getCanonicalRooms().find(cr => cr.number === r.roomNumber);
            const dynamicTypes = getDynamicRoomTypes();
            const matchedType = dynamicTypes.find(t => t.name === r.roomType);
            const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || r.rate || 3000;

            const resolved = resolveOfferSelection({
                offerKey,
                roomType: r.roomType,
                adults: r.adults,
                children: r.children,
                baseRate: canonicalRate,
                nights
            });

            let newRoomType = r.roomType;
            let newRoomNumber = r.roomNumber;
            let newAssignedRooms = r.assignedRooms;

            if (resolved.roomTypeChanged && resolved.targetRoomType) {
                newRoomType = resolved.targetRoomType;
                const autoAssigned = getAutoAssignedRoomsForRow({ ...r, roomType: newRoomType, roomsCount: r.roomsCount });
                if (autoAssigned.length > 0) {
                    newRoomNumber = autoAssigned[0];
                    newAssignedRooms = autoAssigned;
                }
                toast.info(`Room category updated to "${newRoomType}" for ${resolved.packageName}`);
            }

            if (resolved.offerType === 'rate_plan') {
                const restriction = validateRatePlanRestrictions(resolved.ratePlan, nights, checkIn, availableRatePlans);
                if (!restriction.allowed) {
                    toast.warning(restriction.reason || 'Selected rate plan has stay duration restrictions.');
                }
            } else if (resolved.packageId) {
                const pkgCheck = validatePackageRestrictions(resolved.packageId, nights);
                if (!pkgCheck.isValid) {
                    toast.warning(pkgCheck.error || 'Selected package has stay duration restrictions.');
                }
            }

            return {
                ...r,
                roomType: newRoomType,
                roomNumber: newRoomNumber,
                assignedRooms: newAssignedRooms,
                ratePlan: resolved.ratePlan,
                packageId: resolved.packageId,
                packageName: resolved.packageName,
                rate: resolved.rate
            };
        }));
    };

    // Handlers
    const handleAddRoomRow = () => {
        if (remainingOverallFreeRooms <= 0) {
            toast.error('Overbooking Prevented: No more available rooms in inventory for the selected dates!');
            return;
        }
        const result = addNewRoomRowHelper(
            roomsList,
            liveAvailabilityReport.availableRooms,
            checkIn,
            checkOut,
            nights,
            availableRatePlans[0]?.name || 'Standard Rate',
            calculateRoomRate
        );
        if (!result) {
            toast.error('Overbooking Prevented: All available rooms are already assigned in this form!');
            return;
        }
        setRoomsList(result.updatedList);
    };

    const handleCopyRoomRow = (row: RoomRow) => {
        if (remainingOverallFreeRooms <= 0) {
            toast.error('Overbooking Prevented: No more available rooms in inventory for the selected dates!');
            return;
        }
        const result = duplicateRoomRowHelper(
            roomsList,
            row,
            liveAvailabilityReport.availableRooms,
            nights,
            calculateRoomRate
        );
        if (!result) {
            toast.error('Overbooking Prevented: No more free rooms available to duplicate this row!');
            return;
        }
        setRoomsList(result.updatedList);
    };

    const handleRemoveRoomRow = (id: number) => {
        if (roomsList.length === 1) return;
        setRoomsList(roomsList.filter(r => r.id !== id));
    };

    // Front Desk Split Action: Split multi-room group row into individual 1-room rows
    const handleSplitRowIntoRooms = (rowId: number) => {
        const result = splitMultiRoomRow(roomsList, rowId, getAutoAssignedRoomsForRow);
        if (result) {
            setRoomsList(result.updatedList);
            toast.success(`Split into ${result.count} individual room rows (${result.assigned.join(', ')})!`);
        }
    };

    const updateRoomRow = (id: number, field: keyof RoomRow, value: any) => {
        setRoomsList(prev => prev.map(r => {
            if (r.id !== id) return r;
            if (field === 'packageId') {
                const pkgId = value ? String(value) : undefined;
                const pkg = getPackageById(pkgId);
                const assignedRm = r.roomNumber;
                const canonicalRoom = getCanonicalRooms().find(cr => cr.number === assignedRm);
                const dynamicTypes = getDynamicRoomTypes();
                const matchedType = dynamicTypes.find(t => t.name === r.roomType);
                const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || r.rate || 3000;
                const newRate = calculateRoomRate({
                    roomType: r.roomType,
                    ratePlan: r.ratePlan,
                    packageId: pkgId,
                    adults: r.adults,
                    children: r.children,
                    baseRate: canonicalRate,
                    nights
                });
                return {
                    ...r,
                    packageId: pkgId,
                    packageName: pkg?.name,
                    rate: newRate
                };
            }
            if (field === 'ratePlan') {
                const planName = String(value);
                const restriction = validateRatePlanRestrictions(planName, nights, checkIn, availableRatePlans);
                if (!restriction.allowed) {
                    toast.warning(restriction.reason || 'Selected rate plan has restrictions for this stay duration.');
                }
                const assignedRm = r.roomNumber;
                const canonicalRoom = getCanonicalRooms().find(cr => cr.number === assignedRm);
                const dynamicTypes = getDynamicRoomTypes();
                const matchedType = dynamicTypes.find(t => t.name === r.roomType);
                const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || r.rate || 3000;
                const newRate = calculateRoomRate({
                    roomType: r.roomType,
                    ratePlan: planName,
                    packageId: r.packageId,
                    adults: r.adults,
                    children: r.children,
                    baseRate: canonicalRate,
                    nights
                });
                return {
                    ...r,
                    ratePlan: value,
                    rate: newRate
                };
            }
            if (field === 'adults') {
                const capacity = getRoomTypeCapacity(r.roomType);
                const rawAdults = Number(value) || 1;
                const newAdults = Math.max(1, Math.min(rawAdults, capacity.maxAdults));
                if (rawAdults > capacity.maxAdults) {
                    toast.warning(`Capacity Limit: Maximum ${capacity.maxAdults} adult(s) permitted for ${r.roomType}!`);
                }
                const assignedRm = r.roomNumber;
                const canonicalRoom = getCanonicalRooms().find(cr => cr.number === assignedRm);
                const dynamicTypes = getDynamicRoomTypes();
                const matchedType = dynamicTypes.find(t => t.name === r.roomType);
                const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || r.rate || 3000;
                const newRate = calculateRoomRate({ roomType: r.roomType, ratePlan: r.ratePlan, packageId: r.packageId, adults: newAdults, children: r.children, baseRate: canonicalRate, nights });
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
                    toast.warning(`Capacity Limit: Maximum ${capacity.maxChildren} child(ren) permitted for ${r.roomType}!`);
                }
                const assignedRm = r.roomNumber;
                const canonicalRoom = getCanonicalRooms().find(cr => cr.number === assignedRm);
                const dynamicTypes = getDynamicRoomTypes();
                const matchedType = dynamicTypes.find(t => t.name === r.roomType);
                const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || r.rate || 3000;
                const newRate = calculateRoomRate({ roomType: r.roomType, ratePlan: r.ratePlan, packageId: r.packageId, adults: r.adults, children: newChildren, baseRate: canonicalRate, nights });
                return {
                    ...r,
                    children: newChildren,
                    rate: newRate
                };
            }
            if (field === 'roomType') {
                const maxForNewType = getMaxRoomsAllowedForRow(value, id);
                if (maxForNewType <= 0) {
                    toast.error(`Overbooking Prevented: No rooms available in "${value}" for the selected dates!`);
                    return r;
                }
                const safeCount = Math.min(r.roomsCount, maxForNewType);
                const autoAssigned = getAutoAssignedRoomsForRow({ ...r, roomType: value, roomsCount: safeCount });
                const assignedRm = autoAssigned[0] || r.roomNumber;
                const canonicalRoom = getCanonicalRooms().find(cr => cr.number === assignedRm);
                const dynamicTypes = getDynamicRoomTypes();
                const matchedType = dynamicTypes.find(t => t.name === value);
                const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || r.rate || 3000;

                const newCapacity = getRoomTypeCapacity(value);
                const clampedAdults = Math.max(1, Math.min(r.adults, newCapacity.maxAdults));
                const clampedChildren = Math.min(r.children, newCapacity.maxChildren);
                if (r.adults > newCapacity.maxAdults || r.children > newCapacity.maxChildren) {
                    toast.info(`Occupancy adjusted to ${value} limits (Max Adults: ${newCapacity.maxAdults}, Max Children: ${newCapacity.maxChildren}).`);
                }

                const resolvedRate = calculateRoomRate({ roomType: value, ratePlan: r.ratePlan, packageId: r.packageId, adults: clampedAdults, children: clampedChildren, baseRate: canonicalRate, nights });
                return { 
                    ...r, 
                    roomType: value, 
                    adults: clampedAdults,
                    children: clampedChildren,
                    roomsCount: Math.max(1, safeCount),
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
                const newRate = calculateRoomRate({ roomType: r.roomType, ratePlan: r.ratePlan, packageId: r.packageId, adults: r.adults, children: r.children, baseRate: canonicalRate, nights });
                return {
                    ...r,
                    roomNumber: selectedRoomNum,
                    assignedRooms: [selectedRoomNum],
                    rate: newRate
                };
            }
            if (field === 'roomsCount') {
                const rawVal = Number(value);
                const maxAllowed = getMaxRoomsAllowedForRow(r.roomType, id);
                const safeCount = Math.max(1, isNaN(rawVal) ? 1 : Math.min(rawVal, maxAllowed));
                if (!isNaN(rawVal) && rawVal > maxAllowed) {
                    toast.warning(`Overbooking Prevented: Only ${maxAllowed} room(s) available for ${r.roomType}!`);
                }
                const autoAssigned = getAutoAssignedRoomsForRow({ ...r, roomsCount: safeCount });
                return { 
                    ...r, 
                    roomsCount: safeCount, 
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
            if (field === 'isAssign') {
                const isAuto = Boolean(value);
                const autoAssigned = getAutoAssignedRoomsForRow(r);
                return {
                    ...r,
                    isAssign: isAuto,
                    assignedRooms: r.assignedRooms && r.assignedRooms.length === r.roomsCount ? r.assignedRooms : autoAssigned,
                    roomNumber: (r.assignedRooms && r.assignedRooms[0]) || autoAssigned[0] || r.roomNumber
                };
            }
            return { ...r, [field]: value };
        }));
    };

    // Payment Handlers
    const handleAddPaymentRow = () => {
        const nextId = paymentRows.length > 0 ? Math.max(...paymentRows.map(p => p.id)) + 1 : 1;
        setPaymentRows([...paymentRows, { id: nextId, method: 'Cash', amount: totalDue }]);
    };

    const handleRemovePaymentRow = (id: number) => {
        if (paymentRows.length === 1) return;
        setPaymentRows(paymentRows.filter(p => p.id !== id));
    };

    const updatePaymentRow = (id: number, field: keyof PaymentRow, value: any) => {
        setPaymentRows(paymentRows.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    // Keypad Handler
    const handleKeypadPress = (val: string) => {
        const currentTarget = paymentRows[keypadTargetIndex] || paymentRows[0];
        if (!currentTarget) return;

        let currentStr = String(currentTarget.amount || '');
        if (val === 'CLEAR') {
            updatePaymentRow(currentTarget.id, 'amount', 0);
        } else if (val === 'BACK') {
            const trimmed = currentStr.slice(0, -1);
            updatePaymentRow(currentTarget.id, 'amount', Number(trimmed) || 0);
        } else if (val === 'FULL') {
            updatePaymentRow(currentTarget.id, 'amount', finalPayable);
        } else {
            if (currentStr === '0') currentStr = '';
            const newStr = currentStr + val;
            updatePaymentRow(currentTarget.id, 'amount', Number(newStr));
        }
    };

    // Save Reservation to LocalStorage
    const handleFinalizeBooking = (actionType: 'reserve' | 'checkin' | 'hold') => {
        // Shared Pre-Commit Validation Guard
        const flightCheck = validatePreBookingFlight({
            actionType,
            checkIn,
            operatingDate: getOperatingSystemDate(),
            availableRatePlans,
            roomsList,
            nights,
            guestName,
            phone: mobile || phone,
            hasOverbookingError,
            validateAllRestrictions: validateAllRoomRestrictions
        });

        if (!flightCheck.allowed) {
            toast.error(flightCheck.error!);
            return;
        }

        const isTemplate = Boolean(editingReservation?.isNewBookingTemplate);
        const reservationNumber = (!isTemplate && editingReservation?.reservationNumber) || generateMasterReservationNumber();
        const reservationId = (!isTemplate && editingReservation?.id) || Date.now();

        // Allocate physical rooms strictly from genuinely available rooms across ALL rows and their quantities
        const usedRoomsAcrossBooking = new Set<string>();
        const allocatedRoomNumbers: string[] = [];
        const rowAllocatedMap = new Map<number, string[]>();

        for (const r of roomsList) {
            const countNeeded = Number(r.roomsCount) || 1;
            let roomsForThisRow: string[] = [];

            if (r.assignedRooms && r.assignedRooms.length === countNeeded && r.assignedRooms.every(rm => !usedRoomsAcrossBooking.has(rm))) {
                roomsForThisRow = [...r.assignedRooms];
            } else if (countNeeded === 1 && r.roomNumber && r.roomNumber !== 'TBA' && r.roomNumber !== 'Unassigned' && !usedRoomsAcrossBooking.has(r.roomNumber)) {
                roomsForThisRow = [r.roomNumber];
            } else {
                const report = getAvailableRoomsForStay(checkIn, checkOut, r.roomType, {
                    excludeReservationId: editingReservation?.reservationNumber || editingReservation?.id
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

        // Housekeeping Cleanliness Guard on Check-in
        if (actionType === 'checkin') {
            const canonicalRooms = getCanonicalRooms();
            const dirtyRooms = allocatedRoomNumbers.filter(rn => {
                const found = canonicalRooms.find(cr => cr.number === rn);
                return found && String(found.housekeepingStatus).toUpperCase() === 'DIRTY';
            });
            if (dirtyRooms.length > 0) {
                const proceed = window.confirm(`⚠️ Room ${dirtyRooms.join(', ')} is currently marked as DIRTY by Housekeeping.\n\nAre you sure you want to proceed with check-in?`);
                if (!proceed) return;
            }
        }

        const isGroup = allocatedRoomNumbers.length > 1 || Boolean(editingReservation?.groupCode);
        const groupCode = isGroup ? (editingReservation?.groupCode || generateGroupCode()) : (editingReservation?.groupCode || undefined);
        const paymentEval = determineBookingStatusFromPayment(totalPaid, finalPayable, netBaseAmount);
        const statusVal = actionType === 'checkin' 
            ? 'in-house' 
            : actionType === 'hold' 
                ? 'hold' 
                : (editingReservation && !isTemplate ? (totalPaid > 0 ? 'confirmed' : editingReservation.status) : paymentEval.status);
        const regNo = statusVal === 'in-house' ? ((!isTemplate && editingReservation?.registrationNumber) || generateRegistrationNumber(reservationNumber)) : undefined;
        const folioNo = (!isTemplate && editingReservation?.folioNumber) || generateFolioNumber(reservationNumber);

        const assignedRoomsExpanded = roomsList.flatMap((r) => {
            const countNeeded = Number(r.roomsCount) || 1;
            const assigned = rowAllocatedMap.get(r.id) || (
                (r.assignedRooms && r.assignedRooms.length === countNeeded)
                    ? r.assignedRooms
                    : [r.roomNumber]
            );
            return assigned.map(rm => {
                const dateConf = r.roomDatesMap?.[rm];
                return {
                    ...r,
                    roomsCount: 1,
                    roomNumber: rm,
                    assignedRooms: [rm],
                    checkInDate: dateConf?.checkIn || checkIn,
                    checkOutDate: dateConf?.checkOut || checkOut,
                    nights: dateConf?.nights || nights
                };
            });
        });

        const subRoomsWithNumbers = assignedRoomsExpanded.map((rm, idx) => {
            const subBookingNum = isGroup ? generateSubBookingNumber(reservationNumber, idx + 1) : `${reservationNumber}-01`;
            const roomRegNo = statusVal === 'in-house' ? generateRegistrationNumber(subBookingNum) : undefined;
            const roomFolioNo = generateFolioNumber(subBookingNum);
            return {
                ...rm,
                subBookingNumber: subBookingNum,
                registrationNumber: roomRegNo,
                folioNumber: roomFolioNo,
                smokingPolicy: getRoomSmokingPolicy(rm.roomNumber).smokingStatus,
                smokingPolicyText: getRoomSmokingPolicy(rm.roomNumber).policyBadgeText,
                smokingClause: getRoomSmokingPolicy(rm.roomNumber).guestFacingClause
            };
        });

        const mainRoom = roomsList[0] || { roomNumber: '101', roomType: 'Deluxe Double' };
        const primaryRoomNumber = allocatedRoomNumbers[0] || mainRoom.roomNumber;
        const primarySmokingPolicy = getRoomSmokingPolicy(primaryRoomNumber);

        const newReservation = {
            id: reservationId,
            reservationNumber,
            groupCode,
            ownerFolio: editingReservation?.ownerFolio,
            groupOwner: editingReservation?.groupOwner,
            subBookingNumber: isGroup ? `${reservationNumber}-01` : `${reservationNumber}-01`,
            isGroup,
            registrationNumber: regNo,
            registeredAt: statusVal === 'in-house' ? new Date().toISOString() : undefined,
            folioNumber: folioNo,
            guestName: `${salutation} ${guestName || 'Valued Guest'}`,
            phone: mobile || phone || '+880 1711-000000',
            email: email || 'guest@hospitality.com',
            packageId: mainRoom.packageId,
            packageName: mainRoom.packageName,
            roomNumber: primaryRoomNumber,
            roomType: mainRoom.roomType,
            smokingPolicy: primarySmokingPolicy.smokingStatus,
            smokingPolicyText: primarySmokingPolicy.policyBadgeText,
            smokingClause: primarySmokingPolicy.guestFacingClause,
            allocatedRooms: allocatedRoomNumbers,
            roomsCount: totalRoomsAllocatedInForm,
            checkIn,
            checkOut,
            nights,
            adults: mainRoom.adults,
            children: mainRoom.children,
            status: statusVal,
            isGuaranteed: totalPaid > 0,
            holdType: statusVal === 'hold' ? 'SIX_PM_RELEASE' : undefined,
            holdUntil: statusVal === 'hold' ? calculateHoldCutoffTimestamp('SIX_PM_RELEASE', checkIn) : undefined,
            holdReason: statusVal === 'hold' ? (remarksMap['Guest'] || 'Tentative hold from Add Reservation') : undefined,
            totalAmount: finalPayable,
            paidAmount: actionType === 'hold' ? 0 : totalPaid,
            dueAmount: actionType === 'hold' ? finalPayable : totalDue,
            taxApplicable,
            taxConfigId: selectedTaxConfigId,
            taxConfigName: taxCalculation.configName,
            taxConfigCode: taxCalculation.configCode,
            serviceChargeAmount: taxCalculation.serviceChargeAmount,
            vatAmount: taxCalculation.vatAmount,
            otherTaxesAmount: taxCalculation.otherTaxesAmount,
            totalTaxAmount: taxCalculation.totalTaxAmount,
            taxDetails: taxCalculation,
            baseAmount: netBaseAmount,
            source: businessSource,
            agent: businessAgent,
            vip: vipStatus || 'None',
            purpose: purposeOfVisit,
            specialRequests: [remarksMap['Guest'] || '', primarySmokingPolicy.guestFacingClause ? `[Policy: ${primarySmokingPolicy.guestFacingClause}]` : ''].filter(Boolean).join(' | '),
            servicesBundle: mainRoom.servicesBundle || { extraBed: mainRoom.extraBed, pickup: mainRoom.pickup },
            extraBed: mainRoom.servicesBundle?.extraBed || mainRoom.extraBed || null,
            pickup: mainRoom.servicesBundle?.pickup || mainRoom.pickup || null,
            mealPlan: mainRoom.servicesBundle?.mealPlan || null,
            celebration: mainRoom.servicesBundle?.celebration || null,
            spaWellness: mainRoom.servicesBundle?.spaWellness || null,
            timingFlex: mainRoom.servicesBundle?.timingFlex || null,
            customAddons: mainRoom.servicesBundle?.customAddons || [],
            roomsList: subRoomsWithNumbers,
            groupRoomsList: subRoomsWithNumbers.map((rm, idx) => ({
                reservationNumber: rm.subBookingNumber,
                masterReservationNumber: reservationNumber,
                subBookingNumber: rm.subBookingNumber,
                registrationNumber: rm.registrationNumber,
                folioNumber: rm.folioNumber,
                roomNumber: rm.roomNumber,
                roomType: rm.roomType || mainRoom.roomType,
                ratePlan: rm.ratePlan || mainRoom.ratePlan || 'Standard Rate',
                guestName: `${salutation} ${guestName || 'Valued Guest'}`,
                adults: rm.adults || mainRoom.adults,
                children: rm.children || mainRoom.children,
                status: statusVal,
                checkIn: rm.checkInDate || checkIn,
                checkOut: rm.checkOutDate || checkOut,
                isPrimary: idx === 0,
                groupCode
            })),
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

        // Two-phase atomic pre-commit validation guard
        const commitResult = validateAndCommitReservation(newReservation);
        if (!commitResult.success) {
            toast.error(commitResult.errorMessage || 'Cannot complete booking: Room is already booked or locked!');
            if (commitResult.suggestedAlternates && commitResult.suggestedAlternates.length > 0) {
                const alt = commitResult.suggestedAlternates[0];
                if (alt.alternatives.length > 0) {
                    toast.warning(`Suggestion: Room ${alt.alternatives.map(a => a.number).join(', ')} is available in ${alt.roomType}.`);
                }
            }
            return;
        }

        try {
            // If hold, also push to holds list
            if (actionType === 'hold') {
                const holdsExisting = localStorage.getItem('hotel_holds_v2');
                const holdsList = holdsExisting ? JSON.parse(holdsExisting) : [];
                holdsList.unshift({
                    id: Date.now(),
                    reservationNumber,
                    guestName: newReservation.guestName,
                    status: 'Hold',
                    holdStartDate: checkIn,
                    holdEndDate: checkOut,
                    reason: remarksMap['Guest'] || 'Tentative booking on hold',
                    reservationDate: new Date().toISOString().split('T')[0],
                    checkInDate: checkIn,
                    checkOutDate: checkOut,
                    roomType: mainRoom.roomType,
            smokingPolicy: primarySmokingPolicy.smokingStatus,
            smokingPolicyText: primarySmokingPolicy.policyBadgeText,
            smokingClause: primarySmokingPolicy.guestFacingClause,
                    estimatedAmount: finalPayable
                });
                localStorage.setItem('hotel_holds_v2', JSON.stringify(holdsList));
            }
        } catch (e) {
            console.error('Failed to save reservation hold', e);
        }

        toast.success(
            editingReservation 
                ? `Reservation ${reservationNumber} updated successfully!` 
                : statusVal === 'hold' 
                    ? `Reservation ${reservationNumber} placed on Hold!` 
                    : statusVal === 'in-house'
                        ? `Reservation ${reservationNumber} checked in successfully!`
                        : statusVal === 'confirmed'
                            ? `Reservation ${reservationNumber} confirmed successfully (Paid: ${currencySymbol} ${totalPaid.toLocaleString()})!`
                            : `Reservation ${reservationNumber} saved as Reserve (Non-Guaranteed)!`
        );

        if (onReservationCreated) {
            onReservationCreated(newReservation);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
            <div className="bg-white w-[95%] max-w-[1300px] h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* 1. Header (Exact hotel-management background #1e3a8a) */}
                <div className="bg-[#1e3a8a] text-white px-6 py-4 flex items-center justify-between flex-shrink-0 select-none">
                    <h2 className="text-base sm:text-lg font-semibold tracking-tight">Add New Reservation</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 2. Scrollable Modal Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#fafafa] flex flex-col gap-6 text-xs text-gray-800">
                    {/* Stepper (Exact 3-step design with connecting lines) */}
                    <div className="flex items-center max-w-[800px] select-none">
                        <div
                            onClick={() => setStep(1)}
                            className={`flex items-center gap-2.5 cursor-pointer ${step >= 1 ? 'opacity-100 font-semibold' : 'opacity-60'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-[#1e3a8a] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                1
                            </div>
                            <span className={`text-sm ${step === 1 ? 'text-[#0f172a] font-bold' : 'text-gray-600 font-medium'}`}>
                                Check Availability
                            </span>
                        </div>

                        <div className={`flex-1 h-0.5 mx-4 ${step >= 2 ? 'bg-[#1e3a8a]' : 'bg-gray-200'}`}></div>

                        <div
                            onClick={() => setStep(2)}
                            className={`flex items-center gap-2.5 cursor-pointer ${step >= 2 ? 'opacity-100 font-semibold' : 'opacity-60'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-[#1e3a8a] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                2
                            </div>
                            <span className={`text-sm ${step === 2 ? 'text-[#0f172a] font-bold' : 'text-gray-600 font-medium'}`}>
                                Guest Information
                            </span>
                        </div>

                        <div className={`flex-1 h-0.5 mx-4 ${step >= 3 ? 'bg-[#1e3a8a]' : 'bg-gray-200'}`}></div>

                        <div
                            onClick={() => setStep(3)}
                            className={`flex items-center gap-2.5 cursor-pointer ${step >= 3 ? 'opacity-100 font-semibold' : 'opacity-60'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-[#1e3a8a] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                3
                            </div>
                            <span className={`text-sm ${step === 3 ? 'text-[#0f172a] font-bold' : 'text-gray-600 font-medium'}`}>
                                Payments
                            </span>
                        </div>
                    </div>

                    {/* ========================================================
                        STEP 1: CHECK AVAILABILITY & ROOMS TABLE
                        ======================================================== */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in fade-in duration-150">
                            {/* Top 6-Field Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-600">
                                        Check in <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative flex items-center">
                                        <input
                                            type="date"
                                            value={checkIn}
                                            onChange={e => setCheckIn(e.target.value)}
                                            className="w-full h-9 px-2.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-600">Nights</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={nights}
                                        onChange={e => setNights(Math.max(1, Number(e.target.value)))}
                                        className="w-full h-9 px-2.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 outline-none text-center font-bold"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-600">
                                        Check out <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative flex items-center">
                                        <input
                                            type="date"
                                            value={checkOut}
                                            onChange={e => setCheckOut(e.target.value)}
                                            className="w-full h-9 px-2.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-600">Room(s)</label>
                                    <input
                                        type="text"
                                        value={roomsCountInput}
                                        disabled
                                        className="w-full h-9 px-2.5 border border-gray-200 rounded-md text-xs bg-gray-100 text-gray-500 cursor-not-allowed text-center font-bold"
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-600">Business Source</label>
                                    <select
                                        value={businessSource}
                                        onChange={e => setBusinessSource(e.target.value)}
                                        className="w-full h-9 px-2.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 outline-none focus:border-blue-500"
                                    >
                                        <option value="Direct">Direct</option>
                                        <option value="Booking.com">Booking.com</option>
                                        <option value="Agoda">Agoda</option>
                                        <option value="Corporate">Corporate</option>
                                        <option value="Walk-In">Walk-In</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-medium text-gray-600">Business Agent</label>
                                    <select
                                        value={businessAgent}
                                        onChange={e => setBusinessAgent(e.target.value)}
                                        className="w-full h-9 px-2.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 outline-none focus:border-blue-500"
                                    >
                                        <option value="Direct">Direct</option>
                                        <option value="Front Desk">Front Desk</option>
                                        <option value="Expedia Partner">Expedia Partner</option>
                                        <option value="Corporate Manager">Corporate Manager</option>
                                    </select>
                                </div>
                            </div>

                            {/* Options Row */}
                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={dayUse}
                                        onChange={e => setDayUse(e.target.checked)}
                                        className="w-4 h-4 rounded text-blue-600"
                                    />
                                    <span>Day Use</span>
                                </label>

                                <div className="flex items-center gap-3">
                                    <select
                                        value={ratePerNight}
                                        onChange={e => setRatePerNight(e.target.value)}
                                        className="h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                    >
                                        <option value="Rate Per Night">Rate Per Night</option>
                                        <option value="Package Rate">Package Rate</option>
                                    </select>

                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer select-none font-medium">
                                            <input
                                                type="checkbox"
                                                checked={taxApplicable}
                                                onChange={e => setTaxApplicable(e.target.checked)}
                                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <span>Tax &amp; VAT</span>
                                        </label>

                                        {taxApplicable && (
                                            <select
                                                value={selectedTaxConfigId}
                                                onChange={e => setSelectedTaxConfigId(e.target.value)}
                                                className="h-8 px-2 border border-blue-300 rounded text-xs bg-blue-50/70 text-blue-900 font-medium outline-none focus:border-blue-500 cursor-pointer"
                                                title="Select tax policy configured at /taxes-vat"
                                            >
                                                {availableTaxConfigs.map(cfg => (
                                                    <option key={cfg.id} value={cfg.id}>
                                                        {cfg.code} - {cfg.name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Exact Rooms Table */}
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                                <div className="px-3.5 py-2.5 bg-slate-50/90 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
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
                                        Dates: <strong className="text-blue-900">{checkIn}</strong> to <strong className="text-blue-900">{checkOut}</strong> ({nights}N)
                                    </span>
                                </div>

                                {hasOverbookingError && (
                                    <div className="mx-3.5 my-2 p-2 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-red-600 flex-shrink-0 animate-pulse" />
                                        <span>⚠️ Overbooking Warning: Room quantity exceeds total available rooms in this category! Please adjust room counts before proceeding.</span>
                                    </div>
                                )}

                                {availableRatePlans.length === 0 && (
                                    <div className="mx-3.5 my-2 p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between gap-2 shadow-2xs">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                                            <span>
                                                <strong>No Active Rate Plans Found:</strong> Please configure Rate Plans in{' '}
                                                <a href="/rate-plans" className="underline text-blue-700 hover:text-blue-900">
                                                    Rate Plan Management (/rate-plans)
                                                </a>{' '}
                                                first before creating reservations.
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="overflow-x-auto no-scrollbar">
                                    <table className="w-full text-left border-collapse min-w-[850px]">
                                        <thead>
                                            <tr className="bg-[#f8fafc] border-b border-gray-200 text-[11px] font-semibold text-gray-600">
                                                <th className="p-3">Room Type</th>
                                                <th className="p-3">No. of Rooms</th>
                                                <th className="p-3 min-w-[150px]">Rate / Package Offer</th>
                                                <th className="p-3 text-center">Room #</th>
                                                <th className="p-3">Adult</th>
                                                <th className="p-3">Child</th>
                                                <th className="p-3">Rate</th>
                                                <th className="p-3">Total</th>
                                                <th className="p-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {roomsList.map((row) => (
                                                <tr key={row.id} className="hover:bg-blue-50/20">
                                                        <td className="p-3">
                                                            <select
                                                                value={row.roomType}
                                                                onChange={e => updateRoomRow(row.id, 'roomType', e.target.value)}
                                                                className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none font-medium"
                                                            >
                                                                {availableRoomTypesList.map(typeOpt => {
                                                                    const availForRow = getMaxRoomsAllowedForRow(typeOpt, row.id);
                                                                    const isSoldOut = availForRow <= 0;
                                                                    return (
                                                                        <option key={typeOpt} value={typeOpt} disabled={isSoldOut && typeOpt !== row.roomType}>
                                                                            {typeOpt} {isSoldOut ? '[Sold Out]' : `[${availForRow} Available]`}
                                                                        </option>
                                                                    );
                                                                })}
                                                            </select>
                                                            {/* Ultra-Compact & Elegant Active Addons Pill */}
                                                            {(() => {
                                                                const b = row.servicesBundle || { extraBed: row.extraBed, pickup: row.pickup };
                                                                const activeNames: string[] = [];
                                                                if (b.pickup?.enabled) activeNames.push('Pickup');
                                                                if (b.pickup?.dropEnabled) activeNames.push('Drop');
                                                                if (b.extraBed?.enabled) activeNames.push(`${b.extraBed.quantity || 1}x Bed`);
                                                                if (b.mealPlan?.enabled) activeNames.push((b.mealPlan.planType || 'Meal').split(' ')[0]);
                                                                if (b.celebration?.enabled) activeNames.push('Decor');
                                                                if (b.spaWellness?.enabled) activeNames.push('Spa');
                                                                if (b.timingFlex?.earlyCheckIn || b.timingFlex?.lateCheckOut) activeNames.push('Flex');
                                                                if (b.customAddons && b.customAddons.length > 0) activeNames.push(`+${b.customAddons.length} Extra`);

                                                                if (activeNames.length === 0) return null;

                                                                const addonsCost = getRoomBundleTotal(b, nights);
                                                                const scopeLabel = b.targetRoomNumber && b.targetRoomNumber !== 'All Rooms' ? ` (${b.targetRoomNumber})` : '';

                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'pickup' })}
                                                                        className="mt-1 w-full max-w-[210px] h-5.5 px-2 rounded-md bg-blue-50/90 hover:bg-blue-100 border border-blue-200/80 text-blue-900 text-[10px] font-semibold flex items-center justify-between shadow-2xs cursor-pointer transition-all select-none group"
                                                                        title={`Configured Services${scopeLabel}: ${activeNames.join(', ')} (Click to edit)`}
                                                                    >
                                                                        <div className="flex items-center gap-1.5 truncate">
                                                                            <Sparkles size={11} className="text-blue-600 flex-shrink-0" />
                                                                            <span className="truncate">{activeNames.slice(0, 2).join(', ')}{activeNames.length > 2 ? ` +${activeNames.length - 2}` : ''}{scopeLabel}</span>
                                                                        </div>
                                                                        <span className="text-[9px] text-blue-700 bg-white/90 px-1 rounded border border-blue-200/60 flex-shrink-0 ml-1">
                                                                            +{currencySymbol}{addonsCost.toLocaleString()}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            {(() => {
                                                                const maxAllowed = getMaxRoomsAllowedForRow(row.roomType, row.id);
                                                                const freeLeft = getRemainingFreeCountForType(row.roomType);
                                                                const isExceeded = (Number(row.roomsCount) || 1) > maxAllowed;

                                                                return (
                                                                    <div className="flex flex-col items-center">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            max={maxAllowed}
                                                                            value={row.roomsCount}
                                                                            onChange={e => {
                                                                                const raw = parseInt(e.target.value);
                                                                                if (isNaN(raw) || raw < 1) {
                                                                                    updateRoomRow(row.id, 'roomsCount', 1);
                                                                                    return;
                                                                                }
                                                                                if (raw > maxAllowed) {
                                                                                    toast.warning(`Overbooking Prevented: Only ${maxAllowed} room(s) available for ${row.roomType}!`);
                                                                                    updateRoomRow(row.id, 'roomsCount', maxAllowed);
                                                                                } else {
                                                                                    updateRoomRow(row.id, 'roomsCount', raw);
                                                                                }
                                                                            }}
                                                                            className={`w-16 h-8 px-2 border rounded text-xs text-center outline-none transition-all ${
                                                                                isExceeded 
                                                                                    ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-400' 
                                                                                    : 'border-gray-300 focus:border-blue-500'
                                                                            }`}
                                                                        />
                                                                        <span className={`text-[9.5px] font-semibold mt-0.5 whitespace-nowrap ${isExceeded ? 'text-red-600 font-bold' : 'text-gray-500'}`} title="Maximum available inventory">
                                                                            Max: {maxAllowed} ({freeLeft} free)
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="p-3">
                                                            {(() => {
                                                                const currentOfferVal = getOfferValue(row);

                                                                return (
                                                                    <select
                                                                        value={currentOfferVal}
                                                                        onChange={e => handleUnifiedOfferChange(row.id, e.target.value)}
                                                                        className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none cursor-pointer font-medium text-gray-800"
                                                                        title="Select Rate Plan or Bundled Stay Package"
                                                                    >
                                                                        <optgroup label="── 🏷️ Rate Plans ──">
                                                                            {availableRatePlans.length === 0 ? (
                                                                                <option value="" disabled>No rate plans configured</option>
                                                                            ) : (
                                                                                availableRatePlans.map(p => {
                                                                                    const isPlanDisabled = p.status === 'Inactive' || p.stopSell;
                                                                                    const badge = p.status === 'Inactive' ? ' (Inactive)' : p.stopSell ? ' (Stop Sell)' : '';
                                                                                    return (
                                                                                        <option key={`plan:${p.name}`} value={`plan:${p.name}`} disabled={isPlanDisabled}>
                                                                                            🏷️ {p.name}{badge}
                                                                                        </option>
                                                                                    );
                                                                                })
                                                                            )}
                                                                        </optgroup>

                                                                        {availablePackages.filter(p => !p.status || p.status === 'Active').length > 0 && (
                                                                            <optgroup label="── 🎁 Bundled Packages ──">
                                                                                {availablePackages
                                                                                    .filter(p => !p.status || p.status === 'Active')
                                                                                    .map(p => {
                                                                                        const applicable = p.roomConfig?.applicableRoomTypes;
                                                                                        const isApplicable = !applicable || !Array.isArray(applicable) || applicable.length === 0 || applicable.some((t: string) => t.toLowerCase() === 'all' || t.toLowerCase() === row.roomType.toLowerCase());
                                                                                        const roomTypeNote = (!isApplicable && applicable && applicable.length > 0) ? ` (${applicable[0]})` : '';
                                                                                        const surchargeText = p.finance?.baseSurcharge ? ` (+${currencySymbol}${p.finance.baseSurcharge})` : '';
                                                                                        return (
                                                                                            <option key={`pkg:${p.id}`} value={`pkg:${p.id}`}>
                                                                                                🎁 {p.name}{roomTypeNote}{surchargeText}
                                                                                            </option>
                                                                                        );
                                                                                    })
                                                                                }
                                                                            </optgroup>
                                                                        )}
                                                                    </select>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            {(() => {
                                                                const assignedList = (row.assignedRooms && row.assignedRooms.length > 0)
                                                                    ? row.assignedRooms
                                                                    : getAutoAssignedRoomsForRow(row);

                                                                if (row.roomsCount > 1) {
                                                                    if (row.isAssign) {
                                                                        return (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setMultiRoomModal({
                                                                                    isOpen: true,
                                                                                    rowId: row.id,
                                                                                    roomType: row.roomType,
                                                                                    requiredCount: row.roomsCount,
                                                                                    isAutoMode: true
                                                                                })}
                                                                                className="w-32 h-8 px-2 border border-blue-300 bg-blue-50/90 hover:bg-blue-100 text-blue-900 rounded-md text-xs flex items-center justify-between cursor-pointer select-none shadow-2xs mx-auto transition-all group"
                                                                                title="Auto-Allocated. Click to view or customize assigned rooms"
                                                                            >
                                                                                <div className="flex items-center gap-1 truncate">
                                                                                    <Sparkles size={12} className="text-blue-600 flex-shrink-0" />
                                                                                    <span className="text-blue-700 font-extrabold">Auto ({assignedList.length})</span>
                                                                                </div>
                                                                                <span className="text-[10px] font-mono font-semibold text-slate-700 bg-white/90 px-1 py-0.5 rounded border border-blue-200/60 truncate max-w-[50px]">
                                                                                    {assignedList.map(rm => {
                                                                                        const conf = row.roomDatesMap?.[rm];
                                                                                        return conf && conf.nights !== nights ? `${rm}(${conf.nights}N)` : rm;
                                                                                    }).slice(0, 2).join(',')}{assignedList.length > 2 ? '..' : ''}
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    }

                                                                    const isFullyPicked = assignedList.length === row.roomsCount;
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setMultiRoomModal({
                                                                                isOpen: true,
                                                                                rowId: row.id,
                                                                                roomType: row.roomType,
                                                                                requiredCount: row.roomsCount,
                                                                                isAutoMode: false
                                                                            })}
                                                                            className={`w-32 h-8 px-2 border rounded-md text-xs flex items-center justify-between cursor-pointer select-none shadow-2xs mx-auto transition-all ${
                                                                                isFullyPicked 
                                                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100' 
                                                                                    : 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 ring-2 ring-amber-300/60'
                                                                            }`}
                                                                            title="Manual Assignment. Click to select rooms & customize stay dates"
                                                                        >
                                                                            <div className="flex items-center gap-1 truncate">
                                                                                {isFullyPicked ? (
                                                                                    <CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" />
                                                                                ) : (
                                                                                    <AlertTriangle size={12} className="text-amber-600 flex-shrink-0 animate-bounce" />
                                                                                )}
                                                                                <span>{assignedList.length}/{row.roomsCount} Rms</span>
                                                                            </div>
                                                                            <span className="text-[9px] font-mono bg-white/90 px-1 py-0.5 rounded border border-slate-200 truncate max-w-[45px]">
                                                                                {isFullyPicked 
                                                                                    ? `${assignedList.map(rm => {
                                                                                        const conf = row.roomDatesMap?.[rm];
                                                                                        return conf && conf.nights !== nights ? `${rm}(${conf.nights}N)` : rm;
                                                                                    }).slice(0, 2).join(',')}${assignedList.length > 2 ? '..' : ''}`
                                                                                    : 'Pick'}
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                }

                                                                // Single room mode (roomsCount === 1)
                                                                if (row.isAssign) {
                                                                    const singleAuto = assignedList[0] || row.roomNumber || 'Auto';
                                                                    return (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setMultiRoomModal({
                                                                                isOpen: true,
                                                                                rowId: row.id,
                                                                                roomType: row.roomType,
                                                                                requiredCount: 1,
                                                                                isAutoMode: true
                                                                            })}
                                                                            className="w-32 h-8 px-2 border border-blue-300 bg-blue-50/90 hover:bg-blue-100 text-blue-900 rounded-md text-xs flex items-center justify-between cursor-pointer select-none shadow-2xs mx-auto transition-all group"
                                                                            title={`Auto-Allocated: Room ${singleAuto}. Click to view or assign manually`}
                                                                        >
                                                                            <div className="flex items-center gap-1 truncate">
                                                                                <Sparkles size={12} className="text-blue-600 flex-shrink-0" />
                                                                                <span className="text-blue-700 font-extrabold">Auto</span>
                                                                            </div>
                                                                            <span className="text-[10px] font-mono font-bold text-slate-800 bg-white/90 px-1.5 py-0.5 rounded border border-blue-200/70 truncate max-w-[55px]">
                                                                                {singleAuto}
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                }

                                                                // Manual single-room mode (!row.isAssign)
                                                                const singleManual = assignedList[0] || row.roomNumber;
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setMultiRoomModal({
                                                                            isOpen: true,
                                                                            rowId: row.id,
                                                                            roomType: row.roomType,
                                                                            requiredCount: 1,
                                                                            isAutoMode: false
                                                                        })}
                                                                        className={`w-32 h-8 px-2 border rounded-md text-xs flex items-center justify-between cursor-pointer select-none shadow-2xs mx-auto transition-all ${
                                                                            singleManual
                                                                                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                                                                                : 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 ring-2 ring-amber-300/60'
                                                                        }`}
                                                                        title={`Manual Assignment: Room ${singleManual || 'None'}. Click to pick room`}
                                                                    >
                                                                        <div className="flex items-center gap-1 truncate">
                                                                            {singleManual ? (
                                                                                <CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" />
                                                                            ) : (
                                                                                <AlertTriangle size={12} className="text-amber-600 flex-shrink-0 animate-bounce" />
                                                                            )}
                                                                            <span className={singleManual ? 'font-bold text-emerald-800' : 'font-bold text-amber-800'}>
                                                                                {singleManual ? 'Manual' : 'Select'}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[10px] font-mono font-bold text-emerald-950 bg-white/90 px-1.5 py-0.5 rounded border border-emerald-200 truncate max-w-[55px]">
                                                                            {singleManual || 'Pick'}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })()}
                                                        </td>
                                                        {(() => {
                                                            const capacity = getRoomTypeCapacity(row.roomType);
                                                            return (
                                                                <>
                                                                    <td className="p-3">
                                                                        <div className="flex flex-col items-center">
                                                                            <input
                                                                                type="number"
                                                                                min={1}
                                                                                max={capacity.maxAdults}
                                                                                value={row.adults}
                                                                                onChange={e => updateRoomRow(row.id, 'adults', Number(e.target.value))}
                                                                                className="w-14 h-8 px-2 border border-gray-300 rounded text-xs text-center font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                                                                title={`Adults: 1 to ${capacity.maxAdults} for ${row.roomType}`}
                                                                            />
                                                                            <span className="text-[10px] text-slate-400 mt-0.5 font-medium">Max {capacity.maxAdults}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <div className="flex flex-col items-center">
                                                                            <input
                                                                                type="number"
                                                                                min={0}
                                                                                max={capacity.maxChildren}
                                                                                disabled={capacity.maxChildren === 0}
                                                                                value={row.children}
                                                                                onChange={e => updateRoomRow(row.id, 'children', Number(e.target.value))}
                                                                                className={`w-14 h-8 px-2 border rounded text-xs text-center font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                                                                                    capacity.maxChildren === 0 ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'border-gray-300'
                                                                                }`}
                                                                                title={capacity.maxChildren === 0 ? `Children not permitted in ${row.roomType}` : `Children: 0 to ${capacity.maxChildren} for ${row.roomType}`}
                                                                            />
                                                                            <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                                                                {capacity.maxChildren === 0 ? 'N/A' : `Max ${capacity.maxChildren}`}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                </>
                                                            );
                                                        })()}
                                                        <td className="p-3">
                                                            <input
                                                                type="number"
                                                                value={row.rate}
                                                                onChange={e => updateRoomRow(row.id, 'rate', Number(e.target.value))}
                                                                className="w-20 h-8 px-2 border border-gray-300 rounded text-xs text-gray-800"
                                                            />
                                                        </td>
                                                        {(() => {
                                                            const bundle = row.servicesBundle || { extraBed: row.extraBed, pickup: row.pickup };
                                                            const rowAddons = getRoomBundleTotal(bundle, nights);
                                                            const rowBase = row.rate * row.roomsCount * nights;
                                                            const computedTotal = rowBase + rowAddons;
                                                            return (
                                                                <td className="p-3 text-gray-900 font-mono">
                                                                    <div>{currencySymbol} {computedTotal.toFixed(2)}</div>
                                                                    {rowAddons > 0 && (
                                                                        <div className="text-[10px] text-slate-400 font-normal">
                                                                            Base: {rowBase.toFixed(0)} + Svc: {rowAddons.toFixed(0)}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            );
                                                        })()}
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-2">
                                                                <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={row.isAssign}
                                                                        onChange={e => updateRoomRow(row.id, 'isAssign', e.target.checked)}
                                                                        className="w-3.5 h-3.5 rounded text-blue-600"
                                                                    />
                                                                    <span>Is Assign</span>
                                                                </label>

                                                                {row.roomsCount > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleSplitRowIntoRooms(row.id)}
                                                                        title={`Split group row into ${row.roomsCount} separate individual room rows`}
                                                                        className="px-1.5 py-0.5 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-900 rounded border border-blue-200 cursor-pointer transition-colors flex items-center gap-1 text-[10px] shadow-2xs"
                                                                    >
                                                                        <Split size={12} className="text-blue-600" />
                                                                        <span>Split ({row.roomsCount})</span>
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCopyRoomRow(row)}
                                                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded cursor-pointer"
                                                                    title="Duplicate Room Row"
                                                                >
                                                                    <Copy size={14} />
                                                                </button>

                                                                {/* 3-dots Menu Button anchored cleanly with Portal */}
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleToggleRowMenu(e, row.id)}
                                                                    title="Room Add-On Services (Transfer, Bed, Dining, Spa, Romance, Flex)"
                                                                    className={`p-1 rounded cursor-pointer transition-all ${
                                                                        (row.servicesBundle || row.extraBed?.enabled || row.pickup?.enabled)
                                                                            ? 'text-blue-700 bg-blue-100/70 hover:bg-blue-200/70 ring-1 ring-blue-300'
                                                                            : 'text-gray-400 hover:text-blue-600 hover:bg-gray-100'
                                                                    }`}
                                                                >
                                                                    <MoreVertical size={14} />
                                                                </button>

                                                                {roomsList.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveRoomRow(row.id)}
                                                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded cursor-pointer"
                                                                        title="Remove Room Row"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Floating 3-dots Menu rendered outside overflow containers via createPortal */}
                                {menuAnchor && (() => {
                                    const row = roomsList.find(r => r.id === menuAnchor.rowId);
                                    if (!row) return null;

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
                                                    <span>Room #{row.roomNumber || row.id} Services</span>
                                                    <span className="text-[9px] text-blue-600 font-semibold">Expert Addons</span>
                                                </div>
                                                
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'pickup' });
                                                        setMenuAnchor(null);
                                                    }}
                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Car size={13} className="text-blue-600" />
                                                        <span>Airport Pickup (Arrival)</span>
                                                    </span>
                                                    {row.servicesBundle?.pickup?.enabled || row.pickup?.enabled ? (
                                                        <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'pickup' });
                                                        setMenuAnchor(null);
                                                    }}
                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Plane size={13} className="text-sky-600" />
                                                        <span>Airport Drop (Departure)</span>
                                                    </span>
                                                    {row.servicesBundle?.pickup?.dropEnabled || row.pickup?.dropEnabled ? (
                                                        <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'extrabed' });
                                                        setMenuAnchor(null);
                                                    }}
                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <BedDouble size={13} className="text-indigo-600" />
                                                        <span>Extra Bed &amp; Baby Cot</span>
                                                    </span>
                                                    {row.servicesBundle?.extraBed?.enabled || row.extraBed?.enabled ? (
                                                        <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'mealplan' });
                                                        setMenuAnchor(null);
                                                    }}
                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Utensils size={13} className="text-amber-600" />
                                                        <span>Meal Plans &amp; Dining</span>
                                                    </span>
                                                    {row.servicesBundle?.mealPlan?.enabled ? (
                                                        <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'celebration' });
                                                        setMenuAnchor(null);
                                                    }}
                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Gift size={13} className="text-rose-600" />
                                                        <span>Honeymoon &amp; Decor</span>
                                                    </span>
                                                    {row.servicesBundle?.celebration?.enabled ? (
                                                        <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'spa' });
                                                        setMenuAnchor(null);
                                                    }}
                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Sparkles size={13} className="text-teal-600" />
                                                        <span>Spa &amp; Wellness Pass</span>
                                                    </span>
                                                    {row.servicesBundle?.spaWellness?.enabled ? (
                                                        <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'timing' });
                                                        setMenuAnchor(null);
                                                    }}
                                                    className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-blue-50 text-slate-700 transition-colors"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Clock size={13} className="text-sky-600" />
                                                        <span>Early / Late Check-Out</span>
                                                    </span>
                                                    {row.servicesBundle?.timingFlex?.earlyCheckIn || row.servicesBundle?.timingFlex?.lateCheckOut ? (
                                                        <span className="text-[9.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">Active</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">+ Add</span>
                                                    )}
                                                </button>

                                                <div className="my-1 border-t border-slate-100" />

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'pickup' });
                                                        setMenuAnchor(null);
                                                    }}
                                                    className="w-full px-3 py-1.5 text-left text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-1.5 transition-colors"
                                                >
                                                    <Sparkles size={13} />
                                                    <span>Manage All Services...</span>
                                                </button>
                                            </div>
                                        </>
                                        , document.body
                                    );
                                })()}

                                <div className="p-3 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={handleAddRoomRow}
                                        className="h-8 px-3.5 border border-blue-300 text-blue-600 hover:bg-blue-50 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                                    >
                                        + Add Room
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        STEP 2: GUEST INFORMATION & ACCORDIONS
                        ======================================================== */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            {/* Accordion 1: Guest Profile */}
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                                <div
                                    onClick={() => setOpenGuestProfile(!openGuestProfile)}
                                    className="p-4 flex items-center justify-between cursor-pointer border-b border-gray-100 select-none hover:bg-gray-50/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#eff6ff] text-[#3b82f6] flex items-center justify-center">
                                            <UserIcon size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm text-gray-900">Guest Profile</h3>
                                            <p className="text-[11px] text-gray-500">Identity, contact and travel information</p>
                                        </div>
                                    </div>
                                    <div className="text-gray-400">
                                        {openGuestProfile ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>

                                {openGuestProfile && (
                                    <div className="p-5 bg-[#f8fafc] space-y-4">
                                        {/* Row 1: Name, Phone, Mobile, Email */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">
                                                    FULL NAME <span className="text-red-500">*</span>
                                                </label>
                                                <div className="flex gap-1.5">
                                                    <select
                                                        value={salutation}
                                                        onChange={e => setSalutation(e.target.value)}
                                                        className="w-16 h-8 px-1.5 border border-gray-300 rounded text-xs bg-white outline-none font-medium"
                                                    >
                                                        <option value="Mr">Mr</option>
                                                        <option value="Mrs">Mrs</option>
                                                        <option value="Ms">Ms</option>
                                                        <option value="Dr">Dr</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder="Type guest name..."
                                                        value={guestName}
                                                        onChange={e => setGuestName(e.target.value)}
                                                        className="flex-1 h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">PHONE</label>
                                                <input
                                                    type="text"
                                                    value={phone}
                                                    onChange={e => setPhone(e.target.value)}
                                                    placeholder="Phone number..."
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">
                                                    MOBILE <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={mobile}
                                                    onChange={e => setMobile(e.target.value)}
                                                    placeholder="Mobile number..."
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none text-gray-800"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">EMAIL</label>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={e => setEmail(e.target.value)}
                                                    placeholder="guest@domain.com"
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 2: VIP, Gender, Nationality, Guest Type, DOB */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">VIP STATUS</label>
                                                <select
                                                    value={vipStatus}
                                                    onChange={e => setVipStatus(e.target.value)}
                                                    className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                >
                                                    <option value="">Standard</option>
                                                    <option value="VIP-1">VIP-1 (Corporate)</option>
                                                    <option value="VIP-2">VIP-2 (Executive)</option>
                                                    <option value="VIP-GM">VIP-GM</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">GENDER</label>
                                                <select
                                                    value={gender}
                                                    onChange={e => setGender(e.target.value)}
                                                    className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                >
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">NATIONALITY</label>
                                                <input
                                                    type="text"
                                                    value={nationality}
                                                    onChange={e => setNationality(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">GUEST TYPE</label>
                                                <select
                                                    value={guestType}
                                                    onChange={e => setGuestType(e.target.value)}
                                                    className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                >
                                                    <option value="Adult">Adult</option>
                                                    <option value="Child">Child</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">DATE OF BIRTH</label>
                                                <input
                                                    type="date"
                                                    value={dob}
                                                    onChange={e => setDob(e.target.value)}
                                                    className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 3: Country, City, Occupation, Purpose, ID */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">BIRTH COUNTRY</label>
                                                <input
                                                    type="text"
                                                    value={birthCountry}
                                                    onChange={e => setBirthCountry(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">BIRTH CITY</label>
                                                <input
                                                    type="text"
                                                    value={birthCity}
                                                    onChange={e => setBirthCity(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">OCCUPATION</label>
                                                <input
                                                    type="text"
                                                    value={occupation}
                                                    onChange={e => setOccupation(e.target.value)}
                                                    className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                                />
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">PURPOSE OF VISIT</label>
                                                <select
                                                    value={purposeOfVisit}
                                                    onChange={e => setPurposeOfVisit(e.target.value)}
                                                    className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                >
                                                    <option value="Business">Business</option>
                                                    <option value="Leisure">Leisure</option>
                                                    <option value="Transit">Transit</option>
                                                    <option value="Medical">Medical</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-1">
                                                <label className="text-[11px] font-semibold text-gray-700">ID TYPE</label>
                                                <select
                                                    value={idType}
                                                    onChange={e => setIdType(e.target.value)}
                                                    className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none"
                                                >
                                                    <option value="National ID (NID)">National ID (NID)</option>
                                                    <option value="Passport">Passport</option>
                                                    <option value="Driving License">Driving License</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Remarks & Preferences Box */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs text-gray-700 uppercase tracking-wider">
                                            REMARKS & PREFERENCES
                                        </h4>
                                        <p className="text-[11px] text-gray-400">Keep guest-facing and internal notes organized.</p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-blue-600 text-[10px] tracking-wider">
                                        OPTIONAL
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 border-b border-gray-200">
                                    {(['Guest', 'Check In', 'Check Out', 'House Keeping', 'Payment Note'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            type="button"
                                            onClick={() => setActivePrefTab(tab)}
                                            className={`pb-2 text-xs font-medium cursor-pointer relative ${
                                                activePrefTab === tab
                                                    ? 'text-blue-600 border-b-2 border-blue-600 -mb-[1px]'
                                                    : 'text-gray-500 hover:text-gray-800'
                                            }`}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>

                                <textarea
                                    value={remarksMap[activePrefTab] || ''}
                                    onChange={e => setRemarksMap({ ...remarksMap, [activePrefTab]: e.target.value })}
                                    placeholder={`Enter remarks for ${activePrefTab}...`}
                                    className="w-full min-h-[90px] p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 resize-y"
                                />
                            </div>

                            {/* Accordion 2: Home Address */}
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                                <div
                                    onClick={() => setOpenAddress(!openAddress)}
                                    className="p-4 flex items-center justify-between cursor-pointer border-b border-gray-100 select-none hover:bg-gray-50/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#ecfeff] text-[#06b6d4] flex items-center justify-center">
                                            <MapPin size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm text-gray-900">Home Address</h3>
                                            <p className="text-[11px] text-gray-500">Primary residence and location details</p>
                                        </div>
                                    </div>
                                    <div className="text-gray-400">
                                        {openAddress ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>

                                {openAddress && (
                                    <div className="p-5 bg-[#f8fafc] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                        <div className="flex flex-col gap-1 sm:col-span-2">
                                            <label className="text-[11px] font-semibold text-gray-700">Street Address</label>
                                            <input
                                                type="text"
                                                value={streetAddress}
                                                onChange={e => setStreetAddress(e.target.value)}
                                                className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-semibold text-gray-700">City</label>
                                            <input
                                                type="text"
                                                value={homeCity}
                                                onChange={e => setHomeCity(e.target.value)}
                                                className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-semibold text-gray-700">State / Division</label>
                                            <input
                                                type="text"
                                                value={homeState}
                                                onChange={e => setHomeState(e.target.value)}
                                                className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-semibold text-gray-700">Country</label>
                                            <input
                                                type="text"
                                                value={homeCountry}
                                                onChange={e => setHomeCountry(e.target.value)}
                                                className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[11px] font-semibold text-gray-700">Postal Code</label>
                                            <input
                                                type="text"
                                                value={postalCode}
                                                onChange={e => setPostalCode(e.target.value)}
                                                className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Accordion 3: Work Details */}
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
                                <div
                                    onClick={() => setOpenWork(!openWork)}
                                    className="p-4 flex items-center justify-between cursor-pointer border-b border-gray-100 select-none hover:bg-gray-50/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#f3e8ff] text-[#a855f7] flex items-center justify-center">
                                            <Briefcase size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm text-gray-900">Work Details</h3>
                                            <p className="text-[11px] text-gray-500">Organization and business contact information</p>
                                        </div>
                                    </div>
                                    <div className="text-gray-400">
                                        {openWork ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>

                                <div className="p-5 bg-[#f8fafc] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-gray-700">Company Name</label>
                                        <input
                                            type="text"
                                            value={companyName}
                                            onChange={e => setCompanyName(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-gray-700">Designation</label>
                                        <input
                                            type="text"
                                            value={designation}
                                            onChange={e => setDesignation(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-gray-700">Office Phone</label>
                                        <input
                                            type="text"
                                            value={officePhone}
                                            onChange={e => setOfficePhone(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-gray-700">Corporate Email</label>
                                        <input
                                            type="email"
                                            value={corporateEmail}
                                            onChange={e => setCorporateEmail(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-gray-700">Tax / VAT ID</label>
                                        <input
                                            type="text"
                                            value={taxVatId}
                                            onChange={e => setTaxVatId(e.target.value)}
                                            className="w-full h-8 px-2.5 border border-gray-300 rounded text-xs bg-white outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        STEP 3: PAYMENTS (2-COLUMN WITH KEYPAD)
                        ======================================================== */}
                    {step === 3 && (
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in duration-150">
                            {/* Left Column (3 cols) */}
                            <div className="lg:col-span-3 space-y-6">
                                {/* Discount Section */}
                                <div className="space-y-2">
                                    <h3 className="text-base text-gray-900">Discount</h3>
                                    <div className="flex items-center gap-3">
                                        <select
                                            value={discountType}
                                            onChange={e => setDiscountType(e.target.value as any)}
                                            className="w-36 h-9 px-2.5 border border-gray-300 rounded-md text-xs bg-white outline-none font-medium"
                                        >
                                            <option value="Percentage">Percentage (%)</option>
                                            <option value="Fixed">Fixed ({currencySymbol})</option>
                                        </select>

                                        <input
                                            type="number"
                                            min={0}
                                            value={discountValue}
                                            onChange={e => setDiscountValue(Number(e.target.value))}
                                            className="w-44 h-9 px-3 border border-gray-300 rounded-md text-xs bg-white text-gray-800 outline-none"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setDiscountValue(0)}
                                            className="p-2 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                                            title="Clear Discount"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-gray-500">Remarks: Added discount</p>
                                </div>

                                {/* Payment Method Section */}
                                <div className="space-y-3">
                                    <h3 className="text-base text-gray-900">Payment Method</h3>

                                    <div className="space-y-2.5">
                                        {paymentRows.map((p, idx) => (
                                            <div
                                                key={p.id}
                                                onClick={() => setKeypadTargetIndex(idx)}
                                                className={`p-3 bg-white border rounded-lg flex items-center gap-3 transition-colors ${
                                                    keypadTargetIndex === idx ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-gray-200'
                                                }`}
                                            >
                                                <div className="flex-1 flex flex-col gap-1">
                                                    <label className="text-[10.5px] font-semibold text-gray-600">Method</label>
                                                    <select
                                                        value={p.method}
                                                        onChange={e => updatePaymentRow(p.id, 'method', e.target.value)}
                                                        className="h-8 px-2 border border-gray-300 rounded text-xs bg-white outline-none font-medium"
                                                    >
                                                        <option value="Cash">Cash at Desk</option>
                                                        <option value="Card">Credit / Debit Card</option>
                                                        <option value="bKash">bKash Merchant Pay</option>
                                                        <option value="Bank Transfer">Bank Transfer</option>
                                                    </select>
                                                </div>

                                                <div className="flex-1 flex flex-col gap-1">
                                                    <label className="text-[10.5px] font-semibold text-gray-600">Amount ({currencySymbol})</label>
                                                    <input
                                                        type="number"
                                                        value={p.amount}
                                                        onChange={e => updatePaymentRow(p.id, 'amount', Number(e.target.value))}
                                                        className="h-8 px-2.5 border border-gray-300 rounded text-xs text-emerald-700"
                                                    />
                                                </div>

                                                {paymentRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePaymentRow(p.id)}
                                                        className="self-end mb-1 p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                                                        title="Delete Row"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end pt-1">
                                        <button
                                            type="button"
                                            onClick={handleAddPaymentRow}
                                            className="h-8 px-3.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-xs font-semibold cursor-pointer shadow-2xs"
                                        >
                                            Add New Payment Method
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column (2 cols): Summary Box & Numeric Keypad */}
                            <div className="lg:col-span-2">
                                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-2 text-xs">
                                    <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                                        <span>Room Base Tariff</span>
                                        <span className="text-gray-900 font-mono">{currencySymbol} {roomBaseTotal.toFixed(2)}</span>
                                    </div>

                                    {totalPickupArrivalCharge > 0 && (
                                        <div className="flex justify-between py-1 text-blue-700">
                                            <span className="flex items-center gap-1"><Car size={11} /> Airport Pickup (Inbound)</span>
                                            <span className="font-mono">+{currencySymbol} {totalPickupArrivalCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalDropDepartureCharge > 0 && (
                                        <div className="flex justify-between py-1 text-sky-700">
                                            <span className="flex items-center gap-1"><Plane size={11} /> Airport Drop (Outbound)</span>
                                            <span className="font-mono">+{currencySymbol} {totalDropDepartureCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalExtraBedCharge > 0 && (
                                        <div className="flex justify-between py-1 text-indigo-700">
                                            <span className="flex items-center gap-1"><BedDouble size={11} /> Extra Bed &amp; Cot</span>
                                            <span className="font-mono">+{currencySymbol} {totalExtraBedCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalMealPlanCharge > 0 && (
                                        <div className="flex justify-between py-1 text-amber-700">
                                            <span className="flex items-center gap-1"><Utensils size={11} /> Meal Plans</span>
                                            <span className="font-mono">+{currencySymbol} {totalMealPlanCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalCelebrationCharge > 0 && (
                                        <div className="flex justify-between py-1 text-rose-700">
                                            <span className="flex items-center gap-1"><Gift size={11} /> Decor &amp; Romance</span>
                                            <span className="font-mono">+{currencySymbol} {totalCelebrationCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalSpaCharge > 0 && (
                                        <div className="flex justify-between py-1 text-teal-700">
                                            <span className="flex items-center gap-1"><Sparkles size={11} /> Spa Treatment</span>
                                            <span className="font-mono">+{currencySymbol} {totalSpaCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalTimingCharge > 0 && (
                                        <div className="flex justify-between py-1 text-sky-700">
                                            <span className="flex items-center gap-1"><Clock size={11} /> Time Flex</span>
                                            <span className="font-mono">+{currencySymbol} {totalTimingCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {totalCustomCharge > 0 && (
                                        <div className="flex justify-between py-1 text-purple-700">
                                            <span>Custom Services</span>
                                            <span className="font-mono">+{currencySymbol} {totalCustomCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between py-1.5 border-t border-dashed border-gray-200 text-gray-700 font-semibold">
                                        <span>Total Gross</span>
                                        <span className="text-gray-900 font-mono">{currencySymbol} {grossTotal.toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between py-1 border-b border-dashed border-gray-200 text-gray-600">
                                        <span>Discounted Amount</span>
                                        <span className="text-emerald-600 font-mono">-{currencySymbol} {discountedAmount.toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between py-1 text-gray-700 text-xs">
                                        <span>Net Base (Taxable)</span>
                                        <span className="font-mono text-gray-900 font-semibold">{currencySymbol} {netBaseAmount.toFixed(2)}</span>
                                    </div>

                                    {/* Statutory Taxes & VAT itemized breakdown from /taxes-vat */}
                                    {taxCalculation.isTaxApplicable && taxCalculation.breakdown.length > 0 ? (
                                        <div className="my-1 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                                            <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider pb-0.5 border-b border-slate-200">
                                                <span>{taxCalculation.configCode} Tax Rules</span>
                                                <span className="text-blue-700 font-mono">+{currencySymbol} {taxCalculation.totalTaxAmount.toFixed(2)}</span>
                                            </div>
                                            {taxCalculation.breakdown.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                                                    <span title={item.formula}>
                                                        {item.name} ({item.rate}%):
                                                    </span>
                                                    <span className="font-mono text-slate-800 font-semibold">
                                                        +{currencySymbol} {item.amount.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="my-1 py-1 px-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 font-medium flex justify-between">
                                            <span>Tax Exemption</span>
                                            <span className="font-mono">{currencySymbol} 0.00 (Exempt)</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between py-1.5 bg-blue-50/80 -mx-1 px-2 rounded border border-blue-100 text-gray-900 font-bold">
                                        <span className="text-blue-900 font-bold">Grand Total (Payable)</span>
                                        <span className="font-mono text-blue-900 font-extrabold text-sm">{currencySymbol} {finalPayable.toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between py-1 border-b border-dashed border-gray-200 text-gray-600">
                                        <span>Total Paid</span>
                                        <span className="text-emerald-700 font-mono">{currencySymbol} {totalPaid.toFixed(2)}</span>
                                    </div>

                                    <div className="flex justify-between py-1.5 text-sm text-gray-900 font-bold">
                                        <span>Total Due</span>
                                        <span className="text-rose-600 font-mono">{currencySymbol} {totalDue.toFixed(2)}</span>
                                    </div>

                                    <div className="bg-[#f8fafc] -mx-5 px-5 py-3 border-y border-gray-200 flex justify-between items-center text-sm font-bold">
                                        <span className="text-gray-700">Active Amount</span>
                                        <span className="text-[#1e3a8a] text-base font-mono">
                                            {currencySymbol} {(paymentRows[keypadTargetIndex]?.amount || 0).toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Numeric Keypad Grid */}
                                    <div className="pt-2">
                                        <p className="text-[11px] text-gray-500 mb-2 font-medium">Select an input to start or tap keypad:</p>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('1')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                1
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('2')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                2
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('3')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                3
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('CLEAR')}
                                                className="h-10 bg-red-50 text-red-700 border border-red-200 rounded text-xs hover:bg-red-100 cursor-pointer"
                                            >
                                                Clear
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('4')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                4
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('5')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                5
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('6')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                6
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('BACK')}
                                                className="h-10 bg-gray-100 text-gray-700 border border-gray-200 rounded text-sm hover:bg-gray-200 flex items-center justify-center cursor-pointer"
                                            >
                                                <Delete size={18} />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('7')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                7
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('8')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                8
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('9')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                9
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleKeypadPress('0')}
                                                className="h-10 bg-white border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                            >
                                                0
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleKeypadPress('FULL')}
                                            className="w-full mt-2 h-7 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded text-[11px] cursor-pointer"
                                        >
                                            Pay Full Due ({currencySymbol} {totalDue.toFixed(2)})
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Footer (Exact hotel-management buttons) */}
                <div className="px-6 py-3.5 border-t border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
                    <div className="text-xs text-gray-500 font-medium">
                        {step === 1 && <span>Allocated: <strong className="text-slate-800">{totalRoomsAllocatedInForm} Room(s)</strong> | Check-in: <strong className="text-blue-900">{checkIn}</strong></span>}
                    </div>

                    <div className="flex items-center gap-3">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep((step - 1) as any)}
                                className="h-9 px-5 border border-gray-300 text-blue-600 hover:bg-gray-50 rounded-md text-sm font-semibold cursor-pointer transition-colors"
                            >
                                Previous
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                type="button"
                                disabled={step === 1 && hasOverbookingError}
                                onClick={() => {
                                    if (step === 1 && hasOverbookingError) {
                                        toast.error('Cannot proceed: Selected rooms exceed available inventory!');
                                        return;
                                    }
                                    setStep((step + 1) as any);
                                }}
                                className={`h-9 px-6 rounded-md text-sm font-semibold shadow-2xs transition-colors ${
                                    step === 1 && hasOverbookingError
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-[#1e3a8a] hover:bg-blue-900 text-white cursor-pointer'
                                }`}
                                title={step === 1 && hasOverbookingError ? 'Overbooking error: Reduce room counts' : 'Next Step'}
                            >
                                Next
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleFinalizeBooking('hold')}
                                    className="h-9 px-5 border border-gray-300 text-blue-600 hover:bg-gray-50 rounded-md text-sm font-semibold cursor-pointer transition-colors"
                                >
                                    Hold Till
                                </button>
                                {checkIn === getOperatingSystemDate() && (
                                    <button
                                        type="button"
                                        onClick={() => handleFinalizeBooking('checkin')}
                                        className="h-9 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-semibold cursor-pointer shadow-2xs transition-colors"
                                    >
                                        CheckIn
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleFinalizeBooking('reserve')}
                                    className="h-9 px-6 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-md text-sm font-semibold cursor-pointer shadow-2xs transition-colors"
                                >
                                    {totalPaid > 0 ? `Confirm Booking (Paid ${currencySymbol} ${totalPaid.toLocaleString()})` : 'Save as Reserve'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Room Add-On Services Modal (All Services Bundle) */}
            {serviceModalConfig.isOpen && activeRowForService && (
                <RoomAddonServicesModal
                    isOpen={serviceModalConfig.isOpen}
                    onClose={() => setServiceModalConfig(prev => ({ ...prev, isOpen: false, rowId: null }))}
                    roomNumber={
                        activeRowForService.isAssign 
                            ? getAutoAssignedRoomsForRow(activeRowForService).join(', ') 
                            : activeRowForService.roomNumber
                    }
                    roomsCount={Number(activeRowForService.roomsCount) || 1}
                    assignedRooms={getAutoAssignedRoomsForRow(activeRowForService)}
                    roomType={activeRowForService.roomType}
                    baseRate={activeRowForService.rate}
                    nights={nights}
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
                    checkIn={checkIn}
                    checkOut={checkOut}
                    currentSelected={(() => {
                        const row = roomsList.find(r => r.id === multiRoomModal.rowId);
                        return row?.assignedRooms || (row ? getAutoAssignedRoomsForRow(row) : []);
                    })()}
                    initialRoomDatesMap={(() => {
                        const row = roomsList.find(r => r.id === multiRoomModal.rowId);
                        return row?.roomDatesMap;
                    })()}
                    onConfirm={(selected, datesMap, isAutoConfirmed) => {
                        if (multiRoomModal.rowId !== null) {
                            setRoomsList(prev => prev.map(r => {
                                if (r.id !== multiRoomModal.rowId) return r;
                                const newIsAssign = isAutoConfirmed !== undefined ? isAutoConfirmed : false;
                                return {
                                    ...r,
                                    isAssign: newIsAssign,
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
        </div>
    );
};

export default AddReservationModal;
