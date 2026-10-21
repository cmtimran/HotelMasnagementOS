import React, { useState, useEffect } from 'react';
import {
    User, Search, Plus, Star, Phone, Mail,
    MapPin, Calendar, ShieldCheck,
    Heart, CheckCircle2,
    Building2, Printer, Clock
} from 'lucide-react';

export interface GuestRecord {
    id: number;
    title: 'Mr.' | 'Mrs.' | 'Ms.' | 'Dr.' | 'Prof.';
    name: string;
    phone: string;
    email: string;
    vipTier: 'Regular' | 'Silver' | 'Gold' | 'Platinum VIP' | 'Corporate VIP';
    nationality: string;
    idType: 'National ID (NID)' | 'Passport' | 'Driving License';
    idNumber: string;
    dob: string;
    gender: 'Male' | 'Female' | 'Other';
    homeCity: string;
    homeCountry: string;
    company?: string;
    designation?: string;
    totalStays: number;
    totalNights: number;
    lifetimeSpendBDT: number;
    lastStayDate: string;
    loyaltyPoints: number;
    preferences: {
        roomType: string;
        floorPreference: 'High Floor' | 'Ground Floor' | 'Quiet Corner';
        pillowType: 'Feather / Down' | 'Orthopedic' | 'Hypoallergenic';
        dietary: string;
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

const INITIAL_GUESTS: GuestRecord[] = [
    {
        id: 1,
        title: 'Ms.',
        name: 'Aniya Nusrat',
        phone: '+880 1711-889900',
        email: 'aniya.nusrat@gmail.com',
        vipTier: 'Platinum VIP',
        nationality: 'Bangladesh',
        idType: 'Passport',
        idNumber: 'A04819284',
        dob: '1992-04-18',
        gender: 'Female',
        homeCity: 'Dhaka',
        homeCountry: 'Bangladesh',
        company: 'Standard Chartered Bank Ltd.',
        designation: 'Vice President, Retail Banking',
        totalStays: 8,
        totalNights: 22,
        lifetimeSpendBDT: 245000,
        lastStayDate: '2026-06-25',
        loyaltyPoints: 12450,
        preferences: {
            roomType: 'Deluxe King or Suite',
            floorPreference: 'High Floor',
            pillowType: 'Feather / Down',
            dietary: 'Strictly Halal, lactose-intolerant (Almond milk preferred)',
            newspaper: 'The Daily Star & Financial Times',
            specialNotes: 'VIP guest. Prefers fresh jasmine flowers and late checkout at 14:00.'
        },
        stayHistory: [
            { resNumber: 'RES-009180', roomNumber: '101', roomType: 'Deluxe King', checkIn: '2026-06-25', checkOut: '2026-06-28', nights: 3, totalAmountBDT: 28500, status: 'In-House' },
            { resNumber: 'RES-008442', roomNumber: '201', roomType: 'Executive Suite', checkIn: '2026-04-10', checkOut: '2026-04-14', nights: 4, totalAmountBDT: 48000, status: 'Checked-Out' },
            { resNumber: 'RES-007910', roomNumber: '104', roomType: 'Deluxe King', checkIn: '2026-01-05', checkOut: '2026-01-08', nights: 3, totalAmountBDT: 25500, status: 'Checked-Out' }
        ]
    },
    {
        id: 2,
        title: 'Mr.',
        name: 'Tarek Rahman',
        phone: '+880 1819-223344',
        email: 'trahman@chevron.com',
        vipTier: 'Corporate VIP',
        nationality: 'Bangladesh',
        idType: 'National ID (NID)',
        idNumber: '1984269182391',
        dob: '1984-09-12',
        gender: 'Male',
        homeCity: 'Chittagong',
        homeCountry: 'Bangladesh',
        company: 'Chevron Bangladesh Ltd.',
        designation: 'Operations Director',
        totalStays: 14,
        totalNights: 38,
        lifetimeSpendBDT: 420000,
        lastStayDate: '2026-06-24',
        loyaltyPoints: 21800,
        preferences: {
            roomType: 'Executive Suite',
            floorPreference: 'Quiet Corner',
            pillowType: 'Orthopedic',
            dietary: 'Diabetic sugar-free breakfast options',
            newspaper: 'Prothom Alo & Business Standard',
            specialNotes: 'Direct billing to Chevron corporate account under annual MSA.'
        },
        stayHistory: [
            { resNumber: 'RES-009181', roomNumber: '201', roomType: 'Executive Suite', checkIn: '2026-06-24', checkOut: '2026-06-27', nights: 3, totalAmountBDT: 36000, status: 'In-House' },
            { resNumber: 'RES-008620', roomNumber: '401', roomType: 'Executive Suite', checkIn: '2026-05-12', checkOut: '2026-05-15', nights: 3, totalAmountBDT: 34500, status: 'Checked-Out' }
        ]
    },
    {
        id: 3,
        title: 'Dr.',
        name: 'Shahriar Kabir',
        phone: '+880 1911-334455',
        email: 'skabir@dmc.edu.bd',
        vipTier: 'Gold',
        nationality: 'Bangladesh',
        idType: 'Passport',
        idNumber: 'B0918231',
        dob: '1979-11-03',
        gender: 'Male',
        homeCity: 'Dhaka',
        homeCountry: 'Bangladesh',
        company: 'Dhaka Medical College Hospital',
        designation: 'Professor of Cardiology',
        totalStays: 5,
        totalNights: 11,
        lifetimeSpendBDT: 95000,
        lastStayDate: '2026-06-26',
        loyaltyPoints: 4800,
        preferences: {
            roomType: 'Superior King',
            floorPreference: 'High Floor',
            pillowType: 'Hypoallergenic',
            dietary: 'Low sodium, fresh fruit basket',
            newspaper: 'The Daily Star',
            specialNotes: 'Frequent medical conference guest.'
        },
        stayHistory: [
            { resNumber: 'RES-009182', roomNumber: '305', roomType: 'Superior King', checkIn: '2026-06-26', checkOut: '2026-06-29', nights: 3, totalAmountBDT: 19500, status: 'In-House' }
        ]
    }
];

export const GuestProfile: React.FC = () => {
    const [guests, setGuests] = useState<GuestRecord[]>(() => {
        const saved = localStorage.getItem('hotel_guest_profiles_v2');
        return saved ? JSON.parse(saved) : INITIAL_GUESTS;
    });

    const [selectedGuestId, setSelectedGuestId] = useState<number>(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
    const [activeTab, setActiveTab] = useState<'overview' | 'preferences' | 'vault' | 'corporate'>('overview');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Modal state for adding a guest
    const [showAddGuestModal, setShowAddGuestModal] = useState(false);
    const [newGuestForm, setNewGuestForm] = useState({
        title: 'Mr.' as GuestRecord['title'],
        name: '',
        phone: '',
        email: '',
        nationality: 'Bangladesh',
        idType: 'National ID (NID)' as GuestRecord['idType'],
        idNumber: '',
        vipTier: 'Regular' as GuestRecord['vipTier'],
        company: '',
        designation: '',
        specialNotes: ''
    });

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
        if (!newGuestForm.name || !newGuestForm.phone) {
            alert('Please enter guest name and phone number.');
            return;
        }

        const newRecord: GuestRecord = {
            id: Date.now(),
            title: newGuestForm.title,
            name: newGuestForm.name,
            phone: newGuestForm.phone,
            email: newGuestForm.email || 'guest@hospitality.com',
            vipTier: newGuestForm.vipTier,
            nationality: newGuestForm.nationality,
            idType: newGuestForm.idType,
            idNumber: newGuestForm.idNumber || 'NID-PENDING',
            dob: '1990-01-01',
            gender: 'Male',
            homeCity: 'Dhaka',
            homeCountry: newGuestForm.nationality,
            company: newGuestForm.company,
            designation: newGuestForm.designation,
            totalStays: 1,
            totalNights: 2,
            lifetimeSpendBDT: 15000,
            lastStayDate: new Date().toISOString().slice(0, 10),
            loyaltyPoints: 500,
            preferences: {
                roomType: 'Deluxe King',
                floorPreference: 'High Floor',
                pillowType: 'Feather / Down',
                dietary: 'Standard Halal',
                newspaper: 'The Daily Star',
                specialNotes: newGuestForm.specialNotes || 'New guest profile registered.'
            },
            stayHistory: [
                {
                    resNumber: `RES-${Math.floor(10000 + Math.random() * 90000)}`,
                    roomNumber: '102',
                    roomType: 'Deluxe King',
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
        setNewGuestForm({
            title: 'Mr.',
            name: '',
            phone: '',
            email: '',
            nationality: 'Bangladesh',
            idType: 'National ID (NID)',
            idNumber: '',
            vipTier: 'Regular',
            company: '',
            designation: '',
            specialNotes: ''
        });
        showToast(`Guest profile created for ${newRecord.name}`);
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
            <header className="bg-white border-b border-gray-200 px-3.5 py-2.5 flex items-center justify-between shadow-2xs z-20">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center flex-shrink-0">
                        <User size={18} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold text-gray-900 tracking-tight">
                                Guest Profiles 360 & Loyalty CRM
                            </h1>
                            <span className="px-1.5 py-0.2 text-[9.5px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                                Single Guest View
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-500">
                            Centralized guest history, loyalty club tiers, stay telemetry, preferences, and verified KYC vault.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAddGuestModal(true)}
                        className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                        <Plus size={12} />
                        <span>Register Guest</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="h-7 px-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                        <Printer size={12} />
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
                                            <span className="font-bold text-gray-900 truncate text-[11.5px]">
                                                {g.title} {g.name}
                                            </span>
                                        </div>
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
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
                                        <span className="font-mono font-bold text-gray-800">৳ {(g.lifetimeSpendBDT / 1000).toFixed(0)}k</span>
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
                            <div className="w-14 h-14 rounded-full bg-slate-900 text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-white ring-2 ring-blue-500/30">
                                {activeGuest.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-gray-900 leading-tight">
                                        {activeGuest.title} {activeGuest.name}
                                    </h2>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        activeGuest.vipTier.includes('Platinum') ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                        activeGuest.vipTier.includes('Corporate') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                        'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                        <Star size={10} className="inline mr-1 -mt-0.5" />
                                        {activeGuest.vipTier}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                        <ShieldCheck size={11} /> KYC Verified
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 text-[11px] text-gray-500 mt-1 flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <Phone size={11} className="text-gray-400" />
                                        <span className="font-mono">{activeGuest.phone}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Mail size={11} className="text-gray-400" />
                                        <span>{activeGuest.email}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MapPin size={11} className="text-gray-400" />
                                        <span>{activeGuest.homeCity}, {activeGuest.homeCountry}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Top Lifetime Stats */}
                        <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-200 pt-2 md:pt-0 md:pl-4">
                            <div className="text-center px-2">
                                <span className="text-[9.5px] font-bold text-gray-400 uppercase block">Stays</span>
                                <span className="text-sm font-bold text-gray-900 mt-0.5 block">{activeGuest.totalStays}</span>
                            </div>
                            <div className="text-center px-2 border-l border-gray-100">
                                <span className="text-[9.5px] font-bold text-gray-400 uppercase block">Nights</span>
                                <span className="text-sm font-bold text-gray-900 mt-0.5 block">{activeGuest.totalNights}</span>
                            </div>
                            <div className="text-center px-2 border-l border-gray-100">
                                <span className="text-[9.5px] font-bold text-gray-400 uppercase block">Total Spend</span>
                                <span className="text-sm font-bold text-blue-700 font-mono mt-0.5 block">৳ {activeGuest.lifetimeSpendBDT.toLocaleString()}</span>
                            </div>
                            <div className="text-center px-2 border-l border-gray-100">
                                <span className="text-[9.5px] font-bold text-gray-400 uppercase block">Reward Pts</span>
                                <span className="text-sm font-bold text-emerald-700 font-mono mt-0.5 block">{activeGuest.loyaltyPoints}</span>
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
                                <h3 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                    <Clock size={13} className="text-blue-600" />
                                    <span>Historical Stays & Active Bookings ({activeGuest.stayHistory.length})</span>
                                </h3>
                                <span className="text-[10px] text-gray-500">
                                    Last Active Stay: <strong className="text-gray-800 font-mono">{activeGuest.lastStayDate}</strong>
                                </span>
                            </div>

                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
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
                                            <td className="px-3 py-2 font-mono font-bold text-blue-700">
                                                {s.resNumber}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className="font-bold text-gray-900 font-mono">Room {s.roomNumber}</span>
                                                <span className="text-[10px] text-gray-400 ml-1.5">({s.roomType})</span>
                                            </td>
                                            <td className="px-3 py-2 font-mono text-gray-600 text-[10.5px]">
                                                {s.checkIn} → {s.checkOut}
                                            </td>
                                            <td className="px-3 py-2 text-gray-700">
                                                {s.nights} Nights
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">
                                                ৳ {s.totalAmountBDT.toLocaleString()}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
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
                            <h3 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                <Heart size={13} className="text-rose-500" />
                                <span>Hospitality Preferences & Personalization</span>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] font-bold text-gray-400 uppercase">Preferred Room Type & Location</span>
                                    <p className="font-bold text-gray-900">{activeGuest.preferences.roomType}</p>
                                    <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9.5px] font-semibold">
                                        {activeGuest.preferences.floorPreference}
                                    </span>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] font-bold text-gray-400 uppercase">Pillow & Bedding Preference</span>
                                    <p className="font-bold text-gray-900">{activeGuest.preferences.pillowType}</p>
                                    <p className="text-[10px] text-gray-400">Housekeeping auto-provisions on check-in</p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] font-bold text-gray-400 uppercase">Dietary Requirements & Allergens</span>
                                    <p className="font-bold text-gray-900">{activeGuest.preferences.dietary}</p>
                                    <p className="text-[10px] text-gray-400">Notified to Executive Chef & Room Service</p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] font-bold text-gray-400 uppercase">Morning Newspaper Subscription</span>
                                    <p className="font-bold text-gray-900">{activeGuest.preferences.newspaper}</p>
                                    <p className="text-[10px] text-gray-400">Delivered to door at 06:30 AM</p>
                                </div>
                            </div>

                            <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200">
                                <span className="text-[9.5px] font-bold text-blue-800 uppercase block mb-1">General Manager & Concierge Notes</span>
                                <p className="text-gray-800 italic leading-relaxed text-[11px]">
                                    "{activeGuest.preferences.specialNotes}"
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: ID & Verification Vault */}
                    {activeTab === 'vault' && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-2xs p-3.5 space-y-3">
                            <h3 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                <ShieldCheck size={13} className="text-emerald-600" />
                                <span>KYC & Document Verification Records</span>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <span className="text-[9.5px] font-bold text-gray-400 uppercase block">Document Type</span>
                                    <p className="font-bold text-gray-900 text-xs mt-0.5">{activeGuest.idType}</p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <span className="text-[9.5px] font-bold text-gray-400 uppercase block">Document Number</span>
                                    <p className="font-bold font-mono text-gray-900 text-xs mt-0.5">{activeGuest.idNumber}</p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <span className="text-[9.5px] font-bold text-gray-400 uppercase block">Issuing Country / Authority</span>
                                    <p className="font-bold text-gray-900 text-xs mt-0.5">{activeGuest.nationality}</p>
                                </div>
                            </div>

                            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 size={16} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-emerald-900 text-xs">SB Police Verification & Foreigner Registration Clearance</h4>
                                    <p className="text-[10.5px] text-emerald-700 mt-0.5">
                                        Identity verified against National Database on initial check-in. Fully compliant with Special Branch hotel ledger requirements.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Corporate Profile */}
                    {activeTab === 'corporate' && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-2xs p-3.5 space-y-3">
                            <h3 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                                <Building2 size={13} className="text-blue-600" />
                                <span>Corporate Affiliation & City Ledger Agreement</span>
                            </h3>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] font-bold text-gray-400 uppercase">Affiliated Company</span>
                                    <p className="font-bold text-gray-900 text-xs">{activeGuest.company || 'Not affiliated with a corporate account'}</p>
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-1">
                                    <span className="text-[9.5px] font-bold text-gray-400 uppercase">Designation</span>
                                    <p className="font-bold text-gray-900 text-xs">{activeGuest.designation || 'Individual Traveler'}</p>
                                </div>
                            </div>

                            <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 space-y-1">
                                <span className="text-[9.5px] font-bold text-blue-800 uppercase">Billing Instruction & Direct City Ledger</span>
                                <p className="text-[11px] text-blue-900 leading-relaxed">
                                    Authorized for Direct Billing under Master Services Agreement (MSA #CORP-2026-99). Room and laundry billable to company account; all personal incidentals to be settled at checkout.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Guest Modal */}
            {showAddGuestModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-lg w-full p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                            <h3 className="text-sm font-bold text-gray-900">Register New Guest Profile</h3>
                            <button onClick={() => setShowAddGuestModal(false)} className="text-gray-400 hover:text-gray-700">✕</button>
                        </div>

                        <form onSubmit={handleCreateGuest} className="space-y-2.5">
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Title</label>
                                    <select
                                        value={newGuestForm.title}
                                        onChange={e => setNewGuestForm({ ...newGuestForm, title: e.target.value as any })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                    >
                                        <option>Mr.</option>
                                        <option>Mrs.</option>
                                        <option>Ms.</option>
                                        <option>Dr.</option>
                                        <option>Prof.</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Full Legal Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Aniya Nusrat"
                                        value={newGuestForm.name}
                                        onChange={e => setNewGuestForm({ ...newGuestForm, name: e.target.value })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Mobile Phone</label>
                                    <input
                                        type="tel"
                                        placeholder="+880 1711-XXXXXX"
                                        value={newGuestForm.phone}
                                        onChange={e => setNewGuestForm({ ...newGuestForm, phone: e.target.value })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="guest@domain.com"
                                        value={newGuestForm.email}
                                        onChange={e => setNewGuestForm({ ...newGuestForm, email: e.target.value })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">ID Document Type</label>
                                    <select
                                        value={newGuestForm.idType}
                                        onChange={e => setNewGuestForm({ ...newGuestForm, idType: e.target.value as any })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                    >
                                        <option value="National ID (NID)">National ID (NID)</option>
                                        <option value="Passport">Passport</option>
                                        <option value="Driving License">Driving License</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">ID / Passport Number</label>
                                    <input
                                        type="text"
                                        placeholder="Document number"
                                        value={newGuestForm.idNumber}
                                        onChange={e => setNewGuestForm({ ...newGuestForm, idNumber: e.target.value })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">VIP Tier</label>
                                    <select
                                        value={newGuestForm.vipTier}
                                        onChange={e => setNewGuestForm({ ...newGuestForm, vipTier: e.target.value as any })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                    >
                                        <option value="Regular">Regular Guest</option>
                                        <option value="Silver">Silver Member</option>
                                        <option value="Gold">Gold VIP</option>
                                        <option value="Platinum VIP">Platinum VIP</option>
                                        <option value="Corporate VIP">Corporate VIP</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Corporate Affiliation</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Standard Chartered, Chevron"
                                        value={newGuestForm.company}
                                        onChange={e => setNewGuestForm({ ...newGuestForm, company: e.target.value })}
                                        className="w-full h-7 px-2 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10.5px] font-semibold text-gray-700 mb-1">Special Preferences / Notes</label>
                                <textarea
                                    placeholder="Guest preferences, allergies, VIP requirements..."
                                    value={newGuestForm.specialNotes}
                                    onChange={e => setNewGuestForm({ ...newGuestForm, specialNotes: e.target.value })}
                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs outline-none focus:border-blue-500"
                                    rows={2}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowAddGuestModal(false)}
                                    className="h-7 px-3 border border-gray-300 rounded text-xs font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
                                >
                                    Save Guest 360 Profile
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestProfile;
