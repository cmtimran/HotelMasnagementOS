import React, { useState } from 'react';
import {
    Building2, Database, Layers, CheckCircle2,
    Star, Globe, Clock, BedDouble, Key, Sparkles, Check,
    RefreshCw, ArrowRight, Shield, ArrowLeft, ChevronLeft, ChevronRight,
    CheckCircle, AlertCircle
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

    // Step 4: Financial & Addon Plugins
    const [taxVatPercent, setTaxVatPercent] = useState<number>(15);
    const [serviceChargePercent, setServiceChargePercent] = useState<number>(10);
    const [selectedPlugins, setSelectedPlugins] = useState<string[]>([
        'banquet_events',
        'spa_wellness'
    ]);

    // Step 5: Administrator Credentials
    const [adminName, setAdminName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPhone, setAdminPhone] = useState('');
    const [posPin, setPosPin] = useState('1234');

    const totalRoomsCount = totalFloors * roomsPerFloor;

    const handleNameChange = (name: string) => {
        setPropName(name);
        if (!propSlug || propSlug === propName.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
            const clean = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            setPropSlug(clean);
        }
        if (!propCode) {
            const initials = name.split(/\s+/).map(w => w[0]).join('').slice(0, 4).toUpperCase();
            if (initials) setPropCode(initials);
        }
    };

    const togglePlugin = (key: string) => {
        setSelectedPlugins(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const handleNextStep = () => {
        if (currentStep === 1) {
            if (!propName.trim()) {
                showToast('Please enter the hotel or resort name.', { type: 'error' });
                return;
            }
            if (!propSlug.trim()) {
                showToast('Please provide a unique cluster URL slug.', { type: 'error' });
                return;
            }
        }
        if (currentStep < 5) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleLaunchProvisioning = async () => {
        setCurrentStep(6);
        setIsProvisioning(true);
        setProvisionSuccess(false);
        setProvisioningLogs([
            `Initiating provisioning for hotel tenant '${propName}'...`,
            `Target Strategy: ${tier === 'ENTERPRISE' ? 'Dedicated Physical Database (TiDB Cloud)' : 'Standard High-Density Clustered Partition'}`,
            `Routing Domain: https://hotelos.cloud/${propSlug}`,
            `Cluster Region: AWS US-East (PostgreSQL 17 Compatible Engine)`
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

    const steps = [
        { num: 1, title: 'Brand Identity', desc: 'Name, Domain, Stars & Location', icon: Building2 },
        { num: 2, title: 'Architecture Tier', desc: 'Shared vs Dedicated TiDB DB', icon: Database },
        { num: 3, title: 'Inventory Matrix', desc: 'Floors, Rooms & Live Grid', icon: BedDouble },
        { num: 4, title: 'Finance & Addons', desc: 'Taxes, Times & Plugins', icon: Sparkles },
        { num: 5, title: 'Admin Master', desc: 'Credentials & POS PIN', icon: Key }
    ];

    const progressPercent = Math.min(100, Math.round(((currentStep - 1) / 4) * 100));

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/70 text-slate-800 pb-20">
            
            {/* TOP NAVIGATION & STEPPER BAR */}
            <div className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
                    <div className="flex items-center justify-between gap-4">
                        
                        {/* Left: Back button & Title */}
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onBack || (() => window.history.back())}
                                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-slate-700 transition cursor-pointer shadow-2xs active:scale-95"
                                title="Go Back to Portfolio"
                            >
                                <ArrowLeft size={16} />
                            </button>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-base font-bold text-slate-900 tracking-tight">
                                        Hotel Tenant Onboarding Wizard
                                    </h1>
                                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                        Cloud Provisioner
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 hidden sm:block">
                                    Automated Database Allocation, Relational Inventory Generation &amp; HRM Bootstrapping
                                </p>
                            </div>
                        </div>

                        {/* Right: Step Status */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Step {currentStep} of 5</span>
                                <span className="text-xs font-extrabold text-blue-700 block">
                                    {steps.find(s => s.num === currentStep)?.title || 'Provisioning'}
                                </span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-mono font-bold text-sm flex items-center justify-center shadow-xs">
                                {currentStep <= 5 ? `${currentStep}/5` : '✓'}
                            </div>
                        </div>

                    </div>

                    {/* Linear Progress Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-full transition-all duration-300 rounded-full"
                            style={{ width: `${currentStep === 6 ? 100 : progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Stepper Navigation Pills (Steps 1 to 5) */}
                {currentStep <= 5 && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 overflow-x-auto">
                        <div className="grid grid-cols-5 gap-2 min-w-[640px]">
                            {steps.map(step => {
                                const isDone = currentStep > step.num;
                                const isCurrent = currentStep === step.num;

                                return (
                                    <button
                                        key={step.num}
                                        type="button"
                                        onClick={() => step.num < currentStep && setCurrentStep(step.num)}
                                        disabled={step.num > currentStep}
                                        className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                                            isCurrent
                                                ? 'bg-blue-50/90 border border-blue-200 text-blue-900 shadow-2xs ring-1 ring-blue-500/20'
                                                : isDone
                                                    ? 'text-emerald-700 hover:bg-slate-50'
                                                    : 'text-slate-400 opacity-60 cursor-not-allowed'
                                        }`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                            isDone
                                                ? 'bg-emerald-600 text-white shadow-2xs'
                                                : isCurrent
                                                    ? 'bg-blue-600 text-white shadow-xs'
                                                    : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {isDone ? <Check size={14} className="stroke-[3]" /> : step.num}
                                        </div>
                                        <div className="truncate">
                                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">
                                                Step {step.num}
                                            </span>
                                            <span className="text-xs font-bold truncate block">
                                                {step.title}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* MAIN WIZARD BODY (2-COLUMN LAYOUT) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT COLUMN: ACTIVE STEP FORM (8 COLS) */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* STEP 1: Hotel Brand & Identity */}
                        {currentStep === 1 && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
                                <div className="border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Building2 size={18} />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900">
                                                Hotel Brand, Identity &amp; Physical Location
                                            </h2>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Enter the property name and contact details. The system creates unique cluster routing identifiers automatically.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                                    
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                            Hotel or Resort Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={propName}
                                            onChange={e => handleNameChange(e.target.value)}
                                            placeholder="e.g. Radisson Blu Bay Resort & Spa"
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white shadow-2xs transition"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                            Property Code
                                        </label>
                                        <input
                                            type="text"
                                            value={propCode}
                                            onChange={e => setPropCode(e.target.value.toUpperCase())}
                                            placeholder="RBR"
                                            maxLength={8}
                                            className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-sm font-mono font-bold outline-none focus:border-blue-500 focus:bg-white uppercase shadow-2xs transition"
                                        />
                                    </div>

                                    <div className="sm:col-span-3 space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                            Tenant URL Slug (Unique Database &amp; Cluster Identifier) *
                                        </label>
                                        <div className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl bg-slate-50/80 focus-within:border-blue-500 focus-within:bg-white shadow-2xs transition">
                                            <span className="text-slate-400 font-mono text-xs select-none">hotelos.cloud/</span>
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

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                            Star Rating
                                        </label>
                                        <div className="flex items-center gap-1 p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setStarRating(star)}
                                                    className={`p-1.5 rounded-lg transition cursor-pointer flex-1 flex justify-center ${
                                                        star <= starRating ? 'text-amber-500 hover:scale-110' : 'text-slate-300'
                                                    }`}
                                                >
                                                    <Star size={15} fill={star <= starRating ? 'currentColor' : 'none'} />
                                                </button>
                                            ))}
                                            <span className="text-[11px] font-bold text-amber-700 px-1 font-mono">{starRating}★</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                            Property Type
                                        </label>
                                        <select
                                            value={propertyType}
                                            onChange={e => setPropertyType(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 bg-white shadow-2xs font-semibold cursor-pointer"
                                        >
                                            <option value="LUXURY_RESORT">Beachfront Luxury Resort</option>
                                            <option value="CITY_HOTEL">City Business Hotel</option>
                                            <option value="BOUTIQUE_VILLA">Boutique Eco Villa</option>
                                            <option value="AIRPORT_TRANSIT">Airport Transit Hotel</option>
                                            <option value="HERITAGE_PALACE">Heritage Palace Hotel</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                            Operating Currency
                                        </label>
                                        <select
                                            value={currency}
                                            onChange={e => setCurrency(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-500 bg-white shadow-2xs cursor-pointer"
                                        >
                                            <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                                            <option value="USD">USD ($) - US Dollar</option>
                                            <option value="EUR">EUR (€) - Euro</option>
                                            <option value="GBP">GBP (£) - British Pound</option>
                                            <option value="SAR">SAR (﷼) - Saudi Riyal</option>
                                            <option value="AED">AED (د.إ) - UAE Dirham</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                            Time Zone
                                        </label>
                                        <select
                                            value={timeZone}
                                            onChange={e => setTimeZone(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-blue-500 bg-white shadow-2xs cursor-pointer"
                                        >
                                            <option value="Asia/Dhaka">Asia/Dhaka (GMT+06:00)</option>
                                            <option value="Asia/Dubai">Asia/Dubai (GMT+04:00)</option>
                                            <option value="Asia/Singapore">Asia/Singapore (GMT+08:00)</option>
                                            <option value="Europe/London">Europe/London (GMT+00:00)</option>
                                            <option value="America/New_York">America/New_York (GMT-05:00)</option>
                                        </select>
                                    </div>

                                    <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">City / Region *</label>
                                            <input
                                                type="text"
                                                value={city}
                                                onChange={e => setCity(e.target.value)}
                                                placeholder="Cox's Bazar"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white shadow-2xs font-medium"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Country *</label>
                                            <input
                                                type="text"
                                                value={country}
                                                onChange={e => setCountry(e.target.value)}
                                                placeholder="Bangladesh"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white shadow-2xs font-medium"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Official Phone</label>
                                            <input
                                                type="text"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                placeholder="+880 1711-000000"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white shadow-2xs font-medium"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Hotel Email</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                placeholder="info@hotelms.com"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white shadow-2xs font-medium"
                                            />
                                        </div>

                                        <div className="sm:col-span-3 space-y-1.5">
                                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Full Physical Street Address</label>
                                            <input
                                                type="text"
                                                value={address}
                                                onChange={e => setAddress(e.target.value)}
                                                placeholder="Plot 15, Marine Drive Road, Kolatoli Beach, Cox's Bazar"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white shadow-2xs font-medium"
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* STEP 2: Architecture Strategy */}
                        {currentStep === 2 && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
                                <div className="border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <Database size={18} />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900">
                                                Database Architecture &amp; Density Strategy
                                            </h2>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Select the database isolation strategy. Standard supports 1,000+ properties with zero connection pool overhead.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    {/* Standard High-Density */}
                                    <div 
                                        onClick={() => setTier('STANDARD')}
                                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                                            tier === 'STANDARD'
                                                ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/20'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                                    <Layers size={20} />
                                                </div>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                                                    Recommended for 1,000+ Scale
                                                </span>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900">Standard Tier (High-Density Shared Clustered DB)</h3>
                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                    Shares high-performance PostgreSQL cluster partition with automatic row-level property scoping. Zero connection leaks, sub-millisecond response, and instant migrations.
                                                </p>
                                            </div>

                                            <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/60 font-medium">
                                                <li className="flex items-center gap-2 text-emerald-700">
                                                    <Check size={14} className="stroke-[3]" /> Zero connection pool overhead (Shares master pool)
                                                </li>
                                                <li className="flex items-center gap-2 text-emerald-700">
                                                    <Check size={14} className="stroke-[3]" /> Rapid provisioning in &lt; 1 second
                                                </li>
                                                <li className="flex items-center gap-2 text-emerald-700">
                                                    <Check size={14} className="stroke-[3]" /> Seamless 1-click live promotion to Dedicated DB
                                                </li>
                                                <li className="flex items-center gap-2 text-slate-500">
                                                    <Check size={14} /> Shared schema partition with property_id index
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-700">Target Engine:</span>
                                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                                                postgres (Shared Cluster)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Enterprise Dedicated DB */}
                                    <div 
                                        onClick={() => setTier('ENTERPRISE')}
                                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                                            tier === 'ENTERPRISE'
                                                ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-500/20'
                                                : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                                                    <Database size={20} />
                                                </div>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase">
                                                    100% Physical Isolation
                                                </span>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900">Enterprise VIP Tier (Dedicated Physical Database)</h3>
                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                    Provisions an isolated physical TiDB PostgreSQL database exclusively for this property. Allows custom schemas, dedicated addon tables, and zero blast-radius.
                                                </p>
                                            </div>

                                            <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/60 font-medium">
                                                <li className="flex items-center gap-2 text-indigo-700">
                                                    <Check size={14} className="stroke-[3]" /> Dedicated physical database (`tenant_{propSlug.replace(/-/g, '_') || '...'}`)
                                                </li>
                                                <li className="flex items-center gap-2 text-indigo-700">
                                                    <Check size={14} className="stroke-[3]" /> Zero blast radius on other properties during custom DDL
                                                </li>
                                                <li className="flex items-center gap-2 text-indigo-700">
                                                    <Check size={14} className="stroke-[3]" /> Managed LRU Connection Pooler (Max 20 Pools)
                                                </li>
                                                <li className="flex items-center gap-2 text-indigo-700">
                                                    <Check size={14} className="stroke-[3]" /> Custom schema alterations &amp; modular plugins
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-200/70 flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-700">Target Engine:</span>
                                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded truncate max-w-[200px]">
                                                tenant_{propSlug.replace(/-/g, '_') || 'hotel'}
                                            </span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* STEP 3: Physical Architecture & Room Inventory */}
                        {currentStep === 3 && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
                                <div className="border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                            <BedDouble size={18} />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900">
                                                Building Architecture &amp; Room Matrix Generator
                                            </h2>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Configure building floors and rooms. The engine generates all physical rooms and links them to room types in 1NF–4NF schema.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Building Configuration Controls */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Wing / Tower Name</label>
                                        <input
                                            type="text"
                                            value={buildingName}
                                            onChange={e => setBuildingName(e.target.value)}
                                            placeholder="e.g. Royal Tower Wing"
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-blue-500 shadow-2xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Total Floors</label>
                                            <span className="font-mono font-bold text-blue-700">{totalFloors} Floors</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={1}
                                            max={10}
                                            value={totalFloors}
                                            onChange={e => setTotalFloors(Number(e.target.value))}
                                            className="w-full accent-blue-600 cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                                            <span>1</span>
                                            <span>5</span>
                                            <span>10</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Rooms Per Floor</label>
                                            <span className="font-mono font-bold text-blue-700">{roomsPerFloor} Rooms/Flr</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={2}
                                            max={12}
                                            value={roomsPerFloor}
                                            onChange={e => setRoomsPerFloor(Number(e.target.value))}
                                            className="w-full accent-blue-600 cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                                            <span>2</span>
                                            <span>6</span>
                                            <span>12</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Room Types Customizer */}
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                        Configured Room Types &amp; Base Rates ({currency})
                                    </label>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {roomTypes.map((rt, idx) => (
                                            <div key={rt.code} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5 shadow-2xs">
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
                                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-blue-500"
                                                />
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-bold text-slate-500">{currency}</span>
                                                    <input
                                                        type="number"
                                                        value={rt.baseRate}
                                                        onChange={e => {
                                                            const updated = [...roomTypes];
                                                            updated[idx].baseRate = Number(e.target.value);
                                                            setRoomTypes(updated);
                                                        }}
                                                        className="w-full px-2.5 py-1 border border-slate-200 rounded-lg text-xs font-bold font-mono outline-none focus:border-blue-500"
                                                    />
                                                    <span className="text-[10px] text-slate-400">/night</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Live Generated Room Grid Matrix */}
                                <div className="space-y-2 pt-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <CheckCircle2 size={15} className="text-emerald-600" />
                                            <span>Generated Physical Inventory: <strong className="text-emerald-700">{totalRoomsCount} Rooms</strong></span>
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-400">Status: Clean • Active</span>
                                    </div>

                                    <div className="max-h-52 overflow-y-auto p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-2 shadow-inner">
                                        {Array.from({ length: totalFloors }).map((_, fIdx) => {
                                            const floorNum = fIdx + 1;
                                            return (
                                                <div key={floorNum} className="flex items-center gap-2.5">
                                                    <span className="w-18 text-[11px] font-bold text-slate-400 uppercase font-mono">
                                                        Floor {floorNum}:
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {Array.from({ length: roomsPerFloor }).map((_, rIdx) => {
                                                            const rNum = `${floorNum}${rIdx + 1 < 10 ? '0' + (rIdx + 1) : rIdx + 1}`;
                                                            const rt = roomTypes[(fIdx * roomsPerFloor + rIdx) % roomTypes.length];
                                                            return (
                                                                <span
                                                                    key={rNum}
                                                                    className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-slate-800 text-slate-100 border border-slate-700 shadow-2xs flex items-center gap-1.5"
                                                                >
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                                    <span>{rNum}</span>
                                                                    <span className="text-[9.5px] text-blue-300 font-semibold opacity-75">
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

                        {/* STEP 4: Financial Defaults & Modular Addon Plugins */}
                        {currentStep === 4 && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
                                <div className="border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                            <Sparkles size={18} />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900">
                                                Financial Policies &amp; Modular Addon Plugins
                                            </h2>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Configure automated tax calculation rates, check-in/out times, and enable optional business modules.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Tax & Schedule Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">VAT / Tax Rate (%)</label>
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

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Service Charge (%)</label>
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

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                            <Clock size={12} className="text-slate-400" />
                                            <span>Check-In Time</span>
                                        </label>
                                        <input
                                            type="time"
                                            value={checkInTime}
                                            onChange={e => setCheckInTime(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-mono text-xs font-bold text-slate-700 shadow-2xs outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                            <Clock size={12} className="text-slate-400" />
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
                                <div className="space-y-2.5">
                                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                        Select Modular Plugins for Property (Auto-Provisioned)
                                    </label>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        {[
                                            {
                                                key: 'banquet_events',
                                                name: 'Banquet & Event Operations',
                                                desc: 'Halls scheduling, audio-visual resources, seating layout, and per-plate catering invoicing.',
                                                icon: Sparkles
                                            },
                                            {
                                                key: 'spa_wellness',
                                                name: 'Spa & Wellness Hub',
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
                                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                                                        isSelected 
                                                            ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs ring-1 ring-indigo-500/20' 
                                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}}
                                                        className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                    <div className="space-y-1">
                                                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                            <p.icon size={13} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                                                            <span>{p.name}</span>
                                                        </h4>
                                                        <p className="text-[11px] text-slate-500 leading-snug">{p.desc}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 5: Administrator Credentials & Review */}
                        {currentStep === 5 && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-6">
                                <div className="border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Key size={18} />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900">
                                                General Manager &amp; Super Admin Credentials
                                            </h2>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Set up the master property administrator. This account will have full access across the HRM roster and Front Desk POS.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Administrator Full Name *</label>
                                        <input
                                            type="text"
                                            value={adminName}
                                            onChange={e => setAdminName(e.target.value)}
                                            placeholder="e.g. Rashid Khan"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white shadow-2xs font-semibold"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Official Work Email *</label>
                                        <input
                                            type="email"
                                            value={adminEmail}
                                            onChange={e => setAdminEmail(e.target.value)}
                                            placeholder="gm@hotelms.com"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white shadow-2xs font-semibold"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Emergency Contact Phone</label>
                                        <input
                                            type="text"
                                            value={adminPhone}
                                            onChange={e => setAdminPhone(e.target.value)}
                                            placeholder="+880 1711-223344"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 focus:bg-white shadow-2xs font-medium"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Quick Front Desk POS PIN (4 Digits)</label>
                                        <input
                                            type="text"
                                            value={posPin}
                                            onChange={e => setPosPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                                            maxLength={4}
                                            placeholder="1234"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold tracking-widest outline-none focus:border-blue-500 focus:bg-white shadow-2xs"
                                        />
                                    </div>
                                </div>

                                {/* Pre-flight Verification Card */}
                                <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-xs space-y-1.5">
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold">
                                        <CheckCircle size={15} className="text-emerald-600" />
                                        <span>Pre-Flight Verification Complete: Ready for Automated Provisioning</span>
                                    </div>
                                    <p className="text-emerald-700 text-[11px] leading-relaxed">
                                        Clicking the button below will immediately create your schema partitions, configure your {totalRoomsCount} rooms, and register the administrative account in the central control plane.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* STEP 6: Provisioning Terminal & Success Stream */}
                        {currentStep === 6 && (
                            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 text-center space-y-6">
                                {isProvisioning ? (
                                    <div className="space-y-4 max-w-md mx-auto">
                                        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                                            <RefreshCw size={32} className="animate-spin" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">Provisioning Property &amp; Database Architecture...</h3>
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
                                            <h3 className="text-xl font-black text-slate-900 mt-2">{propName}</h3>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {tier === 'ENTERPRISE'
                                                    ? `Dedicated physical database '${provisionResult?.dbName}' created and ready.`
                                                    : `High-Density Standard property initialized in shared cluster.`}
                                            </p>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5 font-mono">
                                            <div><strong className="text-slate-500">Tenant Slug:</strong> {propSlug}</div>
                                            <div><strong className="text-slate-500">Database Engine:</strong> {provisionResult?.dbName || 'postgres'}</div>
                                            <div><strong className="text-slate-500">Physical Rooms:</strong> {provisionResult?.roomsCount || totalRoomsCount} Rooms</div>
                                            <div><strong className="text-slate-500">Admin Account:</strong> {adminEmail || email}</div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                                            <button
                                                type="button"
                                                onClick={handleLaunchFrontDesk}
                                                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
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
                                                Portfolio Console
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-w-md mx-auto">
                                        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                                            <AlertCircle size={36} className="stroke-[2.5]" />
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

                                {/* MAC-STYLE EXECUTION LOGS TERMINAL */}
                                <div className="text-left max-w-xl mx-auto bg-slate-950 rounded-2xl p-4 font-mono text-[11px] text-slate-300 space-y-2 border border-slate-800 shadow-2xl">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                                            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                                            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Cloud Terminal</span>
                                    </div>
                                    <div className="space-y-1 pt-1 max-h-48 overflow-y-auto">
                                        {provisioningLogs.map((log, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                <span className="text-blue-400 select-none">&gt;</span>
                                                <span className={log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('❌') ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                                                    {log}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* WIZARD BOTTOM NAVIGATION BAR */}
                        {currentStep <= 5 && (
                            <div className="flex items-center justify-between pt-2">
                                {currentStep > 1 ? (
                                    <button
                                        type="button"
                                        onClick={handlePrevStep}
                                        className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer transition active:scale-95"
                                    >
                                        <ChevronLeft size={16} />
                                        <span>Previous Step</span>
                                    </button>
                                ) : (
                                    <div />
                                )}

                                {currentStep < 5 ? (
                                    <button
                                        type="button"
                                        onClick={handleNextStep}
                                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition active:scale-95"
                                    >
                                        <span>Continue to Step {currentStep + 1}</span>
                                        <ChevronRight size={16} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleLaunchProvisioning}
                                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition ring-2 ring-indigo-200 active:scale-95"
                                    >
                                        <Sparkles size={16} />
                                        <span>Launch &amp; Provision Tenant Property</span>
                                    </button>
                                )}
                            </div>
                        )}

                    </div>

                    {/* RIGHT COLUMN: LIVE PROPERTY PASSPORT PREVIEW (4 COLS) */}
                    <div className="lg:col-span-4 sticky top-28 space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                    Property Passport Preview
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    Live Twin
                                </span>
                            </div>

                            {/* Hotel Identity Card */}
                            <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white space-y-3 shadow-md">
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center font-bold text-sm text-blue-300 border border-white/10">
                                        {(propName || 'Hotel').slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/10 border border-white/20 text-slate-200">
                                        {propCode || 'CODE'}
                                    </span>
                                </div>

                                <div>
                                    <h4 className="font-bold text-base text-white tracking-tight leading-snug">
                                        {propName || 'Your Hotel Name'}
                                    </h4>
                                    <div className="flex items-center gap-1.5 mt-1 text-amber-400 text-xs">
                                        {[...Array(starRating)].map((_, i) => (
                                            <Star key={i} size={12} fill="currentColor" />
                                        ))}
                                        <span className="text-[11px] text-slate-300 ml-1">
                                            {city || 'Dhaka'}, {country || 'Bangladesh'}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300 font-mono">
                                    <span>hotelos.cloud/{propSlug || 'slug'}</span>
                                    <span className="text-emerald-400 font-bold">{currency}</span>
                                </div>
                            </div>

                            {/* Architecture & Specs Summary */}
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                    <span className="text-slate-500">Isolation Tier</span>
                                    <span className="font-bold text-slate-900">
                                        {tier === 'ENTERPRISE' ? 'Enterprise Dedicated DB' : 'Standard Clustered'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                    <span className="text-slate-500">Total Capacity</span>
                                    <span className="font-bold font-mono text-emerald-700">
                                        {totalRoomsCount} Physical Rooms ({totalFloors} Flr)
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                    <span className="text-slate-500">Check-In / Out</span>
                                    <span className="font-bold font-mono text-slate-700">
                                        {checkInTime} / {checkOutTime}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                                    <span className="text-slate-500">Tax Schedule</span>
                                    <span className="font-bold font-mono text-slate-700">
                                        {taxVatPercent}% VAT + {serviceChargePercent}% SC
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-1.5">
                                    <span className="text-slate-500">General Manager</span>
                                    <span className="font-bold text-slate-900 truncate max-w-[150px]">
                                        {adminName || 'Not Set Yet'}
                                    </span>
                                </div>
                            </div>

                            {/* Active Plugins Pills */}
                            <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Modular Addons ({selectedPlugins.length})
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {selectedPlugins.map(p => (
                                        <span key={p} className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            {p.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Security Guarantee Box */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200/80 text-xs text-blue-900 space-y-1.5 shadow-2xs">
                            <div className="flex items-center gap-1.5 font-bold">
                                <Shield size={14} className="text-blue-600" />
                                <span>Multi-Tenant Architecture Guarantee</span>
                            </div>
                            <p className="text-[11px] text-blue-800/80 leading-relaxed">
                                Complete relational isolation, zero connection pool exhaustion, and automated cross-tenant security guardrails.
                            </p>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
};

export default TenantOnboardingWizard;
