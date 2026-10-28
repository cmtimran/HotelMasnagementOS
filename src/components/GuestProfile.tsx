import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    User, Search, Plus, Star, Phone, Mail,
    MapPin, ShieldCheck,
    Heart, CheckCircle2,
    Building2, Clock,
    AlertTriangle, ChevronRight, ChevronLeft,
    Home, Edit3, Receipt,
    GitMerge, CheckSquare, Square, Loader2,
    Ban, History, FileText
} from 'lucide-react';
import { getAllStoredReservations, saveStoredReservations, broadcastPMSEvent, syncReservationsFromDB, subscribeToPMSEvents, type StoredReservation } from '../utils/roomInventoryEngine';
import { useNavigation } from '../context/NavigationContext';
import { getApiBaseUrl } from '../utils/apiUrl';
import MergeGuestModal from './modals/MergeGuestModal';
import { isSamePhoneNumber } from '../utils/phoneUtils';
import {
    formatIdentityDisplay,
    normalizeIdentityNumber,
    type BlacklistCategory,
    type ProfileEditAuditEntry
} from '../utils/identityUtils';
export { normalizePhone, isSamePhoneNumber } from '../utils/phoneUtils';
import {
    COUNTRIES_DATABASE,
    getCitiesForCountry,
    getNationalityForCountry
} from '../utils/geoData';

export interface GuestRecord {
    id: number;
    title: 'Mr.' | 'Mrs.' | 'Ms.' | 'Dr.' | 'Prof.' | 'Engr.';
    name: string;
    phone: string;
    altPhone?: string;
    email: string;
    vipTier: 'Regular' | 'Silver' | 'Gold' | 'Platinum VIP' | 'Corporate VIP';
    nationality: string;
    idType: 'National ID (NID)' | 'Passport' | 'Driving License' | 'Diplomatic ID' | 'Birth Certificate' | 'Other';
    idNumber: string;
    idExpiry?: string;
    issuingCountry?: string;
    dob: string;
    gender: 'Male' | 'Female' | 'Other';
    homeCity: string;
    homeCountry: string;
    address?: string;
    postalCode?: string;

    // Blacklist / Block Status
    isBlacklisted?: boolean;
    blacklistReason?: string;
    blacklistedBy?: string;
    blacklistedAt?: string;

    // Polymorphic Identity Attributes
    idIssueDate?: string;
    idExpiryDate?: string;
    idIssueCountry?: string;
    idIssuePlace?: string;
    passportVisaNumber?: string;
    passportVisaType?: string;
    passportVisaExpiry?: string;
    passportEntryPort?: string;
    drivingVehicleClass?: string;
    fatherOrSpouseName?: string;
    tags?: string[];

    emergencyContact?: {
        name: string;
        relationship: string;
        phone: string;
    };
    company?: string;
    designation?: string;
    corporateTaxId?: string;
    billingRoute?: 'Self-Pay (Guest Folio)' | 'Bill to Company (BTC / City Ledger)' | 'Travel Agent / OTA Voucher';
    totalStays: number;
    totalNights: number;
    lifetimeSpendBDT: number;
    lastStayDate: string;
    loyaltyPoints: number;
    preferences: {
        roomType: string;
        floorPreference: 'High Floor' | 'Ground Floor' | 'Quiet Corner' | 'Away from Elevator' | 'Near Elevator';
        bedType?: 'King Bed' | 'Twin Beds' | 'Single Bed';
        pillowType: 'Feather / Down' | 'Orthopedic' | 'Hypoallergenic';
        smoking?: 'Non-Smoking' | 'Smoking';
        dietary: string;
        allergies?: string;
        newspaper: string;
        specialNotes: string;
    };
    stayHistory: {
        resNumber: string;
        roomNumber: string;
        roomType: string;
        checkIn: string;
        checkOut: string;
        nights: number;
        totalAmountBDT: number;
        status: 'Checked-Out' | 'In-House' | 'Cancelled';
    }[];
}

const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return Math.max(0, age);
};

export const parseTitleAndName = (fullName: string): { title: GuestRecord['title']; cleanName: string } => {
    if (!fullName) return { title: 'Mr.', cleanName: 'Guest' };
    const raw = fullName.trim();
    const titleMatch = raw.match(/^(Mr|Mrs|Ms|Miss|Dr|Prof|Engr)\.?\s+/i);
    if (!titleMatch) {
        return { title: 'Mr.', cleanName: raw };
    }
    const rawTitle = titleMatch[1].toLowerCase();
    let title: GuestRecord['title'] = 'Mr.';
    if (rawTitle === 'dr') title = 'Dr.';
    else if (rawTitle === 'ms' || rawTitle === 'miss') title = 'Ms.';
    else if (rawTitle === 'mrs') title = 'Mrs.';
    else if (rawTitle === 'prof') title = 'Prof.';
    else if (rawTitle === 'engr') title = 'Engr.';

    const afterFirstTitle = raw.substring(titleMatch[0].length).trim();
    // Clean any accidental duplicate title prefixes (e.g. "Mr. Mr Imran" or "Mr Imran")
    const cleanName = afterFirstTitle.replace(/^(Mr|Mrs|Ms|Miss|Dr|Prof|Engr)\.?\s+/i, '').trim();
    return { title, cleanName: cleanName || raw };
};

const getSavedGuestProfiles = (): GuestRecord[] => {
    try {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('hotel_guest_profiles_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        }
    } catch {}
    return [];
};

const deriveGuestsFromReservations = (reservations: StoredReservation[]): GuestRecord[] => {
    const savedProfiles = getSavedGuestProfiles();
    const map = new Map<string, GuestRecord>();

    reservations.forEach((r, idx) => {
        const { title: detectedTitle, cleanName } = parseTitleAndName(r.guestName || `Guest ${idx + 1}`);
        const key = cleanName.toLowerCase();
        const nights = Math.max(1, Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86400000));
        const spend = Number(r.totalAmount) || Number(r.totalRate) || 0;
        const stayItem: GuestRecord['stayHistory'][0] = {
            resNumber: String(r.reservationNumber || r.id),
            roomNumber: r.roomNumber || r.roomNo || (Array.isArray(r.allocatedRooms) ? r.allocatedRooms[0] : '101'),
            roomType: r.roomType || 'Deluxe',
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            nights,
            totalAmountBDT: spend,
            status: r.status === 'CANCELLED' ? 'Cancelled' : r.status === 'CHECKED_OUT' || r.status === 'checked-out' ? 'Checked-Out' : 'In-House'
        };

        const rawPhone = r.phone || r.guestPhone || '';
        const cleanE = (r.email || r.guestEmail || '').trim().toLowerCase();

        // Check if an existing guest in map matches by normalized phone, email, or clean name
        let matchedKey: string | undefined;
        for (const [k, g] of map.entries()) {
            if (rawPhone && isSamePhoneNumber(rawPhone, g.phone)) {
                matchedKey = k;
                break;
            }
            if (cleanE && !cleanE.includes('guest.com') && !cleanE.includes('hospitality.com') && g.email && g.email.trim().toLowerCase() === cleanE) {
                matchedKey = k;
                break;
            }
            if (k === key) {
                matchedKey = k;
                break;
            }
        }

        const existing = matchedKey ? map.get(matchedKey) : undefined;
        if (existing) {
            existing.totalStays += 1;
            existing.totalNights += nights;
            existing.lifetimeSpendBDT += spend;
            existing.loyaltyPoints = Math.round(existing.lifetimeSpendBDT / 20);
            if (r.checkIn > existing.lastStayDate) existing.lastStayDate = r.checkIn;
            existing.stayHistory.push(stayItem);
            if (existing.lifetimeSpendBDT > 100000) existing.vipTier = 'Platinum VIP';
            else if (existing.lifetimeSpendBDT > 50000 && existing.vipTier !== 'Platinum VIP') existing.vipTier = 'Gold';
        } else {
            // Check if user already customized/edited this profile in hotel_guest_profiles_v2
            const savedMatch = savedProfiles.find(p => {
                const pClean = parseTitleAndName(p.name).cleanName.toLowerCase();
                const phoneMatch = Boolean(rawPhone && isSamePhoneNumber(rawPhone, p.phone));
                const emailMatch = Boolean(cleanE && p.email && cleanE === p.email.trim().toLowerCase() && !cleanE.includes('guest.com') && !cleanE.includes('hospitality.com'));
                return phoneMatch || emailMatch || pClean === key;
            });

            if (savedMatch) {
                const mergedStayHistory = [...(savedMatch.stayHistory || [])];
                if (!mergedStayHistory.some(s => s.resNumber === stayItem.resNumber)) {
                    mergedStayHistory.push(stayItem);
                }
                const savedParsed = parseTitleAndName(savedMatch.name);
                map.set(key, {
                    ...savedMatch,
                    id: savedMatch.id || idx + 1,
                    title: savedMatch.title || detectedTitle,
                    name: savedParsed.cleanName || cleanName,
                    phone: savedMatch.phone || r.phone || r.guestPhone || '+880 1711-000000',
                    email: savedMatch.email || r.email || r.guestEmail || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@guest.com`,
                    totalStays: Math.max(savedMatch.totalStays || 1, 1),
                    totalNights: (savedMatch.totalNights || 0) + nights,
                    lifetimeSpendBDT: (savedMatch.lifetimeSpendBDT || 0) + spend,
                    lastStayDate: r.checkIn > (savedMatch.lastStayDate || '') ? r.checkIn : (savedMatch.lastStayDate || r.checkIn),
                    loyaltyPoints: Math.round(((savedMatch.lifetimeSpendBDT || 0) + spend) / 20),
                    stayHistory: mergedStayHistory
                });
            } else {
                map.set(key, {
                    id: idx + 1,
                    title: detectedTitle,
                    name: cleanName,
                    phone: r.phone || r.guestPhone || '+880 1711-000000',
                    altPhone: '+880 1819-000000',
                    email: r.email || r.guestEmail || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@guest.com`,
                    vipTier: spend > 50000 ? 'Gold' : r.bookingSource === 'Corporate' ? 'Corporate VIP' : 'Regular',
                    nationality: r.nationality || 'Bangladesh',
                    idType: r.passportNo ? 'Passport' : 'National ID (NID)',
                    idNumber: r.passportNo || r.nidNumber || `KYC-${10000 + idx}`,
                    idExpiry: '2030-12-31',
                    issuingCountry: r.nationality || 'Bangladesh',
                    dob: '1988-05-15',
                    gender: 'Male',
                    homeCity: 'Dhaka',
                    homeCountry: r.nationality || 'Bangladesh',
                    address: 'House 42, Road 11, Banani',
                    postalCode: '1213',
                    emergencyContact: {
                        name: 'Family Contact',
                        relationship: 'Spouse',
                        phone: '+880 1712-345678'
                    },
                    company: r.bookingSource === 'Corporate' ? 'Corporate Partner' : undefined,
                    designation: r.bookingSource === 'Corporate' ? 'Executive' : undefined,
                    corporateTaxId: r.bookingSource === 'Corporate' ? 'BIN-00294819-2024' : undefined,
                    billingRoute: r.bookingSource === 'Corporate' ? 'Bill to Company (BTC / City Ledger)' : 'Self-Pay (Guest Folio)',
                    totalStays: 1,
                    totalNights: nights,
                    lifetimeSpendBDT: spend,
                    lastStayDate: r.checkIn,
                    loyaltyPoints: Math.round(spend / 20),
                    preferences: {
                        roomType: r.roomType || 'Deluxe Double',
                        floorPreference: 'High Floor',
                        bedType: 'King Bed',
                        pillowType: 'Feather / Down',
                        smoking: 'Non-Smoking',
                        dietary: 'Standard Halal',
                        allergies: 'None',
                        newspaper: 'The Daily Star',
                        specialNotes: r.notes || 'Registered via Reservation PMS.'
                    },
                    stayHistory: [stayItem]
                });
            }
        }
    });

    // Also include any standalone saved profiles that don't have reservations yet
    savedProfiles.forEach((sp, spIdx) => {
        const { title, cleanName } = parseTitleAndName(sp.name);
        const key = cleanName.toLowerCase();
        const alreadyExists = Array.from(map.values()).some(g =>
            (sp.phone && isSamePhoneNumber(sp.phone, g.phone)) ||
            (sp.email && g.email && sp.email.trim().toLowerCase() === g.email.trim().toLowerCase() && !sp.email.includes('guest.com')) ||
            parseTitleAndName(g.name).cleanName.toLowerCase() === key
        );
        if (!alreadyExists && !map.has(key)) {
            map.set(key, {
                ...sp,
                id: sp.id || (1000 + spIdx),
                title: sp.title || title,
                name: cleanName
            });
        }
    });

    return Array.from(map.values());
};

export const GuestProfile: React.FC = () => {
    const [guests, setGuests] = useState<GuestRecord[]>(() => {
        const saved = localStorage.getItem('hotel_guest_profiles_v2');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch {}
        }
        return deriveGuestsFromReservations(getAllStoredReservations());
    });

    const [duplicateClusters, setDuplicateClusters] = useState<any[]>([]);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [activeMergeCluster, setActiveMergeCluster] = useState<any | null>(null);
    const [selectedForMerge, setSelectedForMerge] = useState<number[]>([]);

    const refreshGuests = useCallback(async () => {
        try {
            const apiBase = getApiBaseUrl();
            const [dbRes, dupRes] = await Promise.all([
                fetch(`${apiBase}/api/guests`).then(r => r.json()).catch(() => null),
                fetch(`${apiBase}/api/guests/duplicates`).then(r => r.json()).catch(() => null)
            ]);

            if (dupRes?.success && Array.isArray(dupRes.data)) {
                setDuplicateClusters(dupRes.data);
            }

            const reservations = await syncReservationsFromDB().catch(() => getAllStoredReservations());
            const derived = deriveGuestsFromReservations(reservations);

            if (dbRes?.success && Array.isArray(dbRes.data) && dbRes.data.length > 0) {
                const mergedMap = new Map<number | string, GuestRecord>();
                derived.forEach(d => mergedMap.set(d.id, d));
                dbRes.data.forEach((dg: any) => {
                    const existing = Array.from(mergedMap.values()).find(m =>
                        m.id === dg.id ||
                        (dg.phone && isSamePhoneNumber(dg.phone, m.phone)) ||
                        (dg.email && m.email && m.email.toLowerCase() === dg.email.toLowerCase() && !dg.email.includes('hospitality.com'))
                    );
                    const dbSpend = Number(dg.totalSpend || 0);
                    const dbStays = Number(dg.totalStays || 0);
                    const dbNights = Number(dg.totalNights || dg.totalStays || 0);
                    const dbPoints = Number(dg.loyaltyPoints ?? Math.round(dbSpend / 20));

                    if (existing) {
                        const finalSpend = Math.max(Number(existing.lifetimeSpendBDT || 0), dbSpend);
                        const finalStays = Math.max(Number(existing.totalStays || 0), dbStays);
                        const finalNights = Math.max(Number(existing.totalNights || 0), dbNights);
                        const finalPoints = Math.round(finalSpend / 20);
                        const finalLastStay = (dg.lastStayDate && dg.lastStayDate > (existing.lastStayDate || ''))
                            ? dg.lastStayDate
                            : (existing.lastStayDate || dg.lastStayDate || '-');

                        if (existing.id !== dg.id) {
                            mergedMap.delete(existing.id);
                        }

                        mergedMap.set(dg.id, {
                            ...existing,
                            id: dg.id,
                            title: (dg.salutation ? `${dg.salutation}.` : existing.title) as GuestRecord['title'],
                            name: `${dg.firstName} ${dg.lastName}`.trim() || existing.name,
                            phone: dg.phone || existing.phone,
                            email: dg.email || existing.email,
                            idType: dg.idType || existing.idType,
                            idNumber: dg.idNumber || existing.idNumber,
                            vipTier: dg.vipStatus === 'VVIP' ? 'Platinum VIP' : dg.vipStatus === 'VIP' ? 'Gold' : existing.vipTier,
                            totalStays: finalStays,
                            totalNights: finalNights,
                            lifetimeSpendBDT: finalSpend,
                            loyaltyPoints: finalPoints,
                            lastStayDate: finalLastStay,
                            isBlacklisted: Boolean(dg.isBlacklisted),
                            blacklistReason: dg.blacklistReason || existing.blacklistReason,
                            blacklistedBy: dg.blacklistedBy || existing.blacklistedBy,
                            blacklistedAt: dg.blacklistedAt || existing.blacklistedAt,
                            dob: dg.dob || existing.dob || '1990-01-01',
                            gender: dg.gender || existing.gender || 'Male',
                            idIssueDate: dg.idIssueDate || existing.idIssueDate,
                            idExpiryDate: dg.idExpiryDate || existing.idExpiryDate,
                            idIssueCountry: dg.idIssueCountry || existing.idIssueCountry,
                            idIssuePlace: dg.idIssuePlace || existing.idIssuePlace,
                            passportVisaNumber: dg.passportVisaNumber || existing.passportVisaNumber,
                            passportVisaType: dg.passportVisaType || existing.passportVisaType,
                            passportVisaExpiry: dg.passportVisaExpiry || existing.passportVisaExpiry,
                            passportEntryPort: dg.passportEntryPort || existing.passportEntryPort,
                            drivingVehicleClass: dg.drivingVehicleClass || existing.drivingVehicleClass,
                            tags: dg.tags || existing.tags || [],
                            preferences: existing.preferences || {
                                roomType: 'Deluxe Double',
                                floorPreference: 'High Floor',
                                pillowType: 'Feather / Down',
                                smoking: 'Non-Smoking',
                                dietary: 'Standard Halal',
                                newspaper: 'The Daily Star',
                                specialNotes: 'Loaded from Hotel Database.'
                            }
                        });
                    } else {
                        mergedMap.set(dg.id, {
                            id: dg.id,
                            title: (dg.salutation ? `${dg.salutation}.` : 'Mr.') as GuestRecord['title'],
                            name: `${dg.firstName} ${dg.lastName}`.trim(),
                            phone: dg.phone || '',
                            email: dg.email || '',
                            vipTier: dg.vipStatus === 'VVIP' ? 'Platinum VIP' : dg.vipStatus === 'VIP' ? 'Gold' : 'Regular',
                            nationality: dg.nationality || 'Bangladesh',
                            idType: dg.idType || 'National ID (NID)',
                            idNumber: dg.idNumber || '',
                            dob: dg.dob || '1990-01-01',
                            gender: dg.gender || 'Male',
                            homeCity: dg.city || 'Dhaka',
                            homeCountry: dg.country || 'Bangladesh',
                            address: dg.address || '',
                            totalStays: dbStays,
                            totalNights: dbNights,
                            lifetimeSpendBDT: dbSpend,
                            lastStayDate: dg.lastStayDate || '-',
                            loyaltyPoints: dbPoints,
                            isBlacklisted: Boolean(dg.isBlacklisted),
                            blacklistReason: dg.blacklistReason,
                            blacklistedBy: dg.blacklistedBy,
                            blacklistedAt: dg.blacklistedAt,
                            idIssueDate: dg.idIssueDate,
                            idExpiryDate: dg.idExpiryDate,
                            idIssueCountry: dg.idIssueCountry,
                            idIssuePlace: dg.idIssuePlace,
                            passportVisaNumber: dg.passportVisaNumber,
                            passportVisaType: dg.passportVisaType,
                            passportVisaExpiry: dg.passportVisaExpiry,
                            passportEntryPort: dg.passportEntryPort,
                            drivingVehicleClass: dg.drivingVehicleClass,
                            tags: dg.tags || [],
                            preferences: {
                                roomType: 'Deluxe Double',
                                floorPreference: 'High Floor',
                                pillowType: 'Feather / Down',
                                smoking: 'Non-Smoking',
                                dietary: 'Standard Halal',
                                newspaper: 'The Daily Star',
                                specialNotes: 'Loaded from Hotel Database.'
                            },
                            stayHistory: []
                        });
                    }
                });
                const finalGuests = Array.from(mergedMap.values());
                setGuests(finalGuests);
                localStorage.setItem('hotel_guest_profiles_v2', JSON.stringify(finalGuests));
            } else if (derived.length > 0) {
                setGuests(derived);
            }
        } catch (err) {
            console.warn('Error refreshing guests:', err);
        }
    }, []);

    useEffect(() => {
        refreshGuests();
        const unsub = subscribeToPMSEvents((event) => {
            if (event.type === 'GUESTS_UPDATED' || event.type === 'INVENTORY_REFRESH') {
                refreshGuests();
            }
        });
        return () => unsub();
    }, [refreshGuests]);

    const { setActivePage } = useNavigation();

    const [selectedGuestId, setSelectedGuestId] = useState<number>(() => guests[0]?.id || 1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
    const [activeTab, setActiveTab] = useState<'overview' | 'preferences' | 'vault' | 'corporate' | 'audit'>('overview');
    const [activityFilter, setActivityFilter] = useState<'all' | 'reservations' | 'checkins' | 'outlets'>('all');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Modal state for adding or editing a guest
    const [showAddGuestModal, setShowAddGuestModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingGuestId, setEditingGuestId] = useState<number | null>(null);
    const [modalTab, setModalTab] = useState<'kyc' | 'contact' | 'preferences' | 'corporate'>('kyc');

    // Blacklist / Block Modal State
    const [showBlacklistModal, setShowBlacklistModal] = useState(false);
    const [blacklistCategory, setBlacklistCategory] = useState<BlacklistCategory>('Payment Default / Unpaid Folio');
    const [blacklistReasonInput, setBlacklistReasonInput] = useState('');
    const [blacklistStaffName, setBlacklistStaffName] = useState('Duty Manager');
    const [blacklistActionType, setBlacklistActionType] = useState<'block' | 'unblock'>('block');

    // Audit Trail State
    const [editHistory, setEditHistory] = useState<ProfileEditAuditEntry[]>([]);
    const [loadingEditHistory, setLoadingEditHistory] = useState(false);

    const initialGuestForm = {
        title: 'Mr.' as GuestRecord['title'],
        name: '',
        gender: 'Male' as GuestRecord['gender'],
        dob: '1992-05-15',
        nationality: 'Bangladesh',
        idType: 'National ID (NID)' as GuestRecord['idType'],
        idNumber: '',
        idExpiry: '2030-12-31',
        issuingCountry: 'Bangladesh',

        idIssueDate: '',
        idExpiryDate: '2030-12-31',
        idIssueCountry: 'Bangladesh',
        idIssuePlace: '',
        passportVisaNumber: '',
        passportVisaType: 'Tourist',
        passportVisaExpiry: '2028-12-31',
        passportEntryPort: 'Hazrat Shahjalal Int Airport, Dhaka',
        drivingVehicleClass: 'Light',
        fatherOrSpouseName: '',
        tags: [] as string[],

        phone: '',
        altPhone: '',
        email: '',
        address: '',
        homeCity: 'Dhaka',
        homeCountry: 'Bangladesh',
        postalCode: '1212',
        emergencyName: '',
        emergencyRelation: 'Spouse',
        emergencyPhone: '',

        roomType: 'Deluxe King',
        floorPreference: 'High Floor' as GuestRecord['preferences']['floorPreference'],
        bedType: 'King Bed' as NonNullable<GuestRecord['preferences']['bedType']>,
        pillowType: 'Feather / Down' as GuestRecord['preferences']['pillowType'],
        smoking: 'Non-Smoking' as NonNullable<GuestRecord['preferences']['smoking']>,
        dietary: 'Standard Halal',
        allergies: 'None',
        newspaper: 'The Daily Star',

        vipTier: 'Regular' as GuestRecord['vipTier'],
        company: '',
        designation: '',
        corporateTaxId: '',
        billingRoute: 'Self-Pay (Guest Folio)' as NonNullable<GuestRecord['billingRoute']>,
        specialNotes: ''
    };

    const [newGuestForm, setNewGuestForm] = useState(initialGuestForm);

    const handleOpenCreateModal = () => {
        setModalMode('create');
        setEditingGuestId(null);
        setNewGuestForm(initialGuestForm);
        setModalTab('kyc');
        setShowAddGuestModal(true);
    };

    const handleOpenEditModal = (guest: GuestRecord = activeGuest, targetTab: 'kyc' | 'contact' | 'preferences' | 'corporate' = 'kyc') => {
        if (!guest) return;
        setModalMode('edit');
        setEditingGuestId(guest.id);
        setModalTab(targetTab);
        const { title: parsedTitle, cleanName } = parseTitleAndName(guest.name);
        setNewGuestForm({
            title: guest.title || parsedTitle,
            name: cleanName,
            gender: guest.gender || 'Male',
            dob: guest.dob || '1990-01-01',
            nationality: guest.nationality || 'Bangladesh',
            idType: guest.idType || 'National ID (NID)',
            idNumber: guest.idNumber || '',
            idExpiry: guest.idExpiry || '2030-12-31',
            issuingCountry: guest.issuingCountry || guest.nationality || 'Bangladesh',

            idIssueDate: guest.idIssueDate || '',
            idExpiryDate: guest.idExpiryDate || guest.idExpiry || '2030-12-31',
            idIssueCountry: guest.idIssueCountry || guest.issuingCountry || guest.nationality || 'Bangladesh',
            idIssuePlace: guest.idIssuePlace || '',
            passportVisaNumber: guest.passportVisaNumber || '',
            passportVisaType: guest.passportVisaType || 'Tourist',
            passportVisaExpiry: guest.passportVisaExpiry || '',
            passportEntryPort: guest.passportEntryPort || 'Hazrat Shahjalal Int Airport, Dhaka',
            drivingVehicleClass: guest.drivingVehicleClass || 'Light',
            fatherOrSpouseName: guest.fatherOrSpouseName || '',
            tags: guest.tags || [],

            phone: guest.phone || '',
            altPhone: guest.altPhone || '',
            email: guest.email || '',
            address: guest.address || '',
            homeCity: guest.homeCity || 'Dhaka',
            homeCountry: guest.homeCountry || 'Bangladesh',
            postalCode: guest.postalCode || '',
            emergencyName: guest.emergencyContact?.name || '',
            emergencyRelation: guest.emergencyContact?.relationship || 'Spouse',
            emergencyPhone: guest.emergencyContact?.phone || '',

            roomType: guest.preferences?.roomType || 'Deluxe King',
            floorPreference: guest.preferences?.floorPreference || 'High Floor',
            bedType: guest.preferences?.bedType || 'King Bed',
            pillowType: guest.preferences?.pillowType || 'Feather / Down',
            smoking: guest.preferences?.smoking || 'Non-Smoking',
            dietary: guest.preferences?.dietary || 'Standard Halal',
            allergies: guest.preferences?.allergies || 'None',
            newspaper: guest.preferences?.newspaper || 'The Daily Star',

            vipTier: guest.vipTier || 'Regular',
            company: guest.company || '',
            designation: guest.designation || '',
            corporateTaxId: guest.corporateTaxId || '',
            billingRoute: guest.billingRoute || 'Self-Pay (Guest Folio)',
            specialNotes: guest.preferences?.specialNotes || ''
        });
        setShowAddGuestModal(true);
    };

    useEffect(() => {
        localStorage.setItem('hotel_guest_profiles_v2', JSON.stringify(guests));
    }, [guests]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const activeGuest = guests.find(g => g.id === selectedGuestId) || guests[0];

    const [guestHistoryLedger, setGuestHistoryLedger] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    useEffect(() => {
        if (!activeGuest?.id) {
            setGuestHistoryLedger([]);
            return;
        }
        const apiBase = getApiBaseUrl();
        setIsLoadingHistory(true);
        fetch(`${apiBase}/api/guests/${activeGuest.id}/history`)
            .then(r => r.json())
            .then(res => {
                if (res.success && Array.isArray(res.data)) {
                    setGuestHistoryLedger(res.data);
                } else {
                    setGuestHistoryLedger([]);
                }
            })
            .catch(err => {
                console.warn('Failed to fetch guest history ledger:', err);
                setGuestHistoryLedger([]);
            })
            .finally(() => {
                setIsLoadingHistory(false);
            });
    }, [activeGuest?.id]);

    useEffect(() => {
        if (activeTab === 'audit' && activeGuest?.id) {
            setLoadingEditHistory(true);
            const apiBase = getApiBaseUrl();
            fetch(`${apiBase}/api/guests/${activeGuest.id}/edit-history`)
                .then(r => r.json())
                .then(res => {
                    if (res.success && Array.isArray(res.data)) {
                        setEditHistory(res.data);
                    } else {
                        setEditHistory([]);
                    }
                })
                .catch(err => {
                    console.warn('Failed to load guest edit history:', err);
                    setEditHistory([]);
                })
                .finally(() => {
                    setLoadingEditHistory(false);
                });
        }
    }, [activeTab, activeGuest?.id]);

    const handleConfirmBlacklist = async () => {
        if (!activeGuest?.id) return;
        const apiBase = getApiBaseUrl();
        const isBlocking = blacklistActionType === 'block';

        const fullReason = isBlocking
            ? `${blacklistCategory}: ${blacklistReasonInput.trim() || 'Payment Default / Security Violation'}`
            : null;

        try {
            const res = await fetch(`${apiBase}/api/guests/${activeGuest.id}/blacklist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isBlacklisted: isBlocking,
                    blacklistReason: fullReason,
                    blacklistedBy: blacklistStaffName.trim() || 'Duty Manager'
                })
            });
            const json = await res.json();
            if (json.success) {
                const updated = guests.map(g => {
                    if (g.id !== activeGuest.id) return g;
                    return {
                        ...g,
                        isBlacklisted: isBlocking,
                        blacklistReason: fullReason || undefined,
                        blacklistedBy: isBlocking ? (blacklistStaffName.trim() || 'Duty Manager') : undefined,
                        blacklistedAt: isBlocking ? new Date().toISOString() : undefined
                    };
                });
                setGuests(updated);
                localStorage.setItem('hotel_guest_profiles_v2', JSON.stringify(updated));
                setShowBlacklistModal(false);
                showToast(isBlocking ? `Guest ${activeGuest.name} has been placed on Blacklist.` : `Guest ${activeGuest.name} has been removed from Blacklist.`);
                refreshGuests();
            } else {
                alert(json.error || 'Failed to update blacklist status');
            }
        } catch (err) {
            console.error('Blacklist update error:', err);
            const updated = guests.map(g => {
                if (g.id !== activeGuest.id) return g;
                return {
                    ...g,
                    isBlacklisted: isBlocking,
                    blacklistReason: fullReason || undefined,
                    blacklistedBy: isBlocking ? (blacklistStaffName.trim() || 'Duty Manager') : undefined,
                    blacklistedAt: isBlocking ? new Date().toISOString() : undefined
                };
            });
            setGuests(updated);
            localStorage.setItem('hotel_guest_profiles_v2', JSON.stringify(updated));
            setShowBlacklistModal(false);
            showToast(isBlocking ? `Guest ${activeGuest.name} has been placed on Blacklist.` : `Guest ${activeGuest.name} has been removed from Blacklist.`);
        }
    };

    const { reservationsList, checkinsList, outletBillsList, allLedgerItems } = useMemo(() => {
        if (!activeGuest) {
            return { reservationsList: [], checkinsList: [], outletBillsList: [], allLedgerItems: [] };
        }

        const canonicalReservations = getAllStoredReservations();
        const guestNameLower = parseTitleAndName(activeGuest.name).cleanName.toLowerCase().trim();

        // 1. Reservations (Real bookings only - zero mock fallback)
        const matchedRes = canonicalReservations.filter((r: StoredReservation) => {
            const rClean = parseTitleAndName(r.guestName || '').cleanName.toLowerCase().trim();
            const phoneMatch = Boolean(r.phone && activeGuest.phone && isSamePhoneNumber(r.phone, activeGuest.phone));
            const emailMatch = Boolean(r.email && activeGuest.email && r.email.trim().toLowerCase() === activeGuest.email.trim().toLowerCase() && !r.email.includes('guest.com'));
            return (rClean && (rClean.includes(guestNameLower) || guestNameLower.includes(rClean))) || phoneMatch || emailMatch;
        });

        const seenResRefs = new Set<string>();
        const seenStayRefs = new Set<string>();
        const resItems: any[] = [];
        const checkinItems: any[] = [];

        // Add from local reservations
        matchedRes.forEach((r: StoredReservation, i: number) => {
            const resNum = r.reservationNumber || `RES-${r.id || 10000 + i}`;
            seenResRefs.add(resNum);
            const nights = Number(r.nights) || Math.max(1, Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86400000));
            const amount = Number(r.totalAmount) || Number(r.totalRate) || 0;
            const status = (r.status || 'CONFIRMED').toUpperCase();
            const badgeColor =
                status.includes('CHECKED_IN') || status.includes('CHECKED-IN') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                status.includes('CHECKED_OUT') || status.includes('CHECKED-OUT') ? 'bg-slate-100 text-slate-700 border-slate-200' :
                status.includes('CANCEL') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                'bg-blue-50 text-blue-700 border-blue-200';

            resItems.push({
                id: `res-${r.id || resNum}`,
                type: 'reservation' as const,
                refNumber: resNum,
                title: `${r.roomType || 'Room'} Reservation`,
                particulars: `${r.ratePlan || 'Standard Rate'} • ${r.adults || 1} Adult(s) • ${nights} Nts`,
                roomOrLocation: r.roomNumber || r.roomNo || (Array.isArray(r.allocatedRooms) ? r.allocatedRooms[0] : null) || 'Unassigned',
                dateTime: `${r.checkIn}`,
                amountBDT: amount,
                status: status.replace('_', ' '),
                statusBadgeColor: badgeColor,
                rawReservation: r
            });

            if (status.includes('CHECKED_IN') || status.includes('CHECKED-IN') || status.includes('CHECKED_OUT') || status.includes('CHECKED-OUT') || status === 'IN-HOUSE') {
                const isInHouse = status.includes('CHECKED_IN') || status.includes('CHECKED-IN') || status === 'IN-HOUSE';
                seenStayRefs.add(resNum);
                checkinItems.push({
                    id: `checkin-res-${resNum}`,
                    type: 'checkin' as const,
                    refNumber: `REG-${resNum}`,
                    title: `Stay (Room ${r.roomNumber || r.roomNo || 'Assigned'})`,
                    particulars: `${r.checkIn} → ${r.checkOut} (${nights} Nts)`,
                    roomOrLocation: r.roomNumber || r.roomNo ? `Room ${r.roomNumber || r.roomNo}` : 'Front Desk',
                    dateTime: `${r.checkIn}`,
                    amountBDT: amount,
                    status: isInHouse ? 'In-House' : 'Checked-Out',
                    statusBadgeColor: isInHouse ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200',
                    rawReservation: r
                });
            }
        });

        // Add from database history ledger across all properties
        if (guestHistoryLedger.length > 0) {
            const dbResGroupMap = new Map<string, any>();
            guestHistoryLedger.forEach(row => {
                const key = String(row.reservation_number || row.reservation_id);
                if (!dbResGroupMap.has(key)) {
                    dbResGroupMap.set(key, {
                        ...row,
                        rooms: [row.room_number].filter(Boolean),
                        roomTypes: [row.room_type].filter(Boolean),
                        stays: [row]
                    });
                } else {
                    const existing = dbResGroupMap.get(key);
                    if (row.room_number && !existing.rooms.includes(row.room_number)) {
                        existing.rooms.push(row.room_number);
                    }
                    if (row.room_type && !existing.roomTypes.includes(row.room_type)) {
                        existing.roomTypes.push(row.room_type);
                    }
                    existing.stays.push(row);
                }
            });

            dbResGroupMap.forEach((group, key) => {
                if (!seenResRefs.has(key)) {
                    seenResRefs.add(key);
                    const nights = Number(group.nights) || Math.max(1, Math.round((new Date(group.check_out).getTime() - new Date(group.check_in).getTime()) / 86400000));
                    const amount = Number(group.total_amount) || 0;
                    const status = (group.status || 'CONFIRMED').toUpperCase();
                    const badgeColor =
                        status.includes('CHECKED_IN') || status.includes('CHECKED-IN') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        status.includes('CHECKED_OUT') || status.includes('CHECKED-OUT') ? 'bg-slate-100 text-slate-700 border-slate-200' :
                        status.includes('CANCEL') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-blue-50 text-blue-700 border-blue-200';

                    const roomDisplay = group.rooms.length > 0
                        ? group.rooms.map((rm: string) => rm.startsWith('V') || rm.startsWith('Rm') || rm.toLowerCase().includes('room') ? rm : `Room ${rm}`).join(', ')
                        : 'Assigned';
                    const locationStr = group.property_name ? `${roomDisplay} • ${group.property_name}` : roomDisplay;
                    const roomTypeStr = group.roomTypes.join(' & ') || 'Deluxe Room';

                    resItems.push({
                        id: `res-db-${key}`,
                        type: 'reservation' as const,
                        refNumber: key,
                        title: `${roomTypeStr} Reservation`,
                        particulars: `${group.property_name || 'Hotel'} • ${group.channel || 'Direct'} • ${nights} Nts`,
                        roomOrLocation: locationStr,
                        dateTime: `${group.check_in || group.created_at?.slice(0, 10)}`,
                        amountBDT: amount,
                        status: status.replace('_', ' '),
                        statusBadgeColor: badgeColor,
                        rawReservation: {
                            id: group.reservation_id,
                            reservationNumber: key,
                            guestName: activeGuest.name,
                            roomType: roomTypeStr,
                            roomNumber: group.rooms.join(', '),
                            checkIn: group.check_in,
                            checkOut: group.check_out,
                            nights: nights,
                            totalAmount: amount,
                            status: status
                        }
                    });

                    if (status.includes('CHECKED_IN') || status.includes('CHECKED-IN') || status.includes('CHECKED_OUT') || status.includes('CHECKED-OUT') || status === 'IN-HOUSE' || status === 'CONFIRMED') {
                        const isInHouse = status.includes('CHECKED_IN') || status.includes('CHECKED-IN') || status === 'IN-HOUSE';
                        seenStayRefs.add(key);
                        checkinItems.push({
                            id: `checkin-db-${key}`,
                            type: 'checkin' as const,
                            refNumber: `REG-${key}`,
                            title: `Stay (${roomTypeStr} • ${roomDisplay})`,
                            particulars: `${group.check_in} → ${group.check_out} (${nights} Nts)`,
                            roomOrLocation: locationStr,
                            dateTime: `${group.check_in}`,
                            amountBDT: amount,
                            status: isInHouse ? 'In-House' : status === 'CONFIRMED' ? 'Confirmed Stay' : 'Checked-Out',
                            statusBadgeColor: isInHouse ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200',
                            rawReservation: {
                                id: group.reservation_id,
                                reservationNumber: key,
                                guestName: activeGuest.name,
                                roomType: roomTypeStr,
                                roomNumber: group.rooms.join(', '),
                                checkIn: group.check_in,
                                checkOut: group.check_out,
                                nights: nights,
                                totalAmount: amount,
                                status: status
                            }
                        });
                    }
                }
            });
        }

        // Add from activeGuest.stayHistory
        (activeGuest.stayHistory || []).forEach((s, i) => {
            if (s && s.resNumber && !seenStayRefs.has(String(s.resNumber)) && s.roomNumber && s.checkIn && s.status !== 'In-House') {
                seenStayRefs.add(String(s.resNumber));
                checkinItems.push({
                    id: `checkin-hist-${s.resNumber}-${i}`,
                    type: 'checkin' as const,
                    refNumber: `REG-${s.resNumber}`,
                    title: `Stay (Room ${s.roomNumber})`,
                    particulars: `${s.checkIn} → ${s.checkOut} (${s.nights} Nts)`,
                    roomOrLocation: `Room ${s.roomNumber}`,
                    dateTime: `${s.checkIn}`,
                    amountBDT: s.totalAmountBDT || 0,
                    status: s.status,
                    statusBadgeColor: s.status === 'Checked-Out' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                });
            }
        });

        // 3. Outlet Bills (Real transactions from hotel_folios_v2 ONLY - ZERO mock fallback)
        const savedFoliosRaw = localStorage.getItem('hotel_folios_v2');
        let folioOutletItems: any[] = [];
        if (savedFoliosRaw) {
            try {
                const folios = JSON.parse(savedFoliosRaw);
                if (Array.isArray(folios)) {
                    folios.forEach((f: any) => {
                        const nameMatch = f.guestName && (f.guestName.toLowerCase().includes(guestNameLower) || guestNameLower.includes(f.guestName.toLowerCase()));
                        const roomMatch = checkinItems.some(c => c.roomOrLocation === `Room ${f.roomNumber}`);
                        if (nameMatch || roomMatch) {
                            (f.transactions || []).forEach((t: any) => {
                                if (t.category && !['Room', 'Payment', 'Tax', 'Deposit'].includes(t.category)) {
                                    folioOutletItems.push({
                                        id: `folio-txn-${t.id || Math.random()}`,
                                        type: 'outlet' as const,
                                        outletCategory: t.category === 'F&B' ? 'Restaurant' :
                                            t.category === 'Laundry' ? 'Laundry' :
                                            t.category === 'Spa' ? 'Spa' :
                                            t.category === 'Minibar' ? 'Minibar' : 'Room Service',
                                        refNumber: t.refNo || `OUT-${t.id}`,
                                        title: t.particulars || `${t.category} Charge`,
                                        particulars: t.description || 'Posted to guest folio',
                                        roomOrLocation: f.roomNumber ? `Room ${f.roomNumber}` : 'Outlet',
                                        dateTime: t.date || `${activeGuest.lastStayDate || 'Today'}`,
                                        amountBDT: Math.abs(t.amount || 0),
                                        status: 'Charged',
                                        statusBadgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    });
                                }
                            });
                        }
                    });
                }
            } catch (e) {}
        }

        const outletItems = folioOutletItems;

        const combined = [
            ...resItems,
            ...checkinItems,
            ...outletItems
        ].sort((a, b) => (b.dateTime || '').localeCompare(a.dateTime || ''));

        return {
            reservationsList: resItems,
            checkinsList: checkinItems,
            outletBillsList: outletItems,
            allLedgerItems: combined
        };
    }, [activeGuest, guestHistoryLedger]);

    const filteredGuests = guests.filter(g => {
        const matchesQuery =
            g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.phone.includes(searchQuery) ||
            g.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            g.idNumber.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesTier =
            selectedTierFilter === 'ALL' || g.vipTier === selectedTierFilter;

        return matchesQuery && matchesTier;
    });

    const handleSaveGuestProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGuestForm.name.trim() || !newGuestForm.phone.trim()) {
            alert('Please enter guest full legal name and primary phone number.');
            return;
        }

        const cleanE = newGuestForm.email.trim().toLowerCase();
        const cleanId = newGuestForm.idNumber.trim().toLowerCase();

        // 1. Strict Duplicate Prevention Verification (Domestic & International)
        const conflict = guests.find(g => {
            if (modalMode === 'edit' && g.id === editingGuestId) return false;
            const pMatch = Boolean(newGuestForm.phone && isSamePhoneNumber(newGuestForm.phone, g.phone));
            const eMatch = Boolean(cleanE && !cleanE.includes('guest.com') && !cleanE.includes('hospitality.com') && g.email && g.email.trim().toLowerCase() === cleanE);
            const idMatch = Boolean(cleanId && g.idNumber && g.idNumber.trim().toLowerCase() === cleanId);
            return pMatch || eMatch || idMatch;
        });

        if (conflict) {
            const conflictField = (newGuestForm.phone && isSamePhoneNumber(conflict.phone, newGuestForm.phone))
                ? `Phone Number (${conflict.phone})`
                : (cleanE && conflict.email && conflict.email.trim().toLowerCase() === cleanE)
                ? `Email Address (${conflict.email})`
                : `Identity Document Number (${conflict.idNumber})`;

            alert(
                `DUPLICATE GUEST DETECTED!\n\n` +
                `This ${conflictField} already belongs to an existing profile: "${conflict.title} ${conflict.name}".\n\n` +
                `As a certified hotel PMS practice, creating duplicate profiles splits stay records and folio accounts. Please update the existing profile or use the "Merge Profiles" feature.`
            );
            return;
        }

        const { title: parsedTitle, cleanName: parsedName } = parseTitleAndName(newGuestForm.name);
        const finalTitle = newGuestForm.title || parsedTitle;
        const finalName = parsedName;
        const fullNameWithTitle = `${finalTitle} ${finalName}`;
        const apiBase = getApiBaseUrl();

        const nameParts = finalName.split(' ');
        const firstName = nameParts[0] || 'Valued';
        const lastName = nameParts.slice(1).join(' ') || firstName;
        const backendPayload = {
            salutation: finalTitle.replace('.', ''),
            firstName,
            lastName,
            email: newGuestForm.email.trim() || undefined,
            phone: newGuestForm.phone.trim(),
            altPhone: newGuestForm.altPhone.trim() || undefined,
            nationality: newGuestForm.nationality.trim() || 'Bangladeshi',
            idType: newGuestForm.idType,
            idNumber: newGuestForm.idNumber.trim() || undefined,
            vipStatus: newGuestForm.vipTier.includes('Platinum') ? 'VVIP' : newGuestForm.vipTier.includes('Gold') ? 'VIP' : 'NONE',
            address: newGuestForm.address.trim() || undefined,
            city: newGuestForm.homeCity.trim() || 'Dhaka',
            country: newGuestForm.homeCountry.trim() || 'Bangladesh',
            postalCode: newGuestForm.postalCode.trim() || undefined,
            dob: newGuestForm.dob || undefined,
            gender: newGuestForm.gender || 'Male',
            idIssueDate: newGuestForm.idIssueDate || undefined,
            idExpiryDate: newGuestForm.idExpiryDate || newGuestForm.idExpiry || undefined,
            idIssueCountry: newGuestForm.idIssueCountry || newGuestForm.nationality || undefined,
            idIssuePlace: newGuestForm.idIssuePlace || undefined,
            passportVisaNumber: newGuestForm.passportVisaNumber || undefined,
            passportVisaType: newGuestForm.passportVisaType || undefined,
            passportVisaExpiry: newGuestForm.passportVisaExpiry || undefined,
            passportEntryPort: newGuestForm.passportEntryPort || undefined,
            drivingVehicleClass: newGuestForm.drivingVehicleClass || undefined,
            fatherOrSpouseName: newGuestForm.fatherOrSpouseName || undefined,
            tags: newGuestForm.tags || [],
            changedBy: 'Front Desk Officer'
        };

        if (modalMode === 'edit' && editingGuestId) {
            // Update backend PostgreSQL record
            try {
                await fetch(`${apiBase}/api/guests/${editingGuestId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(backendPayload)
                });
            } catch (err) {
                console.warn('Backend guest update error:', err);
            }

            const updatedGuests = guests.map(g => {
                if (g.id !== editingGuestId) return g;
                return {
                    ...g,
                    title: finalTitle,
                    name: finalName,
                    phone: newGuestForm.phone.trim(),
                    altPhone: newGuestForm.altPhone.trim() || undefined,
                    email: newGuestForm.email.trim() || `${finalName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@guest.com`,
                    vipTier: newGuestForm.vipTier,
                    nationality: newGuestForm.nationality.trim() || 'Bangladesh',
                    idType: newGuestForm.idType,
                    idNumber: newGuestForm.idNumber.trim() || g.idNumber,
                    idExpiry: newGuestForm.idExpiry,
                    issuingCountry: newGuestForm.issuingCountry || newGuestForm.nationality || 'Bangladesh',
                    dob: newGuestForm.dob || g.dob,
                    gender: newGuestForm.gender,
                    homeCity: newGuestForm.homeCity.trim() || 'Dhaka',
                    homeCountry: newGuestForm.homeCountry.trim() || newGuestForm.nationality || 'Bangladesh',
                    address: newGuestForm.address.trim() || undefined,
                    postalCode: newGuestForm.postalCode.trim() || undefined,
                    idIssueDate: newGuestForm.idIssueDate,
                    idExpiryDate: newGuestForm.idExpiryDate || newGuestForm.idExpiry,
                    idIssueCountry: newGuestForm.idIssueCountry || newGuestForm.nationality,
                    idIssuePlace: newGuestForm.idIssuePlace,
                    passportVisaNumber: newGuestForm.passportVisaNumber,
                    passportVisaType: newGuestForm.passportVisaType,
                    passportVisaExpiry: newGuestForm.passportVisaExpiry,
                    passportEntryPort: newGuestForm.passportEntryPort,
                    drivingVehicleClass: newGuestForm.drivingVehicleClass,
                    fatherOrSpouseName: newGuestForm.fatherOrSpouseName,
                    tags: newGuestForm.tags,
                    emergencyContact: newGuestForm.emergencyName.trim() ? {
                        name: newGuestForm.emergencyName.trim(),
                        relationship: newGuestForm.emergencyRelation || 'Family',
                        phone: newGuestForm.emergencyPhone.trim() || newGuestForm.phone.trim()
                    } : undefined,
                    company: newGuestForm.company.trim() || undefined,
                    designation: newGuestForm.designation.trim() || undefined,
                    corporateTaxId: newGuestForm.corporateTaxId.trim() || undefined,
                    billingRoute: newGuestForm.billingRoute,
                    preferences: {
                        ...g.preferences,
                        roomType: newGuestForm.roomType,
                        floorPreference: newGuestForm.floorPreference,
                        bedType: newGuestForm.bedType,
                        pillowType: newGuestForm.pillowType,
                        smoking: newGuestForm.smoking,
                        dietary: newGuestForm.dietary,
                        allergies: newGuestForm.allergies.trim() || 'None',
                        newspaper: newGuestForm.newspaper,
                        specialNotes: newGuestForm.specialNotes.trim() || g.preferences.specialNotes
                    }
                };
            });

            setGuests(updatedGuests);
            try {
                localStorage.setItem('hotel_guest_profiles_v2', JSON.stringify(updatedGuests));
            } catch {}

            // Synchronize canonical reservations so FrontDesk, StayView, and ReservationList reflect the updated guest name!
            try {
                const storedRes = getAllStoredReservations();
                const oldGuest = guests.find(g => g.id === editingGuestId);
                const oldCleanName = oldGuest ? parseTitleAndName(oldGuest.name).cleanName.toLowerCase() : '';
                let hasChanges = false;
                const updatedRes = storedRes.map(r => {
                    const rCleanName = parseTitleAndName(r.guestName || '').cleanName.toLowerCase();
                    const matchesName = Boolean(oldCleanName && (rCleanName === oldCleanName || rCleanName.includes(oldCleanName)));
                    const matchesPhone = Boolean(oldGuest?.phone && (r.phone === oldGuest.phone || r.guestPhone === oldGuest.phone));
                    if (matchesName || matchesPhone) {
                        hasChanges = true;
                        return {
                            ...r,
                            guestName: fullNameWithTitle,
                            phone: newGuestForm.phone.trim(),
                            guestPhone: newGuestForm.phone.trim(),
                            email: newGuestForm.email.trim() || r.email
                        };
                    }
                    return r;
                });

                if (hasChanges) {
                    saveStoredReservations(updatedRes);
                    broadcastPMSEvent({
                        type: 'RESERVATION_UPDATED',
                        reservationId: editingGuestId
                    });
                    broadcastPMSEvent({
                        type: 'INVENTORY_REFRESH'
                    });
                }
            } catch (err) {
                console.error('Failed to sync updated guest name to reservations', err);
            }

            setShowAddGuestModal(false);
            showToast(`Guest profile updated successfully for ${finalTitle} ${finalName}`);
            refreshGuests();
            return;
        }

        // Create new guest
        let createdDbId: number | null = null;
        try {
            const createRes = await fetch(`${apiBase}/api/guests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(backendPayload)
            });
            const createJson = await createRes.json();
            if (createJson.success && createJson.data?.id) {
                createdDbId = Number(createJson.data.id);
            }
        } catch (err) {
            console.warn('Backend guest create error:', err);
        }

        const newRecord: GuestRecord = {
            id: createdDbId || Date.now(),
            title: finalTitle,
            name: finalName,
            phone: newGuestForm.phone.trim(),
            altPhone: newGuestForm.altPhone.trim() || undefined,
            email: newGuestForm.email.trim() || `${finalName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@guest.com`,
            vipTier: newGuestForm.vipTier,
            nationality: newGuestForm.nationality.trim() || 'Bangladesh',
            idType: newGuestForm.idType,
            idNumber: newGuestForm.idNumber.trim() || `KYC-${Math.floor(10000 + Math.random() * 90000)}`,
            idExpiry: newGuestForm.idExpiry || '2030-12-31',
            issuingCountry: newGuestForm.issuingCountry || newGuestForm.nationality || 'Bangladesh',
            dob: newGuestForm.dob || '1990-01-01',
            gender: newGuestForm.gender,
            homeCity: newGuestForm.homeCity.trim() || 'Dhaka',
            homeCountry: newGuestForm.homeCountry.trim() || newGuestForm.nationality || 'Bangladesh',
            address: newGuestForm.address.trim() || undefined,
            postalCode: newGuestForm.postalCode.trim() || undefined,
            idIssueDate: newGuestForm.idIssueDate,
            idExpiryDate: newGuestForm.idExpiryDate || newGuestForm.idExpiry,
            idIssueCountry: newGuestForm.idIssueCountry || newGuestForm.nationality,
            idIssuePlace: newGuestForm.idIssuePlace,
            passportVisaNumber: newGuestForm.passportVisaNumber,
            passportVisaType: newGuestForm.passportVisaType,
            passportVisaExpiry: newGuestForm.passportVisaExpiry,
            passportEntryPort: newGuestForm.passportEntryPort,
            drivingVehicleClass: newGuestForm.drivingVehicleClass,
            fatherOrSpouseName: newGuestForm.fatherOrSpouseName,
            tags: newGuestForm.tags,
            emergencyContact: newGuestForm.emergencyName.trim() ? {
                name: newGuestForm.emergencyName.trim(),
                relationship: newGuestForm.emergencyRelation || 'Family',
                phone: newGuestForm.emergencyPhone.trim() || newGuestForm.phone.trim()
            } : undefined,
            company: newGuestForm.company.trim() || undefined,
            designation: newGuestForm.designation.trim() || undefined,
            corporateTaxId: newGuestForm.corporateTaxId.trim() || undefined,
            billingRoute: newGuestForm.billingRoute,
            totalStays: 0,
            totalNights: 0,
            lifetimeSpendBDT: 0,
            lastStayDate: '-',
            loyaltyPoints: 0,
            preferences: {
                roomType: newGuestForm.roomType,
                floorPreference: newGuestForm.floorPreference,
                bedType: newGuestForm.bedType,
                pillowType: newGuestForm.pillowType,
                smoking: newGuestForm.smoking,
                dietary: newGuestForm.dietary,
                allergies: newGuestForm.allergies.trim() || 'None',
                newspaper: newGuestForm.newspaper,
                specialNotes: newGuestForm.specialNotes.trim() || 'New guest profile registered via 360 CRM.'
            },
            stayHistory: []
        };

        const updatedList = [newRecord, ...guests];
        setGuests(updatedList);
        try {
            localStorage.setItem('hotel_guest_profiles_v2', JSON.stringify(updatedList));
        } catch {}
        setSelectedGuestId(newRecord.id);
        setShowAddGuestModal(false);
        setNewGuestForm(initialGuestForm);
        setModalTab('kyc');
        showToast(`Guest 360 profile created for ${newRecord.title} ${newRecord.name}`);
        refreshGuests();
    };

    return (
        <div className="h-full min-h-[calc(100vh-48px)] bg-gray-50 flex flex-col font-sans text-xs select-none animate-in fade-in duration-150">
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-3.5 py-2 rounded-lg shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Master Header */}
            <header className="bg-white border-b border-gray-200/80 px-3 py-1.5 flex items-center justify-between gap-2.5 shadow-2xs z-20 flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                        <User size={14} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none">
                                Guest Profiles 360 & Loyalty CRM
                            </h1>
                            <span className="px-1.5 py-0.2 text-[8.5px] rounded bg-emerald-50 text-emerald-700 border border-emerald-200 leading-none font-semibold">
                                Single Guest View
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                            Centralized guest history, loyalty club tiers, stay telemetry, preferences, and verified KYC vault.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (duplicateClusters.length > 0) {
                                setActiveMergeCluster(duplicateClusters[0]);
                                setShowMergeModal(true);
                            } else {
                                showToast('No duplicate clusters found. Select 2 or more guests from the list to merge manually.');
                            }
                        }}
                        className={`h-7 px-2.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            duplicateClusters.length > 0
                                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs'
                                : 'bg-white border border-gray-300 hover:bg-gray-100 text-gray-700'
                        }`}
                        title="Merge duplicate guest profiles"
                    >
                        <GitMerge size={13} />
                        <span>Merge Profiles</span>
                        {duplicateClusters.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-white text-amber-800">
                                {duplicateClusters.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={handleOpenCreateModal}
                        className="btn-primary"
                    >
                        <Plus size={14} />
                        <span>Register Guest</span>
                    </button>
                    {activeGuest && (
                        <button
                            onClick={() => handleOpenEditModal(activeGuest)}
                            className="btn-secondary"
                        >
                            <Edit3 size={13} />
                            <span>Edit Profile</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Duplicate Detection Alert Banner */}
            {duplicateClusters.length > 0 && (
                <div className="bg-amber-50 border-b border-amber-200 px-3.5 py-2 flex items-center justify-between gap-3 text-xs text-amber-900 flex-shrink-0 animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 text-amber-800">
                            <AlertTriangle size={13} />
                        </div>
                        <div>
                            <span className="font-bold text-amber-950">
                                {duplicateClusters.length} Duplicate Profile Cluster{duplicateClusters.length > 1 ? 's' : ''} Detected!
                            </span>
                            <span className="text-amber-800 ml-1.5 text-[11px]">
                                Guest profiles sharing identical phone numbers, emails, or government IDs were found in the database.
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setActiveMergeCluster(duplicateClusters[0]);
                                setShowMergeModal(true);
                            }}
                            className="h-6 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                        >
                            <GitMerge size={12} />
                            <span>Review & Merge Clusters</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Split Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Column: Guest Directory List */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 h-full overflow-hidden">
                    {/* Fixed Top Controls: Tier Filters (Top) & Search Bar (Below) */}
                    <div className="p-2.5 border-b border-gray-200 bg-white space-y-2 flex-shrink-0">
                        {/* Tier Filters */}
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                            {['ALL', 'Platinum VIP', 'Corporate VIP', 'Gold', 'Regular'].map(tier => (
                                <button
                                    key={tier}
                                    type="button"
                                    onClick={() => setSelectedTierFilter(tier)}
                                    className={`h-5.5 px-2.5 rounded text-[10px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                                        selectedTierFilter === tier
                                            ? 'bg-gray-900 text-white shadow-2xs'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {tier}
                                </button>
                            ))}
                        </div>

                        {/* Search Bar */}
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search name, phone, NID, email..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-7 pl-7 pr-6 text-[11px] bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-blue-500 focus:bg-white transition-colors"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs w-4 h-4 flex items-center justify-center cursor-pointer"
                                    title="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable Guest Directory List */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                        {/* Multi-Selection Merge Action Bar */}
                        {selectedForMerge.length >= 2 && (
                            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-between gap-2 shadow-2xs animate-in slide-in-from-top-1">
                                <div className="flex items-center gap-1.5 text-[11px] text-indigo-900 font-semibold">
                                    <GitMerge size={13} className="text-indigo-600" />
                                    <span>{selectedForMerge.length} Selected</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const candidateList = guests.filter(g => selectedForMerge.includes(g.id));
                                            setActiveMergeCluster({
                                                reason: 'Manual Selection for Merge',
                                                matchValue: `${candidateList.length} Selected Guests`,
                                                guests: candidateList
                                            });
                                            setShowMergeModal(true);
                                        }}
                                        className="h-6 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                    >
                                        Merge
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedForMerge([])}
                                        className="h-6 px-1.5 text-gray-500 hover:text-gray-800 text-[10.5px] cursor-pointer"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Guest Items */}
                        <div className="space-y-1.5">
                        {filteredGuests.map(g => {
                            const isSelected = g.id === activeGuest.id;
                            const isCheckedForMerge = selectedForMerge.includes(g.id);
                            return (
                                <div
                                    key={g.id}
                                    onClick={() => setSelectedGuestId(g.id)}
                                    className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-1 relative group ${
                                        isSelected
                                            ? 'bg-blue-50/60 border-blue-500 shadow-2xs ring-1 ring-blue-500'
                                            : isCheckedForMerge
                                            ? 'bg-indigo-50/50 border-indigo-300'
                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {/* Selection checkbox */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedForMerge(prev =>
                                                        prev.includes(g.id) ? prev.filter(x => x !== g.id) : [...prev, g.id]
                                                    );
                                                }}
                                                className={`p-0.5 rounded transition-colors ${
                                                    isCheckedForMerge ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-500'
                                                }`}
                                                title={isCheckedForMerge ? 'Deselect for merge' : 'Select for merge'}
                                            >
                                                {isCheckedForMerge ? (
                                                    <CheckSquare size={13} className="text-indigo-600" />
                                                ) : (
                                                    <Square size={13} />
                                                )}
                                            </button>
                                            <span className="text-gray-900 truncate text-[11.5px] font-medium">
                                                {g.title} {parseTitleAndName(g.name).cleanName}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {g.isBlacklisted && (
                                                <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-0.5">
                                                    <Ban size={9} /> Blocked
                                                </span>
                                            )}
                                            <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                                                g.vipTier.includes('Platinum') ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                                g.vipTier.includes('Corporate') ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                                g.vipTier.includes('Gold') ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                                'bg-gray-100 text-gray-700 border border-gray-200'
                                            }`}>
                                                {g.vipTier}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditModal(g);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-blue-600 rounded transition-opacity"
                                                title="Edit Guest Profile"
                                            >
                                                <Edit3 size={11} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] text-gray-500 pl-4.5">
                                        <span className="font-mono">{g.phone}</span>
                                        <span className="font-mono text-gray-800">৳ {(g.lifetimeSpendBDT / 1000).toFixed(0)}k</span>
                                    </div>

                                    {g.company && (
                                        <div className="text-[9.5px] text-gray-400 truncate pl-4.5">
                                            {g.company}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Guest 360 Full Workspace */}
                <div className="flex-1 bg-gray-50 flex flex-col overflow-y-auto p-3.5 space-y-3">
                    {/* Top Identity Hero Card - Compact Enterprise Header */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-2xs p-2.5 flex flex-col gap-1.5 flex-shrink-0">
                        {/* Line 1: Identity, VIP & KYC, Stats Capsule & Quick Actions */}
                        <div className="flex items-center justify-between gap-2">
                            {/* Left: Avatar + Title & Name + Badges */}
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-2xs">
                                    {parseTitleAndName(activeGuest.name).cleanName.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                    <h2 className="text-xs text-gray-900 font-bold truncate">
                                        {activeGuest.title} {parseTitleAndName(activeGuest.name).cleanName}
                                    </h2>
                                    <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-semibold ${
                                        activeGuest.vipTier.includes('Platinum') ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                        activeGuest.vipTier.includes('Corporate') ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                        activeGuest.vipTier.includes('Gold') ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                        'bg-gray-100 text-gray-700 border border-gray-200'
                                    }`}>
                                        <Star size={8} className="inline mr-0.5 -mt-0.5" />
                                        {activeGuest.vipTier}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[8.5px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5 font-medium">
                                        <ShieldCheck size={8} /> KYC
                                    </span>
                                    {activeGuest.isBlacklisted && (
                                        <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-rose-100 text-rose-700 border border-rose-300 flex items-center gap-0.5">
                                            <Ban size={8} /> Blocked
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Right: Compact Stats Capsule + Quick Action Buttons */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {/* Quick KPI Capsule */}
                                <div className="hidden sm:flex items-center gap-1.5 text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-0.5">
                                    <span className="text-gray-600 font-medium"><strong className="text-gray-900">{activeGuest.totalStays}</strong> Stays</span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-blue-700 font-bold font-mono">৳{Number(activeGuest.lifetimeSpendBDT || 0).toLocaleString()}</span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-emerald-700 font-bold font-mono">{activeGuest.loyaltyPoints ?? Math.round(Number(activeGuest.lifetimeSpendBDT || 0) / 20)} Pts</span>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex items-center gap-1">
                                    {activeGuest.isBlacklisted ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBlacklistActionType('unblock');
                                                setBlacklistStaffName('Duty Manager');
                                                setShowBlacklistModal(true);
                                            }}
                                            className="h-6 px-2 rounded text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                            title="Lift blacklist restriction"
                                        >
                                            <CheckCircle2 size={11} />
                                            <span>Unblock</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setBlacklistActionType('block');
                                                setBlacklistCategory('Payment Default / Unpaid Folio');
                                                setBlacklistReasonInput('');
                                                setBlacklistStaffName('Duty Manager');
                                                setShowBlacklistModal(true);
                                            }}
                                            className="h-6 px-2 rounded text-[10px] font-semibold bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 flex items-center gap-1 cursor-pointer transition-colors"
                                            title="Block guest from reservations & check-ins"
                                        >
                                            <Ban size={11} />
                                            <span>Block</span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(activeGuest, 'kyc')}
                                        className="h-6 px-2 rounded text-[10px] font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                        title="Edit Profile"
                                    >
                                        <Edit3 size={11} />
                                        <span>Edit</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Line 2: Compact Meta Strip (Phone, WA, Email, City, Company, Emergency) */}
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 overflow-x-auto no-scrollbar pt-1 border-t border-gray-100">
                            <span className="flex items-center gap-1 flex-shrink-0">
                                <Phone size={10} className="text-gray-400" />
                                <span className="font-mono text-gray-700 font-medium">{activeGuest.phone}</span>
                            </span>
                            {activeGuest.altPhone && (
                                <span className="flex items-center gap-1 flex-shrink-0 text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 font-mono text-[9px]">
                                    WA: {activeGuest.altPhone}
                                </span>
                            )}
                            <span className="flex items-center gap-1 flex-shrink-0">
                                <Mail size={10} className="text-gray-400" />
                                <span className="text-gray-600">{activeGuest.email}</span>
                            </span>
                            <span className="flex items-center gap-1 flex-shrink-0">
                                <MapPin size={10} className="text-gray-400" />
                                <span className="text-gray-600">{activeGuest.homeCity}, {activeGuest.homeCountry}</span>
                            </span>
                            {activeGuest.company && (
                                <span className="flex items-center gap-1 flex-shrink-0">
                                    <Building2 size={10} className="text-gray-400" />
                                    <span className="text-gray-600">{activeGuest.company}</span>
                                </span>
                            )}
                            {activeGuest.emergencyContact && (
                                <span className="flex items-center gap-1 flex-shrink-0 text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 text-[9px]">
                                    ICE: {activeGuest.emergencyContact.name} ({activeGuest.emergencyContact.phone})
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Prominent Red Blacklist Alert Banner */}
                    {activeGuest.isBlacklisted && (
                        <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-lg flex items-start justify-between gap-3 shadow-xs animate-in fade-in duration-150">
                            <div className="flex items-start gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                                    <Ban size={16} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                                            Blacklisted / Blocked Guest
                                        </span>
                                        <span className="text-[11px] text-rose-800 font-semibold">
                                            Unauthorized for Standard Room Reservation &amp; Check-In
                                        </span>
                                    </div>
                                    <div className="text-xs text-rose-950 font-medium mt-1">
                                        <strong>Incident / Reason:</strong> {activeGuest.blacklistReason || 'Payment default or security violation'}
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-rose-700 mt-1 flex-wrap">
                                        <span>Authorized by: <strong>{activeGuest.blacklistedBy || 'Duty Manager'}</strong></span>
                                        {activeGuest.blacklistedAt && (
                                            <span>Date: <strong>{new Date(activeGuest.blacklistedAt).toLocaleDateString()}</strong></span>
                                        )}
                                        <span className="text-rose-600 italic">• System will require Manager Override authorization during booking</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setBlacklistActionType('unblock');
                                    setBlacklistStaffName('Duty Manager');
                                    setShowBlacklistModal(true);
                                }}
                                className="px-2.5 py-1 rounded text-xs font-semibold bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 cursor-pointer flex-shrink-0 shadow-2xs"
                            >
                                Lift Block
                            </button>
                        </div>
                    )}

                    {/* Navigation Tabs */}
                    <div className="bg-white rounded-lg border border-gray-200 px-3 flex items-center justify-between">
                        <div className="flex">
                            {[
                                { key: 'overview', label: 'Reservations, Stays & Outlet Bills', icon: <Receipt size={12} /> },
                                { key: 'preferences', label: 'Preferences & CRM', icon: <Heart size={12} /> },
                                { key: 'vault', label: 'ID & Verification Vault', icon: <ShieldCheck size={12} /> },
                                { key: 'corporate', label: 'Corporate Profile', icon: <Building2 size={12} /> },
                                { key: 'audit', label: 'Edit History & Audit Log', icon: <History size={12} /> }
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-all border-b-2 cursor-pointer ${
                                        activeTab === tab.key
                                            ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                                            : 'border-transparent text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab 1: Comprehensive Ledger (Reservations, Check-Ins, Outlet Bills) */}
                    {activeTab === 'overview' && (() => {
                        const displayedItems =
                            activityFilter === 'all' ? allLedgerItems :
                            activityFilter === 'reservations' ? reservationsList :
                            activityFilter === 'checkins' ? checkinsList :
                            outletBillsList;

                        const totalFolioSpend =
                            reservationsList.reduce((acc: number, r: any) => acc + (r.amountBDT || 0), 0) +
                            outletBillsList.reduce((acc: number, o: any) => acc + (o.amountBDT || 0), 0);

                        return (
                            <div className="bg-white rounded-lg border border-gray-200 shadow-2xs p-3 space-y-2.5">
                                {/* Header & Sub-filter pills */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2">
                                    <div>
                                        <h3 className="text-gray-900 text-xs flex items-center gap-1.5 font-bold">
                                            <Clock size={13} className="text-blue-600" />
                                            <span>Guest Folio Ledger: Reservations, Stays & Outlet Bills</span>
                                        </h3>
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                            Track room bookings, check-in registration folios, and all posted restaurant & outlet bills.
                                        </p>
                                    </div>

                                    <div className="inline-flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-md border border-gray-200/60 self-start sm:self-auto flex-nowrap">
                                        {[
                                            { key: 'all', label: 'All', count: allLedgerItems.length },
                                            { key: 'reservations', label: 'Reservations', count: reservationsList.length },
                                            { key: 'checkins', label: 'Stays', count: checkinsList.length },
                                            { key: 'outlets', label: 'Outlet Bills', count: outletBillsList.length }
                                        ].map(sub => (
                                            <button
                                                key={sub.key}
                                                onClick={() => setActivityFilter(sub.key as any)}
                                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                                                    activityFilter === sub.key
                                                        ? 'bg-white text-blue-600 shadow-2xs'
                                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                                                }`}
                                            >
                                                <span>{sub.label}</span>
                                                <span className={`text-[9px] px-1 py-0 rounded font-mono ${
                                                    activityFilter === sub.key
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'bg-gray-200/70 text-gray-600'
                                                }`}>
                                                    {sub.count}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary Metrics Strip - Ultra Compact & Unified */}
                                <div className="flex flex-wrap items-center justify-between bg-slate-50 border border-slate-200/80 rounded-md px-3 py-1.5 text-[10.5px] gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-500 font-medium">Reservations:</span>
                                        <span className="font-bold text-gray-900 font-mono">{reservationsList.length}</span>
                                    </div>
                                    <div className="h-3 w-px bg-gray-200 hidden sm:block" />
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-500 font-medium">Stays:</span>
                                        <span className="font-bold text-gray-900 font-mono">{checkinsList.length} ({activeGuest.totalNights || 0} Nts)</span>
                                    </div>
                                    <div className="h-3 w-px bg-gray-200 hidden sm:block" />
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-500 font-medium">Outlet Bills:</span>
                                        <span className="font-bold text-gray-900 font-mono">{outletBillsList.length}</span>
                                    </div>
                                    <div className="h-3 w-px bg-gray-200 hidden sm:block" />
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-gray-500 font-medium">Folio Total:</span>
                                        <span className="font-bold text-emerald-700 font-mono">
                                            ৳ {totalFolioSpend.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Activity Data Table - Solid, Non-Fragmented High Density Layout */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                                    {displayedItems.length === 0 ? (
                                        <div className="py-7 px-4 text-center">
                                            {isLoadingHistory ? (
                                                <div className="flex flex-col items-center justify-center gap-2 py-4">
                                                    <Loader2 size={22} className="animate-spin text-blue-600" />
                                                    <span className="text-xs text-gray-500 font-medium">Loading guest stay history...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Receipt size={22} className="mx-auto mb-1.5 text-gray-300" />
                                                    <p className="text-xs font-semibold text-gray-700">
                                                        {activityFilter === 'all'
                                                            ? 'No folio transactions or bookings'
                                                            : `No ${activityFilter === 'reservations' ? 'reservations' : activityFilter === 'checkins' ? 'check-in stays' : 'outlet bills'} recorded`}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        Real room bookings and posted outlet bills will appear here automatically.
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-[11px]">
                                                <thead>
                                                    <tr className="bg-slate-50/90 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                                                        <th className="py-2 px-3 w-[120px]">Type & Ref</th>
                                                        <th className="py-2 px-3">Service / Particulars</th>
                                                        <th className="py-2 px-3 w-[100px]">Location</th>
                                                        <th className="py-2 px-3 w-[85px]">Date</th>
                                                        <th className="py-2 px-3 text-right w-[110px]">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {displayedItems.map((item: any) => (
                                                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                                            <td className="py-2 px-3 align-middle">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                                                                        item.type === 'reservation' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                        item.type === 'checkin' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                        'bg-amber-50 text-amber-800 border-amber-200'
                                                                    }`}>
                                                                        {item.type === 'reservation' ? 'Res' : item.type === 'checkin' ? 'Stay' : 'Outlet'}
                                                                    </span>
                                                                    <span className="font-mono text-gray-800 text-[10.5px] font-medium truncate">
                                                                        {item.refNumber}
                                                                    </span>
                                                                    {item.rawReservation && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const resNum = item.rawReservation?.reservationNumber || item.refNumber;
                                                                                sessionStorage.setItem('hotel_edit_reservation_id', resNum);
                                                                                setActivePage('add-reservation');
                                                                            }}
                                                                            className="px-1.5 py-0.5 text-[9px] bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded font-semibold inline-flex items-center gap-0.5 cursor-pointer shadow-2xs transition-colors"
                                                                            title="Edit Complete Reservation in Engine"
                                                                        >
                                                                            <Edit3 size={9} />
                                                                            <span>Edit</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            <td className="py-2 px-3 align-middle min-w-[150px]">
                                                                <div className="font-semibold text-gray-900 truncate leading-snug">
                                                                    {item.title}
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 truncate">
                                                                    {item.particulars}
                                                                </div>
                                                            </td>

                                                            <td className="py-2 px-3 align-middle">
                                                                <span className="text-[10.5px] font-mono text-gray-700 truncate block">
                                                                    {item.roomOrLocation}
                                                                </span>
                                                            </td>

                                                            <td className="py-2 px-3 align-middle">
                                                                <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap block">
                                                                    {item.dateTime.slice(0, 10)}
                                                                </span>
                                                            </td>

                                                            <td className="py-2 px-3 align-middle text-right">
                                                                <div className="font-mono font-bold text-gray-900 text-[11px]">
                                                                    ৳ {item.amountBDT.toLocaleString()}
                                                                </div>
                                                                <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-medium border ${item.statusBadgeColor} mt-0.5`}>
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Tab 2: Preferences & CRM */}
                    {activeTab === 'preferences' && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-2xs p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-gray-900 text-xs flex items-center gap-1.5 font-bold">
                                    <Heart size={13} className="text-rose-500" />
                                    <span>Hospitality Preferences & Personalization</span>
                                </h3>
                                <button
                                    onClick={() => handleOpenEditModal(activeGuest, 'preferences')}
                                    className="px-2.5 py-1 rounded text-[10.5px] bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                >
                                    <Edit3 size={11} />
                                    <span>Edit Preferences</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] text-gray-400 uppercase">Preferred Room Type & Location</span>
                                    <p className="text-gray-900 font-semibold">{activeGuest.preferences.roomType}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="inline-block px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9.5px] font-semibold">
                                            {activeGuest.preferences.floorPreference}
                                        </span>
                                        <span className="inline-block px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 text-[9.5px] font-semibold">
                                            {activeGuest.preferences.smoking || 'Non-Smoking'}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] text-gray-400 uppercase">Pillow & Bedding Setup</span>
                                    <p className="text-gray-900 font-semibold">{activeGuest.preferences.bedType || 'King Bed'} • {activeGuest.preferences.pillowType}</p>
                                    <p className="text-[10px] text-gray-400">Housekeeping auto-provisions linens & pillows upon check-in</p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] text-gray-400 uppercase">Dietary Requirements</span>
                                    <p className="text-gray-900 font-semibold">{activeGuest.preferences.dietary}</p>
                                    <p className="text-[10px] text-gray-400">Auto-notified to Executive Chef, Room Service & KDS</p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] text-gray-400 uppercase">Morning Newspaper Subscription</span>
                                    <p className="text-gray-900 font-semibold">{activeGuest.preferences.newspaper}</p>
                                    <p className="text-[10px] text-gray-400">Delivered to door at 06:30 AM</p>
                                </div>
                            </div>

                            {activeGuest.preferences.allergies && activeGuest.preferences.allergies !== 'None' ? (
                                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 flex items-start gap-2.5">
                                    <AlertTriangle size={16} className="text-rose-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-rose-900 text-xs font-bold">Medical Alert & Guest Allergies Recorded</h4>
                                        <p className="text-[11px] text-rose-800 mt-0.5">
                                            <strong>Allergen Notice:</strong> {activeGuest.preferences.allergies}
                                        </p>
                                        <p className="text-[10px] text-rose-600 mt-1">
                                            Kitchen Display System (KDS), Dining POS, and Housekeeping supervisors are automatically flagged for cross-contamination safety.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200 flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                                    <span className="text-[11px] text-emerald-800">No medical allergies or dietary restrictions recorded for this guest profile.</span>
                                </div>
                            )}

                            <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200">
                                <span className="text-[9.5px] text-blue-800 uppercase block mb-1">General Manager & Concierge Notes</span>
                                <p className="text-gray-800 italic leading-relaxed text-[11px]">
                                    "{activeGuest.preferences.specialNotes}"
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: ID & Verification Vault */}
                    {activeTab === 'vault' && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-2xs p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-gray-900 text-xs flex items-center gap-1.5 font-bold">
                                    <ShieldCheck size={13} className="text-emerald-600" />
                                    <span>KYC & Document Verification Records</span>
                                </h3>
                                <button
                                    onClick={() => handleOpenEditModal(activeGuest, 'kyc')}
                                    className="px-2.5 py-1 rounded text-[10.5px] bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                >
                                    <Edit3 size={11} />
                                    <span>Update KYC Records</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <span className="text-[9.5px] text-gray-400 uppercase block">Document Type</span>
                                    <p className="text-gray-900 text-xs mt-0.5 font-semibold">{activeGuest.idType}</p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <span className="text-[9.5px] text-gray-400 uppercase block">Document Number</span>
                                    <p className="font-mono text-gray-900 text-xs mt-0.5 font-semibold">
                                        {formatIdentityDisplay(activeGuest.idNumber, activeGuest.idType as any)}
                                    </p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <span className="text-[9.5px] text-gray-400 uppercase block">Date of Birth & Gender</span>
                                    <p className="text-gray-900 text-xs mt-0.5 font-semibold">
                                        {activeGuest.dob} ({calculateAge(activeGuest.dob)} yrs) • {activeGuest.gender}
                                    </p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <span className="text-[9.5px] text-gray-400 uppercase block">Issuing Authority / Country</span>
                                    <p className="text-gray-900 text-xs mt-0.5 font-semibold">{activeGuest.idIssueCountry || activeGuest.issuingCountry || activeGuest.nationality}</p>
                                    {(activeGuest.idExpiryDate || activeGuest.idExpiry) && (
                                        <span className="text-[9.5px] text-emerald-700 block mt-0.5">Expires: {activeGuest.idExpiryDate || activeGuest.idExpiry} (Active)</span>
                                    )}
                                </div>
                            </div>

                            {/* Polymorphic Extended Attributes */}
                            {activeGuest.idType === 'Passport' && (
                                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                                        <div className="flex items-center gap-1.5">
                                            <FileText size={14} className="text-blue-700" />
                                            <span>International Passport & Visa Clearance Credentials</span>
                                        </div>
                                        <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-mono">
                                            Port of Entry: {activeGuest.passportEntryPort || 'Dhaka Int (DAC)'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                                        <div className="bg-white p-2 rounded border border-blue-200/60">
                                            <span className="text-[9px] text-gray-400 block uppercase">Visa Number</span>
                                            <span className="font-mono font-bold text-gray-800">{activeGuest.passportVisaNumber || 'N/A'}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-blue-200/60">
                                            <span className="text-[9px] text-gray-400 block uppercase">Visa Category</span>
                                            <span className="font-semibold text-gray-800">{activeGuest.passportVisaType || 'Tourist (T)'}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-blue-200/60">
                                            <span className="text-[9px] text-gray-400 block uppercase">Visa Expiry</span>
                                            <span className="font-mono text-emerald-700">{activeGuest.passportVisaExpiry || '2028-12-31'}</span>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-blue-200/60">
                                            <span className="text-[9px] text-gray-400 block uppercase">Place of Issue</span>
                                            <span className="font-medium text-gray-800">{activeGuest.idIssuePlace || activeGuest.homeCity || 'Dhaka'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeGuest.idType === 'National ID (NID)' && activeGuest.fatherOrSpouseName && (
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                    <div>
                                        <span className="text-[9.5px] text-gray-400 uppercase block">Father's / Spouse's Legal Name</span>
                                        <span className="font-semibold text-gray-800">{activeGuest.fatherOrSpouseName}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] text-gray-400 uppercase block">Issuing Circle / District</span>
                                        <span className="font-medium text-gray-800">{activeGuest.idIssuePlace || activeGuest.homeCity || 'Dhaka'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] text-gray-400 uppercase block">Issue Date</span>
                                        <span className="font-mono text-gray-600">{activeGuest.idIssueDate || '-'}</span>
                                    </div>
                                </div>
                            )}

                            {activeGuest.idType === 'Driving License' && (
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                                    <div>
                                        <span className="text-[9.5px] text-gray-400 uppercase block">Vehicle Class</span>
                                        <span className="font-bold text-gray-800">{activeGuest.drivingVehicleClass || 'Light Vehicle'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] text-gray-400 uppercase block">BRTA Circle / Authority</span>
                                        <span className="font-medium text-gray-800">{activeGuest.idIssuePlace || 'BRTA Dhaka'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] text-gray-400 uppercase block">License Validity</span>
                                        <span className="font-mono text-emerald-700">{activeGuest.idExpiryDate || activeGuest.idExpiry || 'Active'}</span>
                                    </div>
                                </div>
                            )}

                            {activeGuest.address && (
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-start gap-2">
                                    <Home size={14} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <span className="text-[9.5px] text-gray-400 uppercase block">Verified Residential Address</span>
                                        <p className="text-gray-900 text-xs mt-0.5 font-medium">
                                            {activeGuest.address}, {activeGuest.homeCity} {activeGuest.postalCode ? `- ${activeGuest.postalCode}` : ''}, {activeGuest.homeCountry}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 size={16} />
                                </div>
                                <div>
                                    <h4 className="text-emerald-900 text-xs font-bold">SB Police Verification & Foreigner Registration Clearance</h4>
                                    <p className="text-[10.5px] text-emerald-700 mt-0.5">
                                        Identity verified against National Database on initial check-in. Fully compliant with Special Branch hotel ledger and immigration audit requirements.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Corporate Profile */}
                    {activeTab === 'corporate' && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-2xs p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-gray-900 text-xs flex items-center gap-1.5 font-bold">
                                    <Building2 size={13} className="text-blue-600" />
                                    <span>Corporate Affiliation & City Ledger Agreement</span>
                                </h3>
                                <button
                                    onClick={() => handleOpenEditModal(activeGuest, 'corporate')}
                                    className="px-2.5 py-1 rounded text-[10.5px] bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                >
                                    <Edit3 size={11} />
                                    <span>Edit Corporate Billing</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] text-gray-400 uppercase">Affiliated Company</span>
                                    <p className="text-gray-900 text-xs font-semibold">{activeGuest.company || 'Not affiliated with a corporate account'}</p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] text-gray-400 uppercase">Designation</span>
                                    <p className="text-gray-900 text-xs font-semibold">{activeGuest.designation || 'Individual Traveler'}</p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] text-gray-400 uppercase">Corporate Tax / BIN ID</span>
                                    <p className="text-gray-900 text-xs font-mono font-semibold">{activeGuest.corporateTaxId || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9.5px] text-blue-800 uppercase font-bold">Billing Instruction & Settlement Route</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600 text-white font-semibold">
                                        {activeGuest.billingRoute || (activeGuest.company ? 'Bill to Company (BTC / City Ledger)' : 'Self-Pay (Guest Folio)')}
                                    </span>
                                </div>
                                <p className="text-[11px] text-blue-900 leading-relaxed mt-1">
                                    {activeGuest.billingRoute?.includes('Bill to Company') || activeGuest.company
                                        ? 'Authorized for Direct Billing under Master Services Agreement (MSA #CORP-2026-99). Room and laundry billable to company city ledger account; all personal incidentals to be settled at checkout.'
                                        : 'Standard individual guest folio settlement. All room charges, taxes, and incidentals to be settled by guest upon departure via credit card, cash, or MFS.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tab 5: Profile Edit History & Audit Log */}
                    {activeTab === 'audit' && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-2xs p-3.5 space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                                <div>
                                    <h3 className="text-gray-900 text-xs flex items-center gap-1.5 font-bold">
                                        <History size={13} className="text-indigo-600" />
                                        <span>Profile Edit History & Tamper-Evident Audit Trail</span>
                                    </h3>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                        Immutable log tracking all modifications to guest information, identity credentials, phone numbers, and blacklist events.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (activeGuest?.id) {
                                            setLoadingEditHistory(true);
                                            const apiBase = getApiBaseUrl();
                                            fetch(`${apiBase}/api/guests/${activeGuest.id}/edit-history`)
                                                .then(r => r.json())
                                                .then(res => {
                                                    if (res.success && Array.isArray(res.data)) {
                                                        setEditHistory(res.data);
                                                    }
                                                })
                                                .finally(() => setLoadingEditHistory(false));
                                        }
                                    }}
                                    className="px-2.5 py-1 text-[10.5px] rounded bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold cursor-pointer"
                                >
                                    Refresh Log
                                </button>
                            </div>

                            {loadingEditHistory ? (
                                <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400">
                                    <Loader2 size={20} className="animate-spin text-blue-600" />
                                    <span className="text-xs">Loading audit trail records...</span>
                                </div>
                            ) : editHistory.length === 0 ? (
                                <div className="py-8 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                                    <History size={24} className="mx-auto text-gray-300 mb-1" />
                                    <p className="text-xs text-gray-600 font-semibold">No Edit History Logged Yet</p>
                                    <p className="text-[10.5px] text-gray-400 mt-0.5">
                                        Any edits to this guest profile, phone changes, or blacklist actions will be tracked here with field-level diffs.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {editHistory.map((item, idx) => (
                                        <div key={item.id || idx} className="p-3 bg-gray-50/70 rounded-lg border border-gray-200 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                                    <span className="font-bold text-gray-900">{item.changeSummary || (item as any).change_summary || 'Profile Updated'}</span>
                                                    <span className="text-[10px] text-gray-400">•</span>
                                                    <span className="text-[10.5px] text-gray-600 font-medium">By: {item.changedBy || (item as any).changed_by || 'Staff'}</span>
                                                </div>
                                                <span className="text-[10px] font-mono text-gray-500">
                                                    {(item.changedAt || (item as any).changed_at) ? new Date(item.changedAt || (item as any).changed_at).toLocaleString() : 'Recent'}
                                                </span>
                                            </div>

                                            {item.changes && Object.keys(item.changes).length > 0 && (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-[11px] border-collapse bg-white rounded border border-gray-200">
                                                        <thead>
                                                            <tr className="bg-gray-100/70 border-b border-gray-200 text-[10px] uppercase text-gray-600 font-semibold">
                                                                <th className="py-1 px-2.5">Field</th>
                                                                <th className="py-1 px-2.5">Previous Value</th>
                                                                <th className="py-1 px-1 text-center"></th>
                                                                <th className="py-1 px-2.5">New Value</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {Object.entries(item.changes).map(([field, diff]: [string, any]) => (
                                                                <tr key={field} className="hover:bg-gray-50">
                                                                    <td className="py-1 px-2.5 font-semibold text-gray-700 capitalize">
                                                                        {field.replace(/([A-Z])/g, ' $1')}
                                                                    </td>
                                                                    <td className="py-1 px-2.5 font-mono text-rose-600 bg-rose-50/50">
                                                                        <span className="line-through">{String(diff?.oldValue ?? '(empty)')}</span>
                                                                    </td>
                                                                    <td className="py-1 px-1 text-center text-gray-400 font-bold">➔</td>
                                                                    <td className="py-1 px-2.5 font-mono text-emerald-700 bg-emerald-50/50 font-semibold">
                                                                        {String(diff?.newValue ?? '(empty)')}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Add / Edit Guest Modal */}
            {showAddGuestModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                                    {modalMode === 'edit' ? <Edit3 size={16} /> : <User size={16} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-white tracking-tight">
                                            {modalMode === 'edit' ? `Edit Guest Profile #${editingGuestId}` : 'Register New Guest Profile'}
                                        </h3>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/30 border border-blue-400/40 text-blue-200 uppercase font-semibold">
                                            {modalMode === 'edit' ? 'Modify Mode' : 'Enterprise 360° CRM'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-300">
                                        {modalMode === 'edit'
                                            ? `Updating profile and hospitality preferences for ${newGuestForm.title} ${newGuestForm.name || activeGuest?.name}`
                                            : '5-Star Hotel KYC, Special Branch compliance, stay personalization & corporate ledger'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddGuestModal(false)}
                                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Step Navigation Tabs Bar */}
                        <div className="bg-slate-50 border-b border-gray-200 px-3 py-1.5 flex items-center justify-between gap-1 flex-shrink-0 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'kyc', step: '1', label: 'Identity & Legal KYC', icon: ShieldCheck },
                                { id: 'contact', step: '2', label: 'Contact & Address', icon: MapPin },
                                { id: 'preferences', step: '3', label: 'Stay & F&B', icon: Heart },
                                { id: 'corporate', step: '4', label: 'Corporate & Billing', icon: Building2 },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setModalTab(tab.id as any)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                        modalTab === tab.id
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-gray-600 hover:bg-gray-200/70 hover:text-gray-900'
                                    }`}
                                >
                                    <tab.icon size={13} />
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSaveGuestProfile} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                                {/* TAB 1: IDENTITY & LEGAL KYC */}
                                {modalTab === 'kyc' && (
                                    <div className="space-y-3 animate-in fade-in duration-100">
                                        <div className="bg-blue-50/70 p-2.5 rounded-lg border border-blue-200 flex items-start gap-2">
                                            <ShieldCheck size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-[11px] text-blue-900 leading-relaxed">
                                                <strong>Legal SB Police Form & Immigration Clearance:</strong> Accurately capture guest identification details required for hotel guest register compliance and immigration audit.
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Title</label>
                                                <select
                                                    value={newGuestForm.title}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, title: e.target.value as any })}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                >
                                                    <option>Mr.</option>
                                                    <option>Mrs.</option>
                                                    <option>Ms.</option>
                                                    <option>Dr.</option>
                                                    <option>Prof.</option>
                                                    <option>Engr.</option>
                                                </select>
                                            </div>
                                            <div className="sm:col-span-3">
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                                    Full Legal Name <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="As per Passport / National ID"
                                                    value={newGuestForm.name}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, name: e.target.value })}
                                                    className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Gender</label>
                                                <div className="grid grid-cols-3 gap-1.5 h-8">
                                                    {(['Male', 'Female', 'Other'] as const).map(g => (
                                                        <button
                                                            key={g}
                                                            type="button"
                                                            onClick={() => setNewGuestForm({ ...newGuestForm, gender: g })}
                                                            className={`h-full rounded border text-xs font-semibold cursor-pointer transition-colors ${
                                                                newGuestForm.gender === g
                                                                    ? 'bg-blue-600 border-blue-600 text-white'
                                                                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                                            }`}
                                                        >
                                                            {g}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[10.5px] font-semibold text-gray-700">Date of Birth</label>
                                                    <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 rounded">
                                                        Age: {calculateAge(newGuestForm.dob)} yrs {calculateAge(newGuestForm.dob) >= 18 ? '(Adult)' : '(Minor)'}
                                                    </span>
                                                </div>
                                                <input
                                                    type="date"
                                                    value={newGuestForm.dob}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, dob: e.target.value })}
                                                    className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Polymorphic Dynamic Identity Capture */}
                                        <div className="space-y-3 pt-1">
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                                    Identification Document Type <span className="text-rose-500">*</span>
                                                </label>
                                                <select
                                                    value={newGuestForm.idType}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, idType: e.target.value as any })}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                                                >
                                                    <option value="National ID (NID)">National ID (NID / Smart Card)</option>
                                                    <option value="Passport">International Passport</option>
                                                    <option value="Driving License">Driving License (BRTA / Int)</option>
                                                    <option value="Diplomatic ID">Diplomatic ID / UN / Embassy</option>
                                                    <option value="Birth Certificate">Birth Certificate</option>
                                                    <option value="Other">Other Official Document</option>
                                                </select>
                                            </div>

                                            {/* 1. National ID (NID) Specific Fields */}
                                            {newGuestForm.idType === 'National ID (NID)' && (
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
                                                    <div className="text-[11px] font-bold text-slate-800 flex items-center justify-between">
                                                        <span className="flex items-center gap-1.5">
                                                            <ShieldCheck size={14} className="text-emerald-600" />
                                                            National ID Card (NID) Verification
                                                        </span>
                                                        <span className="text-[9.5px] text-gray-500 font-normal">
                                                            Auto-formats Bengali (০-৯) &amp; English digits
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                                                                NID Number (10-digit Smart / 13 or 17-digit Classic) <span className="text-rose-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. 550 123 4567 or 19901234567890123"
                                                                value={newGuestForm.idNumber}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idNumber: e.target.value })}
                                                                onBlur={() => {
                                                                    if (newGuestForm.idNumber) {
                                                                        const norm = normalizeIdentityNumber(newGuestForm.idNumber, 'National ID (NID)');
                                                                        setNewGuestForm(prev => ({ ...prev, idNumber: norm }));
                                                                    }
                                                                }}
                                                                className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs font-mono outline-none focus:border-blue-500"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                                                                Father's / Spouse's Legal Name
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="As shown on back of NID card"
                                                                value={newGuestForm.fatherOrSpouseName || ''}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, fatherOrSpouseName: e.target.value })}
                                                                className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Issue Date</label>
                                                            <input
                                                                type="date"
                                                                value={newGuestForm.idIssueDate || ''}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idIssueDate: e.target.value })}
                                                                className="w-full h-8 px-2 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Expiry Date</label>
                                                            <input
                                                                type="date"
                                                                value={newGuestForm.idExpiryDate || newGuestForm.idExpiry || ''}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idExpiryDate: e.target.value, idExpiry: e.target.value })}
                                                                className="w-full h-8 px-2 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Issuing District / Circle</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Dhaka, Chittagong"
                                                                value={newGuestForm.idIssuePlace || ''}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idIssuePlace: e.target.value })}
                                                                className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 2. Passport & Visa Specific Fields */}
                                            {newGuestForm.idType === 'Passport' && (
                                                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-200 space-y-3">
                                                    <div className="text-[11px] font-bold text-blue-900 flex items-center justify-between">
                                                        <span className="flex items-center gap-1.5">
                                                            <ShieldCheck size={14} className="text-blue-600" />
                                                            Passport Details (Required for Foreign Visitors &amp; SB Police Register)
                                                        </span>
                                                        <span className="text-[9.5px] font-normal text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                                                            Special Branch Compliance
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                                                                Passport Number <span className="text-rose-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. A01234567"
                                                                value={newGuestForm.idNumber}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idNumber: e.target.value })}
                                                                onBlur={() => {
                                                                    if (newGuestForm.idNumber) {
                                                                        const norm = normalizeIdentityNumber(newGuestForm.idNumber, 'Passport');
                                                                        setNewGuestForm(prev => ({ ...prev, idNumber: norm }));
                                                                    }
                                                                }}
                                                                className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs font-mono uppercase outline-none focus:border-blue-500"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Passport Issuing Country</label>
                                                            <select
                                                                value={newGuestForm.idIssueCountry || newGuestForm.nationality || 'Bangladesh'}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idIssueCountry: e.target.value })}
                                                                className="w-full h-8 px-2 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500 cursor-pointer"
                                                            >
                                                                {COUNTRIES_DATABASE.map(c => (
                                                                    <option key={c.code} value={c.name}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Passport Expiry Date</label>
                                                            <input
                                                                type="date"
                                                                value={newGuestForm.idExpiryDate || newGuestForm.idExpiry || ''}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idExpiryDate: e.target.value, idExpiry: e.target.value })}
                                                                className="w-full h-8 px-2 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Visa Sub-Section */}
                                                    <div className="bg-white p-2.5 rounded border border-blue-200/80 space-y-2">
                                                        <div className="text-[10px] font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1">
                                                            <FileText size={12} className="text-indigo-600" />
                                                            <span>Visa &amp; Immigration Clearance</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                                            <div>
                                                                <label className="block text-[9.5px] font-semibold text-gray-600 mb-0.5">Visa Number</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="e.g. V-9821734"
                                                                    value={newGuestForm.passportVisaNumber || ''}
                                                                    onChange={e => setNewGuestForm({ ...newGuestForm, passportVisaNumber: e.target.value })}
                                                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs font-mono outline-none focus:border-blue-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[9.5px] font-semibold text-gray-600 mb-0.5">Visa Category</label>
                                                                <select
                                                                    value={newGuestForm.passportVisaType || 'Tourist'}
                                                                    onChange={e => setNewGuestForm({ ...newGuestForm, passportVisaType: e.target.value })}
                                                                    className="w-full h-7 px-1.5 border border-gray-300 rounded text-xs outline-none focus:border-blue-500 cursor-pointer"
                                                                >
                                                                    <option value="Tourist">Tourist (T)</option>
                                                                    <option value="Business">Business (B)</option>
                                                                    <option value="Diplomatic">Diplomatic (D)</option>
                                                                    <option value="Employment">Employment / Work (E)</option>
                                                                    <option value="Student">Student (S)</option>
                                                                    <option value="Transit">Transit (TR)</option>
                                                                    <option value="Visa on Arrival">Visa on Arrival (VoA)</option>
                                                                    <option value="Exempt / Dual">Exempt / No Visa Required</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[9.5px] font-semibold text-gray-600 mb-0.5">Visa Expiry Date</label>
                                                                <input
                                                                    type="date"
                                                                    value={newGuestForm.passportVisaExpiry || ''}
                                                                    onChange={e => setNewGuestForm({ ...newGuestForm, passportVisaExpiry: e.target.value })}
                                                                    className="w-full h-7 px-1.5 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[9.5px] font-semibold text-gray-600 mb-0.5">Port of Entry</label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="e.g. Dhaka (DAC) / Benapole"
                                                                    value={newGuestForm.passportEntryPort || ''}
                                                                    onChange={e => setNewGuestForm({ ...newGuestForm, passportEntryPort: e.target.value })}
                                                                    className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 3. Driving License Specific Fields */}
                                            {newGuestForm.idType === 'Driving License' && (
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
                                                    <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                                                        <ShieldCheck size={14} className="text-amber-600" />
                                                        <span>Driving License Details</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">
                                                                License Number <span className="text-rose-500">*</span>
                                                            </label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. DK0129382DL"
                                                                value={newGuestForm.idNumber}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idNumber: e.target.value })}
                                                                onBlur={() => {
                                                                    if (newGuestForm.idNumber) {
                                                                        const norm = normalizeIdentityNumber(newGuestForm.idNumber, 'Driving License');
                                                                        setNewGuestForm(prev => ({ ...prev, idNumber: norm }));
                                                                    }
                                                                }}
                                                                className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs font-mono uppercase outline-none focus:border-blue-500"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Vehicle Class</label>
                                                            <select
                                                                value={newGuestForm.drivingVehicleClass || 'Light'}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, drivingVehicleClass: e.target.value })}
                                                                className="w-full h-8 px-2 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500 cursor-pointer"
                                                            >
                                                                <option value="Light">Light Vehicle (Car / Sedan)</option>
                                                                <option value="Medium">Medium Commercial</option>
                                                                <option value="Heavy">Heavy Transport</option>
                                                                <option value="Motorcycle">Motorcycle</option>
                                                                <option value="Professional">Professional (All Classes)</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">BRTA Circle / Authority</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. BRTA Mirpur, Dhaka"
                                                                value={newGuestForm.idIssuePlace || ''}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idIssuePlace: e.target.value })}
                                                                className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Issue Date</label>
                                                            <input
                                                                type="date"
                                                                value={newGuestForm.idIssueDate || ''}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idIssueDate: e.target.value })}
                                                                className="w-full h-8 px-2 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">License Expiry Date</label>
                                                            <input
                                                                type="date"
                                                                value={newGuestForm.idExpiryDate || newGuestForm.idExpiry || ''}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idExpiryDate: e.target.value, idExpiry: e.target.value })}
                                                                className="w-full h-8 px-2 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 4. Diplomatic ID Specific Fields */}
                                            {newGuestForm.idType === 'Diplomatic ID' && (
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2.5">
                                                    <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                                                        <ShieldCheck size={14} className="text-purple-600" />
                                                        <span>Diplomatic / Consular ID Details</span>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Diplomatic ID #</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. DIP-902341"
                                                                value={newGuestForm.idNumber}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idNumber: e.target.value })}
                                                                className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs font-mono outline-none focus:border-blue-500"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Embassy / Mission Name</label>
                                                            <input
                                                                type="text"
                                                                placeholder="e.g. Embassy of Canada / UN"
                                                                value={newGuestForm.idIssuePlace || ''}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idIssuePlace: e.target.value })}
                                                                className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Expiry Date</label>
                                                            <input
                                                                type="date"
                                                                value={newGuestForm.idExpiryDate || newGuestForm.idExpiry || ''}
                                                                onChange={e => setNewGuestForm({ ...newGuestForm, idExpiryDate: e.target.value, idExpiry: e.target.value })}
                                                                className="w-full h-8 px-2 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 5. Birth Certificate / Other */}
                                            {(newGuestForm.idType === 'Birth Certificate' || newGuestForm.idType === 'Other') && (
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Document Registration #</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Registration Number"
                                                            value={newGuestForm.idNumber}
                                                            onChange={e => setNewGuestForm({ ...newGuestForm, idNumber: e.target.value })}
                                                            className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs font-mono outline-none focus:border-blue-500"
                                                            required
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-gray-700 mb-0.5">Issuing Authority / Country</label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. City Corporation / Ministry"
                                                            value={newGuestForm.idIssueCountry || newGuestForm.nationality || ''}
                                                            onChange={e => setNewGuestForm({ ...newGuestForm, idIssueCountry: e.target.value })}
                                                            className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: CONTACT, ADDRESS & EMERGENCY */}
                                {modalTab === 'contact' && (
                                    <div className="space-y-3 animate-in fade-in duration-100">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                                    Primary Mobile Phone <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    type="tel"
                                                    placeholder="+880 1711-XXXXXX"
                                                    value={newGuestForm.phone}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, phone: e.target.value })}
                                                    className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs font-mono outline-none focus:bg-white focus:border-blue-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                                    WhatsApp / Alt Mobile Phone
                                                </label>
                                                <input
                                                    type="tel"
                                                    placeholder="+880 1819-XXXXXX"
                                                    value={newGuestForm.altPhone}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, altPhone: e.target.value })}
                                                    className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs font-mono outline-none focus:bg-white focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                                Email Address (for Digital Folio & Invoices)
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="guest@domain.com"
                                                value={newGuestForm.email}
                                                onChange={e => setNewGuestForm({ ...newGuestForm, email: e.target.value })}
                                                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                                Residential / Street Address
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="House/Apt, Road, Area, Sector..."
                                                value={newGuestForm.address}
                                                onChange={e => setNewGuestForm({ ...newGuestForm, address: e.target.value })}
                                                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                                    Country of Residence <span className="text-rose-500">*</span>
                                                </label>
                                                <select
                                                    value={newGuestForm.homeCountry}
                                                    onChange={e => {
                                                        const selectedCountry = e.target.value;
                                                        const cities = getCitiesForCountry(selectedCountry);
                                                        const nat = getNationalityForCountry(selectedCountry);
                                                        setNewGuestForm({
                                                            ...newGuestForm,
                                                            homeCountry: selectedCountry,
                                                            nationality: nat,
                                                            homeCity: cities[0] || 'Dhaka'
                                                        });
                                                    }}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                                                >
                                                    {COUNTRIES_DATABASE.map(c => (
                                                        <option key={c.code} value={c.name}>
                                                            {c.name} ({c.dialCode})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[10.5px] font-semibold text-gray-700">City / District</label>
                                                    <span className="text-[9px] text-gray-400 font-normal">Dynamic by Country</span>
                                                </div>
                                                <select
                                                    value={getCitiesForCountry(newGuestForm.homeCountry).includes(newGuestForm.homeCity) ? newGuestForm.homeCity : '__custom__'}
                                                    onChange={e => {
                                                        if (e.target.value === '__custom__') {
                                                            setNewGuestForm({ ...newGuestForm, homeCity: '' });
                                                        } else {
                                                            setNewGuestForm({ ...newGuestForm, homeCity: e.target.value });
                                                        }
                                                    }}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
                                                >
                                                    {getCitiesForCountry(newGuestForm.homeCountry).map(cty => (
                                                        <option key={cty} value={cty}>{cty}</option>
                                                    ))}
                                                    <option value="__custom__">Other / Enter Manually...</option>
                                                </select>
                                                {!getCitiesForCountry(newGuestForm.homeCountry).includes(newGuestForm.homeCity) && (
                                                    <input
                                                        type="text"
                                                        placeholder="Type city name..."
                                                        value={newGuestForm.homeCity}
                                                        onChange={e => setNewGuestForm({ ...newGuestForm, homeCity: e.target.value })}
                                                        className="w-full h-7 px-2 bg-white border border-blue-400 rounded text-xs outline-none focus:border-blue-600 mt-1"
                                                        autoFocus
                                                    />
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Postal / Zip Code</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 1212"
                                                    value={newGuestForm.postalCode}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, postalCode: e.target.value })}
                                                    className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs font-mono outline-none focus:bg-white focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        {/* Emergency Contact Group */}
                                        <div className="p-3 bg-rose-50/60 rounded-lg border border-rose-200 space-y-2">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                                                <AlertTriangle size={14} className="text-rose-600" />
                                                <span>Emergency Contact & Duty of Care</span>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-rose-800 mb-0.5">Contact Person Name</label>
                                                    <input
                                                        type="text"
                                                        placeholder="Full Name"
                                                        value={newGuestForm.emergencyName}
                                                        onChange={e => setNewGuestForm({ ...newGuestForm, emergencyName: e.target.value })}
                                                        className="w-full h-7 px-2 bg-white border border-rose-200 rounded text-xs outline-none focus:border-rose-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-rose-800 mb-0.5">Relationship</label>
                                                    <select
                                                        value={newGuestForm.emergencyRelation}
                                                        onChange={e => setNewGuestForm({ ...newGuestForm, emergencyRelation: e.target.value })}
                                                        className="w-full h-7 px-2 bg-white border border-rose-200 rounded text-xs outline-none focus:border-rose-500"
                                                    >
                                                        <option>Spouse</option>
                                                        <option>Parent</option>
                                                        <option>Child</option>
                                                        <option>Sibling</option>
                                                        <option>Colleague</option>
                                                        <option>Friend</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-rose-800 mb-0.5">Emergency Phone</label>
                                                    <input
                                                        type="tel"
                                                        placeholder="+880 1712-XXXXXX"
                                                        value={newGuestForm.emergencyPhone}
                                                        onChange={e => setNewGuestForm({ ...newGuestForm, emergencyPhone: e.target.value })}
                                                        className="w-full h-7 px-2 bg-white border border-rose-200 rounded text-xs font-mono outline-none focus:border-rose-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: STAY PREFERENCES & F&B / ALLERGENS */}
                                {modalTab === 'preferences' && (
                                    <div className="space-y-3 animate-in fade-in duration-100">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Preferred Room Type</label>
                                                <select
                                                    value={newGuestForm.roomType}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, roomType: e.target.value })}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                >
                                                    <option>Deluxe King</option>
                                                    <option>Deluxe Double</option>
                                                    <option>Deluxe Twin</option>
                                                    <option>Executive Suite</option>
                                                    <option>Presidential Suite</option>
                                                    <option>Standard Single</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Floor & Location</label>
                                                <select
                                                    value={newGuestForm.floorPreference}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, floorPreference: e.target.value as any })}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                >
                                                    <option>High Floor</option>
                                                    <option>Ground Floor</option>
                                                    <option>Quiet Corner</option>
                                                    <option>Away from Elevator</option>
                                                    <option>Near Elevator</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Bed Setup</label>
                                                <select
                                                    value={newGuestForm.bedType}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, bedType: e.target.value as any })}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                >
                                                    <option>King Bed</option>
                                                    <option>Twin Beds</option>
                                                    <option>Single Bed</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Pillow Menu</label>
                                                <select
                                                    value={newGuestForm.pillowType}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, pillowType: e.target.value as any })}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                >
                                                    <option>Feather / Down</option>
                                                    <option>Orthopedic</option>
                                                    <option>Hypoallergenic</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Smoking Policy</label>
                                                <select
                                                    value={newGuestForm.smoking}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, smoking: e.target.value as any })}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                >
                                                    <option>Non-Smoking</option>
                                                    <option>Smoking</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <label className="text-[10.5px] font-semibold text-gray-700">Dietary Requirements</label>
                                                </div>
                                                <select
                                                    value={newGuestForm.dietary}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, dietary: e.target.value })}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                >
                                                    <option>Standard Halal</option>
                                                    <option>Pure Vegetarian</option>
                                                    <option>Vegan</option>
                                                    <option>Gluten-Free</option>
                                                    <option>Jain Diet</option>
                                                    <option>Diabetic / Low Sodium</option>
                                                    <option>No Special Diet</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Morning Newspaper</label>
                                                <select
                                                    value={newGuestForm.newspaper}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, newspaper: e.target.value })}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                >
                                                    <option>The Daily Star</option>
                                                    <option>Prothom Alo</option>
                                                    <option>Financial Times</option>
                                                    <option>None / Digital Only</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[10.5px] font-semibold text-gray-700">
                                                    Allergies & Medical Notices
                                                </label>
                                                <div className="flex items-center gap-1 text-[9.5px]">
                                                    <span className="text-gray-400">Quick:</span>
                                                    {['None', 'Peanuts', 'Seafood', 'Lactose', 'Feathers', 'Wheelchair'].map(al => (
                                                        <button
                                                            key={al}
                                                            type="button"
                                                            onClick={() => setNewGuestForm({ ...newGuestForm, allergies: al === 'None' ? 'None' : `${al} Allergy` })}
                                                            className="text-rose-600 hover:underline cursor-pointer"
                                                        >
                                                            {al}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="e.g. Peanut Allergy, Shellfish Allergy, Wheelchair required..."
                                                value={newGuestForm.allergies}
                                                onChange={e => setNewGuestForm({ ...newGuestForm, allergies: e.target.value })}
                                                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-rose-500"
                                            />
                                            {newGuestForm.allergies && newGuestForm.allergies !== 'None' && (
                                                <p className="text-[10.5px] text-amber-700 mt-1 flex items-center gap-1 bg-amber-50 p-1.5 rounded border border-amber-200">
                                                    <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />
                                                    <span>Chef & Housekeeping supervisor will receive high-priority alerts upon check-in.</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* TAB 4: CORPORATE & VIP BILLING */}
                                {modalTab === 'corporate' && (
                                    <div className="space-y-3 animate-in fade-in duration-100">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">VIP Loyalty Tier</label>
                                                <select
                                                    value={newGuestForm.vipTier}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, vipTier: e.target.value as any })}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                >
                                                    <option value="Regular">Regular Guest</option>
                                                    <option value="Silver">Silver Member</option>
                                                    <option value="Gold">Gold VIP</option>
                                                    <option value="Platinum VIP">Platinum VIP</option>
                                                    <option value="Corporate VIP">Corporate VIP</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Billing Settlement Route</label>
                                                <select
                                                    value={newGuestForm.billingRoute}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, billingRoute: e.target.value as any })}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                >
                                                    <option value="Self-Pay (Guest Folio)">Self-Pay (Guest Folio at Checkout)</option>
                                                    <option value="Bill to Company (BTC / City Ledger)">Bill to Company (BTC / City Ledger)</option>
                                                    <option value="Travel Agent / OTA Voucher">Travel Agent / OTA Voucher</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Corporate Affiliation / Company</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Chevron, Standard Chartered, Beximco"
                                                    value={newGuestForm.company}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, company: e.target.value })}
                                                    className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Designation / Title</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Managing Director, Country Lead"
                                                    value={newGuestForm.designation}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, designation: e.target.value })}
                                                    className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                                Corporate Tax ID / BIN / Trade License (for Tax Invoices)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. BIN-00294819-2024"
                                                value={newGuestForm.corporateTaxId}
                                                onChange={e => setNewGuestForm({ ...newGuestForm, corporateTaxId: e.target.value })}
                                                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs font-mono outline-none focus:bg-white focus:border-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">
                                                General Manager & Concierge Special Notes
                                            </label>
                                            <textarea
                                                placeholder="VIP amenities, flight schedule, special handling instructions..."
                                                value={newGuestForm.specialNotes}
                                                onChange={e => setNewGuestForm({ ...newGuestForm, specialNotes: e.target.value })}
                                                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                                <span className="text-[10px] text-gray-500">
                                    <span className="text-rose-500 font-bold">*</span> Name & Phone required. Other fields optional.
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddGuestModal(false)}
                                        className="h-8 px-3 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded text-xs font-semibold cursor-pointer transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    {modalTab !== 'kyc' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (modalTab === 'corporate') setModalTab('preferences');
                                                else if (modalTab === 'preferences') setModalTab('contact');
                                                else if (modalTab === 'contact') setModalTab('kyc');
                                            }}
                                            className="h-8 px-3 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                                        >
                                            <ChevronLeft size={13} />
                                            <span>Back</span>
                                        </button>
                                    )}
                                    {modalTab !== 'corporate' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (modalTab === 'kyc') setModalTab('contact');
                                                else if (modalTab === 'contact') setModalTab('preferences');
                                                else if (modalTab === 'preferences') setModalTab('corporate');
                                            }}
                                            className="h-8 px-3 bg-gray-800 hover:bg-gray-900 text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                                        >
                                            <span>Next</span>
                                            <ChevronRight size={13} />
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
                                    >
                                        <CheckCircle2 size={13} />
                                        <span>{modalMode === 'edit' ? 'Update Guest Profile' : 'Save Guest 360 Profile'}</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Merge Duplicate Profiles Modal */}
            {showMergeModal && (
                <MergeGuestModal
                    isOpen={showMergeModal}
                    onClose={() => {
                        setShowMergeModal(false);
                        setActiveMergeCluster(null);
                    }}
                    candidateGuests={
                        activeMergeCluster?.guests
                            ? activeMergeCluster.guests.map((g: any) => {
                                const richLocal = guests.find(lg => lg.id === Number(g.id) || (g.phone && isSamePhoneNumber(lg.phone, g.phone)));
                                return {
                                    id: Number(g.id || richLocal?.id || 1),
                                    title: g.salutation ? `${g.salutation}.` : (richLocal?.title || 'Mr.'),
                                    salutation: g.salutation || richLocal?.title?.replace('.', '') || 'Mr',
                                    name: richLocal ? `${richLocal.title} ${parseTitleAndName(richLocal.name).cleanName}` : `${g.first_name || ''} ${g.last_name || ''}`.trim() || g.name || 'Guest',
                                    phone: g.phone || richLocal?.phone || '',
                                    email: g.email || richLocal?.email || '',
                                    idType: g.id_type || g.idType || richLocal?.idType || 'National ID (NID)',
                                    idNumber: g.id_number || g.idNumber || richLocal?.idNumber || '',
                                    vipTier: richLocal?.vipTier || g.vip_status || 'Regular',
                                    vipStatus: g.vip_status || richLocal?.vipTier || 'NONE',
                                    nationality: g.nationality || richLocal?.nationality || 'Bangladeshi',
                                    address: g.address || richLocal?.address || '',
                                    city: g.city || richLocal?.homeCity || 'Dhaka',
                                    totalStays: Number(g.total_stays ?? g.totalStays ?? richLocal?.totalStays ?? 0),
                                    totalSpend: Number(g.total_spend ?? g.totalSpend ?? richLocal?.lifetimeSpendBDT ?? 0),
                                    lifetimeSpendBDT: Number(g.total_spend ?? g.totalSpend ?? richLocal?.lifetimeSpendBDT ?? 0)
                                };
                            })
                            : []
                    }
                    mergeReason={activeMergeCluster?.reason || 'Duplicate Records Identified'}
                    onMergeSuccess={(mergedData) => {
                        refreshGuests();
                        setSelectedForMerge([]);
                        setActiveMergeCluster(null);
                        broadcastPMSEvent({ type: 'GUESTS_UPDATED' });
                        showToast(`Successfully merged duplicate profiles into: ${mergedData?.first_name || ''} ${mergedData?.last_name || ''}`);
                    }}
                />
            )}

            {/* Blacklist / Block Modal */}
            {showBlacklistModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden">
                        <div className={`p-4 text-white flex items-center justify-between ${blacklistActionType === 'block' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                                    {blacklistActionType === 'block' ? <Ban size={18} /> : <CheckCircle2 size={18} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm leading-tight">
                                        {blacklistActionType === 'block' ? 'Block / Blacklist Guest' : 'Lift Blacklist Block'}
                                    </h3>
                                    <p className="text-[10.5px] opacity-90 font-mono mt-0.5">
                                        {activeGuest.title} {activeGuest.name} ({activeGuest.phone})
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowBlacklistModal(false)}
                                className="w-7 h-7 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-4 space-y-3.5">
                            {blacklistActionType === 'block' ? (
                                <>
                                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 leading-relaxed">
                                        <strong>Hospitality Warning:</strong> Blacklisting this guest will prevent new reservations across <strong>Add Reservation</strong>, <strong>Quick Reservation</strong>, and express check-in. Attempting to book will trigger a Red Warning alert and require Manager Override authorization.
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                            Violation Category <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={blacklistCategory}
                                            onChange={e => setBlacklistCategory(e.target.value as BlacklistCategory)}
                                            className="w-full h-8 px-2 bg-white border border-gray-300 rounded text-xs outline-none focus:border-rose-500 cursor-pointer"
                                        >
                                            <option value="Payment Default / Unpaid Folio">Payment Default / Unpaid Folio</option>
                                            <option value="Property Damage / Vandalism">Property Damage / Vandalism</option>
                                            <option value="Disorderly Conduct / Harassment">Disorderly Conduct / Harassment</option>
                                            <option value="Security Threat / Suspicious Activity">Security Threat / Suspicious Activity</option>
                                            <option value="Fraudulent Identity / Fake Documents">Fraudulent Identity / Fake Documents</option>
                                            <option value="Rule Violation / Unauthorized Guests">Rule Violation / Unauthorized Guests</option>
                                            <option value="Other Violation">Other Violation</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                            Detailed Incident Description &amp; Reason <span className="text-rose-500">*</span>
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder="Explain why this guest is being blocked (e.g. Left unpaid restaurant bill of ৳12,500; verbal harassment of night auditor)..."
                                            value={blacklistReasonInput}
                                            onChange={e => setBlacklistReasonInput(e.target.value)}
                                            className="w-full p-2 bg-white border border-gray-300 rounded text-xs outline-none focus:border-rose-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                            Authorizing Staff / Manager Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Duty Manager / GM"
                                            value={blacklistStaffName}
                                            onChange={e => setBlacklistStaffName(e.target.value)}
                                            className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs outline-none focus:border-rose-500"
                                            required
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
                                        Are you sure you want to lift the blacklist restriction for <strong>{activeGuest.title} {activeGuest.name}</strong>?
                                        <div className="mt-1.5 p-2 bg-white/80 rounded border border-amber-300 text-[10.5px] text-amber-800 font-mono">
                                            Recorded Incident: {activeGuest.blacklistReason || 'None specified'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                                            Authorizing Staff / Manager Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Duty Manager"
                                            value={blacklistStaffName}
                                            onChange={e => setBlacklistStaffName(e.target.value)}
                                            className="w-full h-8 px-2.5 bg-white border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowBlacklistModal(false)}
                                className="px-3 py-1.5 rounded text-xs font-semibold text-gray-600 hover:bg-gray-200 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmBlacklist}
                                className={`px-4 py-1.5 rounded text-xs font-semibold text-white shadow-xs cursor-pointer ${
                                    blacklistActionType === 'block' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {blacklistActionType === 'block' ? 'Confirm Blacklist Block' : 'Confirm Unblock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestProfile;
