import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Copy,
    Trash2,
    User as UserIcon,
    MapPin,
    Briefcase,
    CheckCircle2,
    AlertTriangle,
    Check,
    Calendar,
    List,
    Plus,
    MoreVertical,
    Car,
    Plane,
    BedDouble,
    Utensils,
    Gift,
    Clock,
    Sparkles,
    Split,
    CalendarRange,
    Users,
    ShieldCheck,
    Heart,
    X,
    Edit3,
    Ban,
    FileText
} from 'lucide-react';
import { formatIdentityDisplay } from '../utils/identityUtils';
import { COUNTRIES_DATABASE, getCitiesForCountry, getNationalityForCountry } from '../utils/geoData';
import { useNavigation } from '../context/NavigationContext';
import { StayPeriodPicker, getSystemDateISO, getNextDayISO } from './common/StayPeriodPicker';
import { ChildAgeSelector } from './common/ChildAgeSelector';
import { RoomAddonServicesModal, type ServiceTabType } from './modals/RoomAddonServicesModal';
import { MultiRoomSelectorModal } from './modals/MultiRoomSelectorModal';
import type {
    RoomServicesBundle,
    ExtraBedConfig,
    PickupConfig
} from '../types/reservationServices';
import {
    getExtraBedTotal,
    getMealPlanTotal,
    getCelebrationTotal,
    getSpaWellnessTotal,
    getTimingFlexTotal,
    getCustomAddonsTotal,
    getRoomBundleTotal
} from '../types/reservationServices';
import {
    getAvailableRoomsForStay,
    validateAndCommitReservation,
    subscribeToPMSEvents,
    isMatchingRoomType,
    getStandardDailyRateForRoom,
    getDynamicRoomTypes,
    calculateTariffForRatePlan,
    getRoomTypeCapacity,
    getAllStoredReservations,
    saveStoredReservations,
    updateReservationInDB,
    getStoredConnectingSuites,
    syncConnectingSuitesFromDB,
    getRoomSmokingPolicy,
    getHotelReservationPolicies,
    type StoredReservation,
    type ConnectingSuite
} from '../utils/roomInventoryEngine';
import { toast } from '../context/ToastContext';
import { useProperty } from '../context/PropertyContext';
import { getApiBaseUrl, getActivePropertyId } from '../utils/apiUrl';
import {
    calculateReservationTaxes,
    getActiveTaxConfiguration,
    getTaxConfigurations,
    type TaxCalculationResult
} from '../utils/taxCalculationEngine';
import { isSamePhoneNumber } from '../utils/phoneUtils';

interface RoomRow {
    id: number;
    roomType: string;
    roomsCount: number;
    ratePlan: string;
    roomNumber: string;
    assignedRooms?: string[];
    adults: number;
    children: number;
    childrenAges?: number[];
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
export const AddReservation: React.FC = () => {
    const { setActivePage } = useNavigation();
    const { activeProperty } = useProperty();
    const currencyCode = activeProperty?.currency || 'BDT';
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // ==========================================
    // STEP 1 STATE
    // ==========================================
    const [checkIn, setCheckIn] = useState<string>(() => getSystemDateISO());
    const [nights, setNights] = useState<number>(1);
    const [checkOut, setCheckOut] = useState<string>(() => getNextDayISO(getSystemDateISO(), 1));
    const [businessSource, setBusinessSource] = useState('Direct');
    const [businessAgent, setBusinessAgent] = useState('Direct');
    const [dayUse, setDayUse] = useState(false);
    const [ratePerNight, setRatePerNight] = useState('Rate Per Night');
    const [taxApplicable, setTaxApplicable] = useState(true);
    const [selectedTaxConfigId, setSelectedTaxConfigId] = useState<string>(() => {
        return getActiveTaxConfiguration().id;
    });
    const availableTaxConfigs = useMemo(() => getTaxConfigurations().filter(c => c.status === 'Active'), []);

    // Helpers for Per-Row Stay Dates (Group Staggered Stay)
    const getRowCheckIn = (r: RoomRow) => r.checkInDate || checkIn;
    const getRowCheckOut = (r: RoomRow) => r.checkOutDate || checkOut;
    const getRowNights = (r: RoomRow): number => {
        if (dayUse) return 1;
        if (r.nights !== undefined) return Math.max(1, r.nights);
        const inD = new Date(getRowCheckIn(r)).getTime();
        const outD = new Date(getRowCheckOut(r)).getTime();
        const diff = Math.round((outD - inD) / (1000 * 60 * 60 * 24));
        return Math.max(1, isNaN(diff) ? nights : diff);
    };

    // Calculate total room-nights for a row (accounting for per-room customized stay dates in roomDatesMap)
    const getRowTotalRoomNights = (r: RoomRow): number => {
        if (dayUse) return Number(r.roomsCount) || 1;
        const count = Number(r.roomsCount) || 1;
        if (r.roomDatesMap && Object.keys(r.roomDatesMap).length > 0) {
            const assigned = (r.assignedRooms && r.assignedRooms.length === count)
                ? r.assignedRooms
                : Object.keys(r.roomDatesMap);
            let sumNights = 0;
            assigned.forEach(rm => {
                const conf = r.roomDatesMap?.[rm];
                sumNights += conf ? conf.nights : getRowNights(r);
            });
            return Math.max(1, sumNights);
        }
        return count * getRowNights(r);
    };

    // Calculate base room tariff total for a row
    const getRowBaseTotal = (r: RoomRow): number => {
        return r.rate * getRowTotalRoomNights(r);
    };

    const [roomsList, setRoomsList] = useState<RoomRow[]>(() => {
        const sysDate = getSystemDateISO();
        const nextDate = getNextDayISO(sysDate, 1);
        const report = getAvailableRoomsForStay(sysDate, nextDate, 'Deluxe Double');
        const freeRoom = report.availableRooms.find(r => r.roomTypeName.includes('Deluxe') || r.roomTypeName === 'Deluxe Double') || report.availableRooms[0];
        const defaultRoomNumber = freeRoom ? freeRoom.number : '102';
        return [
            {
                id: 1,
                roomType: 'Deluxe Double',
                roomsCount: 1,
                ratePlan: '',
                roomNumber: defaultRoomNumber,
                assignedRooms: [defaultRoomNumber],
                adults: 2,
                children: 1,
                childrenAges: [5],
                rate: 3000,
                isAssign: true
            }
        ];
    });

    // Total actual room count across all rows (sums each row's roomsCount)
    const totalRoomsCount = useMemo(() => {
        return roomsList.reduce((acc, r) => acc + (Number(r.roomsCount) || 1), 0);
    }, [roomsList]);

    // Overall Group Horizon (Earliest Check-In to Latest Check-Out span across all rooms)
    const groupHorizon = useMemo(() => {
        let minIn = checkIn;
        let maxOut = checkOut;
        let totalRoomNights = 0;
        let hasCustomDates = false;

        roomsList.forEach(r => {
            const count = Number(r.roomsCount) || 1;
            const assigned = r.assignedRooms && r.assignedRooms.length === count
                ? r.assignedRooms
                : [r.roomNumber];

            if (r.roomDatesMap && Object.keys(r.roomDatesMap).length > 0) {
                assigned.forEach(rm => {
                    const conf = r.roomDatesMap?.[rm];
                    if (conf) {
                        hasCustomDates = true;
                        totalRoomNights += conf.nights;
                        if (!minIn || conf.checkIn < minIn) minIn = conf.checkIn;
                        if (!maxOut || conf.checkOut > maxOut) maxOut = conf.checkOut;
                    } else {
                        totalRoomNights += getRowNights(r);
                    }
                });
            } else {
                if (r.checkInDate && r.checkInDate !== checkIn) hasCustomDates = true;
                if (r.checkOutDate && r.checkOutDate !== checkOut) hasCustomDates = true;
                const rIn = getRowCheckIn(r);
                const rOut = getRowCheckOut(r);
                const rN = getRowNights(r);
                totalRoomNights += rN * count;
                if (!minIn || rIn < minIn) minIn = rIn;
                if (!maxOut || rOut > maxOut) maxOut = rOut;
            }
        });

        const span = Math.max(1, Math.round((new Date(maxOut).getTime() - new Date(minIn).getTime()) / (1000 * 60 * 60 * 24)));
        return {
            minIn,
            maxOut,
            spanNights: isNaN(span) ? 1 : span,
            totalRoomNights: Math.max(1, totalRoomNights),
            hasCustomDates
        };
    }, [checkIn, checkOut, nights, roomsList, dayUse]);

    // Handle Day Use toggle
    const handleDayUseToggle = (isDayUse: boolean) => {
        setDayUse(isDayUse);
        if (isDayUse) {
            setCheckOut(checkIn);
            setNights(0);
        } else {
            const nextDay = getNextDayISO(checkIn, 1);
            setCheckOut(nextDay);
            setNights(1);
        }
    };

    // ==========================================
    // STEP 2 STATE
    // ==========================================
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
    const [birthCity, setBirthCity] = useState('Dhaka');
    const [occupation, setOccupation] = useState('');
    const [purposeOfVisit, setPurposeOfVisit] = useState('Business');
    const [idType, setIdType] = useState('ID');
    const [idNumber, setIdNumber] = useState('');

    // Polymorphic Step 2 Identity State
    const [passportVisaNumber, setPassportVisaNumber] = useState('');
    const [passportVisaType, setPassportVisaType] = useState('Tourist');
    const [passportVisaExpiry, setPassportVisaExpiry] = useState('');
    const [passportEntryPort, setPassportEntryPort] = useState('Airport');
    const [drivingVehicleClass, setDrivingVehicleClass] = useState('Light');
    const [fatherOrSpouseName, setFatherOrSpouseName] = useState('');
    const [idIssueDate, setIdIssueDate] = useState('');
    const [idExpiryDate, setIdExpiryDate] = useState('');
    const [idIssueCountry, setIdIssueCountry] = useState('Bangladesh');
    const [idIssuePlace, setIdIssuePlace] = useState('');

    // Blacklist Interception State
    const [managerOverrideApproved, setManagerOverrideApproved] = useState(false);

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
    const [homeCountry, setHomeCountry] = useState('Bangladesh');
    const [postalCode, setPostalCode] = useState('');

    // Work Details
    const [companyName, setCompanyName] = useState('');
    const [designation, setDesignation] = useState('');
    const [officePhone, setOfficePhone] = useState('');
    const [corporateEmail, setCorporateEmail] = useState('');
    const [taxVatId, setTaxVatId] = useState('');

    // Enhanced Step 2 State & CRM Integration
    const [step2Tab, setStep2Tab] = useState<'profile' | 'address' | 'corporate' | 'preferences'>('profile');
    const [guestSearchQuery, setGuestSearchQuery] = useState('');
    const [isGuestSearchOpen, setIsGuestSearchOpen] = useState(false);
    const [selectedExistingGuest, setSelectedExistingGuest] = useState<any | null>(null);
    const [emergencyName, setEmergencyName] = useState('');
    const [emergencyPhone, setEmergencyPhone] = useState('');
    const [emergencyRelation, setEmergencyRelation] = useState('Family / Spouse');
    const [bedPreference, setBedPreference] = useState('King Bed');
    const [floorPreference, setFloorPreference] = useState('High Floor');
    const [smokingPreference, setSmokingPreference] = useState<'Non-Smoking' | 'Smoking'>('Non-Smoking');
    const [dietaryPreference, setDietaryPreference] = useState('Halal');

    // Stored & Canonical Guests for instant auto-complete
    const allKnownGuests = useMemo(() => {
        const guestMap = new Map<string, any>();

        try {
            const rawProfiles = localStorage.getItem('hotel_guest_profiles_v2');
            if (rawProfiles) {
                const profiles = JSON.parse(rawProfiles);
                if (Array.isArray(profiles)) {
                    profiles.forEach(p => {
                        const key = (p.name || '').trim().toLowerCase();
                        if (key) {
                            guestMap.set(key, {
                                id: p.id,
                                title: p.title || 'Mr.',
                                name: p.name,
                                phone: p.phone || '',
                                altPhone: p.altPhone || '',
                                email: p.email || '',
                                vipTier: p.vipTier || 'Regular',
                                nationality: p.nationality || 'Bangladeshi',
                                idType: p.idType || 'National ID (NID)',
                                idNumber: p.idNumber || '',
                                dob: p.dob || '',
                                gender: p.gender || 'Male',
                                homeCity: p.homeCity || '',
                                homeCountry: p.homeCountry || 'Bangladesh',
                                address: p.address || '',
                                postalCode: p.postalCode || '',
                                company: p.company || '',
                                designation: p.designation || '',
                                totalStays: p.totalStays || 1,
                                lifetimeSpendBDT: p.lifetimeSpendBDT || 0,
                                preferences: p.preferences || {},
                                emergencyContact: p.emergencyContact,
                                isBlacklisted: Boolean(p.isBlacklisted),
                                blacklistReason: p.blacklistReason,
                                blacklistedBy: p.blacklistedBy,
                                blacklistedAt: p.blacklistedAt,
                                passportVisaNumber: p.passportVisaNumber,
                                passportVisaType: p.passportVisaType,
                                passportVisaExpiry: p.passportVisaExpiry,
                                passportEntryPort: p.passportEntryPort,
                                drivingVehicleClass: p.drivingVehicleClass,
                                fatherOrSpouseName: p.fatherOrSpouseName,
                                idIssueDate: p.idIssueDate,
                                idExpiryDate: p.idExpiryDate || p.idExpiry,
                                idIssueCountry: p.idIssueCountry,
                                idIssuePlace: p.idIssuePlace
                            });
                        }
                    });
                }
            }
        } catch (e) { }

        const reservations = getAllStoredReservations();
        reservations.forEach(r => {
            const cleanName = (r.guestName || '').replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Engr\.)\s*/i, '').trim();
            const key = cleanName.toLowerCase();
            if (key && !guestMap.has(key)) {
                guestMap.set(key, {
                    id: r.id || key,
                    title: r.guestName?.startsWith('Dr') ? 'Dr.' : r.guestName?.startsWith('Ms') ? 'Ms.' : 'Mr.',
                    name: cleanName,
                    phone: r.phone || r.guestPhone || '',
                    altPhone: '',
                    email: r.email || r.guestEmail || '',
                    vipTier: r.bookingSource === 'Corporate' ? 'Corporate VIP' : 'Regular',
                    nationality: r.nationality || 'Bangladeshi',
                    idType: r.passportNo ? 'Passport' : 'National ID (NID)',
                    idNumber: r.passportNo || r.nidNumber || '',
                    dob: '',
                    gender: 'Male',
                    homeCity: 'Dhaka',
                    homeCountry: 'Bangladesh',
                    address: '',
                    postalCode: '',
                    company: r.company || (r.bookingSource === 'Corporate' ? r.source : ''),
                    designation: '',
                    totalStays: 1,
                    lifetimeSpendBDT: Number(r.totalAmount) || 0,
                    preferences: {},
                    emergencyContact: undefined,
                    isBlacklisted: false
                });
            }
        });

        return Array.from(guestMap.values());
    }, []);

    const activeBlacklistAlert = useMemo(() => {
        if (selectedExistingGuest?.isBlacklisted) {
            return {
                isBlocked: true,
                name: selectedExistingGuest.name,
                reason: selectedExistingGuest.blacklistReason || 'Hospitality policy / payment default',
                by: selectedExistingGuest.blacklistedBy || 'Duty Manager',
                at: selectedExistingGuest.blacklistedAt
            };
        }
        const cleanP = (mobile || phone || '').replace(/[^0-9]/g, '');
        const cleanId = idNumber.trim().toLowerCase();
        if (cleanP.length >= 8 || (cleanId && cleanId.length >= 4)) {
            const match = allKnownGuests.find(g => {
                if (!g.isBlacklisted) return false;
                const gPhoneClean = (g.phone || '').replace(/[^0-9]/g, '');
                const phoneMatch = Boolean(cleanP && gPhoneClean && (cleanP.endsWith(gPhoneClean.slice(-8)) || gPhoneClean.endsWith(cleanP.slice(-8))));
                const idMatch = Boolean(cleanId && g.idNumber && g.idNumber.toLowerCase() === cleanId);
                return phoneMatch || idMatch;
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
    }, [selectedExistingGuest, mobile, phone, idNumber, allKnownGuests]);

    const filteredKnownGuests = useMemo(() => {
        const q = (guestSearchQuery || guestName || '').toLowerCase().trim();
        if (q.length < 2 || selectedExistingGuest) return [];
        return allKnownGuests.filter(g =>
            g.name.toLowerCase().includes(q) ||
            g.phone.includes(q) ||
            (g.altPhone && g.altPhone.includes(q)) ||
            (g.email && g.email.toLowerCase().includes(q)) ||
            (g.idNumber && g.idNumber.toLowerCase().includes(q)) ||
            (g.company && g.company.toLowerCase().includes(q))
        ).slice(0, 6);
    }, [allKnownGuests, guestSearchQuery, guestName, selectedExistingGuest]);

    const phoneCollision = useMemo(() => {
        const cleanP = (mobile || phone || '').replace(/[^0-9]/g, '');
        if (cleanP.length < 8) return null;
        const match = allKnownGuests.find(g => {
            const gp = (g.phone || '').replace(/[^0-9]/g, '');
            return gp.length >= 8 && (gp.endsWith(cleanP.slice(-8)) || cleanP.endsWith(gp.slice(-8)));
        });
        if (match && guestName.trim()) {
            const exName = match.name.toLowerCase().trim();
            const inName = guestName.toLowerCase().trim();
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
    }, [mobile, phone, guestName, allKnownGuests]);

    const handleSelectExistingGuest = (g: any) => {
        setSelectedExistingGuest(g);
        setSalutation(g.title ? g.title.replace('.', '') : 'Mr');
        setGuestName(g.name);
        setMobile(g.phone || g.altPhone || '');
        setPhone(g.altPhone || '');
        setEmail(g.email || '');
        setVipStatus(
            g.vipTier?.includes('Platinum') ? 'VVIP' :
                g.vipTier?.includes('Gold') ? 'VIP-2' :
                    g.vipTier?.includes('Silver') ? 'VIP-1' :
                        g.vipTier?.includes('Corporate') ? 'VIP-1' : ''
        );
        if (g.gender) setGender(g.gender);
        if (g.nationality) setNationality(g.nationality);
        if (g.idType) setIdType(g.idType);
        if (g.idNumber) setIdNumber(g.idNumber);
        if (g.dob) setDob(g.dob);
        if (g.address) setStreetAddress(g.address);
        if (g.homeCity) setHomeCity(g.homeCity);
        if (g.homeCountry) setHomeCountry(g.homeCountry);
        if (g.postalCode) setPostalCode(g.postalCode);
        if (g.company) setCompanyName(g.company);
        if (g.designation) setDesignation(g.designation);
        if (g.passportVisaNumber) setPassportVisaNumber(g.passportVisaNumber);
        if (g.passportVisaType) setPassportVisaType(g.passportVisaType);
        if (g.passportVisaExpiry) setPassportVisaExpiry(g.passportVisaExpiry);
        if (g.passportEntryPort) setPassportEntryPort(g.passportEntryPort);
        if (g.drivingVehicleClass) setDrivingVehicleClass(g.drivingVehicleClass);
        if (g.fatherOrSpouseName) setFatherOrSpouseName(g.fatherOrSpouseName);
        if (g.idIssueDate) setIdIssueDate(g.idIssueDate);
        if (g.idExpiryDate || g.idExpiry) setIdExpiryDate(g.idExpiryDate || g.idExpiry);
        if (g.idIssueCountry) setIdIssueCountry(g.idIssueCountry);
        if (g.idIssuePlace) setIdIssuePlace(g.idIssuePlace);
        if (g.emergencyContact) {
            setEmergencyName(g.emergencyContact.name || '');
            setEmergencyPhone(g.emergencyContact.phone || '');
            if (g.emergencyContact.relationship) setEmergencyRelation(g.emergencyContact.relationship);
        }
        if (g.preferences?.floorPreference) setFloorPreference(g.preferences.floorPreference);
        if (g.preferences?.bedType) setBedPreference(g.preferences.bedType);
        if (g.preferences?.smoking) setSmokingPreference(g.preferences.smoking);
        if (g.preferences?.dietary) setDietaryPreference(g.preferences.dietary);

        setGuestSearchQuery('');
        setIsGuestSearchOpen(false);
        if (g.isBlacklisted) {
            toast.warning(`⚠️ ATTENTION: Guest ${g.name} is on the Blacklist (${g.blacklistReason || 'Blocked'}). Manager Override required.`);
        } else {
            toast.success(`Loaded verified profile for ${g.title || ''} ${g.name}`);
        }
    };

    const handleClearSelectedGuest = () => {
        setSelectedExistingGuest(null);
        setGuestName('');
        setMobile('');
        setPhone('');
        setEmail('');
        setVipStatus('');
        setIdNumber('');
        setStreetAddress('');
        setCompanyName('');
        setDesignation('');
        setEmergencyName('');
        setEmergencyPhone('');
    };

    const isGuestProfileComplete = Boolean(guestName.trim() && (mobile.trim() || phone.trim()));

    // ==========================================
    // STEP 3 STATE
    // ==========================================
    const [discountType, setDiscountType] = useState<'Percentage' | 'Fixed'>('Fixed');
    const [discountValue, setDiscountValue] = useState<number>(0);
    const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([
        { id: 1, method: 'Cash', amount: 3000 }
    ]);
    const [keypadTargetIndex, setKeypadTargetIndex] = useState<number>(0);

    // Success State
    const [createdReservation, setCreatedReservation] = useState<any | null>(null);

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

    // ==========================================
    // EDIT MODE & PRE-POPULATION STATE
    // ==========================================
    const [editingReservation, setEditingReservation] = useState<StoredReservation | null>(null);
    const [isEditMode, setIsEditMode] = useState<boolean>(false);

    useEffect(() => {
        const editId = sessionStorage.getItem('hotel_edit_reservation_id');
        if (!editId) return;

        const all = getAllStoredReservations();
        const found = all.find(r =>
            String(r.id) === String(editId) ||
            r.reservationNumber === editId ||
            (r as any).subBookingNumber === editId
        );

        if (found) {
            setEditingReservation(found);
            setIsEditMode(true);

            // Step 1: Dates & Horizon
            if (found.checkIn) setCheckIn(found.checkIn);
            if (found.checkOut) setCheckOut(found.checkOut);
            if (found.nights) setNights(Number(found.nights) || 1);
            if (found.source || (found as any).bookingSource) setBusinessSource(found.source || (found as any).bookingSource || 'Direct');
            if ((found as any).agent) setBusinessAgent((found as any).agent);
            if ((found as any).dayUse !== undefined) setDayUse(Boolean((found as any).dayUse));
            if ((found as any).taxApplicable !== undefined) setTaxApplicable(Boolean((found as any).taxApplicable));
            if ((found as any).taxConfigId) setSelectedTaxConfigId((found as any).taxConfigId);

            // Step 1: Rooms List
            const isConnRes = Boolean(
                found.isConnectingSuite ||
                (found.roomType && (found.roomType.toLowerCase().includes('connecting') || found.roomType.toLowerCase().includes('interconnecting')))
            );

            if (isConnRes) {
                const connRooms = (found.allocatedRooms && found.allocatedRooms.length > 0)
                    ? found.allocatedRooms
                    : (found.roomsList && found.roomsList.length > 0
                        ? found.roomsList.flatMap((rm: any) => String(rm.roomNumber).split('+').map(s => s.trim()))
                        : [found.roomNumber || '101']);
                setRoomsList([{
                    id: 1,
                    roomType: found.roomType || 'Interconnecting Suite',
                    roomsCount: 1,
                    ratePlan: found.ratePlan || '',
                    roomNumber: connRooms.join(' + '),
                    assignedRooms: connRooms,
                    adults: Number(found.adults) || 2,
                    children: Number(found.children) || 0,
                    childrenAges: [],
                    rate: Number((found as any).roomRate) || (Number(found.totalAmount) ? Math.round(Number(found.totalAmount) / Math.max(1, Number(found.nights) || 1)) : 6000),
                    isAssign: true,
                    checkInDate: found.checkIn,
                    checkOutDate: found.checkOut,
                    nights: Number(found.nights) || 1,
                    servicesBundle: (found as any).servicesBundle
                }]);
            } else if (Array.isArray(found.roomsList) && found.roomsList.length > 0) {
                setRoomsList(found.roomsList.map((rm: any, idx: number) => ({
                    id: idx + 1,
                    roomType: rm.roomType || found.roomType || 'Deluxe Double',
                    roomsCount: 1,
                    ratePlan: rm.ratePlan || found.ratePlan || '',
                    roomNumber: rm.roomNumber || found.roomNumber || '',
                    assignedRooms: rm.assignedRooms || [rm.roomNumber || found.roomNumber || ''],
                    adults: Number(rm.adults || found.adults) || 2,
                    children: Number(rm.children || found.children) || 0,
                    childrenAges: rm.childrenAges || [],
                    rate: Number(rm.rate || rm.amount || (found as any).roomRate) || 3000,
                    isAssign: Boolean(rm.roomNumber || found.roomNumber),
                    checkInDate: rm.checkInDate || found.checkIn,
                    checkOutDate: rm.checkOutDate || found.checkOut,
                    nights: Number(rm.nights || found.nights) || 1,
                    servicesBundle: rm.servicesBundle || (found as any).servicesBundle
                })));
            } else if (Array.isArray(found.allocatedRooms) && found.allocatedRooms.length > 0) {
                setRoomsList(found.allocatedRooms.map((rm: string, idx: number) => ({
                    id: idx + 1,
                    roomType: found.roomType || 'Deluxe Double',
                    roomsCount: 1,
                    ratePlan: found.ratePlan || '',
                    roomNumber: rm,
                    assignedRooms: [rm],
                    adults: Number(found.adults) || 2,
                    children: Number(found.children) || 0,
                    childrenAges: [],
                    rate: Number((found as any).roomRate) || (Number(found.totalAmount) ? Math.round(Number(found.totalAmount) / Math.max(1, Number(found.nights) || 1)) : 3000),
                    isAssign: true,
                    checkInDate: found.checkIn,
                    checkOutDate: found.checkOut,
                    nights: Number(found.nights) || 1,
                    servicesBundle: (found as any).servicesBundle
                })));
            } else if (found.roomNumber) {
                setRoomsList([{
                    id: 1,
                    roomType: found.roomType || 'Deluxe Double',
                    roomsCount: 1,
                    ratePlan: found.ratePlan || '',
                    roomNumber: found.roomNumber,
                    assignedRooms: [found.roomNumber],
                    adults: Number(found.adults) || 2,
                    children: Number(found.children) || 0,
                    childrenAges: [],
                    rate: Number((found as any).roomRate) || (Number(found.totalAmount) ? Math.round(Number(found.totalAmount) / Math.max(1, Number(found.nights) || 1)) : 3000),
                    isAssign: true,
                    checkInDate: found.checkIn,
                    checkOutDate: found.checkOut,
                    nights: Number(found.nights) || 1,
                    servicesBundle: (found as any).servicesBundle
                }]);
            }

            // Step 2: Guest & KYC
            const rawName = found.guestName || '';
            const cleanName = rawName.replace(/^(Mr|Mrs|Ms|Dr|Prof|Engr)\.?\s+/i, '');
            const matchedTitle = rawName.match(/^(Mr|Mrs|Ms|Dr|Prof|Engr)\.?/i);
            if (matchedTitle) setSalutation(matchedTitle[1]);
            if (cleanName) setGuestName(cleanName);
            if (found.phone) setPhone(found.phone);
            if (found.phone || (found as any).mobile) setMobile(found.phone || (found as any).mobile);
            if (found.email) setEmail(found.email);
            if (found.vip) setVipStatus(found.vip);
            if ((found as any).nationality) setNationality((found as any).nationality);
            if ((found as any).idType) setIdType((found as any).idType);
            if ((found as any).idNumber || (found as any).nidNumber || (found as any).passportNo) {
                setIdNumber((found as any).idNumber || (found as any).nidNumber || (found as any).passportNo || '');
            }
            if ((found as any).specialRequests) {
                setRemarksMap(prev => ({ ...prev, Guest: (found as any).specialRequests }));
            }

            // Step 3: Billing & Payments
            if (found.discount) setDiscountValue(Number(found.discount) || 0);
            if (found.paidAmount && Number(found.paidAmount) > 0) {
                setPaymentRows([{
                    id: 1,
                    method: ((found as any).paymentMethod as any) || 'Cash',
                    amount: Number(found.paidAmount)
                }]);
            }
        }
    }, []);

    const handleCancelEdit = () => {
        sessionStorage.removeItem('hotel_edit_reservation_id');
        setEditingReservation(null);
        setIsEditMode(false);
        resetForm();
        setActivePage('reservations');
    };

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

    // Calculations
    const nightMultiplier = dayUse ? 1 : Math.max(1, nights);
    const roomBaseTotal = roomsList.reduce((acc, r) => acc + (r.rate * r.roomsCount * getRowNights(r)), 0);
    const totalExtraBedCharge = roomsList.reduce((acc, r) => acc + getExtraBedTotal(r.servicesBundle?.extraBed || r.extraBed, getRowNights(r)), 0);
    const totalPickupArrivalCharge = roomsList.reduce((acc, r) => {
        const p = r.servicesBundle?.pickup || r.pickup;
        return acc + (p?.enabled && !p.isComplimentary ? (Number(p.chargeAmount) || 0) : 0);
    }, 0);
    const totalDropDepartureCharge = roomsList.reduce((acc, r) => {
        const p = r.servicesBundle?.pickup || r.pickup;
        return acc + (p?.dropEnabled && !p.dropIsComplimentary ? (Number(p.dropChargeAmount) || 0) : 0);
    }, 0);
    const totalPickupCharge = totalPickupArrivalCharge + totalDropDepartureCharge;
    const totalMealPlanCharge = roomsList.reduce((acc, r) => acc + getMealPlanTotal(r.servicesBundle?.mealPlan, getRowNights(r)), 0);
    const totalCelebrationCharge = roomsList.reduce((acc, r) => acc + getCelebrationTotal(r.servicesBundle?.celebration), 0);
    const totalSpaCharge = roomsList.reduce((acc, r) => acc + getSpaWellnessTotal(r.servicesBundle?.spaWellness), 0);
    const totalTimingCharge = roomsList.reduce((acc, r) => acc + getTimingFlexTotal(r.servicesBundle?.timingFlex), 0);
    const totalCustomCharge = roomsList.reduce((acc, r) => acc + getCustomAddonsTotal(r.servicesBundle?.customAddons, getRowNights(r)), 0);

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

    const [pmsSyncVersion, setPmsSyncVersion] = useState(0);

    const [dbRatePlans, setDbRatePlans] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('hotel_rate_plans_v1');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch { }
        return [];
    });

    useEffect(() => {
        const propId = getActivePropertyId();
        if (propId > 0) {
            fetch(`${getApiBaseUrl()}/api/rates/plans?propertyId=${propId}`)
                .then(res => res.json())
                .then(json => {
                    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
                        setDbRatePlans(json.data);
                        localStorage.setItem('hotel_rate_plans_v1', JSON.stringify(json.data));
                    }
                })
                .catch(() => { });
        }
    }, [pmsSyncVersion]);

    const availableRatePlans = dbRatePlans;

    // Connecting Suites from connecting_rooms table and localStorage
    const [connectingSuites, setConnectingSuites] = useState<ConnectingSuite[]>(() => getStoredConnectingSuites(getActivePropertyId()));

    useEffect(() => {
        const propId = getActivePropertyId();
        syncConnectingSuitesFromDB(propId).then(suites => {
            if (suites && suites.length > 0) {
                setConnectingSuites(suites);
            }
        }).catch(() => { });
    }, [pmsSyncVersion]);

    const standardRoomTypesList = useMemo(() => {
        const dynamic = getDynamicRoomTypes();
        return dynamic.filter(t => !t.isConnecting).map(t => t.name);
    }, [pmsSyncVersion]);

    const activeConnectingSuites = useMemo(() => {
        return connectingSuites.filter(s => s.status === 'Active');
    }, [connectingSuites]);

    // Cross-tab real-time sync subscription
    useEffect(() => {
        const unsubscribe = subscribeToPMSEvents((msg) => {
            setPmsSyncVersion(v => v + 1);
            if (msg.type === 'RESERVATION_COMMITTED') {
                toast.info(`Inventory update: Room ${msg.reservation.roomNumber} was booked by another terminal.`);
            }
        });
        return unsubscribe;
    }, []);

    // Live Availability Report for selected stay window
    const liveAvailabilityReport = useMemo(() => {
        return getAvailableRoomsForStay(checkIn, checkOut, undefined, {
            excludeReservationId: editingReservation?.reservationNumber || editingReservation?.id
        });
    }, [checkIn, checkOut, pmsSyncVersion, editingReservation]);

    // Self-healing room validation: Ensure no row is assigned to an Occupied room, wrong category room, or duplicate room!
    useEffect(() => {
        if (isEditMode) return; // When editing, preserve the assigned room from the existing reservation
        setRoomsList(prev => {
            let changed = false;
            const usedInForm = new Set<string>();

            const updated = prev.map(row => {
                if (activeConnectingSuites.some(s => s.name.trim().toLowerCase() === row.roomType.trim().toLowerCase())) {
                    (row.assignedRooms || [row.roomNumber]).forEach(rn => usedInForm.add(String(rn)));
                    return row;
                }
                const count = Number(row.roomsCount) || 1;
                const isCurrentAvailable =
                    liveAvailabilityReport.availableRooms.some(
                        ar => ar.number === row.roomNumber && isMatchingRoomType(ar.roomTypeName, row.roomType)
                    ) && !usedInForm.has(row.roomNumber);

                const freeMatches = liveAvailabilityReport.availableRooms.filter(
                    ar => !usedInForm.has(ar.number) && isMatchingRoomType(ar.roomTypeName, row.roomType)
                );

                // Clamp roomsCount if available rooms in this category decreased
                if (freeMatches.length > 0 && count > freeMatches.length) {
                    changed = true;
                    const clampedCount = freeMatches.length;
                    const autoAssigned = freeMatches.slice(0, clampedCount).map(ar => ar.number);
                    autoAssigned.forEach(rn => usedInForm.add(rn));
                    return {
                        ...row,
                        roomsCount: clampedCount,
                        roomNumber: autoAssigned[0],
                        assignedRooms: autoAssigned
                    };
                }

                if (!isCurrentAvailable && liveAvailabilityReport.availableRooms.length > 0) {
                    const fallbackFree = liveAvailabilityReport.availableRooms.filter(ar => !usedInForm.has(ar.number));
                    const chosenPool = freeMatches.length > 0 ? freeMatches : fallbackFree;
                    const freeMatch = chosenPool[0];

                    if (freeMatch) {
                        changed = true;
                        const resolvedType = freeMatches.length > 0 ? row.roomType : freeMatch.roomTypeName;
                        const resolvedPool = chosenPool.filter(ar => isMatchingRoomType(ar.roomTypeName, resolvedType));
                        const safeCount = Math.max(1, Math.min(count, resolvedPool.length || 1));
                        const autoAssigned = (resolvedPool.length > 0 ? resolvedPool : chosenPool)
                            .slice(0, safeCount)
                            .map(ar => ar.number);
                        autoAssigned.forEach(rn => usedInForm.add(rn));
                        return {
                            ...row,
                            roomType: resolvedType,
                            roomsCount: safeCount,
                            roomNumber: freeMatch.number,
                            assignedRooms: autoAssigned.length > 0 ? autoAssigned : [freeMatch.number],
                            rate: freeMatches.length > 0 ? row.rate : getStandardDailyRateForRoom(freeMatch.number, resolvedType)
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
    }, [checkIn, checkOut, liveAvailabilityReport]);

    // Total rooms allocated across all rows in this form
    const totalRoomsAllocatedInForm = useMemo(() => {
        return roomsList.reduce((sum, r) => sum + (Number(r.roomsCount) || 1), 0);
    }, [roomsList]);

    // Live remaining rooms after deducting this form's selected rooms
    const remainingOverallFreeRooms = Math.max(0, liveAvailabilityReport.availableCount - totalRoomsAllocatedInForm);

    // Total inventory free for this type in the hotel (before any form selection)
    const getTotalInventoryForType = (typeName: string): number => {
        const suite = activeConnectingSuites.find(s => s.name.trim().toLowerCase() === typeName.trim().toLowerCase());
        if (suite) {
            const suiteRooms = suite.componentRooms.flatMap(c => c.roomNumbers || []).map(String);
            if (suiteRooms.length === 0) return 0;
            const allFree = suiteRooms.every(rmNum => {
                const st = liveAvailabilityReport.allRoomsStatus.find(s => String(s.room.number) === rmNum);
                return st && st.isAvailable;
            });
            return allFree ? 1 : 0;
        }
        return liveAvailabilityReport.allRoomsStatus.filter(st => {
            return isMatchingRoomType(st.room.roomTypeName, typeName) && st.isAvailable;
        }).length;
    };

    // Rooms of this type already allocated across ALL rows in this form
    const getAllocatedCountForType = (typeName: string): number => {
        const suite = activeConnectingSuites.find(s => s.name.trim().toLowerCase() === typeName.trim().toLowerCase());
        if (suite) {
            return roomsList.filter(r => r.roomType.trim().toLowerCase() === typeName.trim().toLowerCase()).length;
        }
        return roomsList
            .filter(r => isMatchingRoomType(r.roomType, typeName))
            .reduce((sum, r) => sum + (Number(r.roomsCount) || 1), 0);
    };

    // Rooms of this type allocated in OTHER rows (excluding currentRowId)
    const getAllocatedCountInOtherRows = (typeName: string, currentRowId?: number): number => {
        const suite = activeConnectingSuites.find(s => s.name.trim().toLowerCase() === typeName.trim().toLowerCase());
        if (suite) {
            const suiteRooms = new Set(suite.componentRooms.flatMap(c => c.roomNumbers || []).map(String));
            const conflict = roomsList.some(r => {
                if (r.id === currentRowId) return false;
                if (r.roomType.trim().toLowerCase() === typeName.trim().toLowerCase()) return true;
                const assigned = r.assignedRooms && r.assignedRooms.length > 0 ? r.assignedRooms : [r.roomNumber];
                return assigned.some(rm => suiteRooms.has(String(rm)));
            });
            return conflict ? 1 : 0;
        }
        return roomsList
            .filter(r => r.id !== currentRowId && isMatchingRoomType(r.roomType, typeName))
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

    // Overbooking validation check across the entire form
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
        const suite = activeConnectingSuites.find(s => s.name.trim().toLowerCase() === row.roomType.trim().toLowerCase());
        if (suite) {
            const suiteRooms = suite.componentRooms.flatMap(c => c.roomNumbers || []).map(String);
            if (suiteRooms.length > 0) return suiteRooms;
        }

        const takenBefore = new Set<string>();
        for (const r of roomsList) {
            if (r.id === row.id) break;
            const rCount = Number(r.roomsCount) || 1;
            if (r.assignedRooms && r.assignedRooms.length > 0) {
                r.assignedRooms.forEach(rn => takenBefore.add(rn));
            } else {
                const freeForPrev = liveAvailabilityReport.availableRooms
                    .filter(ar => isMatchingRoomType(ar.roomTypeName, r.roomType) && !takenBefore.has(ar.number))
                    .slice(0, rCount)
                    .map(ar => ar.number);
                freeForPrev.forEach(rn => takenBefore.add(rn));
            }
        }

        const countNeeded = Number(row.roomsCount) || 1;
        const matchingAvailable = liveAvailabilityReport.availableRooms
            .filter(ar => isMatchingRoomType(ar.roomTypeName, row.roomType) && !takenBefore.has(ar.number))
            .slice(0, countNeeded)
            .map(ar => ar.number);

        if (matchingAvailable.length > 0) {
            return matchingAvailable;
        }
        return [row.roomNumber || '101'];
    };

    // Front Desk Split Action: Split multi-room group row into individual 1-room rows
    const handleSplitRowIntoRooms = (rowId: number) => {
        const targetRow = roomsList.find(r => r.id === rowId);
        if (!targetRow || targetRow.roomsCount <= 1) return;

        const count = targetRow.roomsCount;
        const assigned = targetRow.assignedRooms && targetRow.assignedRooms.length === count
            ? targetRow.assignedRooms
            : getAutoAssignedRoomsForRow(targetRow);

        const targetIndex = roomsList.findIndex(r => r.id === rowId);
        let maxId = Math.max(...roomsList.map(r => r.id));

        const newRows: RoomRow[] = assigned.map((roomNum, idx) => {
            const dateConf = targetRow.roomDatesMap?.[roomNum];
            return {
                ...targetRow,
                id: idx === 0 ? targetRow.id : ++maxId,
                roomsCount: 1,
                roomNumber: roomNum,
                assignedRooms: [roomNum],
                isAssign: false, // split into explicit individual room rows
                checkInDate: dateConf?.checkIn || targetRow.checkInDate || checkIn,
                checkOutDate: dateConf?.checkOut || targetRow.checkOutDate || checkOut,
                nights: dateConf?.nights || targetRow.nights || Math.max(1, nights),
                adults: Math.max(1, Math.round(targetRow.adults / count)) || 1,
                children: 0,
                childrenAges: [],
                roomDatesMap: undefined
            };
        });

        const updatedList = [...roomsList];
        updatedList.splice(targetIndex, 1, ...newRows);
        setRoomsList(updatedList);
        toast.success(`Split into ${count} individual room rows (${assigned.join(', ')})!`);
    };

    // Handlers
    const handleAddRoomRow = () => {
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
        const freeRoom = liveAvailabilityReport.availableRooms.find(r =>
            (r.roomTypeName === 'Deluxe Double' || r.roomTypeName.includes('Deluxe')) && !usedRooms.has(r.number)
        ) || liveAvailabilityReport.availableRooms.find(r => !usedRooms.has(r.number));

        if (!freeRoom) {
            toast.error('Overbooking Prevented: All available rooms are already assigned in this form!');
            return;
        }
        const nextRoom = freeRoom.number;

        const defPlan = availableRatePlans[0]?.name || '';
        const defRate = calculateTariffForRatePlan(defPlan, freeRoom.roomTypeName, freeRoom.baseRate || 3000, 1, 0, availableRatePlans);

        setRoomsList([
            ...roomsList,
            {
                id: nextId,
                roomType: freeRoom.roomTypeName,
                roomsCount: 1,
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
            }
        ]);
    };

    const handleCopyRoomRow = (row: RoomRow) => {
        if (remainingOverallFreeRooms <= 0) {
            toast.error('Overbooking Prevented: No more available rooms in inventory for the selected dates!');
            return;
        }
        const nextId = Math.max(...roomsList.map(r => r.id)) + 1;
        const usedRooms = new Set<string>();
        roomsList.forEach(r => {
            if (r.assignedRooms && r.assignedRooms.length > 0) {
                r.assignedRooms.forEach(rn => usedRooms.add(rn));
            } else if (r.roomNumber) {
                usedRooms.add(r.roomNumber);
            }
        });
        const freeRoom = liveAvailabilityReport.availableRooms.find(r =>
            (r.roomTypeName === row.roomType || r.roomTypeName.includes(row.roomType)) && !usedRooms.has(r.number)
        ) || liveAvailabilityReport.availableRooms.find(r => !usedRooms.has(r.number));

        if (!freeRoom) {
            toast.error('Overbooking Prevented: No more rooms available to duplicate this row!');
            return;
        }
        const nextRoom = freeRoom.number;

        const copiedType = freeRoom.roomTypeName || row.roomType;
        const capacity = getRoomTypeCapacity(copiedType);
        const safeAdults = Math.max(1, Math.min(row.adults, capacity.maxAdults));
        const safeChildren = Math.min(row.children, capacity.maxChildren);
        const standardRate = getStandardDailyRateForRoom(nextRoom, copiedType);
        const resolvedRate = calculateTariffForRatePlan(row.ratePlan, copiedType, standardRate, safeAdults, safeChildren, availableRatePlans);

        setRoomsList([
            ...roomsList,
            {
                ...row,
                id: nextId,
                roomType: copiedType,
                roomsCount: 1,
                roomNumber: nextRoom,
                assignedRooms: [nextRoom],
                adults: safeAdults,
                children: safeChildren,
                childrenAges: (row.childrenAges || []).slice(0, safeChildren),
                rate: resolvedRate
            }
        ]);
    };

    const handleRemoveRoomRow = (id: number) => {
        if (roomsList.length === 1) return;
        setRoomsList(roomsList.filter(r => r.id !== id));
    };

    const updateRoomRow = (id: number, field: keyof RoomRow, value: any) => {
        setRoomsList(prev => {
            // 1. Update target row
            const updated = prev.map(r => {
                if (r.id !== id) return r;
                if (field === 'ratePlan') {
                    const planName = String(value);
                    const standardRate = getStandardDailyRateForRoom(r.roomNumber, r.roomType);
                    const newRate = calculateTariffForRatePlan(planName, r.roomType, standardRate, r.adults, r.children, availableRatePlans);
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
                        toast.warning(`Capacity Limit: Maximum ${capacity.maxAdults} adult(s) permitted for ${r.roomType}!`);
                    }
                    const standardRate = getStandardDailyRateForRoom(r.roomNumber, r.roomType);
                    const newRate = calculateTariffForRatePlan(r.ratePlan, r.roomType, standardRate, newAdults, r.children, availableRatePlans);
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
                    const standardRate = getStandardDailyRateForRoom(r.roomNumber, r.roomType);
                    const newRate = calculateTariffForRatePlan(r.ratePlan, r.roomType, standardRate, r.adults, newChildren, availableRatePlans);
                    return {
                        ...r,
                        children: newChildren,
                        rate: newRate
                    };
                }
                if (field === 'roomType') {
                    const newTypeName = String(value);
                    const suite = activeConnectingSuites.find(s => s.name.trim().toLowerCase() === newTypeName.trim().toLowerCase());
                    if (suite) {
                        const suiteRooms = suite.componentRooms.flatMap(c => c.roomNumbers || []).map(String);
                        const otherUsed = new Set<string>();
                        prev.filter(other => other.id !== id).forEach(other => {
                            if (other.assignedRooms && other.assignedRooms.length > 0) {
                                other.assignedRooms.forEach(rn => otherUsed.add(String(rn)));
                            } else if (other.roomNumber) {
                                otherUsed.add(String(other.roomNumber));
                            }
                        });

                        const conflictRoom = suiteRooms.find(rn => otherUsed.has(rn));
                        if (conflictRoom) {
                            toast.error(`Cannot select ${suite.name}: Room ${conflictRoom} is already selected in another row!`);
                            return r;
                        }

                        const unavailRoom = suiteRooms.find(rn => {
                            const st = liveAvailabilityReport.allRoomsStatus.find(s => String(s.room.number) === rn);
                            return !st || !st.isAvailable;
                        });
                        if (unavailRoom) {
                            toast.error(`Cannot select ${suite.name}: Room ${unavailRoom} is currently booked or unavailable!`);
                            return r;
                        }

                        // Calculate tariff
                        let suiteRate = Number(suite.fixedPrice) || 0;
                        if (suiteRate <= 0 || suite.pricingStrategy === 'Sum of Rates') {
                            suiteRate = suiteRooms.reduce((sum, rm) => {
                                const rObj = liveAvailabilityReport.allRoomsStatus.find(s => String(s.room.number) === rm);
                                const std = getStandardDailyRateForRoom(rm, rObj?.room.roomTypeName);
                                return sum + (std || 3000);
                            }, 0);
                        }

                        const totalAdultsCapacity = Math.max(2, suiteRooms.length * 2);
                        const totalChildrenCapacity = Math.max(1, suiteRooms.length * 1);
                        const clampedAdults = Math.max(1, Math.min(r.adults, totalAdultsCapacity));
                        const clampedChildren = Math.min(r.children, totalChildrenCapacity);

                        toast.success(`🔗 Connecting Suite selected: Auto-assigned interconnected rooms ${suiteRooms.join(' & ')}!`);

                        return {
                            ...r,
                            roomType: suite.name,
                            roomsCount: 1,
                            assignedRooms: suiteRooms,
                            roomNumber: suiteRooms[0] || '101',
                            adults: clampedAdults,
                            children: clampedChildren,
                            rate: suiteRate
                        };
                    }

                    const maxForNewType = getMaxRoomsAllowedForRow(value, id);
                    if (maxForNewType <= 0) {
                        toast.error(`Overbooking Prevented: No rooms available in "${value}" for the selected dates!`);
                        return r;
                    }
                    const otherUsed = new Set<string>();
                    prev.filter(other => other.id !== id).forEach(other => {
                        if (other.assignedRooms && other.assignedRooms.length > 0) {
                            other.assignedRooms.forEach(rn => otherUsed.add(rn));
                        } else if (other.roomNumber) {
                            otherUsed.add(other.roomNumber);
                        }
                    });
                    const matchingFreeRooms = liveAvailabilityReport.availableRooms.filter(
                        rn => isMatchingRoomType(rn.roomTypeName, value) && !otherUsed.has(rn.number)
                    );
                    const safeCount = Math.max(1, Math.min(r.roomsCount, maxForNewType));
                    const autoAssigned = matchingFreeRooms.slice(0, safeCount).map(rn => rn.number);
                    const nextRoom = autoAssigned[0] || matchingFreeRooms[0]?.number || r.roomNumber;
                    const standardRate = getStandardDailyRateForRoom(nextRoom, value);

                    const newCapacity = getRoomTypeCapacity(value);
                    const clampedAdults = Math.max(1, Math.min(r.adults, newCapacity.maxAdults));
                    const clampedChildren = Math.min(r.children, newCapacity.maxChildren);
                    const clampedAges = (r.childrenAges || []).slice(0, clampedChildren);
                    if (r.adults > newCapacity.maxAdults || r.children > newCapacity.maxChildren) {
                        toast.info(`Occupancy adjusted to fit ${value} limits (Max Adults: ${newCapacity.maxAdults}, Max Child: ${newCapacity.maxChildren}).`);
                    }

                    const resolvedRate = calculateTariffForRatePlan(r.ratePlan, value, standardRate, clampedAdults, clampedChildren, availableRatePlans);
                    return {
                        ...r,
                        roomType: value,
                        adults: clampedAdults,
                        children: clampedChildren,
                        childrenAges: clampedAges,
                        roomNumber: nextRoom,
                        roomsCount: safeCount,
                        assignedRooms: autoAssigned.length > 0 ? autoAssigned : [nextRoom],
                        rate: resolvedRate
                    };
                }
                if (field === 'roomNumber') {
                    const selectedRoomNum = String(value);
                    const standardRate = getStandardDailyRateForRoom(selectedRoomNum, r.roomType);
                    const newRate = calculateTariffForRatePlan(r.ratePlan, r.roomType, standardRate, r.adults, r.children, availableRatePlans);
                    return {
                        ...r,
                        roomNumber: selectedRoomNum,
                        assignedRooms: [selectedRoomNum],
                        rate: newRate
                    };
                }
                if (field === 'roomsCount') {
                    const suite = activeConnectingSuites.find(s => s.name.trim().toLowerCase() === r.roomType.trim().toLowerCase());
                    if (suite) {
                        toast.info(`${suite.name} is a 1-unit interconnecting suite.`);
                        return {
                            ...r,
                            roomsCount: 1,
                            assignedRooms: suite.componentRooms.flatMap(c => c.roomNumbers || []).map(String)
                        };
                    }
                    const rawVal = Number(value);
                    const maxAllowed = getMaxRoomsAllowedForRow(r.roomType, id);
                    if (maxAllowed <= 0) {
                        toast.error(`Overbooking Prevented: No rooms available for ${r.roomType}!`);
                        return r;
                    }
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
            });

            // 2. Ensure uniqueness of room numbers across single rows in this booking form
            const allocatedSet = new Set<string>();
            return updated.map((r, idx) => {
                if (r.roomsCount === 1 && allocatedSet.has(r.roomNumber)) {
                    const freeRoom = liveAvailabilityReport.availableRooms.find(rn =>
                        !allocatedSet.has(rn.number)
                    );
                    const newRoomNum = freeRoom ? freeRoom.number : String(100 + (idx + 1) * 2);
                    allocatedSet.add(newRoomNum);
                    return { ...r, roomNumber: newRoomNum, assignedRooms: [newRoomNum] };
                }
                if (r.roomNumber) allocatedSet.add(r.roomNumber);
                return r;
            });
        });
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

    // Save Reservation with Atomic Pre-Commit Validation Guard
    const handleFinalizeBooking = (actionType: 'reserve' | 'checkin' | 'hold') => {
        if (availableRatePlans.length === 0) {
            toast.error('Cannot proceed: No Rate Plans configured. Please configure Rate Plans in Rate Plan Management (/rate-plans) first!');
            return;
        }

        if (hasOverbookingError) {
            toast.error('Overbooking Prevented: Requested rooms exceed available inventory for the selected dates!');
            return;
        }

        if (!guestName.trim()) {
            toast.error('Guest full name is required. Please complete Step 2 (Guest Information).');
            setStep(2);
            return;
        }

        if (!mobile.trim() && !phone.trim()) {
            toast.error('Guest mobile or contact phone is required in Step 2.');
            setStep(2);
            return;
        }

        if (activeBlacklistAlert && !managerOverrideApproved) {
            toast.error('❌ Booking Blocked: Guest is on the Blacklist. Duty Manager Override is required.');
            setStep(2);
            return;
        }

        const reservationNumber = editingReservation?.reservationNumber || `RES-${String(Math.floor(100000 + Math.random() * 900000))}`;
        const reservationId = editingReservation?.id || Date.now();
        const statusVal = actionType === 'checkin' ? 'in-house' : actionType === 'hold' ? 'hold' : (editingReservation?.status || 'confirmed');

        // Allocate physical rooms strictly from genuinely available rooms across ALL rows and their quantities
        const usedRoomsAcrossBooking = new Set<string>();
        const allocatedRoomNumbers: string[] = [];
        const rowAllocatedMap = new Map<number, string[]>();

        for (const r of roomsList) {
            const suite = activeConnectingSuites.find(s => s.name.trim().toLowerCase() === r.roomType.trim().toLowerCase());
            if (suite) {
                const suiteRooms = suite.componentRooms.flatMap(c => c.roomNumbers || []).map(String);
                const conflict = suiteRooms.find(rm => usedRoomsAcrossBooking.has(rm));
                if (conflict) {
                    toast.error(`Overbooking Prevented: Room ${conflict} in ${suite.name} is already allocated!`);
                    return;
                }
                rowAllocatedMap.set(r.id, suiteRooms);
                suiteRooms.forEach(rm => {
                    allocatedRoomNumbers.push(rm);
                    usedRoomsAcrossBooking.add(rm);
                });
                continue;
            }

            const countNeeded = Number(r.roomsCount) || 1;
            let roomsForThisRow: string[] = [];

            if (!r.isAssign && r.assignedRooms && r.assignedRooms.length === countNeeded && r.assignedRooms.every(rm => !usedRoomsAcrossBooking.has(rm))) {
                roomsForThisRow = [...r.assignedRooms];
            } else if (!r.isAssign && countNeeded === 1 && r.roomNumber && !usedRoomsAcrossBooking.has(r.roomNumber)) {
                roomsForThisRow = [r.roomNumber];
            } else {
                // Auto assign: pick countNeeded available rooms
                const rIn = r.checkInDate || checkIn;
                const rOut = r.checkOutDate || checkOut;
                const report = getAvailableRoomsForStay(rIn, rOut, r.roomType);
                const freeRooms = report.availableRooms.filter(ar => !usedRoomsAcrossBooking.has(ar.number));
                roomsForThisRow = freeRooms.slice(0, countNeeded).map(ar => ar.number);

                // Fallback if not enough matching
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

        const hasConnectingSuite = roomsList.some(r =>
            activeConnectingSuites.some(s => s.name.trim().toLowerCase() === r.roomType.trim().toLowerCase())
        );
        const isConnectingSuite = hasConnectingSuite && roomsList.length === 1 && totalRoomsCount === 1;

        const mainRoom = roomsList[0] || { roomNumber: '101', roomType: 'Deluxe Double' };
        const primaryRoomNumber = isConnectingSuite && allocatedRoomNumbers.length > 1
            ? allocatedRoomNumbers.join(' + ')
            : (allocatedRoomNumbers[0] || mainRoom.roomNumber);

        const newReservation = {
            id: reservationId,
            reservationNumber,
            registrationNumber: statusVal === 'in-house' ? (editingReservation?.registrationNumber || `REG-${reservationNumber.replace(/^RES-/, '')}`) : editingReservation?.registrationNumber,
            folioNumber: editingReservation?.folioNumber || `FOL-${reservationNumber.replace(/^RES-/, '')}`,
            groupCode: isConnectingSuite ? undefined : (editingReservation?.groupCode || (totalRoomsCount > 1 ? `GRP-${reservationNumber.replace(/^RES-/, '')}` : undefined)),
            guestId: selectedExistingGuest?.id,
            guestName: `${salutation} ${guestName.trim()}`,
            phone: mobile || phone,
            email: email,
            roomNumber: primaryRoomNumber,
            roomType: mainRoom.roomType,
            smokingPolicy: getRoomSmokingPolicy(allocatedRoomNumbers[0] || mainRoom.roomNumber).smokingStatus,
            smokingPolicyText: getRoomSmokingPolicy(allocatedRoomNumbers[0] || mainRoom.roomNumber).policyBadgeText,
            smokingClause: getRoomSmokingPolicy(allocatedRoomNumbers[0] || mainRoom.roomNumber).guestFacingClause,
            policies: getHotelReservationPolicies(allocatedRoomNumbers[0] || mainRoom.roomNumber),
            allocatedRooms: allocatedRoomNumbers,
            roomsCount: isConnectingSuite ? 1 : totalRoomsCount,
            checkIn: groupHorizon.hasCustomDates ? groupHorizon.minIn : checkIn,
            checkOut: groupHorizon.hasCustomDates ? groupHorizon.maxOut : checkOut,
            nights: groupHorizon.hasCustomDates ? groupHorizon.spanNights : nights,
            isGroup: isConnectingSuite ? false : (totalRoomsCount > 1),
            isConnectingSuite,
            staggeredDates: groupHorizon.hasCustomDates,
            dayUse,
            adults: mainRoom.adults,
            children: mainRoom.children,
            status: statusVal,
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
            idType,
            idNumber,
            nationality,
            homeCountry,
            homeCity,
            address: streetAddress,
            postalCode,
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
            specialRequests: remarksMap['Guest'] || '',
            roomsList: roomsList.flatMap((r) => {
                const suite = activeConnectingSuites.find(s => s.name.trim().toLowerCase() === r.roomType.trim().toLowerCase());
                if (suite) {
                    const assigned = rowAllocatedMap.get(r.id) || r.assignedRooms || suite.componentRooms.flatMap(c => c.roomNumbers || []);
                    return [{
                        ...r,
                        roomsCount: 1,
                        roomNumber: assigned.join(' + '),
                        assignedRooms: assigned,
                        checkInDate: r.checkInDate || checkIn,
                        checkOutDate: r.checkOutDate || checkOut,
                        nights: r.nights || Math.max(1, nights)
                    }];
                }
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
                        checkInDate: dateConf?.checkIn || r.checkInDate || checkIn,
                        checkOutDate: dateConf?.checkOut || r.checkOutDate || checkOut,
                        nights: dateConf?.nights || r.nights || Math.max(1, nights)
                    };
                });
            }),
            servicesBundle: mainRoom.servicesBundle || { extraBed: mainRoom.extraBed, pickup: mainRoom.pickup },
            extraBed: mainRoom.servicesBundle?.extraBed || mainRoom.extraBed || null,
            pickup: mainRoom.servicesBundle?.pickup || mainRoom.pickup || null,
            mealPlan: mainRoom.servicesBundle?.mealPlan || null,
            celebration: mainRoom.servicesBundle?.celebration || null,
            spaWellness: mainRoom.servicesBundle?.spaWellness || null,
            timingFlex: mainRoom.servicesBundle?.timingFlex || null,
            customAddons: mainRoom.servicesBundle?.customAddons || [],
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

        // Two-Phase Atomic Pre-Commit Validation Guard
        const commitResult = validateAndCommitReservation(newReservation);
        if (!commitResult.success) {
            toast.error(commitResult.errorMessage || 'Cannot complete booking: Room is already booked or locked!');
            if (commitResult.suggestedAlternates && commitResult.suggestedAlternates.length > 0) {
                const alt = commitResult.suggestedAlternates[0];
                if (alt.alternatives.length > 0) {
                    toast.warning(`Suggestion: Room ${alt.alternatives.map(a => a.number).join(', ')} is available in category ${alt.roomType}.`);
                }
            }
            return;
        }

        // If in Edit Mode, update existing booking in Local Storage and PostgreSQL DB
        if (isEditMode && editingReservation) {
            try {
                const allStored = getAllStoredReservations();
                const updatedReservations = allStored.map(r =>
                    (String(r.id) === String(editingReservation.id) || r.reservationNumber === editingReservation.reservationNumber)
                        ? { ...r, ...newReservation, id: editingReservation.id, reservationNumber: editingReservation.reservationNumber }
                        : r
                );
                saveStoredReservations(updatedReservations);
                updateReservationInDB(editingReservation.id, {
                    ...newReservation,
                    id: editingReservation.id,
                    reservationNumber: editingReservation.reservationNumber
                });
                sessionStorage.removeItem('hotel_edit_reservation_id');
                toast.success(`Reservation ${editingReservation.reservationNumber} updated successfully!`);
                setCreatedReservation({
                    ...newReservation,
                    id: editingReservation.id,
                    reservationNumber: editingReservation.reservationNumber
                });
                return;
            } catch (err) {
                console.error('Error updating existing reservation:', err);
                toast.error('Failed to update reservation.');
                return;
            }
        }

        // If hold, also push to holds list
        if (actionType === 'hold') {
            try {
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
                    estimatedAmount: finalPayable
                });
                localStorage.setItem('hotel_holds_v2', JSON.stringify(holdsList));
            } catch (e) {
                console.error(e);
            }
        }

        // Synchronize and persist guest profile in hotel_guest_profiles_v2
        try {
            const rawProfiles = localStorage.getItem('hotel_guest_profiles_v2');
            const profiles: any[] = rawProfiles ? JSON.parse(rawProfiles) : [];
            const cleanName = guestName.trim();
            const inputCleanEmail = (email || '').trim().toLowerCase();
            const inputCleanId = (idNumber || '').trim().toLowerCase();

            const existingIdx = selectedExistingGuest
                ? profiles.findIndex(p => String(p.id) === String(selectedExistingGuest.id) || (p.name && p.name.trim().toLowerCase() === selectedExistingGuest.name.trim().toLowerCase()))
                : profiles.findIndex(p => {
                    const nameMatch = Boolean(cleanName && p.name && p.name.trim().toLowerCase() === cleanName.toLowerCase());
                    const idMatch = Boolean(inputCleanId && p.idNumber && inputCleanId === p.idNumber.trim().toLowerCase());
                    const emailMatch = Boolean(inputCleanEmail && p.email && inputCleanEmail === p.email.trim().toLowerCase() && !inputCleanEmail.includes('guest.com'));
                    const phoneMatch = Boolean((mobile || phone) && isSamePhoneNumber(mobile || phone, p.phone));
                    if ((phoneMatch || emailMatch) && !nameMatch) return false;
                    return nameMatch || idMatch;
                });

            const stayRecord = {
                resNumber: reservationNumber,
                roomNumber: primaryRoomNumber,
                roomType: mainRoom.roomType,
                checkIn: newReservation.checkIn,
                checkOut: newReservation.checkOut,
                nights: newReservation.nights,
                totalAmountBDT: finalPayable,
                status: actionType === 'checkin' ? ('In-House' as const) : ('Confirmed' as const)
            };

            if (existingIdx >= 0) {
                profiles[existingIdx].totalStays = (profiles[existingIdx].totalStays || 0) + 1;
                profiles[existingIdx].totalNights = (profiles[existingIdx].totalNights || 0) + newReservation.nights;
                profiles[existingIdx].lifetimeSpendBDT = (profiles[existingIdx].lifetimeSpendBDT || 0) + finalPayable;
                profiles[existingIdx].lastStayDate = newReservation.checkIn;
                if (!profiles[existingIdx].stayHistory) profiles[existingIdx].stayHistory = [];
                profiles[existingIdx].stayHistory.unshift(stayRecord);
                if (email) profiles[existingIdx].email = email;
                if (companyName) profiles[existingIdx].company = companyName;
                if (idType) profiles[existingIdx].idType = idType;
                if (idNumber) profiles[existingIdx].idNumber = idNumber;
                if (nationality) profiles[existingIdx].nationality = nationality;
                if (homeCountry) profiles[existingIdx].homeCountry = homeCountry;
                if (homeCity) profiles[existingIdx].homeCity = homeCity;
                if (streetAddress) profiles[existingIdx].address = streetAddress;
                if (postalCode) profiles[existingIdx].postalCode = postalCode;
                if (dob) profiles[existingIdx].dob = dob;
                if (gender) profiles[existingIdx].gender = gender;
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
                    title: salutation ? `${salutation}.` : 'Mr.',
                    name: cleanName,
                    phone: mobile || phone,
                    altPhone: phone !== mobile ? phone : undefined,
                    email: email || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@guest.com`,
                    vipTier: vipStatus === 'VVIP' ? 'Platinum VIP' : vipStatus === 'VIP-2' ? 'Gold' : vipStatus === 'VIP-1' ? 'Silver' : 'Regular',
                    nationality: nationality || 'Bangladeshi',
                    idType: idType || 'National ID (NID)',
                    idNumber: idNumber || `KYC-${Math.floor(10000 + Math.random() * 90000)}`,
                    dob: dob || '1990-01-01',
                    gender: gender || 'Male',
                    homeCity: homeCity || '',
                    homeCountry: homeCountry || '',
                    address: streetAddress || '',
                    postalCode: postalCode || '',
                    company: companyName || '',
                    designation: designation || '',
                    passportVisaNumber: idType === '' ? passportVisaNumber : undefined,
                    passportVisaType: idType === '' ? passportVisaType : undefined,
                    passportVisaExpiry: idType === '' ? passportVisaExpiry : undefined,
                    passportEntryPort: idType === 'Pasport' ? passportEntryPort : undefined,
                    drivingVehicleClass: idType === 'Driving License' ? drivingVehicleClass : undefined,
                    fatherOrSpouseName: idType === 'ID' ? fatherOrSpouseName : undefined,
                    idIssueDate,
                    idExpiryDate,
                    idIssueCountry,
                    idIssuePlace,
                    totalStays: 1,
                    totalNights: newReservation.nights,
                    lifetimeSpendBDT: finalPayable,
                    lastStayDate: newReservation.checkIn,
                    loyaltyPoints: Math.round(finalPayable / 20),
                    preferences: {
                        roomType: mainRoom.roomType,
                        floorPreference: floorPreference,
                        bedType: bedPreference,
                        pillowType: 'Feather / Down',
                        smoking: smokingPreference,
                        dietary: dietaryPreference,
                        newspaper: 'The Daily Star',
                        specialNotes: remarksMap['Guest'] || ''
                    },
                    stayHistory: [stayRecord],
                    emergencyContact: emergencyName ? {
                        name: emergencyName,
                        relationship: emergencyRelation,
                        phone: emergencyPhone
                    } : undefined
                });
            }
            localStorage.setItem('hotel_guest_profiles_v2', JSON.stringify(profiles));
        } catch (e) {
            console.error('Error synchronizing guest profile:', e);
        }

        toast.success(`Reservation ${reservationNumber} confirmed successfully!`);
        setCreatedReservation(newReservation);
    };

    const resetForm = () => {
        sessionStorage.removeItem('hotel_edit_reservation_id');
        setEditingReservation(null);
        setIsEditMode(false);
        setStep(1);
        const sys = getSystemDateISO();
        setCheckIn(sys);
        setNights(1);
        setCheckOut(getNextDayISO(sys, 1));
        setDayUse(false);
        setGuestName('');
        setMobile('');
        setEmail('');
        setSelectedExistingGuest(null);
        setGuestSearchQuery('');
        setStep2Tab('profile');
        setCreatedReservation(null);
    };

    return (
        <div className="p-2 sm:p-3 bg-[#f0f4f8] min-h-full flex flex-col gap-2.5 font-sans text-xs text-gray-800 animate-in fade-in duration-150">
            {/* Top Navigation & Breadcrumb Bar */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs px-3 py-1.5 flex items-center justify-between gap-2.5 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg text-white flex items-center justify-center shadow-xs flex-shrink-0 ${isEditMode ? 'bg-amber-600' : 'bg-[#1e3a8a]'
                        }`}>
                        {isEditMode ? <Edit3 size={14} /> : <Plus size={14} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xs text-gray-900 tracking-tight font-bold">
                                {isEditMode ? `Edit Reservation: ${editingReservation?.reservationNumber}` : 'Add New Reservation'}
                            </h1>
                            <span className={`px-1.5 py-0.2 text-[8.5px] rounded border font-semibold ${isEditMode
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                {isEditMode ? `Edit Mode (${(editingReservation?.status || 'Confirmed').toUpperCase()})` : '3-Step Wizard'}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500">
                            {isEditMode
                                ? `Modifying booking for ${editingReservation?.guestName || 'guest'}. All stay dates, rooms, guest KYC, and billing can be updated.`
                                : 'Check availability, allocate rooms, record guest profile, and settle advance tariffs.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {isEditMode && (
                        <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="h-8 px-3 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                            <X size={13} />
                            <span>Cancel Edit</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            sessionStorage.removeItem('hotel_edit_reservation_id');
                            setActivePage('reservations');
                        }}
                        className="h-8 px-3 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Reservations List"
                    >
                        <List size={13} className="text-gray-500" />
                        <span>Reservations List</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            sessionStorage.removeItem('hotel_edit_reservation_id');
                            setActivePage('stay-view');
                        }}
                        className="h-8 px-3 bg-white border border-gray-200 hover:bg-gray-50 hover:border-blue-300 text-blue-700 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Open Stay View Calendar"
                    >
                        <Calendar size={13} className="text-blue-600" />
                        <span>Stay View</span>
                    </button>
                </div>
            </div>

            {/* In-House Notice Banner if Editing an Active In-House Stay */}
            {editingReservation && (editingReservation.status === 'in-house' || editingReservation.status === 'checked-in') && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-2.5 flex items-center justify-between text-amber-950 text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                        <span>
                            <strong>In-House Guest Notice:</strong> This reservation is already checked in (Room {editingReservation.roomNumber}). Stay extensions or room moves should be performed via <strong>Stay View (Room Move / Amend)</strong>.
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setActivePage('stay-view')}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold cursor-pointer shadow-2xs whitespace-nowrap"
                    >
                        Open in Stay View
                    </button>
                </div>
            )}

            {/* Main Form Card Container */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs overflow-hidden flex flex-col flex-1">
                {/* Stepper Navigation: Responsive Segmented Track */}
                <div className="bg-slate-50/80 border-b border-gray-200/80 px-3 py-2 flex items-center justify-center select-none flex-shrink-0">
                    <div className="w-full max-w-[680px] grid grid-cols-3 gap-2">
                        {/* Step 1 */}
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg border text-xs transition-all cursor-pointer ${step === 1
                                ? 'bg-white border-blue-500 text-blue-900 shadow-xs ring-1 ring-blue-500/20'
                                : step > 1
                                    ? 'bg-blue-50/60 border-blue-200 text-blue-800 font-medium hover:bg-blue-100/50'
                                    : 'bg-white/60 border-gray-200 text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0 transition-colors ${step === 1
                                ? 'bg-[#1e3a8a] text-white shadow-xs'
                                : step > 1
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                {step > 1 ? <Check size={11} className="stroke-[3]" /> : '1'}
                            </div>
                            <span className="truncate tracking-tight font-medium">Check Availability</span>
                        </button>

                        {/* Step 2 */}
                        <button
                            type="button"
                            onClick={() => {
                                if (step === 1 && hasOverbookingError) {
                                    toast.error('Cannot proceed: Requested rooms exceed available inventory!');
                                    return;
                                }
                                setStep(2);
                            }}
                            className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg border text-xs transition-all cursor-pointer ${step === 2
                                ? 'bg-white border-blue-500 text-blue-900 shadow-xs ring-1 ring-blue-500/20'
                                : isGuestProfileComplete
                                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-800 font-medium hover:bg-emerald-100/60'
                                    : 'bg-white/60 border-gray-200 text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0 transition-colors ${step === 2
                                ? 'bg-[#1e3a8a] text-white shadow-xs'
                                : isGuestProfileComplete
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                {isGuestProfileComplete ? <Check size={11} className="stroke-[3]" /> : '2'}
                            </div>
                            <div className="flex items-center gap-1 min-w-0">
                                <span className="truncate tracking-tight font-medium">Guest Info</span>
                            </div>
                        </button>

                        {/* Step 3 */}
                        <button
                            type="button"
                            onClick={() => {
                                if (step === 1 && hasOverbookingError) {
                                    toast.error('Cannot proceed: Requested rooms exceed available inventory!');
                                    return;
                                }
                                if (!isGuestProfileComplete) {
                                    toast.warning('Please enter guest full name and contact number in Step 2.');
                                    setStep(2);
                                    return;
                                }
                                if (activeBlacklistAlert && !managerOverrideApproved) {
                                    toast.error('❌ CANNOT PROCEED: Guest is blacklisted. Duty Manager Override is required to continue.');
                                    setStep(2);
                                    return;
                                }
                                setStep(3);
                            }}
                            className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg border text-xs transition-all cursor-pointer ${step === 3
                                ? 'bg-white border-blue-500 text-blue-900 shadow-xs ring-1 ring-blue-500/20'
                                : 'bg-white/60 border-gray-200 text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] flex-shrink-0 transition-colors ${step === 3
                                ? 'bg-[#1e3a8a] text-white shadow-xs'
                                : 'bg-gray-200 text-gray-600'
                                }`}>
                                3
                            </div>
                            <span className="truncate tracking-tight font-medium">Billing &amp; Pay</span>
                        </button>
                    </div>
                </div>

                {/* Form Step Body */}
                <div className="p-3 sm:p-3.5 flex-1 flex flex-col gap-3 overflow-y-auto">
                    {/* ========================================================
                        STEP 1: CHECK AVAILABILITY & ROOMS TABLE
                        ======================================================== */}
                    {step === 1 && (
                        <div className="space-y-3 animate-in fade-in duration-150">
                            {/* Parameters Card Container */}
                            <div className="bg-slate-50/70 border border-slate-200/90 rounded-lg p-3 shadow-2xs space-y-2.5">
                                {/* Top Parameters Row: Consolidated Stay Period Picker + Room(s) + Business Source + Business Agent */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                                    {/* Consolidated Single Stay Dates Controller (Spans 4 cols) */}
                                    <div className="md:col-span-4">
                                        <StayPeriodPicker
                                            checkIn={checkIn}
                                            checkOut={checkOut}
                                            nights={nights}
                                            dayUse={dayUse}
                                            onDateChange={(newIn, newOut, newNights) => {
                                                setCheckIn(newIn);
                                                if (dayUse) {
                                                    setCheckOut(newIn);
                                                    setNights(0);
                                                } else {
                                                    setCheckOut(newOut);
                                                    setNights(newNights);
                                                }
                                            }}
                                            label="Stay Period (Check In - Check Out)"
                                        />
                                    </div>

                                    {/* Day Use (Spans 2 cols) */}
                                    <div className="md:col-span-2 flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <Clock size={11} className="text-amber-600" />
                                            <span>Day Use</span>
                                        </label>
                                        <label
                                            className={`w-full h-8 px-2.5 rounded-md border flex items-center justify-center gap-2 text-[11px] font-semibold cursor-pointer select-none transition-all shadow-2xs ${dayUse
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

                                    {/* Room(s) (Spans 2 cols) - Displays total room count across all rows */}
                                    <div className="md:col-span-2 flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                                <BedDouble size={11} className="text-blue-600" />
                                                <span>Room(s)</span>
                                            </label>
                                            {groupHorizon.hasCustomDates && (
                                                <span
                                                    className="inline-flex items-center gap-1 text-[9px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200"
                                                    title={`Custom Dates: ${groupHorizon.minIn} ➔ ${groupHorizon.maxOut}`}
                                                >
                                                    <CalendarRange size={10} className="text-blue-600" />
                                                    <span>Custom</span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="relative w-full h-8">
                                            <input
                                                type="text"
                                                value={`${totalRoomsCount} ${totalRoomsCount === 1 ? 'Room' : 'Rooms'}`}
                                                disabled
                                                readOnly
                                                className="w-full h-full pl-7 pr-2 border border-slate-200 rounded-md text-[11px] bg-slate-100/90 text-slate-700 cursor-not-allowed text-center shadow-2xs"
                                            />
                                            <BedDouble size={12} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>

                                    {/* Business Source (Spans 2 cols) */}
                                    <div className="md:col-span-2 flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <span>Business Source</span>
                                        </label>
                                        <select
                                            value={businessSource}
                                            onChange={e => setBusinessSource(e.target.value)}
                                            className="w-full h-8 px-2 border border-slate-200 rounded-md text-[11px] bg-white text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-medium transition-all"
                                        >
                                            <option value="Direct">Direct</option>
                                            <option value="Booking.com">Booking.com</option>
                                            <option value="Agoda">Agoda</option>
                                            <option value="Corporate">Corporate</option>
                                            <option value="Walk-In">Walk-In</option>
                                        </select>
                                    </div>

                                    {/* Business Agent (Spans 2 cols) */}
                                    <div className="md:col-span-2 flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-700 uppercase tracking-wider flex items-center gap-1">
                                            <span>Business Agent</span>
                                        </label>
                                        <select
                                            value={businessAgent}
                                            onChange={e => setBusinessAgent(e.target.value)}
                                            className="w-full h-8 px-2 border border-slate-200 rounded-md text-[11px] bg-white text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer font-medium transition-all"
                                        >
                                            <option value="Direct">Direct</option>
                                            <option value="Front Desk">Front Desk</option>
                                            <option value="Expedia Partner">Expedia Partner</option>
                                            <option value="Corporate Manager">Corporate Manager</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Options Row */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer select-none hover:text-slate-900">
                                            <input
                                                type="radio"
                                                name="ratePerNight"
                                                checked={ratePerNight === 'Rate Per Night'}
                                                onChange={() => setRatePerNight('Rate Per Night')}
                                                className="text-blue-600 cursor-pointer"
                                            />
                                            <span>Rate Per Night</span>
                                        </label>

                                        <div className="flex items-center gap-2">
                                            <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer select-none hover:text-slate-900">
                                                <input
                                                    type="checkbox"
                                                    checked={taxApplicable}
                                                    onChange={e => setTaxApplicable(e.target.checked)}
                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                                <span>Tax &amp; VAT</span>
                                            </label>

                                            {taxApplicable && (
                                                <select
                                                    value={selectedTaxConfigId}
                                                    onChange={e => setSelectedTaxConfigId(e.target.value)}
                                                    className="h-6 px-1.5 border border-blue-200 rounded text-[10.5px] bg-blue-50/70 text-blue-900 font-semibold outline-none focus:border-blue-500 cursor-pointer"
                                                    title="Select statutory tax configuration configured at /taxes-vat"
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

                                    {/* Custom dates notice if active */}
                                    {groupHorizon.hasCustomDates && (
                                        <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-blue-800 bg-blue-50/90 px-2.5 py-0.5 rounded-md border border-blue-200 select-none shadow-2xs">
                                            <CalendarRange size={12} className="text-blue-600" />
                                            <span>Custom Stay Dates Active: <strong>{groupHorizon.minIn}</strong> ➔ <strong>{groupHorizon.maxOut}</strong></span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Rooms Configuration Table with Live Concurrency Guard */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <div className="px-3 py-2 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] text-slate-700 uppercase tracking-wider">
                                            Room Allocation &amp; Inventory Check
                                        </span>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] shadow-2xs transition-all ${remainingOverallFreeRooms > 0
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : 'bg-amber-50 text-amber-800 border-amber-300'
                                            }`}>
                                            <CheckCircle2 size={12} className={remainingOverallFreeRooms > 0 ? "text-emerald-600" : "text-amber-600"} />
                                            <span>{remainingOverallFreeRooms} of {liveAvailabilityReport.totalCount} Rooms Available</span>
                                            <span className="text-[9.5px] font-normal text-slate-500 font-mono">({totalRoomsAllocatedInForm} Selected)</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {groupHorizon.hasCustomDates ? (
                                            <span className="text-[10px] text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                                                <Users size={12} className="text-blue-600" />
                                                Group Horizon: <strong>{groupHorizon.minIn}</strong> to <strong>{groupHorizon.maxOut}</strong> ({groupHorizon.spanNights}N Span | {groupHorizon.totalRoomNights} Room-Nights)
                                            </span>
                                        ) : (
                                            <span className="text-[10.5px] text-slate-500 font-medium">
                                                Dates: <strong className="text-blue-900">{checkIn}</strong> to <strong className="text-blue-900">{checkOut}</strong> ({nights}N)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {hasOverbookingError && (
                                    <div className="mx-3 my-2 p-2 rounded-md bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-red-600 flex-shrink-0 animate-pulse" />
                                        <span>⚠️ Overbooking Warning: Room quantity exceeds total available rooms in this category! Please adjust room counts before proceeding.</span>
                                    </div>
                                )}

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-[11px]">
                                        <thead>
                                            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                                                <th className="py-2 px-2 pl-3 w-[18%]">Room Type</th>
                                                <th className="py-2 px-1 w-[7%] text-center" title="Rooms count (checks live inventory availability)">Rooms</th>
                                                <th className="py-2 px-1.5 w-[17%]">Rate Plan</th>
                                                <th className="py-2 px-1.5 w-[14%] text-center">Room</th>
                                                <th className="py-2 px-1 w-[6%] text-center" title="Adult capacity per room">Adult</th>
                                                <th className="py-2 px-1.5 w-[10%] text-center">Child</th>
                                                <th className="py-2 px-1.5 w-[9%] text-right">Tariff ({currencyCode})</th>
                                                <th className="py-2 px-1.5 w-[8%] text-right">Total</th>
                                                <th className="py-2 pr-3 pl-1.5 w-[11%] text-right whitespace-nowrap">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {roomsList.map(row => (
                                                <tr key={row.id} className="hover:bg-blue-50/20 transition-colors">
                                                    <td className="p-1.5 pl-3">
                                                        <select
                                                            value={row.roomType}
                                                            onChange={e => updateRoomRow(row.id, 'roomType', e.target.value)}
                                                            className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer font-medium text-slate-800 shadow-2xs"
                                                        >
                                                            <optgroup label="Standard Categories">
                                                                {standardRoomTypesList.map(typeOpt => {
                                                                    const availForRow = getMaxRoomsAllowedForRow(typeOpt, row.id);
                                                                    const isSoldOut = availForRow <= 0;
                                                                    return (
                                                                        <option
                                                                            key={typeOpt}
                                                                            value={typeOpt}
                                                                            disabled={isSoldOut && !isMatchingRoomType(row.roomType, typeOpt)}
                                                                        >
                                                                            {typeOpt} [{isSoldOut ? '0 - Sold Out' : availForRow}]
                                                                        </option>
                                                                    );
                                                                })}
                                                            </optgroup>
                                                            {activeConnectingSuites.length > 0 && (
                                                                <optgroup label="🔗 Connecting Room Suites">
                                                                    {activeConnectingSuites.map(suite => {
                                                                        const availForRow = getMaxRoomsAllowedForRow(suite.name, row.id);
                                                                        const isSoldOut = availForRow <= 0;
                                                                        const roomNums = suite.componentRooms.flatMap(c => c.roomNumbers || []).join(' & ');
                                                                        return (
                                                                            <option
                                                                                key={suite.name}
                                                                                value={suite.name}
                                                                                disabled={isSoldOut && row.roomType !== suite.name}
                                                                            >
                                                                                🔗 {suite.name} ({roomNums}) [{isSoldOut ? '0 - Sold Out' : `${availForRow} Suite`}]
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </optgroup>
                                                            )}
                                                        </select>
                                                        {/* Ultra-Compact & Elegant Active Addons Pill */}
                                                        {(() => {
                                                            const b = row.servicesBundle || { extraBed: row.extraBed, pickup: row.pickup };
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

                                                            const addonsCost = getRoomBundleTotal(b, getRowNights(row));
                                                            const scopeLabel = b.targetRoomNumber && b.targetRoomNumber !== 'All Rooms' ? ` (${b.targetRoomNumber})` : '';

                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setServiceModalConfig({ isOpen: true, rowId: row.id, initialTab: 'pickup' })}
                                                                    className="mt-1 w-full h-5.5 px-2 rounded-md bg-blue-50/90 hover:bg-blue-100 border border-blue-200/80 text-blue-900 text-[10px] font-semibold flex items-center justify-between shadow-2xs cursor-pointer transition-all select-none group"
                                                                    title={`Configured Services${scopeLabel}: ${activeNames.join(', ')} (Click to edit)`}
                                                                >
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        <Sparkles size={11} className="text-blue-600 flex-shrink-0" />
                                                                        <span className="truncate">{activeNames.slice(0, 2).join(', ')}{activeNames.length > 2 ? ` +${activeNames.length - 2}` : ''}{scopeLabel}</span>
                                                                    </div>
                                                                    <span className="text-[9px] text-blue-700 bg-white/90 px-1 rounded border border-blue-200/60 flex-shrink-0 ml-1">
                                                                        +৳{addonsCost.toLocaleString()}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="p-1.5 text-center">
                                                        {(() => {
                                                            const isConnectingSuite = activeConnectingSuites.some(s => s.name.trim().toLowerCase() === row.roomType.trim().toLowerCase());
                                                            if (isConnectingSuite) {
                                                                return (
                                                                    <div className="flex items-center justify-center">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            max={1}
                                                                            disabled={true}
                                                                            value={1}
                                                                            title="Interconnecting Suite is a 1-unit combined suite consisting of connected rooms."
                                                                            className="w-10 h-7 px-0.5 border border-blue-200 bg-blue-50/80 text-blue-900 rounded text-[11px] text-center font-bold outline-none cursor-not-allowed"
                                                                        />
                                                                    </div>
                                                                );
                                                            }

                                                            const maxAllowed = getMaxRoomsAllowedForRow(row.roomType, row.id);
                                                            const freeLeft = getRemainingFreeCountForType(row.roomType);
                                                            const isExceeded = (Number(row.roomsCount) || 1) > maxAllowed;

                                                            return (
                                                                <div className="flex items-center justify-center">
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
                                                                        title={`Rooms to book: ${row.roomsCount} (Max available in inventory: ${maxAllowed}, ${freeLeft} remaining unassigned)`}
                                                                        className={`w-10 h-7 px-0.5 border rounded text-[11px] text-center font-bold outline-none transition-all ${isExceeded
                                                                            ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-400'
                                                                            : 'border-gray-200 focus:border-blue-500 bg-white'
                                                                            }`}
                                                                    />
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="p-1.5">
                                                        <select
                                                            value={row.ratePlan}
                                                            onChange={e => updateRoomRow(row.id, 'ratePlan', e.target.value)}
                                                            className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                        >
                                                            {availableRatePlans.length === 0 ? (
                                                                <option value="" disabled>No rate plans configured</option>
                                                            ) : (
                                                                availableRatePlans.map(p => (
                                                                    <option key={p.id} value={p.name}>{p.name}</option>
                                                                ))
                                                            )}
                                                        </select>
                                                    </td>
                                                    <td className="p-1.5 text-center">
                                                        {(() => {
                                                            const assignedList = (row.assignedRooms && row.assignedRooms.length > 0)
                                                                ? row.assignedRooms
                                                                : getAutoAssignedRoomsForRow(row);

                                                            if (row.roomsCount > 1) {
                                                                // Multi-Room mode
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
                                                                            className="w-28 h-7 px-1.5 border border-blue-300 bg-blue-50/90 hover:bg-blue-100 text-blue-900 rounded-md text-[10.5px] flex items-center justify-between cursor-pointer select-none shadow-2xs mx-auto transition-all group"
                                                                            title={`Auto-Allocated: ${assignedList.join(', ')} (Click to view or customize assigned rooms & stay dates)`}
                                                                        >
                                                                            <div className="flex items-center gap-1 truncate">
                                                                                <Sparkles size={11} className="text-blue-600 flex-shrink-0" />
                                                                                <span className="text-blue-700 font-extrabold">Auto ({assignedList.length})</span>
                                                                            </div>
                                                                            <span className="text-[9px] font-mono font-semibold text-slate-700 bg-white/90 px-1 py-0.5 rounded border border-blue-200/60 truncate max-w-[46px]">
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
                                                                        className={`w-28 h-7 px-1.5 border rounded-md text-[10.5px] flex items-center justify-between cursor-pointer select-none shadow-2xs mx-auto transition-all ${isFullyPicked
                                                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                                                                            : 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 ring-2 ring-amber-300/60'
                                                                            }`}
                                                                        title="Manual Assignment. Click to select rooms & customize stay dates"
                                                                    >
                                                                        <div className="flex items-center gap-1 truncate">
                                                                            {isFullyPicked ? (
                                                                                <CheckCircle2 size={11} className="text-emerald-600 flex-shrink-0" />
                                                                            ) : (
                                                                                <AlertTriangle size={11} className="text-amber-600 flex-shrink-0 animate-bounce" />
                                                                            )}
                                                                            <span>{assignedList.length}/{row.roomsCount} Rms</span>
                                                                        </div>
                                                                        <span className="text-[9px] font-mono bg-white/90 px-1 py-0.5 rounded border border-slate-200 truncate max-w-[46px]">
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

                                                            // Connecting suite display mode
                                                            const isConnectingSuite = activeConnectingSuites.some(s => s.name.trim().toLowerCase() === row.roomType.trim().toLowerCase());
                                                            if (isConnectingSuite) {
                                                                const suiteRoomsStr = (row.assignedRooms && row.assignedRooms.length > 0)
                                                                    ? row.assignedRooms.join(' + ')
                                                                    : (assignedList.length > 0 ? assignedList.join(' + ') : '101 + 102');
                                                                return (
                                                                    <div className="flex flex-col items-center justify-center">
                                                                        <div
                                                                            className="w-28 h-7 px-1.5 border border-blue-400 bg-blue-50/90 text-blue-900 rounded-md text-[10.5px] flex items-center justify-between select-none shadow-2xs mx-auto"
                                                                            title={`Interconnecting Suite: Rooms ${row.assignedRooms?.join(' & ')} (Adjoining Internal Door)`}
                                                                        >
                                                                            <div className="flex items-center gap-1 truncate">
                                                                                <span className="text-blue-700 font-extrabold text-[10px]">🔗 Suite</span>
                                                                            </div>
                                                                            <span className="text-[9.5px] font-mono font-bold text-slate-800 bg-white px-1 py-0.5 rounded border border-blue-200/80 truncate">
                                                                                {suiteRoomsStr}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            // Single room mode (roomsCount === 1)
                                                            const isCustomDate = row.checkInDate && (row.checkInDate !== checkIn || row.checkOutDate !== checkOut);
                                                            if (row.isAssign) {
                                                                const singleAuto = assignedList[0] || row.roomNumber || 'Auto';
                                                                return (
                                                                    <div className="flex flex-col items-center justify-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setMultiRoomModal({
                                                                                isOpen: true,
                                                                                rowId: row.id,
                                                                                roomType: row.roomType,
                                                                                requiredCount: 1,
                                                                                isAutoMode: true
                                                                            })}
                                                                            className="w-28 h-7 px-1.5 border border-blue-300 bg-blue-50/90 hover:bg-blue-100 text-blue-900 rounded-md text-[10.5px] flex items-center justify-between cursor-pointer select-none shadow-2xs mx-auto transition-all group"
                                                                            title={`Auto-Allocated: Room ${singleAuto}. Click to view or assign manually`}
                                                                        >
                                                                            <div className="flex items-center gap-1 truncate">
                                                                                <Sparkles size={11} className="text-blue-600 flex-shrink-0" />
                                                                                <span className="text-blue-700 font-extrabold">Auto</span>
                                                                            </div>
                                                                            <span className="text-[10px] font-mono font-bold text-slate-800 bg-white/90 px-1.5 py-0.5 rounded border border-blue-200/70 truncate max-w-[50px]">
                                                                                {singleAuto}
                                                                            </span>
                                                                        </button>
                                                                        {isCustomDate && (
                                                                            <span className="text-[8.5px] font-mono font-semibold text-slate-500 mt-0.5" title={`${row.checkInDate} to ${row.checkOutDate}`}>
                                                                                {row.checkInDate?.slice(5)}➔{row.checkOutDate?.slice(5)} ({getRowNights(row)}N)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            }

                                                            // Manual single-room mode (!row.isAssign)
                                                            const singleManual = assignedList[0] || row.roomNumber;
                                                            return (
                                                                <div className="flex flex-col items-center justify-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setMultiRoomModal({
                                                                            isOpen: true,
                                                                            rowId: row.id,
                                                                            roomType: row.roomType,
                                                                            requiredCount: 1,
                                                                            isAutoMode: false
                                                                        })}
                                                                        className={`w-28 h-7 px-1.5 border rounded-md text-[10.5px] flex items-center justify-between cursor-pointer select-none shadow-2xs mx-auto transition-all ${singleManual
                                                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                                                                            : 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 ring-2 ring-amber-300/60'
                                                                            }`}
                                                                        title={`Manual Assignment: Room ${singleManual || 'None'}. Click to pick room`}
                                                                    >
                                                                        <div className="flex items-center gap-1 truncate">
                                                                            {singleManual ? (
                                                                                <CheckCircle2 size={11} className="text-emerald-600 flex-shrink-0" />
                                                                            ) : (
                                                                                <AlertTriangle size={11} className="text-amber-600 flex-shrink-0 animate-bounce" />
                                                                            )}
                                                                            <span className={singleManual ? 'font-bold text-emerald-800' : 'font-bold text-amber-800'}>
                                                                                {singleManual ? 'Manual' : 'Select'}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[10px] font-mono font-bold text-emerald-950 bg-white/90 px-1.5 py-0.5 rounded border border-emerald-200 truncate max-w-[50px]">
                                                                            {singleManual || 'Pick'}
                                                                        </span>
                                                                    </button>
                                                                    {isCustomDate && (
                                                                        <span className="text-[8.5px] font-mono font-semibold text-slate-500 mt-0.5" title={`${row.checkInDate} to ${row.checkOutDate}`}>
                                                                            {row.checkInDate?.slice(5)}➔{row.checkOutDate?.slice(5)} ({getRowNights(row)}N)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    {(() => {
                                                        const capacity = getRoomTypeCapacity(row.roomType);
                                                        return (
                                                            <>
                                                                <td className="p-1.5 text-center">
                                                                    <div className="flex items-center justify-center">
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            max={capacity.maxAdults}
                                                                            value={row.adults}
                                                                            onChange={e => updateRoomRow(row.id, 'adults', Number(e.target.value))}
                                                                            className="w-10 h-7 px-0.5 border border-gray-200 rounded text-[11px] font-semibold text-center outline-none focus:border-blue-500 bg-white"
                                                                            title={`Adults: 1 to ${capacity.maxAdults} (Max capacity for ${row.roomType})`}
                                                                        />
                                                                    </div>
                                                                </td>
                                                                <td className="p-1.5 text-center">
                                                                    <ChildAgeSelector
                                                                        childrenCount={row.children}
                                                                        childrenAges={row.childrenAges}
                                                                        maxChildren={capacity.maxChildren}
                                                                        compact
                                                                        onChange={(count, ages) => {
                                                                            const standardRate = getStandardDailyRateForRoom(row.roomNumber, row.roomType);
                                                                            const newRate = calculateTariffForRatePlan(row.ratePlan, row.roomType, standardRate, row.adults, count, availableRatePlans);
                                                                            setRoomsList(prev => prev.map(r => r.id === row.id ? { ...r, children: count, childrenAges: ages, rate: newRate } : r));
                                                                        }}
                                                                    />
                                                                </td>
                                                            </>
                                                        );
                                                    })()}
                                                    <td className="p-1.5 text-right">
                                                        <input
                                                            type="number"
                                                            value={row.rate}
                                                            onChange={e => updateRoomRow(row.id, 'rate', Number(e.target.value))}
                                                            className="w-16 h-7 px-1 border border-gray-200 rounded text-[11px] text-right outline-none font-medium"
                                                        />
                                                    </td>
                                                    {(() => {
                                                        const bundle = row.servicesBundle || { extraBed: row.extraBed, pickup: row.pickup };
                                                        const rowN = getRowNights(row);
                                                        const rowAddons = getRoomBundleTotal(bundle, rowN);
                                                        const rowBase = getRowBaseTotal(row);
                                                        const rowTotal = rowBase + rowAddons;
                                                        const totalRN = getRowTotalRoomNights(row);
                                                        const isCustomRN = totalRN !== nights * (Number(row.roomsCount) || 1);

                                                        return (
                                                            <td className="p-1.5 text-gray-900 text-right whitespace-nowrap">
                                                                <div className="font-bold text-slate-900 font-mono text-xs">
                                                                    ৳{rowTotal.toLocaleString()}
                                                                </div>
                                                                {rowAddons > 0 ? (
                                                                    <div className="text-[9px] text-slate-500 font-mono" title={`Base Tariff: ৳${rowBase.toLocaleString()} + Services: ৳${rowAddons.toLocaleString()}`}>
                                                                        +৳{rowAddons.toLocaleString()} svc
                                                                    </div>
                                                                ) : isCustomRN ? (
                                                                    <div className="text-[8.5px] font-mono text-blue-700 font-semibold" title={`${totalRN} total room-nights across this row`}>
                                                                        {totalRN}N
                                                                    </div>
                                                                ) : null}
                                                            </td>
                                                        );
                                                    })()}
                                                    <td className="p-1.5 pr-2.5 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <label className="flex items-center gap-1 text-[10.5px] text-slate-700 font-semibold cursor-pointer select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={row.isAssign}
                                                                    onChange={e => updateRoomRow(row.id, 'isAssign', e.target.checked)}
                                                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer"
                                                                />
                                                                <span>Auto</span>
                                                            </label>
                                                            {row.roomsCount > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSplitRowIntoRooms(row.id)}
                                                                    title={`Split group row into ${row.roomsCount} separate individual room rows`}
                                                                    className="px-1 py-0.5 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-900 rounded border border-blue-200 cursor-pointer transition-colors flex items-center gap-0.5 text-[10px] shadow-2xs"
                                                                >
                                                                    <Split size={11} className="text-blue-600" />
                                                                    <span>Split</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyRoomRow(row)}
                                                                title="Duplicate Row"
                                                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                                                            >
                                                                <Copy size={12} />
                                                            </button>

                                                            {/* 3-dots Menu Button anchored cleanly with Portal */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleToggleRowMenu(e, row.id)}
                                                                title="Room Add-On Services (Transfer, Bed, Meals, Spa, Flex)"
                                                                className={`p-1 rounded cursor-pointer transition-all ${(row.servicesBundle || row.extraBed?.enabled || row.pickup?.enabled)
                                                                    ? 'text-blue-700 bg-blue-100/80 hover:bg-blue-200 ring-1 ring-blue-300'
                                                                    : 'text-slate-500 hover:text-blue-600 hover:bg-slate-100'
                                                                    }`}
                                                            >
                                                                <MoreVertical size={13} />
                                                            </button>

                                                            {roomsList.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveRoomRow(row.id)}
                                                                    title="Delete Row"
                                                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
                        </div>
                    )}

                    {/* ========================================================
                        STEP 2: GUEST INFORMATION & PREFERENCES
                        ======================================================== */}
                    {step === 2 && (
                        <div className="space-y-2.5 animate-in fade-in duration-150">
                            <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-2xs space-y-2">


                                {/* Linked Guest Profile Banner */}
                                {selectedExistingGuest && (
                                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-md p-2 flex items-center justify-between gap-2 animate-in fade-in">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10.5px] font-bold flex-shrink-0">
                                                {selectedExistingGuest.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-gray-900 text-[12px]">
                                                        {selectedExistingGuest.title} {selectedExistingGuest.name}
                                                    </span>
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-100 text-purple-800 border border-purple-200 font-semibold">
                                                        {selectedExistingGuest.vipTier || 'Regular'}
                                                    </span>
                                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-0.5 font-medium">
                                                        <ShieldCheck size={9} /> Verified Returning Guest
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-gray-600 flex items-center gap-2 mt-0.5 flex-wrap font-mono">
                                                    <span>Phone: {selectedExistingGuest.phone}</span>
                                                    {selectedExistingGuest.email && <span>Email: {selectedExistingGuest.email}</span>}
                                                    <span>{selectedExistingGuest.totalStays || 1} Past Stay(s)</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleClearSelectedGuest}
                                            className="px-2 py-0.5 rounded text-[10px] font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer flex-shrink-0"
                                        >
                                            ✕ Unlink Profile
                                        </button>
                                    </div>
                                )}

                                {/* Phone Shared / Collision Alert */}
                                {phoneCollision && !selectedExistingGuest && (
                                    <div className="bg-amber-50/90 border border-amber-200 rounded-md p-2 flex items-center justify-between gap-2 text-[10.5px] text-amber-900 animate-in fade-in">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-bold">⚠️ Phone Shared:</span>
                                            <span className="truncate">This phone is registered to <strong>{phoneCollision.existingGuestName}</strong> ({phoneCollision.existingVip}). A new distinct profile will be created for <strong>{guestName || 'this guest'}</strong>.</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (phoneCollision.matchedGuest) handleSelectExistingGuest(phoneCollision.matchedGuest);
                                            }}
                                            className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-semibold border border-amber-300 cursor-pointer flex-shrink-0"
                                        >
                                            Link to {phoneCollision.existingGuestName.split(' ')[0]} ↵
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* B. Sub-tabs Navigation for Step 2 Form (Identity, Address, Corporate, Preferences) */}
                            <div className="bg-white border border-gray-200 rounded-lg shadow-2xs overflow-hidden">
                                <div className="bg-gray-50/90 border-b border-gray-200 px-2 py-1 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
                                    <div className="flex items-center gap-1">
                                        {[
                                            { key: 'profile', label: '1. Identity & Contact', icon: <UserIcon size={12} />, required: true },
                                            { key: 'address', label: '2. Address & Emergency', icon: <MapPin size={12} />, filled: Boolean(streetAddress || homeCity || emergencyName) },
                                            { key: 'corporate', label: '3. Corporate & Work', icon: <Briefcase size={12} />, filled: Boolean(companyName || designation) },
                                            { key: 'preferences', label: '4. Hospitality Preferences', icon: <Heart size={12} />, filled: Boolean(remarksMap['Guest'] || bedPreference !== 'King Bed') }
                                        ].map(tab => (
                                            <button
                                                key={tab.key}
                                                type="button"
                                                onClick={() => setStep2Tab(tab.key as any)}
                                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${step2Tab === tab.key
                                                    ? 'bg-white text-blue-700 border border-gray-200 shadow-2xs'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                                                    }`}
                                            >
                                                {tab.icon}
                                                <span>{tab.label}</span>
                                                {tab.required && !isGuestProfileComplete && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block ml-0.5" />
                                                )}
                                                {tab.filled && (
                                                    <span className="text-[9px] text-emerald-600">✓</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="text-[10px] text-gray-500 font-medium pr-1 hidden md:block">
                                        {isGuestProfileComplete ? (
                                            <span className="text-emerald-700 flex items-center gap-1">
                                                <CheckCircle2 size={11} /> Required Fields Filled
                                            </span>
                                        ) : (
                                            <span className="text-amber-700">
                                                * Name &amp; Contact are mandatory
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-3">
                                    {/* Blacklist Interception Alert */}
                                    {activeBlacklistAlert && (
                                        <div className="mb-3 p-3 bg-red-50 border-2 border-red-500 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in">
                                            <div className="flex items-start gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                                                    <Ban size={18} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-red-900 text-xs uppercase tracking-wide">⚠️ Blacklisted / Blocked Guest Alert</span>
                                                        <span className="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.2 rounded font-semibold">{activeBlacklistAlert.name}</span>
                                                    </div>
                                                    <p className="text-[11px] text-red-700 font-medium mt-0.5">
                                                        <strong>Incident Reason:</strong> {activeBlacklistAlert.reason}
                                                    </p>
                                                    <p className="text-[10px] text-red-600">
                                                        Logged by <span className="font-semibold">{activeBlacklistAlert.by}</span> {activeBlacklistAlert.at ? `on ${new Date(activeBlacklistAlert.at).toLocaleDateString()}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 bg-white/90 p-2 rounded border border-red-300 shadow-2xs">
                                                <input
                                                    type="checkbox"
                                                    id="managerOverrideStep2"
                                                    checked={managerOverrideApproved}
                                                    onChange={e => setManagerOverrideApproved(e.target.checked)}
                                                    className="w-4 h-4 text-red-600 rounded border-red-300 focus:ring-red-500 cursor-pointer"
                                                />
                                                <label htmlFor="managerOverrideStep2" className="text-[11px] font-bold text-red-900 cursor-pointer select-none">
                                                    Duty Manager Override <span className="text-[9.5px] font-normal text-red-700 block">Allow booking under supervision</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab 1: Identity & Contact */}
                                    {step2Tab === 'profile' && (
                                        <div className="space-y-2.5 animate-in fade-in duration-100">
                                            {/* Row 1: Name, Phone, Mobile, Email */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700 flex items-center justify-between">
                                                        <span>FULL LEGAL NAME <span className="text-red-500">*</span></span>
                                                    </label>
                                                    <div className="flex gap-1">
                                                        <select
                                                            value={salutation}
                                                            onChange={e => setSalutation(e.target.value)}
                                                            className="w-16 h-7 px-1 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer font-medium"
                                                        >
                                                            <option value="Mr">Mr.</option>
                                                            <option value="Ms">Ms.</option>
                                                            <option value="Mrs">Mrs.</option>
                                                            <option value="Dr">Dr.</option>
                                                            <option value="Engr">Engr.</option>
                                                            <option value="Prof">Prof.</option>
                                                        </select>
                                                        <div className="relative flex-1">
                                                            <input
                                                                type="text"
                                                                name="reservation_guest_name_lookup"
                                                                autoComplete="off"
                                                                autoCorrect="off"
                                                                autoCapitalize="off"
                                                                spellCheck={false}
                                                                role="combobox"
                                                                aria-autocomplete="list"
                                                                aria-expanded={isGuestSearchOpen && filteredKnownGuests.length > 0}
                                                                data-lpignore="true"
                                                                data-1p-ignore="true"
                                                                data-form-type="other"
                                                                placeholder="Guest full name..."
                                                                value={guestName}
                                                                readOnly
                                                                onFocus={(e) => {
                                                                    e.currentTarget.readOnly = false;
                                                                    setIsGuestSearchOpen(true);
                                                                }}
                                                                onPointerDown={(e) => {
                                                                    e.currentTarget.readOnly = false;
                                                                }}
                                                                onChange={e => {
                                                                    setGuestName(e.target.value);
                                                                    setIsGuestSearchOpen(true);
                                                                    if (selectedExistingGuest && e.target.value !== selectedExistingGuest.name) {
                                                                        setSelectedExistingGuest(null);
                                                                    }
                                                                }}
                                                                onBlur={() => setTimeout(() => setIsGuestSearchOpen(false), 250)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none focus:border-blue-500 font-medium"
                                                            />

                                                            {/* Inline Name Suggestions Dropdown (Spacious overlay width) */}
                                                            {isGuestSearchOpen && filteredKnownGuests.length > 0 && (
                                                                <div className="absolute left-0 top-full mt-1 w-[380px] max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-2xl z-[100] max-h-56 overflow-y-auto divide-y divide-gray-100 animate-in fade-in duration-100">
                                                                    {filteredKnownGuests.map(g => (
                                                                        <div
                                                                            key={g.id}
                                                                            onMouseDown={(e) => {
                                                                                e.preventDefault();
                                                                                handleSelectExistingGuest(g);
                                                                                setIsGuestSearchOpen(false);
                                                                            }}
                                                                            className="p-2.5 hover:bg-blue-50/80 transition-colors cursor-pointer flex items-center justify-between gap-2.5"
                                                                        >
                                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                                <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-2xs">
                                                                                    {g.name.slice(0, 2).toUpperCase()}
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                                        <span className="font-bold text-gray-900 text-[11.5px] truncate">
                                                                                            {g.title} {g.name}
                                                                                        </span>
                                                                                        <span className="px-1.5 py-0.2 rounded text-[8.5px] bg-purple-100 text-purple-800 border border-purple-200 font-semibold">
                                                                                            {g.vipTier}
                                                                                        </span>
                                                                                        {g.company && (
                                                                                            <span className="text-[9.5px] text-gray-400 truncate hidden md:inline">
                                                                                                ({g.company})
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2 mt-0.5">
                                                                                        <span className="text-gray-800 font-bold">📞 {g.phone}</span>
                                                                                        {g.email && <span className="truncate">✉️ {g.email}</span>}
                                                                                        {g.idNumber && <span>🪪 {g.idNumber}</span>}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 whitespace-nowrap flex-shrink-0 shadow-2xs">
                                                                                Auto-Fill ↵
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">
                                                        MOBILE NUMBER <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="pms_add_guest_mobile_query"
                                                        autoComplete="one-time-code"
                                                        autoCorrect="off"
                                                        spellCheck={false}
                                                        data-lpignore="true"
                                                        data-1p-ignore="true"
                                                        data-form-type="other"
                                                        placeholder="+880 1711-000000"
                                                        value={mobile}
                                                        onChange={e => setMobile(e.target.value)}
                                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none focus:border-blue-500 font-mono"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">EMAIL ADDRESS</label>
                                                    <input
                                                        type="email"
                                                        name="pms_add_guest_email_query"
                                                        autoComplete="one-time-code"
                                                        autoCorrect="off"
                                                        spellCheck={false}
                                                        data-lpignore="true"
                                                        data-1p-ignore="true"
                                                        data-form-type="other"
                                                        placeholder="guest@example.com"
                                                        value={email}
                                                        onChange={e => setEmail(e.target.value)}
                                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">PHONE</label>
                                                    <input
                                                        type="text"
                                                        name="pms_add_guest_phone_query"
                                                        autoComplete="one-time-code"
                                                        autoCorrect="off"
                                                        spellCheck={false}
                                                        data-lpignore="true"
                                                        data-1p-ignore="true"
                                                        data-form-type="other"
                                                        placeholder="Alternative contact..."
                                                        value={phone}
                                                        onChange={e => setPhone(e.target.value)}
                                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none font-mono"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 2: VIP, Gender, Nationality, Guest Type, DOB */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1 border-t border-gray-100">
                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">VIP STATUS</label>
                                                    <select
                                                        value={vipStatus}
                                                        onChange={e => setVipStatus(e.target.value)}
                                                        className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                    >
                                                        <option value="">None (Standard)</option>
                                                        <option value="VIP-1">VIP-1 (Silver Tier)</option>
                                                        <option value="VIP-2">VIP-2 (Gold Tier)</option>
                                                        <option value="VVIP">VVIP (Platinum VIP)</option>
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">GENDER</label>
                                                    <select
                                                        value={gender}
                                                        onChange={e => setGender(e.target.value)}
                                                        className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                    >
                                                        <option value="Male">Male</option>
                                                        <option value="Female">Female</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">NATIONALITY</label>
                                                    <select
                                                        value={nationality}
                                                        onChange={e => setNationality(e.target.value)}
                                                        className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                    >
                                                        {COUNTRIES_DATABASE.map(c => (
                                                            <option key={c.code} value={c.nationality}>
                                                                {c.nationality} ({c.name})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">GUEST CATEGORY</label>
                                                    <select
                                                        value={guestType}
                                                        onChange={e => setGuestType(e.target.value)}
                                                        className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                    >
                                                        <option value="Adult">Individual</option>
                                                        <option value="Corporate">Corporate</option>
                                                        <option value="Diplomat">Diplomat / Government</option>
                                                        <option value="Family">Family</option>
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">DATE OF BIRTH</label>
                                                    <input
                                                        type="date"
                                                        value={dob}
                                                        onChange={e => setDob(e.target.value)}
                                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 3: ID Verification, Purpose of Visit, Birth Location */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-gray-100">
                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">PURPOSE OF VISIT</label>
                                                    <select
                                                        value={purposeOfVisit}
                                                        onChange={e => setPurposeOfVisit(e.target.value)}
                                                        className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                    >
                                                        <option value="Business">Business</option>
                                                        <option value="Leisure / Holiday">Leisure / Holiday</option>
                                                        <option value="Medical">Medical</option>
                                                        <option value="Official / Diplomatic">Official / Diplomatic</option>
                                                        <option value="Transit">Transit</option>
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">ID TYPE</label>
                                                    <select
                                                        value={idType}
                                                        onChange={e => {
                                                            const nextType = e.target.value;
                                                            setIdType(nextType);
                                                            if (idNumber) {
                                                                setIdNumber(formatIdentityDisplay(idNumber, nextType));
                                                            }
                                                        }}
                                                        className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer font-medium"
                                                    >
                                                        <option value="National ID (NID)">National ID (NID)</option>
                                                        <option value="Passport">Passport</option>
                                                        <option value="Driving License">Driving License</option>
                                                        <option value="Diplomatic ID">Diplomatic ID</option>
                                                        <option value="Birth Certificate">Birth Certificate</option>
                                                    </select>
                                                </div>

                                                <div className="flex flex-col gap-0.5 sm:col-span-2">
                                                    <label className="text-[10px] font-semibold text-gray-700">
                                                        {idType === 'Passport' ? 'PASSPORT NUMBER' : idType === 'Driving License' ? 'DRIVING LICENSE #' : idType === 'Diplomatic ID' ? 'DIPLOMATIC ID #' : 'NATIONAL ID (NID) #'} <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder={idType === 'Passport' ? 'e.g. A01234567' : idType === 'National ID (NID)' ? 'e.g. 550 123 4567' : 'Document number...'}
                                                        value={idNumber}
                                                        onChange={e => setIdNumber(e.target.value)}
                                                        onBlur={e => setIdNumber(formatIdentityDisplay(e.target.value, idType))}
                                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none font-mono focus:border-blue-500"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">BIRTH CITY</label>
                                                    <input
                                                        type="text"
                                                        value={birthCity}
                                                        onChange={e => setBirthCity(e.target.value)}
                                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">OCCUPATION</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Profession..."
                                                        value={occupation}
                                                        onChange={e => setOccupation(e.target.value)}
                                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Dynamic Polymorphic Identity Card */}
                                            {idType === 'Passport' && (
                                                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2 mt-2">
                                                    <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px]">
                                                        <FileText size={13} className="text-blue-700" />
                                                        <span>Passport &amp; International Guest Visa Clearance (Special Branch Compliance)</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">PASSPORT ISSUING COUNTRY</label>
                                                            <select
                                                                value={idIssueCountry}
                                                                onChange={e => setIdIssueCountry(e.target.value)}
                                                                className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                            >
                                                                {COUNTRIES_DATABASE.map(c => (
                                                                    <option key={c.code} value={c.name}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">PASSPORT EXPIRY DATE</label>
                                                            <input
                                                                type="date"
                                                                value={idExpiryDate}
                                                                onChange={e => setIdExpiryDate(e.target.value)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">VISA NUMBER</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Visa document #..."
                                                                value={passportVisaNumber}
                                                                onChange={e => setPassportVisaNumber(e.target.value)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none font-mono"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">VISA CATEGORY</label>
                                                            <select
                                                                value={passportVisaType}
                                                                onChange={e => setPassportVisaType(e.target.value)}
                                                                className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                            >
                                                                <option value="Tourist">Tourist (T)</option>
                                                                <option value="Business">Business (B)</option>
                                                                <option value="Employment">Employment / Work (E)</option>
                                                                <option value="On-Arrival">Visa on Arrival (VoA)</option>
                                                                <option value="Diplomatic">Diplomatic / Official (D)</option>
                                                                <option value="Student">Student (S)</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5 sm:col-span-2">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">VISA VALIDITY / EXPIRY</label>
                                                            <input
                                                                type="date"
                                                                value={passportVisaExpiry}
                                                                onChange={e => setPassportVisaExpiry(e.target.value)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5 sm:col-span-2">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">PORT OF ENTRY</label>
                                                            <input
                                                                type="text"
                                                                placeholder="Hazrat Shahjalal Int Airport, Dhaka"
                                                                value={passportEntryPort}
                                                                onChange={e => setPassportEntryPort(e.target.value)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {idType === 'National ID (NID)' && (
                                                <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2 mt-2">
                                                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
                                                        <ShieldCheck size={13} className="text-emerald-700" />
                                                        <span>ID Details</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        <div className="flex flex-col gap-0.5 sm:col-span-2">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">FATHER'S / SPOUSE'S FULL NAME</label>
                                                            <input
                                                                type="text"
                                                                placeholder="As printed on ID card..."
                                                                value={fatherOrSpouseName}
                                                                onChange={e => setFatherOrSpouseName(e.target.value)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">DATE OF ISSUE</label>
                                                            <input
                                                                type="date"
                                                                value={idIssueDate}
                                                                onChange={e => setIdIssueDate(e.target.value)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">ISSUE DISTRICT / CIRCLE</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Dhaka, Chittagong..."
                                                                value={idIssuePlace}
                                                                onChange={e => setIdIssuePlace(e.target.value)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {idType === 'Driving License' && (
                                                <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-lg space-y-2 mt-2">
                                                    <div className="flex items-center gap-1.5 text-purple-900 font-bold text-[11px]">
                                                        <Car size={13} className="text-purple-700" />
                                                        <span>BRTA Driving License Credentials</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">VEHICLE CLASS</label>
                                                            <select
                                                                value={drivingVehicleClass}
                                                                onChange={e => setDrivingVehicleClass(e.target.value)}
                                                                className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                            >
                                                                <option value="Light">Light (Car / Microbus / Jeep)</option>
                                                                <option value="Medium">Medium (Minibus / Commercial)</option>
                                                                <option value="Heavy">Heavy (Bus / Truck)</option>
                                                                <option value="Motorcycle">Motorcycle</option>
                                                                <option value="Professional">Professional (All-Category)</option>
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">ISSUING BRTA CIRCLE</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Dhaka Metro-1 (Mirpur)"
                                                                value={idIssuePlace}
                                                                onChange={e => setIdIssuePlace(e.target.value)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">LICENSE EXPIRY DATE</label>
                                                            <input
                                                                type="date"
                                                                value={idExpiryDate}
                                                                onChange={e => setIdExpiryDate(e.target.value)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {idType === 'Diplomatic ID' && (
                                                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2 mt-2">
                                                    <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px]">
                                                        <ShieldCheck size={13} className="text-amber-700" />
                                                        <span>Ministry of Foreign Affairs / Diplomatic Mission Protocol</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">EMBASSY / MISSION / HIGH COMMISSION</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Embassy of Japan, Dhaka"
                                                                value={idIssuePlace}
                                                                onChange={e => setIdIssuePlace(e.target.value)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <label className="text-[9.5px] font-semibold text-gray-700">DIPLOMATIC CARD EXPIRY</label>
                                                            <input
                                                                type="date"
                                                                value={idExpiryDate}
                                                                onChange={e => setIdExpiryDate(e.target.value)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Tab 2: Address & Emergency Contact */}
                                    {step2Tab === 'address' && (
                                        <div className="space-y-3 animate-in fade-in duration-100">
                                            <div>
                                                <h4 className="text-[11px] font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
                                                    <MapPin size={12} className="text-emerald-600" />
                                                    <span>Primary Residential Address &amp; Region</span>
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-[10px] font-semibold text-gray-700">COUNTRY OF RESIDENCE</label>
                                                        <select
                                                            value={homeCountry}
                                                            onChange={e => {
                                                                const newCountry = e.target.value;
                                                                setHomeCountry(newCountry);
                                                                const cities = getCitiesForCountry(newCountry);
                                                                if (cities.length > 0) {
                                                                    setHomeCity(cities[0]);
                                                                } else {
                                                                    setHomeCity('');
                                                                }
                                                                const nat = getNationalityForCountry(newCountry);
                                                                if (nat && (!nationality)) {
                                                                    setNationality(nat);
                                                                }
                                                            }}
                                                            className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                        >
                                                            {COUNTRIES_DATABASE.map(c => (
                                                                <option key={c.code} value={c.name}>
                                                                    {c.name} ({c.dialCode})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-[10px] font-semibold text-gray-700">CITY / DISTRICT</label>
                                                        {getCitiesForCountry(homeCountry).length > 0 ? (
                                                            <select
                                                                value={homeCity}
                                                                onChange={e => setHomeCity(e.target.value)}
                                                                className="w-full h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                            >
                                                                <option value="">Select City / District...</option>
                                                                {getCitiesForCountry(homeCountry).map(ct => (
                                                                    <option key={ct} value={ct}>{ct}</option>
                                                                ))}
                                                                <option value="__other__">+ Other / Enter Manually</option>
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                placeholder="Dhaka..."
                                                                value={homeCity}
                                                                onChange={e => setHomeCity(e.target.value)}
                                                                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-0.5 lg:col-span-2">
                                                        <label className="text-[10px] font-semibold text-gray-700">STREET ADDRESS</label>
                                                        <input
                                                            type="text"
                                                            placeholder="House, Road, Area..."
                                                            value={streetAddress}
                                                            onChange={e => setStreetAddress(e.target.value)}
                                                            className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                        />
                                                    </div>

                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-[10px] font-semibold text-gray-700">POSTAL CODE</label>
                                                        <input
                                                            type="text"
                                                            placeholder="1200..."
                                                            value={postalCode}
                                                            onChange={e => setPostalCode(e.target.value)}
                                                            className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-gray-100">
                                                <h4 className="text-[11px] font-bold text-gray-900 mb-1.5 flex items-center gap-1.5">
                                                    <AlertTriangle size={12} className="text-rose-500" />
                                                    <span>Emergency Contact (Hotel Safety Compliance)</span>
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-[10px] font-semibold text-gray-700">CONTACT PERSON NAME</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Dr. Rafiqul Islam"
                                                            value={emergencyName}
                                                            onChange={e => setEmergencyName(e.target.value)}
                                                            className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-[10px] font-semibold text-gray-700">RELATIONSHIP</label>
                                                        <select
                                                            value={emergencyRelation}
                                                            onChange={e => setEmergencyRelation(e.target.value)}
                                                            className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                        >
                                                            <option value="Spouse">Spouse / Partner</option>
                                                            <option value="Family / Parent">Family / Parent</option>
                                                            <option value="Colleague / Manager">Colleague / Manager</option>
                                                            <option value="Friend">Friend</option>
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <label className="text-[10px] font-semibold text-gray-700">EMERGENCY PHONE</label>
                                                        <input
                                                            type="text"
                                                            placeholder="+880 18..."
                                                            value={emergencyPhone}
                                                            onChange={e => setEmergencyPhone(e.target.value)}
                                                            className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab 3: Corporate & Work */}
                                    {step2Tab === 'corporate' && (
                                        <div className="space-y-3 animate-in fade-in duration-100">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">COMPANY / ORGANIZATION</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Grameenphone Ltd."
                                                        value={companyName}
                                                        onChange={e => setCompanyName(e.target.value)}
                                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none font-medium"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">DESIGNATION</label>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Managing Director"
                                                        value={designation}
                                                        onChange={e => setDesignation(e.target.value)}
                                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">OFFICE PHONE</label>
                                                    <input
                                                        type="text"
                                                        placeholder="+880 2..."
                                                        value={officePhone}
                                                        onChange={e => setOfficePhone(e.target.value)}
                                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none font-mono"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">CORPORATE EMAIL</label>
                                                    <input
                                                        type="email"
                                                        placeholder="corporate@company.com"
                                                        value={corporateEmail}
                                                        onChange={e => setCorporateEmail(e.target.value)}
                                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[10px] font-semibold text-gray-700">TAX / BIN / VAT ID</label>
                                                    <input
                                                        type="text"
                                                        placeholder="TIN-9812..."
                                                        value={taxVatId}
                                                        onChange={e => setTaxVatId(e.target.value)}
                                                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab 4: Hospitality Preferences & Notes */}
                                    {step2Tab === 'preferences' && (
                                        <div className="space-y-3 animate-in fade-in duration-100">
                                            {/* Quick-select Hospitality Chips */}
                                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                                                    HOSPITALITY QUICK-PREFERENCES (SYNCED WITH FRONT DESK &amp; HOUSEKEEPING)
                                                </span>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    <div className="space-y-1">
                                                        <span className="text-[9.5px] text-gray-500 font-semibold block">BED TYPE</span>
                                                        <div className="flex gap-1">
                                                            {['King Bed', 'Twin Beds'].map(b => (
                                                                <button
                                                                    key={b}
                                                                    type="button"
                                                                    onClick={() => setBedPreference(b)}
                                                                    className={`flex-1 py-1 px-1.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${bedPreference === b
                                                                        ? 'bg-[#1e3a8a] text-white border-blue-900 shadow-2xs'
                                                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                                        }`}
                                                                >
                                                                    {b}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <span className="text-[9.5px] text-gray-500 font-semibold block">SMOKING PREFERENCE</span>
                                                        <div className="flex gap-1">
                                                            {['Non-Smoking', 'Smoking'].map(s => (
                                                                <button
                                                                    key={s}
                                                                    type="button"
                                                                    onClick={() => setSmokingPreference(s as any)}
                                                                    className={`flex-1 py-1 px-1.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${smokingPreference === s
                                                                        ? 'bg-[#1e3a8a] text-white border-blue-900 shadow-2xs'
                                                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                                                                        }`}
                                                                >
                                                                    {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <span className="text-[9.5px] text-gray-500 font-semibold block">FLOOR PREFERENCE</span>
                                                        <select
                                                            value={floorPreference}
                                                            onChange={e => setFloorPreference(e.target.value)}
                                                            className="w-full h-6 px-1.5 border border-gray-200 rounded text-[10.5px] bg-white outline-none cursor-pointer"
                                                        >
                                                            <option value="High Floor">High Floor</option>
                                                            <option value="Low Floor">Low Floor</option>
                                                            <option value="Quiet Corner">Quiet Corner</option>
                                                            <option value="Near Elevator">Near Elevator</option>
                                                            <option value="Away from Elevator">Away from Elevator</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <span className="text-[9.5px] text-gray-500 font-semibold block">DIETARY / DINING</span>
                                                        <select
                                                            value={dietaryPreference}
                                                            onChange={e => setDietaryPreference(e.target.value)}
                                                            className="w-full h-6 px-1.5 border border-gray-200 rounded text-[10.5px] bg-white outline-none cursor-pointer"
                                                        >
                                                            <option value="Halal">Halal (Strict)</option>
                                                            <option value="Vegetarian">Vegetarian</option>
                                                            <option value="Vegan">Vegan</option>
                                                            <option value="Diabetic">Diabetic Friendly</option>
                                                            <option value="No Restrictions">Standard / No Restrictions</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Department Remarks Tabs */}
                                            <div className="space-y-1.5 pt-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                                                        DEPARTMENTAL OPERATIONAL REMARKS
                                                    </span>
                                                    <span className="text-[9px] text-gray-400">Routes to Folio &amp; Daily Log</span>
                                                </div>
                                                <div className="flex items-center gap-1 border-b border-gray-100 pb-1">
                                                    {(['Guest', 'Check In', 'Check Out', 'House Keeping', 'Payment Note'] as const).map(tab => (
                                                        <button
                                                            key={tab}
                                                            type="button"
                                                            onClick={() => setActivePrefTab(tab)}
                                                            className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition-colors cursor-pointer ${activePrefTab === tab
                                                                ? 'bg-[#1e3a8a] text-white shadow-2xs'
                                                                : 'text-gray-600 hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            {tab}
                                                        </button>
                                                    ))}
                                                </div>

                                                <textarea
                                                    rows={2}
                                                    placeholder={`Enter special notes for ${activePrefTab}...`}
                                                    value={remarksMap[activePrefTab]}
                                                    onChange={e => setRemarksMap({ ...remarksMap, [activePrefTab]: e.target.value })}
                                                    className="w-full p-2 border border-gray-200 rounded text-[11px] outline-none focus:border-blue-500"
                                                ></textarea>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================
                        STEP 3: PAYMENTS & SUMMARY BOX
                        ======================================================== */}
                    {step === 3 && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 animate-in fade-in duration-150">
                            {/* Left Column: Discount & Payment Methods */}
                            <div className="lg:col-span-7 space-y-2.5">
                                {/* Discount Box */}
                                <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-2xs space-y-2">
                                    <h3 className="text-gray-900 text-[10.5px] uppercase tracking-wider">Discount</h3>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={discountType}
                                            onChange={e => setDiscountType(e.target.value as any)}
                                            className="w-28 h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                        >
                                            <option value="Fixed">Fixed Amount</option>
                                            <option value="Percentage">Percentage (%)</option>
                                        </select>
                                        <input
                                            type="number"
                                            min={0}
                                            value={discountValue}
                                            onChange={e => setDiscountValue(Number(e.target.value))}
                                            className="w-24 h-7 px-2 border border-gray-200 rounded text-[11px] outline-none"
                                        />
                                        {discountValue > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setDiscountValue(0)}
                                                className="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer"
                                                title="Remove Discount"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500">Remarks: Added promotional/corporate discount.</p>
                                </div>

                                {/* Payment Methods Box */}
                                <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-2xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-gray-900 text-[10.5px] uppercase tracking-wider">Payment Method</h3>
                                        <span className="text-[10px] text-gray-500">Add partial or multi-tender settlement</span>
                                    </div>

                                    <div className="space-y-1.5">
                                        {paymentRows.map((pRow, idx) => (
                                            <div
                                                key={pRow.id}
                                                onClick={() => setKeypadTargetIndex(idx)}
                                                className={`flex items-center gap-2 p-1.5 rounded-md border transition-colors ${keypadTargetIndex === idx ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200 bg-white'
                                                    }`}
                                            >
                                                <div className="w-36 flex flex-col gap-0.5">
                                                    <label className="text-[9.5px] text-gray-500">Method</label>
                                                    <select
                                                        value={pRow.method}
                                                        onChange={e => updatePaymentRow(pRow.id, 'method', e.target.value)}
                                                        className="h-7 px-1.5 border border-gray-200 rounded text-[11px] bg-white outline-none cursor-pointer"
                                                    >
                                                        <option value="Cash">Cash</option>
                                                        <option value="Card">Card (POS)</option>
                                                        <option value="bKash">bKash (MFS)</option>
                                                        <option value="Bank Transfer">Bank Transfer</option>
                                                    </select>
                                                </div>

                                                <div className="flex-1 flex flex-col gap-0.5">
                                                    <label className="text-[9.5px] text-gray-500">Amount</label>
                                                    <input
                                                        type="number"
                                                        value={pRow.amount}
                                                        onChange={e => updatePaymentRow(pRow.id, 'amount', Number(e.target.value))}
                                                        className="h-7 px-2 border border-gray-200 rounded text-[11px] text-gray-900 outline-none"
                                                    />
                                                </div>

                                                {paymentRows.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemovePaymentRow(pRow.id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer self-end mb-0.5"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end pt-0.5">
                                        <button
                                            type="button"
                                            onClick={handleAddPaymentRow}
                                            className="px-2.5 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-blue-700 rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                        >
                                            <Plus size={12} />
                                            <span>Add New Payment Method</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Summary Box & Keypad */}
                            <div className="lg:col-span-5 space-y-2.5">
                                <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-2xs space-y-2">
                                    <h3 className="text-gray-900 text-[10.5px] uppercase tracking-wider border-b border-gray-100 pb-1.5 flex items-center justify-between">
                                        <span>Settlement Summary</span>
                                        {totalAllAddonsCharges > 0 && (
                                            <span className="text-[9.5px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                                                Addons: +৳{totalAllAddonsCharges.toFixed(0)}
                                            </span>
                                        )}
                                    </h3>

                                    <div className="space-y-1 text-[11px]">
                                        <div className="flex items-center justify-between py-0.5 text-gray-600">
                                            <span>Room Base Tariff:</span>
                                            <span className="text-gray-900 font-mono">৳ {roomBaseTotal.toFixed(2)}</span>
                                        </div>

                                        {totalPickupArrivalCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-blue-700">
                                                <span className="flex items-center gap-1">
                                                    <Car size={11} />
                                                    <span>Airport Pickup (Inbound):</span>
                                                </span>
                                                <span className="font-mono">+৳ {totalPickupArrivalCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalDropDepartureCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-sky-700">
                                                <span className="flex items-center gap-1">
                                                    <Plane size={11} />
                                                    <span>Airport Drop (Outbound):</span>
                                                </span>
                                                <span className="font-mono">+৳ {totalDropDepartureCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalExtraBedCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-indigo-700">
                                                <span className="flex items-center gap-1">
                                                    <BedDouble size={11} />
                                                    <span>Extra Bed / Cot Surcharge:</span>
                                                </span>
                                                <span className="font-mono">+৳ {totalExtraBedCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalMealPlanCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-amber-700">
                                                <span className="flex items-center gap-1">
                                                    <Utensils size={11} />
                                                    <span>Meal Plans &amp; Dining:</span>
                                                </span>
                                                <span className="font-mono">+৳ {totalMealPlanCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalCelebrationCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-rose-700">
                                                <span className="flex items-center gap-1">
                                                    <Gift size={11} />
                                                    <span>Celebration &amp; Room Decor:</span>
                                                </span>
                                                <span className="font-mono">+৳ {totalCelebrationCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalSpaCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-teal-700">
                                                <span className="flex items-center gap-1">
                                                    <Sparkles size={11} />
                                                    <span>Wellness &amp; Spa Treatments:</span>
                                                </span>
                                                <span className="font-mono">+৳ {totalSpaCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalTimingCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-sky-700">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={11} />
                                                    <span>Early / Late Check-In Flex:</span>
                                                </span>
                                                <span className="font-mono">+৳ {totalTimingCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {totalCustomCharge > 0 && (
                                            <div className="flex items-center justify-between py-0.5 text-purple-700">
                                                <span>Custom Ancillary Add-Ons:</span>
                                                <span className="font-mono">+৳ {totalCustomCharge.toFixed(2)}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between py-0.5 text-gray-700 border-t border-gray-100 pt-1 font-semibold">
                                            <span>Gross Total:</span>
                                            <span className="text-gray-900 font-mono">৳ {grossTotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-0.5 text-gray-600">
                                            <span>Discounted Amount:</span>
                                            <span className="text-emerald-600 font-mono">-৳ {discountedAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-0.5 text-gray-700 text-[10.5px]">
                                            <span>Net Base (Taxable):</span>
                                            <span className="font-semibold font-mono text-gray-900">৳ {netBaseAmount.toFixed(2)}</span>
                                        </div>

                                        {/* Statutory Taxes & VAT itemized breakdown from /taxes-vat */}
                                        {taxCalculation.isTaxApplicable && taxCalculation.breakdown.length > 0 ? (
                                            <div className="my-1 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                                                <div className="flex items-center justify-between text-[9.5px] text-slate-500 uppercase tracking-wider pb-0.5 border-b border-slate-200">
                                                    <span>{taxCalculation.configCode} Tax Rules</span>
                                                    <span className="text-blue-700 font-mono">+৳ {taxCalculation.totalTaxAmount.toFixed(2)}</span>
                                                </div>
                                                {taxCalculation.breakdown.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-[10.5px] text-slate-600">
                                                        <span title={item.formula}>
                                                            {item.name} ({item.rate}%):
                                                        </span>
                                                        <span className="font-mono text-slate-800 font-semibold">
                                                            +৳ {item.amount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="my-1 py-1 px-2 bg-amber-50 border border-amber-200 rounded text-[10.5px] text-amber-800 font-medium flex justify-between">
                                                <span>Tax Exemption</span>
                                                <span className="font-mono">৳ 0.00 (Exempt)</span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between py-1 px-1.5 bg-blue-50/80 border border-blue-100 rounded text-blue-900 font-bold">
                                            <span>Grand Total (Payable):</span>
                                            <span className="font-mono text-xs font-extrabold">৳ {finalPayable.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-0.5 text-gray-600">
                                            <span>Total Paid:</span>
                                            <span className="text-blue-700 font-mono">৳ {totalPaid.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 px-2 bg-rose-50 border border-rose-200 rounded text-rose-800 font-bold">
                                            <span>Total Due Balance:</span>
                                            <span className="font-mono text-xs">৳ {totalDue.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Keypad Quick Entry */}
                                    <div className="pt-1.5 border-t border-gray-100">
                                        <div className="text-[9.5px] text-gray-500 font-medium mb-1 flex items-center justify-between">
                                            <span>Quick Keypad</span>
                                            <span className="text-blue-700 font-mono">Row #{keypadTargetIndex + 1}</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-1">
                                            {['1', '2', '3', 'CLEAR'].map(btn => (
                                                <button
                                                    key={btn}
                                                    type="button"
                                                    onClick={() => handleKeypadPress(btn)}
                                                    className={`h-7 rounded text-[11px] transition-colors cursor-pointer ${btn === 'CLEAR' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {btn}
                                                </button>
                                            ))}
                                            {['4', '5', '6', 'BACK'].map(btn => (
                                                <button
                                                    key={btn}
                                                    type="button"
                                                    onClick={() => handleKeypadPress(btn)}
                                                    className={`h-7 rounded text-[11px] transition-colors cursor-pointer ${btn === 'BACK' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {btn === 'BACK' ? '⌫' : btn}
                                                </button>
                                            ))}
                                            {['7', '8', '9', 'FULL'].map(btn => (
                                                <button
                                                    key={btn}
                                                    type="button"
                                                    onClick={() => handleKeypadPress(btn)}
                                                    className={`h-7 rounded text-[11px] transition-colors cursor-pointer ${btn === 'FULL' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {btn === 'FULL' ? 'Full Due' : btn}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action Buttons */}
                <div className="bg-gray-50/90 border-t border-gray-200 px-4 py-2 flex items-center justify-between select-none">
                    <div className="flex items-center gap-3">
                        {step === 1 && (
                            <button
                                type="button"
                                onClick={handleAddRoomRow}
                                className="h-7 px-3 bg-white border border-blue-400 hover:border-blue-600 hover:bg-blue-50 text-blue-700 rounded text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs active:scale-[0.98]"
                                title="Add another room row"
                            >
                                <Plus size={13} className="text-blue-600 stroke-[2.5]" />
                                <span>Add Room</span>
                            </button>
                        )}
                        <div className="text-[11px] text-gray-500">
                            {step === 1 && (
                                <span className="flex items-center gap-2">
                                    <span>Rooms: <strong className="text-gray-800 font-semibold">{totalRoomsCount}</strong></span>
                                    <span className="text-gray-300">•</span>
                                    <span>Check-in: <strong className="text-gray-800 font-semibold">{checkIn}</strong></span>
                                    <span className="text-gray-300">•</span>
                                    <span className="flex items-center">
                                        Total Estimated: <strong className="text-blue-900 font-mono text-xs font-bold ml-1">{finalPayable.toFixed(2)}</strong> <span className="ml-0.5">{currencyCode}</span>
                                        {taxCalculation.totalTaxAmount > 0 && (
                                            <span className="ml-1 text-[10px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 font-normal">
                                                (incl. VAT & Tax ৳{taxCalculation.totalTaxAmount.toFixed(2)})
                                            </span>
                                        )}
                                    </span>
                                </span>
                            )}
                            {step === 2 && `Guest: ${guestName || 'Not entered'} | Phone: ${mobile || 'N/A'}`}
                            {step === 3 && `Payable: ৳${finalPayable.toFixed(2)} | Paid: ৳${totalPaid.toFixed(2)} | Due: ৳${totalDue.toFixed(2)}`}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={() => setStep((step - 1) as any)}
                                className="h-7 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs"
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
                                    if (step === 2 && !isGuestProfileComplete) {
                                        toast.warning('Please enter guest full legal name and mobile number.');
                                        setStep2Tab('profile');
                                        return;
                                    }
                                    if (step === 2 && activeBlacklistAlert && !managerOverrideApproved) {
                                        toast.error('❌ CANNOT PROCEED: Guest is blacklisted. Duty Manager Override is required to continue.');
                                        return;
                                    }
                                    setStep((step + 1) as any);
                                }}
                                className={`h-7 px-4 rounded text-[11px] transition-colors shadow-2xs ${step === 1 && hasOverbookingError
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-[#1e3a8a] hover:bg-blue-900 text-white cursor-pointer'
                                    }`}
                                title={step === 1 && hasOverbookingError ? 'Overbooking error: Reduce rooms before proceeding' : 'Proceed to next step'}
                            >
                                Next Step →
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                {isEditMode ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleFinalizeBooking('reserve')}
                                            className="h-7 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs flex items-center gap-1"
                                        >
                                            <Check size={12} className="stroke-[2.5]" />
                                            <span>Update Reservation</span>
                                        </button>
                                        {editingReservation?.status !== 'in-house' && (
                                            <button
                                                type="button"
                                                onClick={() => handleFinalizeBooking('checkin')}
                                                className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs"
                                            >
                                                Update &amp; Check In
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleFinalizeBooking('hold')}
                                            className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-semibold cursor-pointer transition-colors shadow-2xs"
                                        >
                                            Hold Till
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleFinalizeBooking('checkin')}
                                            className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] cursor-pointer transition-colors shadow-2xs"
                                        >
                                            Check In
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleFinalizeBooking('reserve')}
                                            className="h-7 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[11px] cursor-pointer transition-colors shadow-2xs"
                                        >
                                            Confirm Reserve
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Success Booking Confirmation Modal */}
            {createdReservation && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-[460px] w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                            <CheckCircle2 size={28} />
                        </div>

                        <div className="text-center space-y-1">
                            <h3 className="text-base text-gray-900">Reservation Confirmed!</h3>
                            <p className="text-xs text-gray-500">
                                Booking reference <strong className="font-mono text-blue-700">{createdReservation.reservationNumber}</strong> has been saved.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3.5 space-y-2 text-xs border border-gray-100">
                            <div className="flex justify-between text-gray-600">
                                <span>Guest Name:</span>
                                <strong className="text-gray-900">{createdReservation.guestName}</strong>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Room:</span>
                                <strong className="text-blue-700 font-mono">{createdReservation.roomNumber} ({createdReservation.roomType})</strong>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Stay Dates:</span>
                                <span className="font-medium text-gray-900">{createdReservation.checkIn} to {createdReservation.checkOut} ({createdReservation.nights} nights)</span>
                            </div>
                            {createdReservation.taxApplicable && (createdReservation.totalTaxAmount > 0) && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Taxes &amp; VAT ({createdReservation.taxConfigCode}):</span>
                                    <strong className="text-blue-700 font-mono">+৳{(createdReservation.totalTaxAmount || 0).toFixed(2)}</strong>
                                </div>
                            )}
                            <div className="flex justify-between text-gray-800 font-semibold border-t border-gray-200 pt-1">
                                <span>Grand Total (Payable):</span>
                                <strong className="text-gray-900 font-mono">৳{createdReservation.totalAmount.toFixed(2)}</strong>
                            </div>
                            <div className="flex justify-between text-rose-700 font-semibold">
                                <span>Due Balance:</span>
                                <strong className="font-mono">৳{(createdReservation.dueAmount || 0).toFixed(2)}</strong>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Status:</span>
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {createdReservation.status}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setActivePage('reservations')}
                                className="w-full py-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded-lg text-xs cursor-pointer transition-colors shadow-2xs"
                            >
                                View in Reservations List
                            </button>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActivePage('stay-view')}
                                    className="py-2 bg-white border border-gray-200 hover:bg-gray-50 text-blue-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                                >
                                    Stay View
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                                >
                                    New Booking
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

export default AddReservation;
