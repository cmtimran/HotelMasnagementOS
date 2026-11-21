import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    Ban,
    ShieldCheck,
    FileText,
    Cigarette,
    CigaretteOff
} from 'lucide-react';
import { formatIdentityDisplay } from '../../utils/identityUtils';
import { COUNTRIES_DATABASE, getCitiesForCountry, getNationalityForCountry } from '../../utils/geoData';
import { useProperty } from '../../context/PropertyContext';
import { getCurrencySymbol } from '../../utils/currencyUtils';
import { StayPeriodPicker, getSystemDateISO, getNextDayISO } from '../common/StayPeriodPicker';
import { ChildAgeSelector } from '../common/ChildAgeSelector';
import { getCanonicalGuestProfiles } from '../../utils/guestProfileEngine';
import { RoomAddonServicesModal, type ServiceTabType } from './RoomAddonServicesModal';
import { SearchableSelect } from '../common/SearchableSelect';
import { PhoneInputWithCountry } from '../common/PhoneInputWithCountry';
import { MultiRoomSelectorModal } from './MultiRoomSelectorModal';
import { HoldTillModal, type HoldTillPayload } from './HoldTillModal';
import { MoneyReceiptModal } from '../folio/modals/MoneyReceiptModal';
import {
    FinancialStatusStrip,
    PaymentTenderConsole,
    DiscountConsole,
    SettlementBreakdownCard
} from '../reservations/shared';
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
    validateRatePlanRestrictions,
    getRoomTypeCapacity,
    generateMasterReservationNumber,
    generateGroupCode,
    generateSubBookingNumber,
    generateRegistrationNumber,
    generateFolioNumber,
    getRoomSmokingPolicy,
    getHotelReservationPolicies,
    getOperatingSystemDate,
    determineBookingStatusFromPayment,
    calculateHoldCutoffTimestamp,
    holdReservationInDB
} from '../../utils/roomInventoryEngine';
import {
    calculateReservationTaxes,
    getActiveTaxConfiguration,
    getTaxConfigurations,
    type TaxCalculationResult
} from '../../utils/taxCalculationEngine';
import {
    useReservationBookingEngine,
    splitMultiRoomRow,
    addNewRoomRowHelper,
    validatePreBookingFlight
} from '../../hooks/useReservationBookingEngine';
import { toast } from '../../context/ToastContext';
import { confirmModal } from '../../context/ConfirmModalContext';

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
    packageId?: number | string;
    packageName?: string;
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
    method: 'Cash' | 'Card' | 'bKash' | 'Nagad' | 'Bank Transfer' | 'Direct Billing' | string;
    amount: number;
    reference?: string;
}

export const QuickReservationModal: React.FC<QuickReservationModalProps> = ({
    isOpen,
    onClose,
    roomInfo,
    onReserve,
    onReservationCreated
}) => {
    const { activeProperty } = useProperty();
    const currencySymbol = getCurrencySymbol(activeProperty?.currency);

    const [activeTab, setActiveTab] = useState<'reservation' | 'payment'>('reservation');

    // Options
    const [dayUse, setDayUse] = useState<boolean>(false);
    const [taxApplicable, setTaxApplicable] = useState<boolean>(true);
    const [selectedTaxConfigId, setSelectedTaxConfigId] = useState<string>(() => {
        return getActiveTaxConfiguration().id;
    });
    const availableTaxConfigs = useMemo(() => getTaxConfigurations().filter(c => c.status === 'Active'), []);

    const {
        availableRatePlans,
        availablePackages,
        calculateRoomRate,
        getPackageById,
        validateAllRoomRestrictions,
        getStayHolidaySummary,
        getOfferValue,
        resolveOfferSelection,
        validatePackageRestrictions
    } = useReservationBookingEngine();

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

    const holidaySummary = useMemo(() => {
        const totalA = roomsList.reduce((acc, r) => acc + (r.adults || 1), 0);
        const totalC = roomsList.reduce((acc, r) => acc + (r.children || 0), 0);
        return getStayHolidaySummary(checkInDate, nights, totalA, totalC);
    }, [getStayHolidaySummary, checkInDate, nights, roomsList]);

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

    // Guest Info & Polymorphic KYC
    const [title, setTitle] = useState<string>('Mr.');
    const [name, setName] = useState<string>('');
    const [mobile, setMobile] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [gender, setGender] = useState<string>('Male');
    const [nationality, setNationality] = useState<string>('Bangladeshi');
    const [homeCountry, setHomeCountry] = useState<string>('Bangladesh');
    const [homeCity, setHomeCity] = useState<string>('Dhaka');
    const [idType, setIdType] = useState<string>('National ID (NID)');
    const [idNumber, setIdNumber] = useState<string>('');
    const [dob, setDob] = useState<string>('');

    // Polymorphic Document Details
    const [passportVisaNumber, setPassportVisaNumber] = useState<string>('');
    const [passportVisaType, setPassportVisaType] = useState<string>('Tourist');
    const [passportVisaExpiry, setPassportVisaExpiry] = useState<string>('');
    const [passportEntryPort, setPassportEntryPort] = useState<string>('Hazrat Shahjalal Int Airport, Dhaka');
    const [drivingVehicleClass, setDrivingVehicleClass] = useState<string>('Light');
    const [fatherOrSpouseName, setFatherOrSpouseName] = useState<string>('');
    const [idIssueDate, setIdIssueDate] = useState<string>('');
    const [idExpiryDate, setIdExpiryDate] = useState<string>('');
    const [idIssueCountry, setIdIssueCountry] = useState<string>('Bangladesh');
    const [idIssuePlace, setIdIssuePlace] = useState<string>('');
    const [managerOverrideApproved, setManagerOverrideApproved] = useState<boolean>(false);

    // Stored & Canonical Guests for auto-complete & profile link-up (Unified single-source-of-truth with Guest Profiles)
    const allKnownGuests = useMemo(() => {
        return getCanonicalGuestProfiles();
    }, [isOpen]);

    const knownProfiles = allKnownGuests;

    // Profile Link-up State
    const [selectedGuestProfile, setSelectedGuestProfile] = useState<any | null>(null);
    const [isNameSuggestOpen, setIsNameSuggestOpen] = useState(false);
    const [isMobileSuggestOpen, setIsMobileSuggestOpen] = useState(false);
    // Memoized Select Options for Searchable Selects
    const allCountryOptions = useMemo(() => {
        return COUNTRIES_DATABASE.map(c => ({
            value: c.name,
            label: `${c.name} (${c.dialCode})`,
            subLabel: c.code
        }));
    }, []);

    const allNationalityOptions = useMemo(() => {
        return COUNTRIES_DATABASE.map(c => ({
            value: c.nationality,
            label: `${c.nationality} (${c.name})`,
            subLabel: c.code
        }));
    }, []);

    const homeCityOptions = useMemo(() => {
        const cities = getCitiesForCountry(homeCountry);
        return cities.map(c => ({ value: c, label: c }));
    }, [homeCountry]);


    // Suggestions matching typed Name
    const nameSuggestions = useMemo(() => {
        if (!name.trim() || name.length < 2 || selectedGuestProfile) return [];
        const q = String(name || '').toLowerCase().trim();
        return allKnownGuests.filter(g =>
            String(g?.name || '').toLowerCase().includes(q) ||
            (g?.phone && String(g.phone).includes(q))
        ).slice(0, 5);
    }, [name, allKnownGuests, selectedGuestProfile]);

    // Suggestions matching typed Mobile
    const mobileSuggestions = useMemo(() => {
        const cleanP = (mobile || '').replace(/[^0-9]/g, '');
        if (cleanP.length < 3 || selectedGuestProfile) return [];
        return allKnownGuests.filter(g => {
            const gp = String(g?.phone || '').replace(/[^0-9]/g, '');
            return gp.includes(cleanP);
        }).slice(0, 5);
    }, [mobile, allKnownGuests, selectedGuestProfile]);

    // Phone collision detection: Phone belongs to a different registered guest
    const phoneCollision = useMemo(() => {
        const cleanP = (mobile || '').replace(/[^0-9]/g, '');
        if (cleanP.length < 8) return null;
        const match = allKnownGuests.find(g => {
            const gp = String(g?.phone || '').replace(/[^0-9]/g, '');
            return gp.length >= 8 && (gp.endsWith(cleanP.slice(-8)) || cleanP.endsWith(gp.slice(-8)));
        });
        if (match && name.trim()) {
            const exName = String(match.name || '').toLowerCase().trim();
            const inName = String(name || '').toLowerCase().trim();
            if (!exName.includes(inName) && !inName.includes(exName)) {
                return {
                    existingGuestName: match.name,
                    existingVip: match.vipTier || 'Regular',
                    existingId: match.id,
                    matchedGuest: match
                };
            }
        }
        return null;
    }, [mobile, name, allKnownGuests]);

    const handleSelectGuestProfile = (g: any) => {
        setSelectedGuestProfile(g);
        setIsNameSuggestOpen(false);
        setIsMobileSuggestOpen(false);
        setName(g.name);
        if (g.title) setTitle(g.title.endsWith('.') ? g.title : `${g.title}.`);
        if (g.phone) setMobile(g.phone);
        if (g.email) setEmail(g.email);
        if (g.gender) setGender(g.gender);
        if (g.nationality) setNationality(g.nationality);
        if (g.homeCountry) setHomeCountry(g.homeCountry);
        if (g.homeCity) setHomeCity(g.homeCity);
        if (g.idType) setIdType(g.idType);
        if (g.idNumber) setIdNumber(g.idNumber);
        if (g.dob) setDob(g.dob);
        if (g.passportVisaNumber) setPassportVisaNumber(g.passportVisaNumber);
        if (g.passportVisaType) setPassportVisaType(g.passportVisaType);
        if (g.passportVisaExpiry) setPassportVisaExpiry(g.passportVisaExpiry);
        if (g.passportEntryPort) setPassportEntryPort(g.passportEntryPort);
        if (g.fatherOrSpouseName) setFatherOrSpouseName(g.fatherOrSpouseName);
        if (g.idIssueDate) setIdIssueDate(g.idIssueDate);
        if (g.idExpiryDate) setIdExpiryDate(g.idExpiryDate);
        if (g.idIssuePlace) setIdIssuePlace(g.idIssuePlace);
        toast.info(`Linked Guest Profile: ${g.name} (${g.vipTier || 'Regular'})`);
    };

    const handleUnlinkGuestProfile = () => {
        setSelectedGuestProfile(null);
        toast.info('Guest profile unlinked. Changes will create a new distinct guest.');
    };

    const quickBlacklistAlert = useMemo(() => {
        if (!isOpen) return null;
        const cleanP = (mobile || '').replace(/[^0-9]/g, '');
        const cleanId = String(idNumber || '').trim().toLowerCase();
        const cleanName = String(name || '').trim().toLowerCase();
        const cleanEmail = String(email || '').trim().toLowerCase();

        if (cleanP.length >= 8 || cleanId.length >= 4 || (cleanName.length >= 4 && !cleanName.includes('walk-in')) || (cleanEmail.length >= 5 && !cleanEmail.includes('guest.com'))) {
            const match = knownProfiles.find(g => {
                if (!g.isBlacklisted) return false;
                const gPhoneClean = String(g.phone || '').replace(/[^0-9]/g, '');
                const phoneMatch = Boolean(cleanP && gPhoneClean && (cleanP.endsWith(gPhoneClean.slice(-8)) || gPhoneClean.endsWith(cleanP.slice(-8))));
                const idMatch = Boolean(cleanId && g.idNumber && String(g.idNumber || '').toLowerCase() === cleanId);
                const nameMatch = Boolean(cleanName && g.name && String(g.name || '').toLowerCase() === cleanName);
                const emailMatch = Boolean(cleanEmail && g.email && String(g.email || '').toLowerCase() === cleanEmail);
                return phoneMatch || idMatch || nameMatch || emailMatch;
            });
            if (match) {
                return {
                    isBlocked: true,
                    name: match.name,
                    reason: match.blacklistReason || 'Hospitality policy / payment default',
                    by: match.blacklistedBy || 'Duty Manager',
                    at: match.blacklistedAt
                };
            }
        }
        return null;
    }, [isOpen, mobile, idNumber, name, email, knownProfiles]);

    // Payment Details
    const [discountType, setDiscountType] = useState<'Percentage' | 'Fixed'>('Fixed');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
    const [advanceReceiptToPrompt, setAdvanceReceiptToPrompt] = useState<{ payment: any; folio: any } | null>(null);

    // Track if modal was previously open to prevent reset loops while modal is open
    const prevIsOpenRef = useRef(false);

    // Initialize from roomInfo prop ONLY when modal transitions from closed to open
    useEffect(() => {
        if (!isOpen) {
            prevIsOpenRef.current = false;
            return;
        }

        // Only run initialization once when modal opens from closed state
        if (!prevIsOpenRef.current) {
            prevIsOpenRef.current = true;

            // Reset guest info for new express booking
            setName('');
            setMobile('');
            setEmail('');
            setIdNumber('');
            setPassportVisaNumber('');
            setPassportVisaExpiry('');
            setFatherOrSpouseName('');
            setIdIssueDate('');
            setIdExpiryDate('');
            setIdIssuePlace('');
            setManagerOverrideApproved(false);
            setSelectedGuestProfile(null);
            setIsNameSuggestOpen(false);
            setIsMobileSuggestOpen(false);
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
            const canonical = getCanonicalRooms().find(r => r.number === cleanRoom);
            const resolvedType = roomInfo?.roomType || canonical?.roomTypeName || 'Deluxe Double';
            const canonicalRate = roomInfo?.baseRate || canonical?.baseRate || 3000;
            const defaultPlan = availableRatePlans[0]?.name || '';
            const initialCalculatedRate = calculateRoomRate({
                roomType: resolvedType,
                ratePlan: defaultPlan,
                adults: 2,
                children: 0,
                baseRate: canonicalRate,
                nights: targetNights || 1,
                checkInDate: targetStart
            });

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
            setPaymentRows([]);
        }
    }, [isOpen, roomInfo]);


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

    // Enterprise Hold Till Modal State
    const [isHoldTillModalOpen, setIsHoldTillModalOpen] = useState(false);
    
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
                    const rowTypeLower = String(row?.roomType || '').toLowerCase();
                    const freeMatches = liveAvailabilityReport.availableRooms.filter(ar => {
                        const arTypeLower = String(ar?.roomTypeName || '').toLowerCase();
                        return !usedInForm.has(ar.number) && (
                            arTypeLower.includes(rowTypeLower) ||
                            rowTypeLower.includes(arTypeLower)
                        );
                    });
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
        const targetLower = String(typeName || '').toLowerCase();
        return liveAvailabilityReport.allRoomsStatus.filter(st => {
            const stNameLower = String(st?.room?.roomTypeName || '').toLowerCase();
            const matches = stNameLower.includes(targetLower) ||
                            targetLower.includes(stNameLower);
            return matches && st.isAvailable;
        }).length;
    };

    // Rooms of this type already allocated across ALL rows in this form
    const getAllocatedCountForType = (typeName: string): number => {
        const targetLower = String(typeName || '').toLowerCase();
        return roomsList
            .filter(r => {
                const rTypeLower = String(r?.roomType || '').toLowerCase();
                return (
                    rTypeLower.includes(targetLower) ||
                    targetLower.includes(rTypeLower)
                );
            })
            .reduce((sum, r) => sum + (Number(r.noOfRooms) || 1), 0);
    };

    // Rooms of this type allocated in OTHER rows (excluding currentItemId)
    const getAllocatedCountInOtherRows = (typeName: string, currentItemId?: number): number => {
        const targetLower = String(typeName || '').toLowerCase();
        return roomsList
            .filter(r => r.id !== currentItemId && (
                String(r?.roomType || '').toLowerCase().includes(targetLower) ||
                targetLower.includes(String(r?.roomType || '').toLowerCase())
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
            const rTypeLower = String(r?.roomType || '').toLowerCase();
            const freeForPrev = liveAvailabilityReport.availableRooms
                .filter(ar => {
                    const arTypeLower = String(ar?.roomTypeName || '').toLowerCase();
                    return (arTypeLower.includes(rTypeLower) || rTypeLower.includes(arTypeLower)) && !takenBefore.has(ar.number);
                })
                .slice(0, rCount)
                .map(ar => ar.number);
            freeForPrev.forEach(rn => takenBefore.add(rn));
        }

        const countNeeded = Number(item.noOfRooms) || 1;
        const itemTypeLower = String(item?.roomType || '').toLowerCase();
        const matchingAvailable = liveAvailabilityReport.availableRooms
            .filter(ar => {
                const arTypeLower = String(ar?.roomTypeName || '').toLowerCase();
                return (arTypeLower.includes(itemTypeLower) || itemTypeLower.includes(arTypeLower)) && !takenBefore.has(ar.number);
            })
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
    const totalGalaDinnerCharge = holidaySummary.hasGalaDinner ? holidaySummary.totalGalaFee : 0;

    const totalAllAddonsCharges = totalExtraBedCharge + totalPickupCharge + totalMealPlanCharge + totalCelebrationCharge + totalSpaCharge + totalTimingCharge + totalCustomCharge + totalGalaDinnerCharge;
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


    // Unified Rate / Package Offer Change Handler
    const handleUnifiedOfferChange = (rowId: number, offerKey: string) => {
        setRoomsList(roomsList.map(r => {
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
                const autoAssigned = getAutoAssignedRoomsForRow({ ...r, roomType: newRoomType, noOfRooms: r.noOfRooms });
                if (autoAssigned.length > 0) {
                    newRoomNumber = autoAssigned[0];
                    newAssignedRooms = autoAssigned;
                }
                toast.info(`Room category updated to "${newRoomType}" for ${resolved.packageName}`);
            }

            if (resolved.offerType === 'rate_plan') {
                const restriction = validateRatePlanRestrictions(resolved.ratePlan, nights, checkInDate, availableRatePlans);
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

    // Room handlers
    const handleAddRoom = () => {
        if (remainingOverallFreeRooms <= 0) {
            toast.error('Overbooking Prevented: No more available rooms in inventory for the selected dates!');
            return;
        }
        const result = addNewRoomRowHelper(
            roomsList,
            liveAvailabilityReport.availableRooms,
            checkInDate,
            checkOutDate,
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

    const handleRemoveRoom = (id: number) => {
        if (roomsList.length <= 1) return;
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

    const handleRoomFieldChange = <K extends keyof RoomItem>(id: number, field: K, value: RoomItem[K]) => {
        setRoomsList(roomsList.map(r => {
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
                    nights: nightMultiplier,
                    checkInDate: checkInDate
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
                const restriction = validateRatePlanRestrictions(planName, nights, checkInDate, availableRatePlans);
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
                    nights: nightMultiplier,
                    checkInDate: checkInDate
                });
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
                const newRate = calculateRoomRate({ roomType: r.roomType, ratePlan: r.ratePlan, packageId: r.packageId, adults: newAdults, children: r.children, baseRate: canonicalRate, nights: nightMultiplier, checkInDate: checkInDate });
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
                const newRate = calculateRoomRate({ roomType: r.roomType, ratePlan: r.ratePlan, packageId: r.packageId, adults: r.adults, children: newChildren, baseRate: canonicalRate, nights: nightMultiplier, checkInDate: checkInDate });
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

                const resolvedRate = calculateRoomRate({ roomType: newType, ratePlan: r.ratePlan, packageId: r.packageId, adults: clampedAdults, children: clampedChildren, baseRate: canonicalRate, nights: nightMultiplier, checkInDate: checkInDate });
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
                const newRate = calculateRoomRate({ roomType: r.roomType, ratePlan: r.ratePlan, packageId: r.packageId, adults: r.adults, children: r.children, baseRate: canonicalRate, nights: nightMultiplier, checkInDate: checkInDate });
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

    // Payment handlers (Functional & Atomic to eliminate state loss)
    const handleAddPaymentRow = () => {
        setPaymentRows(prev => {
            const nextId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1;
            const currentPaid = prev.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
            const remainingDue = Math.max(0, Number((finalPayable - currentPaid).toFixed(2)));
            return [...prev, { id: nextId, method: 'Cash', amount: remainingDue }];
        });
    };

    const handleRemovePaymentRow = (id: number) => {
        setPaymentRows(prev => prev.filter(p => p.id !== id));
    };

    const handlePaymentRowChange = (id: number, fieldOrUpdates: keyof PaymentRow | Partial<PaymentRow>, value?: any) => {
        setPaymentRows(prev => prev.map(p => {
            if (p.id !== id) return p;
            if (typeof fieldOrUpdates === 'object' && fieldOrUpdates !== null) {
                return { ...p, ...fieldOrUpdates };
            }
            return { ...p, [fieldOrUpdates as keyof PaymentRow]: value };
        }));
    };

    // Submit reservation action
    const handleCompleteReservation = async (requestedStatus: 'hold' | 'confirmed' | 'reserved' | 'stayover' | 'arrived', holdPayload?: HoldTillPayload) => {
        // Shared Pre-Commit Validation Guard
        const flightCheck = validatePreBookingFlight({
            actionType: requestedStatus === 'arrived' ? 'checkin' : requestedStatus === 'hold' ? 'hold' : 'reserve',
            checkIn: checkInDate,
            operatingDate: getOperatingSystemDate(),
            availableRatePlans,
            roomsList,
            nights,
            guestName: name,
            phone: mobile,
            hasOverbookingError,
            validateAllRestrictions: validateAllRoomRestrictions
        });

        if (!flightCheck.allowed) {
            toast.error(flightCheck.error!);
            return;
        }

        const isArrived = requestedStatus === 'arrived' || (requestedStatus as string) === 'in-house';
        const isHold = requestedStatus === 'hold';
        let status: string = requestedStatus;
        if (!isArrived && !isHold) {
            const evaluated = determineBookingStatusFromPayment(totalPaid, finalPayable, netBaseAmount);
            status = evaluated.status;
        }

        if (quickBlacklistAlert && !managerOverrideApproved) {
            toast.error('❌ CANNOT PROCEED: Guest is blacklisted. Duty Manager Override is required to continue.');
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

        // Housekeeping Cleanliness Guard on Immediate Check-in
        if (isArrived) {
            const canonicalRooms = getCanonicalRooms();
            const dirtyRooms = allocatedRoomNumbers.filter(rn => {
                const found = canonicalRooms.find(cr => cr.number === rn);
                return found && String(found.housekeepingStatus).toUpperCase() === 'DIRTY';
            });
            if (dirtyRooms.length > 0) {
                const proceed = await confirmModal({
                    title: 'Check-In to Dirty Room?',
                    message: `Room ${dirtyRooms.join(', ')} is currently marked as DIRTY by Housekeeping.\n\nAre you sure you want to proceed with check-in?`,
                    confirmText: 'Proceed Check-In',
                    variant: 'warning'
                });
                if (!proceed) return;
            }
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

        const primarySmokingPolicy = getRoomSmokingPolicy(primaryRoom);

        const subRoomsWithNumbers = assignedRoomsExpanded.map((rm, idx) => {
            const subBookingNum = isGroup ? generateSubBookingNumber(reservationNumber, idx + 1) : `${reservationNumber}-01`;
            const roomRegNo = (status === 'arrived' || (status as string) === 'in-house') ? generateRegistrationNumber(subBookingNum) : undefined;
            const roomFolioNo = generateFolioNumber(subBookingNum);
            const rmPolicy = getRoomSmokingPolicy(rm.roomNumber);
            return {
                ...rm,
                subBookingNumber: subBookingNum,
                registrationNumber: roomRegNo,
                folioNumber: roomFolioNo,
                smokingPolicy: rmPolicy.smokingStatus,
                smokingPolicyText: rmPolicy.policyBadgeText,
                smokingClause: rmPolicy.guestFacingClause
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
            guestId: selectedGuestProfile?.id,
            vip: selectedGuestProfile?.vipTier || 'None',
            phone: mobile || 'N/A',
            email: email || '',
            idType,
            idNumber,
            nationality,
            homeCountry,
            homeCity,
            dob,
            gender,
            passportVisaNumber: idType === 'Passport' ? passportVisaNumber : undefined,
            passportVisaType: idType === 'Passport' ? passportVisaType : undefined,
            passportVisaExpiry: idType === 'Passport' ? passportVisaExpiry : undefined,
            passportEntryPort: idType === 'Passport' ? passportEntryPort : undefined,
            drivingVehicleClass: idType === 'Driving License' ? drivingVehicleClass : undefined,
            fatherOrSpouseName: idType === 'National ID (NID)' ? fatherOrSpouseName : undefined,
            idIssueDate,
            idExpiryDate,
            idIssueCountry,
            idIssuePlace,
            packageId: roomsList[0]?.packageId,
            packageName: roomsList[0]?.packageName,
            roomNumber: primaryRoom,
            roomType: roomsList[0]?.roomType || 'Standard Room',
            smokingPolicy: primarySmokingPolicy.smokingStatus,
            smokingPolicyText: primarySmokingPolicy.policyBadgeText,
            smokingClause: primarySmokingPolicy.guestFacingClause,
            policies: getHotelReservationPolicies(primaryRoom),
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
            isGuaranteed: totalPaid > 0,
            holdType: status === 'hold' ? (holdPayload ? (holdPayload.holdTier === 'vip' ? 'VIP_PROTECTED' : (holdPayload.holdUntilTime === '18:00:00' ? 'SIX_PM_RELEASE' : 'CUSTOM_CUTOFF')) : 'SIX_PM_RELEASE') : undefined,
            holdUntil: status === 'hold' ? (holdPayload ? holdPayload.holdUntilISO : calculateHoldCutoffTimestamp('SIX_PM_RELEASE', checkInDate)) : undefined,
            holdStartDate: status === 'hold' ? (holdPayload?.holdStartDate || checkInDate) : undefined,
            holdEndDate: status === 'hold' ? (holdPayload?.holdEndDate || checkInDate) : undefined,
            holdUntilTime: status === 'hold' ? (holdPayload?.holdUntilTime || '18:00:00') : undefined,
            holdTier: status === 'hold' ? (holdPayload?.holdTier || 'courtesy') : undefined,
            holdReason: status === 'hold' ? (holdPayload?.holdReason || 'Tentative hold from Quick Reservation') : undefined,
            depositRequired: status === 'hold' ? (holdPayload?.depositRequired || 0) : undefined,
            noAutoRelease: status === 'hold' ? (holdPayload?.noAutoRelease || false) : undefined,
            autoRelease: status === 'hold' ? (!holdPayload?.noAutoRelease) : undefined,
            totalAmount: finalPayable,
            paidAmount: status === 'hold' ? 0 : totalPaid,
            dueAmount: status === 'hold' ? finalPayable : totalDue,
            paymentRows: paymentRows,
            advancePayments: paymentRows,
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

        // Synchronize and persist guest profile in hotel_guest_profiles_v2
        try {
            const rawProfiles = localStorage.getItem('hotel_guest_profiles_v2');
            const profiles: any[] = rawProfiles ? JSON.parse(rawProfiles) : [];
            const cleanName = (name || '').trim();
            const inputCleanEmail = (email || '').trim().toLowerCase();
            const inputCleanId = (idNumber || '').trim().toLowerCase();

            if (cleanName) {
                const existingIdx = selectedGuestProfile
                    ? profiles.findIndex(p => String(p.id) === String(selectedGuestProfile.id) || (p.name && p.name.trim().toLowerCase() === selectedGuestProfile.name.trim().toLowerCase()))
                    : profiles.findIndex(p => {
                        const nameMatch = Boolean(cleanName && p.name && p.name.trim().toLowerCase() === cleanName.toLowerCase());
                        const idMatch = Boolean(inputCleanId && p.idNumber && inputCleanId === p.idNumber.trim().toLowerCase());
                        const emailMatch = Boolean(inputCleanEmail && p.email && inputCleanEmail === p.email.trim().toLowerCase() && !inputCleanEmail.includes('guest.com'));
                        const phoneMatch = Boolean(mobile && p.phone && (mobile.replace(/[^0-9]/g, '') === p.phone.replace(/[^0-9]/g, '')));
                        if ((phoneMatch || emailMatch) && !nameMatch) return false;
                        return nameMatch || idMatch;
                    });

                const stayRecord = {
                    resNumber: reservationNumber,
                    roomNumber: primaryRoom,
                    roomType: roomsList[0]?.roomType || 'Standard Room',
                    checkIn: checkInDate,
                    checkOut: dayUse ? checkInDate : checkOutDate,
                    nights: dayUse ? 0 : nights,
                    totalAmountBDT: finalPayable,
                    status: (status === 'arrived' || (status as string) === 'in-house') ? ('In-House' as const) : ('Confirmed' as const)
                };

                if (existingIdx >= 0) {
                    profiles[existingIdx].totalStays = (profiles[existingIdx].totalStays || 0) + 1;
                    profiles[existingIdx].totalNights = (profiles[existingIdx].totalNights || 0) + (dayUse ? 1 : nights);
                    profiles[existingIdx].lifetimeSpendBDT = (profiles[existingIdx].lifetimeSpendBDT || 0) + finalPayable;
                    profiles[existingIdx].lastStayDate = checkInDate;
                    if (!profiles[existingIdx].stayHistory) profiles[existingIdx].stayHistory = [];
                    profiles[existingIdx].stayHistory.unshift(stayRecord);
                    if (email) profiles[existingIdx].email = email;
                    if (idType) profiles[existingIdx].idType = idType;
                    if (idNumber) profiles[existingIdx].idNumber = idNumber;
                    if (nationality) profiles[existingIdx].nationality = nationality;
                    if (homeCountry) profiles[existingIdx].homeCountry = homeCountry;
                    if (homeCity) profiles[existingIdx].homeCity = homeCity;
                    if (passportVisaNumber) profiles[existingIdx].passportVisaNumber = passportVisaNumber;
                    if (passportVisaType) profiles[existingIdx].passportVisaType = passportVisaType;
                    if (passportVisaExpiry) profiles[existingIdx].passportVisaExpiry = passportVisaExpiry;
                    if (passportEntryPort) profiles[existingIdx].passportEntryPort = passportEntryPort;
                    if (drivingVehicleClass) profiles[existingIdx].drivingVehicleClass = drivingVehicleClass;
                    if (fatherOrSpouseName) profiles[existingIdx].fatherOrSpouseName = fatherOrSpouseName;
                    if (idIssueDate) profiles[existingIdx].idIssueDate = idIssueDate;
                    if (idExpiryDate) profiles[existingIdx].idExpiryDate = idExpiryDate;
                    if (idIssueCountry) profiles[existingIdx].idIssueCountry = idIssueCountry;
                    if (idIssuePlace) profiles[existingIdx].idIssuePlace = idIssuePlace;
                } else {
                    profiles.unshift({
                        id: Date.now(),
                        title: title || 'Mr.',
                        name: cleanName,
                        phone: mobile || '',
                        email: email || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@guest.com`,
                        vipTier: 'Regular',
                        nationality: nationality || 'Bangladeshi',
                        idType: idType || 'National ID (NID)',
                        idNumber: idNumber || `KYC-${Math.floor(10000 + Math.random() * 90000)}`,
                        dob: dob || '1990-01-01',
                        gender: gender || 'Male',
                        homeCity: homeCity || 'Dhaka',
                        homeCountry: homeCountry || 'Bangladesh',
                        address: '',
                        postalCode: '',
                        company: '',
                        designation: '',
                        passportVisaNumber: idType === 'Passport' ? passportVisaNumber : undefined,
                        passportVisaType: idType === 'Passport' ? passportVisaType : undefined,
                        passportVisaExpiry: idType === 'Passport' ? passportVisaExpiry : undefined,
                        passportEntryPort: idType === 'Passport' ? passportEntryPort : undefined,
                        drivingVehicleClass: idType === 'Driving License' ? drivingVehicleClass : undefined,
                        fatherOrSpouseName: idType === 'National ID (NID)' ? fatherOrSpouseName : undefined,
                        idIssueDate,
                        idExpiryDate,
                        idIssueCountry,
                        idIssuePlace,
                        totalStays: 1,
                        totalNights: dayUse ? 1 : nights,
                        lifetimeSpendBDT: finalPayable,
                        lastStayDate: checkInDate,
                        loyaltyPoints: Math.round(finalPayable / 20),
                        stayHistory: [stayRecord]
                    });
                }
                localStorage.setItem('hotel_guest_profiles_v2', JSON.stringify(profiles));
            }
        } catch (e) {
            console.error('Error synchronizing guest profile:', e);
        }

        // Persist to holds list and Database
        if (status === 'hold') {
            try {
                const holdsExisting = localStorage.getItem('hotel_holds_v2');
                const holdsList = holdsExisting ? JSON.parse(holdsExisting) : [];
                holdsList.unshift({
                    id: Date.now(),
                    reservationNumber: newRecord.reservationNumber,
                    guestName: newRecord.guestName,
                    status: 'Hold',
                    holdStartDate: holdPayload?.holdStartDate || checkInDate,
                    holdEndDate: holdPayload?.holdEndDate || checkInDate,
                    holdUntilTime: holdPayload?.holdUntilTime || '18:00:00',
                    holdTier: holdPayload?.holdTier || 'courtesy',
                    reason: holdPayload?.holdReason || 'Tentative hold from Quick Reservation',
                    reservationDate: new Date().toISOString().split('T')[0],
                    checkInDate: checkInDate,
                    checkOutDate: checkOutDate,
                    roomType: roomsList[0]?.roomType || 'Standard Room',
                    estimatedAmount: finalPayable,
                    depositRequiredBDT: holdPayload?.depositRequired || 0
                });
                localStorage.setItem('hotel_holds_v2', JSON.stringify(holdsList));
            } catch (e) {
                console.error(e);
            }

            // Sync with backend API
            holdReservationInDB(
                newRecord.reservationNumber,
                holdPayload?.holdStartDate || checkInDate,
                holdPayload?.holdEndDate || checkInDate,
                holdPayload?.holdReason || 'Tentative hold from Quick Reservation',
                {
                    holdUntil: holdPayload ? holdPayload.holdUntilISO : `${checkInDate}T18:00:00`,
                    holdType: holdPayload ? (holdPayload.holdTier === 'vip' ? 'VIP_PROTECTED' : (holdPayload.holdUntilTime === '18:00:00' ? 'SIX_PM_RELEASE' : 'CUSTOM_CUTOFF')) : 'SIX_PM_RELEASE',
                    depositRequired: holdPayload?.depositRequired || 0,
                    autoRelease: !holdPayload?.noAutoRelease
                }
            );
        }

        toast.success(
            status === 'hold' 
                ? `Reservation ${newRecord.reservationNumber} placed on Hold!` 
                : status === 'arrived' 
                    ? `Guest checked in immediately to Room ${primaryRoom}!` 
                    : status === 'confirmed'
                        ? `Reservation ${newRecord.reservationNumber} confirmed successfully (Paid: ${currencySymbol} ${totalPaid.toLocaleString()})!`
                        : `Reservation ${newRecord.reservationNumber} saved as Reserve (Non-Guaranteed)!`
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

        // Real-Time Auto-Prompt: If Advance Deposit was paid, immediately prompt Advance Deposit Receipt
        if (totalPaid > 0) {
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const seqNo = String(Math.floor(1000 + Math.random() * 9000));
            const advanceReceiptNo = `AR-${dateStr}-${seqNo}`;

            const advancePaymentObj = {
                id: Date.now(),
                payment_number: advanceReceiptNo,
                payment_method: paymentRows[0]?.method || 'Cash',
                amount: totalPaid,
                reference_code: paymentRows[0]?.reference || '',
                transaction_date: now.toISOString(),
                status: 'Settled',
                user: 'Front Desk',
                isAdvance: true
            };

            const folioStub: any = {
                id: newRecord.folioNumber || `FOL-${newRecord.reservationNumber}`,
                folio_number: newRecord.folioNumber || `FN~${newRecord.reservationNumber}`,
                guest_name: guestDisplayName,
                room_number: primaryRoom,
                room_type: roomsList[0]?.roomType || 'Standard Room',
                reservation_number: newRecord.reservationNumber
            };

            setAdvanceReceiptToPrompt({
                payment: advancePaymentObj,
                folio: folioStub
            });
            return;
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
                            2. Billing &amp; Payments
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
                                                const targetNights = dayUse ? 0 : newNights;
                                                if (dayUse) {
                                                    setCheckOutDate(newIn);
                                                    setNights(0);
                                                } else {
                                                    setCheckOutDate(newOut);
                                                    setNights(newNights);
                                                }
                                                // Dynamic Holiday & Peak Tariff Recalculation across all room rows
                                                setRoomsList(prev => prev.map(r => {
                                                    const canonicalRoom = getCanonicalRooms().find(cr => cr.number === r.roomNumber);
                                                    const dynamicTypes = getDynamicRoomTypes();
                                                    const matchedType = dynamicTypes.find(t => t.name === r.roomType);
                                                    const canonicalRate = canonicalRoom?.baseRate || matchedType?.baseRate || r.rate || 3000;
                                                    const recalcedRate = calculateRoomRate({
                                                        roomType: r.roomType,
                                                        ratePlan: r.ratePlan,
                                                        packageId: r.packageId,
                                                        adults: r.adults,
                                                        children: r.children,
                                                        baseRate: canonicalRate,
                                                        nights: targetNights || 1,
                                                        checkInDate: newIn
                                                    });
                                                    return {
                                                        ...r,
                                                        rate: recalcedRate
                                                    };
                                                }));
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

                                {/* Active Holiday & Festive Surge Alert Banner */}
                                {holidaySummary.hasHoliday && (
                                    <div className={`p-2.5 rounded-lg text-xs flex flex-wrap items-center justify-between gap-2 border transition-all ${holidaySummary.hasSurge
                                        ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-950 shadow-2xs'
                                        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-950 shadow-2xs'
                                    }`}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-base select-none">🎉</span>
                                            <div>
                                                <span className="font-bold">{holidaySummary.activeHolidays.join(', ')}</span>
                                                {holidaySummary.hasSurge && (
                                                    <span className="ml-2 text-[10.5px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded">
                                                        ⚡ +{Math.round((holidaySummary.maxMultiplier - 1) * 100)}% Peak Surge Active
                                                    </span>
                                                )}
                                                {holidaySummary.hasGalaDinner && (
                                                    <span className="ml-2 text-[10.5px] font-bold text-fuchsia-800 bg-fuchsia-100/90 border border-fuchsia-300 px-1.5 py-0.5 rounded">
                                                        🍽️ Mandatory Gala Dinner Included
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {holidaySummary.isMlosViolated && (
                                            <span className="text-[11px] font-bold text-rose-800 bg-rose-100/90 border border-rose-300 px-2 py-0.5 rounded flex items-center gap-1">
                                                <span>⚠️</span>
                                                <span>Min {holidaySummary.mlosRequiredNights} Nights Stay Policy Required</span>
                                            </span>
                                        )}
                                    </div>
                                )}

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



                                <div className="overflow-x-hidden">
                                    <table className="w-full text-left border-collapse text-[11px] table-auto">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                                                <th className="py-2 px-2.5 min-w-[120px]">Room Type</th>
                                                <th className="py-2 px-1 text-center w-11">Qty</th>
                                                <th className="py-2 px-2 min-w-[145px] max-w-[185px]">Rate / Package Offer</th>
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
                                                                            {typeOpt} [{Math.max(0, availForRow)}]
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
                                                                            +{currencySymbol}{addonsCost.toLocaleString()}
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
                                                            {(() => {
                                                                const currentOfferVal = getOfferValue(item);

                                                                return (
                                                                    <select
                                                                        value={currentOfferVal}
                                                                        onChange={e => handleUnifiedOfferChange(item.id, e.target.value)}
                                                                        className="w-full min-w-[145px] max-w-[185px] h-7 px-1.5 border border-slate-200 rounded text-[11px] bg-white outline-none cursor-pointer font-medium text-slate-800"
                                                                        title="Select Rate Plan or Bundled Stay Package"
                                                                    >
                                                                        <optgroup label="── 📋 Standard Direct Rate ──">
                                                                            <option value="direct:Direct Standard Room Rate (Rack Rate)">
                                                                                🏷️ Direct Standard Room Rate (Rack Rate)
                                                                            </option>
                                                                        </optgroup>

                                                                        {availableRatePlans.length > 0 && (
                                                                            <optgroup label="── 🏷️ Rate Plans ──">
                                                                                {availableRatePlans.map((p: any) => {
                                                                                    const isPlanDisabled = p.status === 'Inactive' || p.stopSell;
                                                                                    const badge = p.status === 'Inactive' ? ' (Inactive)' : p.stopSell ? ' (Stop Sell)' : '';
                                                                                    return (
                                                                                        <option key={`plan:${p.name}`} value={`plan:${p.name}`} disabled={isPlanDisabled}>
                                                                                            🏷️ {p.name}{badge}
                                                                                        </option>
                                                                                    );
                                                                                })}
                                                                            </optgroup>
                                                                        )}

                                                                        {availablePackages.filter(p => {
                                                                            if (p.status && p.status !== 'Active') return false;
                                                                            const applicable = p.roomConfig?.applicableRoomTypes;
                                                                            if (!applicable || !Array.isArray(applicable) || applicable.length === 0) return true;
                                                                            return applicable.some((t: any) => String(t || '').toLowerCase() === 'all' || String(t || '').toLowerCase() === String(item?.roomType || '').toLowerCase());
                                                                        }).length > 0 && (
                                                                            <optgroup label="── 🎁 Bundled Packages ──">
                                                                                {availablePackages
                                                                                    .filter(p => {
                                                                                        if (p.status && p.status !== 'Active') return false;
                                                                                        const applicable = p.roomConfig?.applicableRoomTypes;
                                                                                        if (!applicable || !Array.isArray(applicable) || applicable.length === 0) return true;
                                                                                        return applicable.some((t: any) => String(t || '').toLowerCase() === 'all' || String(t || '').toLowerCase() === String(item?.roomType || '').toLowerCase());
                                                                                    })
                                                                                    .map(p => {
                                                                                        const surchargeText = p.finance?.baseSurcharge ? ` (+${currencySymbol}${p.finance.baseSurcharge})` : '';
                                                                                        return (
                                                                                            <option key={`pkg:${p.id}`} value={`pkg:${p.id}`}>
                                                                                                🎁 {p.name}{surchargeText}
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
                                                                <div className="flex flex-col items-center">
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
                                                                            const itemTypeLower = String(item?.roomType || '').toLowerCase();
                                                                            const matchingStatus = liveAvailabilityReport.allRoomsStatus.filter(st => {
                                                                                const stNameLower = String(st?.room?.roomTypeName || '').toLowerCase();
                                                                                return stNameLower.includes(itemTypeLower) || itemTypeLower.includes(stNameLower);
                                                                            });
                                                                            const listToDisplay = matchingStatus.length > 0 ? matchingStatus : liveAvailabilityReport.allRoomsStatus;

                                                                            return listToDisplay.map(st => {
                                                                                const isUsedInOther = otherRowsRooms.has(st.room.number);
                                                                                const isAvail = st.isAvailable && !isUsedInOther;
                                                                                let tag = 'Free';
                                                                                if (isUsedInOther) tag = 'In Form';
                                                                                else if (!st.isAvailable) tag = 'Booked';

                                                                                const pol = getRoomSmokingPolicy(st.room.number);
                                                                                const smokeSymbol = pol.smokingStatus === 'Smoking' ? ' 🚬' : (pol.smokingStatus === 'Balcony Smoking Only' ? ' 🚬' : '');
                                                                                return (
                                                                                    <option
                                                                                        key={st.room.number}
                                                                                        value={st.room.number}
                                                                                        disabled={!isAvail && item.roomNumber !== st.room.number}
                                                                                    >
                                                                                        {st.room.number}{smokeSymbol} ({tag})
                                                                                    </option>
                                                                                );
                                                                            });
                                                                        })()}
                                                                    </select>
                                                                    {(() => {
                                                                        const pol = getRoomSmokingPolicy(item.roomNumber);
                                                                        return (
                                                                            <span
                                                                                className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[7.5px] font-bold mt-0.5 shadow-2xs ${
                                                                                    pol.smokingStatus === 'Smoking'
                                                                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                                                                        : pol.smokingStatus === 'Balcony Smoking Only'
                                                                                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                                                                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                                                }`}
                                                                                title={pol.guestFacingClause}
                                                                            >
                                                                                {pol.smokingStatus === 'Smoking' || pol.smokingStatus === 'Balcony Smoking Only' ? <Cigarette size={8} /> : <CigaretteOff size={8} />}
                                                                                <span>{pol.policyBadgeText}</span>
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>
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
                                                            <div>{currencySymbol}{lineTotal.toLocaleString()}</div>
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

                            <button
                                type="button"
                                onClick={handleAddRoom}
                                className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md shadow-2xs cursor-pointer inline-flex items-center gap-1 transition-colors"
                            >
                                + Add Room
                            </button>

                            {/* Guest Quick Info & KYC Verification */}
                            <div className="bg-slate-50/50 border border-slate-200/90 rounded-lg p-3 shadow-2xs space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] text-slate-700 uppercase tracking-wider m-0 font-bold">
                                        Guest Profile &amp; KYC Verification
                                    </h3>
                                    {quickBlacklistAlert && (
                                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded border border-red-300 flex items-center gap-1">
                                            <Ban size={11} /> Blacklisted Guest Alert
                                        </span>
                                    )}
                                </div>

                                {/* Blacklist Alert Banner */}
                                {quickBlacklistAlert && (
                                    <div className="p-2.5 bg-red-50 border-2 border-red-500 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in">
                                        <div className="flex items-start gap-2">
                                            <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                                <Ban size={15} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-red-900 text-[11px] uppercase">⚠️ Blocked Guest: {quickBlacklistAlert.name}</span>
                                                </div>
                                                <p className="text-[10px] text-red-700 font-medium m-0">
                                                    <strong>Incident:</strong> {quickBlacklistAlert.reason}
                                                </p>
                                                <p className="text-[9.5px] text-red-600 m-0">
                                                    Authorizer: {quickBlacklistAlert.by} {quickBlacklistAlert.at ? `(${new Date(quickBlacklistAlert.at).toLocaleDateString()})` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-white/90 p-1.5 rounded border border-red-300 shrink-0 shadow-2xs">
                                            <input
                                                type="checkbox"
                                                id="quickManagerOverride"
                                                checked={managerOverrideApproved}
                                                onChange={e => setManagerOverrideApproved(e.target.checked)}
                                                className="w-3.5 h-3.5 text-red-600 rounded border-red-300 focus:ring-red-500 cursor-pointer"
                                            />
                                            <label htmlFor="quickManagerOverride" className="text-[10px] font-bold text-red-900 cursor-pointer select-none">
                                                Duty Manager Override
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Guest Profile Link-Up Status Banner */}
                                {selectedGuestProfile && (
                                    <div className="bg-blue-50/90 border border-blue-200 rounded-md p-2 flex items-center justify-between gap-2 animate-in fade-in">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-full bg-[#1e3a8a] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                {selectedGuestProfile.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[11px] font-bold text-slate-900">
                                                    Linked Profile: {selectedGuestProfile.title} {selectedGuestProfile.name}
                                                </span>
                                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-100 text-purple-800 border border-purple-200 font-semibold">
                                                    {selectedGuestProfile.vipTier || 'Regular'}
                                                </span>
                                                {selectedGuestProfile.company && (
                                                    <span className="text-[9.5px] text-slate-500">
                                                        ({selectedGuestProfile.company})
                                                    </span>
                                                )}
                                                {selectedGuestProfile.totalStays > 0 && (
                                                    <span className="text-[9.5px] text-emerald-700 font-medium">
                                                        • {selectedGuestProfile.totalStays} Stay{selectedGuestProfile.totalStays > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleUnlinkGuestProfile}
                                            className="text-[10px] text-red-600 hover:text-red-800 font-semibold cursor-pointer underline flex-shrink-0"
                                        >
                                            Unlink / New Guest
                                        </button>
                                    </div>
                                )}

                                {/* Phone Collision Indicator */}
                                {phoneCollision && !selectedGuestProfile && (
                                    <div className="bg-amber-50/90 border border-amber-200 rounded-md p-2 flex items-center justify-between gap-2 text-[10.5px] text-amber-900 animate-in fade-in">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-bold">⚠️ Phone Shared:</span>
                                            <span className="truncate">Registered to <strong>{phoneCollision.existingGuestName}</strong> ({phoneCollision.existingVip}). Will create a new profile for <strong>{name || 'this guest'}</strong>.</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (phoneCollision.matchedGuest) handleSelectGuestProfile(phoneCollision.matchedGuest);
                                            }}
                                            className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-semibold border border-amber-300 cursor-pointer flex-shrink-0"
                                        >
                                            Link to {phoneCollision.existingGuestName.split(' ')[0]} ↵
                                        </button>
                                    </div>
                                )}

                                {/* Row 1: Legal Name (Title + Name) [2 cols] | Mobile No. [1 col] | Email [1 col] */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 min-w-0">
                                    {/* Full Legal Name (Col 1 & 2) */}
                                    <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
                                        <label className="text-[10px] font-semibold text-slate-600 flex items-center justify-between">
                                            <span>Full Legal Name <span className="text-red-500">*</span></span>
                                            {nameSuggestions.length > 0 && isNameSuggestOpen && (
                                                <span className="text-[9px] text-blue-600 font-semibold">Found {nameSuggestions.length} profile{nameSuggestions.length > 1 ? 's' : ''}</span>
                                            )}
                                        </label>
                                        <div className="flex gap-1.5 min-w-0">
                                            <select
                                                value={title}
                                                onChange={e => setTitle(e.target.value)}
                                                className="w-16 h-7.5 px-1.5 border border-slate-200 rounded-md text-[11px] bg-slate-50 hover:bg-slate-100 outline-none focus:border-blue-500 shrink-0 cursor-pointer font-medium text-slate-700"
                                            >
                                                <option value="Mr.">Mr.</option>
                                                <option value="Mrs.">Mrs.</option>
                                                <option value="Ms.">Ms.</option>
                                                <option value="Dr.">Dr.</option>
                                                <option value="Prof.">Prof.</option>
                                            </select>
                                            <div className="relative flex-1 min-w-0">
                                                <input
                                                    type="search"
                                                    name="quick_gst_name_srch"
                                                    autoComplete="one-time-code"
                                                    autoCorrect="off"
                                                    autoCapitalize="off"
                                                    spellCheck={false}
                                                    role="combobox"
                                                    aria-autocomplete="list"
                                                    aria-expanded={isNameSuggestOpen && nameSuggestions.length > 0}
                                                    data-lpignore="true"
                                                    data-1p-ignore="true"
                                                    data-form-type="other"
                                                    placeholder="Guest full name..."
                                                    value={name}
                                                    readOnly
                                                    onFocus={(e) => {
                                                        e.currentTarget.readOnly = false;
                                                        setIsNameSuggestOpen(true);
                                                    }}
                                                    onPointerDown={(e) => {
                                                        e.currentTarget.readOnly = false;
                                                    }}
                                                    onChange={e => {
                                                        setName(e.target.value);
                                                        setIsNameSuggestOpen(true);
                                                        if (selectedGuestProfile && e.target.value !== selectedGuestProfile.name) {
                                                            setSelectedGuestProfile(null);
                                                        }
                                                    }}
                                                    onBlur={() => setTimeout(() => setIsNameSuggestOpen(false), 250)}
                                                    className="w-full min-w-0 h-7.5 px-2.5 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500 font-medium [&::-webkit-search-decoration]:hidden [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
                                                />

                                                {/* Inline Name Suggestions Dropdown */}
                                                {isNameSuggestOpen && nameSuggestions.length > 0 && (
                                                    <div className="absolute left-0 top-full mt-1 w-[380px] max-w-[90vw] bg-white border border-slate-200 rounded-lg shadow-2xl z-[100] max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                                                        <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                                                            <span>Returning Guests ({nameSuggestions.length})</span>
                                                            <span className="text-[9px] text-blue-600 font-medium">Select to auto-fill</span>
                                                        </div>
                                                        {nameSuggestions.map(g => (
                                                            <div
                                                                key={g.id}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    handleSelectGuestProfile(g);
                                                                }}
                                                                className="p-2.5 hover:bg-blue-50/80 transition-colors cursor-pointer flex items-center justify-between gap-2.5"
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="w-7 h-7 rounded-full bg-[#1e3a8a] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-2xs">
                                                                        {String(g?.name || 'G').slice(0, 2).toUpperCase()}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="font-bold text-slate-900 text-[11.5px] truncate">
                                                                                {g?.title && !String(g?.name || '').toLowerCase().startsWith(String(g?.title || '').toLowerCase()) ? `${g.title} ` : ''}{g?.name}
                                                                            </span>
                                                                            <span className="px-1.5 py-0.2 rounded text-[8.5px] bg-purple-100 text-purple-800 border border-purple-200 font-semibold">
                                                                                {g.vipTier || 'Regular'}
                                                                            </span>
                                                                            {g.company && (
                                                                                <span className="text-[9.5px] text-slate-500 truncate">
                                                                                    ({g.company})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5 whitespace-nowrap">
                                                                            <span className="text-slate-800 font-bold">📞 {g.phone}</span>
                                                                            {g.email && <span className="truncate max-w-[130px]">✉️ {g.email}</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] font-semibold text-blue-600 shrink-0">
                                                                    Link Profile ↵
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mobile input with Auto-Suggest Dropdown (Col 3) */}
                                    <div className="relative flex flex-col gap-1 min-w-0">
                                        <label className="text-[10px] font-semibold text-slate-600 flex items-center justify-between">
                                            <span>Mobile No. <span className="text-red-500">*</span></span>
                                            {mobileSuggestions.length > 0 && isMobileSuggestOpen && (
                                                <span className="text-[9px] text-blue-600 font-semibold">Found {mobileSuggestions.length} profile{mobileSuggestions.length > 1 ? 's' : ''}</span>
                                            )}
                                        </label>
                                        <PhoneInputWithCountry
                                            compact={true}
                                            value={mobile}
                                            onChange={(val) => {
                                                setMobile(val);
                                                setIsMobileSuggestOpen(true);
                                            }}
                                            onFocus={() => setIsMobileSuggestOpen(true)}
                                            onBlur={() => setTimeout(() => setIsMobileSuggestOpen(false), 250)}
                                            placeholder="1712-345678"
                                            required
                                        >
                                            {/* Inline Mobile Suggestions Dropdown */}
                                            {isMobileSuggestOpen && mobileSuggestions.length > 0 && (
                                                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 w-[380px] max-w-[90vw] bg-white border border-slate-200 rounded-lg shadow-2xl z-[100] max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                                                    <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                                                        <span>Matching Phone Profiles ({mobileSuggestions.length})</span>
                                                        <span className="text-[9px] text-blue-600 font-medium">Select to auto-fill</span>
                                                    </div>
                                                    {mobileSuggestions.map(g => (
                                                        <div
                                                            key={g.id}
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                handleSelectGuestProfile(g);
                                                            }}
                                                            className="p-2.5 hover:bg-blue-50/80 transition-colors cursor-pointer flex items-center justify-between gap-2.5"
                                                        >
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="w-7 h-7 rounded-full bg-[#1e3a8a] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-2xs">
                                                                    {String(g?.name || 'G').slice(0, 2).toUpperCase()}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="font-bold text-slate-900 text-[11.5px] truncate">
                                                                            {g?.title && !String(g?.name || '').toLowerCase().startsWith(String(g?.title || '').toLowerCase()) ? `${g.title} ` : ''}{g?.name}
                                                                        </span>
                                                                        <span className="px-1.5 py-0.2 rounded text-[8.5px] bg-purple-100 text-purple-800 border border-purple-200 font-semibold">
                                                                            {g.vipTier || 'Regular'}
                                                                        </span>
                                                                        {g.company && (
                                                                            <span className="text-[9.5px] text-slate-500 truncate">
                                                                                ({g.company})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5 whitespace-nowrap">
                                                                        <span className="text-slate-800 font-bold">📞 {g.phone}</span>
                                                                        {g.email && <span className="truncate max-w-[130px]">✉️ {g.email}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] font-semibold text-blue-600 shrink-0">
                                                                Link Profile ↵
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </PhoneInputWithCountry>
                                    </div>

                                    {/* Email (Col 4) */}
                                    <div className="flex flex-col gap-1 min-w-0">
                                        <label className="text-[10px] font-semibold text-slate-600">Email Address</label>
                                        <input
                                            type="email"
                                            placeholder="guest@example.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full min-w-0 h-7.5 px-2.5 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Nationality | Country of Residence | City / District | Gender (4 Columns) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2.5 border-t border-slate-200/60 min-w-0">
                                    <div className="flex flex-col gap-1 min-w-0">
                                        <label className="text-[10px] font-semibold text-slate-600">Nationality</label>
                                        <SearchableSelect
                                            options={allNationalityOptions}
                                            value={nationality}
                                            onChange={(val) => setNationality(val)}
                                            placeholder="Select nationality..."
                                            compact={true}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1 min-w-0">
                                        <label className="text-[10px] font-semibold text-slate-600">Country of Residence</label>
                                        <SearchableSelect
                                            options={allCountryOptions}
                                            value={homeCountry}
                                            onChange={(newCountry) => {
                                                setHomeCountry(newCountry);
                                                const cities = getCitiesForCountry(newCountry);
                                                if (cities.length > 0) setHomeCity(cities[0]);
                                                else setHomeCity('');
                                                const nat = getNationalityForCountry(newCountry);
                                                if (nat && (!nationality || nationality === 'Bangladeshi')) setNationality(nat);
                                            }}
                                            placeholder="Select country..."
                                            compact={true}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1 min-w-0">
                                        <label className="text-[10px] font-semibold text-slate-600">City / District</label>
                                        <SearchableSelect
                                            options={homeCityOptions}
                                            value={homeCity}
                                            onChange={(val) => setHomeCity(val)}
                                            placeholder="City / District..."
                                            allowCustom={true}
                                            compact={true}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1 min-w-0">
                                        <label className="text-[10px] font-semibold text-slate-600">Gender</label>
                                        <select
                                            value={gender}
                                            onChange={e => setGender(e.target.value)}
                                            className="w-full min-w-0 h-7.5 px-2 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500 cursor-pointer"
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 3: Date of Birth | ID Document Type | Identification Number (4 Columns: 1 + 1 + 2) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2.5 border-t border-slate-200/60 min-w-0">
                                    <div className="flex flex-col gap-1 min-w-0">
                                        <label className="text-[10px] font-semibold text-slate-600">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={dob}
                                            onChange={e => setDob(e.target.value)}
                                            className="w-full min-w-0 h-7.5 px-2 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1 min-w-0">
                                        <label className="text-[10px] font-semibold text-slate-600">ID Document Type</label>
                                        <select
                                            value={idType}
                                            onChange={e => {
                                                const next = e.target.value;
                                                setIdType(next);
                                                if (idNumber) setIdNumber(formatIdentityDisplay(idNumber, next));
                                            }}
                                            className="w-full min-w-0 h-7.5 px-2 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500 cursor-pointer font-medium"
                                        >
                                            <option value="National ID (NID)">National ID (NID)</option>
                                            <option value="Passport">Passport</option>
                                            <option value="Driving License">Driving License</option>
                                            <option value="Diplomatic ID">Diplomatic ID</option>
                                            <option value="Birth Certificate">Birth Certificate</option>
                                        </select>
                                    </div>

                                    <div className="md:col-span-2 flex flex-col gap-1 min-w-0">
                                        <label className="text-[10px] font-semibold text-slate-600">
                                            {idType === 'Passport' ? 'Passport Number' : idType === 'Driving License' ? 'Driving License #' : idType === 'Diplomatic ID' ? 'Diplomatic ID #' : 'National ID (NID) Number'}
                                        </label>
                                        <input
                                            type="text"
                                            placeholder={idType === 'Passport' ? 'e.g. A01234567' : idType === 'National ID (NID)' ? 'e.g. 550 123 4567' : 'Document number...'}
                                            value={idNumber}
                                            onChange={e => setIdNumber(e.target.value)}
                                            onBlur={e => setIdNumber(formatIdentityDisplay(e.target.value, idType))}
                                            className="w-full min-w-0 h-7.5 px-2.5 border border-slate-200 rounded-md text-[11px] bg-white outline-none focus:border-blue-500 font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Dynamic Polymorphic Fields for Quick Reservation */}
                                {idType === 'Passport' && (
                                    <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2 mt-1">
                                        <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[10.5px]">
                                            <FileText size={12} className="text-blue-700" />
                                            <span>Passport &amp; Visa Verification</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[9.5px] font-semibold text-slate-700">Issuing Country</label>
                                                <SearchableSelect
                                                    options={allCountryOptions}
                                                    value={idIssueCountry}
                                                    onChange={(val) => setIdIssueCountry(val)}
                                                    placeholder="Issuing Country..."
                                                    compact={true}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[9.5px] font-semibold text-slate-700">Passport Expiry</label>
                                                <input
                                                    type="date"
                                                    value={idExpiryDate}
                                                    onChange={e => setIdExpiryDate(e.target.value)}
                                                    className="w-full h-7 px-2 border border-slate-200 rounded text-[10.5px] bg-white outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[9.5px] font-semibold text-slate-700">Visa Number</label>
                                                <input
                                                    type="text"
                                                    placeholder="Visa #"
                                                    value={passportVisaNumber}
                                                    onChange={e => setPassportVisaNumber(e.target.value)}
                                                    className="w-full h-7 px-2 border border-slate-200 rounded text-[10.5px] outline-none font-mono"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[9.5px] font-semibold text-slate-700">Visa Type</label>
                                                <select
                                                    value={passportVisaType}
                                                    onChange={e => setPassportVisaType(e.target.value)}
                                                    className="w-full h-7 px-1.5 border border-slate-200 rounded text-[10.5px] bg-white outline-none cursor-pointer"
                                                >
                                                    <option value="Tourist">Tourist</option>
                                                    <option value="Business">Business</option>
                                                    <option value="Employment">Employment</option>
                                                    <option value="On-Arrival">On-Arrival</option>
                                                    <option value="Diplomatic">Diplomatic</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-0.5 sm:col-span-2">
                                                <label className="text-[9.5px] font-semibold text-slate-700">Port of Entry</label>
                                                <input
                                                    type="text"
                                                    placeholder="Hazrat Shahjalal Int Airport, Dhaka"
                                                    value={passportEntryPort}
                                                    onChange={e => setPassportEntryPort(e.target.value)}
                                                    className="w-full h-7 px-2 border border-slate-200 rounded text-[10.5px] outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-0.5 sm:col-span-2">
                                                <label className="text-[9.5px] font-semibold text-slate-700">Visa Expiry Date</label>
                                                <input
                                                    type="date"
                                                    value={passportVisaExpiry}
                                                    onChange={e => setPassportVisaExpiry(e.target.value)}
                                                    className="w-full h-7 px-2 border border-slate-200 rounded text-[10.5px] bg-white outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {idType === 'National ID (NID)' && (
                                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2 mt-1">
                                        <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[10.5px]">
                                            <ShieldCheck size={12} className="text-emerald-700" />
                                            <span>NID Identity Verification</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[9.5px] font-semibold text-slate-700">Father's / Spouse's Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="As per NID..."
                                                    value={fatherOrSpouseName}
                                                    onChange={e => setFatherOrSpouseName(e.target.value)}
                                                    className="w-full h-7 px-2 border border-slate-200 rounded text-[10.5px] outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[9.5px] font-semibold text-slate-700">Date of Issue</label>
                                                <input
                                                    type="date"
                                                    value={idIssueDate}
                                                    onChange={e => setIdIssueDate(e.target.value)}
                                                    className="w-full h-7 px-2 border border-slate-200 rounded text-[10.5px] bg-white outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[9.5px] font-semibold text-slate-700">Issue District</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Dhaka"
                                                    value={idIssuePlace}
                                                    onChange={e => setIdIssuePlace(e.target.value)}
                                                    className="w-full h-7 px-2 border border-slate-200 rounded text-[10.5px] outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {idType === 'Driving License' && (
                                    <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-lg space-y-2 mt-1">
                                        <div className="flex items-center gap-1.5 text-purple-900 font-bold text-[10.5px]">
                                            <Car size={12} className="text-purple-700" />
                                            <span>Driving License Information</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[9.5px] font-semibold text-slate-700">Vehicle Class</label>
                                                <select
                                                    value={drivingVehicleClass}
                                                    onChange={e => setDrivingVehicleClass(e.target.value)}
                                                    className="w-full h-7 px-1.5 border border-slate-200 rounded text-[10.5px] bg-white outline-none cursor-pointer"
                                                >
                                                    <option value="Light">Light</option>
                                                    <option value="Medium">Medium</option>
                                                    <option value="Heavy">Heavy</option>
                                                    <option value="Motorcycle">Motorcycle</option>
                                                    <option value="Professional">Professional</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[9.5px] font-semibold text-slate-700">BRTA Circle</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Mirpur, Dhaka"
                                                    value={idIssuePlace}
                                                    onChange={e => setIdIssuePlace(e.target.value)}
                                                    className="w-full h-7 px-2 border border-slate-200 rounded text-[10.5px] outline-none"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <label className="text-[9.5px] font-semibold text-slate-700">Expiry Date</label>
                                                <input
                                                    type="date"
                                                    value={idExpiryDate}
                                                    onChange={e => setIdExpiryDate(e.target.value)}
                                                    className="w-full h-7 px-2 border border-slate-200 rounded text-[10.5px] bg-white outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'payment' && (
                        <div className="flex flex-col gap-2.5 animate-in fade-in duration-100">
                            {/* 1. Top Live Financial Status Strip */}
                            <FinancialStatusStrip
                                finalPayable={finalPayable}
                                totalPaid={totalPaid}
                                totalDue={totalDue}
                                currencySymbol={currencySymbol}
                            />

                            {/* 2. Main 2-Column Console */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                                {/* Left: Payment Settlement & Discount */}
                                <div className="lg:col-span-7 space-y-2">
                                    <PaymentTenderConsole
                                        paymentRows={paymentRows}
                                        totalDue={totalDue}
                                        finalPayable={finalPayable}
                                        currencySymbol={currencySymbol}
                                        onAddRow={handleAddPaymentRow}
                                        onRemoveRow={handleRemovePaymentRow}
                                        onUpdateRow={(id, field, val) => handlePaymentRowChange(id, field as any, val)}
                                        onFillDue={(rowId) => {
                                            const currentTotalPaid = paymentRows.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
                                            const remaining = Math.max(0, finalPayable - currentTotalPaid);
                                            setPaymentRows(paymentRows.map(p => {
                                                if (p.id === rowId) {
                                                    return { ...p, amount: Number(((p.amount || 0) + remaining).toFixed(2)) };
                                                }
                                                return p;
                                            }));
                                        }}
                                        onFill50Percent={(rowId) => {
                                            setPaymentRows(paymentRows.map(p => {
                                                if (p.id === rowId) {
                                                    return { ...p, amount: Number((finalPayable * 0.5).toFixed(2)) };
                                                }
                                                return p;
                                            }));
                                        }}
                                    />

                                    <DiscountConsole
                                        discountType={discountType}
                                        discountValue={discountValue}
                                        discountedAmount={discountedAmount}
                                        currencySymbol={currencySymbol}
                                        onTypeChange={setDiscountType}
                                        onValueChange={setDiscountValue}
                                        onApplyPreset={(pct) => {
                                            setDiscountType('Percentage');
                                            setDiscountValue(pct);
                                        }}
                                        onClear={() => setDiscountValue(0)}
                                    />
                                </div>

                                {/* Right: Summary Box */}
                                <div className="lg:col-span-5">
                                    <SettlementBreakdownCard
                                        roomBaseTotal={roomBaseTotal}
                                        nights={nightMultiplier}
                                        grossTotal={totalAmount}
                                        discountedAmount={discountedAmount}
                                        discountType={discountType}
                                        discountValue={discountValue}
                                        netBaseAmount={netBaseAmount}
                                        taxCalculation={taxCalculation}
                                        finalPayable={finalPayable}
                                        totalPaid={totalPaid}
                                        totalDue={totalDue}
                                        currencySymbol={currencySymbol}
                                        addons={{
                                            pickup: totalPickupArrivalCharge,
                                            drop: totalDropDepartureCharge,
                                            extraBed: totalExtraBedCharge,
                                            mealPlan: totalMealPlanCharge,
                                            celebration: totalCelebrationCharge,
                                            spa: totalSpaCharge,
                                            timing: totalTimingCharge,
                                            custom: totalCustomCharge,
                                            galaDinner: totalGalaDinnerCharge,
                                            totalAll: totalAllAddonsCharges
                                        }}
                                        holidaySurge={{
                                            hasSurge: holidaySummary.hasSurge,
                                            multiplier: holidaySummary.maxMultiplier,
                                            holidayName: holidaySummary.activeHolidays[0]
                                        }}
                                    />
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
                                const flightCheck = validatePreBookingFlight({
                                    actionType: 'hold',
                                    checkIn: checkInDate,
                                    operatingDate: getOperatingSystemDate(),
                                    availableRatePlans,
                                    roomsList,
                                    nights,
                                    guestName: name,
                                    phone: mobile,
                                    hasOverbookingError,
                                    validateAllRestrictions: validateAllRoomRestrictions
                                });

                                if (!flightCheck.allowed) {
                                    toast.error(flightCheck.error!);
                                    return;
                                }

                                if (quickBlacklistAlert && !managerOverrideApproved) {
                                    toast.error('❌ CANNOT PROCEED: Guest is blacklisted. Duty Manager Override is required to continue.');
                                    return;
                                }

                                setIsHoldTillModalOpen(true);
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
                                handleCompleteReservation(totalPaid > 0 ? 'confirmed' : 'reserved');
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors ${
                                hasOverbookingError
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : totalPaid > 0
                                        ? 'bg-[#1e3a8a] hover:bg-blue-900 text-white cursor-pointer'
                                        : 'bg-slate-800 hover:bg-slate-900 text-white cursor-pointer'
                            }`}
                        >
                            {totalPaid > 0 ? `Confirm Booking (Paid ${currencySymbol} ${totalPaid.toLocaleString()})` : 'Save as Reserve'}
                        </button>
                        {checkInDate === getOperatingSystemDate() && (
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

            {/* Enterprise Hold Till Modal */}
            {isHoldTillModalOpen && (
                <HoldTillModal
                    isOpen={isHoldTillModalOpen}
                    onClose={() => setIsHoldTillModalOpen(false)}
                    reservationNumber={`RES-${String(Math.floor(100000 + Math.random() * 900000))}`}
                    guestName={`${title} ${name}`.trim() || 'Valued Guest'}
                    roomNumber={roomsList[0]?.roomNumber}
                    roomType={roomsList[0]?.roomType}
                    checkInDate={checkInDate}
                    checkOutDate={checkOutDate}
                    totalAmount={finalPayable}
                    depositRequired={Math.round(finalPayable * 0.3)}
                    initialReason="Awaiting advance deposit transfer / payment confirmation."
                    onConfirmHold={(payload) => {
                        setIsHoldTillModalOpen(false);
                        handleCompleteReservation('hold', payload);
                    }}
                />
            )}

            {/* Real-Time Auto-Prompt Advance Deposit Receipt Modal */}
            {advanceReceiptToPrompt && (
                <MoneyReceiptModal
                    isOpen={Boolean(advanceReceiptToPrompt)}
                    onClose={() => {
                        setAdvanceReceiptToPrompt(null);
                        onClose();
                    }}
                    payment={advanceReceiptToPrompt.payment}
                    folio={advanceReceiptToPrompt.folio}
                    isAdvance={true}
                />
            )}
        </div>
    );
};

export default QuickReservationModal;
