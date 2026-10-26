import React, { useState, useEffect } from 'react';
import {
    Building2, MapPin, Globe, CreditCard, Star, Clock, Moon, Monitor,
    User, Edit2, Copy, Mail, ShieldCheck, Phone, CheckCircle2, AlertCircle,
    Layers, Check, QrCode, Utensils, ShieldAlert,
    ExternalLink, Activity, Lock, FileCheck, Compass,
    Receipt, Database, Briefcase, Printer, Plus, Trash2, X, Save,
    Building, BedDouble
} from 'lucide-react';
import SendEmailModal from './SendEmailModal';
import { getAllStoredReservations, getOperatingSystemDate } from '../utils/roomInventoryEngine';
import { useProperty } from '../context/PropertyContext';
import { getApiBaseUrl } from '../utils/apiUrl';
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

export const HotelInfoView: React.FC<HotelInfoViewProps> = ({ property, currentUser: _currentUser, onManageProperty }) => {
    const { activeProperty, refreshProperties } = useProperty();
    const targetProperty = property?.raw || property || activeProperty;
    const propId = targetProperty?.id || 1;

    // View Navigation & State
    const [activeTab, setActiveTab] = useState<string>('overview');
    const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
    const [isQuickEditOpen, setIsQuickEditOpen] = useState<boolean>(false);
    const [quickEditTab, setQuickEditTab] = useState<'identity' | 'operations' | 'finance' | 'amenities'>('identity');
    const [copied, setCopied] = useState<boolean>(false);
    const [localTime, setLocalTime] = useState<string>('');
    const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Live Server Metadata & Stats
    const [serverProperty, setServerProperty] = useState<any>(null);
    const [propertyStats, setPropertyStats] = useState<{
        totalRooms: number;
        totalBuildings: number;
        totalFloors: number;
        totalRoomTypes: number;
    }>({
        totalRooms: 34,
        totalBuildings: 2,
        totalFloors: 5,
        totalRoomTypes: 5
    });

    // Hydrate unified settings for this property
    const [settings, setSettings] = useState(() => getDefaultUnifiedSettings(targetProperty));
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [posOutlets, setPosOutlets] = useState<PosOutlet[]>([]);
    const [contacts, setContacts] = useState<PocContact[]>([]);
    const [emergencyLines, setEmergencyLines] = useState<EmergencyLine[]>([]);
    const [amenities, setAmenities] = useState<Record<string, boolean>>({
        'High-Speed Wi-Fi': true,
        'Valet Parking': true,
        'Swimming Pool': true,
        'Fitness Center & Gym': true,
        'Luxury Wellness Spa': true,
        'All-Day Dining Restaurant': true,
        'Rooftop Lounge': true,
        '24/7 Room Service': true,
        'Banquet & Conference Hall': true,
        'Airport Shuttle Service': true,
        'EV Vehicle Charging': true,
        'Wheelchair Accessible': true,
        'Halal Certified Kitchen': true,
        'Standby Power Generator': true
    });

    // Quick Add Modal States
    const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
    const [newBank, setNewBank] = useState<Partial<BankAccount>>({ bankName: '', accountName: '', accountNum: '', swift: '', branch: '' });
    const [isAddOutletModalOpen, setIsAddOutletModalOpen] = useState(false);
    const [newOutlet, setNewOutlet] = useState<Partial<PosOutlet>>({ name: '', type: 'Restaurant', hours: '07:00 AM - 11:00 PM', capacity: '80 Seats', posStation: 'POS-01', status: 'Active' });
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [newContact, setNewContact] = useState<Partial<PocContact>>({ name: '', role: '', phone: '', email: '' });

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Load property details & settings from Backend API with localStorage sync
    const loadPropertyDetails = async () => {
        const baseUrl = getApiBaseUrl();
        const currentPropId = targetProperty?.id || 1;
        try {
            const res = await fetch(`${baseUrl}/api/properties/${currentPropId}`);
            const json = await res.json();
            if (json.success && json.data) {
                const p = json.data.property || json.data;
                setServerProperty(p);
                if (json.data.stats || json.data.rooms) {
                    setPropertyStats({
                        totalRooms: json.data.stats?.totalRooms ?? json.data.rooms?.length ?? 34,
                        totalBuildings: json.data.buildings?.length ?? 2,
                        totalFloors: json.data.floors?.length ?? 5,
                        totalRoomTypes: json.data.roomTypes?.length ?? 5
                    });
                }

                // If DB has custom settings, apply them
                const dbSettings = p.settings;
                if (dbSettings && typeof dbSettings === 'object') {
                    setSettings(prev => ({
                        ...prev,
                        ...dbSettings,
                        baseCurrency: p.currency || dbSettings.baseCurrency || 'BDT',
                        checkInTime: p.check_in_time || dbSettings.checkInTime || '14:00',
                        checkOutTime: p.check_out_time || dbSettings.checkOutTime || '12:00'
                    }));
                    if (Array.isArray(dbSettings.bankAccounts)) setBankAccounts(dbSettings.bankAccounts);
                    if (Array.isArray(dbSettings.posOutlets)) setPosOutlets(dbSettings.posOutlets);
                    if (Array.isArray(dbSettings.contacts)) setContacts(dbSettings.contacts);
                    if (Array.isArray(dbSettings.emergencyLines)) setEmergencyLines(dbSettings.emergencyLines);
                    if (dbSettings.amenities) setAmenities(dbSettings.amenities);
                    return;
                }
            }
        } catch (err) {
            console.warn('API property load failed, using local fallback:', err);
        }

        // LocalStorage Fallback for offline resilience
        try {
            const savedRaw = localStorage.getItem(`hotel_unified_settings_prop_${currentPropId}`);
            if (savedRaw) {
                const parsed = JSON.parse(savedRaw);
                if (parsed.settings) {
                    setSettings(prev => ({
                        ...prev,
                        ...parsed.settings,
                        baseCurrency: targetProperty?.currency || parsed.settings.baseCurrency || 'BDT',
                        checkInTime: targetProperty?.check_in_time || parsed.settings.checkInTime || '14:00',
                        checkOutTime: targetProperty?.check_out_time || parsed.settings.checkOutTime || '12:00'
                    }));
                }
                if (Array.isArray(parsed.bankAccounts)) setBankAccounts(parsed.bankAccounts);
                if (Array.isArray(parsed.posOutlets)) setPosOutlets(parsed.posOutlets);
                if (Array.isArray(parsed.contacts)) setContacts(parsed.contacts);
                if (Array.isArray(parsed.emergencyLines)) setEmergencyLines(parsed.emergencyLines);
                if (parsed.amenities) setAmenities(parsed.amenities);
            } else {
                setSettings(getDefaultUnifiedSettings(targetProperty));
            }
        } catch {}
    };

    useEffect(() => {
        loadPropertyDetails();
    }, [propId, activeProperty]);

    // Live Clock with Timezone
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setLocalTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    const propName = serverProperty?.name || targetProperty?.name || 'Grand Palace Dhaka (Main Tower)';
    const propCode = serverProperty?.code || targetProperty?.code || 'GPD';
    const propGrade = serverProperty?.star_rating
        ? `${serverProperty.star_rating} Star Luxury`
        : (targetProperty?.grade || `${targetProperty?.star_rating || 5} Star Luxury`);
    const propRooms = propertyStats.totalRooms || 34;
    const propCity = serverProperty?.city || targetProperty?.city || 'Dhaka';
    const propCountry = serverProperty?.country || targetProperty?.country || 'Bangladesh';
    const propAddress = serverProperty?.address || targetProperty?.address || 'Plot 12, Road 45, Gulshan-2, Dhaka';
    const propPhone = serverProperty?.phone || targetProperty?.phone || '+880 2 9882200';
    const propEmail = serverProperty?.email || targetProperty?.email || 'dhaka@grandhospitality.com';
    const propCurrency = serverProperty?.currency || targetProperty?.currency || settings.baseCurrency || 'BDT';

    // Tabs definition with clean icons
    const tabs = [
        { id: 'overview', manageTab: 'identity', label: 'Overview', icon: Building2 },
        { id: 'operations', manageTab: 'operations', label: 'Operations & Hours', icon: Clock },
        { id: 'policies', manageTab: 'operations', label: 'Policies & Guarantees', icon: ShieldCheck },
        { id: 'finance', manageTab: 'finance', label: 'Finance, Tax & Bank', icon: CreditCard },
        { id: 'outlets', manageTab: 'system', label: 'Outlets & POS', icon: Layers, badge: posOutlets.length },
        { id: 'distribution', manageTab: 'system', label: 'Channels & GDS', icon: Globe },
        { id: 'team', manageTab: 'branding', label: 'Management & Safety', icon: User, badge: contacts.length },
        { id: 'numbering', manageTab: 'numbering', label: 'Folio & Invoicing', icon: Receipt },
        { id: 'automation', manageTab: 'communication', label: 'Security & Backup', icon: Monitor },
    ];

    const currentTabObj = tabs.find(t => t.id === activeTab) || tabs[0];

    // Copy formatted factsheet
    const handleCopyInfo = () => {
        const text = `=========================================
PROPERTY FACT SHEET: ${propName}
=========================================
Code: ${propCode} | Grade: ${propGrade}
Address: ${propAddress}, ${propCity}, ${propCountry}
Phone: ${propPhone} | Email: ${propEmail}
Website: ${settings.website}
Direct Booking: ${settings.bookingEngineUrl}
Standard Check-In: ${settings.checkInTime} | Standard Check-Out: ${settings.checkOutTime}
Currency: ${propCurrency} | Timezone: ${settings.timezone}
Tax Identification (BIN): ${settings.taxIdNumber} | Trade License: ${settings.tradeLicenseNo}
Total Inventory: ${propRooms} Rooms (${propertyStats.totalBuildings} Buildings, ${propertyStats.totalFloors} Floors)
=========================================`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        showToast('Property factsheet copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    // Print Fact Sheet
    const handlePrintFactSheet = () => {
        window.print();
    };

    // Save Unified Settings to PostgreSQL DB and Cache
    const handleSaveSettingsToDB = async (updatedSettings: any, updatedBanks?: BankAccount[], updatedOutlets?: PosOutlet[], updatedPoc?: PocContact[]) => {
        setIsSaving(true);
        const baseUrl = getApiBaseUrl();
        const currentPropId = targetProperty?.id || 1;

        const payload = {
            name: propName,
            code: propCode,
            starRating: Number(serverProperty?.star_rating || targetProperty?.star_rating || 5),
            address: propAddress,
            city: propCity,
            country: propCountry,
            phone: propPhone,
            email: propEmail,
            currency: propCurrency,
            checkInTime: updatedSettings.checkInTime || settings.checkInTime,
            checkOutTime: updatedSettings.checkOutTime || settings.checkOutTime,
            timeZone: updatedSettings.timezone || settings.timezone,
            settings: {
                ...updatedSettings,
                bankAccounts: updatedBanks || bankAccounts,
                posOutlets: updatedOutlets || posOutlets,
                contacts: updatedPoc || contacts,
                emergencyLines,
                amenities,
                updatedAt: new Date().toISOString()
            }
        };

        try {
            const res = await fetch(`${baseUrl}/api/properties/${currentPropId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (json.success) {
                // Update local storage cache
                localStorage.setItem(`hotel_unified_settings_prop_${currentPropId}`, JSON.stringify(payload.settings));
                localStorage.setItem('hotel_general_settings_v1', JSON.stringify(updatedSettings));
                showToast('Hotel profile & operational settings saved to database successfully!');
                await refreshProperties();
                await loadPropertyDetails();
                setIsQuickEditOpen(false);
            } else {
                throw new Error(json.error || 'Failed to update property');
            }
        } catch (e: any) {
            console.error('Save settings error:', e);
            // Fallback to local storage if network glitch
            localStorage.setItem(`hotel_unified_settings_prop_${currentPropId}`, JSON.stringify(payload.settings));
            showToast('Saved to local storage cache.', 'success');
            setIsQuickEditOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    // Add Bank Account Handler
    const handleAddBank = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBank.bankName || !newBank.accountNum) return;
        const entry: BankAccount = {
            id: String(Date.now()),
            bankName: newBank.bankName,
            accountName: newBank.accountName || propName,
            accountNum: newBank.accountNum,
            swift: newBank.swift || 'SCBLBDDX',
            branch: newBank.branch || 'Principal Branch'
        };
        const updated = [...bankAccounts, entry];
        setBankAccounts(updated);
        await handleSaveSettingsToDB(settings, updated);
        setIsAddBankModalOpen(false);
        setNewBank({ bankName: '', accountName: '', accountNum: '', swift: '', branch: '' });
    };

    const handleDeleteBank = async (id: string) => {
        const updated = bankAccounts.filter(b => b.id !== id);
        setBankAccounts(updated);
        await handleSaveSettingsToDB(settings, updated);
    };

    // Add Outlet Handler
    const handleAddOutlet = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOutlet.name) return;
        const entry: PosOutlet = {
            id: String(Date.now()),
            name: newOutlet.name,
            type: newOutlet.type || 'Restaurant',
            hours: newOutlet.hours || '07:00 AM - 11:00 PM',
            capacity: newOutlet.capacity || '60 Seats',
            posStation: newOutlet.posStation || 'Main POS',
            status: 'Active'
        };
        const updated = [...posOutlets, entry];
        setPosOutlets(updated);
        await handleSaveSettingsToDB(settings, undefined, updated);
        setIsAddOutletModalOpen(false);
        setNewOutlet({ name: '', type: 'Restaurant', hours: '07:00 AM - 11:00 PM', capacity: '60 Seats', posStation: 'Main POS', status: 'Active' });
    };

    const handleDeleteOutlet = async (id: string) => {
        const updated = posOutlets.filter(o => o.id !== id);
        setPosOutlets(updated);
        await handleSaveSettingsToDB(settings, undefined, updated);
    };

    // Add Contact Handler
    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContact.name || !newContact.role) return;
        const entry: PocContact = {
            id: String(Date.now()),
            name: newContact.name,
            role: newContact.role,
            phone: newContact.phone || '+880 1700-000000',
            email: newContact.email || 'staff@hotel.com'
        };
        const updated = [...contacts, entry];
        setContacts(updated);
        await handleSaveSettingsToDB(settings, undefined, undefined, updated);
        setIsAddContactModalOpen(false);
        setNewContact({ name: '', role: '', phone: '', email: '' });
    };

    const handleDeleteContact = async (id: string) => {
        const updated = contacts.filter(c => c.id !== id);
        setContacts(updated);
        await handleSaveSettingsToDB(settings, undefined, undefined, updated);
    };

    // Toggle Amenity
    const handleToggleAmenity = async (name: string) => {
        const nextAmenities = { ...amenities, [name]: !amenities[name] };
        setAmenities(nextAmenities);
        const currentPropId = targetProperty?.id || 1;
        const baseUrl = getApiBaseUrl();
        const nextSettings = { ...settings, amenities: nextAmenities };
        localStorage.setItem(`hotel_unified_settings_prop_${currentPropId}`, JSON.stringify(nextSettings));
        fetch(`${baseUrl}/api/properties/${currentPropId}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nextSettings)
        }).catch(() => {});
    };

    // Live Financial Transactions derived from Reservations
    const transactions = getAllStoredReservations().slice(0, 6).map((r, idx) => ({
        id: r.id || `TXN-00${idx + 1}`,
        date: r.checkIn || getOperatingSystemDate(),
        desc: `Folio Settlement - ${r.guestName} (${r.roomNumber || 'Room'})`,
        amount: Number(r.totalAmount || r.totalRate) || 0,
        type: r.status === 'CANCELLED' || r.status === 'NO_SHOW' ? 'debit' : 'credit',
        status: r.status === 'CONFIRMED' || r.status === 'confirmed' ? 'Pending' : 'Completed'
    }));

    const distributionChannels = [
        { name: 'Booking.com Direct XML', code: 'OTA-BC-991', syncStatus: '2-Way Live Sync', ping: '110ms', status: 'Connected' },
        { name: 'Agoda YCS API v4', code: 'OTA-AG-442', syncStatus: '2-Way Live Sync', ping: '92ms', status: 'Connected' },
        { name: 'Expedia Partner Central', code: 'OTA-EXP-109', syncStatus: '2-Way Live Sync', ping: '135ms', status: 'Connected' },
        { name: 'Airbnb Hospitality Sync', code: 'OTA-AB-772', syncStatus: 'Calendar Sync', ping: '205ms', status: 'Connected' },
        { name: 'Google Hotel Ads', code: 'META-GHA-01', syncStatus: 'Live Rate Feed', ping: '42ms', status: 'Connected' }
    ];

    const activeAmenitiesList = Object.entries(amenities)
        .filter(([, isEnabled]) => isEnabled)
        .map(([name]) => name);

    return (
        <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-4 font-sans text-slate-800 animate-in fade-in duration-150">
            {/* Toast Notification */}
            {toastMessage && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2 ${
                    toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                    {toastMessage.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* 1. HERO PROPERTY BRAND HEADER */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                {/* Hero Banner Cover */}
                <div className="h-28 sm:h-36 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 relative px-6 py-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-white/90">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-white/20 backdrop-blur-md border border-white/30 text-white tracking-wide uppercase">
                                {targetProperty?.property_type || 'Luxury Resort & Hotel'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/25 backdrop-blur-md text-emerald-300 border border-emerald-400/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Live Operational
                            </span>
                        </div>

                        {/* Property Live Time Display */}
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white text-xs font-mono">
                            <Clock size={12} className="text-blue-300" />
                            <span>{localTime}</span>
                            <span className="text-[10px] text-white/70">({settings.timezone.split(' ')[0]})</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="text-white">
                            <p className="text-[11px] font-semibold text-white/75 tracking-wider uppercase">Enterprise Property Identity</p>
                            <p className="text-xs text-white/90 font-mono mt-0.5">Property ID: #{propId} • Chain Node: {targetProperty?.organization_name || 'Central Chain HQ'}</p>
                        </div>
                    </div>
                </div>

                {/* Main Identity Ribbon */}
                <div className="p-4 sm:p-5 pt-0 relative flex flex-col lg:flex-row lg:items-end justify-between gap-4 -mt-10 sm:-mt-12 border-b border-slate-100">
                    <div className="flex items-end gap-3.5 sm:gap-4 min-w-0">
                        {/* Logo Monogram */}
                        <div className="size-20 sm:size-24 rounded-2xl bg-white p-1.5 shadow-md border border-slate-200 shrink-0">
                            <div className="w-full h-full rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-2xl tracking-tight shadow-inner">
                                {propName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'GH'}
                            </div>
                        </div>

                        <div className="min-w-0 pb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                                    {propName}
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                    <Star size={12} fill="currentColor" />
                                    <span>{propGrade}</span>
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0 font-mono">
                                    {propCode}
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3.5 text-xs text-slate-500 mt-1.5 font-medium">
                                <span className="flex items-center gap-1">
                                    <MapPin size={13} className="text-slate-400" />
                                    <span>{propAddress}, {propCity}, {propCountry}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Phone size={13} className="text-slate-400" />
                                    <span>{propPhone}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Mail size={13} className="text-slate-400" />
                                    <span className="text-blue-600">{propEmail}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap self-end">
                        <button
                            type="button"
                            onClick={() => setIsQuickEditOpen(true)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            title="Quick Edit Hotel Profile"
                        >
                            <Edit2 size={13} />
                            <span>Quick Edit</span>
                        </button>

                        {onManageProperty && (
                            <button
                                type="button"
                                onClick={() => onManageProperty(currentTabObj.manageTab)}
                                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                title="Open Multi-Step Setup Wizard"
                            >
                                <Building size={13} className="text-slate-400" />
                                <span>Advanced Setup</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleCopyInfo}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            title="Copy Formatted Property Fact Sheet"
                        >
                            {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-400" />}
                            <span>{copied ? 'Copied' : 'Factsheet'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handlePrintFactSheet}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            title="Print Property Sheet"
                        >
                            <Printer size={13} className="text-slate-400" />
                            <span>Print</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsEmailModalOpen(true)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Mail size={13} className="text-slate-400" />
                            <span>Email</span>
                        </button>
                    </div>
                </div>

                {/* Real Operational Stats Ribbon */}
                <div className="bg-slate-50/70 px-4 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <BedDouble size={16} />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Room Inventory</span>
                            <span className="font-bold text-slate-900 font-mono">{propRooms} Physical Rooms</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                            <Building2 size={16} />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Premises Infrastructure</span>
                            <span className="font-bold text-slate-900 font-mono">{propertyStats.totalBuildings} Wings • {propertyStats.totalFloors} Floors</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Clock size={16} />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Standard Check-In / Out</span>
                            <span className="font-bold text-slate-900 font-mono">{settings.checkInTime} In • {settings.checkOutTime} Out</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="size-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <CreditCard size={16} />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Currency & VAT</span>
                            <span className="font-bold text-slate-900 font-mono">{propCurrency} (৳) • {settings.vatPercentage}% VAT</span>
                        </div>
                    </div>
                </div>

                {/* Pill Tab Navigation Bar */}
                <div className="px-4 bg-white border-t border-slate-100 flex items-center gap-1 overflow-x-auto scrollbar-none py-1.5">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isSelected = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                                    isSelected
                                        ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
                                }`}
                            >
                                <Icon size={13} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />
                                <span>{tab.label}</span>
                                {tab.badge !== undefined && tab.badge > 0 && (
                                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                        isSelected ? 'bg-blue-200 text-blue-900' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. MAIN CONTENT TABS */}
            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 p-4 sm:p-5">
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Left Column: Property & Regional Info */}
                            <div className="space-y-4">
                                <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80">
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70">
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center">
                                                <Building2 size={13} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Corporate & Regional Identity</span>
                                        </div>
                                        <span className="text-[11px] font-semibold text-blue-700">Est. {settings.establishedYear}</span>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                            <span className="text-slate-500 font-medium">Company / Legal Entity</span>
                                            <span className="font-semibold text-slate-900">{settings.legalEntity}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                            <span className="text-slate-500 font-medium">Property Short Code</span>
                                            <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">{propCode}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                            <span className="text-slate-500 font-medium">Street Address</span>
                                            <span className="font-semibold text-slate-900 text-right">{propAddress}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                            <span className="text-slate-500 font-medium">City, Division & Country</span>
                                            <span className="font-semibold text-slate-900">{propCity}, {settings.stateProvince}, {propCountry}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                            <span className="text-slate-500 font-medium">Time Zone & Formatting</span>
                                            <span className="font-semibold text-slate-900">{settings.timezone} • {settings.dateFormat}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1">
                                            <span className="text-slate-500 font-medium">Operational Base Currency</span>
                                            <span className="font-bold text-emerald-700">{propCurrency === 'BDT' ? 'Bangladeshi Taka (৳ BDT)' : propCurrency}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Geographic Location & Transit Landmarks */}
                                <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80">
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70">
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                                <Compass size={13} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Location & Nearby Hubs</span>
                                        </div>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${settings.latitude},${settings.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <span>Open in Google Maps</span>
                                            <ExternalLink size={10} />
                                        </a>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                            <span className="text-slate-500 font-medium">GPS Coordinates</span>
                                            <span className="font-mono font-semibold text-slate-800">{settings.latitude}° N, {settings.longitude}° E</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                            <span className="text-slate-500 font-medium">Nearest Airport</span>
                                            <span className="font-semibold text-slate-800">{settings.airportProximity}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                            <span className="text-slate-500 font-medium">Railway Station / Hub</span>
                                            <span className="font-semibold text-slate-800">{settings.stationProximity}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1">
                                            <span className="text-slate-500 font-medium">Commercial / Diplomatic Zone</span>
                                            <span className="font-semibold text-emerald-700">{settings.diplomaticProximity}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Web Booking Engine & Amenities */}
                            <div className="space-y-4">
                                {/* Direct Booking Engine Showcase */}
                                <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/60 rounded-xl p-4 border border-blue-200/70 flex items-center justify-between gap-3 shadow-2xs">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                                            <QrCode size={15} className="text-blue-600" />
                                            <span>Direct Booking Engine & Mobile Check-In</span>
                                        </div>
                                        <p className="text-xs text-blue-950 font-semibold truncate font-mono">{settings.bookingEngineUrl}</p>
                                        <p className="text-[10.5px] text-blue-700">Guests can reserve rooms directly with zero OTA commission.</p>
                                    </div>
                                    <a
                                        href={settings.bookingEngineUrl.startsWith('http') ? settings.bookingEngineUrl : `https://${settings.bookingEngineUrl}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-2xs shrink-0 flex items-center gap-1 transition-colors"
                                    >
                                        <span>Visit Portal</span>
                                        <ExternalLink size={11} />
                                    </a>
                                </div>

                                {/* Property Description */}
                                <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80">
                                    <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-200/70">
                                        <div className="size-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center">
                                            <Building2 size={13} />
                                        </div>
                                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Property Overview & Concept</span>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                                        {settings.description}
                                    </p>
                                </div>

                                {/* Active Hotel Amenities */}
                                <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80">
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/70">
                                        <div className="flex items-center gap-2">
                                            <div className="size-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                                <CheckCircle2 size={13} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Hotel Amenities & Guest Privileges</span>
                                        </div>
                                        <span className="text-[10.5px] text-slate-400 font-semibold">{activeAmenitiesList.length} Active</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {activeAmenitiesList.map((feat) => (
                                            <span key={feat} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 shadow-2xs flex items-center gap-1">
                                                <Check size={11} className="text-emerald-600 stroke-[2.5]" />
                                                <span>{feat}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. OPERATIONS TAB */}
                {activeTab === 'operations' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                                <div className="flex items-center justify-between text-blue-600 mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-In Time</span>
                                    <Clock size={14} />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 font-mono leading-tight">{settings.checkInTime}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Standard Arrival Window</p>
                            </div>

                            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                                <div className="flex items-center justify-between text-amber-600 mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-Out Time</span>
                                    <Clock size={14} />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 font-mono leading-tight">{settings.checkOutTime}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Standard Guest Departure</p>
                            </div>

                            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                                <div className="flex items-center justify-between text-rose-600 mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hold Release Cutoff</span>
                                    <Clock size={14} />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 font-mono leading-tight">{settings.autoReleaseHour}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Non-Guaranteed Release</p>
                            </div>

                            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                                <div className="flex items-center justify-between text-purple-600 mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Night Audit EOD</span>
                                    <Moon size={14} />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 font-mono leading-tight">{settings.nightAuditTime}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Daily Business Date Rollover</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block pb-2 border-b border-slate-200/70">
                                    Night Audit & Front Office Automation
                                </span>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Auto-Post Room & Tax Charges</span>
                                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                            {settings.autoPostRoomCharges ? 'Active (Automated)' : 'Manual Posting'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Auto-Advance Business Date</span>
                                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                            {settings.autoAdvanceBusinessDate ? 'Enabled (+1 Day)' : 'Manual Rollover'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Weekend Tariff Schedule</span>
                                        <div className="flex gap-1">
                                            {(settings.weekends || ['Friday', 'Saturday']).map((d: string) => (
                                                <span key={d} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10.5px] font-semibold text-slate-700 shadow-2xs">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-slate-500 font-medium">Electronic Door Lock System</span>
                                        <span className="font-semibold text-blue-700 flex items-center gap-1 font-mono">
                                            <Lock size={12} />
                                            <span>{settings.keyCardSystem || 'VingCard / Assa Abloy Visionline'}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block pb-2 border-b border-slate-200/70">
                                    Guest House Rules & Policies
                                </span>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Smoking Policy</span>
                                        <span className="font-semibold text-slate-800">{settings.smokingPolicyText}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Pet Policy</span>
                                        <span className="font-semibold text-slate-800">{settings.petPolicyText}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Visitor ID Requirement</span>
                                        <span className="font-semibold text-slate-800">{settings.visitorIdentityRule}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-slate-500 font-medium">Meal Plan Synchronization</span>
                                        <span className="font-semibold text-slate-800">{settings.mealPlanSyncMode}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. POLICIES & GUARANTEES TAB */}
                {activeTab === 'policies' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                                <div className="flex items-center gap-1.5 text-rose-600 pb-1.5 border-b border-slate-200/70">
                                    <Clock size={13} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">Cancellation & No-Show</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Standard Cancellation Rule</span>
                                        <p className="font-semibold text-slate-900 mt-0.5">{settings.cancellationRule}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Grace Period</span>
                                        <p className="font-semibold text-slate-900 mt-0.5">{settings.gracePeriodHours} Hours after arrival standard cutoff</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">No-Show Forfeiture</span>
                                        <p className="font-bold text-rose-600 mt-0.5">{settings.noShowPolicy}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                                <div className="flex items-center gap-1.5 text-blue-600 pb-1.5 border-b border-slate-200/70">
                                    <Briefcase size={13} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">Corporate & Travel Agency Terms</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">City Ledger Credit Limit</span>
                                        <p className="font-semibold text-slate-900 mt-0.5">৳ {Number(settings.cityLedgerLimitBDT || 500000).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Travel Agency Commission</span>
                                        <p className="font-semibold text-slate-900 mt-0.5">{settings.agencyCommissionPct}% Standard OTA / Agency</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bill to Company (BTC)</span>
                                        <p className="font-semibold text-emerald-700 mt-0.5">{settings.allowBillToCompany ? 'Allowed for verified corporate accounts' : 'Prepayment Required'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                                <div className="flex items-center gap-1.5 text-amber-600 pb-1.5 border-b border-slate-200/70">
                                    <Building2 size={13} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">Groups & Overbooking Policy</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Group Booking Threshold</span>
                                        <p className="font-semibold text-slate-900 mt-0.5">{settings.groupDefinitionRooms || 5}+ Rooms constitutes a group</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Group Advance Deposit</span>
                                        <p className="font-semibold text-slate-900 mt-0.5">{settings.groupDepositTerms || '50% Advance at confirmation, 50% on check-in'}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overbooking Protection Limit</span>
                                        <p className="font-bold text-emerald-700 mt-0.5">
                                            {settings.allowOverbooking ? `Active up to ${settings.overbookingLimit || '5%'}` : 'Strict Zero Overbooking (0%)'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. FINANCE, TAX & BANKING TAB */}
                {activeTab === 'finance' && (
                    <div className="space-y-4">
                        {/* Statutory Licenses & Compliance */}
                        <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                                <div className="flex items-center gap-2">
                                    <div className="size-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center">
                                        <FileCheck size={13} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Statutory Tax & Regulatory Registration</span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    NBR COMPLIANT
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">VAT Registration (BIN)</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm">{settings.taxIdNumber || '001294819-0101'}</span>
                                    <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">Mushak-6.3 Electronic Billing</span>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Municipal Trade License</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm">{settings.tradeLicenseNo || 'TL-DNCC-2026-9941'}</span>
                                    <span className="text-[10px] text-blue-600 block mt-1 font-semibold">Valid till: {settings.tradeLicenseExpiry || '30 Jun 2027'}</span>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Civil Defense & Fire Safety</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm">{settings.fireSafetyCertNo || 'FS-DHK-2025-441'}</span>
                                    <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">Inspected & Certified</span>
                                </div>
                                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Police Special Branch (C-Form)</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm">{settings.policeCFormId || 'SB-CF-GPD-881'}</span>
                                    <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">Foreign Guest Portal Active</span>
                                </div>
                            </div>
                        </div>

                        {/* Designated Bank Accounts with Add Action */}
                        <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                                <div className="flex items-center gap-2">
                                    <div className="size-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                        <Building2 size={13} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Designated Bank Accounts & Settlement Lines</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAddBankModalOpen(true)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                >
                                    <Plus size={12} />
                                    <span>Add Bank Account</span>
                                </button>
                            </div>

                            {bankAccounts.length === 0 ? (
                                <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-300">
                                    <CreditCard size={28} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs font-semibold text-slate-700">No bank accounts configured for this property yet</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Add designated bank lines to display on guest folios and B2B corporate invoices.</p>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddBankModalOpen(true)}
                                        className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={12} />
                                        <span>Add First Bank Account</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {bankAccounts.map((acc) => (
                                        <div key={acc.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex justify-between items-center group">
                                            <div className="min-w-0 pr-2">
                                                <p className="font-bold text-slate-900 text-xs truncate leading-tight">{acc.bankName}</p>
                                                <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{acc.accountNum}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{acc.accountName} {acc.swift ? `• SWIFT: ${acc.swift}` : ''}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteBank(acc.id)}
                                                className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                                title="Remove Account"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Folio Settlements Audit Trail */}
                        <div>
                            <div className="flex items-center justify-between pb-2 mb-1.5">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Operational Settlements Audit Trail</span>
                                <span className="text-[11px] text-slate-400 font-mono">{transactions.length} Recorded Transactions</span>
                            </div>
                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-[10.5px] text-slate-500 font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-3.5 py-2.5">Voucher / ID</th>
                                            <th className="px-3.5 py-2.5">Date</th>
                                            <th className="px-3.5 py-2.5">Description</th>
                                            <th className="px-3.5 py-2.5 text-right">Amount</th>
                                            <th className="px-3.5 py-2.5 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {transactions.map(txn => (
                                            <tr key={txn.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-3.5 py-2 font-mono text-slate-500 text-[11px]">{txn.id}</td>
                                                <td className="px-3.5 py-2 text-slate-800 text-[11px]">{txn.date}</td>
                                                <td className="px-3.5 py-2 text-slate-900 font-medium text-xs">{txn.desc}</td>
                                                <td className={`px-3.5 py-2 text-right font-bold font-mono text-xs ${txn.type === 'credit' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                    {txn.type === 'credit' ? '+' : ''}৳ {Math.abs(txn.amount).toLocaleString()}
                                                </td>
                                                <td className="px-3.5 py-2 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                        txn.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                    }`}>
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

                {/* 5. OUTLETS & POS TAB */}
                {activeTab === 'outlets' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Revenue Outlets & Point of Sale Terminals</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">Dining rooms, banquet halls, rooftop lounges and wellness spa stations</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddOutletModalOpen(true)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            >
                                <Plus size={13} />
                                <span>Add New Outlet</span>
                            </button>
                        </div>

                        {posOutlets.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
                                <Utensils size={32} className="mx-auto text-slate-300 mb-2" />
                                <h4 className="text-xs font-bold text-slate-800">No Food & Beverage Outlets Configured</h4>
                                <p className="text-[11px] text-slate-400 mt-0.5 max-w-md mx-auto">
                                    Configure restaurant dining rooms, rooftop cafes, or banquet halls for automatic KOT generation and room charge folio postings.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsAddOutletModalOpen(true)}
                                    className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus size={12} />
                                    <span>Create First Outlet</span>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                {posOutlets.map((outlet) => (
                                    <div key={outlet.id} className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-200/80 space-y-2.5 hover:border-blue-300 transition-colors shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <div className="size-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                                <Utensils size={15} />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {outlet.status}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteOutlet(outlet.id)}
                                                    className="text-slate-300 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                                    title="Remove Outlet"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-xs">{outlet.name}</h4>
                                            <p className="text-[10.5px] text-blue-600 font-semibold">{outlet.type}</p>
                                        </div>
                                        <div className="space-y-1.5 text-xs border-t border-slate-200/60 pt-2 text-slate-600">
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">Hours:</span>
                                                <span className="font-medium text-slate-800">{outlet.hours}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">Capacity:</span>
                                                <span className="font-medium text-slate-800">{outlet.capacity}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">POS Terminal:</span>
                                                <span className="font-mono text-slate-800 font-semibold text-[10.5px]">{outlet.posStation}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 6. CHANNELS & GDS TAB */}
                {activeTab === 'distribution' && (
                    <div className="space-y-4">
                        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-3">
                                <div className="size-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                    <Activity size={20} className="animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900 text-sm">{settings.channelManager || 'SiteMinder / RateGain 2-Way Channel Gateway'}</h3>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            LIVE 2-WAY SYNC
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Real-time room inventory, ARI updates, and OTA reservation delivery connected.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* GDS Identity Codes */}
                        <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Global Distribution System (GDS) Credentials</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { name: 'Amadeus GDS', code: settings.gdsAmadeus || '1A-DHK-992' },
                                    { name: 'Sabre GDS', code: settings.gdsSabre || 'AA-GPD-441' },
                                    { name: 'Galileo / Travelport', code: settings.gdsGalileo || '1G-77491-01' },
                                    { name: 'Worldspan GDS', code: settings.gdsWorldspan || '1P-DH01-12' },
                                ].map((gds) => (
                                    <div key={gds.name} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                                        <span className="text-[10px] text-slate-400 font-medium block">{gds.name}</span>
                                        <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">{gds.code}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Connected OTA Channels Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Online Travel Agencies (OTA Integration Status)</span>
                                <span className="text-[11px] text-slate-400 font-mono">5 Active Feeds</span>
                            </div>
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-500 uppercase font-bold">
                                    <tr>
                                        <th className="px-3.5 py-2.5">Channel Provider</th>
                                        <th className="px-3.5 py-2.5">Hotel Account ID</th>
                                        <th className="px-3.5 py-2.5">Sync Protocol</th>
                                        <th className="px-3.5 py-2.5">Average Latency</th>
                                        <th className="px-3.5 py-2.5 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {distributionChannels.map((ch) => (
                                        <tr key={ch.code} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-3.5 py-2.5 font-semibold text-slate-900">{ch.name}</td>
                                            <td className="px-3.5 py-2.5 font-mono text-slate-500 text-[11px]">{ch.code}</td>
                                            <td className="px-3.5 py-2.5 text-slate-600">{ch.syncStatus}</td>
                                            <td className="px-3.5 py-2.5 font-mono text-slate-500 text-[11px]">{ch.ping}</td>
                                            <td className="px-3.5 py-2.5 text-center">
                                                <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
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

                {/* 7. MANAGEMENT & SAFETY TAB */}
                {activeTab === 'team' && (
                    <div className="space-y-4">
                        {/* 24/7 Emergency Hotlines */}
                        <div className="bg-rose-50/40 rounded-xl p-3.5 border border-rose-200/70 space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-rose-200/60">
                                <div className="flex items-center gap-2">
                                    <div className="size-6 rounded bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                                        <ShieldAlert size={14} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">24/7 Emergency & Safety Hotlines</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    PRIORITY ASSISTANCE
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                                {[
                                    { label: 'House Doctor (24/7)', name: 'Medical Duty Officer', phone: '+880 1711 999111' },
                                    { label: 'Hospital Emergency ER', name: 'United Hospital ER', phone: '+880 2 8836000' },
                                    { label: 'Police Control Room', name: 'Gulshan Thana Duty', phone: '+880 2 9885566' },
                                    { label: 'National Fire & Rescue', name: 'Fire Service Dispatch (999)', phone: '999' }
                                ].map((line, idx) => (
                                    <div key={idx} className="p-3 bg-white border border-rose-100 rounded-xl shadow-2xs">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">{line.label}</span>
                                        <span className="font-bold text-slate-900 text-xs block mt-0.5">{line.name}</span>
                                        <span className="font-mono text-rose-600 font-bold text-[11.5px] mt-0.5 block">{line.phone}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Key Department Heads */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Hotel Management Team (Department Heads)</h4>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Primary points of contact for corporate accounts, vendors, and VIP guests</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAddContactModalOpen(true)}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                >
                                    <Plus size={13} />
                                    <span>Add Department Head</span>
                                </button>
                            </div>

                            {contacts.length === 0 ? (
                                <div className="p-6 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-300">
                                    <User size={28} className="mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs font-semibold text-slate-700">No department heads registered yet</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Register key personnel (General Manager, Front Office Manager, Housekeeper) for guest escalations.</p>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddContactModalOpen(true)}
                                        className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={12} />
                                        <span>Add First Contact</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                    {contacts.map((poc) => (
                                        <div key={poc.id} className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between gap-3 bg-white shadow-2xs hover:border-blue-300 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="size-10 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                                                    {poc.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'HM'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 text-xs truncate leading-tight">{poc.name}</p>
                                                    <p className="text-blue-600 text-[10.5px] font-semibold uppercase tracking-wide leading-none mt-0.5">{poc.role}</p>
                                                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                                                        <span className="flex items-center gap-1 font-mono">
                                                            <Phone size={10} className="text-slate-400" />
                                                            <span>{poc.phone}</span>
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Mail size={10} className="text-slate-400" />
                                                            <span className="text-slate-600">{poc.email}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteContact(poc.id)}
                                                className="text-slate-300 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                                title="Remove Contact"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 8. FOLIO & NUMBERING TAB */}
                {activeTab === 'numbering' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {[
                                { label: 'Reservation Prefix', value: `${settings.reservationPrefix || 'RES-'}1001` },
                                { label: 'Tax Invoice Prefix', value: `${settings.invoicePrefix || 'INV-'}1001` },
                                { label: 'Guest Folio Prefix', value: `${settings.folioPrefix || 'FOL-'}1001` },
                                { label: 'Restaurant KOT Prefix', value: `${settings.kotPrefix || 'KOT-'}5001` },
                                { label: 'Money Receipt Prefix', value: `${settings.receiptPrefix || 'REC-'}2001` },
                            ].map((doc) => (
                                <div key={doc.label} className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{doc.label}</span>
                                    <span className="font-mono font-bold text-blue-700 text-sm mt-1 block">{doc.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block pb-2 border-b border-slate-200/70">
                                    Document Numbering Preferences
                                </span>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Reset Sequence Annually</span>
                                        <span className="font-semibold text-emerald-700">{settings.resetAnnually ? 'Enabled (Fiscal Year)' : 'Continuous Running Sequence'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Mushak-6.3 Itemized VAT Print</span>
                                        <span className="font-semibold text-emerald-700">Yes ({settings.vatPercentage}% VAT + {settings.serviceChargePercentage}% SC)</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-slate-500 font-medium">Automatic Checkout e-Invoice Email</span>
                                        <span className="font-semibold text-emerald-700">{settings.enableCheckoutFolioEmail ? 'Active' : 'Disabled'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block pb-2 border-b border-slate-200/70">
                                    Invoice Terms & Legal Clause
                                </span>
                                <p className="text-xs text-slate-600 leading-relaxed">{settings.invoiceNotes || 'Thank you for choosing Grand Palace Hotel. All bills are subject to 15% VAT and 10% Service Charge as per Bangladesh Government hospitality regulations.'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 9. SECURITY & BACKUP TAB */}
                {activeTab === 'automation' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70">
                                    <div className="size-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center">
                                        <Mail size={13} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Email (SMTP) & SMS Delivery Gateway</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">SMTP Server</span>
                                        <span className="font-mono font-semibold text-slate-800">{settings.smtpHost || 'smtp.sendgrid.net'}:{settings.smtpPort || '587'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Sender Display Name</span>
                                        <span className="font-semibold text-slate-800">{settings.senderName || propName}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">SMS Gateway Provider</span>
                                        <span className="font-semibold text-slate-800">{settings.smsGatewayProvider || 'Banglalink / Robi Enterprise SMS'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-slate-500 font-medium">Automated Messaging</span>
                                        <span className="font-semibold text-emerald-700">Welcome SMS, WhatsApp Concierge, Checkout Folio</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/70">
                                    <div className="size-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center">
                                        <Database size={13} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Database Security & Cloud Replication</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Cloud PostgreSQL High Availability</span>
                                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">TiDB Cloud Active (3-Zone Sync)</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Automatic Snapshot Frequency</span>
                                        <span className="font-semibold text-slate-800">Every 6 Hours (Continuous WAL)</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-200/50">
                                        <span className="text-slate-500 font-medium">Data Retention Policy</span>
                                        <span className="font-semibold text-slate-800">7 Years (NBR Tax Audit Compliant)</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-slate-500 font-medium">Session Idle Auto-Lock</span>
                                        <span className="font-semibold text-slate-800">{settings.sessionTimeoutMinutes || 30} Minutes</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* QUICK EDIT MODAL */}
            {isQuickEditOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Quick Edit Hotel Profile</h3>
                                <p className="text-[11px] text-slate-500">Update identity, operational policies and statutory details</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsQuickEditOpen(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="px-5 border-b border-slate-100 flex gap-2 pt-2 bg-slate-50">
                            {[
                                { id: 'identity', label: 'Identity & Address' },
                                { id: 'operations', label: 'Operations & Hours' },
                                { id: 'finance', label: 'Tax & Compliance' },
                                { id: 'amenities', label: 'Amenities' },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setQuickEditTab(t.id as any)}
                                    className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                                        quickEditTab === t.id ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
                            {quickEditTab === 'identity' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Hotel Property Name</label>
                                        <input
                                            type="text"
                                            value={settings.legalEntity || propName}
                                            onChange={(e) => setSettings({ ...settings, legalEntity: e.target.value })}
                                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">Street Address</label>
                                            <input
                                                type="text"
                                                value={propAddress}
                                                onChange={(e) => setSettings({ ...settings, corporateAddress: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">Website URL</label>
                                            <input
                                                type="text"
                                                value={settings.website}
                                                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Property Description</label>
                                        <textarea
                                            rows={3}
                                            value={settings.description}
                                            onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                        />
                                    </div>
                                </div>
                            )}

                            {quickEditTab === 'operations' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">Standard Check-In Time</label>
                                            <input
                                                type="text"
                                                value={settings.checkInTime}
                                                onChange={(e) => setSettings({ ...settings, checkInTime: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">Standard Check-Out Time</label>
                                            <input
                                                type="text"
                                                value={settings.checkOutTime}
                                                onChange={(e) => setSettings({ ...settings, checkOutTime: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">Night Audit Schedule Time</label>
                                            <input
                                                type="text"
                                                value={settings.nightAuditTime}
                                                onChange={(e) => setSettings({ ...settings, nightAuditTime: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">Hold Release Cutoff</label>
                                            <input
                                                type="text"
                                                value={settings.autoReleaseHour}
                                                onChange={(e) => setSettings({ ...settings, autoReleaseHour: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {quickEditTab === 'finance' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">VAT / Tax ID (BIN)</label>
                                            <input
                                                type="text"
                                                value={settings.taxIdNumber}
                                                onChange={(e) => setSettings({ ...settings, taxIdNumber: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">Trade License No</label>
                                            <input
                                                type="text"
                                                value={settings.tradeLicenseNo}
                                                onChange={(e) => setSettings({ ...settings, tradeLicenseNo: e.target.value })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">Govt VAT Rate (%)</label>
                                            <input
                                                type="number"
                                                value={settings.vatPercentage}
                                                onChange={(e) => setSettings({ ...settings, vatPercentage: Number(e.target.value) })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">Hotel Service Charge (%)</label>
                                            <input
                                                type="number"
                                                value={settings.serviceChargePercentage}
                                                onChange={(e) => setSettings({ ...settings, serviceChargePercentage: Number(e.target.value) })}
                                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {quickEditTab === 'amenities' && (
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.keys(amenities).map((amenityName) => (
                                        <label key={amenityName} className="p-2 border border-slate-200 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(amenities[amenityName])}
                                                onChange={() => handleToggleAmenity(amenityName)}
                                                className="rounded text-blue-600 cursor-pointer"
                                            />
                                            <span className="font-medium text-slate-800 text-[11.5px]">{amenityName}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
                            <button
                                type="button"
                                onClick={() => setIsQuickEditOpen(false)}
                                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleSaveSettingsToDB(settings)}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <Save size={13} />
                                <span>{isSaving ? 'Saving...' : 'Save Changes to Database'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD BANK MODAL */}
            {isAddBankModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
                    <form onSubmit={handleAddBank} className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Add Property Bank Account</h3>
                            <button type="button" onClick={() => setIsAddBankModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="space-y-2.5 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Bank Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Standard Chartered Bank / Eastern Bank"
                                    value={newBank.bankName}
                                    onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Account Title</label>
                                <input
                                    type="text"
                                    placeholder={propName}
                                    value={newBank.accountName}
                                    onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Account Number</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. 01-8849201-01"
                                    value={newBank.accountNum}
                                    onChange={(e) => setNewBank({ ...newBank, accountNum: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">SWIFT / BIC</label>
                                    <input
                                        type="text"
                                        placeholder="SCBLBDDX"
                                        value={newBank.swift}
                                        onChange={(e) => setNewBank({ ...newBank, swift: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Branch Name</label>
                                    <input
                                        type="text"
                                        placeholder="Gulshan Branch"
                                        value={newBank.branch}
                                        onChange={(e) => setNewBank({ ...newBank, branch: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                            <button type="button" onClick={() => setIsAddBankModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold">
                                Cancel
                            </button>
                            <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold">
                                Save Bank Account
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ADD OUTLET MODAL */}
            {isAddOutletModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
                    <form onSubmit={handleAddOutlet} className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Add Food & Beverage / POS Outlet</h3>
                            <button type="button" onClick={() => setIsAddOutletModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="space-y-2.5 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Outlet Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Horizon Rooftop Lounge"
                                    value={newOutlet.name}
                                    onChange={(e) => setNewOutlet({ ...newOutlet, name: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Outlet Category</label>
                                    <select
                                        value={newOutlet.type}
                                        onChange={(e) => setNewOutlet({ ...newOutlet, type: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                    >
                                        <option value="All-Day Dining Restaurant">All-Day Dining</option>
                                        <option value="Rooftop Lounge & Cafe">Rooftop Lounge</option>
                                        <option value="Banquet & Convention Hall">Banquet Hall</option>
                                        <option value="Spa & Health Club">Wellness Spa</option>
                                        <option value="Bar & Pub">Bar & Pub</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Seating Capacity</label>
                                    <input
                                        type="text"
                                        placeholder="80 Seats"
                                        value={newOutlet.capacity}
                                        onChange={(e) => setNewOutlet({ ...newOutlet, capacity: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Operating Hours</label>
                                    <input
                                        type="text"
                                        placeholder="07:00 AM - 11:00 PM"
                                        value={newOutlet.hours}
                                        onChange={(e) => setNewOutlet({ ...newOutlet, hours: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">POS / KOT Station</label>
                                    <input
                                        type="text"
                                        placeholder="KOT-1"
                                        value={newOutlet.posStation}
                                        onChange={(e) => setNewOutlet({ ...newOutlet, posStation: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                            <button type="button" onClick={() => setIsAddOutletModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold">
                                Cancel
                            </button>
                            <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold">
                                Save Outlet
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ADD CONTACT MODAL */}
            {isAddContactModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
                    <form onSubmit={handleAddContact} className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-900">Add Key Management Contact</h3>
                            <button type="button" onClick={() => setIsAddContactModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                                <X size={15} />
                            </button>
                        </div>
                        <div className="space-y-2.5 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Mohammad Rahat Khan"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                />
                            </div>
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Designation / Role</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Front Office Manager / Executive Housekeeper"
                                    value={newContact.role}
                                    onChange={(e) => setNewContact({ ...newContact, role: e.target.value })}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Direct Phone</label>
                                    <input
                                        type="text"
                                        placeholder="+880 1711-000000"
                                        value={newContact.phone}
                                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Official Email</label>
                                    <input
                                        type="email"
                                        placeholder="fom@hotel.com"
                                        value={newContact.email}
                                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                            <button type="button" onClick={() => setIsAddContactModalOpen(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold">
                                Cancel
                            </button>
                            <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold">
                                Save Contact
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <SendEmailModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                defaultSubject={`Inquiry regarding ${propName}`}
            />
        </div>
    );
};

export default HotelInfoView;
