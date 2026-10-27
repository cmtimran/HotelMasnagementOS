import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Building2, MapPin, Globe, CreditCard, Star, Clock, Moon, Monitor,
    User, Edit2, Copy, Mail, ShieldCheck, Phone, CheckCircle2, AlertCircle,
    Layers, Check, QrCode, Utensils, ShieldAlert,
    ExternalLink, Activity, Lock, FileCheck, Compass,
    Receipt, Database, Briefcase, Printer, Plus, Trash2, X, Save,
    Building, BedDouble, Camera, Upload, ChevronLeft, ChevronRight
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

    // Property Logo State
    const [logoUrl, setLogoUrl] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(`hotel_prop_logo_${propId}`);
            if (saved) return saved;
        }
        return (targetProperty?.logo_url || targetProperty?.logoUrl || targetProperty?.settings?.logoUrl || '');
    });
    const [isLogoModalOpen, setIsLogoModalOpen] = useState<boolean>(false);
    const [tempLogoUrl, setTempLogoUrl] = useState<string>('');

    // Tab Scrolling Ref & Handler
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const handleScrollTabs = (direction: 'left' | 'right') => {
        if (tabsContainerRef.current) {
            tabsContainerRef.current.scrollBy({ left: direction === 'left' ? -220 : 220, behavior: 'smooth' });
        }
    };

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

    const handleSaveLogo = (newUrl: string) => {
        setLogoUrl(newUrl);
        if (typeof window !== 'undefined') {
            if (newUrl) {
                localStorage.setItem(`hotel_prop_logo_${propId}`, newUrl);
            } else {
                localStorage.removeItem(`hotel_prop_logo_${propId}`);
            }
        }
        const updated = { ...settings, logoUrl: newUrl };
        setSettings(updated);
        handleSaveSettingsToDB(updated);
        setIsLogoModalOpen(false);
        showToast(newUrl ? 'Property logo updated successfully!' : 'Property logo reset to monogram');
    };

    const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image file (PNG, JPG, SVG, WebP).', 'error');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showToast('Image size should be less than 2MB.', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            if (base64) {
                setTempLogoUrl(base64);
            }
        };
        reader.readAsDataURL(file);
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
                    if (p.logo_url) setLogoUrl(p.logo_url);
                    else if (dbSettings.logoUrl) setLogoUrl(dbSettings.logoUrl);
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
                    if (parsed.settings.logoUrl) setLogoUrl(parsed.settings.logoUrl);
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

    // Extract valid IANA timezone (e.g. "Asia/Dhaka") from settings.timezone or targetProperty
    const propertyTimezone = useMemo(() => {
        const raw = settings?.timezone || targetProperty?.timezone || 'Asia/Dhaka (GMT+06:00)';
        const clean = raw.split(' ')[0].trim();
        try {
            Intl.DateTimeFormat(undefined, { timeZone: clean });
            return clean;
        } catch {
            return 'Asia/Dhaka';
        }
    }, [settings?.timezone, targetProperty?.timezone]);

    // Live Clock with exact Property Timezone
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            try {
                const formattedTime = now.toLocaleTimeString('en-US', {
                    timeZone: propertyTimezone,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                });
                setLocalTime(formattedTime);
            } catch {
                setLocalTime(now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                }));
            }
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, [propertyTimezone]);

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

    // Tabs definition with clean icons & space-optimized labels
    const tabs = [
        { id: 'overview', manageTab: 'identity', label: 'Overview', icon: Building2 },
        { id: 'operations', manageTab: 'operations', label: 'Operations', icon: Clock },
        { id: 'policies', manageTab: 'operations', label: 'Policies', icon: ShieldCheck },
        { id: 'finance', manageTab: 'finance', label: 'Finance & Tax', icon: CreditCard },
        { id: 'outlets', manageTab: 'system', label: 'Outlets & POS', icon: Layers, badge: posOutlets.length },
        { id: 'distribution', manageTab: 'system', label: 'Channels & GDS', icon: Globe },
        { id: 'team', manageTab: 'branding', label: 'Management', icon: User, badge: contacts.length },
        { id: 'numbering', manageTab: 'numbering', label: 'Folio & Billing', icon: Receipt },
        { id: 'automation', manageTab: 'communication', label: 'Security & System', icon: Monitor },
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

            {/* 1. EXECUTIVE PROPERTY BRAND HERO CARD */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Subtle Luxury Gradient Accent Line */}
                <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500"></div>

                {/* Main Identity Area */}
                <div className="p-5 sm:p-7">
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                        {/* Left: Avatar + Identity */}
                        <div className="flex items-start sm:items-center gap-4.5 min-w-0 flex-1">
                            {/* Modern Hotel Logo Monogram with Hover Change Overlay */}
                            <div className="relative shrink-0 group">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTempLogoUrl(logoUrl);
                                        setIsLogoModalOpen(true);
                                    }}
                                    className="size-16 sm:size-20 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 text-white flex items-center justify-center font-black text-2xl sm:text-3xl tracking-tight shadow-sm ring-4 ring-slate-100 overflow-hidden cursor-pointer relative transition-transform hover:scale-[1.02] text-center"
                                    title="Click to change hotel brand logo"
                                >
                                    {logoUrl ? (
                                        <img src={logoUrl} alt={propName} className="size-full object-cover" />
                                    ) : (
                                        <span>{propName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'GH'}</span>
                                    )}
                                    <div className="absolute inset-0 bg-black/55 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera size={16} />
                                        <span className="text-[9px] font-bold mt-0.5 tracking-tight uppercase">Change</span>
                                    </div>
                                </button>
                                <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-emerald-500 ring-2 ring-white" title="Active Operating Property"></span>
                            </div>

                            <div className="min-w-0 flex-1 space-y-1.5">
                                {/* Badge Row */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
                                        <Star size={11} className="fill-amber-500 text-amber-500" />
                                        <span>{propGrade}</span>
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                                        {propCode}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Live Operational
                                    </span>
                                </div>

                                {/* Hotel Name */}
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug py-0.5 break-words">
                                    {propName}
                                </h1>

                                {/* Contact & Location Strip */}
                                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-0.5 font-medium">
                                    <span className="flex items-center gap-1.5 min-w-0">
                                        <MapPin size={13.5} className="text-slate-400 shrink-0" />
                                        <span className="truncate">{propAddress}, {propCity}, {propCountry}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 shrink-0">
                                        <Phone size={13.5} className="text-slate-400 shrink-0" />
                                        <span>{propPhone}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 shrink-0">
                                        <Mail size={13.5} className="text-slate-400 shrink-0" />
                                        <a href={`mailto:${propEmail}`} className="text-blue-600 hover:underline">{propEmail}</a>
                                    </span>
                                    {Boolean(settings.website) && (
                                        <span className="flex items-center gap-1.5 shrink-0">
                                            <Globe size={13.5} className="text-slate-400 shrink-0" />
                                            <a
                                                href={settings.website.startsWith('http') ? settings.website : `https://${settings.website}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-slate-600 hover:text-blue-600 flex items-center gap-1"
                                            >
                                                <span>{settings.website}</span>
                                                <ExternalLink size={10} />
                                            </a>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Live Clock & Actions */}
                        <div className="flex flex-col sm:flex-row xl:flex-col items-start sm:items-center xl:items-end justify-between gap-3 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100">
                            {/* Local Clock */}
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-mono shadow-2xs">
                                <Clock size={13} className="text-blue-600 shrink-0" />
                                <span className="font-bold text-slate-900">{localTime}</span>
                                <span className="text-[10px] text-slate-500 font-sans font-semibold">({propertyTimezone})</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setIsQuickEditOpen(true)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                    title="Quick Edit Hotel Profile"
                                >
                                    <Edit2 size={13} />
                                    <span>Quick Edit</span>
                                </button>

                                {onManageProperty && (
                                    <button
                                        type="button"
                                        onClick={() => onManageProperty(currentTabObj.manageTab)}
                                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Open Multi-Step Setup Wizard"
                                    >
                                        <Building size={13} className="text-slate-500" />
                                        <span>Advanced Setup</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={handleCopyInfo}
                                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    title="Copy Property Fact Sheet"
                                >
                                    {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} className="text-slate-400" />}
                                    <span>{copied ? 'Copied' : 'Factsheet'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handlePrintFactSheet}
                                    className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                                    title="Print Property Sheet"
                                >
                                    <Printer size={14} className="text-slate-500" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsEmailModalOpen(true)}
                                    className="p-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                                    title="Email Profile"
                                >
                                    <Mail size={14} className="text-slate-500" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Operational Stats Ribbon */}
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/50 border-t border-slate-100 text-xs">
                    <div className="p-4 flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                            <BedDouble size={18} />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-slate-500">Physical Rooms</p>
                            <p className="text-base font-bold text-slate-900 font-mono">{propRooms} Rooms</p>
                            <p className="text-[10px] text-emerald-600 font-medium">100% Active in DB</p>
                        </div>
                    </div>

                    <div className="p-4 flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                            <Building2 size={18} />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-slate-500">Premises Layout</p>
                            <p className="text-base font-bold text-slate-900 font-mono">{propertyStats.totalBuildings} Wings • {propertyStats.totalFloors} Floors</p>
                            <p className="text-[10px] text-slate-500">Main Tower & Annex</p>
                        </div>
                    </div>

                    <div className="p-4 flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                            <Clock size={18} />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-slate-500">Check-In / Check-Out</p>
                            <p className="text-base font-bold text-slate-900 font-mono">{settings.checkInTime} In • {settings.checkOutTime} Out</p>
                            <p className="text-[10px] text-slate-500">Night Audit {settings.nightAuditTime}</p>
                        </div>
                    </div>

                    <div className="p-4 flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                            <CreditCard size={18} />
                        </div>
                        <div>
                            <p className="text-[11px] font-medium text-slate-500">Tax & Currency</p>
                            <p className="text-base font-bold text-slate-900 font-mono">{propCurrency} (৳) • {settings.vatPercentage}% VAT</p>
                            <p className="text-[10px] text-slate-500">{settings.serviceChargePercentage}% Service Charge</p>
                        </div>
                    </div>
                </div>

                {/* Pill Tab Navigation Bar - Scrollable with Navigation Chevrons & Edge Fades */}
                <div className="relative border-t border-slate-100 bg-white">
                    {/* Left Scroll Button */}
                    <button
                        type="button"
                        onClick={() => handleScrollTabs('left')}
                        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 size-7 rounded-lg bg-white/95 shadow-md border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
                        title="Scroll Left"
                    >
                        <ChevronLeft size={14} />
                    </button>

                    {/* Left Edge Gradient Fade */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-5" />

                    {/* Scrollable Tabs Track */}
                    <div
                        ref={tabsContainerRef}
                        className="px-8 py-2 flex items-center gap-1.5 overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isSelected = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                                        isSelected
                                            ? 'bg-blue-600 text-white shadow-xs font-bold'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent hover:border-slate-200/60'
                                    }`}
                                >
                                    <Icon size={13} className={isSelected ? 'text-white' : 'text-slate-400'} />
                                    <span>{tab.label}</span>
                                    {tab.badge !== undefined && tab.badge > 0 && (
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                            isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Right Edge Gradient Fade */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-5" />

                    {/* Right Scroll Button */}
                    <button
                        type="button"
                        onClick={() => handleScrollTabs('right')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 z-10 size-7 rounded-lg bg-white/95 shadow-md border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
                        title="Scroll Right"
                    >
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* 2. MAIN CONTENT TABS CONTAINER */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 sm:p-7">
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: Property & Regional Info */}
                            <div className="space-y-5">
                                <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                                <Building2 size={16} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Corporate & Regional Identity</h3>
                                                <p className="text-[11px] text-slate-400">Legal registration and geographical node</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60">Est. {settings.establishedYear}</span>
                                    </div>

                                    <div className="space-y-2.5 text-xs">
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">Company / Legal Entity</span>
                                            <span className="font-semibold text-slate-900">{settings.legalEntity}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">Property Code</span>
                                            <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-slate-200">{propCode}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">Street Address</span>
                                            <span className="font-semibold text-slate-900 text-right">{propAddress}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">City, Division & Country</span>
                                            <span className="font-semibold text-slate-900">{propCity}, {settings.stateProvince}, {propCountry}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">Timezone & Format</span>
                                            <span className="font-semibold text-slate-900">{settings.timezone} • {settings.dateFormat}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1">
                                            <span className="text-slate-500 font-medium">Operational Base Currency</span>
                                            <span className="font-bold text-emerald-700">{propCurrency === 'BDT' ? 'Bangladeshi Taka (৳ BDT)' : propCurrency}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Geographic Location & Transit Landmarks */}
                                <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                                <Compass size={16} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Location & Nearby Hubs</h3>
                                                <p className="text-[11px] text-slate-400">Airport, railway station, and transit connectivity</p>
                                            </div>
                                        </div>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${settings.latitude},${settings.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs"
                                        >
                                            <span>Open Maps</span>
                                            <ExternalLink size={11} />
                                        </a>
                                    </div>

                                    <div className="space-y-2.5 text-xs">
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">GPS Coordinates</span>
                                            <span className="font-mono font-semibold text-slate-800">{settings.latitude}° N, {settings.longitude}° E</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">Nearest International Airport</span>
                                            <span className="font-semibold text-slate-800">{settings.airportProximity}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                            <span className="text-slate-500 font-medium">Railway Station / Terminal</span>
                                            <span className="font-semibold text-slate-800">{settings.stationProximity}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-1">
                                            <span className="text-slate-500 font-medium">Commercial & Diplomatic Zone</span>
                                            <span className="font-semibold text-emerald-700">{settings.diplomaticProximity}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Web Booking Engine & Amenities */}
                            <div className="space-y-5">
                                {/* Direct Booking Engine Showcase */}
                                <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-purple-50/60 rounded-xl p-5 border border-blue-200/70 flex items-center justify-between gap-4 shadow-2xs">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                                            <QrCode size={15} className="text-blue-600" />
                                            <span>Direct Booking Engine & Mobile Check-In</span>
                                        </div>
                                        <p className="text-xs text-blue-950 font-semibold truncate font-mono">{settings.bookingEngineUrl}</p>
                                        <p className="text-[11px] text-blue-700">Guests can reserve rooms directly with zero OTA commission.</p>
                                    </div>
                                    <a
                                        href={(settings.bookingEngineUrl || '').startsWith('http') ? settings.bookingEngineUrl : `https://${settings.bookingEngineUrl || 'booking.hotel.com'}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs shrink-0 flex items-center gap-1.5 transition-colors"
                                    >
                                        <span>Visit Portal</span>
                                        <ExternalLink size={12} />
                                    </a>
                                </div>

                                {/* Property Description */}
                                <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-3">
                                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-200/60">
                                        <div className="size-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                                            <Building2 size={16} />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Property Overview & Concept</h3>
                                            <p className="text-[11px] text-slate-400">Brand identity and guest experience positioning</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                                        {settings.description}
                                    </p>
                                </div>

                                {/* Active Hotel Amenities */}
                                <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-3">
                                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                                <CheckCircle2 size={16} />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Hotel Amenities & Privileges</h3>
                                                <p className="text-[11px] text-slate-400">{activeAmenitiesList.length} verified guest services active</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsQuickEditOpen(true)}
                                            className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                                        >
                                            Manage
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {activeAmenitiesList.map((feat) => (
                                            <span key={feat} className="px-3 py-1.5 bg-white border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700 shadow-2xs flex items-center gap-1.5">
                                                <Check size={12} className="text-emerald-600 stroke-[2.5]" />
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
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/70">
                                <div className="flex items-center justify-between text-blue-600 mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-In Time</span>
                                    <Clock size={15} />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 font-mono leading-tight">{settings.checkInTime}</p>
                                <p className="text-xs text-slate-500 mt-1">Standard Arrival Window</p>
                            </div>

                            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/70">
                                <div className="flex items-center justify-between text-amber-600 mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Check-Out Time</span>
                                    <Clock size={15} />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 font-mono leading-tight">{settings.checkOutTime}</p>
                                <p className="text-xs text-slate-500 mt-1">Standard Guest Departure</p>
                            </div>

                            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/70">
                                <div className="flex items-center justify-between text-rose-600 mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hold Release Cutoff</span>
                                    <Clock size={15} />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 font-mono leading-tight">{settings.autoReleaseHour}</p>
                                <p className="text-xs text-slate-500 mt-1">Non-Guaranteed Room Release</p>
                            </div>

                            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200/70">
                                <div className="flex items-center justify-between text-purple-600 mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Night Audit EOD</span>
                                    <Moon size={15} />
                                </div>
                                <p className="text-2xl font-bold text-slate-900 font-mono leading-tight">{settings.nightAuditTime}</p>
                                <p className="text-xs text-slate-500 mt-1">Daily Business Date Rollover</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-3">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block pb-2.5 border-b border-slate-200/60">
                                    Night Audit & Front Office Automation
                                </span>
                                <div className="space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">Auto-Post Room & Tax Charges</span>
                                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                            {settings.autoPostRoomCharges ? 'Active (Automated)' : 'Manual Posting'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">Auto-Advance Business Date</span>
                                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                            {settings.autoAdvanceBusinessDate ? 'Enabled (+1 Day)' : 'Manual Rollover'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">Weekend Tariff Schedule</span>
                                        <div className="flex gap-1.5">
                                            {(settings.weekends || ['Friday', 'Saturday']).map((d: string) => (
                                                <span key={d} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 shadow-2xs">
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-slate-500 font-medium">Electronic Door Lock System</span>
                                        <span className="font-semibold text-blue-700 flex items-center gap-1.5 font-mono">
                                            <Lock size={12} />
                                            <span>{settings.keyCardSystem || 'VingCard / Assa Abloy Visionline'}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-3">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block pb-2.5 border-b border-slate-200/60">
                                    Guest House Rules & Policies
                                </span>
                                <div className="space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">Smoking Policy</span>
                                        <span className="font-semibold text-slate-800">{settings.smokingPolicyText}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">Pet Policy</span>
                                        <span className="font-semibold text-slate-800">{settings.petPolicyText}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
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
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-3">
                                <div className="flex items-center gap-2 text-rose-600 pb-2 border-b border-slate-200/60">
                                    <Clock size={15} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">Cancellation & No-Show</span>
                                </div>
                                <div className="space-y-2.5 text-xs">
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

                            <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-3">
                                <div className="flex items-center gap-2 text-blue-600 pb-2 border-b border-slate-200/60">
                                    <Briefcase size={15} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">Corporate & Travel Agency Terms</span>
                                </div>
                                <div className="space-y-2.5 text-xs">
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

                            <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-3">
                                <div className="flex items-center gap-2 text-amber-600 pb-2 border-b border-slate-200/60">
                                    <Building2 size={15} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">Groups & Overbooking Policy</span>
                                </div>
                                <div className="space-y-2.5 text-xs">
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
                    <div className="space-y-6">
                        {/* Statutory Licenses & Compliance */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                        <FileCheck size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Statutory Tax & Regulatory Registration</h3>
                                        <p className="text-[11px] text-slate-400">National Board of Revenue (NBR) & Municipal Licenses</p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    NBR COMPLIANT
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                <div className="p-4 bg-slate-50/50 border border-slate-200/70 rounded-xl space-y-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">VAT Registration (BIN)</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm block">{settings.taxIdNumber || '001294819-0101'}</span>
                                    <span className="text-xs text-emerald-600 block font-medium">Mushak-6.3 Electronic Billing</span>
                                </div>
                                <div className="p-4 bg-slate-50/50 border border-slate-200/70 rounded-xl space-y-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Municipal Trade License</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm block">{settings.tradeLicenseNo || 'TL-DNCC-2026-9941'}</span>
                                    <span className="text-xs text-blue-600 block font-medium">Valid till: {settings.tradeLicenseExpiry || '30 Jun 2027'}</span>
                                </div>
                                <div className="p-4 bg-slate-50/50 border border-slate-200/70 rounded-xl space-y-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Civil Defense & Fire Safety</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm block">{settings.fireSafetyCertNo || 'FS-DHK-2025-441'}</span>
                                    <span className="text-xs text-emerald-600 block font-medium">Inspected & Certified</span>
                                </div>
                                <div className="p-4 bg-slate-50/50 border border-slate-200/70 rounded-xl space-y-1">
                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Police Special Branch (C-Form)</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm block">{settings.policeCFormId || 'SB-CF-GPD-881'}</span>
                                    <span className="text-xs text-emerald-600 block font-medium">Foreign Guest Portal Active</span>
                                </div>
                            </div>
                        </div>

                        {/* Designated Bank Accounts */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                        <CreditCard size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Designated Bank Accounts & Settlement Lines</h3>
                                        <p className="text-[11px] text-slate-400">Printed on guest folios, proforma bills, and corporate BTC invoices</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAddBankModalOpen(true)}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                >
                                    <Plus size={13} />
                                    <span>Add Bank Account</span>
                                </button>
                            </div>

                            {bankAccounts.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
                                    <CreditCard size={32} className="mx-auto text-slate-300 mb-2" />
                                    <h4 className="text-xs font-bold text-slate-800">No Bank Accounts Configured</h4>
                                    <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                                        Add designated settlement bank lines to display on invoices and guest folios.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddBankModalOpen(true)}
                                        className="mt-3 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={13} />
                                        <span>Add First Bank Account</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {bankAccounts.map((acc) => (
                                        <div key={acc.id} className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex justify-between items-start hover:border-blue-300 transition-colors">
                                            <div className="space-y-1 min-w-0 pr-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="size-6 rounded-md bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                                                        {acc.bankName.slice(0, 2).toUpperCase()}
                                                    </span>
                                                    <p className="font-bold text-slate-900 text-xs truncate leading-tight">{acc.bankName}</p>
                                                </div>
                                                <p className="text-xs text-slate-800 font-mono font-bold pt-1">{acc.accountNum}</p>
                                                <p className="text-[11px] text-slate-500">{acc.accountName}</p>
                                                <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono pt-1">
                                                    {acc.routingNo && <span>Routing: {acc.routingNo}</span>}
                                                    {acc.swift && <span>SWIFT: {acc.swift}</span>}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteBank(acc.id)}
                                                className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                                                title="Remove Account"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recent Folio Settlements Audit Trail */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                                <div>
                                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Operational Settlements Audit Trail</h3>
                                    <p className="text-[11px] text-slate-400">Live transaction settlements from front desk checkout folios</p>
                                </div>
                                <span className="text-xs text-slate-500 font-mono">{transactions.length} Transactions</span>
                            </div>
                            <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10.5px] text-slate-500 font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">Voucher / ID</th>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Description</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {transactions.map(txn => (
                                            <tr key={txn.id} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-4 py-2.5 font-mono text-slate-500 text-[11px]">{txn.id}</td>
                                                <td className="px-4 py-2.5 text-slate-700 text-[11px]">{txn.date}</td>
                                                <td className="px-4 py-2.5 text-slate-900 font-medium text-xs">{txn.desc}</td>
                                                <td className={`px-4 py-2.5 text-right font-bold font-mono text-xs ${txn.type === 'credit' ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                    {txn.type === 'credit' ? '+' : ''}৳ {Math.abs(txn.amount).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
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
                    <div className="space-y-5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Revenue Outlets & Point of Sale Terminals</h3>
                                <p className="text-[11px] text-slate-400">Dining rooms, banquet halls, rooftop lounges and wellness spa stations</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddOutletModalOpen(true)}
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                                <Plus size={13} />
                                <span>Add New Outlet</span>
                            </button>
                        </div>

                        {posOutlets.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
                                <Utensils size={32} className="mx-auto text-slate-300 mb-2" />
                                <h4 className="text-xs font-bold text-slate-800">No Food & Beverage Outlets Configured</h4>
                                <p className="text-xs text-slate-400 mt-0.5 max-w-md mx-auto">
                                    Configure restaurant dining rooms, rooftop cafes, or banquet halls for automatic KOT generation and room charge folio postings.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsAddOutletModalOpen(true)}
                                    className="mt-3 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus size={13} />
                                    <span>Create First Outlet</span>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {posOutlets.map((outlet) => (
                                    <div key={outlet.id} className="p-4 bg-slate-50/50 rounded-xl border border-slate-200/80 space-y-3 hover:border-blue-300 transition-colors shadow-2xs">
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
                    <div className="space-y-5">
                        <div className="bg-slate-50/60 p-5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                            <div className="flex items-center gap-3.5">
                                <div className="size-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                    <Activity size={20} className="animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900 text-sm">{settings.channelManager || 'SiteMinder / RateGain 2-Way Channel Gateway'}</h3>
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            LIVE 2-WAY SYNC
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Real-time room inventory, ARI updates, and OTA reservation delivery connected.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* GDS Identity Codes */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Global Distribution System (GDS) Credentials</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    { name: 'Amadeus GDS', code: settings.gdsAmadeus || '1A-DHK-992' },
                                    { name: 'Sabre GDS', code: settings.gdsSabre || 'AA-GPD-441' },
                                    { name: 'Galileo / Travelport', code: settings.gdsGalileo || '1G-77491-01' },
                                    { name: 'Worldspan GDS', code: settings.gdsWorldspan || '1P-DH01-12' },
                                ].map((gds) => (
                                    <div key={gds.name} className="p-4 bg-slate-50/50 border border-slate-200/70 rounded-xl">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">{gds.name}</span>
                                        <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{gds.code}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Connected OTA Channels Table */}
                        <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs space-y-0">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Online Travel Agencies (OTA Integration Status)</span>
                                <span className="text-xs text-slate-500 font-mono">5 Active Feeds</span>
                            </div>
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-500 uppercase font-bold">
                                    <tr>
                                        <th className="px-4 py-3">Channel Provider</th>
                                        <th className="px-4 py-3">Hotel Account ID</th>
                                        <th className="px-4 py-3">Sync Protocol</th>
                                        <th className="px-4 py-3">Average Latency</th>
                                        <th className="px-4 py-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {distributionChannels.map((ch) => (
                                        <tr key={ch.code} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-slate-900">{ch.name}</td>
                                            <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{ch.code}</td>
                                            <td className="px-4 py-3 text-slate-600">{ch.syncStatus}</td>
                                            <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{ch.ping}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {ch.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Official Social Media & Online Brand Channels */}
                        <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs space-y-0">
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Globe size={15} className="text-blue-600" />
                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                        Official Social Media & Brand Profiles
                                    </span>
                                </div>
                                <span className="text-xs text-slate-500 font-mono">
                                    {((settings as any).socialLinks?.filter((s: any) => s.url)?.length || 0)} Configured
                                </span>
                            </div>

                            <div className="p-4">
                                {((settings as any).socialLinks && (settings as any).socialLinks.filter((s: any) => s.url).length > 0) ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {((settings as any).socialLinks.filter((s: any) => s.url)).map((s: any, idx: number) => (
                                            <a
                                                key={s.id || idx}
                                                href={s.url.startsWith('http') ? s.url : `https://${s.url}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition flex items-center justify-between group cursor-pointer"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs font-bold text-slate-900">{s.platform}</span>
                                                        {s.handle && (
                                                            <span className="text-[11px] text-slate-400 font-mono truncate">{s.handle}</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-blue-600 truncate mt-0.5">{s.url}</p>
                                                </div>
                                                <ExternalLink size={12} className="text-slate-400 group-hover:text-blue-600 transition shrink-0 ml-2" />
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-400 text-xs">
                                        <p>No social media channels configured yet.</p>
                                        {onManageProperty && (
                                            <button
                                                type="button"
                                                onClick={() => onManageProperty('branding')}
                                                className="mt-2 text-blue-600 hover:underline font-semibold cursor-pointer"
                                            >
                                                + Configure Social Links (Branding & Contacts)
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 7. MANAGEMENT & SAFETY TAB */}
                {activeTab === 'team' && (
                    <div className="space-y-6">
                        {/* 24/7 Emergency Hotlines */}
                        <div className="bg-rose-50/40 rounded-xl p-5 border border-rose-200/70 space-y-3">
                            <div className="flex items-center justify-between pb-2.5 border-b border-rose-200/60">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                                        <ShieldAlert size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">24/7 Rapid Emergency Response Directory</h3>
                                        <p className="text-[11px] text-rose-700">Immediate access numbers for guest safety, police, and medical personnel</p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    HOTLINES ACTIVE
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                {[
                                    { label: 'House Doctor (24/7)', name: 'Medical Duty Officer', phone: '+880 1711 999111' },
                                    { label: 'Hospital Emergency ER', name: 'United Hospital ER', phone: '+880 2 8836000' },
                                    { label: 'Police Control Room', name: 'Gulshan Thana Duty', phone: '+880 2 9885566' },
                                    { label: 'National Fire & Rescue', name: 'Fire Service Dispatch (999)', phone: '999' }
                                ].map((line, idx) => (
                                    <div key={idx} className="p-3.5 bg-white border border-rose-100 rounded-xl shadow-2xs">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold block">{line.label}</span>
                                        <span className="font-bold text-slate-900 text-xs block mt-0.5">{line.name}</span>
                                        <span className="font-mono text-rose-600 font-bold text-xs mt-0.5 block">{line.phone}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Key Department Heads */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Hotel Management Team (Department Heads)</h4>
                                    <p className="text-[11px] text-slate-400">Primary points of contact for corporate accounts, vendors, and VIP guests</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsAddContactModalOpen(true)}
                                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                >
                                    <Plus size={13} />
                                    <span>Add Department Head</span>
                                </button>
                            </div>

                            {contacts.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
                                    <User size={32} className="mx-auto text-slate-300 mb-2" />
                                    <h4 className="text-xs font-bold text-slate-800">No Department Heads Registered</h4>
                                    <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                                        Register key personnel (General Manager, Front Office Manager, Housekeeper) for guest escalations.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setIsAddContactModalOpen(true)}
                                        className="mt-3 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={13} />
                                        <span>Add First Contact</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {contacts.map((poc) => (
                                        <div key={poc.id} className="p-4 border border-slate-200/90 rounded-xl flex items-center justify-between gap-3 bg-white shadow-2xs hover:border-blue-300 transition-colors">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="size-11 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                                                    {poc.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'HM'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 text-xs truncate leading-tight">{poc.name}</p>
                                                    <p className="text-blue-600 text-[10.5px] font-semibold uppercase tracking-wide leading-none mt-0.5">{poc.role}</p>
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                                                        <span className="flex items-center gap-1 font-mono">
                                                            <Phone size={11} className="text-slate-400" />
                                                            <span>{poc.phone}</span>
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Mail size={11} className="text-slate-400" />
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
                                                <Trash2 size={14} />
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
                    <div className="space-y-6">
                        {/* Section Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                    <Receipt size={16} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Document Numbering & Guest Folio Print Setup</h3>
                                    <p className="text-[11px] text-slate-400">Prefix rules, continuous sequences, and guest invoice formatting</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsQuickEditOpen(true)}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            >
                                <Edit2 size={12} className="text-slate-400" />
                                <span>Edit Numbering</span>
                            </button>
                        </div>

                        {/* Prefix Cards Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                            {[
                                { label: 'Reservation Prefix', prefix: settings.reservationPrefix || 'RES-', example: 'RES-2026-1001', icon: Clock },
                                { label: 'Tax Invoice Prefix', prefix: settings.invoicePrefix || 'INV-', example: 'INV-2026-1001', icon: Receipt },
                                { label: 'Guest Folio Prefix', prefix: settings.folioPrefix || 'FOL-', example: 'FOL-1001', icon: FileCheck },
                                { label: 'Restaurant KOT', prefix: settings.kotPrefix || 'KOT-', example: 'KOT-5001', icon: Utensils },
                                { label: 'Money Receipt', prefix: settings.receiptPrefix || 'REC-', example: 'RCT-2001', icon: CreditCard },
                            ].map((doc) => {
                                const DocIcon = doc.icon;
                                return (
                                    <div key={doc.label} className="bg-slate-50/60 hover:bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-2 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{doc.label}</span>
                                            <DocIcon size={14} className="text-blue-600" />
                                        </div>
                                        <p className="font-mono font-extrabold text-blue-700 text-base">{doc.example}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">Format: {doc.prefix}####</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Preferences and Invoice Terms */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-3">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block pb-2.5 border-b border-slate-200/60">
                                    Numbering & Print Preferences
                                </span>
                                <div className="space-y-3 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">Reset Sequence Numbers Annually</span>
                                        <span className="font-semibold text-emerald-700">{settings.resetAnnually ? 'Enabled (Fiscal Year)' : 'Continuous Running Sequence'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">Show Itemized VAT & Service Charge Breakdown</span>
                                        <span className="font-semibold text-emerald-700">Yes ({settings.vatPercentage}% VAT + {settings.serviceChargePercentage}% SC)</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-slate-500 font-medium">Send Checkout Folio e-Invoice</span>
                                        <span className="font-semibold text-emerald-700">{settings.enableCheckoutFolioEmail ? 'Enabled' : 'Disabled'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-3">
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block pb-2.5 border-b border-slate-200/60">
                                    Invoice Footer & Terms Clause
                                </span>
                                <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl space-y-2">
                                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                                        {settings.invoiceNotes || 'All bills are payable upon presentation at checkout. Government VAT (15%) and Service Charge (10%) apply as per regulations.'}
                                    </p>
                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                        <span>Printed at reception checkout</span>
                                        <span className="font-mono">Mushak-6.3 Compliant</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 9. SECURITY & BACKUP TAB */}
                {activeTab === 'automation' && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-3">
                                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-200/60">
                                    <div className="size-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                                        <Mail size={16} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Email (SMTP) & Delivery Gateway</span>
                                </div>
                                <div className="space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">SMTP Server Host</span>
                                        <span className="font-mono font-semibold text-slate-800">{settings.smtpHost || 'smtp.sendgrid.net'}:{settings.smtpPort || '587'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">Sender Display Name</span>
                                        <span className="font-semibold text-slate-800">{settings.senderName || propName}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">Outbound Security</span>
                                        <span className="font-semibold text-emerald-700">STARTTLS Encrypted (TLS 1.3)</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-slate-500 font-medium">SMS Confirmation Gateway</span>
                                        <span className="font-semibold text-blue-700">Twilio / Infobip SMS Active</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50/40 rounded-xl p-5 border border-slate-200/70 space-y-3">
                                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-200/60">
                                    <div className="size-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                                        <Database size={16} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Database Security & Cloud Replication</span>
                                </div>
                                <div className="space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">Cloud High Availability</span>
                                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">TiDB Cloud Active (3-Zone Sync)</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-500 font-medium">Automatic Snapshot Frequency</span>
                                        <span className="font-semibold text-slate-800">Every 6 Hours (Continuous WAL)</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
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
                                        <label className="font-semibold text-slate-700 block mb-1">Brand Logo Image</label>
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-sm shrink-0">
                                                {logoUrl ? (
                                                    <img src={logoUrl} alt="Logo" className="size-full object-cover" />
                                                ) : (
                                                    <span>{propName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'GH'}</span>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTempLogoUrl(logoUrl);
                                                    setIsLogoModalOpen(true);
                                                }}
                                                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Camera size={13} className="text-blue-600" />
                                                <span>{logoUrl ? 'Change / Upload Logo' : 'Upload Brand Logo'}</span>
                                            </button>
                                            {logoUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveLogo('')}
                                                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                                                >
                                                    Remove Logo
                                                </button>
                                            )}
                                        </div>
                                    </div>
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

            {/* Change Property Logo Modal */}
            {isLogoModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
                            <div className="flex items-center gap-2">
                                <Camera className="size-4 text-blue-600" />
                                <h3 className="text-sm font-bold text-slate-900">Change Hotel Brand Logo</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsLogoModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            {/* Live Logo Preview Box */}
                            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                                <div className="size-24 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 text-white flex items-center justify-center font-black text-3xl tracking-tight shadow-md ring-4 ring-white overflow-hidden mb-2">
                                    {tempLogoUrl ? (
                                        <img src={tempLogoUrl} alt="Preview" className="size-full object-cover" />
                                    ) : (
                                        <span>{propName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'GH'}</span>
                                    )}
                                </div>
                                <p className="text-xs font-semibold text-slate-700">{propName}</p>
                                <p className="text-[11px] text-slate-400">{tempLogoUrl ? 'Custom Logo Preview' : 'Default Monogram Emblem'}</p>
                            </div>

                            {/* Option 1: File Upload */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Upload Logo from Device
                                </label>
                                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 transition shadow-2xs">
                                    <Upload size={14} className="text-blue-600" />
                                    <span>Choose Image File (PNG, JPG, SVG, WebP)</span>
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                        onChange={handleLogoFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {/* Option 2: Image URL */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Or Enter Image Web URL
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://example.com/logo.png"
                                    value={tempLogoUrl.startsWith('data:') ? '' : tempLogoUrl}
                                    onChange={(e) => setTempLogoUrl(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 font-mono"
                                />
                            </div>

                            <p className="text-[11px] text-slate-400 leading-relaxed">
                                Recommended dimensions: Square 512×512px or higher. PNG with transparent background works best for guest registration cards and folio invoices.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                            {logoUrl ? (
                                <button
                                    type="button"
                                    onClick={() => handleSaveLogo('')}
                                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                                >
                                    Reset to Monogram
                                </button>
                            ) : (
                                <span />
                            )}

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsLogoModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSaveLogo(tempLogoUrl)}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                                >
                                    Save Logo
                                </button>
                            </div>
                        </div>
                    </div>
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
