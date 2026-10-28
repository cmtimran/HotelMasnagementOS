import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    User, Search, Plus, Star, Phone, Mail,
    MapPin, ShieldCheck,
    Heart, CheckCircle2,
    Building2, Clock,
    AlertTriangle, ChevronRight, ChevronLeft,
    Home, Edit3, Receipt,
    GitMerge, CheckSquare, Square
} from 'lucide-react';
import { getAllStoredReservations, saveStoredReservations, broadcastPMSEvent, syncReservationsFromDB, subscribeToPMSEvents, type StoredReservation } from '../utils/roomInventoryEngine';
import { useNavigation } from '../context/NavigationContext';
import { getApiBaseUrl } from '../utils/apiUrl';
import MergeGuestModal from './modals/MergeGuestModal';

export const normalizePhone = (raw: string | null | undefined): string => {
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('880') && digits.length >= 13) {
        digits = '0' + digits.slice(3);
    }
    return digits;
};

export interface GuestRecord {
    id: number;
    title: 'Mr.' | 'Mrs.' | 'Ms.' | 'Dr.' | 'Prof.' | 'Engr.';
    name: string;
    phone: string;
    altPhone?: string;
    email: string;
    vipTier: 'Regular' | 'Silver' | 'Gold' | 'Platinum VIP' | 'Corporate VIP';
    nationality: string;
    idType: 'National ID (NID)' | 'Passport' | 'Driving License' | 'Diplomatic ID';
    idNumber: string;
    idExpiry?: string;
    issuingCountry?: string;
    dob: string;
    gender: 'Male' | 'Female' | 'Other';
    homeCity: string;
    homeCountry: string;
    address?: string;
    postalCode?: string;
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
        const normP = normalizePhone(rawPhone);
        const cleanE = (r.email || r.guestEmail || '').trim().toLowerCase();

        // Check if an existing guest in map matches by normalized phone, email, or clean name
        let matchedKey: string | undefined;
        for (const [k, g] of map.entries()) {
            if (normP && normalizePhone(g.phone) === normP) {
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
                const pNorm = normalizePhone(p.phone);
                const phoneMatch = Boolean(normP && pNorm && normP === pNorm);
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
        const spNorm = normalizePhone(sp.phone);
        const alreadyExists = Array.from(map.values()).some(g =>
            (spNorm && normalizePhone(g.phone) === spNorm) ||
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
        const derived = deriveGuestsFromReservations(getAllStoredReservations());
        if (derived.length > 0) return derived;
        const saved = localStorage.getItem('hotel_guest_profiles_v2');
        return saved ? JSON.parse(saved) : [];
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
                        (dg.normalizedPhone && normalizePhone(m.phone) === dg.normalizedPhone) ||
                        (dg.email && m.email && m.email.toLowerCase() === dg.email.toLowerCase() && !dg.email.includes('hospitality.com'))
                    );
                    if (existing) {
                        mergedMap.set(existing.id, {
                            ...existing,
                            id: dg.id,
                            title: (dg.salutation ? `${dg.salutation}.` : existing.title) as GuestRecord['title'],
                            name: `${dg.firstName} ${dg.lastName}`.trim() || existing.name,
                            phone: dg.phone || existing.phone,
                            email: dg.email || existing.email,
                            idType: dg.idType || existing.idType,
                            idNumber: dg.idNumber || existing.idNumber,
                            vipTier: dg.vipStatus === 'VVIP' ? 'Platinum VIP' : dg.vipStatus === 'VIP' ? 'Gold' : existing.vipTier,
                            totalStays: Math.max(existing.totalStays, dg.totalStays || 0),
                            lifetimeSpendBDT: Math.max(existing.lifetimeSpendBDT, dg.totalSpend || 0)
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
                            dob: '1990-01-01',
                            gender: 'Male',
                            homeCity: dg.city || 'Dhaka',
                            homeCountry: dg.country || 'Bangladesh',
                            address: dg.address || '',
                            totalStays: dg.totalStays || 0,
                            totalNights: dg.totalStays || 0,
                            lifetimeSpendBDT: dg.totalSpend || 0,
                            lastStayDate: dg.lastStayDate || '-',
                            loyaltyPoints: Math.round((dg.totalSpend || 0) / 20),
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
    const [activeTab, setActiveTab] = useState<'overview' | 'preferences' | 'vault' | 'corporate'>('overview');
    const [activityFilter, setActivityFilter] = useState<'all' | 'reservations' | 'checkins' | 'outlets'>('all');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Modal state for adding or editing a guest
    const [showAddGuestModal, setShowAddGuestModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [editingGuestId, setEditingGuestId] = useState<number | null>(null);
    const [modalTab, setModalTab] = useState<'kyc' | 'contact' | 'preferences' | 'corporate'>('kyc');

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

    const { reservationsList, checkinsList, outletBillsList, allLedgerItems } = useMemo(() => {
        if (!activeGuest) {
            return { reservationsList: [], checkinsList: [], outletBillsList: [], allLedgerItems: [] };
        }

        const canonicalReservations = getAllStoredReservations();
        const guestNameLower = parseTitleAndName(activeGuest.name).cleanName.toLowerCase().trim();

        // 1. Reservations (Real bookings only - zero mock fallback)
        const matchedRes = canonicalReservations.filter((r: StoredReservation) => {
            const rClean = parseTitleAndName(r.guestName || '').cleanName.toLowerCase().trim();
            return (rClean && (rClean.includes(guestNameLower) || guestNameLower.includes(rClean))) || Boolean(r.phone && (r.phone === activeGuest.phone || (r as any).guestPhone === activeGuest.phone));
        });

        const resItems = matchedRes.map((r: StoredReservation, i: number) => {
            const nights = Number(r.nights) || Math.max(1, Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86400000));
            const amount = Number(r.totalAmount) || Number(r.totalRate) || 0;
            const status = (r.status || 'CONFIRMED').toUpperCase();
            const badgeColor =
                status.includes('CHECKED_IN') || status.includes('CHECKED-IN') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                status.includes('CHECKED_OUT') || status.includes('CHECKED-OUT') ? 'bg-slate-100 text-slate-700 border-slate-200' :
                status.includes('CANCEL') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                'bg-blue-50 text-blue-700 border-blue-200';
            return {
                id: `res-${r.id || r.reservationNumber || i}`,
                type: 'reservation' as const,
                refNumber: r.reservationNumber || `RES-${r.id || 10000 + i}`,
                title: `${r.roomType || 'Room'} Reservation`,
                particulars: `${r.ratePlan || 'Standard Rate'} • ${r.adults || 1} Adult(s) • ${nights} Nts`,
                roomOrLocation: r.roomNumber || r.roomNo || (Array.isArray(r.allocatedRooms) ? r.allocatedRooms[0] : null) || 'Unassigned',
                dateTime: `${r.checkIn}`,
                amountBDT: amount,
                status: status.replace('_', ' '),
                statusBadgeColor: badgeColor,
                rawReservation: r
            };
        });

        // 2. Check-Ins & Stays (Real check-in records only - zero mock fallback)
        const checkinItems: any[] = [];
        const seenStayRefs = new Set<string>();

        matchedRes.forEach((r: StoredReservation, i: number) => {
            const s = (r.status || '').toUpperCase();
            if (s.includes('CHECKED_IN') || s.includes('CHECKED-IN') || s.includes('CHECKED_OUT') || s.includes('CHECKED-OUT') || s === 'IN-HOUSE') {
                const ref = String(r.reservationNumber || r.id);
                seenStayRefs.add(ref);
                const nights = Number(r.nights) || Math.max(1, Math.round((new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 86400000));
                const isInHouse = s.includes('CHECKED_IN') || s.includes('CHECKED-IN') || s === 'IN-HOUSE';
                checkinItems.push({
                    id: `checkin-res-${ref}-${i}`,
                    type: 'checkin' as const,
                    refNumber: `REG-${ref}`,
                    title: `Stay (Room ${r.roomNumber || r.roomNo || 'Assigned'})`,
                    particulars: `${r.checkIn} → ${r.checkOut} (${nights} Nts)`,
                    roomOrLocation: r.roomNumber || r.roomNo ? `Room ${r.roomNumber || r.roomNo}` : 'Front Desk',
                    dateTime: `${r.checkIn}`,
                    amountBDT: Number(r.totalAmount) || Number(r.totalRate) || 0,
                    status: isInHouse ? 'In-House' : 'Checked-Out',
                    statusBadgeColor: isInHouse ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200',
                    rawReservation: r
                });
            }
        });

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
    }, [activeGuest]);

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

        const normP = normalizePhone(newGuestForm.phone);
        const cleanE = newGuestForm.email.trim().toLowerCase();
        const cleanId = newGuestForm.idNumber.trim().toLowerCase();

        // 1. Strict Duplicate Prevention Verification
        const conflict = guests.find(g => {
            if (modalMode === 'edit' && g.id === editingGuestId) return false;
            const pMatch = Boolean(normP && normalizePhone(g.phone) === normP);
            const eMatch = Boolean(cleanE && !cleanE.includes('guest.com') && !cleanE.includes('hospitality.com') && g.email && g.email.trim().toLowerCase() === cleanE);
            const idMatch = Boolean(cleanId && g.idNumber && g.idNumber.trim().toLowerCase() === cleanId);
            return pMatch || eMatch || idMatch;
        });

        if (conflict) {
            const conflictField = (normP && normalizePhone(conflict.phone) === normP)
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
            nationality: newGuestForm.nationality.trim() || 'Bangladeshi',
            idType: newGuestForm.idType,
            idNumber: newGuestForm.idNumber.trim() || undefined,
            vipStatus: newGuestForm.vipTier.includes('Platinum') ? 'VVIP' : newGuestForm.vipTier.includes('Gold') ? 'VIP' : 'NONE',
            address: newGuestForm.address.trim() || undefined,
            city: newGuestForm.homeCity.trim() || 'Dhaka',
            country: newGuestForm.homeCountry.trim() || 'Bangladesh'
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
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col p-2.5 space-y-2 flex-shrink-0 overflow-y-auto">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, phone, NID, email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-7 pl-7 pr-2 text-[11px] bg-gray-50 border border-gray-200 rounded-md outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {/* Tier Filters */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
                        {['ALL', 'Platinum VIP', 'Corporate VIP', 'Gold', 'Regular'].map(tier => (
                            <button
                                key={tier}
                                onClick={() => setSelectedTierFilter(tier)}
                                className={`h-5 px-2 rounded text-[10px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                                    selectedTierFilter === tier
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {tier}
                            </button>
                        ))}
                    </div>

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
                    <div className="space-y-1.5 pt-1">
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

                {/* Right Column: Guest 360 Full Workspace */}
                <div className="flex-1 bg-gray-50 flex flex-col overflow-y-auto p-3.5 space-y-3">
                    {/* Top Identity Hero Card - Ultra Compact */}
                    <div className="bg-white rounded-lg border border-gray-200/90 shadow-2xs px-3 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 shadow-2xs border border-white ring-1 ring-blue-500/20">
                                {parseTitleAndName(activeGuest.name).cleanName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <h2 className="text-[13px] text-gray-900 leading-tight font-bold truncate">
                                        {activeGuest.title} {parseTitleAndName(activeGuest.name).cleanName}
                                    </h2>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium ${
                                        activeGuest.vipTier.includes('Platinum') ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                        activeGuest.vipTier.includes('Corporate') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                        'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                        <Star size={9} className="inline mr-0.5 -mt-0.5" />
                                        {activeGuest.vipTier}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5 font-medium">
                                        <ShieldCheck size={9} /> KYC Verified
                                    </span>
                                </div>

                                <div className="flex items-center gap-2.5 text-[10.5px] text-gray-500 mt-0.5 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Phone size={10} className="text-gray-400" />
                                        <span className="font-mono">{activeGuest.phone}</span>
                                    </span>
                                    {activeGuest.altPhone && (
                                        <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 text-[9.5px] font-mono">
                                            WA: {activeGuest.altPhone}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Mail size={10} className="text-gray-400" />
                                        <span>{activeGuest.email}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin size={10} className="text-gray-400" />
                                        <span>{activeGuest.homeCity}, {activeGuest.homeCountry}</span>
                                    </span>
                                    {activeGuest.emergencyContact && (
                                        <span className="text-rose-700 bg-rose-50 px-1 py-0.2 rounded border border-rose-200 text-[9.5px]">
                                            ICE: {activeGuest.emergencyContact.name} ({activeGuest.emergencyContact.phone})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Lifetime Stats */}
                        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-100 pt-1.5 md:pt-0 md:pl-3 flex-shrink-0">
                            <div className="text-center px-1.5">
                                <span className="text-[9px] text-gray-400 uppercase tracking-tight block">Stays</span>
                                <span className="text-xs font-bold text-gray-900 block">{activeGuest.totalStays}</span>
                            </div>
                            <div className="text-center px-1.5 border-l border-gray-100">
                                <span className="text-[9px] text-gray-400 uppercase tracking-tight block">Nights</span>
                                <span className="text-xs font-bold text-gray-900 block">{activeGuest.totalNights}</span>
                            </div>
                            <div className="text-center px-1.5 border-l border-gray-100">
                                <span className="text-[9px] text-gray-400 uppercase tracking-tight block">Total Spend</span>
                                <span className="text-xs font-bold text-blue-700 font-mono block">৳ {activeGuest.lifetimeSpendBDT.toLocaleString()}</span>
                            </div>
                            <div className="text-center px-1.5 border-l border-gray-100">
                                <span className="text-[9px] text-gray-400 uppercase tracking-tight block">Reward Pts</span>
                                <span className="text-xs font-bold text-emerald-700 font-mono block">{activeGuest.loyaltyPoints}</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="bg-white rounded-lg border border-gray-200 px-3 flex items-center justify-between">
                        <div className="flex">
                            {[
                                { key: 'overview', label: 'Reservations, Stays & Outlet Bills', icon: <Receipt size={12} /> },
                                { key: 'preferences', label: 'Preferences & CRM', icon: <Heart size={12} /> },
                                { key: 'vault', label: 'ID & Verification Vault', icon: <ShieldCheck size={12} /> },
                                { key: 'corporate', label: 'Corporate Profile', icon: <Building2 size={12} /> }
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
                                            <Receipt size={22} className="mx-auto mb-1.5 text-gray-300" />
                                            <p className="text-xs font-semibold text-gray-700">
                                                {activityFilter === 'all'
                                                    ? 'No folio transactions or bookings'
                                                    : `No ${activityFilter === 'reservations' ? 'reservations' : activityFilter === 'checkins' ? 'check-in stays' : 'outlet bills'} recorded`}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                Real room bookings and posted outlet bills will appear here automatically.
                                            </p>
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
                                    <p className="font-mono text-gray-900 text-xs mt-0.5 font-semibold">{activeGuest.idNumber}</p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <span className="text-[9.5px] text-gray-400 uppercase block">Date of Birth & Gender</span>
                                    <p className="text-gray-900 text-xs mt-0.5 font-semibold">
                                        {activeGuest.dob} ({calculateAge(activeGuest.dob)} yrs) • {activeGuest.gender}
                                    </p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <span className="text-[9.5px] text-gray-400 uppercase block">Issuing Authority / Country</span>
                                    <p className="text-gray-900 text-xs mt-0.5 font-semibold">{activeGuest.issuingCountry || activeGuest.nationality}</p>
                                    {activeGuest.idExpiry && (
                                        <span className="text-[9.5px] text-emerald-700 block mt-0.5">Expires: {activeGuest.idExpiry} (Active)</span>
                                    )}
                                </div>
                            </div>

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

                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[10.5px] font-semibold text-gray-700">Nationality</label>
                                                <div className="flex items-center gap-1 text-[9.5px]">
                                                    <span className="text-gray-400">Quick:</span>
                                                    {['Bangladesh', 'India', 'USA', 'UK', 'Canada', 'UAE'].map(nat => (
                                                        <button
                                                            key={nat}
                                                            type="button"
                                                            onClick={() => setNewGuestForm({ ...newGuestForm, nationality: nat === 'USA' ? 'United States' : nat === 'UK' ? 'United Kingdom' : nat })}
                                                            className="text-blue-600 hover:underline cursor-pointer"
                                                        >
                                                            {nat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="e.g. Bangladesh, United States, United Kingdom"
                                                value={newGuestForm.nationality}
                                                onChange={e => setNewGuestForm({ ...newGuestForm, nationality: e.target.value })}
                                                className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">ID Document Type</label>
                                                <select
                                                    value={newGuestForm.idType}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, idType: e.target.value as any })}
                                                    className="w-full h-8 px-2 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                >
                                                    <option value="National ID (NID)">National ID (NID)</option>
                                                    <option value="Passport">Passport</option>
                                                    <option value="Driving License">Driving License</option>
                                                    <option value="Diplomatic ID">Diplomatic ID</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Document Number</label>
                                                <input
                                                    type="text"
                                                    placeholder="NID / Passport No."
                                                    value={newGuestForm.idNumber}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, idNumber: e.target.value })}
                                                    className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs font-mono outline-none focus:bg-white focus:border-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">ID Expiry Date</label>
                                                <input
                                                    type="date"
                                                    value={newGuestForm.idExpiry}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, idExpiry: e.target.value })}
                                                    className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                />
                                            </div>
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
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">City / Town</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Dhaka"
                                                    value={newGuestForm.homeCity}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, homeCity: e.target.value })}
                                                    className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
                                                />
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
                                            <div>
                                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Country of Residence</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Bangladesh"
                                                    value={newGuestForm.homeCountry}
                                                    onChange={e => setNewGuestForm({ ...newGuestForm, homeCountry: e.target.value })}
                                                    className="w-full h-8 px-2.5 bg-gray-50 border border-gray-300 rounded text-xs outline-none focus:bg-white focus:border-blue-500"
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
                                const richLocal = guests.find(lg => lg.id === Number(g.id) || (g.phone && normalizePhone(lg.phone) === normalizePhone(g.phone)));
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
        </div>
    );
};

export default GuestProfile;
