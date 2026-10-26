import React, { useState, useEffect, useRef } from 'react';
import {
    Building2, MapPin, Globe, CreditCard, Star, Clock, Moon, Monitor,
    User, Edit2, Copy, Mail, ShieldCheck, Phone, CheckCircle2, AlertCircle,
    Layers, Check, QrCode, Utensils, ShieldAlert,
    ExternalLink, Activity, Lock, FileCheck, Compass, Zap,
    ChevronLeft, ChevronRight, Receipt, Database, Briefcase
} from 'lucide-react';
import SendEmailModal from './SendEmailModal';
import { getAllStoredReservations } from '../utils/roomInventoryEngine';
import { useProperty } from '../context/PropertyContext';
import {
    getDefaultUnifiedSettings,
    type BankAccount,
    type PosOutlet,
    type PocContact,
    type EmergencyLine
} from './AddProperty';

interface HotelInfoViewProps {
    property?: any;
    currentUser?: any;
    onManageProperty?: (initialTab?: string) => void;
}

const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
    { id: '1', bankName: 'Standard Chartered Bank', accountName: 'Grand Hospitality Operations', accountNum: '01-8849201-01', swift: 'SCBLBDDX' },
    { id: '2', bankName: 'Eastern Bank PLC', accountName: 'Grand Hospitality Corporate', accountNum: '104-120-94819', swift: 'EBLBBDDH' }
];

const DEFAULT_OUTLETS: PosOutlet[] = [
    { id: '1', name: 'The Palm Court', type: 'All-Day Dining Restaurant', hours: '06:30 AM - 11:00 PM', capacity: '140 Seats', posStation: 'Main Kitchen KOT-1', status: 'Active' },
    { id: '2', name: 'Horizon Lounge', type: 'Rooftop Lounge & Cafe', hours: '04:00 PM - 12:00 AM', capacity: '85 Seats', posStation: 'Bar & Grill KOT-2', status: 'Active' },
    { id: '3', name: 'Grand Royal Ballroom', type: 'Banquet & Convention Hall', hours: 'By Event Schedule', capacity: '450 Guests', posStation: 'Banquet POS', status: 'Active' },
    { id: '4', name: 'Azure Wellness Spa', type: 'Spa & Health Club', hours: '08:00 AM - 09:00 PM', capacity: '8 Suites', posStation: 'Spa Desk POS', status: 'Active' }
];

const DEFAULT_CONTACTS: PocContact[] = [
    { id: '1', role: 'General Manager', name: 'John Smith', phone: '+880 1711 000001', email: 'gm@grandhospitality.com' },
    { id: '2', role: 'Front Office Manager', name: 'Alice Walker', phone: '+880 1711 000002', email: 'fom@grandhospitality.com' },
    { id: '3', role: 'Executive Housekeeper', name: 'David Miller', phone: '+880 1711 000003', email: 'hk@grandhospitality.com' },
    { id: '4', role: 'Financial Controller', name: 'Sarah Jenkins', phone: '+880 1711 000004', email: 'fc@grandhospitality.com' }
];

const DEFAULT_EMERGENCY: EmergencyLine[] = [
    { id: '1', label: 'House Doctor (24/7)', name: 'Dr. S. K. Roy (Ext 991)', phone: '+880 1711 999111' },
    { id: '2', label: 'Hospital Emergency', name: 'United Hospital ER', phone: '+880 2 8836000' },
    { id: '3', label: 'Police Control Room', name: 'Duty Officer', phone: '+880 2 9885566' },
    { id: '4', label: 'Fire & Rescue', name: 'Fire Service Control / 999', phone: '+880 2 9898999' }
];

const DEFAULT_AMENITIES: Record<string, boolean> = {
    'Free Wi-Fi': true,
    'Valet Parking': true,
    'Swimming Pool': true,
    'Fitness Center': true,
    'Luxury Spa': true,
    'Fine Dining': true,
    'Rooftop Lounge': true,
    '24/7 Room Service': true,
    'Banquet Hall': true,
    'Airport Shuttle': true,
    'EV Charging': true,
    'Wheelchair Access': true
};

const HotelInfoView: React.FC<HotelInfoViewProps> = ({ property, currentUser, onManageProperty }) => {
    const { activeProperty } = useProperty();
    const targetProperty = property?.raw || property || activeProperty;

    const [activeTab, setActiveTab] = useState('overview');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [localTime, setLocalTime] = useState<string>('');
    const tabsRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // Hydrate unified settings for this property
    const [settings, setSettings] = useState(() => getDefaultUnifiedSettings(targetProperty));
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(DEFAULT_BANK_ACCOUNTS);
    const [posOutlets, setPosOutlets] = useState<PosOutlet[]>(DEFAULT_OUTLETS);
    const [contacts, setContacts] = useState<PocContact[]>(DEFAULT_CONTACTS);
    const [emergencyLines, setEmergencyLines] = useState<EmergencyLine[]>(DEFAULT_EMERGENCY);
    const [amenities, setAmenities] = useState<Record<string, boolean>>(DEFAULT_AMENITIES);

    useEffect(() => {
        const p = property?.raw || property || activeProperty;
        try {
            const savedRaw = localStorage.getItem(`hotel_unified_settings_prop_${p?.id || 1}`);
            if (savedRaw) {
                const parsed = JSON.parse(savedRaw);
                if (parsed.settings) {
                    setSettings({
                        ...getDefaultUnifiedSettings(p),
                        ...parsed.settings,
                        baseCurrency: p?.currency || parsed.settings.baseCurrency || 'BDT',
                        checkInTime: p?.check_in_time || parsed.settings.checkInTime || '14:00',
                        checkOutTime: p?.check_out_time || parsed.settings.checkOutTime || '12:00'
                    });
                }
                if (Array.isArray(parsed.bankAccounts)) setBankAccounts(parsed.bankAccounts);
                if (Array.isArray(parsed.posOutlets)) setPosOutlets(parsed.posOutlets);
                if (Array.isArray(parsed.contacts)) setContacts(parsed.contacts);
                if (Array.isArray(parsed.emergencyLines)) setEmergencyLines(parsed.emergencyLines);
                if (parsed.amenities) setAmenities(parsed.amenities);
            } else {
                setSettings(getDefaultUnifiedSettings(p));
            }
        } catch {
            setSettings(getDefaultUnifiedSettings(p));
        }
    }, [activeProperty, property]);

    const propName = targetProperty?.name || 'Grand Palace Dhaka (Main Tower)';
    const propCode = targetProperty?.code || 'GPD';
    const propGrade = targetProperty?.star_rating
        ? `${targetProperty.star_rating} Star`
        : (targetProperty?.grade || '5 Star');
    const propRooms = Number(targetProperty?.total_rooms ?? targetProperty?.rooms ?? 34);
    const propCity = targetProperty?.city || 'Dhaka';
    const propCountry = targetProperty?.country || 'Bangladesh';
    const propAddress = targetProperty?.address || 'Plot 12, Road 45, Gulshan-2, Dhaka';
    const propPhone = targetProperty?.phone || '+880 2 9882200';
    const propEmail = targetProperty?.email || 'dhaka@grandhospitality.com';

    // Check tab bar overflow and scroll boundaries
    const checkScroll = () => {
        if (tabsRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
            setCanScrollLeft(scrollLeft > 4);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, []);

    const scrollTabs = (direction: 'left' | 'right') => {
        if (tabsRef.current) {
            const scrollAmount = direction === 'left' ? -180 : 180;
            tabsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            setTimeout(checkScroll, 250);
        }
    };

    // Real-time Hotel Property Clock
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setLocalTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Standard Hospitality Tabs (Merged Hotel Profile + General Settings)
    const tabs = [
        { id: 'overview', manageTab: 'identity', label: 'Overview', icon: Building2 },
        { id: 'operations', manageTab: 'operations', label: 'Operations', icon: Clock },
        { id: 'policies', manageTab: 'operations', label: 'Policies', icon: ShieldCheck },
        { id: 'finance', manageTab: 'finance', label: 'Finance & Tax', icon: CreditCard },
        { id: 'numbering', manageTab: 'numbering', label: 'Folio & Numbering', icon: Receipt },
        { id: 'outlets', manageTab: 'system', label: 'Outlets & POS', icon: Layers },
        { id: 'distribution', manageTab: 'system', label: 'Channels & GDS', icon: Globe },
        { id: 'automation', manageTab: 'communication', label: 'Email & Backup', icon: Monitor },
        { id: 'team', manageTab: 'branding', label: 'Contacts & Safety', icon: User },
    ];

    const handleCopyInfo = () => {
        const text = `Property: ${propName} (${propCode})\nAddress: ${propAddress}, ${propCity}, ${propCountry}\nContact: ${propPhone} | ${propEmail}\nWebsite: ${settings.website}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Live Financial Transactions derived from Reservations
    const transactions = getAllStoredReservations().slice(0, 5).map((r, idx) => ({
        id: r.id || `TXN-00${idx + 1}`,
        date: r.checkIn || new Date().toISOString().slice(0, 10),
        desc: `Folio Settlement - ${r.guestName} (${r.roomType})`,
        amount: Number(r.totalRate) || 0,
        type: r.status === 'CANCELLED' ? 'debit' : 'credit',
        status: r.status === 'CONFIRMED' ? 'Pending' : 'Completed'
    }));

    const distributionChannels = [
        { name: 'Booking.com Direct XML', code: 'OTA-BC-991', syncStatus: '2-Way Live Sync', ping: '120ms', status: 'Connected' },
        { name: 'Agoda YCS API v4', code: 'OTA-AG-442', syncStatus: '2-Way Live Sync', ping: '95ms', status: 'Connected' },
        { name: 'Expedia Partner Central', code: 'OTA-EXP-109', syncStatus: '2-Way Live Sync', ping: '140ms', status: 'Connected' },
        { name: 'Airbnb Hospitality Sync', code: 'OTA-AB-772', syncStatus: 'Calendar Sync', ping: '210ms', status: 'Connected' },
        { name: 'Google Hotel Ads', code: 'META-GHA-01', syncStatus: 'Live Rate Feed', ping: '45ms', status: 'Connected' }
    ];

    const activeAmenities = Object.entries(amenities)
        .filter(([, isEnabled]) => isEnabled)
        .map(([name]) => name);

    const currentTabObj = tabs.find(t => t.id === activeTab) || tabs[0];

    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans text-gray-800">
            {/* Consistent Property Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="size-11 sm:size-12 rounded-2xl bg-primary-subtle border border-primary-border flex items-center justify-center text-primary font-bold text-sm shadow-2xs shrink-0 overflow-hidden">
                            {settings.logoUrl ? (
                                <img
                                    src={settings.logoUrl}
                                    alt={propName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span>{propName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'GH'}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                                    {propName}
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                    <Star size={10} fill="currentColor" />
                                    <span>{propGrade}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-primary border border-blue-200 shrink-0 font-mono">
                                    {propCode}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                                <span className="flex items-center gap-1">
                                    <MapPin size={12} className="text-slate-400" />
                                    <span>{propAddress}, {propCity}, {propCountry}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Globe size={12} className="text-slate-400" />
                                    <a
                                        href={settings.website.startsWith('http') ? settings.website : `https://${settings.website}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary hover:underline"
                                    >
                                        {settings.website}
                                    </a>
                                </span>
                                <span className="hidden md:flex items-center gap-1">
                                    <Phone size={12} className="text-slate-400" />
                                    <span>{propPhone}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Side Controls & Live Timezone Clock */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <div className="hidden xl:flex flex-col items-end mr-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200/70">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                Property Time ({settings.timezone.split(' ')[0]})
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-800">{localTime}</span>
                        </div>

                        <button
                            type="button"
                            onClick={handleCopyInfo}
                            className="btn-secondary"
                            title="Copy Property Details"
                        >
                            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-slate-400" />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsEmailModalOpen(true)}
                            className="btn-secondary"
                        >
                            <Mail size={12} className="text-slate-400" />
                            <span>Email</span>
                        </button>

                        {onManageProperty && (
                            <button
                                type="button"
                                onClick={() => onManageProperty(currentTabObj.manageTab)}
                                className="btn-primary"
                            >
                                <Edit2 size={12} />
                                <span>Manage Property</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Scrollable Tab Bar with Left & Right Navigation Arrows */}
                <div className="relative bg-slate-50/70 flex items-center">
                    {canScrollLeft && (
                        <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-slate-50 via-slate-50 to-transparent pl-1 pr-3">
                            <button
                                type="button"
                                onClick={() => scrollTabs('left')}
                                className="w-5 h-5 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 cursor-pointer transition-colors"
                                aria-label="Scroll tabs left"
                            >
                                <ChevronLeft size={13} />
                            </button>
                        </div>
                    )}

                    <div
                        ref={tabsRef}
                        onScroll={checkScroll}
                        className="px-3 flex items-center gap-0.5 overflow-x-auto scrollbar-none w-full"
                    >
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isSelected = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                                        isSelected
                                            ? 'border-blue-600 text-blue-600 bg-white'
                                            : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/60'
                                    }`}
                                >
                                    <Icon size={13} className={isSelected ? 'text-blue-600' : 'text-gray-400'} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {canScrollRight && (
                        <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-l from-slate-50 via-slate-50 to-transparent pr-1 pl-3">
                            <button
                                type="button"
                                onClick={() => scrollTabs('right')}
                                className="w-5 h-5 rounded-full bg-white shadow-xs border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 cursor-pointer transition-colors"
                                aria-label="Scroll tabs right"
                            >
                                <ChevronRight size={13} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Consistent Main Content Container */}
            <div className="bg-white rounded-xl shadow-2xs border border-gray-200/90 p-3.5 sm:p-4">
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-3.5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Left Column: Property, Regional & Corporate Info */}
                            <div className="space-y-3.5">
                                <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <Building2 size={12} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Property & Regional Details</span>
                                        </div>
                                        <span className="text-[10.5px] font-semibold text-blue-600">Est. {settings.establishedYear}</span>
                                    </div>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                            <span className="text-gray-500 font-medium">Company / Legal Name</span>
                                            <span className="font-semibold text-gray-900 text-right">{settings.legalEntity}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                            <span className="text-gray-500 font-medium">Street Address</span>
                                            <span className="font-semibold text-gray-900 text-right">{propAddress}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                            <span className="text-gray-500 font-medium">City, Division & Country</span>
                                            <span className="font-semibold text-gray-900">{propCity}, {settings.stateProvince}, {propCountry}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                            <span className="text-gray-500 font-medium">Time Zone & Date Format</span>
                                            <span className="font-semibold text-gray-900">{settings.timezone} • {settings.dateFormat}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                            <span className="text-gray-500 font-medium">Fiscal Year & Language</span>
                                            <span className="font-semibold text-gray-900">{settings.fiscalYearStart} • {settings.primaryLanguage}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1">
                                            <span className="text-gray-500 font-medium">Base Currency</span>
                                            <span className="font-semibold text-gray-900">{settings.baseCurrency === 'BDT' ? 'BDT (৳) - Bangladeshi Taka' : settings.baseCurrency}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Location & Landmarks */}
                                <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <Compass size={12} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Location & Nearby Landmarks</span>
                                        </div>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${settings.latitude},${settings.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <span>Open Maps</span>
                                            <ExternalLink size={10} />
                                        </a>
                                    </div>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                            <span className="text-gray-500 font-medium">GPS Coordinates</span>
                                            <span className="font-mono font-semibold text-gray-800">{settings.latitude}° N, {settings.longitude}° E</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                            <span className="text-gray-500 font-medium">Nearest Airport</span>
                                            <span className="font-semibold text-gray-800">{settings.airportProximity}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                            <span className="text-gray-500 font-medium">Railway / Transit Hub</span>
                                            <span className="font-semibold text-gray-800">{settings.stationProximity}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1">
                                            <span className="text-gray-500 font-medium">Business / Tourist District</span>
                                            <span className="font-semibold text-emerald-700">{settings.diplomaticProximity}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Corporate Head Office */}
                                <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200/60">
                                        <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Globe size={12} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Corporate Head Office</span>
                                    </div>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center gap-2 py-1 border-b border-gray-100 text-gray-700">
                                            <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                                            <span className="font-medium">{settings.corporateAddress}</span>
                                        </div>
                                        <div className="flex items-center gap-2 py-1 border-b border-gray-100 text-gray-700">
                                            <Mail size={12} className="text-gray-400 flex-shrink-0" />
                                            <span className="font-medium">{settings.corporateEmail}</span>
                                        </div>
                                        <div className="flex items-center gap-2 py-1 text-gray-700">
                                            <Phone size={12} className="text-gray-400 flex-shrink-0" />
                                            <span className="font-medium">{settings.corporatePhone}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Key Stats, Booking Engine & Amenities */}
                            <div className="space-y-3.5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                        <div className="flex items-center justify-between text-blue-600 mb-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Rooms</span>
                                            <Layers size={13} />
                                        </div>
                                        <p className="text-xl font-bold text-gray-900 leading-tight">{propRooms} Rooms</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Active Room Inventory</p>
                                    </div>

                                    <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                        <div className="flex items-center justify-between text-amber-500 mb-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Star Rating</span>
                                            <Star size={13} fill="currentColor" />
                                        </div>
                                        <p className="text-xl font-bold text-gray-900 leading-tight">{propGrade}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Hotel Classification</p>
                                    </div>
                                </div>

                                {/* Direct Booking Engine */}
                                <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 rounded-lg p-3 border border-blue-200/70 flex items-center justify-between gap-2">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs uppercase tracking-wider">
                                            <QrCode size={13} />
                                            <span>Direct Booking Engine & Web Check-In</span>
                                        </div>
                                        <p className="text-xs text-blue-900 font-semibold truncate">{settings.bookingEngineUrl}</p>
                                        <p className="text-[10px] text-blue-600">Direct reservations & mobile guest check-in enabled</p>
                                    </div>
                                    <span className="px-2.5 py-1 bg-white text-blue-700 rounded-md text-[10px] font-bold border border-blue-200 shadow-2xs shrink-0">
                                        ONLINE
                                    </span>
                                </div>

                                {/* Property Description */}
                                <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200/60">
                                        <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Building2 size={12} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Property Description</span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        {settings.description}
                                    </p>
                                </div>

                                {/* Hotel Amenities */}
                                <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200/60">
                                        <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <CheckCircle2 size={12} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Hotel Amenities & Services</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeAmenities.map((feat) => (
                                            <span key={feat} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px] font-medium text-gray-700 shadow-2xs">
                                                {feat}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Logged-In User Session */}
                                <div className="bg-blue-50/60 rounded-lg p-3 border border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                            {currentUser?.name?.charAt(0) || 'A'}
                                        </div>
                                        <div>
                                            <p className="text-[9.5px] text-blue-600 uppercase font-bold tracking-wider leading-none">Logged-In Staff</p>
                                            <p className="font-bold text-gray-900 text-xs mt-0.5 leading-tight">{currentUser?.name || 'Administrator'}</p>
                                            <p className="text-[10.5px] text-gray-500 leading-none">{currentUser?.role || 'General Manager'}</p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-emerald-700 rounded-md text-[10px] font-semibold border border-emerald-200/60 shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Active Session
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. OPERATIONS TAB */}
                {activeTab === 'operations' && (
                    <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                <div className="flex items-center justify-between text-blue-600 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Check-In Time</span>
                                    <Clock size={13} />
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono leading-tight">{settings.checkInTime}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Standard Guest Arrival</p>
                            </div>

                            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                <div className="flex items-center justify-between text-amber-600 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Check-Out Time</span>
                                    <Clock size={13} />
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono leading-tight">{settings.checkOutTime}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Standard Guest Departure</p>
                            </div>

                            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                <div className="flex items-center justify-between text-rose-600 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Hold Release Cutoff</span>
                                    <Clock size={13} />
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono leading-tight">{settings.autoReleaseHour}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Non-Guaranteed Booking Release</p>
                            </div>

                            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                <div className="flex items-center justify-between text-purple-600 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Night Audit Time</span>
                                    <Moon size={13} />
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono leading-tight">{settings.nightAuditTime}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Daily Business Date Rollover</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <ShieldCheck size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Front Office & Night Audit</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Auto-Post Room & Tax Charges</span>
                                        <span className="font-semibold text-emerald-700">{settings.autoPostRoomCharges ? 'Enabled' : 'Manual'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Auto-Advance Business Date</span>
                                        <span className="font-semibold text-emerald-700">{settings.autoAdvanceBusinessDate ? 'Enabled' : 'Manual'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Weekend Tariff Days</span>
                                        <div className="flex gap-1">
                                            {settings.weekends.map((d: string) => (
                                                <span key={d} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-semibold text-gray-700">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500 font-medium">Door Lock System</span>
                                        <span className="font-semibold text-blue-600 flex items-center gap-1">
                                            <Lock size={11} />
                                            <span>{settings.keyCardSystem}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <AlertCircle size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">House Rules & Meal Sync</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Smoking Policy</span>
                                        <span className="font-semibold text-gray-900 text-right">{settings.smokingPolicyText}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Pet Policy</span>
                                        <span className="font-semibold text-gray-900">{settings.petPolicyText}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Visitor Policy</span>
                                        <span className="font-semibold text-gray-900">{settings.visitorIdentityRule}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500 font-medium">Meal Plan Synchronization</span>
                                        <span className="font-semibold text-gray-900">{settings.mealPlanSyncMode}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. POLICIES TAB */}
                {activeTab === 'policies' && (
                    <div className="space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <ShieldCheck size={12} />
                                </div>
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Hotel Policies & Reservation Rules</span>
                            </div>
                            {onManageProperty && (
                                <button
                                    type="button"
                                    onClick={() => onManageProperty('operations')}
                                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <Edit2 size={11} />
                                    <span>Edit Policies</span>
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* Cancellation & No-Show */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-rose-600 pb-1 border-b border-slate-200/60">
                                    <Clock size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Cancellation & No-Show</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Cancellation Policy</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{settings.cancellationRule}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Grace Period</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{settings.gracePeriodHours} Hours after standard cutoff</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">No-Show Charge</span>
                                        <p className="font-bold text-rose-600 text-[11.5px]">{settings.noShowPolicy}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Corporate & Travel Agencies */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-blue-600 pb-1 border-b border-slate-200/60">
                                    <Briefcase size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Corporate & Travel Agencies</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">City Ledger Credit Limit</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">৳ {Number(settings.cityLedgerLimitBDT).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Travel Agency Commission</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{settings.agencyCommissionPct}% Standard Commission</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Direct Bill (BTC) Settlement</span>
                                        <p className="font-semibold text-emerald-700 text-[11.5px]">{settings.allowBillToCompany ? 'Allowed for Approved Corporates' : 'Prepayment Only'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Early Check-In & Late Check-Out */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-emerald-600 pb-1 border-b border-slate-200/60">
                                    <Moon size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Check-In & Check-Out Rules</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Early Arrival (06:00 - 10:00 AM)</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{settings.earlyCheckin6To10}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Early Arrival (10:00 AM - 01:00 PM)</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{settings.earlyCheckin10To13}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Early Departure Penalty</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{settings.earlyDeparturePenalty}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Guest Age & Children Rules */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-purple-600 pb-1 border-b border-slate-200/60">
                                    <User size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Guest Age & Child Policy</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Minimum Check-In Age</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">Primary guest must be {settings.minPrimaryGuestAge}+ years</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Child Policy (Under {settings.childAgeThreshold} Yrs)</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{settings.childStayPolicy}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Group Reservations & Inventory */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-amber-600 pb-1 border-b border-slate-200/60">
                                    <Building2 size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Group Bookings & Overbooking</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Group Threshold</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{settings.groupDefinitionRooms} or more rooms per booking</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Group Deposit Terms</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{settings.groupDepositTerms}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Overbooking Protection</span>
                                        <p className="font-semibold text-emerald-700 text-[11.5px]">
                                            {settings.allowOverbooking ? `Allowed up to ${settings.overbookingLimit}` : 'Strict Zero Overbooking (0%)'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Security Deposit & Cashier */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-indigo-600 pb-1 border-b border-slate-200/60">
                                    <CreditCard size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Deposits & Cashier Controls</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Security Deposit</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">
                                            ৳ {Number(settings.securityDepositAmountBDT).toLocaleString()} ({settings.securityDepositLogic})
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Cashier Rebate Limit</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">৳ {Number(settings.staffAdjustmentLimitBDT).toLocaleString()} per shift</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. FINANCE & TAX TAB */}
                {activeTab === 'finance' && (
                    <div className="space-y-3.5">
                        {/* Statutory Licenses & Government Certifications */}
                        <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <FileCheck size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Statutory Licenses & Government Certificates</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    VERIFIED
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                                <div className="p-2.5 bg-white border border-gray-200/80 rounded-lg">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Trade License</span>
                                    <span className="font-mono font-bold text-gray-800 text-xs">{settings.tradeLicenseNo}</span>
                                    <span className="text-[9.5px] text-emerald-600 block mt-0.5 font-semibold">Valid till: {settings.tradeLicenseExpiry}</span>
                                </div>
                                <div className="p-2.5 bg-white border border-gray-200/80 rounded-lg">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Tourism Registration</span>
                                    <span className="font-mono font-bold text-gray-800 text-xs">{settings.tourismLicenseNo}</span>
                                    <span className="text-[9.5px] text-blue-600 block mt-0.5 font-semibold">{propGrade} Classification</span>
                                </div>
                                <div className="p-2.5 bg-white border border-gray-200/80 rounded-lg">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Police Special Branch (C-Form)</span>
                                    <span className="font-mono font-bold text-gray-800 text-xs">{settings.policeCFormId}</span>
                                    <span className="text-[9.5px] text-emerald-600 block mt-0.5 font-semibold">Foreign Guest Reporting Active</span>
                                </div>
                                <div className="p-2.5 bg-white border border-gray-200/80 rounded-lg">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Fire Safety Certificate</span>
                                    <span className="font-mono font-bold text-gray-800 text-xs">{settings.fireSafetyCertNo}</span>
                                    <span className="text-[9.5px] text-emerald-600 block mt-0.5 font-semibold">Valid & Cleared</span>
                                </div>
                            </div>
                        </div>

                        {/* Tax Rules & Daily FX Exchange Board */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 pb-1.5 mb-2 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <CreditCard size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Tax, VAT & Service Charge</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500 font-medium">VAT & Service Charge</span>
                                        <span className="font-bold text-gray-900">{settings.vatPercentage}% VAT + {settings.serviceChargePercentage}% Service Charge</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-t border-gray-100">
                                        <span className="text-gray-500 font-medium">VAT / Tax Registration No (BIN)</span>
                                        <span className="font-mono font-semibold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                                            {settings.taxIdNumber}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-t border-gray-100">
                                        <span className="text-gray-500 font-medium">Tariff Calculation Mode</span>
                                        <span className="font-semibold text-blue-700">
                                            {settings.isTaxInclusive ? 'Tax Inclusive (Net Rate)' : 'Tax Exclusive (Add Tax to Rate)'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-t border-gray-100">
                                        <span className="text-gray-500 font-medium">Invoice Rounding Rule</span>
                                        <span className="font-semibold text-gray-800">{settings.roundingRule}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Front Desk FX Cash Exchange Board */}
                            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/60">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Zap size={12} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Front Desk Foreign Exchange Rates</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400">Base: BDT (৳)</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="font-semibold text-gray-800">USD ($) US Dollar</span>
                                        <span className="font-mono text-gray-700">Buy: ৳{settings.fxUsdBuy} | Sell: ৳{settings.fxUsdSell}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="font-semibold text-gray-800">EUR (€) Euro</span>
                                        <span className="font-mono text-gray-700">Buy: ৳{settings.fxEurBuy} | Sell: ৳{settings.fxEurSell}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="font-semibold text-gray-800">GBP (£) British Pound</span>
                                        <span className="font-mono text-gray-700">Buy: ৳{settings.fxGbpBuy} | Sell: ৳{settings.fxGbpSell}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500 font-medium">Card Payment Gateway</span>
                                        <span className="font-semibold text-gray-800">{settings.creditCardGateway}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Connected Bank Accounts */}
                        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2 pb-1.5 mb-2 border-b border-slate-200/60">
                                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Building2 size={12} />
                                </div>
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Designated Hotel Bank Accounts</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {bankAccounts.map((acc) => (
                                    <div key={acc.id} className="p-2.5 border border-gray-200/80 rounded-lg bg-white flex justify-between items-center text-xs shadow-2xs">
                                        <div>
                                            <p className="font-bold text-gray-900 leading-tight">{acc.bankName}</p>
                                            <p className="text-[10.5px] text-gray-500">{acc.accountName} • <span className="font-mono">{acc.accountNum}</span></p>
                                        </div>
                                        <span className="font-mono text-[10.5px] font-bold text-gray-600 bg-slate-50 px-2 py-0.5 rounded border border-gray-100">
                                            {acc.swift}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Financial Activity */}
                        <div>
                            <div className="flex items-center justify-between pb-2 mb-1.5">
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Recent Folio Settlements</span>
                                <span className="text-[11px] text-gray-400">Showing latest {transactions.length} transactions</span>
                            </div>
                            <div className="border border-gray-200/80 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50/90 border-b border-gray-200/80 text-[10.5px] text-slate-500 font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-3.5 py-2">Voucher No</th>
                                            <th className="px-3.5 py-2">Date</th>
                                            <th className="px-3.5 py-2">Description</th>
                                            <th className="px-3.5 py-2 text-right">Amount</th>
                                            <th className="px-3.5 py-2 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.map(txn => (
                                            <tr key={txn.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-3.5 py-2 font-mono text-gray-500 text-[11px]">{txn.id}</td>
                                                <td className="px-3.5 py-2 text-gray-900 text-[11px]">{txn.date}</td>
                                                <td className="px-3.5 py-2 text-gray-900 font-medium text-xs">{txn.desc}</td>
                                                <td className={`px-3.5 py-2 text-right font-bold text-xs ${txn.type === 'credit' ? 'text-emerald-600' : 'text-gray-900'}`}>
                                                    {txn.type === 'credit' ? '+' : ''}৳{Math.abs(txn.amount).toLocaleString()}
                                                </td>
                                                <td className="px-3.5 py-2 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${txn.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'}`}>
                                                        {txn.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. FOLIO & NUMBERING TAB */}
                {activeTab === 'numbering' && (
                    <div className="space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Receipt size={12} />
                                </div>
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Document Numbering & Guest Folio Print Setup</span>
                            </div>
                            {onManageProperty && (
                                <button
                                    type="button"
                                    onClick={() => onManageProperty('numbering')}
                                    className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <Edit2 size={11} />
                                    <span>Edit Numbering</span>
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {[
                                { label: 'Reservation Prefix', value: `${settings.reservationPrefix}1001` },
                                { label: 'Tax Invoice Prefix', value: `${settings.invoicePrefix}1001` },
                                { label: 'Guest Folio Prefix', value: `${settings.folioPrefix}1001` },
                                { label: 'Restaurant KOT Prefix', value: `${settings.kotPrefix}5001` },
                                { label: 'Money Receipt Prefix', value: `${settings.receiptPrefix}2001` },
                            ].map((doc) => (
                                <div key={doc.label} className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">{doc.label}</span>
                                    <span className="font-mono font-bold text-blue-700 text-sm mt-1 block">{doc.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block pb-1.5 border-b border-slate-200/60">
                                    Numbering & Print Preferences
                                </span>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Reset Sequence Numbers Annually</span>
                                        <span className="font-semibold text-emerald-700">{settings.resetAnnually ? 'Enabled (Fiscal Year)' : 'Continuous'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Show Itemized VAT & Service Charge Breakdown</span>
                                        <span className="font-semibold text-emerald-700">Yes ({settings.vatPercentage}% VAT + {settings.serviceChargePercentage}% SC)</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500 font-medium">Send Checkout Folio e-Invoice</span>
                                        <span className="font-semibold text-emerald-700">{settings.enableCheckoutFolioEmail ? 'Enabled' : 'Disabled'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block pb-1.5 border-b border-slate-200/60">
                                    Invoice Footer & Terms
                                </span>
                                <p className="text-[11.5px] text-gray-700 leading-relaxed">{settings.invoiceNotes}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. OUTLETS & POS TAB */}
                {activeTab === 'outlets' && (
                    <div className="space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Layers size={12} />
                                </div>
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Restaurants, Bars & Revenue Outlets</span>
                            </div>
                            <span className="text-xs text-gray-400 font-medium">{posOutlets.length} Active Outlets</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {posOutlets.map((outlet) => (
                                <div key={outlet.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/70 space-y-2 hover:border-blue-300 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="w-7 h-7 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center">
                                            <Utensils size={14} />
                                        </div>
                                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                            {outlet.status}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-xs">{outlet.name}</h4>
                                        <p className="text-[10.5px] text-blue-600 font-semibold">{outlet.type}</p>
                                    </div>
                                    <div className="space-y-1 text-xs border-t border-slate-200/60 pt-2 text-gray-600">
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-gray-400">Operating Hours:</span>
                                            <span className="font-medium text-gray-800">{outlet.hours}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-gray-400">Seating / Capacity:</span>
                                            <span className="font-medium text-gray-800">{outlet.capacity}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-gray-400">POS / KOT Terminal:</span>
                                            <span className="font-medium text-gray-800 font-mono text-[10px]">{outlet.posStation}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 7. CHANNELS & GDS TAB */}
                {activeTab === 'distribution' && (
                    <div className="space-y-3.5">
                        {/* Channel Manager Banner */}
                        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                    <Activity size={20} className="animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900 text-sm">{settings.channelManager}</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            2-WAY SYNC ACTIVE
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        Real-time room inventory & rate plan synchronization across connected OTAs
                                    </p>
                                </div>
                            </div>
                            {onManageProperty && (
                                <button
                                    type="button"
                                    onClick={() => onManageProperty('system')}
                                    className="h-7 px-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs self-start sm:self-auto cursor-pointer"
                                >
                                    <Edit2 size={11} />
                                    <span>Configure Channels</span>
                                </button>
                            )}
                        </div>

                        {/* GDS Identity Codes Card */}
                        <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-100 space-y-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Global Distribution System (GDS) Codes</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {[
                                    { name: 'Amadeus GDS', code: settings.gdsAmadeus },
                                    { name: 'Sabre GDS', code: settings.gdsSabre },
                                    { name: 'Galileo / Travelport', code: settings.gdsGalileo },
                                    { name: 'Worldspan GDS', code: settings.gdsWorldspan },
                                ].map((gds) => (
                                    <div key={gds.name} className="p-2.5 bg-white border border-gray-200/80 rounded-lg shadow-2xs">
                                        <span className="text-[10px] text-gray-400 font-medium block">{gds.name}</span>
                                        <span className="font-mono font-bold text-gray-900 text-xs">{gds.code}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Connected OTA Channels Table */}
                        <div className="border border-gray-200/80 rounded-lg overflow-hidden bg-white shadow-2xs">
                            <div className="px-3.5 py-2 bg-slate-50 border-b border-gray-200/80 flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Online Travel Agencies (OTA Connections)</span>
                                <span className="text-[11px] text-gray-400">5 Configured Channels</span>
                            </div>
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50/50 border-b border-gray-100 text-[10px] text-gray-500 uppercase font-bold">
                                    <tr>
                                        <th className="px-3.5 py-2">Channel Name</th>
                                        <th className="px-3.5 py-2">Account Code</th>
                                        <th className="px-3.5 py-2">Sync Mode</th>
                                        <th className="px-3.5 py-2">Response Time</th>
                                        <th className="px-3.5 py-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {distributionChannels.map((ch) => (
                                        <tr key={ch.code} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-3.5 py-2 font-semibold text-gray-900">{ch.name}</td>
                                            <td className="px-3.5 py-2 font-mono text-gray-500 text-[11px]">{ch.code}</td>
                                            <td className="px-3.5 py-2 text-gray-600">{ch.syncStatus}</td>
                                            <td className="px-3.5 py-2 font-mono text-gray-500 text-[11px]">{ch.ping}</td>
                                            <td className="px-3.5 py-2 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${
                                                    ch.status === 'Connected'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                                        : 'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                    {ch.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 8. EMAIL, SMS & BACKUP TAB */}
                {activeTab === 'automation' && (
                    <div className="space-y-3.5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Mail size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Email (SMTP) & SMS Gateway</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">SMTP Host & Port</span>
                                        <span className="font-mono font-semibold text-gray-900">{settings.smtpHost}:{settings.smtpPort}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Sender Display Name</span>
                                        <span className="font-semibold text-gray-900">{settings.senderName}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">SMS Gateway Provider</span>
                                        <span className="font-semibold text-gray-900">{settings.smsGatewayProvider} ({settings.smsSenderId})</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500 font-medium">Automated Guest Alerts</span>
                                        <span className="font-semibold text-emerald-700">
                                            {[
                                                settings.enableGuestWelcomeSms && 'Welcome SMS',
                                                settings.enableCheckoutFolioEmail && 'Checkout e-Folio',
                                                settings.enableWhatsAppConcierge && 'WhatsApp Concierge'
                                            ].filter(Boolean).join(', ')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Database size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Database Backup & Security</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Automated Cloud Backup</span>
                                        <span className="font-semibold text-emerald-700">{settings.autoCloudBackup ? 'Active' : 'Disabled'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Backup Schedule</span>
                                        <span className="font-semibold text-gray-900">{settings.backupFrequency}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Backup Retention Period</span>
                                        <span className="font-semibold text-gray-900">{settings.backupRetentionDays} Days</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500 font-medium">Idle Session Lock Timeout</span>
                                        <span className="font-semibold text-gray-900">{settings.sessionTimeoutMinutes} Minutes</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 9. CONTACTS & SAFETY TAB */}
                {activeTab === 'team' && (
                    <div className="space-y-3.5">
                        {/* 24/7 Emergency Hotlines */}
                        <div className="bg-rose-50/40 rounded-xl p-3.5 border border-rose-200/70 space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-rose-200/60">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                                        <ShieldAlert size={13} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">24/7 Emergency & Safety Contacts</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    EMERGENCY DESK
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                                {emergencyLines.map((line) => (
                                    <div key={line.id} className="p-2.5 bg-white border border-rose-100 rounded-lg shadow-2xs">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold block">{line.label}</span>
                                        <span className="font-bold text-gray-900 text-xs block">{line.name}</span>
                                        <span className="font-mono text-rose-600 font-bold text-[11px]">{line.phone}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Key Management Personnel */}
                        <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <User size={12} />
                                </div>
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Hotel Management Team (Department Heads)</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {contacts.map((poc) => (
                                <div key={poc.id} className="p-3 border border-gray-200/80 rounded-lg flex items-center gap-3 bg-white shadow-2xs hover:border-blue-300 transition-colors">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                                        {poc.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-900 text-xs truncate leading-tight">{poc.name}</p>
                                        <p className="text-blue-600 text-[10px] font-semibold uppercase tracking-wide leading-none mt-0.5">{poc.role}</p>
                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Phone size={10} className="text-gray-400" />
                                                <span>{poc.phone}</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Mail size={10} className="text-gray-400" />
                                                <span>{poc.email}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                defaultSubject={`Inquiry regarding ${propName}`}
            />
        </div>
    );
};

export default HotelInfoView;
