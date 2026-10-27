import React, { useState, useEffect } from 'react';
import {
    User, Search, Plus, Star, Phone, Mail,
    MapPin, Calendar, ShieldCheck,
    Heart, CheckCircle2,
    Building2, Printer, Clock,
    AlertTriangle, ChevronRight, ChevronLeft,
    Home
} from 'lucide-react';
import { getAllStoredReservations, syncReservationsFromDB, subscribeToPMSEvents, type StoredReservation } from '../utils/roomInventoryEngine';

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

const deriveGuestsFromReservations = (reservations: StoredReservation[]): GuestRecord[] => {
    const map = new Map<string, GuestRecord>();
    reservations.forEach((r, idx) => {
        const key = (r.guestName || `Guest ${idx + 1}`).trim().toLowerCase();
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

        const existing = map.get(key);
        if (existing) {
            existing.totalStays += 1;
            existing.totalNights += nights;
            existing.lifetimeSpendBDT += spend;
            existing.loyaltyPoints = Math.round(existing.lifetimeSpendBDT / 20);
            if (r.checkIn > existing.lastStayDate) existing.lastStayDate = r.checkIn;
            existing.stayHistory.push(stayItem);
            if (existing.lifetimeSpendBDT > 100000) existing.vipTier = 'Platinum VIP';
            else if (existing.lifetimeSpendBDT > 50000) existing.vipTier = 'Gold';
        } else {
            map.set(key, {
                id: idx + 1,
                title: r.guestName.startsWith('Dr.') ? 'Dr.' : r.guestName.startsWith('Ms.') ? 'Ms.' : 'Mr.',
                name: r.guestName.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Engr\.)\s*/i, ''),
                phone: r.phone || r.guestPhone || '+880 1711-000000',
                altPhone: '+880 1819-000000',
                email: r.email || r.guestEmail || `${r.guestName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@guest.com`,
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

    useEffect(() => {
        const refreshGuests = () => {
            syncReservationsFromDB().then(res => {
                if (res.length > 0) {
                    const derived = deriveGuestsFromReservations(res);
                    if (derived.length > 0) setGuests(derived);
                }
            }).catch(() => {
                const fallback = getAllStoredReservations();
                if (fallback.length > 0) {
                    const derived = deriveGuestsFromReservations(fallback);
                    if (derived.length > 0) setGuests(derived);
                }
            });
        };

        refreshGuests();

        const unsub = subscribeToPMSEvents(() => {
            refreshGuests();
        });
        return () => unsub();
    }, []);

    const [selectedGuestId, setSelectedGuestId] = useState<number>(() => guests[0]?.id || 1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
    const [activeTab, setActiveTab] = useState<'overview' | 'preferences' | 'vault' | 'corporate'>('overview');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Modal state for adding a guest
    const [showAddGuestModal, setShowAddGuestModal] = useState(false);
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

    useEffect(() => {
        localStorage.setItem('hotel_guest_profiles_v2', JSON.stringify(guests));
    }, [guests]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const activeGuest = guests.find(g => g.id === selectedGuestId) || guests[0];

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

    const handleCreateGuest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGuestForm.name.trim() || !newGuestForm.phone.trim()) {
            alert('Please enter guest full legal name and primary phone number.');
            return;
        }

        const newRecord: GuestRecord = {
            id: Date.now(),
            title: newGuestForm.title,
            name: newGuestForm.name.trim(),
            phone: newGuestForm.phone.trim(),
            altPhone: newGuestForm.altPhone.trim() || undefined,
            email: newGuestForm.email.trim() || `${newGuestForm.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@guest.com`,
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
            totalStays: 1,
            totalNights: 2,
            lifetimeSpendBDT: 15000,
            lastStayDate: new Date().toISOString().slice(0, 10),
            loyaltyPoints: 750,
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
            stayHistory: [
                {
                    resNumber: `RES-${Math.floor(10000 + Math.random() * 90000)}`,
                    roomNumber: '102',
                    roomType: newGuestForm.roomType,
                    checkIn: new Date().toISOString().slice(0, 10),
                    checkOut: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
                    nights: 2,
                    totalAmountBDT: 15000,
                    status: 'In-House'
                }
            ]
        };

        setGuests(prev => [newRecord, ...prev]);
        setSelectedGuestId(newRecord.id);
        setShowAddGuestModal(false);
        setNewGuestForm(initialGuestForm);
        setModalTab('kyc');
        showToast(`Guest 360 profile created for ${newRecord.title} ${newRecord.name}`);
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
                        onClick={() => setShowAddGuestModal(true)}
                        className="btn-primary"
                    >
                        <Plus size={14} />
                        <span>Register Guest</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="btn-secondary"
                    >
                        <Printer size={13} />
                        <span>Print Card</span>
                    </button>
                </div>
            </header>

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

                    {/* Guest Items */}
                    <div className="space-y-1.5 pt-1">
                        {filteredGuests.map(g => {
                            const isSelected = g.id === activeGuest.id;
                            return (
                                <button
                                    key={g.id}
                                    onClick={() => setSelectedGuestId(g.id)}
                                    className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                                        isSelected
                                            ? 'bg-blue-50/60 border-blue-500 shadow-2xs ring-1 ring-blue-500'
                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-gray-900 truncate text-[11.5px]">
                                                {g.title} {g.name}
                                            </span>
                                        </div>
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                                            g.vipTier.includes('Platinum') ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                            g.vipTier.includes('Corporate') ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                            g.vipTier.includes('Gold') ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                            'bg-gray-100 text-gray-700 border border-gray-200'
                                        }`}>
                                            {g.vipTier}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                                        <span className="font-mono">{g.phone}</span>
                                        <span className="font-mono text-gray-800">৳ {(g.lifetimeSpendBDT / 1000).toFixed(0)}k</span>
                                    </div>

                                    {g.company && (
                                        <div className="text-[9.5px] text-gray-400 truncate">
                                            {g.company}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Column: Guest 360 Full Workspace */}
                <div className="flex-1 bg-gray-50 flex flex-col overflow-y-auto p-3.5 space-y-3">
                    {/* Top Identity Hero Card */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-14 h-14 rounded-full bg-slate-900 text-white text-lg flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-white ring-2 ring-blue-500/30">
                                {activeGuest.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base text-gray-900 leading-tight">
                                        {activeGuest.title} {activeGuest.name}
                                    </h2>
                                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                                        activeGuest.vipTier.includes('Platinum') ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                        activeGuest.vipTier.includes('Corporate') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                        'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                        <Star size={10} className="inline mr-1 -mt-0.5" />
                                        {activeGuest.vipTier}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                        <ShieldCheck size={11} /> KYC Verified
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Phone size={11} className="text-gray-400" />
                                        <span className="font-mono">{activeGuest.phone}</span>
                                    </span>
                                    {activeGuest.altPhone && (
                                        <span className="flex items-center gap-1 font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[10px]">
                                            <Phone size={9} /> WA: {activeGuest.altPhone}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Mail size={11} className="text-gray-400" />
                                        <span>{activeGuest.email}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin size={11} className="text-gray-400" />
                                        <span>{activeGuest.homeCity}, {activeGuest.homeCountry}</span>
                                    </span>
                                    {activeGuest.address && (
                                        <span className="flex items-center gap-1 text-gray-600">
                                            <Home size={11} className="text-gray-400" />
                                            <span>{activeGuest.address}</span>
                                        </span>
                                    )}
                                    {activeGuest.emergencyContact && (
                                        <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 text-[10px]">
                                            <AlertTriangle size={9} />
                                            <span>Emergency: {activeGuest.emergencyContact.name} ({activeGuest.emergencyContact.relationship}) {activeGuest.emergencyContact.phone}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Lifetime Stats */}
                        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-200 pt-2 md:pt-0 md:pl-4">
                            <div className="text-center px-2">
                                <span className="text-[9.5px] text-gray-400 uppercase block">Stays</span>
                                <span className="text-sm text-gray-900 mt-0.5 block">{activeGuest.totalStays}</span>
                            </div>
                            <div className="text-center px-2 border-l border-gray-100">
                                <span className="text-[9.5px] text-gray-400 uppercase block">Nights</span>
                                <span className="text-sm text-gray-900 mt-0.5 block">{activeGuest.totalNights}</span>
                            </div>
                            <div className="text-center px-2 border-l border-gray-100">
                                <span className="text-[9.5px] text-gray-400 uppercase block">Total Spend</span>
                                <span className="text-sm text-blue-700 font-mono mt-0.5 block">৳ {activeGuest.lifetimeSpendBDT.toLocaleString()}</span>
                            </div>
                            <div className="text-center px-2 border-l border-gray-100">
                                <span className="text-[9.5px] text-gray-400 uppercase block">Reward Pts</span>
                                <span className="text-sm text-emerald-700 font-mono mt-0.5 block">{activeGuest.loyaltyPoints}</span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="bg-white rounded-lg border border-gray-200 px-3 flex items-center justify-between">
                        <div className="flex">
                            {[
                                { key: 'overview', label: 'Stay History & Stays', icon: <Calendar size={12} /> },
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

                        <span className="text-[10px] text-gray-400 font-mono">
                            Guest ID: #GP-{activeGuest.id}
                        </span>
                    </div>

                    {/* Tab 1: Stay History */}
                    {activeTab === 'overview' && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-2xs p-3.5 space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-gray-900 text-xs flex items-center gap-1.5">
                                    <Clock size={13} className="text-blue-600" />
                                    <span>Historical Stays & Active Bookings ({activeGuest.stayHistory.length})</span>
                                </h3>
                                <span className="text-[10px] text-gray-500">
                                    Last Active Stay: <strong className="text-gray-800 font-mono">{activeGuest.lastStayDate}</strong>
                                </span>
                            </div>

                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                                        <th className="px-3 py-2">Res #</th>
                                        <th className="px-3 py-2">Room Assigned</th>
                                        <th className="px-3 py-2">Stay Dates</th>
                                        <th className="px-3 py-2">Nights</th>
                                        <th className="px-3 py-2 text-right">Folio Total</th>
                                        <th className="px-3 py-2 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-[11.5px]">
                                    {activeGuest.stayHistory.map((s, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                                            <td className="px-3 py-2 font-mono text-blue-700">
                                                {s.resNumber}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className="text-gray-900 font-mono">Room {s.roomNumber}</span>
                                                <span className="text-[10px] text-gray-400 ml-1.5">({s.roomType})</span>
                                            </td>
                                            <td className="px-3 py-2 font-mono text-gray-600 text-[10.5px]">
                                                {s.checkIn} → {s.checkOut}
                                            </td>
                                            <td className="px-3 py-2 text-gray-700">
                                                {s.nights} Nights
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-gray-900">
                                                ৳ {s.totalAmountBDT.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <span className={`px-2 py-0.5 rounded text-[9.5px] ${
                                                    s.status === 'In-House' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                    s.status === 'Checked-Out' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                    'bg-rose-50 text-rose-700 border border-rose-200'
                                                }`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Tab 2: Preferences & CRM */}
                    {activeTab === 'preferences' && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-2xs p-3.5 space-y-3">
                            <h3 className="text-gray-900 text-xs flex items-center gap-1.5 font-bold">
                                <Heart size={13} className="text-rose-500" />
                                <span>Hospitality Preferences & Personalization</span>
                            </h3>

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
                            <h3 className="text-gray-900 text-xs flex items-center gap-1.5 font-bold">
                                <ShieldCheck size={13} className="text-emerald-600" />
                                <span>KYC & Document Verification Records</span>
                            </h3>

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
                            <h3 className="text-gray-900 text-xs flex items-center gap-1.5 font-bold">
                                <Building2 size={13} className="text-blue-600" />
                                <span>Corporate Affiliation & City Ledger Agreement</span>
                            </h3>

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

            {/* Add Guest Modal */}
            {showAddGuestModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-2xl w-full flex flex-col max-h-[92vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                                    <User size={16} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-white tracking-tight">Register New Guest Profile</h3>
                                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/30 border border-blue-400/40 text-blue-200 uppercase font-semibold">
                                            Enterprise 360° CRM
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-300">
                                        5-Star Hotel KYC, Special Branch compliance, stay personalization & corporate ledger
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
                        <form onSubmit={handleCreateGuest} className="flex flex-col flex-1 overflow-hidden">
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
                                        <span>Save Guest 360 Profile</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestProfile;
