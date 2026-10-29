import { useState, useMemo, useEffect } from 'react';
import {
    Plus, Search, Package, Edit, Copy, Trash2,
    Utensils, Waves, Car, Shirt, Wine, Dumbbell, Star,
    Check, X, Info, DollarSign, Calendar,
    BedDouble, Users, ArrowLeft, Save, Eye, ToggleLeft,
    ToggleRight, AlertCircle, Zap, Shield, Gift, TrendingUp,
    RefreshCw, AlertTriangle, CheckCircle2, Sparkles, Clock
} from 'lucide-react';
import { generateUniqueShortCode, isShortCodeDuplicate } from '../utils/codeGenerator';
import { getApiBaseUrl } from '../utils/apiUrl';
import { broadcastPMSEvent, getDynamicRoomTypes } from '../utils/roomInventoryEngine';
import PageHeader from './common/PageHeader';

// ============================================================
// DATA TYPES
// ============================================================

interface LaundryItem {
    name: string;
    includedQty: number;
    extraRate: number;
}

interface MinibarItem {
    name: string;
    category: 'Beverage' | 'Snack' | 'Spirit' | 'Non-Alcoholic';
    qty: number;
    unitPrice: number;
}

interface RecreationActivity {
    name: string;
    includedSessions: number;
    adultRate: number;
    childRate: number;
    minAge?: number;
}

interface OutletCredit {
    outletName: string;
    creditType: 'Per Stay' | 'Per Day';
    creditAmount: number;
    revenueCode: string;
}

interface HotelPackage {
    id: number;
    name: string;
    shortCode: string;
    packageType: 'Standard' | 'Honeymoon' | 'Family' | 'Corporate' | 'Seasonal' | 'Group';
    status: 'Active' | 'Inactive' | 'Draft';
    description: string;
    color: string;

    roomConfig: {
        applicableRoomTypes: string[];
        extraBedAllowed: boolean;
        extraBedRate: number;
        extraAdultRate: number;
        extraChildRate: number;
        childAgeFrom: number;
        childAgeTo: number;
        infantFree: boolean;
        infantMaxAge: number;
        maxExtraBeds: number;
        extraBedMealIncluded: boolean;
        welcomeAmenity: string;
        lateCheckoutAllowed: boolean;
        lateCheckoutTime: string;
        wifiIncluded: boolean;
        priorityCheckin: boolean;
    };

    mealInclusions: {
        hasBreakfast: boolean; breakfastVenue: string; breakfastStyle: string; breakfastMenu: string; breakfastCuisine: string;
        breakfastAdultRate: number; breakfastChildRate: number; breakfastInfantFree: boolean;
        
        hasLunch: boolean; lunchVenue: string; lunchStyle: string; lunchAdultRate: number; lunchChildRate: number; lunchMenu: string; lunchCuisine: string;
        
        hasDinner: boolean; dinnerVenue: string; dinnerStyle: string; dinnerMenu: string; dinnerCuisine: string;
        dinnerCredit: number; dinnerAdultRate: number; dinnerChildRate: number;
        
        hasBrunch: boolean; brunchVenue: string; brunchStyle: string; brunchAdultRate: number; brunchMenu: string; brunchCuisine: string;
        
        hasCupole: boolean; cupoleVenue: string; cupoleStyle: string; cupoleCredit: number; cupoleMenu: string; cupoleCuisine: string;
    };

    poolConfig: {
        included: boolean;
        complimentaryAdults: number;
        complimentaryChildren: number;
        extraAdultRate: number;
        extraChildRate: number;
    };

    transportConfig: {
        type: 'None' | 'Pickup' | 'Drop' | 'Both';
        vehicleType: string;
        pickupRate: number;
        dropRate: number;
    };

    laundryConfig: {
        included: boolean;
        allowanceType: 'Per Stay' | 'Per Day' | 'Every 3 Days';
        itemsAllowance: number;
        extraItemRate: number;
        items: LaundryItem[];
    };

    minibarConfig: {
        included: boolean;
        dailyCredit: number;
        replenishment: 'Daily' | 'Every 2 Days' | 'On Request';
        items: MinibarItem[];
    };

    recreationConfig: {
        included: boolean;
        activities: RecreationActivity[];
    };

    outletCredits: OutletCredit[];

    validity: {
        startDate: string;
        endDate: string;
        minNights: number;
        maxNights: number;
        blackoutDates: string;
    };

    finance: {
        baseSurcharge: number;
        dateBasedSurcharges: {
            dateRange: string;
            surchargeAmount: number;
            reason: string;
        }[];
        autoPost: boolean;
        revenueAllocations: {
            department: string;
            amount: number;
            type: 'Fixed' | 'Percentage';
        }[];
        totalCost: number; // The internal cost for the hotel to provide this bundle
    };
}

// ============================================================
// CONFIGURATION DEFAULTS
// ============================================================

const defaultPackage = (): Omit<HotelPackage, 'id'> => ({
    name: '',
    shortCode: '',
    packageType: 'Standard',
    status: 'Draft',
    description: '',
    color: '#3B82F6',
    roomConfig: {
        applicableRoomTypes: [],
        extraBedAllowed: true,
        extraBedRate: 2500,
        extraAdultRate: 2000,
        extraChildRate: 1000,
        childAgeFrom: 5,
        childAgeTo: 12,
        infantFree: true,
        infantMaxAge: 4,
        maxExtraBeds: 1,
        extraBedMealIncluded: false,
        welcomeAmenity: '',
        lateCheckoutAllowed: false,
        lateCheckoutTime: '12:00',
        wifiIncluded: true,
        priorityCheckin: false
    },
    mealInclusions: {
        hasBreakfast: false, breakfastVenue: '', breakfastStyle: 'Buffet', breakfastMenu: '', breakfastCuisine: '',
        breakfastAdultRate: 0, breakfastChildRate: 0, breakfastInfantFree: true,
        hasLunch: false, lunchVenue: '', lunchStyle: 'Buffet', lunchAdultRate: 0, lunchChildRate: 0, lunchMenu: '', lunchCuisine: '',
        hasDinner: false, dinnerVenue: '', dinnerStyle: 'Buffet', dinnerMenu: '', dinnerCuisine: '',
        dinnerCredit: 0, dinnerAdultRate: 0, dinnerChildRate: 0,
        hasBrunch: false, brunchVenue: '', brunchStyle: 'Buffet', brunchAdultRate: 0, brunchMenu: '', brunchCuisine: '',
        hasCupole: false, cupoleVenue: '', cupoleStyle: 'Set Menu', cupoleCredit: 0, cupoleMenu: '', cupoleCuisine: '',
    },
    poolConfig: { included: false, complimentaryAdults: 2, complimentaryChildren: 1, extraAdultRate: 500, extraChildRate: 300 },
    transportConfig: { type: 'None', vehicleType: 'Sedan', pickupRate: 1500, dropRate: 1500 },
    laundryConfig: {
        included: false,
        allowanceType: 'Per Stay',
        itemsAllowance: 10,
        extraItemRate: 150,
        items: [
            { name: 'Shirt', includedQty: 3, extraRate: 120 },
            { name: 'Trouser', includedQty: 2, extraRate: 150 },
            { name: 'Dress', includedQty: 2, extraRate: 200 },
            { name: 'Underwear', includedQty: 3, extraRate: 80 },
        ]
    },
    minibarConfig: {
        included: false,
        dailyCredit: 500,
        replenishment: 'Daily',
        items: [
            { name: 'Water 500ml', category: 'Beverage', qty: 4, unitPrice: 80 },
            { name: 'Soft Drink', category: 'Beverage', qty: 2, unitPrice: 120 },
            { name: 'Juice', category: 'Beverage', qty: 2, unitPrice: 150 },
            { name: 'Nuts', category: 'Snack', qty: 2, unitPrice: 200 },
            { name: 'Chocolate', category: 'Snack', qty: 2, unitPrice: 180 },
        ]
    },
    recreationConfig: {
        included: false,
        activities: [
            { name: 'Horse Riding', includedSessions: 1, adultRate: 1200, childRate: 800, minAge: 8 },
            { name: 'Rock Climbing', includedSessions: 1, adultRate: 900, childRate: 600, minAge: 12 },
            { name: 'Cycling', includedSessions: 2, adultRate: 400, childRate: 300, minAge: 6 },
        ]
    },
    outletCredits: [],
    validity: { startDate: '', endDate: '', minNights: 1, maxNights: 30, blackoutDates: '' },
    finance: { baseSurcharge: 0, totalCost: 0, dateBasedSurcharges: [], autoPost: true, revenueAllocations: [] }
});

export const normalizePackage = (raw: any): HotelPackage => {
    const base = defaultPackage();
    if (!raw || typeof raw !== 'object') return { ...base, id: Date.now() };
    return {
        ...base,
        ...raw,
        id: raw.id || Date.now(),
        roomConfig: { ...base.roomConfig, ...(raw.roomConfig || {}) },
        mealInclusions: { ...base.mealInclusions, ...(raw.mealInclusions || {}) },
        poolConfig: { ...base.poolConfig, ...(raw.poolConfig || {}) },
        transportConfig: { ...base.transportConfig, ...(raw.transportConfig || {}) },
        laundryConfig: { ...base.laundryConfig, ...(raw.laundryConfig || {}) },
        minibarConfig: { ...base.minibarConfig, ...(raw.minibarConfig || {}) },
        recreationConfig: { ...base.recreationConfig, ...(raw.recreationConfig || {}) },
        outletCredits: Array.isArray(raw.outletCredits) ? raw.outletCredits : [],
        validity: { ...base.validity, ...(raw.validity || {}) },
        finance: { ...base.finance, ...(raw.finance || {}) }
    };
};

// ============================================================
// ALLOWANCE ENGINE PREVIEW
// ============================================================

const AllowanceEngineViewer = ({ pkg }: { pkg: HotelPackage }) => {
    const safePkg = normalizePackage(pkg);
    const rules: { icon: React.ReactNode; label: string; detail: string; code: string; dept: string }[] = [];

    if (safePkg.mealInclusions?.hasBreakfast) rules.push({
        icon: <Utensils size={14} />,
        label: `Breakfast (${safePkg.mealInclusions.breakfastStyle || 'Buffet'})`,
        detail: `${safePkg.mealInclusions.breakfastMenu || 'Standard'} · ${safePkg.mealInclusions.breakfastCuisine || 'Continental'} · ${safePkg.mealInclusions.breakfastVenue || 'Restaurant'}`,
        code: 'REV-FB-BRKFST', dept: 'DEPT-02 F&B'
    });
    if (safePkg.mealInclusions?.hasLunch) rules.push({
        icon: <Utensils size={14} />,
        label: `Lunch (${safePkg.mealInclusions.lunchStyle || 'Buffet'})`,
        detail: `${safePkg.mealInclusions.lunchMenu || 'Standard'} · ${safePkg.mealInclusions.lunchCuisine || 'Multi-Cuisine'} · ${safePkg.mealInclusions.lunchVenue || 'Restaurant'}`,
        code: 'REV-FB-LUNCH', dept: 'DEPT-02 F&B'
    });
    if (safePkg.mealInclusions?.hasDinner) rules.push({
        icon: <Utensils size={14} />,
        label: `Dinner (${safePkg.mealInclusions.dinnerStyle || 'Buffet'})`,
        detail: safePkg.mealInclusions.dinnerStyle === 'Credit' ? `৳${safePkg.mealInclusions.dinnerCredit || 0} limit · ${safePkg.mealInclusions.dinnerMenu || 'Standard'} · ${safePkg.mealInclusions.dinnerVenue || 'Restaurant'}` : `${safePkg.mealInclusions.dinnerMenu || 'Standard'} · ${safePkg.mealInclusions.dinnerCuisine || 'Multi-Cuisine'} · ${safePkg.mealInclusions.dinnerVenue || 'Restaurant'}`,
        code: 'REV-FB-DINNER', dept: 'DEPT-02 F&B'
    });
    if (safePkg.mealInclusions?.hasCupole) rules.push({
        icon: <Star size={14} />,
        label: 'Cupole Rooftop Dinner',
        detail: `৳${safePkg.mealInclusions.cupoleCredit || 0} limit · ${safePkg.mealInclusions.cupoleMenu || 'Special'} · ${safePkg.mealInclusions.cupoleVenue || 'Rooftop'}`,
        code: 'REV-FB-CUPOLE', dept: 'DEPT-02 F&B'
    });
    if (safePkg.roomConfig?.welcomeAmenity) rules.push({
        icon: <Gift size={14} />,
        label: 'Welcome Experience',
        detail: `${safePkg.roomConfig.welcomeAmenity}${safePkg.roomConfig.priorityCheckin ? ' · Priority Check-in' : ''}${safePkg.roomConfig.lateCheckoutAllowed ? ' · Late Checkout (2PM)' : ''}`,
        code: 'REV-RM-AMENITY', dept: 'DEPT-01 Rooms'
    });
    if (safePkg.roomConfig?.wifiIncluded) rules.push({
        icon: <Zap size={14} />,
        label: 'Connectivity',
        detail: 'High-speed Fiber WiFi included for all devices',
        code: 'REV-RM-WIFI', dept: 'DEPT-01 Rooms'
    });
    if (safePkg.poolConfig?.included) rules.push({
        icon: <Waves size={14} />,
        label: 'Swimming Pool',
        detail: `${safePkg.poolConfig.complimentaryAdults || 0} Adults + ${safePkg.poolConfig.complimentaryChildren || 0} Children complimentary · Extra Adult ৳${safePkg.poolConfig.extraAdultRate || 0}`,
        code: 'REV-REC-POOL', dept: 'DEPT-04 Recreation'
    });
    if (safePkg.transportConfig?.type && safePkg.transportConfig.type !== 'None') rules.push({
        icon: <Car size={14} />,
        label: `Airport Transfer (${safePkg.transportConfig.type})`,
        detail: `${safePkg.transportConfig.vehicleType || 'Sedan'} · Pickup ৳${safePkg.transportConfig.pickupRate || 0} · Drop ৳${safePkg.transportConfig.dropRate || 0}`,
        code: 'REV-TRN-PCKU', dept: 'DEPT-05 Transport'
    });
    if (safePkg.laundryConfig?.included) rules.push({
        icon: <Shirt size={14} />,
        label: 'Laundry Allowance',
        detail: `${safePkg.laundryConfig.itemsAllowance || 0} items ${safePkg.laundryConfig.allowanceType || 'Per Stay'} · Extra ৳${safePkg.laundryConfig.extraItemRate || 0}/item`,
        code: 'REV-LAUN-STD', dept: 'DEPT-06 Minor'
    });
    if (safePkg.minibarConfig?.included) rules.push({
        icon: <Wine size={14} />,
        label: 'Minibar Credit',
        detail: `৳${safePkg.minibarConfig.dailyCredit || 0}/day credit · ${safePkg.minibarConfig.replenishment || 'Daily'} replenishment · Extra charged to folio`,
        code: 'REV-MINI-BAR', dept: 'DEPT-02 Minibar'
    });
    if (safePkg.recreationConfig?.included && Array.isArray(safePkg.recreationConfig.activities)) safePkg.recreationConfig.activities.forEach((act: RecreationActivity) => rules.push({
        icon: <Dumbbell size={14} />,
        label: act.name,
        detail: `${act.includedSessions || 1} session(s) included · Extra Adult ৳${act.adultRate || 0} · Child ৳${act.childRate || 0}`,
        code: 'REV-REC-SPORT', dept: 'DEPT-04 Recreation'
    }));
    if (Array.isArray(safePkg.outletCredits)) safePkg.outletCredits.forEach((oc: OutletCredit) => rules.push({
        icon: <Gift size={14} />,
        label: `${oc.outletName} Credit`,
        detail: `৳${oc.creditAmount || 0} ${oc.creditType || 'Fixed'} · Extra usage charged to folio`,
        code: oc.revenueCode || 'REV-OTHER', dept: 'DEPT-03 Spa/Other'
    }));

    const allocations = Array.isArray(safePkg.finance?.revenueAllocations) ? safePkg.finance.revenueAllocations : [];
    const surcharges = Array.isArray(safePkg.finance?.dateBasedSurcharges) ? safePkg.finance.dateBasedSurcharges : [];

    return (
        <div className="space-y-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp size={15} className="text-primary" /> Revenue Allocation Engine
                    </h4>
                    <div className="text-[10px] bg-primary-subtle text-primary px-2.5 py-0.5 rounded-full border border-primary-border font-bold">FINANCE V1.2</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {allocations.map((alloc, i) => (
                        <div key={i} className="flex flex-col gap-1 p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                            <span className="text-[10px] text-primary uppercase tracking-wider">{alloc.department}</span>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-900">
                                    {alloc.type === 'Fixed' ? `৳${alloc.amount.toLocaleString()}` : `${alloc.amount}%`}
                                </span>
                                <div className="h-1.5 flex-1 bg-slate-100 mx-3 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: alloc.type === 'Percentage' ? `${alloc.amount}%` : '40%' }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {surcharges.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-2">
                        <div className="text-[10px] text-amber-700 uppercase tracking-wider text-center">Seasonal Peak Rules Applied</div>
                        {surcharges.map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                                <span className="text-xs text-amber-900 font-medium">{s.reason}</span>
                                <span className="text-xs font-black text-amber-800 font-mono">+৳{s.surchargeAmount.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-5 text-xs space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2 mb-2 text-primary font-bold">
                    <Zap size={14} className="text-primary" />
                    <span>Allowance Engine — Auto-Routing Rules</span>
                </div>
                {rules.length === 0 && (
                    <div className="text-slate-400 text-center py-4">No inclusions configured yet</div>
                )}
                {rules.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
                        <div className="text-primary mt-0.5 flex-shrink-0">{r.icon}</div>
                        <div className="flex-1 min-w-0">
                            <div className="text-slate-900 font-semibold">{r.label}</div>
                            <div className="text-slate-500 text-[11px] truncate">{r.detail}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className="text-emerald-700 font-mono text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{r.code}</div>
                            <div className="text-slate-400 text-[10px] mt-0.5">{r.dept}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================
// PACKAGE FORM TABS
// ============================================================

type FormTab = 'basic' | 'room' | 'meals' | 'recreation' | 'transport' | 'laundry' | 'outlets' | 'validity' | 'finance';

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!checked)} className="flex-shrink-0">
        {checked
            ? <ToggleRight size={28} className="text-blue-500" />
            : <ToggleLeft size={28} className="text-gray-400" />}
    </button>
);

const FormSection = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <div className="text-blue-600">{icon}</div>
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
            {label}
            {hint && <span className="text-gray-400 font-normal">({hint})</span>}
        </label>
        {children}
    </div>
);

const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const sel = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

// ============================================================
// MAIN COMPONENT
// ============================================================

const PKG_STORAGE_KEY = 'hotel_packages_v2';

const PackageManagement = () => {
    const [packages, setPackages] = useState<HotelPackage[]>(() => {
        try {
            const saved = localStorage.getItem(PKG_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed.map(normalizePackage);
            }
        } catch {
            // fallback
        }
        return [];
    });
    const dynamicRoomTypes = useMemo(() => getDynamicRoomTypes().map(t => t.name), []);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingPackage, setEditingPackage] = useState<HotelPackage | null>(null);
    const [formData, setFormData] = useState<Omit<HotelPackage, 'id'>>(defaultPackage());
    const [activeTab, setActiveTab] = useState<FormTab>('basic');
    const [searchQuery, setSearchQuery] = useState('');
    const [previewMode, setPreviewMode] = useState(false);

    const persistPackages = (updated: HotelPackage[]) => {
        const normalized = updated.map(normalizePackage);
        setPackages(normalized);
        try {
            localStorage.setItem(PKG_STORAGE_KEY, JSON.stringify(normalized));
        } catch {
            // fallback
        }
    };

    const filtered = packages.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.shortCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [isCodeManual, setIsCodeManual] = useState(false);
    const existingCodes = useMemo(() => packages.map(p => p.shortCode), [packages]);

    useEffect(() => {
        fetch(`${getApiBaseUrl()}/api/rates/packages?propertyId=1`)
            .then(res => res.json())
            .then(json => {
                if (json.success && Array.isArray(json.data)) {
                    const normalized = json.data.map(normalizePackage);
                    setPackages(normalized);
                    localStorage.setItem(PKG_STORAGE_KEY, JSON.stringify(normalized));
                }
            })
            .catch(() => {});
    }, []);

    const openCreate = () => {
        setFormData(defaultPackage());
        setEditingPackage(null);
        setIsCodeManual(false);
        setActiveTab('basic');
        setView('form');
    };

    const openEdit = (pkg: HotelPackage) => {
        const safe = normalizePackage(pkg);
        setFormData({ ...safe });
        setEditingPackage(safe);
        setIsCodeManual(true);
        setActiveTab('basic');
        setView('form');
    };

    const handlePackageNameChange = (name: string) => {
        const currentCode = editingPackage?.shortCode;
        let nextCode = formData.shortCode;
        if (!isCodeManual || !nextCode) {
            nextCode = generateUniqueShortCode(name, existingCodes, { currentCode, maxLength: 8 });
        }
        setFormData(prev => ({ ...prev, name, shortCode: nextCode }));
    };

    const handleDuplicate = async (pkg: HotelPackage) => {
        const uniqueCode = generateUniqueShortCode(`${pkg.shortCode}-CPY`, existingCodes, { maxLength: 8 });
        let newPkg: HotelPackage = { ...pkg, id: Date.now(), name: `${pkg.name} (Copy)`, shortCode: uniqueCode, status: 'Draft' };
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/rates/packages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPkg)
            });
            const json = await res.json();
            if (json.success && json.data?.id) newPkg = { ...newPkg, id: json.data.id };
        } catch {}
        persistPackages([...packages, newPkg]);
        try {
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this package? Linked bookings will keep existing line-item snapshots.')) {
            try {
                await fetch(`${getApiBaseUrl()}/api/rates/packages/${id}`, { method: 'DELETE' });
            } catch {}
            const updated = packages.filter(p => p.id !== id);
            persistPackages(updated);
            try {
                broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            } catch {}
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.shortCode) {
            alert('Package Name and Short Code are required.');
            return;
        }
        const currentCode = editingPackage?.shortCode;
        if (isShortCodeDuplicate(formData.shortCode, existingCodes, currentCode)) {
            alert(`Short Code "${formData.shortCode}" is already in use by another package! Please provide a unique code.`);
            return;
        }

        const API_BASE = getApiBaseUrl();
        let finalPkg: HotelPackage;

        if (editingPackage) {
            finalPkg = { ...formData, id: editingPackage.id } as HotelPackage;
            try {
                await fetch(`${API_BASE}/api/rates/packages/${editingPackage.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(finalPkg)
                });
            } catch {}
        } else {
            finalPkg = { ...formData, id: Date.now() } as HotelPackage;
            try {
                const res = await fetch(`${API_BASE}/api/rates/packages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(finalPkg)
                });
                const json = await res.json();
                if (json.success && json.data?.id) finalPkg.id = json.data.id;
            } catch {}
        }

        let updated: HotelPackage[];
        if (editingPackage) {
            updated = packages.map(p => p.id === editingPackage.id ? finalPkg : p);
        } else {
            updated = [...packages, finalPkg];
        }
        persistPackages(updated);
        try {
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}
        setView('list');
    };

    const upd = (path: string, value: unknown) => {
        setFormData(prev => {
            const keys = path.split('.');
            const copy = { ...prev } as Record<string, unknown>;
            let cur = copy;
            for (let i = 0; i < keys.length - 1; i++) {
                cur[keys[i]] = { ...(cur[keys[i]] as Record<string, unknown>) };
                cur = cur[keys[i]] as Record<string, unknown>;
            }
            cur[keys[keys.length - 1]] = value;
            return copy as Omit<HotelPackage, 'id'>;
        });
    };

    const typeColors: Record<string, string> = {
        Honeymoon: 'bg-pink-100 text-pink-700 border-pink-200',
        Family: 'bg-green-100 text-green-700 border-green-200',
        Corporate: 'bg-blue-100 text-blue-700 border-blue-200',
        Standard: 'bg-gray-100 text-gray-700 border-gray-200',
        Seasonal: 'bg-orange-100 text-orange-700 border-orange-200',
        Group: 'bg-purple-100 text-purple-700 border-purple-200',
    };

    const statusBadge: Record<string, string> = {
        Active: 'bg-emerald-100 text-emerald-700',
        Inactive: 'bg-gray-100 text-gray-600',
        Draft: 'bg-yellow-100 text-yellow-700',
    };

    const tabs: { id: FormTab; label: string; icon: React.ReactNode }[] = [
        { id: 'basic', label: 'Basic Info', icon: <Info size={14} /> },
        { id: 'room', label: 'Room Config', icon: <BedDouble size={14} /> },
        { id: 'meals', label: 'Meal Plans', icon: <Utensils size={14} /> },
        { id: 'recreation', label: 'Pool & Recreation', icon: <Waves size={14} /> },
        { id: 'transport', label: 'Transport', icon: <Car size={14} /> },
        { id: 'laundry', label: 'Laundry & Minibar', icon: <Shirt size={14} /> },
        { id: 'outlets', label: 'Outlets & Spa', icon: <Dumbbell size={14} /> },
        { id: 'validity', label: 'Validity', icon: <Calendar size={14} /> },
        { id: 'finance', label: 'Finance', icon: <DollarSign size={14} /> },
    ];

    // ── LIST VIEW ──
    if (view === 'list') return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header matching Thesis */}
            <PageHeader
                title="Package Builder"
                subtitle="Build bundled stay packages with the Allowance Engine — auto-route inclusions to correct revenue departments."
                icon={<Package className="size-6 text-primary" />}
                badge={
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary border border-primary-border">
                        Hospitality Bundles
                    </span>
                }
                actions={
                    <button
                        type="button"
                        onClick={openCreate}
                        className="btn-primary"
                    >
                        <Plus className="size-3.5" />
                        <span>Create Package</span>
                    </button>
                }
            />

            {/* KPI Stats Row matching Thesis */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Total Packages</span>
                        <div className="size-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                            <Package className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">{packages.length}</span>
                        <span className="text-[11px] font-semibold text-emerald-600">
                            {packages.filter(p => p.status === 'Active').length} Active
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Multi-inclusion packages</p>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Active Selling</span>
                        <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <CheckCircle2 className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">
                            {packages.filter(p => p.status === 'Active').length}
                        </span>
                        <span className="text-[11px] text-emerald-600 font-semibold">Live on booking engine</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Ready for reservations</p>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Draft Proposals</span>
                        <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Sparkles className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">
                            {packages.filter(p => p.status === 'Draft').length}
                        </span>
                        <span className="text-[11px] text-amber-600 font-semibold">In configuration</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Upcoming promotions</p>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Inactive Archive</span>
                        <div className="size-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                            <Clock className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">
                            {packages.filter(p => p.status === 'Inactive').length}
                        </span>
                        <span className="text-[11px] text-slate-400">Past seasonal</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Preserved for audit</p>
                </div>
            </div>

            {/* Search Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search packages by name, code or type..."
                        className="input-standard pl-9"
                    />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                    Showing <span className="text-slate-900">{filtered.length}</span> packages
                </div>
            </div>

            {/* Package Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filtered.map(rawPkg => {
                    const pkg = normalizePackage(rawPkg);
                    const inclusions = [
                        pkg.mealInclusions?.hasBreakfast && '🍳 Breakfast',
                        pkg.mealInclusions?.hasLunch && '🥗 Lunch',
                        pkg.mealInclusions?.hasDinner && '🍽️ Dinner',
                        pkg.mealInclusions?.hasCupole && '⭐ Cupole Dinner',
                        pkg.poolConfig?.included && '🏊 Pool',
                        pkg.transportConfig?.type !== 'None' && `✈️ Transfer (${pkg.transportConfig?.type})`,
                        pkg.laundryConfig?.included && `👕 Laundry (${pkg.laundryConfig?.itemsAllowance || 0} items)`,
                        pkg.minibarConfig?.included && `🍾 Minibar (৳${pkg.minibarConfig?.dailyCredit || 0}/day)`,
                        pkg.recreationConfig?.included && '🎯 Recreation',
                        (pkg.outletCredits?.length || 0) > 0 && `💆 ${pkg.outletCredits.map(o => o.outletName).join(', ')}`,
                    ].filter(Boolean);

                    return (
                        <div key={pkg.id} className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden hover:shadow-md hover:border-primary/40 transition-all duration-200 group flex flex-col justify-between shadow-2xs">
                            {/* Color bar */}
                            <div className="h-1.5" style={{ backgroundColor: pkg.color }} />
                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="text-slate-900 text-base">{pkg.name}</h3>
                                                <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${typeColors[pkg.packageType] || typeColors.Standard}`}>
                                                    {pkg.packageType}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="badge-code">{pkg.shortCode}</span>
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge[pkg.status]}`}>{pkg.status}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(pkg)}
                                                className="btn-icon"
                                                title="Edit Package"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDuplicate(pkg)}
                                                className="btn-icon"
                                                title="Duplicate Package"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(pkg.id)}
                                                className="btn-icon-danger"
                                                title="Delete Package"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-500 mb-3 line-clamp-2">{pkg.description}</p>

                                    {/* Inclusions */}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {inclusions.slice(0, 5).map((inc, i) => (
                                            <span key={i} className="text-[10.5px] bg-primary-subtle text-primary font-medium px-2 py-0.5 rounded-full border border-primary-border/60">
                                                {inc as string}
                                            </span>
                                        ))}
                                        {inclusions.length > 5 && (
                                            <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                                                +{inclusions.length - 5} more
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Footer info */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-2">
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <span className="flex items-center gap-1"><BedDouble size={12} className="text-slate-400" />{pkg.roomConfig?.applicableRoomTypes?.length || 'All'} Room Types</span>
                                        <span className="flex items-center gap-1"><Calendar size={12} className="text-slate-400" />Min {pkg.validity?.minNights || 1}N</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Surcharge</span>
                                        <span className="text-base text-slate-900 font-mono">৳{(pkg.finance?.baseSurcharge || 0).toLocaleString()}<span className="text-xs font-normal text-slate-400">/night</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Create new card */}
                <button 
                    onClick={openCreate}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary hover:bg-primary-subtle/20 transition group min-h-[220px]"
                >
                    <div className="size-10 rounded-xl bg-slate-100 group-hover:bg-primary-subtle flex items-center justify-center mb-3 transition">
                        <Plus className="size-5 text-slate-400 group-hover:text-primary transition" />
                    </div>
                    <span className="text-xs text-slate-700 group-hover:text-primary transition">Create New Package</span>
                    <span className="text-[11px] text-slate-400 mt-1">Configure amenities & inclusion bundles</span>
                </button>
            </div>
        </div>
    );

    // ── FORM VIEW ──
    const fm = normalizePackage(formData);

    return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
            {/* Form Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => setView('list')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500"><ArrowLeft size={18} /></button>
                    <div>
                        <h2 className="text-gray-900 text-sm">{editingPackage ? `Editing: ${editingPackage.name}` : 'Create New Package'}</h2>
                        <p className="text-xs text-gray-400">Configure inclusions, allowances, and revenue routing</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPreviewMode(!previewMode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${previewMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        <Eye size={13} />{previewMode ? 'Hide Engine' : 'Preview Engine'}
                    </button>
                    <select value={fm.status} onChange={e => upd('status', e.target.value)}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-white">
                        <option value="Draft">Draft</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    <button onClick={handleSave}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-all">
                        <Save size={13} /> Save Package
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Tabs */}
                <div className="w-44 bg-white border-r border-gray-200 py-3 flex-shrink-0 overflow-y-auto">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-medium transition-all ${activeTab === t.id ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <span className={activeTab === t.id ? 'text-blue-600' : 'text-gray-400'}>{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                    {/* Allowance Engine status */}
                    <div className="mx-3 mt-4 p-2.5 bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Zap size={10} className="text-yellow-400" />
                            <span className="text-[10px] text-yellow-400 font-semibold">Allowance Engine</span>
                        </div>
                        <div className="space-y-1">
                            {fm.mealInclusions?.hasBreakfast && <div className="text-[9px] text-emerald-400 flex items-center gap-1"><Check size={8} /> Breakfast routed</div>}
                            {fm.poolConfig?.included && <div className="text-[9px] text-emerald-400 flex items-center gap-1"><Check size={8} /> Pool routed</div>}
                            {fm.laundryConfig?.included && <div className="text-[9px] text-emerald-400 flex items-center gap-1"><Check size={8} /> Laundry limit set</div>}
                            {fm.minibarConfig?.included && <div className="text-[9px] text-emerald-400 flex items-center gap-1"><Check size={8} /> Minibar credit set</div>}
                            {fm.transportConfig?.type !== 'None' && <div className="text-[9px] text-emerald-400 flex items-center gap-1"><Check size={8} /> Transport routed</div>}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    <div className={`grid gap-5 ${previewMode ? 'grid-cols-2' : 'grid-cols-1 max-w-3xl mx-auto'}`}>
                        <div className="space-y-5">

                            {/* ── TAB: BASIC INFO ── */}
                            {activeTab === 'basic' && (
                                <div className="space-y-5">
                                <FormSection title="Package Identity" icon={<Package size={16} />}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <Field label="Package Name *">
                                                <input className={inp} placeholder="e.g. Ultimate Honeymoon Experience"
                                                    value={fm.name} onChange={e => handlePackageNameChange(e.target.value)} />
                                            </Field>
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs font-semibold text-gray-700">Short Code *</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const auto = generateUniqueShortCode(fm.name, existingCodes, {
                                                            currentCode: editingPackage?.shortCode,
                                                            maxLength: 8
                                                        });
                                                        upd('shortCode', auto);
                                                        setIsCodeManual(false);
                                                    }}
                                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                                                >
                                                    <RefreshCw size={10} /> Auto-Generate
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    className={`${inp} pr-8 uppercase font-mono ${
                                                        isShortCodeDuplicate(fm.shortCode, existingCodes, editingPackage?.shortCode)
                                                            ? 'border-rose-500 bg-rose-50 text-rose-700'
                                                            : ''
                                                    }`}
                                                    placeholder="e.g. HONEY"
                                                    maxLength={8}
                                                    value={fm.shortCode}
                                                    onChange={e => {
                                                        setIsCodeManual(true);
                                                        upd('shortCode', e.target.value.toUpperCase());
                                                    }}
                                                />
                                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    {isShortCodeDuplicate(fm.shortCode, existingCodes, editingPackage?.shortCode) ? (
                                                        <AlertTriangle size={14} className="text-rose-500" />
                                                    ) : fm.shortCode ? (
                                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                                    ) : null}
                                                </div>
                                            </div>
                                            {isShortCodeDuplicate(fm.shortCode, existingCodes, editingPackage?.shortCode) && (
                                                <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                                                    <AlertTriangle size={10} /> Short Code already in use! Must be unique.
                                                </p>
                                            )}
                                        </div>
                                        <Field label="Package Type">
                                            <select className={sel} value={fm.packageType} onChange={e => upd('packageType', e.target.value)}>
                                                <option>Standard</option><option>Honeymoon</option><option>Family</option>
                                                <option>Corporate</option><option>Seasonal</option><option>Group</option>
                                            </select>
                                        </Field>
                                        <div className="col-span-2">
                                            <Field label="Description">
                                                <textarea className={inp + ' resize-none'} rows={3} placeholder="Describe what this package includes..."
                                                    value={fm.description} onChange={e => upd('description', e.target.value)} />
                                            </Field>
                                        </div>
                                        <Field label="Package Color">
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={fm.color} onChange={e => upd('color', e.target.value)}
                                                    className="w-10 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
                                                <span className="text-sm text-gray-600">{fm.color}</span>
                                            </div>
                                        </Field>
                                    </div>
                                </FormSection>
                                </div>
                            )}

                            {/* ── TAB: ROOM CONFIG ── */}
                            {activeTab === 'room' && (
                                <div className="space-y-5">
                                <FormSection title="Applicable Room Types" icon={<BedDouble size={16} />}>
                                    <div className="grid grid-cols-2 gap-2">
                                        {dynamicRoomTypes.map(rt => (
                                            <label key={rt} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${fm.roomConfig.applicableRoomTypes.includes(rt) ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                                                <input type="checkbox" className="accent-blue-600"
                                                    checked={fm.roomConfig.applicableRoomTypes.includes(rt)}
                                                    onChange={e => {
                                                        const list = fm.roomConfig.applicableRoomTypes;
                                                        upd('roomConfig.applicableRoomTypes', e.target.checked ? [...list, rt] : list.filter(r => r !== rt));
                                                    }} />
                                                {rt}
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Leave all unchecked to apply to all room types</p>
                                </FormSection>

                                <FormSection title="Extra Occupancy Rules" icon={<Users size={16} />}>
                                    <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div>
                                            <div className="text-sm font-medium text-gray-800">Extra Bed Allowed</div>
                                            <div className="text-xs text-gray-500">Allow extra bed in room with this package</div>
                                        </div>
                                        <Toggle checked={fm.roomConfig.extraBedAllowed} onChange={v => upd('roomConfig.extraBedAllowed', v)} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <Field label="Extra Bed Rate" hint="/night">
                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                <input type="number" className={inp + ' pl-7'} value={fm.roomConfig.extraBedRate} onChange={e => upd('roomConfig.extraBedRate', +e.target.value)} disabled={!fm.roomConfig.extraBedAllowed} /></div>
                                        </Field>
                                        <Field label="Extra Adult Rate" hint="/night">
                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                <input type="number" className={inp + ' pl-7'} value={fm.roomConfig.extraAdultRate} onChange={e => upd('roomConfig.extraAdultRate', +e.target.value)} /></div>
                                        </Field>
                                        <Field label="Extra Child Rate" hint="/night">
                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                <input type="number" className={inp + ' pl-7'} value={fm.roomConfig.extraChildRate} onChange={e => upd('roomConfig.extraChildRate', +e.target.value)} /></div>
                                        </Field>
                                        <Field label="Child Age From">
                                            <input type="number" className={inp} value={fm.roomConfig.childAgeFrom} onChange={e => upd('roomConfig.childAgeFrom', +e.target.value)} />
                                        </Field>
                                        <Field label="Child Age To">
                                            <input type="number" className={inp} value={fm.roomConfig.childAgeTo} onChange={e => upd('roomConfig.childAgeTo', +e.target.value)} />
                                        </Field>
                                        <Field label="Max Extra Beds">
                                            <input type="number" className={inp} value={fm.roomConfig.maxExtraBeds} min={0} max={3} onChange={e => upd('roomConfig.maxExtraBeds', +e.target.value)} disabled={!fm.roomConfig.extraBedAllowed} />
                                        </Field>
                                    </div>

                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-blue-800">Infant Free Policy</div>
                                            <div className="text-xs text-blue-600">Children aged 0 to {fm.roomConfig.infantMaxAge} years — complimentary</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input type="number" className="w-16 px-2 py-1 border border-blue-300 rounded text-sm text-center" value={fm.roomConfig.infantMaxAge} onChange={e => upd('roomConfig.infantMaxAge', +e.target.value)} />
                                            <span className="text-xs text-blue-600">yrs</span>
                                            <Toggle checked={fm.roomConfig.infantFree} onChange={v => upd('roomConfig.infantFree', v)} />
                                        </div>
                                    </div>

                                    <div className="mt-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100 grid grid-cols-2 gap-4">
                                        <div className="col-span-2 text-xs text-blue-700 uppercase tracking-widest flex items-center gap-2 mb-1">
                                            <Gift size={14} /> Room Experience (ETC Info)
                                        </div>
                                        <Field label="Welcome Amenity">
                                            <input className={inp} value={fm.roomConfig.welcomeAmenity} onChange={e => upd('roomConfig.welcomeAmenity', e.target.value)} placeholder="e.g. Fruit Basket" />
                                        </Field>
                                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                                            <span className="text-xs font-medium">Late Checkout (2PM)</span>
                                            <Toggle checked={fm.roomConfig.lateCheckoutAllowed} onChange={v => upd('roomConfig.lateCheckoutAllowed', v)} />
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                                            <span className="text-xs font-medium">Priority Check-in</span>
                                            <Toggle checked={fm.roomConfig.priorityCheckin} onChange={v => upd('roomConfig.priorityCheckin', v)} />
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                                            <span className="text-xs font-medium">Complimentary WiFi</span>
                                            <Toggle checked={fm.roomConfig.wifiIncluded} onChange={v => upd('roomConfig.wifiIncluded', v)} />
                                        </div>
                                    </div>
                                </FormSection>
                                </div>
                            )}

                            {/* ── TAB: MEALS ── */}
                            {activeTab === 'meals' && (
                                <div className="space-y-5">
                                {[
                                    { key: 'hasBreakfast', label: 'Breakfast', venueKey: 'breakfastVenue', styleKey: 'breakfastStyle', menuKey: 'breakfastMenu', cuisineKey: 'breakfastCuisine', adultKey: 'breakfastAdultRate', childKey: 'breakfastChildRate', code: 'REV-FB-BRKFST', showCredit: false },
                                    { key: 'hasLunch', label: 'Lunch', venueKey: 'lunchVenue', styleKey: null, menuKey: 'lunchMenu', cuisineKey: 'lunchCuisine', adultKey: 'lunchAdultRate', childKey: 'lunchChildRate', code: 'REV-FB-LUNCH', showCredit: false },
                                    { key: 'hasDinner', label: 'Dinner', venueKey: 'dinnerVenue', styleKey: 'dinnerStyle', menuKey: 'dinnerMenu', cuisineKey: 'dinnerCuisine', adultKey: 'dinnerAdultRate', childKey: 'dinnerChildRate', code: 'REV-FB-DINNER', showCredit: true, creditKey: 'dinnerCredit' },
                                    { key: 'hasCupole', label: 'Cupole Special Dinner', venueKey: 'cupoleVenue', styleKey: null, menuKey: 'cupoleMenu', cuisineKey: 'cupoleCuisine', adultKey: 'cupoleAdultRate', childKey: null, code: 'REV-FB-CUPOLE', showCredit: true, creditKey: 'cupoleCredit' },
                                    { key: 'hasBrunch', label: 'Brunch', venueKey: 'brunchVenue', styleKey: null, menuKey: 'brunchMenu', cuisineKey: 'brunchCuisine', adultKey: 'brunchAdultRate', childKey: null, code: 'REV-FB-BRUNCH', showCredit: false },
                                ].map(meal => (
                                    <FormSection key={meal.key} title={meal.label} icon={<Utensils size={16} />}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <span className="text-sm font-medium text-gray-800">Include {meal.label}</span>
                                                <span className="ml-2 font-mono text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{meal.code}</span>
                                            </div>
                                            <Toggle
                                                checked={fm.mealInclusions[meal.key as keyof typeof fm.mealInclusions] as boolean}
                                                onChange={v => upd(`mealInclusions.${meal.key}`, v)} />
                                        </div>
                                        {(fm.mealInclusions[meal.key as keyof typeof fm.mealInclusions] as boolean) && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                                    <Field label="Venue">
                                                        <input className={inp} placeholder="Venue"
                                                            value={fm.mealInclusions[meal.venueKey as keyof typeof fm.mealInclusions] as string}
                                                            onChange={e => upd(`mealInclusions.${meal.venueKey}`, e.target.value)} />
                                                    </Field>
                                                    {meal.styleKey && (
                                                        <Field label="Serving Style">
                                                            <select className={sel}
                                                                value={fm.mealInclusions[meal.styleKey as keyof typeof fm.mealInclusions] as string}
                                                                onChange={e => upd(`mealInclusions.${meal.styleKey}`, e.target.value)}>
                                                                <option>Buffet</option><option>Set Menu</option>
                                                                <option>À la carte</option><option>Credit</option>
                                                            </select>
                                                        </Field>
                                                    )}
                                                    <Field label="Menu Name">
                                                        <input className={inp} placeholder="e.g. Chef Special"
                                                            value={fm.mealInclusions[meal.menuKey as keyof typeof fm.mealInclusions] as string}
                                                            onChange={e => upd(`mealInclusions.${meal.menuKey}`, e.target.value)} />
                                                    </Field>
                                                    <Field label="Cuisine">
                                                        <input className={inp} placeholder="e.g. Continental"
                                                            value={fm.mealInclusions[meal.cuisineKey as keyof typeof fm.mealInclusions] as string}
                                                            onChange={e => upd(`mealInclusions.${meal.cuisineKey}`, e.target.value)} />
                                                    </Field>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4">
                                                {meal.showCredit && meal.creditKey && (
                                                    <Field label={`${meal.label} Credit (৳)`} hint="Guest uses up to this amount free">
                                                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                            <input type="number" className={inp + ' pl-7'}
                                                                value={fm.mealInclusions[meal.creditKey as keyof typeof fm.mealInclusions] as number}
                                                                onChange={e => upd(`mealInclusions.${meal.creditKey}`, +e.target.value)} /></div>
                                                    </Field>
                                                )}
                                                <Field label="Adult Rate" hint="/person/night">
                                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                        <input type="number" className={inp + ' pl-7'}
                                                            value={fm.mealInclusions[meal.adultKey as keyof typeof fm.mealInclusions] as number}
                                                            onChange={e => upd(`mealInclusions.${meal.adultKey}`, +e.target.value)} /></div>
                                                </Field>
                                                {meal.childKey && (
                                                    <Field label="Child Rate" hint="/person/night">
                                                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                            <input type="number" className={inp + ' pl-7'}
                                                                value={fm.mealInclusions[meal.childKey as keyof typeof fm.mealInclusions] as number}
                                                                onChange={e => upd(`mealInclusions.${meal.childKey}`, +e.target.value)} /></div>
                                                    </Field>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </FormSection>
                            ))}
                        </div>
                    )}

                    {/* ── TAB: RECREATION ── */}
                    {activeTab === 'recreation' && (
                        <div className="space-y-5">
                            <FormSection title="Swimming Pool" icon={<Waves size={16} />}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">Include Pool Access</span>
                                            <span className="ml-2 font-mono text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">REV-REC-POOL</span>
                                        </div>
                                        <Toggle checked={fm.poolConfig.included} onChange={v => upd('poolConfig.included', v)} />
                                    </div>
                                    {fm.poolConfig.included && (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1"><Shield size={12} /> Complimentary Allowance</div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Field label="Complimentary Adults">
                                                        <input type="number" className={inp} min={0} max={10}
                                                            value={fm.poolConfig.complimentaryAdults}
                                                            onChange={e => upd('poolConfig.complimentaryAdults', +e.target.value)} />
                                                    </Field>
                                                    <Field label="Complimentary Children">
                                                        <input type="number" className={inp} min={0} max={10}
                                                            value={fm.poolConfig.complimentaryChildren}
                                                            onChange={e => upd('poolConfig.complimentaryChildren', +e.target.value)} />
                                                    </Field>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="Extra Adult Pool Rate" hint="/person">
                                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                        <input type="number" className={inp + ' pl-7'} value={fm.poolConfig.extraAdultRate} onChange={e => upd('poolConfig.extraAdultRate', +e.target.value)} /></div>
                                                </Field>
                                                <Field label="Extra Child Pool Rate" hint="/person">
                                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                        <input type="number" className={inp + ' pl-7'} value={fm.poolConfig.extraChildRate} onChange={e => upd('poolConfig.extraChildRate', +e.target.value)} /></div>
                                                </Field>
                                            </div>
                                            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-700">
                                                <AlertCircle size={12} className="inline mr-1" />
                                                Engine: If guest brings extra {fm.poolConfig.complimentaryAdults + 1}+ adults, system auto-charges ৳{fm.poolConfig.extraAdultRate} each → DEPT-04 Recreation
                                            </div>
                                        </div>
                                    )}
                                </FormSection>

                                <FormSection title="Recreation Activities" icon={<Dumbbell size={16} />}>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-medium text-gray-800">Include Recreation</span>
                                        <Toggle checked={fm.recreationConfig.included} onChange={v => upd('recreationConfig.included', v)} />
                                    </div>
                                    {fm.recreationConfig.included && (
                                        <div className="space-y-3">
                                            {fm.recreationConfig.activities.map((act, i) => (
                                                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                    <div className="font-medium text-sm text-gray-800 mb-2">{act.name}</div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <Field label="Included Sessions">
                                                            <input type="number" className={inp} value={act.includedSessions} min={0}
                                                                onChange={e => {
                                                                    const acts = [...fm.recreationConfig.activities];
                                                                    acts[i] = { ...acts[i], includedSessions: +e.target.value };
                                                                    upd('recreationConfig.activities', acts);
                                                                }} />
                                                        </Field>
                                                        <Field label="Extra Adult Rate">
                                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">৳</span>
                                                                <input type="number" className={inp + ' pl-6'} value={act.adultRate}
                                                                    onChange={e => {
                                                                        const acts = [...fm.recreationConfig.activities];
                                                                        acts[i] = { ...acts[i], adultRate: +e.target.value };
                                                                        upd('recreationConfig.activities', acts);
                                                                    }} /></div>
                                                        </Field>
                                                        <Field label="Extra Child Rate">
                                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">৳</span>
                                                                <input type="number" className={inp + ' pl-6'} value={act.childRate}
                                                                    onChange={e => {
                                                                        const acts = [...fm.recreationConfig.activities];
                                                                        acts[i] = { ...acts[i], childRate: +e.target.value };
                                                                        upd('recreationConfig.activities', acts);
                                                                    }} /></div>
                                                        </Field>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </FormSection>
                            </div>
                        )}

                            {/* ── TAB: TRANSPORT ── */}
                            {activeTab === 'transport' && (
                                <FormSection title="Airport Transfer" icon={<Car size={16} />}>
                                    <div className="mb-4">
                                        <Field label="Transfer Inclusion">
                                            <div className="grid grid-cols-4 gap-2">
                                                {(['None', 'Pickup', 'Drop', 'Both'] as const).map(t => (
                                                    <button key={t} onClick={() => upd('transportConfig.type', t)}
                                                        className={`py-2 rounded-lg text-sm font-medium border transition-all ${fm.transportConfig.type === t ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:border-blue-300'}`}>
                                                        {t === 'None' ? '✗ None' : t === 'Pickup' ? '✈→ Pickup' : t === 'Drop' ? '→✈ Drop' : '↔ Both'}
                                                    </button>
                                                ))}
                                            </div>
                                        </Field>
                                    </div>
                                    {fm.transportConfig.type !== 'None' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="Vehicle Type">
                                                <select className={sel} value={fm.transportConfig.vehicleType} onChange={e => upd('transportConfig.vehicleType', e.target.value)}>
                                                    <option>Sedan</option><option>SUV</option><option>Van</option>
                                                    <option>Luxury</option><option>Microbus</option>
                                                </select>
                                            </Field>
                                            <div />
                                            {(fm.transportConfig.type === 'Pickup' || fm.transportConfig.type === 'Both') && (
                                                <Field label="Airport Pickup Rate">
                                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                        <input type="number" className={inp + ' pl-7'} value={fm.transportConfig.pickupRate} onChange={e => upd('transportConfig.pickupRate', +e.target.value)} /></div>
                                                </Field>
                                            )}
                                            {(fm.transportConfig.type === 'Drop' || fm.transportConfig.type === 'Both') && (
                                                <Field label="Airport Drop Rate">
                                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                        <input type="number" className={inp + ' pl-7'} value={fm.transportConfig.dropRate} onChange={e => upd('transportConfig.dropRate', +e.target.value)} /></div>
                                                </Field>
                                            )}
                                            <div className="col-span-2 p-2.5 bg-green-50 rounded-lg border border-green-100 text-xs text-green-700">
                                                <Check size={12} className="inline mr-1" />
                                                Engine: Transfer(s) auto-posted as one-time charge → REV-TRN-PCKU/DROP → DEPT-05 Transport
                                            </div>
                                        </div>
                                    )}
                                </FormSection>
                            )}

                            {/* ── TAB: LAUNDRY & MINIBAR ── */}
                            {activeTab === 'laundry' && (
                                <div className="space-y-5">
                                {/* LAUNDRY */}
                                <FormSection title="Laundry Allowance" icon={<Shirt size={16} />}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">Include Laundry</span>
                                            <span className="ml-2 font-mono text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">REV-LAUN-STD</span>
                                        </div>
                                        <Toggle checked={fm.laundryConfig.included} onChange={v => upd('laundryConfig.included', v)} />
                                    </div>
                                    {fm.laundryConfig.included && (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                                                <div className="text-xs font-semibold text-blue-700 mb-3 flex items-center gap-1"><Zap size={12} /> Allowance Engine — Item Limit</div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <Field label="Allowance Type">
                                                        <select className={sel} value={fm.laundryConfig.allowanceType} onChange={e => upd('laundryConfig.allowanceType', e.target.value as 'Per Stay' | 'Per Day' | 'Every 3 Days')}>
                                                            <option value="Per Stay">Per Stay</option>
                                                            <option value="Per Day">Per Day</option>
                                                            <option value="Every 3 Days">Every 3 Days</option>
                                                        </select>
                                                    </Field>
                                                    <Field label="Items Allowed" hint="max pieces">
                                                        <input type="number" className={inp} value={fm.laundryConfig.itemsAllowance} min={0}
                                                            onChange={e => upd('laundryConfig.itemsAllowance', +e.target.value)} />
                                                    </Field>
                                                    <Field label="Extra Item Rate" hint="/piece">
                                                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                            <input type="number" className={inp + ' pl-7'} value={fm.laundryConfig.extraItemRate}
                                                                onChange={e => upd('laundryConfig.extraItemRate', +e.target.value)} /></div>
                                                    </Field>
                                                </div>
                                            </div>

                                            <div className="text-xs font-semibold text-gray-700 mb-2">Item Breakdown</div>
                                            <div className="space-y-2">
                                                {fm.laundryConfig.items.map((item, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                                        <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-400">Incl:</span>
                                                            <input type="number" className="w-14 px-2 py-1 border border-gray-300 rounded text-xs text-center" value={item.includedQty} min={0}
                                                                onChange={e => {
                                                                    const items = [...fm.laundryConfig.items];
                                                                    items[i] = { ...items[i], includedQty: +e.target.value };
                                                                    upd('laundryConfig.items', items);
                                                                }} />
                                                            <span className="text-xs text-gray-400">Extra ৳</span>
                                                            <input type="number" className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center" value={item.extraRate} min={0}
                                                                onChange={e => {
                                                                    const items = [...fm.laundryConfig.items];
                                                                    items[i] = { ...items[i], extraRate: +e.target.value };
                                                                    upd('laundryConfig.items', items);
                                                                }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-700">
                                                <AlertCircle size={12} className="inline mr-1" />
                                                Engine: Guest sends {fm.laundryConfig.itemsAllowance} pieces → Free. Piece {fm.laundryConfig.itemsAllowance + 1}+ → ৳{fm.laundryConfig.extraItemRate} each, auto-charged to folio
                                            </div>
                                        </div>
                                    )}
                                </FormSection>

                                {/* MINIBAR */}
                                <FormSection title="Minibar Daily Credit" icon={<Wine size={16} />}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">Include Minibar</span>
                                            <span className="ml-2 font-mono text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">REV-MINI-BAR</span>
                                        </div>
                                        <Toggle checked={fm.minibarConfig.included} onChange={v => upd('minibarConfig.included', v)} />
                                    </div>
                                    {fm.minibarConfig.included && (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                                                <div className="text-xs font-semibold text-blue-700 mb-3 flex items-center gap-1"><Zap size={12} /> Allowance Engine — Credit Limit</div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Field label="Daily Credit" hint="free amount per day">
                                                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                            <input type="number" className={inp + ' pl-7'} value={fm.minibarConfig.dailyCredit}
                                                                onChange={e => upd('minibarConfig.dailyCredit', +e.target.value)} /></div>
                                                    </Field>
                                                    <Field label="Replenishment">
                                                        <select className={sel} value={fm.minibarConfig.replenishment} onChange={e => upd('minibarConfig.replenishment', e.target.value as 'Daily' | 'Every 2 Days' | 'On Request')}>
                                                            <option value="Daily">Daily</option>
                                                            <option value="Every 2 Days">Every 2 Days</option>
                                                            <option value="On Request">On Request</option>
                                                        </select>
                                                    </Field>
                                                </div>
                                            </div>

                                            <div className="text-xs font-semibold text-gray-700 mb-2">Minibar Items</div>
                                            <div className="space-y-2">
                                                {fm.minibarConfig.items.map((item, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                                        <div className="flex-1">
                                                            <div className="text-sm text-gray-700">{item.name}</div>
                                                            <div className="text-[10px] text-gray-400">{item.category}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="text-gray-400">Qty:</span>
                                                            <input type="number" className="w-12 px-2 py-1 border border-gray-300 rounded text-xs text-center" value={item.qty} min={0}
                                                                onChange={e => {
                                                                    const items = [...fm.minibarConfig.items];
                                                                    items[i] = { ...items[i], qty: +e.target.value };
                                                                    upd('minibarConfig.items', items);
                                                                }} />
                                                            <span className="text-gray-400">৳</span>
                                                            <input type="number" className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center" value={item.unitPrice} min={0}
                                                                onChange={e => {
                                                                    const items = [...fm.minibarConfig.items];
                                                                    items[i] = { ...items[i], unitPrice: +e.target.value };
                                                                    upd('minibarConfig.items', items);
                                                                }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-700">
                                                <Check size={12} className="inline mr-1" />
                                                Engine: Guest consumes ৳{fm.minibarConfig.dailyCredit} or less → Free. Above ৳{fm.minibarConfig.dailyCredit} → Extra auto-charged to folio
                                            </div>
                                        </div>
                                    )}
                                </FormSection>
                            </div>
                        )}

                            {/* ── TAB: OUTLETS ── */}
                            {activeTab === 'outlets' && (
                                <FormSection title="Outlet & Spa Credits" icon={<Gift size={16} />}>
                                    <div className="space-y-3 mb-4">
                                        {fm.outletCredits.map((oc, i) => (
                                            <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="grid grid-cols-4 gap-3 items-end">
                                                    <Field label="Outlet Name">
                                                        <input className={inp} value={oc.outletName} placeholder="e.g. Sky Spa"
                                                            onChange={e => {
                                                                const list = [...fm.outletCredits];
                                                                list[i] = { ...list[i], outletName: e.target.value };
                                                                upd('outletCredits', list);
                                                            }} />
                                                    </Field>
                                                    <Field label="Credit Type">
                                                        <select className={sel} value={oc.creditType} onChange={e => {
                                                            const list = [...fm.outletCredits];
                                                            list[i] = { ...list[i], creditType: e.target.value as 'Per Stay' | 'Per Day' };
                                                            upd('outletCredits', list);
                                                        }}>
                                                            <option value="Per Stay">Per Stay</option>
                                                            <option value="Per Day">Per Day</option>
                                                        </select>
                                                    </Field>
                                                    <Field label="Credit Amount (৳)">
                                                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                            <input type="number" className={inp + ' pl-7'} value={oc.creditAmount}
                                                                onChange={e => {
                                                                    const list = [...fm.outletCredits];
                                                                    list[i] = { ...list[i], creditAmount: +e.target.value };
                                                                    upd('outletCredits', list);
                                                                }} /></div>
                                                    </Field>
                                                    <button onClick={() => upd('outletCredits', fm.outletCredits.filter((_, j) => j !== i))}
                                                        className="flex items-center gap-1 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-xs transition-all mb-0.5">
                                                        <X size={12} /> Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => upd('outletCredits', [...fm.outletCredits, { outletName: '', creditType: 'Per Stay', creditAmount: 1000, revenueCode: 'REV-SPA-TREAT' }])}
                                        className="flex items-center gap-2 px-4 py-2 border border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 text-sm transition-all">
                                        <Plus size={14} /> Add Outlet Credit
                                    </button>
                                    <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-700">
                                        <AlertCircle size={12} className="inline mr-1" />
                                        Engine: Outlet deducts from credit first. If guest spends above credit → remainder auto-charged to room folio
                                    </div>
                                </FormSection>
                            )}

                            {/* ── TAB: VALIDITY ── */}
                            {activeTab === 'validity' && (
                                <FormSection title="Package Validity" icon={<Calendar size={16} />}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Valid From">
                                            <input type="date" className={inp} value={fm.validity.startDate} onChange={e => upd('validity.startDate', e.target.value)} />
                                        </Field>
                                        <Field label="Valid To">
                                            <input type="date" className={inp} value={fm.validity.endDate} onChange={e => upd('validity.endDate', e.target.value)} />
                                        </Field>
                                        <Field label="Minimum Nights">
                                            <input type="number" className={inp} min={1} value={fm.validity.minNights} onChange={e => upd('validity.minNights', +e.target.value)} />
                                        </Field>
                                        <Field label="Maximum Nights">
                                            <input type="number" className={inp} min={1} value={fm.validity.maxNights} onChange={e => upd('validity.maxNights', +e.target.value)} />
                                        </Field>
                                        <div className="col-span-2">
                                            <Field label="Blackout Dates" hint="comma-separated dates">
                                                <input className={inp} placeholder="e.g. 2025-12-25, 2025-12-31, 2026-01-01"
                                                    value={fm.validity.blackoutDates} onChange={e => upd('validity.blackoutDates', e.target.value)} />
                                            </Field>
                                        </div>
                                    </div>
                                </FormSection>
                            )}

                            {/* ── TAB: FINANCE ── */}
                            {activeTab === 'finance' && (
                                <FormSection title="Finance & Revenue Routing" icon={<DollarSign size={16} />}>
                                    <div className="grid grid-cols-2 gap-4 mb-5">
                                        <Field label="Total Inclusion Cost" hint="internal cost of all services">
                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                <input type="number" className={inp + ' pl-7 bg-gray-50'} value={fm.finance.totalCost}
                                                    onChange={e => upd('finance.totalCost', +e.target.value)} /></div>
                                        </Field>
                                        <Field label="Package Surcharge (Selling)" hint="added to room rate/night">
                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs font-bold">৳</span>
                                                <input type="number" className={inp + ' pl-7 border-emerald-100 bg-emerald-50/20 text-emerald-900'} value={fm.finance.baseSurcharge}
                                                    onChange={e => upd('finance.baseSurcharge', +e.target.value)} /></div>
                                        </Field>
                                        <div className="col-span-2">
                                            <div className={`p-3 rounded-lg flex items-center justify-between border ${fm.finance.baseSurcharge >= fm.finance.totalCost ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp size={16} className={fm.finance.baseSurcharge >= fm.finance.totalCost ? 'text-emerald-600' : 'text-red-600'} />
                                                    <span className={`text-sm ${fm.finance.baseSurcharge >= fm.finance.totalCost ? 'text-emerald-700' : 'text-red-700'}`}>
                                                        {fm.finance.baseSurcharge >= fm.finance.totalCost ? 'Inclusion Profitability Check: PASS' : 'Inclusion Profitability Check: FAIL (Selling below cost)'}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-gray-500 uppercase font-black">Bundle Margin</div>
                                                    <div className={`text-sm font-black ${fm.finance.baseSurcharge >= fm.finance.totalCost ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        ৳{(fm.finance.baseSurcharge - fm.finance.totalCost).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-gray-800">Night Audit Auto-Posting</div>
                                                <div className="text-xs text-gray-500">Automatically post all package charges at 02:00 AM daily</div>
                                            </div>
                                            <Toggle checked={fm.finance.autoPost} onChange={v => upd('finance.autoPost', v)} />
                                        </div>
                                    </div>
                                    {/* Revenue Allocation Preview */}
                                    <div className="bg-gray-900 rounded-xl p-4 mt-4">
                                        <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-widest border-b border-gray-800 pb-2">Revenue Routing Forecast</div>
                                        <div className="space-y-1.5 min-h-[100px]">
                                            {fm.poolConfig.included && <div className="flex justify-between text-[10px]"><span className="text-gray-500">Pool Access (Complimentary)</span><span className="text-blue-400 font-mono text-[9px]">DEPT-04 Recreation → REV-REC-POOL</span></div>}
                                            {fm.transportConfig.type !== 'None' && <div className="flex justify-between text-[10px]"><span className="text-gray-500">Airport Transfer (In/Out)</span><span className="text-purple-400 font-mono text-[9px]">DEPT-05 Transport → REV-TRN</span></div>}
                                            {fm.laundryConfig.included && <div className="flex justify-between text-[10px]"><span className="text-gray-500">Laundry ({fm.laundryConfig.itemsAllowance} items)</span><span className="text-yellow-400 font-mono text-[9px]">DEPT-06 Minor → REV-LAUN-STD</span></div>}
                                            {fm.minibarConfig.included && <div className="flex justify-between text-[10px]"><span className="text-gray-500">Minibar Credit ৳{fm.minibarConfig.dailyCredit}</span><span className="text-pink-400 font-mono text-[9px]">DEPT-02 Minibar → REV-MINI-BAR</span></div>}
                                            {fm.outletCredits.map((oc, i) => <div key={i} className="flex justify-between text-[10px]"><span className="text-gray-500">{oc.outletName} Credit ({oc.creditType})</span><span className="text-orange-400 font-mono text-[9px]">DEPT-03 Outlets → {oc.revenueCode}</span></div>)}
                                            <div className="flex justify-between text-[10px] border-t border-gray-800 pt-2 mt-2">
                                                <span className="text-gray-300 uppercase tracking-widest">Base Pkg Surcharge</span>
                                                <span className="text-white font-black">৳{fm.finance.baseSurcharge}/night → DEPT-01 Rooms</span>
                                            </div>
                                        </div>
                                    </div>
                                </FormSection>
                            )}
                        </div>

                        {/* Preview Panel */}
                        {previewMode && (
                            <div className="space-y-4">
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fm.color }} />
                                        <h3 className="text-gray-900">{fm.name || 'Package Preview'}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${typeColors[fm.packageType] || typeColors.Standard}`}>{fm.packageType}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">{fm.description || 'No description yet'}</p>
                                    <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
                                        <span>Min {fm.validity.minNights} nights</span>
                                        <span className="text-gray-900">+৳{fm.finance.baseSurcharge}<span className="font-normal">/night</span></span>
                                    </div>
                                </div>
                                <AllowanceEngineViewer pkg={{ ...fm, id: 0 }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PackageManagement;
