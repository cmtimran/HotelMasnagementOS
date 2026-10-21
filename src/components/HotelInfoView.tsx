import { useState, useEffect, useRef } from 'react';
import {
    Building2, MapPin, Globe, CreditCard, Star, Clock, Moon, Monitor,
    User, Edit2, Copy, Mail, ShieldCheck, Phone, CheckCircle2, AlertCircle,
    Layers, Check, QrCode, Utensils, Wine, Car, ShieldAlert,
    ExternalLink, Activity, ArrowUpRight, Lock, FileCheck, Compass, Zap,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import SendEmailModal from './SendEmailModal';

interface HotelInfoViewProps {
    property: any;
    currentUser: any;
    onManageProperty: () => void;
}

const HotelInfoView = ({ property, currentUser, onManageProperty }: HotelInfoViewProps) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [localTime, setLocalTime] = useState<string>('');
    const tabsRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

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

    // Concise, elegant labels that prevent horizontal clipping while keeping full meaning
    const tabs = [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'outlets', label: 'Outlets', icon: Layers },
        { id: 'operations', label: 'Operations', icon: Clock },
        { id: 'distribution', label: 'Channels', icon: Globe },
        { id: 'policies', label: 'Policies', icon: ShieldCheck },
        { id: 'finance', label: 'Finance', icon: CreditCard },
        { id: 'automation', label: 'Automation', icon: Monitor },
        { id: 'team', label: 'Team & Safety', icon: User },
    ];

    const handleCopyInfo = () => {
        const text = `Property: ${property.name}\nAddress: ${property.address}, ${property.city}, ${property.country}\nContact: ${property.phone || 'N/A'} | ${property.email || 'N/A'}\nWebsite: ${property.website || 'N/A'}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Financial Transactions Mock
    const transactions = [
        { id: 'TXN-001', date: '2026-10-15', desc: 'Monthly SaaS Enterprise Plan', amount: -299.00, type: 'debit', status: 'Completed' },
        { id: 'TXN-002', date: '2026-10-14', desc: 'Booking Commission Settlement', amount: 1250.50, type: 'credit', status: 'Completed' },
        { id: 'TXN-003', date: '2026-10-10', desc: 'SMS Gateway Credits Top-up', amount: -50.00, type: 'debit', status: 'Completed' },
        { id: 'TXN-004', date: '2026-09-28', desc: 'Channel Manager Sync Fee', amount: -120.00, type: 'debit', status: 'Pending' },
    ];

    // Outlets Data
    const outlets = [
        {
            name: 'The Palm Court & Terrace',
            type: 'Fine Dining Restaurant',
            hours: '06:30 AM - 11:00 PM',
            capacity: '140 Seats',
            posStation: 'KOT Station 1 (Main Kitchen)',
            icon: Utensils,
            status: 'Open Now'
        },
        {
            name: 'Horizon Rooftop Lounge',
            type: 'Bar & Cocktail Lounge',
            hours: '05:00 PM - 01:30 AM',
            capacity: '85 Seats',
            posStation: 'KOT Station 2 (Bar)',
            icon: Wine,
            status: 'Opens at 5 PM'
        },
        {
            name: 'Grand Royal Ballroom',
            type: 'Banquet & Events Center',
            hours: 'By Event Schedule',
            capacity: '450 Guests (Theater)',
            posStation: 'Event Catering POS',
            icon: Building2,
            status: 'Booked Today'
        },
        {
            name: 'Azure Hydrotherapy Spa',
            type: 'Wellness, Massage & Sauna',
            hours: '08:00 AM - 09:00 PM',
            capacity: '8 Treatment Suites',
            posStation: 'Spa Desk POS',
            icon: SparklesIcon,
            status: 'Available'
        },
        {
            name: 'Valet Parking & EV Charging',
            type: 'Automotive & Logistics',
            hours: '24/7 Monitored',
            capacity: '120 Bays + 4x 50kW EV DC Fast Chargers',
            posStation: 'Security Booth POS',
            icon: Car,
            status: '24/7 Active'
        }
    ];

    // Distribution Channels Data
    const distributionChannels = [
        { name: 'Booking.com Direct XML', code: 'OTA-BC-991', syncStatus: 'Live 2-Way', ping: '120ms', status: 'Active' },
        { name: 'Agoda YCS API v4', code: 'OTA-AG-442', syncStatus: 'Live 2-Way', ping: '95ms', status: 'Active' },
        { name: 'Expedia Partner Central', code: 'OTA-EXP-109', syncStatus: 'Live 2-Way', ping: '140ms', status: 'Active' },
        { name: 'Airbnb Hospitality Sync', code: 'OTA-AB-772', syncStatus: 'Calendar Pull', ping: '210ms', status: 'Active' },
        { name: 'Google Hotel Ads (Free Links)', code: 'META-GHA-01', syncStatus: 'Live Feed', ping: '45ms', status: 'Active' }
    ];

    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans text-gray-800">
            {/* Consistent Property Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                        <div className="size-11 sm:size-12 rounded-2xl bg-primary-subtle border border-primary-border flex items-center justify-center text-primary font-bold text-sm shadow-2xs shrink-0 overflow-hidden">
                            {property.logo && !property.logo.includes('placehold.co') ? (
                                <img
                                    src={property.logo}
                                    alt={property.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span>{property.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'GH'}</span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight truncate">
                                    {property.name}
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                    <Star size={10} fill="currentColor" />
                                    <span>{property.grade || '5 Star'}</span>
                                </span>
                                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-primary border border-blue-200">
                                    HTL-DHK-01
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                                <span className="flex items-center gap-1">
                                    <MapPin size={12} className="text-slate-400" />
                                    <span>{property.city}, {property.country}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Globe size={12} className="text-slate-400" />
                                    <a href={`https://${property.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                        {property.website}
                                    </a>
                                </span>
                                {property.phone && (
                                    <span className="hidden md:flex items-center gap-1">
                                        <Phone size={12} className="text-slate-400" />
                                        <span>{property.phone}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Header Action Buttons & Live Clock */}
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-mono text-slate-700">
                            <Clock size={13} className="text-primary animate-spin" style={{ animationDuration: '10s' }} />
                            <span className="font-bold">{localTime || '12:00:00 PM'}</span>
                            <span className="text-[10px] text-slate-400 font-sans font-medium">(UTC+6)</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleCopyInfo}
                            className="btn-secondary"
                            title="Copy Hotel Information"
                        >
                            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-400" />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsEmailModalOpen(true)}
                            className="btn-secondary"
                            title="Send Details via Email"
                        >
                            <Mail size={13} className="text-slate-400" />
                            <span>Email</span>
                        </button>
                        <button
                            type="button"
                            onClick={onManageProperty}
                            className="btn-primary"
                        >
                            <Edit2 size={13} />
                            <span>Manage Property</span>
                        </button>
                    </div>
                </div>

                {/* Unified Tab Bar Navigation (Responsive with Scroll Controls & Auto-Center) */}
                <div className="relative border-t border-gray-100 bg-slate-50/70 group">
                    {/* Left Scroll Chevron */}
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

                    {/* Scrollable Tabs Track */}
                    <div
                        ref={tabsRef}
                        onScroll={checkScroll}
                        className="px-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1.5 scroll-smooth"
                    >
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isSelected = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={(e) => {
                                        setActiveTab(tab.id);
                                        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                    }}
                                    className={`
                                        h-7 px-2.5 sm:px-3 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer select-none flex-shrink-0
                                        ${isSelected
                                            ? 'bg-white text-blue-600 font-semibold shadow-2xs border border-gray-200/80'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'}
                                    `}
                                >
                                    <Icon size={13} className={isSelected ? 'text-blue-600' : 'text-gray-400'} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Scroll Chevron */}
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
                            {/* Left Column: Business, Geo & Corporate Info */}
                            <div className="space-y-3.5">
                                <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200/60">
                                        <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Building2 size={12} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Business & Contact Details</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100 text-xs">
                                            <span className="text-gray-500 font-medium">Physical Address</span>
                                            <span className="font-semibold text-gray-900 text-right">{property.address}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100 text-xs">
                                            <span className="text-gray-500 font-medium">City & Country</span>
                                            <span className="font-semibold text-gray-900">{property.city}, {property.country}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100 text-xs">
                                            <span className="text-gray-500 font-medium">Official Website</span>
                                            <a href={`https://${property.website}`} target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">
                                                {property.website}
                                            </a>
                                        </div>
                                        <div className="flex items-center justify-between py-1 text-xs">
                                            <span className="text-gray-500 font-medium">Operating Base Currency</span>
                                            <span className="font-semibold text-gray-900">{property.currency || 'USD ($)'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Geo-Location & Transit Hubs (New Feature) */}
                                <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                                <Compass size={12} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Geo-Coordinates & Transit Proximity</span>
                                        </div>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=23.7937,90.4066`}
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
                                            <span className="font-mono font-semibold text-gray-800">23.7937° N, 90.4066° E</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                            <span className="text-gray-500 font-medium">Airport Proximity</span>
                                            <span className="font-semibold text-gray-800">Hazrat Shahjalal Intl (8.5 km / 25 mins)</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                            <span className="text-gray-500 font-medium">Central Station</span>
                                            <span className="font-semibold text-gray-800">Kamalapur Railway (12.4 km / 35 mins)</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1">
                                            <span className="text-gray-500 font-medium">Diplomatic Zone</span>
                                            <span className="font-semibold text-emerald-700">Gulshan-2 Diplomatic Area (1.2 km / 5 mins)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200/60">
                                        <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Globe size={12} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Corporate Headquarters</span>
                                    </div>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex items-center gap-2 py-1 border-b border-gray-100 text-gray-700">
                                            <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                                            <span className="font-medium truncate">{property.corporate?.address || '100 Hospitality Blvd, Suite 400, Miami, USA'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 py-1 border-b border-gray-100 text-gray-700">
                                            <Mail size={12} className="text-gray-400 flex-shrink-0" />
                                            <span className="font-medium truncate">{property.corporate?.email || 'corporate@grandhotel.com'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 py-1 text-gray-700">
                                            <Phone size={12} className="text-gray-400 flex-shrink-0" />
                                            <span className="font-medium">{property.corporate?.phone || '+1 (305) 555-0100'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Active User Session Block */}
                                <div className="bg-blue-50/60 rounded-lg p-3 border border-blue-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                            {currentUser?.name?.charAt(0) || 'U'}
                                        </div>
                                        <div>
                                            <p className="text-[9.5px] text-blue-600 uppercase font-bold tracking-wider leading-none">Active Session</p>
                                            <p className="font-bold text-gray-900 text-xs mt-0.5 leading-tight">{currentUser?.name || 'Administrator'}</p>
                                            <p className="text-[10.5px] text-gray-500 leading-none">{currentUser?.role || 'Super Admin'}</p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-emerald-700 rounded-md text-[10px] font-semibold border border-emerald-200/60 shadow-2xs">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Active Token
                                    </span>
                                </div>
                            </div>

                            {/* Right Column: Key Stats, Booking Engine & Amenities */}
                            <div className="space-y-3.5">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                        <div className="flex items-center justify-between text-blue-600 mb-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Inventory</span>
                                            <Layers size={13} />
                                        </div>
                                        <p className="text-xl font-bold text-gray-900 leading-tight">{property.rooms} Rooms</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Physical Operating Units</p>
                                    </div>

                                    <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                        <div className="flex items-center justify-between text-amber-500 mb-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Classification</span>
                                            <Star size={13} fill="currentColor" />
                                        </div>
                                        <p className="text-xl font-bold text-gray-900 leading-tight">{property.grade}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Hospitality Star Rating</p>
                                    </div>
                                </div>

                                {/* Direct Booking Engine & QR Compendium (New Feature) */}
                                <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/70 rounded-lg p-3 border border-blue-200/70 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs uppercase tracking-wider">
                                            <QrCode size={13} />
                                            <span>Guest Web Booking Engine & QR Portal</span>
                                        </div>
                                        <p className="text-xs text-blue-900 font-semibold">https://book.grandpalacehotel.com/res</p>
                                        <p className="text-[10px] text-blue-600">Walk-in QR code & guest mobile check-in active</p>
                                    </div>
                                    <span className="px-2.5 py-1 bg-white text-blue-700 rounded-md text-[10px] font-bold border border-blue-200 shadow-2xs">
                                        ACTIVE PORTAL
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
                                        {property.description || 'Modern luxury hospitality establishment delivering world-class guest accommodation, fine dining, and automated guest operations.'}
                                    </p>
                                </div>

                                {/* Amenities / Features */}
                                <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200/60">
                                        <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <CheckCircle2 size={12} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Property Amenities</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(property.features || ['Beach Access', 'Spa', 'Pool', 'Fine Dining', 'Fitness Center', 'EV Charging', 'High-Speed Wi-Fi', '24/7 Room Service']).map((feat: string) => (
                                            <span key={feat} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[11px] font-medium text-gray-700 shadow-2xs">
                                                {feat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. OUTLETS & FACILITIES TAB (New Full Feature) */}
                {activeTab === 'outlets' && (
                    <div className="space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <Layers size={12} />
                                </div>
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Property Outlets & Revenue Centers</span>
                            </div>
                            <span className="text-xs text-gray-400 font-medium">5 Configured Revenue Centers</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {outlets.map((outlet) => {
                                const Icon = outlet.icon;
                                return (
                                    <div key={outlet.name} className="p-3 bg-slate-50/60 rounded-xl border border-slate-200/70 space-y-2 hover:border-blue-300 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="w-7 h-7 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center">
                                                <Icon size={14} />
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
                                                <span className="text-gray-400">Hours:</span>
                                                <span className="font-medium text-gray-800">{outlet.hours}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-gray-400">Capacity:</span>
                                                <span className="font-medium text-gray-800">{outlet.capacity}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-gray-400">POS Link:</span>
                                                <span className="font-medium text-gray-800 font-mono text-[10px]">{outlet.posStation}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. OPERATIONS & SAFETY TAB */}
                {activeTab === 'operations' && (
                    <div className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                <div className="flex items-center justify-between text-blue-600 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Standard Check-In</span>
                                    <Clock size={13} />
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono leading-tight">{property.operations?.checkIn || '14:00'}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Official Guest Arrival Time</p>
                            </div>

                            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                <div className="flex items-center justify-between text-amber-600 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Standard Check-Out</span>
                                    <Clock size={13} />
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono leading-tight">{property.operations?.checkOut || '12:00'}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Folio Settlement Deadline</p>
                            </div>

                            <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-200/70">
                                <div className="flex items-center justify-between text-purple-600 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Night Audit Rollover</span>
                                    <Moon size={13} />
                                </div>
                                <p className="text-xl font-bold text-gray-900 font-mono leading-tight">{property.operations?.nightAudit || '02:00'}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Automated Business Day Rollover</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <ShieldCheck size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Operational Parameters</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Cancellation Terms</span>
                                        <span className="font-semibold text-gray-900">{property.operations?.cancellation || 'Flexible: 48h Prior'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Designated Weekend Days</span>
                                        <div className="flex gap-1">
                                            {(property.operations?.weekends || ['Friday', 'Saturday']).map((d: string) => (
                                                <span key={d} className="px-1.5 py-0.2 bg-white border border-gray-200 rounded text-[10px] font-semibold text-gray-700">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500 font-medium">Keycard Hardware System</span>
                                        <span className="font-semibold text-blue-600 flex items-center gap-1">
                                            <Lock size={11} />
                                            <span>VingCard / ASSA ABLOY RFID (Online)</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <AlertCircle size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">House Policies</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Smoking Policy</span>
                                        <span className="font-semibold text-gray-900">{property.operations?.smoking || 'Non-Smoking Throughout (৳ 20,000 deep clean fee)'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="text-gray-500 font-medium">Pet Policy</span>
                                        <span className="font-semibold text-gray-900">Service Animals Only with Prior Notice</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500 font-medium">Visitor Policy</span>
                                        <span className="font-semibold text-gray-900">Lobby Registration & 10:00 PM Curfew</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. DISTRIBUTION & CHANNELS TAB (New Full Feature) */}
                {activeTab === 'distribution' && (
                    <div className="space-y-3.5">
                        {/* 2-Way Sync Engine Banner */}
                        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                    <Activity size={20} className="animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900 text-sm">SiteMinder 2-Way Channel Manager</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            SYNC ACTIVE
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        Last rate & inventory sync executed 2 minutes ago • 0 unprocessed webhook errors
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="h-7 px-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs self-start sm:self-auto"
                            >
                                <span>Trigger Full Sync</span>
                                <ArrowUpRight size={12} />
                            </button>
                        </div>

                        {/* GDS Identity Codes Card */}
                        <div className="bg-slate-50/50 p-3.5 rounded-lg border border-slate-100 space-y-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Global Distribution System (GDS) Identifiers</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {[
                                    { name: 'Amadeus', code: 'GH-DAC-01' },
                                    { name: 'Sabre', code: 'GH-39104' },
                                    { name: 'Galileo / Apollo', code: 'GH-A992' },
                                    { name: 'Worldspan', code: 'GH-8472' },
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
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Connected Online Travel Agencies (OTAs)</span>
                                <span className="text-[11px] text-gray-400">5 Active Channels</span>
                            </div>
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50/50 border-b border-gray-100 text-[10px] text-gray-500 uppercase font-bold">
                                    <tr>
                                        <th className="px-3.5 py-2">Channel Name</th>
                                        <th className="px-3.5 py-2">Channel ID</th>
                                        <th className="px-3.5 py-2">Sync Mode</th>
                                        <th className="px-3.5 py-2">Latency</th>
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
                                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
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

                {/* 5. POLICIES TAB */}
                {activeTab === 'policies' && (
                    <div className="space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <ShieldCheck size={12} />
                                </div>
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Hospitality Rules & Regulatory Policies</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                                Engine v2.4
                            </span>
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
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Cancellation Window</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.cancellation || 'Free cancellation up to 48h prior'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Grace Period</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.gracePeriod || '4 Hours from booking creation'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">No-Show Penalty</span>
                                        <p className="font-bold text-rose-600 text-[11.5px]">{property.policies?.noShow || '100% of First Night Charge'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment & Deposits */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-blue-600 pb-1 border-b border-slate-200/60">
                                    <CreditCard size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Payments & Deposits</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Rate Plan Payment</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.ratePayment || 'Advance Purchase: Full Prepayment'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Security Deposit</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.securityDeposit || '৳ 5,000 per stay (Refundable)'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Check-in & Departure */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-emerald-600 pb-1 border-b border-slate-200/60">
                                    <Moon size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Arrival & Departure</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Early Check-In</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.earlyCheckin || 'Subject to availability (৳ 1,500 fee)'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Early Departure</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.earlyDeparture || 'Full amount of stay applicable'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Guest & Age Policy */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-purple-600 pb-1 border-b border-slate-200/60">
                                    <User size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Guest & Age Rules</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Minimum Age</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.agePolicy || 'Primary guest must be 18+ years'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Child Policy</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.childPolicy || 'Up to 2 children under 5 stay free'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Group Bookings */}
                            <div className="bg-slate-50/50 rounded-lg p-3 border border-slate-100 space-y-2">
                                <div className="flex items-center gap-1.5 text-amber-600 pb-1 border-b border-slate-200/60">
                                    <Building2 size={12} />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-900">Group Reservations</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Group Definition</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.groupDefinition || '5 or more rooms per booking'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9.5px] font-bold text-gray-400 uppercase tracking-wider">Deposit Terms</span>
                                        <p className="font-semibold text-gray-900 text-[11.5px]">{property.policies?.groupDeposit || '50% non-refundable deposit'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. FINANCE & COMPLIANCE TAB (Includes Statutory Certification & FX Board) */}
                {activeTab === 'finance' && (
                    <div className="space-y-3.5">
                        {/* Legal, Licensing & Government Certification Card (New Feature) */}
                        <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <FileCheck size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Statutory Licenses & Government Certifications</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    ALL CLEAR (AUDITED)
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                                <div className="p-2.5 bg-white border border-gray-200/80 rounded-lg">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Trade License</span>
                                    <span className="font-mono font-bold text-gray-800 text-xs">TL-DHK-2024-009419</span>
                                    <span className="text-[9.5px] text-emerald-600 block mt-0.5 font-semibold">Valid till: 30 Jun 2027</span>
                                </div>
                                <div className="p-2.5 bg-white border border-gray-200/80 rounded-lg">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Tourism Star Classification</span>
                                    <span className="font-mono font-bold text-gray-800 text-xs">DOT-CAT5-88219</span>
                                    <span className="text-[9.5px] text-blue-600 block mt-0.5 font-semibold">5-Star Luxury Grade</span>
                                </div>
                                <div className="p-2.5 bg-white border border-gray-200/80 rounded-lg">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Police Foreigner C-Form ID</span>
                                    <span className="font-mono font-bold text-gray-800 text-xs">SB-REG-55209</span>
                                    <span className="text-[9.5px] text-emerald-600 block mt-0.5 font-semibold">Automated API Linked</span>
                                </div>
                                <div className="p-2.5 bg-white border border-gray-200/80 rounded-lg">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Fire Safety & Civil Defense</span>
                                    <span className="font-mono font-bold text-gray-800 text-xs">FSCD-CL-44109</span>
                                    <span className="text-[9.5px] text-emerald-600 block mt-0.5 font-semibold">Cleared: Nov 2026</span>
                                </div>
                            </div>
                        </div>

                        {/* Taxation & Front Desk Daily FX Board */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 pb-1.5 mb-2 border-b border-slate-200/60">
                                    <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <CreditCard size={12} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Tax & Regulatory Rule</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-gray-500 font-medium">Applied Tax Rule</span>
                                        <span className="font-bold text-gray-900">{property.finance?.taxRule || '15% VAT + 10% Service Charge'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-t border-gray-100">
                                        <span className="text-gray-500 font-medium">Business Identification (BIN)</span>
                                        <span className="font-mono font-semibold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                                            {property.finance?.binNo || 'BIN-9042-8819'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-t border-gray-100">
                                        <span className="text-gray-500 font-medium">Tax Exemption Threshold</span>
                                        <span className="font-mono text-[11px] font-semibold text-blue-700">Code: VAT-EX-CORP-99</span>
                                    </div>
                                </div>
                            </div>

                            {/* Front Desk FX Cash Exchange Board (New Feature) */}
                            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200/60">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Zap size={12} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Front Desk Daily FX Exchange Board</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400">Base: BDT (৳)</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="font-semibold text-gray-800">USD ($) US Dollar</span>
                                        <span className="font-mono text-gray-700">Buy: ৳121.50 | Sell: ৳123.00</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                                        <span className="font-semibold text-gray-800">EUR (€) Euro</span>
                                        <span className="font-mono text-gray-700">Buy: ৳131.20 | Sell: ৳133.50</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="font-semibold text-gray-800">GBP (£) British Pound</span>
                                        <span className="font-mono text-gray-700">Buy: ৳154.00 | Sell: ৳156.80</span>
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
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Connected Bank Accounts</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(property.finance?.bankAccounts || [
                                    { id: '1', bankName: 'Standard Chartered Bank', accountNum: '01-8849201-01', swift: 'SCBLBDDX' },
                                    { id: '2', bankName: 'Eastern Bank Ltd', accountNum: '104-120-94819', swift: 'EBLBBDDH' }
                                ]).map((acc: any) => (
                                    <div key={acc.id} className="p-2 border border-gray-200/80 rounded bg-white flex justify-between items-center text-xs shadow-2xs">
                                        <div>
                                            <p className="font-bold text-gray-900 leading-tight">{acc.bankName}</p>
                                            <p className="text-[10.5px] text-gray-500 font-mono">{acc.accountNum}</p>
                                        </div>
                                        <span className="font-mono text-[10.5px] font-bold text-gray-600 bg-slate-50 px-2 py-0.5 rounded border border-gray-100">
                                            {acc.swift}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Transaction History Table */}
                        <div>
                            <div className="flex items-center justify-between pb-2 mb-1.5">
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Recent Financial Activity</span>
                                <span className="text-[11px] text-gray-400">Showing last 4 transactions</span>
                            </div>
                            <div className="border border-gray-200/80 rounded-lg overflow-hidden bg-white shadow-2xs">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50/90 border-b border-gray-200/80 text-[10.5px] text-slate-500 font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-3.5 py-2">Transaction ID</th>
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
                                                    {txn.type === 'credit' ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
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

                {/* 7. AUTOMATION TAB */}
                {activeTab === 'automation' && (
                    <div className="space-y-3.5">
                        <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80">
                            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200/60">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Monitor size={13} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider leading-none">Night Audit Automation</h3>
                                        <p className="text-[11px] text-gray-500 mt-0.5 leading-none">Automated nightly rollover schedules, room charge postings & backup routines</p>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${property.automation?.autoRun !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'}`}>
                                    {property.automation?.autoRun !== false ? 'ACTIVE ENGINE' : 'MANUAL TRIGGER'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scheduled Run Time</span>
                                    <p className="text-xl font-bold font-mono text-gray-900 mt-1">{property.automation?.auditTime || '02:00 AM'}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Local Property Timezone</p>
                                </div>

                                <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Auto Post Room Charges</span>
                                    <p className="text-xl font-bold text-emerald-600 mt-1">Enabled</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Automated Daily Folio Posting</p>
                                </div>

                                <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-2xs">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cloud Ledger Backup</span>
                                    <p className="text-xl font-bold text-emerald-600 mt-1">Active</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Nightly Snapshot Retention</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 8. TEAM & EMERGENCY LIFE SAFETY TAB (New Full Feature) */}
                {activeTab === 'team' && (
                    <div className="space-y-3.5">
                        {/* 24/7 Life Safety & Emergency Direct Hotlines (New Feature) */}
                        <div className="bg-rose-50/40 rounded-xl p-3.5 border border-rose-200/70 space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-rose-200/60">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                                        <ShieldAlert size={13} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">24/7 Life Safety & Emergency Direct Lines</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    PRIORITY DISPATCH
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                                <div className="p-2.5 bg-white border border-rose-100 rounded-lg shadow-2xs">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">On-Duty Hotel Physician</span>
                                    <span className="font-bold text-gray-900 text-xs block">Dr. S. K. Roy (Ext 991)</span>
                                    <span className="font-mono text-rose-600 font-bold text-[11px]">+880 1711 999111</span>
                                </div>
                                <div className="p-2.5 bg-white border border-rose-100 rounded-lg shadow-2xs">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Nearest Hospital ER</span>
                                    <span className="font-bold text-gray-900 text-xs block">United Hospital ER</span>
                                    <span className="font-mono text-rose-600 font-bold text-[11px]">+880 2 8836000</span>
                                </div>
                                <div className="p-2.5 bg-white border border-rose-100 rounded-lg shadow-2xs">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Local Police Station</span>
                                    <span className="font-bold text-gray-900 text-xs block">Gulshan Thana Duty Officer</span>
                                    <span className="font-mono text-rose-600 font-bold text-[11px]">+880 2 9885566</span>
                                </div>
                                <div className="p-2.5 bg-white border border-rose-100 rounded-lg shadow-2xs">
                                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Fire Service Control Room</span>
                                    <span className="font-bold text-gray-900 text-xs block">Baridhara Fire Station</span>
                                    <span className="font-mono text-rose-600 font-bold text-[11px]">+880 2 9898999 / 999</span>
                                </div>
                            </div>
                        </div>

                        {/* Key Management Personnel */}
                        <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <User size={12} />
                                </div>
                                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">Executive Management Team (POC)</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(property.pocs || [
                                { id: 1, name: 'John Smith', role: 'General Manager', phone: '+1 (305) 555-0101', email: 'gm@grandhotel.com' },
                                { id: 2, name: 'Alice Walker', role: 'Front Desk Lead', phone: '+1 (305) 555-0102', email: 'frontdesk@grandhotel.com' },
                                { id: 3, name: 'David Miller', role: 'Head of Housekeeping', phone: '+1 (305) 555-0103', email: 'housekeeping@grandhotel.com' },
                                { id: 4, name: 'Sarah Jenkins', role: 'Chief Financial Officer', phone: '+1 (305) 555-0104', email: 'finance@grandhotel.com' },
                            ]).map((poc: any) => (
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
                defaultSubject={`Inquiry regarding ${property.name}`}
            />
        </div>
    );
};

// Helper component for Spa Icon
function SparklesIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    );
}

export default HotelInfoView;
