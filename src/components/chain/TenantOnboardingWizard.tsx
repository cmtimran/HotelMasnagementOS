import React, { useState } from 'react';
import {
    Building2, Database, Layers, CheckCircle2,
    Star, Globe, Clock, BedDouble, Key, Sparkles, Check,
    RefreshCw, ArrowRight, Shield, ArrowLeft, ChevronLeft, ChevronRight
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiUrl';
import { useProperty } from '../../context/PropertyContext';
import { useToast } from '../../context/ToastContext';
import { usePortal } from '../../context/PortalContext';

interface TenantOnboardingWizardProps {
    onBack?: () => void;
    onNavigate?: (page: string) => void;
}

interface RoomTypeConfig {
    code: string;
    name: string;
    baseRate: number;
    extraBedRate: number;
    maxAdults: number;
    maxChildren: number;
}

const DEFAULT_ROOM_TYPES: RoomTypeConfig[] = [
    { code: 'DLX-KNG', name: 'Deluxe King Suite', baseRate: 6500, extraBedRate: 1500, maxAdults: 2, maxChildren: 1 },
    { code: 'SUP-TWN', name: 'Superior Twin Room', baseRate: 5200, extraBedRate: 1200, maxAdults: 2, maxChildren: 1 },
    { code: 'EXE-STE', name: 'Executive Suite', baseRate: 12000, extraBedRate: 2500, maxAdults: 3, maxChildren: 2 }
];

export const TenantOnboardingWizard: React.FC<TenantOnboardingWizardProps> = ({ onBack, onNavigate }) => {
    const { refreshProperties, setActivePropertyId } = useProperty();
    const { switchToPropertyPMS } = usePortal();
    const { showToast } = useToast();
    const API_BASE = getApiBaseUrl();

    const [currentStep, setCurrentStep] = useState<number>(1);
    const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
    const [provisionSuccess, setProvisionSuccess] = useState<boolean>(false);
    const [provisionResult, setProvisionResult] = useState<any>(null);
    const [provisioningLogs, setProvisioningLogs] = useState<string[]>([]);

    // Step 1: Property Identity & Brand
    const [propName, setPropName] = useState('');
    const [propCode, setPropCode] = useState('');
    const [propSlug, setPropSlug] = useState('');
    const [starRating, setStarRating] = useState<number>(5);
    const [propertyType, setPropertyType] = useState('LUXURY_RESORT');
    const [currency, setCurrency] = useState('BDT');
    const [timeZone, setTimeZone] = useState('Asia/Dhaka');
    const [checkInTime, setCheckInTime] = useState('14:00');
    const [checkOutTime, setCheckOutTime] = useState('12:00');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('Dhaka');
    const [country, setCountry] = useState('Bangladesh');
    const [phone, setPhone] = useState('+880 1700-000000');
    const [email, setEmail] = useState('');

    // Step 2: Architecture Strategy
    const [tier, setTier] = useState<'STANDARD' | 'ENTERPRISE'>('STANDARD');

    // Step 3: Physical Architecture & Room Inventory
    const [buildingName, setBuildingName] = useState('Main Wing Tower');
    const [totalFloors, setTotalFloors] = useState<number>(3);
    const [roomsPerFloor, setRoomsPerFloor] = useState<number>(4);
    const [roomTypes, setRoomTypes] = useState<RoomTypeConfig[]>(DEFAULT_ROOM_TYPES);

    // Step 4: Operational Defaults & Plugins
    const [taxVatPercent, setTaxVatPercent] = useState<number>(15);
    const [serviceChargePercent, setServiceChargePercent] = useState<number>(10);
    const [selectedPlugins, setSelectedPlugins] = useState<string[]>([
        'banquet_events',
        'spa_wellness'
    ]);

    // Step 5: Primary Administrator / General Manager
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPhone, setAdminPhone] = useState('');
    const [posPin, setPosPin] = useState('1234');

    // Auto-derive slug and code when property name changes
    const handleNameChange = (val: string) => {
        setPropName(val);
        const derivedSlug = val
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-+|-+$)/g, '');
        setPropSlug(derivedSlug);

        const words = val.trim().split(/\s+/);
        let derivedCode = '';
        if (words.length >= 3) {
            derivedCode = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
        } else if (words.length === 2) {
            derivedCode = (words[0].slice(0, 2) + words[1][0]).toUpperCase();
        } else {
            derivedCode = val.slice(0, 3).toUpperCase();
        }
        setPropCode(derivedCode);
    };

    const togglePlugin = (key: string) => {
        setSelectedPlugins(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    // Total rooms calculated dynamically
    const totalRoomsCount = totalFloors * roomsPerFloor;

    // Validate Step before advancing
    const handleNextStep = () => {
        if (currentStep === 1) {
            if (!propName.trim()) {
                showToast('Please enter the Property / Hotel Name', { type: 'error' });
                return;
            }
            if (!propSlug.trim()) {
                showToast('Please provide a unique URL slug', { type: 'error' });
                return;
            }
            if (!email.trim() && !adminEmail.trim()) {
                setEmail(`${propSlug}@hotelms.com`);
            }
            if (!adminName.trim()) {
                setAdminName('General Manager');
            }
            if (!adminEmail.trim()) {
                setAdminEmail(email || `${propSlug}@hotelms.com`);
            }
        }
        setCurrentStep(prev => Math.min(prev + 1, 5));
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    // Execute Onboarding Provisioning
    const handleLaunchProvisioning = async () => {
        setIsProvisioning(true);
        setCurrentStep(6);
        setProvisioningLogs([
            'Validating Tenant Credentials & Slug Uniqueness...',
            'Connecting to Central Control Plane & Cluster Gateway...'
        ]);

        try {
            const payload = {
                slug: propSlug,
                name: propName,
                code: propCode,
                tier,
                starRating,
                propertyType,
                currency,
                timeZone,
                checkInTime,
                checkOutTime,
                address: address || `${city}, Bangladesh`,
                city,
                country,
                phone,
                email: email || `${propSlug}@hotelms.com`,
                buildingName,
                totalFloors,
                roomsPerFloor,
                roomTypes,
                totalRooms: totalRoomsCount,
                adminName: adminName || 'Property General Manager',
                adminEmail: adminEmail || email || `${propSlug}@hotelms.com`,
                adminPhone: adminPhone || phone,
                plugins: selectedPlugins
            };

            setProvisioningLogs(prev => [
                ...prev,
                tier === 'ENTERPRISE' 
                    ? `Allocating Dedicated PostgreSQL Database 'tenant_${propSlug.replace(/-/g, '_')}'...`
                    : `Initializing High-Density Tenant Partition inside Clustered PostgreSQL...`,
                'Executing 1NF–4NF Relational DDL Migrations & Constraints...',
                `Generating ${totalRoomsCount} Physical Inventory Rooms across ${totalFloors} Floors...`,
                'Registering Executive General Manager HRM Master Record...',
                'Enabling Selected Modular Plugins & Central Control Plane Routing...'
            ]);

            const res = await fetch(`${API_BASE}/api/central/tenants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Provisioning failed on server');
            }

            setProvisionResult(data.data);
            setProvisionSuccess(true);
            setProvisioningLogs(prev => [
                ...prev,
                '✅ Tenant Onboarding Complete! System Live and Ready.'
            ]);

            await refreshProperties();

            // Set active tenant in local storage
            if (typeof window !== 'undefined') {
                localStorage.setItem('hotel_active_tenant_slug', propSlug);
                if (data.data?.propertyId) {
                    localStorage.setItem('hotel_active_property_id', String(data.data.propertyId));
                    setActivePropertyId(data.data.propertyId);
                }
            }

            showToast(`Tenant '${propName}' onboarded successfully!`, {
                type: 'success',
                title: 'Onboarding Complete'
            });
        } catch (err: any) {
            setProvisioningLogs(prev => [
                ...prev,
                `❌ Provisioning Error: ${err.message}`
            ]);
            showToast(err.message, { type: 'error', title: 'Onboarding Failed' });
        } finally {
            setIsProvisioning(false);
        }
    };

    // Navigation on completion
    const handleLaunchFrontDesk = () => {
        if (provisionResult?.propertyId) {
            switchToPropertyPMS(provisionResult.propertyId, 'front-desk');
        } else if (onNavigate) {
            onNavigate('front-desk');
        }
    };

    const handleLaunchStayView = () => {
        if (provisionResult?.propertyId) {
            switchToPropertyPMS(provisionResult.propertyId, 'stay-view');
        } else if (onNavigate) {
            onNavigate('stay-view');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Top Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onBack || (() => window.history.back())}
                            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer shadow-2xs"
                            title="Go Back"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                    Enterprise Tenant &amp; Property Onboarding Wizard
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    Automated Provisioning
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Set up a new hotel tenant with automated database allocation, floor architecture, inventory generation, and HRM defaults
                            </p>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="text-xs font-semibold text-slate-400">Step {currentStep} of 5</span>
                        <div className="text-xs font-bold text-slate-800">
                            {currentStep === 1 && 'Hotel Identity & Brand'}
                            {currentStep === 2 && 'Architecture Strategy'}
                            {currentStep === 3 && 'Floors & Inventory'}
                            {currentStep === 4 && 'Policies & Plugins'}
                            {currentStep === 5 && 'Admin & Security'}
                            {currentStep === 6 && 'Live Provisioning'}
                        </div>
                    </div>
                </div>

                {/* Progress Stepper Bar */}
                {currentStep <= 5 && (
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                        <div className="grid grid-cols-5 gap-2">
                            {[
                                { num: 1, title: 'Brand Identity', icon: Building2 },
                                { num: 2, title: 'Architecture', icon: Database },
                                { num: 3, title: 'Inventory Matrix', icon: BedDouble },
                                { num: 4, title: 'Operations & Addons', icon: Sparkles },
                                { num: 5, title: 'Admin Master', icon: Key }
                            ].map(step => {
                                const isCompleted = currentStep > step.num;
                                const isCurrent = currentStep === step.num;
                                return (
                                    <button
                                        key={step.num}
                                        type="button"
                                        onClick={() => step.num < currentStep && setCurrentStep(step.num)}
                                        disabled={step.num > currentStep}
                                        className={`flex items-center gap-2 p-2 rounded-xl text-left transition cursor-pointer ${
                                            isCurrent 
                                                ? 'bg-blue-50/80 border border-blue-200 text-blue-900 shadow-2xs' 
                                                : isCompleted 
                                                    ? 'text-emerald-700 hover:bg-slate-50' 
                                                    : 'text-slate-400 opacity-60 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                            isCompleted 
                                                ? 'bg-emerald-600 text-white' 
                                                : isCurrent 
                                                    ? 'bg-blue-600 text-white shadow-xs' 
                                                    : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {isCompleted ? <Check size={14} className="stroke-[3]" /> : step.num}
                                        </div>
                                        <div className="hidden md:block truncate">
                                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Step {step.num}</span>
                                            <span className="text-xs font-semibold truncate flex items-center gap-1">
                                                <step.icon size={11} className="opacity-70 inline" />
                                                <span>{step.title}</span>
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STEP 1: Hotel Identity & Brand */}
                {currentStep === 1 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Building2 size={18} className="text-blue-600" />
                                <span>Hotel Brand, Domain &amp; Location Profile</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Enter the core property identity. The system will auto-generate your clean tenant slug and inventory code.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">
                                    Hotel / Resort Name *
                                </label>
                                <input
                                    type="text"
                                    value={propName}
                                    onChange={e => handleNameChange(e.target.value)}
                                    placeholder="e.g. Radisson Blu Bay Resort & Spa"
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">
                                    Property Short Code
                                </label>
                                <input
                                    type="text"
                                    value={propCode}
                                    onChange={e => setPropCode(e.target.value.toUpperCase())}
                                    placeholder="RBR"
                                    maxLength={8}
                                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold outline-none focus:border-blue-500 uppercase shadow-2xs"
                                />
                            </div>

                            <div className="md:col-span-2 space-y-1">
                                <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">
                                    Tenant URL Slug (Unique Cluster Identifier) *
                                </label>
                                <div className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/70 focus-within:border-blue-500 focus-within:bg-white shadow-2xs">
                                    <span className="text-slate-400 font-mono text-xs select-none">hotelmanagementos.com/</span>
                                    <input
                                        type="text"
                                        value={propSlug}
                                        onChange={e => setPropSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                                        placeholder="radisson-blu-bay"
                                        className="w-full bg-transparent font-mono font-bold text-blue-700 outline-none text-xs"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">
                                    Star Rating
                                </label>
                                <div className="flex items-center gap-1.5 p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setStarRating(star)}
                                            className={`p-1.5 rounded-lg transition cursor-pointer flex-1 flex justify-center ${
                                                star <= starRating ? 'text-amber-500' : 'text-slate-300'
                                            }`}
                                        >
                                            <Star size={16} fill={star <= starRating ? 'currentColor' : 'none'} />
                                        </button>
                                    ))}
                                    <span className="text-[11px] font-bold text-amber-700 px-1.5">{starRating} Star</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">
                                    Property Type
                                </label>
                                <select
                                    value={propertyType}
                                    onChange={e => setPropertyType(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-white shadow-2xs font-medium cursor-pointer"
                                >
                                    <option value="LUXURY_RESORT">Beachfront Luxury Resort</option>
                                    <option value="CITY_HOTEL">City Business Hotel</option>
                                    <option value="BOUTIQUE_VILLA">Boutique Eco Villa</option>
                                    <option value="AIRPORT_TRANSIT">Airport Transit Hotel</option>
                                    <option value="HERITAGE_PALACE">Heritage Palace Hotel</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">
                                    Operating Currency
                                </label>
                                <select
                                    value={currency}
                                    onChange={e => setCurrency(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white shadow-2xs cursor-pointer"
                                >
                                    <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                                    <option value="USD">USD ($) - US Dollar</option>
                                    <option value="EUR">EUR (€) - Euro</option>
                                    <option value="GBP">GBP (£) - British Pound</option>
                                    <option value="SAR">SAR (﷼) - Saudi Riyal</option>
                                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">
                                    Timezone
                                </label>
                                <select
                                    value={timeZone}
                                    onChange={e => setTimeZone(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-white shadow-2xs font-mono cursor-pointer"
                                >
                                    <option value="Asia/Dhaka">Asia/Dhaka (GMT+06:00)</option>
                                    <option value="Asia/Dubai">Asia/Dubai (GMT+04:00)</option>
                                    <option value="Asia/Singapore">Asia/Singapore (GMT+08:00)</option>
                                    <option value="Europe/London">Europe/London (GMT+00:00)</option>
                                    <option value="America/New_York">America/New_York (GMT-05:00)</option>
                                </select>
                            </div>

                            <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                                <div className="space-y-1">
                                    <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">City / Region *</label>
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={e => setCity(e.target.value)}
                                        placeholder="Cox's Bazar"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs font-medium"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">Country *</label>
                                    <input
                                        type="text"
                                        value={country}
                                        onChange={e => setCountry(e.target.value)}
                                        placeholder="Bangladesh"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs font-medium"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">Official Phone</label>
                                    <input
                                        type="text"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        placeholder="+880 1711-000000"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs font-medium"
                                    />
                                </div>

                                <div className="sm:col-span-3 space-y-1">
                                    <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">Full Physical Street Address</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        placeholder="Plot 15, Marine Drive Road, Kolatoli Beach, Cox's Bazar"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: Architecture Strategy */}
                {currentStep === 2 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Database size={18} className="text-blue-600" />
                                <span>Multi-Tenant Architecture &amp; Density Strategy</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Select the data isolation strategy for this property based on performance scale and compliance needs.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Standard High-Density */}
                            <div 
                                onClick={() => setTier('STANDARD')}
                                className={`p-5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                                    tier === 'STANDARD'
                                        ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                                            <Layers size={20} />
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                                            Recommended for 1,000+ Scaling
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Standard Tier (High-Density Shared Clustered DB)</h3>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                            The property shares a high-performance PostgreSQL cluster using row-level property scoping. Zero connection leaks, sub-millisecond queries, and instant global migrations.
                                        </p>
                                    </div>

                                    <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                                        <li className="flex items-center gap-2 text-emerald-700 font-medium">
                                            <Check size={14} className="stroke-[3]" /> Zero connection pool overhead (Reuses primary pool)
                                        </li>
                                        <li className="flex items-center gap-2 text-emerald-700 font-medium">
                                            <Check size={14} className="stroke-[3]" /> Instant provisioning in under 2 seconds
                                        </li>
                                        <li className="flex items-center gap-2 text-emerald-700 font-medium">
                                            <Check size={14} className="stroke-[3]" /> Seamless 1-click upgrade to Dedicated DB anytime
                                        </li>
                                        <li className="flex items-center gap-2 text-slate-500">
                                            <Check size={14} /> Shared relational schema
                                        </li>
                                    </ul>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">Storage Target:</span>
                                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                                        postgres (Shared Cluster)
                                    </span>
                                </div>
                            </div>

                            {/* Enterprise Dedicated DB */}
                            <div 
                                onClick={() => setTier('ENTERPRISE')}
                                className={`p-5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                                    tier === 'ENTERPRISE'
                                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-500/20'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                                            <Database size={20} />
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                                            100% Physical Isolation
                                        </span>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">Enterprise VIP Tier (Dedicated Physical Database)</h3>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                            Provisions an isolated physical TiDB PostgreSQL database exclusively for this property. Allows custom schemas, dedicated addon DDLs, and complete blast-radius immunity.
                                        </p>
                                    </div>

                                    <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                                        <li className="flex items-center gap-2 text-indigo-700 font-medium">
                                            <Check size={14} className="stroke-[3]" /> Dedicated physical database (`tenant_{propSlug.replace(/-/g, '_') || '...'}`)
                                        </li>
                                        <li className="flex items-center gap-2 text-indigo-700 font-medium">
                                            <Check size={14} className="stroke-[3]" /> Zero blast radius on other properties during custom DDL
                                        </li>
                                        <li className="flex items-center gap-2 text-indigo-700 font-medium">
                                            <Check size={14} className="stroke-[3]" /> Managed LRU Connection Pooler (Max 20 Pools)
                                        </li>
                                        <li className="flex items-center gap-2 text-indigo-700 font-medium">
                                            <Check size={14} className="stroke-[3]" /> Custom schema alterations &amp; modular plugins
                                        </li>
                                    </ul>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-700">Storage Target:</span>
                                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                                        tenant_{propSlug.replace(/-/g, '_') || '...'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: Physical Architecture & Room Inventory */}
                {currentStep === 3 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <BedDouble size={18} className="text-blue-600" />
                                <span>Building, Floor &amp; Physical Room Generator</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Configure the architectural footprint. The batch generator will automatically build all physical rooms and link them to room types.
                            </p>
                        </div>

                        {/* Building Architecture Config */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200/80">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Building / Tower Name</label>
                                <input
                                    type="text"
                                    value={buildingName}
                                    onChange={e => setBuildingName(e.target.value)}
                                    placeholder="e.g. Royal Tower Wing"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none focus:border-blue-500 shadow-2xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Total Floors ({totalFloors} Floors)</label>
                                <input
                                    type="range"
                                    min={1}
                                    max={10}
                                    value={totalFloors}
                                    onChange={e => setTotalFloors(Number(e.target.value))}
                                    className="w-full accent-blue-600 cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                                    <span>1 Floor</span>
                                    <span className="font-bold text-blue-700">{totalFloors} Floors</span>
                                    <span>10 Floors</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Rooms Per Floor ({roomsPerFloor} Rooms)</label>
                                <input
                                    type="range"
                                    min={2}
                                    max={12}
                                    value={roomsPerFloor}
                                    onChange={e => setRoomsPerFloor(Number(e.target.value))}
                                    className="w-full accent-blue-600 cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                                    <span>2 Rooms</span>
                                    <span className="font-bold text-blue-700">{roomsPerFloor} Rooms/Floor</span>
                                    <span>12 Rooms</span>
                                </div>
                            </div>
                        </div>

                        {/* Room Types Configuration */}
                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                    Assigned Room Types &amp; Base Rates ({currency})
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {roomTypes.map((rt, idx) => (
                                    <div key={rt.code} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                                                {rt.code}
                                            </span>
                                            <span className="text-[10.5px] text-slate-400 font-medium">Max {rt.maxAdults} Adults</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={rt.name}
                                            onChange={e => {
                                                const updated = [...roomTypes];
                                                updated[idx].name = e.target.value;
                                                setRoomTypes(updated);
                                            }}
                                            className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-500"
                                        />
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-bold text-slate-500">{currency}</span>
                                            <input
                                                type="number"
                                                value={rt.baseRate}
                                                onChange={e => {
                                                    const updated = [...roomTypes];
                                                    updated[idx].baseRate = Number(e.target.value);
                                                    setRoomTypes(updated);
                                                }}
                                                className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold font-mono outline-none focus:border-blue-500"
                                            />
                                            <span className="text-[10px] text-slate-400">/night</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Live Room Matrix Visualizer */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <CheckCircle2 size={14} className="text-emerald-600" />
                                    <span>Live Generated Inventory Matrix: <strong className="text-emerald-700">{totalRoomsCount} Physical Rooms</strong></span>
                                </span>
                                <span className="text-[10.5px] text-slate-400">Status: Clean • Active</span>
                            </div>

                            <div className="max-h-48 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2">
                                {Array.from({ length: totalFloors }).map((_, fIdx) => {
                                    const floorNum = fIdx + 1;
                                    return (
                                        <div key={floorNum} className="flex items-center gap-2">
                                            <span className="w-16 text-[10.5px] font-bold text-slate-500 uppercase font-mono">
                                                Floor {floorNum}:
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {Array.from({ length: roomsPerFloor }).map((_, rIdx) => {
                                                    const rNum = `${floorNum}${rIdx + 1 < 10 ? '0' + (rIdx + 1) : rIdx + 1}`;
                                                    const rt = roomTypes[(fIdx * roomsPerFloor + rIdx) % roomTypes.length];
                                                    return (
                                                        <span
                                                            key={rNum}
                                                            className="px-2 py-1 rounded-md text-[10.5px] font-mono font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs flex items-center gap-1"
                                                        >
                                                            <span>Room {rNum}</span>
                                                            <span className="text-[9px] text-blue-600 font-semibold opacity-75">
                                                                ({rt?.code || 'DLX'})
                                                            </span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 4: Operational Defaults & Modular Addon Plugins */}
                {currentStep === 4 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Sparkles size={18} className="text-blue-600" />
                                <span>Financial Defaults &amp; Modular Addon Plugins</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Select modular operational plugins and configure tax calculation rates for guest folios.
                            </p>
                        </div>

                        {/* Tax & Financial Parameters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">VAT / Tax Rate (%)</label>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        value={taxVatPercent}
                                        onChange={e => setTaxVatPercent(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold bg-white outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                    <span className="text-xs font-bold text-slate-500">%</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Service Charge (%)</label>
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        value={serviceChargePercent}
                                        onChange={e => setServiceChargePercent(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold bg-white outline-none focus:border-blue-500 shadow-2xs"
                                    />
                                    <span className="text-xs font-bold text-slate-500">%</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                    <Clock size={11} className="text-slate-400" />
                                    <span>Check-In Time</span>
                                </label>
                                <input
                                    type="time"
                                    value={checkInTime}
                                    onChange={e => setCheckInTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs font-bold text-slate-700 shadow-2xs outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                    <Clock size={11} className="text-slate-400" />
                                    <span>Check-Out Time</span>
                                </label>
                                <input
                                    type="time"
                                    value={checkOutTime}
                                    onChange={e => setCheckOutTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs font-bold text-slate-700 shadow-2xs outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>

                        {/* Modular Addon Plugins */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                Modular Addon Plugins (Provisioned on Activation)
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                {[
                                    {
                                        key: 'banquet_events',
                                        name: 'Banquet & Event Operations',
                                        desc: 'Convention halls, audio-visual scheduling, seating setup, and per-plate catering invoicing.',
                                        icon: Sparkles
                                    },
                                    {
                                        key: 'spa_wellness',
                                        name: 'Ayurvedic Spa & Wellness Hub',
                                        desc: 'Therapist booking slots, treatment oils inventory, and direct guest folio billing integration.',
                                        icon: Sparkles
                                    },
                                    {
                                        key: 'channel_manager_ota',
                                        name: 'Two-Way OTA Channel Manager',
                                        desc: 'Live 2-way sync with Booking.com, Agoda, and Expedia for automated rates & inventory.',
                                        icon: Globe
                                    },
                                    {
                                        key: 'valet_parking',
                                        name: 'Smart Valet & Fleet Logistics',
                                        desc: 'Vehicle check-in key tags, dedicated driver dispatch, and automated parking space allocation.',
                                        icon: Shield
                                    }
                                ].map(p => {
                                    const isSelected = selectedPlugins.includes(p.key);
                                    return (
                                        <div
                                            key={p.key}
                                            onClick={() => togglePlugin(p.key)}
                                            className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                                                isSelected 
                                                    ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-500/20' 
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div className="space-y-0.5">
                                                <h4 className="text-xs font-bold text-slate-900">{p.name}</h4>
                                                <p className="text-[11px] text-slate-500 leading-snug">{p.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 5: Administrator Credentials & Final Review */}
                {currentStep === 5 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
                        <div className="border-b border-slate-100 pb-3">
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Key size={18} className="text-blue-600" />
                                <span>General Manager &amp; Super Admin Master Account</span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Set up the primary property administrator. This account will have full governance permissions in the HRM roster.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Administrator Full Name *</label>
                                <input
                                    type="text"
                                    value={adminName}
                                    onChange={e => setAdminName(e.target.value)}
                                    placeholder="e.g. Rashid Khan"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs font-medium"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Official Work Email *</label>
                                <input
                                    type="email"
                                    value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)}
                                    placeholder="gm@resort.com"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs font-medium"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Emergency Contact Phone</label>
                                <input
                                    type="text"
                                    value={adminPhone}
                                    onChange={e => setAdminPhone(e.target.value)}
                                    placeholder="+880 1711-223344"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 shadow-2xs font-medium"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Quick Front Desk POS PIN</label>
                                <input
                                    type="text"
                                    value={posPin}
                                    onChange={e => setPosPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                                    maxLength={4}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest outline-none focus:border-blue-500 shadow-2xs"
                                />
                            </div>
                        </div>

                        {/* Onboarding Summary Card */}
                        <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 text-xs space-y-2">
                            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Provisioning Architecture Manifest</span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-medium">
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Property Name</span>
                                    <span className="text-slate-900 font-bold">{propName || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Cluster Routing Slug</span>
                                    <span className="text-blue-700 font-mono font-bold">{propSlug || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Architecture Mode</span>
                                    <span className="text-emerald-700 font-bold">{tier === 'ENTERPRISE' ? 'Dedicated DB' : 'High-Density Shared'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Physical Rooms</span>
                                    <span className="text-slate-900 font-bold">{totalRoomsCount} Rooms ({totalFloors} Floors)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 6: Provisioning Progress & Completion */}
                {currentStep === 6 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
                        {isProvisioning ? (
                            <div className="space-y-4 max-w-md mx-auto">
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                                    <RefreshCw size={32} className="animate-spin" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">Provisioning Property &amp; Database Architecture...</h3>
                                    <p className="text-xs text-slate-500 mt-1">Executing ANSI schema migrations and seeding inventory</p>
                                </div>
                            </div>
                        ) : provisionSuccess ? (
                            <div className="space-y-4 max-w-md mx-auto">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                                    <CheckCircle2 size={36} className="stroke-[2.5]" />
                                </div>
                                <div>
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                                        Onboarding Complete
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-900 mt-2">{propName}</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {tier === 'ENTERPRISE'
                                            ? `Dedicated physical database '${provisionResult?.dbName}' created and ready.`
                                            : `High-Density Standard property initialized in shared cluster.`}
                                    </p>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1 font-mono">
                                    <div><strong className="text-slate-500">Tenant Slug:</strong> {propSlug}</div>
                                    <div><strong className="text-slate-500">Database:</strong> {provisionResult?.dbName || 'postgres'}</div>
                                    <div><strong className="text-slate-500">Physical Rooms:</strong> {provisionResult?.roomsCount || totalRoomsCount} Rooms</div>
                                    <div><strong className="text-slate-500">Admin Account:</strong> {adminEmail || email}</div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                                    <button
                                        type="button"
                                        onClick={handleLaunchFrontDesk}
                                        className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition"
                                    >
                                        <span>Launch Front Desk</span>
                                        <ArrowRight size={14} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleLaunchStayView}
                                        className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                                    >
                                        <span>Open StayView</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onNavigate ? onNavigate('multi-property') : onBack ? onBack() : null}
                                        className="w-full sm:w-auto px-4 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer transition"
                                    >
                                        Multi-Property Console
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 max-w-md mx-auto">
                                <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                                    <CheckCircle2 size={36} className="stroke-[2.5]" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900">Provisioning Error Encountered</h3>
                                <p className="text-xs text-rose-600">Please review the logs below and retry.</p>
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(5)}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                                >
                                    Back to Review
                                </button>
                            </div>
                        )}

                        {/* Live Execution Logs Terminal */}
                        <div className="text-left max-w-xl mx-auto bg-slate-900 rounded-xl p-4 font-mono text-[11px] text-slate-300 space-y-1.5 border border-slate-800 shadow-inner">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Execution Stream</span>
                            {provisioningLogs.map((log, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <span className="text-blue-400 select-none">&gt;</span>
                                    <span>{log}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Wizard Bottom Navigation Buttons */}
                {currentStep <= 5 && (
                    <div className="flex items-center justify-between pt-2">
                        {currentStep > 1 ? (
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
                            >
                                <ChevronLeft size={16} />
                                <span>Previous Step</span>
                            </button>
                        ) : (
                            <div></div>
                        )}

                        {currentStep < 5 ? (
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition"
                            >
                                <span>Continue to Next Step</span>
                                <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleLaunchProvisioning}
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition ring-2 ring-indigo-200"
                            >
                                <Sparkles size={16} />
                                <span>Launch &amp; Provision Tenant Property</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TenantOnboardingWizard;
