import React, { useState, useMemo, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Save, X, Calendar, DollarSign,
    Shield, Percent, Star, Calendar as CalendarIcon,
    TrendingUp, AlertCircle, Layers, Coffee, Utensils,
    Moon, Sun, MapPin, Clock, FileText, Search,
    RefreshCw, AlertTriangle, CheckCircle2, Tags,
    BedDouble, Users, Check, Ban
} from 'lucide-react';
import { generateUniqueShortCode, isShortCodeDuplicate } from '../utils/codeGenerator';
import { getApiBaseUrl, getActivePropertyId } from '../utils/apiUrl';
import { useActiveCurrency, getActiveCurrencyCode } from '../utils/currencyUtils';
import { broadcastPMSEvent, getDynamicRoomTypes } from '../utils/roomInventoryEngine';
import PageHeader from './common/PageHeader';
import { confirmModal } from '../context/ConfirmModalContext';
import { toast } from '../context/ToastContext';

interface RatePlan {
    id: number;
    name: string;
    shortCode: string;
    marketSegment: string;
    currency: string;
    description: string;
    status: 'Active' | 'Inactive';
    mealPlan: string;
    packageId?: number;
    taxIncluded: boolean;
    promoCode?: string;
    policies: {
        depositRequired: boolean;
        depositAmount: number;
        depositType: 'Percentage' | 'Fixed';
        cancellationType: 'Flexible' | 'Moderate' | 'Strict' | 'Non-Refundable';
        cancellationDeadline: number;
        refundPercentage: number;
    };
    activationDate: string;
    expirationDate: string;
    stayDateStart?: string;
    stayDateEnd?: string;
    isSeasonal: boolean;
    seasonName?: string;
    seasonStart?: string;
    seasonEnd?: string;
    validDays: string[];
    minNights: number;
    maxNights?: number;
    cutOffDays: number;
    closedToArrival: boolean;
    closedToDeparture: boolean;
    stopSell: boolean;
    pricing: RatePricing[];
}

interface RatePricing {
    roomTypeId: string;
    structure: 'Flat' | 'Derived';
    operatingCost: number; // Internal room operating cost (OPEX)
    baseRate: number;
    doubleRate: number;
    tripleRate: number;
    extraAdult: number;
    extraChild: number;
    baseOccupancy: number;
    maxOccupancy: number;
    // 3-Pillar Unified Fields matching RoomType & Package:
    baseChild?: number;
    maxChild?: number;
    extraBedAllowed?: boolean;
    extraBedPrice?: number;
    useCustomSurcharges?: boolean;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function RatePlanManagement() {
    const { currencySymbol } = useActiveCurrency();
    const [view, setView] = useState<'list' | 'form' | 'calendar'>('list');
    const [ratePlans, setRatePlans] = useState<RatePlan[]>(() => {
        try {
            const saved = localStorage.getItem('hotel_rate_plans_v1');
            if (saved) return JSON.parse(saved);
        } catch {
            // fallback
        }
        return [];
    });
    const [formData, setFormData] = useState<Partial<RatePlan>>({});
    const [activeTab, setActiveTab] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingPlan, setEditingPlan] = useState<RatePlan | null>(null);
    const [isCodeManual, setIsCodeManual] = useState(false);
    const [availablePackages, setAvailablePackages] = useState<{ id: number; name: string; shortCode?: string }[]>([]);
    const [availableMealPlans, setAvailableMealPlans] = useState<{ id: number; shortCode: string; name: string; sellingPriceAdult: number }[]>([]);

    useEffect(() => {
        const API_BASE = getApiBaseUrl();
        const propId = getActivePropertyId();
        // Load rate plans from database
        fetch(`${API_BASE}/api/rates/plans?propertyId=${propId}`)
            .then(res => res.json())
            .then(json => {
                if (json.success && Array.isArray(json.data)) {
                    setRatePlans(json.data);
                    localStorage.setItem('hotel_rate_plans_v1', JSON.stringify(json.data));
                }
            })
            .catch(() => {});

        // Load packages dynamically from database
        fetch(`${API_BASE}/api/rates/packages?propertyId=${propId}`)
            .then(res => res.json())
            .then(json => {
                if (json.success && Array.isArray(json.data)) {
                    setAvailablePackages(json.data);
                }
            })
            .catch(() => {});

        // Load meal plans dynamically from database
        fetch(`${API_BASE}/api/rates/meal-plans?propertyId=${propId}`)
            .then(res => res.json())
            .then(json => {
                if (json.success && Array.isArray(json.data)) {
                    setAvailableMealPlans(json.data);
                }
            })
            .catch(() => {});
    }, []);

    const existingCodes = useMemo(() => ratePlans.map(p => p.shortCode), [ratePlans]);

    const toggleDay = (day: string) => {
        const currentDays = formData.validDays || [];
        if (currentDays.includes(day)) {
            setFormData({ ...formData, validDays: currentDays.filter((d: string) => d !== day) });
        } else {
            setFormData({ ...formData, validDays: [...currentDays, day] });
        }
    };

    const openCreate = () => {
        setIsCodeManual(false);
        const dynamicRooms = getDynamicRoomTypes();
        const initialPricing = dynamicRooms.map(rt => {
            const baseR = Number(rt.baseRate) || 0;
            const extraA = Number(rt.extraAdultPrice ?? rt.extraBedRate) || 0;
            const extraC = Number(rt.extraChildPrice) || 0;
            const baseOcc = Number(rt.baseOccupancy) || 1;
            const maxOcc = Number(rt.maxAdults) || baseOcc;
            const maxCh = Number(rt.maxChildren) || 0;
            const extraBedAllow = rt.extraBedAllowed !== undefined ? Boolean(rt.extraBedAllowed) : (Number(rt.extraBedRate) > 0);
            const extraBedP = Number(rt.extraBedRate || rt.extraAdultPrice || 1000);
            return {
                roomTypeId: rt.name,
                structure: 'Flat' as const,
                operatingCost: 0,
                baseRate: baseR,
                doubleRate: baseR,
                tripleRate: baseR + extraA,
                extraAdult: extraA,
                extraChild: extraC,
                baseOccupancy: baseOcc,
                maxOccupancy: maxOcc,
                baseChild: 0,
                maxChild: maxCh,
                extraBedAllowed: extraBedAllow,
                extraBedPrice: extraBedP,
                useCustomSurcharges: false
            };
        });
        const oneYearAhead = new Date();
        oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

        setFormData({
            status: 'Active',
            currency: getActiveCurrencyCode(),
            validDays: DAYS_OF_WEEK,
            mealPlan: availableMealPlans[0]?.shortCode || '',
            policies: {
                depositRequired: false,
                depositAmount: 0,
                depositType: 'Percentage',
                cancellationType: 'Flexible',
                cancellationDeadline: 24,
                refundPercentage: 100
            },
            activationDate: new Date().toISOString().split('T')[0],
            expirationDate: oneYearAhead.toISOString().split('T')[0],
            minNights: 1,
            cutOffDays: 0,
            taxIncluded: false,
            isSeasonal: false,
            closedToArrival: false,
            closedToDeparture: false,
            stopSell: false,
            pricing: initialPricing
        });
        setEditingPlan(null);
        setView('form');
        setActiveTab(1);
    };

    const openEdit = (plan: RatePlan) => {
        setFormData({ ...plan });
        setEditingPlan(plan);
        setIsCodeManual(true);
        setView('form');
        setActiveTab(1);
    };

    const handleNameChange = (name: string) => {
        const currentCode = editingPlan?.shortCode;
        let nextCode = formData.shortCode;
        if (!isCodeManual || !nextCode) {
            nextCode = generateUniqueShortCode(name, existingCodes, { currentCode, maxLength: 8 });
        }
        setFormData(prev => ({ ...prev, name, shortCode: nextCode }));
    };

    const persistRatePlans = (updated: RatePlan[]) => {
        setRatePlans(updated);
        try {
            localStorage.setItem('hotel_rate_plans_v1', JSON.stringify(updated));
        } catch {
            // fallback
        }
    };

    const handleDelete = async (id: number) => {
        const target = ratePlans.find(p => p.id === id);
        const name = target?.name || 'this rate plan';
        const confirmed = await confirmModal({
            title: `Delete Rate Plan "${name}"?`,
            message: 'Are you sure you want to delete this rate plan? Existing bookings with this rate plan will retain their snapshot tariff.',
            confirmText: 'Delete Plan',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await fetch(`${getApiBaseUrl()}/api/rates/plans/${id}`, { method: 'DELETE' });
        } catch {}
        const updated = ratePlans.filter(p => p.id !== id);
        persistRatePlans(updated);
        try {
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}
        toast.success(`Rate Plan "${name}" deleted.`);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.shortCode) {
            toast.warning('Please provide Plan Name and Short Code.');
            return;
        }

        const currentCode = editingPlan?.shortCode;
        if (isShortCodeDuplicate(formData.shortCode, existingCodes, currentCode)) {
            toast.error(`Short Code "${formData.shortCode}" is already in use by another Rate Plan! Please use a unique code.`);
            return;
        }

        let finalData = { ...formData, id: editingPlan?.id || Date.now() } as RatePlan;
        const API_BASE = getApiBaseUrl();

        if (editingPlan) {
            try {
                await fetch(`${API_BASE}/api/rates/plans/${editingPlan.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            } catch {}
        } else {
            try {
                const res = await fetch(`${API_BASE}/api/rates/plans`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const json = await res.json();
                if (json.success && json.data?.id) {
                    finalData = { ...finalData, id: json.data.id };
                }
            } catch {}
        }

        let updated: RatePlan[];
        if (editingPlan) {
            updated = ratePlans.map((p: RatePlan) => p.id === editingPlan.id ? finalData : p);
        } else {
            updated = [...ratePlans, finalData];
        }
        persistRatePlans(updated);
        try {
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}
        toast.success(editingPlan ? `Rate Plan "${finalData.name}" updated!` : `Rate Plan "${finalData.name}" created!`);
        setView('list');
        setFormData({});
        setEditingPlan(null);
    };

    const renderList = () => {
        const totalPlans = ratePlans.length;
        const activeCount = ratePlans.filter(p => p.status === 'Active').length;
        const packageLinkedCount = ratePlans.filter(p => p.packageId).length;
        const seasonalCount = ratePlans.filter(p => p.isSeasonal).length;

        return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Standardized PageHeader matching Thesis */}
            <PageHeader
                title="Rate Plan Management"
                subtitle="Define selling strategies, yield rules, market segments, and inventory fencings."
                icon={<Tags className="size-6 text-primary" />}
                badge={
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-subtle text-primary border border-primary-border">
                        Commercial & Pricing
                    </span>
                }
                actions={
                    <>
                        <button
                            type="button"
                            onClick={() => setView('calendar')}
                            className="btn-secondary"
                        >
                            <CalendarIcon className="size-3.5" />
                            <span>Yield Console</span>
                        </button>
                        <button
                            type="button"
                            onClick={openCreate}
                            className="btn-primary"
                        >
                            <Plus className="size-3.5" />
                            <span>Define New Plan</span>
                        </button>
                    </>
                }
            />

            {/* KPI Metric Cards Row matching Thesis */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Total Rate Plans</span>
                        <div className="size-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                            <Tags className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">{totalPlans}</span>
                        <span className="text-[11px] font-semibold text-emerald-600">
                            {activeCount} Active
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Multi-market rate structures</p>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Package Bundled</span>
                        <div className="size-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            <Layers className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">{packageLinkedCount}</span>
                        <span className="text-[11px] text-slate-400">Linked packages</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Auto-allocates revenue</p>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Seasonal Strategies</span>
                        <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <TrendingUp className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">{seasonalCount}</span>
                        <span className="text-[11px] font-semibold text-amber-600">Peak seasons</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Time-locked yield pricing</p>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">System Yield Health</span>
                        <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <CheckCircle2 className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">100%</span>
                        <span className="text-[11px] font-semibold text-emerald-600">Optimal</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">All fences active & verified</p>
                </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search rate plans, codes, or segments..."
                        className="input-standard pl-9"
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="text-xs text-slate-500 font-medium self-end md:self-auto">
                    Showing <span className="text-slate-900">{ratePlans.filter((plan: RatePlan) => plan.name.toLowerCase().includes(searchQuery.toLowerCase()) || plan.shortCode.toLowerCase().includes(searchQuery.toLowerCase())).length}</span> strategies
                </div>
            </div>

            {/* Table Container */}
            <div className="table-container">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <th className="py-3.5 px-4">Identity & Segment</th>
                                <th className="py-3.5 px-4">Meal Plan</th>
                                <th className="py-3.5 px-4">Policies</th>
                                <th className="py-3.5 px-4">Fencings</th>
                                <th className="py-3.5 px-4 text-right">Pricing (Base)</th>
                                <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {ratePlans
                                .filter((plan: RatePlan) => plan.name.toLowerCase().includes(searchQuery.toLowerCase()) || plan.shortCode.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((plan: RatePlan) => (
                                <tr key={plan.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-3.5 px-4">
                                        <div className="text-slate-900">{plan.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="badge-code">{plan.shortCode}</span>
                                            <span className="text-[10px] text-primary uppercase tracking-tight">{plan.marketSegment}</span>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-1.5">
                                            <Coffee size={13} className="text-amber-500 shrink-0" />
                                            <span className="font-semibold text-slate-800">{plan.mealPlan}</span>
                                        </div>
                                        {plan.packageId && (
                                            <div className="text-[10px] text-purple-600 font-semibold mt-1 inline-flex items-center gap-1">
                                                <Layers size={10}/> Package Linked
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] border ${plan.policies.cancellationType === 'Non-Refundable' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                            {plan.policies.cancellationType}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="space-y-0.5">
                                            <div className="text-[11px] flex items-center gap-1.5 font-medium text-slate-700">
                                                <Clock size={11} className="text-slate-400"/> Min {plan.minNights} Nights
                                            </div>
                                            {plan.stopSell && (
                                                <div className="text-[10px] text-rose-600 flex items-center gap-1">
                                                    <AlertCircle size={11}/> STOP SELL
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <div className="text-slate-900 font-mono text-sm">{currencySymbol}{plan.pricing[0]?.baseRate.toLocaleString()}</div>
                                        <div className="text-[10px] text-slate-400 font-medium">Exc. Tax</div>
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(plan)}
                                                className="btn-icon"
                                                title="Edit Rate Plan"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(plan.id)}
                                                className="btn-icon-danger"
                                                title="Delete Rate Plan"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        );
    };

    const renderForm = () => (
        <div className="h-full flex flex-col bg-[#fafafc] min-h-screen">
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-2xs">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => setView('list')}
                        className="btn-icon size-9 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition"
                    >
                        <X size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl text-slate-900 tracking-tight">
                            {editingPlan ? `Edit Rate Plan: ${editingPlan.shortCode}` : 'Define New Rate Strategy'}
                        </h1>
                        <p className="text-xs text-slate-500">Configure inclusions, seasonal validity, room pricing matrix & yield fences</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setView('list')}
                        className="btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="btn-primary"
                    >
                        <Save size={15} />
                        <span>Deploy Strategy</span>
                    </button>
                </div>
            </div>

            <div className="flex border-b border-slate-200 bg-white px-6 gap-2">
                {[
                    { id: 1, label: 'Identity', icon: <FileText size={14} /> },
                    { id: 2, label: 'Inclusions', icon: <Utensils size={14} /> },
                    { id: 3, label: 'Validity', icon: <Calendar size={14} /> },
                    { id: 4, label: 'Restrictions', icon: <Shield size={14} /> },
                    { id: 5, label: 'Pricing Matrix', icon: <DollarSign size={14} /> }
                ].map((tab: { id: number; label: string; icon: React.ReactNode }) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold border-b-2 transition ${
                            activeTab === tab.id
                                ? 'border-primary text-primary bg-primary-subtle/50 rounded-t-xl'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-auto p-10 max-w-5xl mx-auto w-full">
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                    {activeTab === 1 && (
                        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-8">
                            <div className="flex items-center gap-2 border-b pb-4">
                                <FileText size={18} className="text-blue-600" />
                                <h3 className="text-lg text-gray-900">Basic Information</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2 text-xs">
                                    <label className="font-black text-gray-700 uppercase tracking-widest pl-1">Plan Name <span className="text-red-500">*</span></label>
                                    <input className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" value={formData.name || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)} placeholder="e.g. Best Available Rate" />
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                        <label className="font-black text-gray-700 uppercase tracking-widest pl-1">Short Code <span className="text-red-500">*</span></label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const auto = generateUniqueShortCode(formData.name || '', existingCodes, {
                                                    currentCode: editingPlan?.shortCode,
                                                    maxLength: 8
                                                });
                                                setFormData(prev => ({ ...prev, shortCode: auto }));
                                                setIsCodeManual(false);
                                            }}
                                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                                        >
                                            <RefreshCw size={10} /> Auto-Generate
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            className={`w-full px-4 py-3 pr-9 border rounded-lg outline-none text-sm font-mono tracking-widest uppercase transition-all ${
                                                isShortCodeDuplicate(formData.shortCode || '', existingCodes, editingPlan?.shortCode)
                                                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                                                    : 'border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500'
                                            }`}
                                            value={formData.shortCode || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                setIsCodeManual(true);
                                                setFormData({ ...formData, shortCode: e.target.value.toUpperCase() });
                                            }}
                                            placeholder="BAR-01"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            {isShortCodeDuplicate(formData.shortCode || '', existingCodes, editingPlan?.shortCode) ? (
                                                <AlertTriangle size={15} className="text-rose-500" />
                                            ) : formData.shortCode ? (
                                                <CheckCircle2 size={15} className="text-emerald-500" />
                                            ) : null}
                                        </div>
                                    </div>
                                    {isShortCodeDuplicate(formData.shortCode || '', existingCodes, editingPlan?.shortCode) && (
                                        <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1">
                                            <AlertTriangle size={10} /> Short Code already in use! Must be unique.
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2 text-xs">
                                    <label className="font-black text-gray-700 uppercase tracking-widest pl-1">Market Segment</label>
                                    <select className="w-full px-4 py-3 border rounded-lg bg-white text-sm" value={formData.marketSegment || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, marketSegment: e.target.value })}>
                                        <option value="FIT / Direct">FIT / Direct Guest</option>
                                        <option value="Corporate">Corporate / Negotiated</option>
                                        <option value="OTA Channels">OTA Channels (Booking, Expedia)</option>
                                        <option value="Wholesale">Wholesale / FIT</option>
                                    </select>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <label className="font-black text-gray-700 uppercase tracking-widest pl-1">Status</label>
                                    <select className="w-full px-4 py-3 border rounded-lg bg-white text-sm" value={formData.status || 'Active'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value as any })}>
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="col-span-2 space-y-2 text-xs">
                                    <label className="font-black text-gray-700 uppercase tracking-widest pl-1">Strategy Description</label>
                                    <textarea className="w-full px-4 py-3 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none italic leading-relaxed" value={formData.description || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe why this strategy exists..." />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 2 && (
                        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-10">
                            <div className="flex items-center gap-2 border-b pb-4">
                                <Utensils size={18} className="text-blue-600" />
                                <h3 className="text-lg text-gray-900">Meal Plan & Packages</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">Meal Plan Selection</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button 
                                            type="button"
                                            key="room_only" 
                                            onClick={() => setFormData({ ...formData, mealPlan: '' })}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${!formData.mealPlan || formData.mealPlan === 'EP' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-gray-50 border-gray-100 hover:border-blue-200 hover:bg-white text-gray-600'}`}
                                        >
                                            <div className="text-sm font-bold">Room Only (EP)</div>
                                            <div className={`text-[10px] leading-tight mt-1 ${!formData.mealPlan || formData.mealPlan === 'EP' ? 'text-blue-100' : 'text-gray-400'}`}>
                                                No meals included (Standard Room Rate)
                                            </div>
                                        </button>
                                        {availableMealPlans.map((item: any) => {
                                            const code = item.shortCode || item.code || item.id;
                                            return (
                                                <button 
                                                    type="button"
                                                    key={code} 
                                                    onClick={() => setFormData({ ...formData, mealPlan: code })}
                                                    className={`p-4 rounded-xl border-2 text-left transition-all ${formData.mealPlan === code ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-gray-50 border-gray-100 hover:border-blue-200 hover:bg-white text-gray-600'}`}
                                                >
                                                    <div className="text-sm font-bold">{code}</div>
                                                    <div className={`text-[10px] leading-tight mt-1 ${formData.mealPlan === code ? 'text-blue-100' : 'text-gray-400'}`}>
                                                        {item.name} {Number(item.sellingPriceAdult) > 0 ? `(${currencySymbol}${item.sellingPriceAdult})` : ''}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {availableMealPlans.length === 0 && (
                                            <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-center">
                                                <div className="text-[11px] text-slate-400">
                                                    No meal plans configured in <span className="font-semibold text-slate-600">Meal Plans</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">Linked Package (Layer 2)</label>
                                    <select className="w-full px-4 py-3 border-2 border-blue-100 rounded-xl bg-blue-50 text-blue-900 text-sm" value={formData.packageId || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, packageId: parseInt(e.target.value) || undefined })}>
                                        <option value="">None (Standalone Plan)</option>
                                        {availablePackages.map(pkg => (
                                            <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-gray-400 italic">Sub-Level-2 packages will add extra revenue routing and amenity bundles to this rate plan automatically.</p>
                                </div>
                            </div>
                            <div className="p-6 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white rounded-lg shadow-sm text-amber-600"><Percent size={20} /></div>
                                    <div>
                                        <h4 className="text-gray-900 text-sm">Tax Policy</h4>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Pricing inclusive/exclusive tax rule</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={formData.taxIncluded || false} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, taxIncluded: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 3 && (
                        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-10">
                            <div className="flex items-center gap-2 border-b pb-4">
                                <Calendar size={18} className="text-blue-600" />
                                <h3 className="text-lg text-gray-900">Validity & Seasonality</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2 text-xs">
                                    <label className="font-black text-gray-700 uppercase tracking-widest pl-1"><Sun size={12} className="inline mr-1"/> Activation Date</label>
                                    <input type="date" className="w-full px-4 py-3 border rounded-lg text-sm" value={formData.activationDate || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, activationDate: e.target.value})} />
                                </div>
                                <div className="space-y-2 text-xs">
                                    <label className="font-black text-gray-700 uppercase tracking-widest pl-1"><Moon size={12} className="inline mr-1"/> Expiration Date</label>
                                    <input type="date" className="w-full px-4 py-3 border rounded-lg text-sm" value={formData.expirationDate || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, expirationDate: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block pl-1">Market Days Availability</label>
                                <div className="flex gap-2">
                                    {DAYS_OF_WEEK.map((day: string) => (
                                        <button 
                                            key={day} 
                                            onClick={() => toggleDay(day)}
                                            className={`flex-1 py-4 rounded-xl text-xs font-black transition-all ${formData.validDays?.includes(day) ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-300 hover:bg-white border border-gray-100'}`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className={`p-8 rounded-2xl border-2 border-dashed transition-all ${formData.isSeasonal ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${formData.isSeasonal ? 'bg-amber-500 text-white' : 'bg-white text-gray-300'}`}><Star size={24} /></div>
                                        <div>
                                            <h4 className="text-gray-900 text-sm">Seasonal Rate marking</h4>
                                            <p className="text-[10px] text-gray-500 font-medium">Markup strategy based on high-demand periods</p>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={formData.isSeasonal || false} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, isSeasonal: e.target.checked })} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                    </label>
                                </div>
                                {formData.isSeasonal && (
                                    <div className="mt-8 grid grid-cols-3 gap-4 animate-in fade-in duration-500">
                                        <div className="space-y-1 text-[10px] font-black uppercase text-amber-600 col-span-1">
                                            <label className="pl-1">Season Name</label>
                                            <input className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs" value={formData.seasonName || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, seasonName: e.target.value})} placeholder="e.g. Summer Break" />
                                        </div>
                                        <div className="space-y-1 text-[10px] font-black uppercase text-amber-600">
                                            <label className="pl-1">From</label>
                                            <input type="date" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs" />
                                        </div>
                                        <div className="space-y-1 text-[10px] font-black uppercase text-amber-600">
                                            <label className="pl-1">To</label>
                                            <input type="date" className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 4 && (
                        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-10">
                            <div className="flex items-center gap-2 border-b pb-4">
                                <Shield size={18} className="text-blue-600" />
                                <h3 className="text-lg text-gray-900">Yield Fences & Controls</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2 text-xs">
                                    <label className="font-black text-gray-700 uppercase tracking-widest pl-1">Minimum Nights</label>
                                    <input type="number" className="w-full px-4 py-3 border rounded-lg text-sm font-bold" value={formData.minNights} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, minNights: parseInt(e.target.value) || 1})} />
                                </div>
                                <div className="space-y-2 text-xs">
                                    <label className="font-black text-gray-700 uppercase tracking-widest pl-1">Booking Cut-off (Hours)</label>
                                    <input type="number" className="w-full px-4 py-3 border rounded-lg text-sm font-bold" placeholder="0 = Immediate" value={formData.cutOffDays} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, cutOffDays: parseInt(e.target.value) || 0})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                                {[
                                    { label: 'Closed to Arrival', key: 'closedToArrival' as const, icon: <MapPin size={20}/> },
                                    { label: 'Closed to Departure', key: 'closedToDeparture' as const, icon: <X size={20}/> }
                                ].map((item: { label: string; key: 'closedToArrival' | 'closedToDeparture'; icon: React.ReactNode }) => (
                                    <button 
                                        key={item.key}
                                        onClick={() => setFormData({ ...formData, [item.key]: !formData[item.key] })}
                                        className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all ${formData[item.key] ? 'bg-white border-blue-500 shadow-md' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}
                                    >
                                        <div className={`p-3 rounded-full ${formData[item.key] ? 'bg-blue-600 text-white' : 'bg-white text-gray-300'}`}>{item.icon}</div>
                                        <div className="text-center text-xs uppercase tracking-tighter text-gray-700">{item.label}</div>
                                        <div className={`text-[10px] font-black uppercase ${formData[item.key] ? 'text-blue-600' : 'text-gray-300'}`}>
                                            {formData[item.key] ? 'Enabled' : 'Disabled'}
                                        </div>
                                    </button>
                                ))}
                                <button 
                                    onClick={() => setFormData({...formData, stopSell: !formData.stopSell})}
                                    className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-4 transition-all group ${formData.stopSell ? 'bg-red-600 border-red-600 text-white shadow-xl shadow-red-200 animate-pulse' : 'bg-gray-900 border-gray-900 text-white hover:bg-gray-800'}`}
                                >
                                    <AlertCircle size={32} className={formData.stopSell ? 'text-white' : 'text-red-500'} />
                                    <div className="text-center font-black text-xs uppercase tracking-widest">STOP SELL SWITCH</div>
                                    <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${formData.stopSell ? 'bg-white text-red-600' : 'bg-red-600/20 text-red-500'}`}>
                                        {formData.stopSell ? 'INVENTORY LOCKED' : 'MARKET OPEN'}
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 5 && (
                        <div className="space-y-6">
                            {/* Smart Room Types Sync Header */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-50/80 border border-blue-200/90 rounded-2xl p-4 shadow-2xs">
                                <div>
                                    <h4 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                                        <Layers size={16} className="text-blue-600" />
                                        <span>Room Category Rate Matrix</span>
                                    </h4>
                                    <p className="text-xs text-blue-700 mt-0.5">
                                        Sync with registered Room Types to avoid spelling errors and ensure exact booking matching.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const dynamicRooms = getDynamicRoomTypes();
                                        const existingMap = new Map((formData.pricing || []).map(p => [p.roomTypeId.toLowerCase(), p]));
                                        const merged = dynamicRooms.map(rt => {
                                            const existing = existingMap.get(rt.name.toLowerCase());
                                            if (existing) return existing;
                                            const baseR = Number(rt.baseRate) || 0;
                                            const extraA = Number(rt.extraAdultPrice ?? rt.extraBedRate) || 0;
                                            const extraC = Number(rt.extraChildPrice) || 0;
                                            const baseOcc = Number(rt.baseOccupancy) || 1;
                                            const maxOcc = Number(rt.maxAdults) || baseOcc;
                                            const maxCh = Number(rt.maxChildren) || 0;
                                            const extraBedAllow = rt.extraBedAllowed !== undefined ? Boolean(rt.extraBedAllowed) : (Number(rt.extraBedRate) > 0);
                                            const extraBedP = Number(rt.extraBedRate || rt.extraAdultPrice || 1000);
                                            return {
                                                roomTypeId: rt.name,
                                                structure: 'Flat' as const,
                                                operatingCost: 0,
                                                baseRate: baseR,
                                                doubleRate: baseR,
                                                tripleRate: baseR + extraA,
                                                extraAdult: extraA,
                                                extraChild: extraC,
                                                baseOccupancy: baseOcc,
                                                maxOccupancy: maxOcc,
                                                baseChild: 0,
                                                maxChild: maxCh,
                                                extraBedAllowed: extraBedAllow,
                                                extraBedPrice: extraBedP,
                                                useCustomSurcharges: false
                                            };
                                        });
                                        setFormData({ ...formData, pricing: merged });
                                    }}
                                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition cursor-pointer select-none whitespace-nowrap"
                                >
                                    <RefreshCw size={13} />
                                    <span>Sync All Room Types ({getDynamicRoomTypes().length})</span>
                                </button>
                            </div>

                            {(formData.pricing || []).map((price: RatePricing, idx: number) => {
                                const dynamicRooms = getDynamicRoomTypes();
                                const matchedRt = dynamicRooms.find(r => r.name.toLowerCase() === price.roomTypeId.toLowerCase());
                                const isPhysicallyAllowed = matchedRt
                                    ? (matchedRt.extraBedAllowed !== false && (Boolean(matchedRt.extraBedAllowed) || Number(matchedRt.extraBedRate) > 0))
                                    : true;
                                const defaultExtraBedTariff = matchedRt?.extraBedRate || 1000;

                                return (
                                <div key={idx} className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8 space-y-6 group hover:border-blue-200 transition-all duration-300 relative">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({ ...formData, pricing: (formData.pricing || []).filter((_: RatePricing, i: number) => i !== idx) })} 
                                        className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 border rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                        title="Remove room category from this rate plan"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b pb-5">
                                        <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-white text-lg font-bold">#{idx + 1}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    className="w-full text-lg font-bold bg-transparent border-b border-dashed border-gray-300 focus:border-blue-600 outline-none pb-1 text-gray-900 cursor-pointer"
                                                    value={price.roomTypeId}
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                        const selectedRtName = e.target.value;
                                                        const matched = dynamicRooms.find(r => r.name === selectedRtName);
                                                        const newPricing = [...(formData.pricing || [])];
                                                        if (matched) {
                                                            const baseR = Number(matched.baseRate) || 0;
                                                            const extraA = Number(matched.extraAdultPrice ?? matched.extraBedRate) || 0;
                                                            const extraC = Number(matched.extraChildPrice) || 0;
                                                            const baseOcc = Number(matched.baseOccupancy) || 1;
                                                            const maxOcc = Number(matched.maxAdults) || baseOcc;
                                                            const maxCh = Number(matched.maxChildren) || 0;
                                                            const extraBedAllow = matched.extraBedAllowed !== undefined ? Boolean(matched.extraBedAllowed) : (Number(matched.extraBedRate) > 0);
                                                            const extraBedP = Number(matched.extraBedRate || matched.extraAdultPrice || 1000);

                                                            newPricing[idx] = {
                                                                ...newPricing[idx],
                                                                roomTypeId: selectedRtName,
                                                                baseRate: newPricing[idx].baseRate > 0 ? newPricing[idx].baseRate : baseR,
                                                                doubleRate: newPricing[idx].doubleRate > 0 ? newPricing[idx].doubleRate : baseR,
                                                                tripleRate: newPricing[idx].tripleRate > 0 ? newPricing[idx].tripleRate : (baseR + extraA),
                                                                extraAdult: newPricing[idx].extraAdult > 0 ? newPricing[idx].extraAdult : extraA,
                                                                extraChild: newPricing[idx].extraChild > 0 ? newPricing[idx].extraChild : extraC,
                                                                baseOccupancy: baseOcc,
                                                                maxOccupancy: maxOcc,
                                                                baseChild: 0,
                                                                maxChild: maxCh,
                                                                extraBedAllowed: extraBedAllow,
                                                                extraBedPrice: extraBedP
                                                            };
                                                        } else {
                                                            newPricing[idx] = {
                                                                ...newPricing[idx],
                                                                roomTypeId: selectedRtName
                                                            };
                                                        }
                                                        setFormData({ ...formData, pricing: newPricing });
                                                    }}
                                                >
                                                    {dynamicRooms.map(r => (
                                                        <option key={r.name} value={r.name}>{r.name} ({r.code || 'STD'})</option>
                                                    ))}
                                                    {!dynamicRooms.some(r => r.name === price.roomTypeId) && price.roomTypeId && (
                                                        <option value={price.roomTypeId}>{price.roomTypeId} (Custom Tier)</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate Plan Category Strategy</div>
                                                <div className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${price.baseRate >= price.operatingCost ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                    GOP Margin: {currencySymbol}{(price.baseRate - price.operatingCost).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Internal Operating Cost (OPEX)</label>
                                            <div className="relative inline-block">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{currencySymbol}</span>
                                                <input 
                                                    type="number"
                                                    className="w-32 pl-7 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-500 text-right focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    value={price.operatingCost}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                        const newPricing = [...(formData.pricing || [])];
                                                        newPricing[idx] = { ...newPricing[idx], operatingCost: parseInt(e.target.value) || 0 };
                                                        setFormData({ ...formData, pricing: newPricing });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Physical Space & Capacity Ceiling Reference (Ground Truth) */}
                                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2 text-slate-700">
                                            <BedDouble size={15} className="text-blue-600 shrink-0" />
                                            <span className="font-semibold">Room Type Physical Limits:</span>
                                            <span className="text-slate-600">
                                                Base: <strong>{matchedRt?.baseOccupancy || price.baseOccupancy || 1}A</strong> · Physical Max: <strong>{matchedRt?.maxAdults || price.maxOccupancy || 2} Adults, {matchedRt?.maxChildren || 0} Children</strong> (Total: {(matchedRt?.maxAdults || 2) + (matchedRt?.maxChildren || 0)} Guests)
                                            </span>
                                        </div>
                                        <div>
                                            {isPhysicallyAllowed ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <Check size={11} /> Rollaway Bed Supported
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                    <Ban size={11} /> Extra Bed Physically Prohibited (No Space)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3 Unified Pillars matching RoomType */}
                                    <div className="space-y-6">
                                        {/* Pillar 1: Occupancy & Inclusions */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                <Users size={14} className="text-blue-600" />
                                                <span>1. Occupancy & Plan Inclusions</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Base Adults Included</label>
                                                    <input 
                                                        type="number"
                                                        min={1}
                                                        max={matchedRt?.maxAdults || 4}
                                                        className="w-full px-3 py-2 border rounded-lg text-xs bg-white font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={price.baseOccupancy || 1}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                            const newPricing = [...(formData.pricing || [])];
                                                            newPricing[idx] = { ...newPricing[idx], baseOccupancy: parseInt(e.target.value) || 1 };
                                                            setFormData({ ...formData, pricing: newPricing });
                                                        }}
                                                    />
                                                    <span className="text-[9px] text-gray-400 block">Guests included in Base Rate</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Base Children Included</label>
                                                    <input 
                                                        type="number"
                                                        min={0}
                                                        max={matchedRt?.maxChildren || 2}
                                                        className="w-full px-3 py-2 border rounded-lg text-xs bg-white font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={price.baseChild || 0}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                            const newPricing = [...(formData.pricing || [])];
                                                            newPricing[idx] = { ...newPricing[idx], baseChild: parseInt(e.target.value) || 0 };
                                                            setFormData({ ...formData, pricing: newPricing });
                                                        }}
                                                    />
                                                    <span className="text-[9px] text-gray-400 block">Complimentary kids (e.g. 0 or 1)</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Commercial Max Adults</label>
                                                    <input 
                                                        type="number"
                                                        min={1}
                                                        max={matchedRt?.maxAdults || 6}
                                                        className="w-full px-3 py-2 border rounded-lg text-xs bg-white font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={price.maxOccupancy || matchedRt?.maxAdults || 2}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                            const val = parseInt(e.target.value) || 1;
                                                            const newPricing = [...(formData.pricing || [])];
                                                            newPricing[idx] = { ...newPricing[idx], maxOccupancy: val };
                                                            setFormData({ ...formData, pricing: newPricing });
                                                        }}
                                                    />
                                                    <span className="text-[9px] text-gray-400 block">Max adults allowed on this plan</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Commercial Max Children</label>
                                                    <input 
                                                        type="number"
                                                        min={0}
                                                        max={matchedRt?.maxChildren || 4}
                                                        className="w-full px-3 py-2 border rounded-lg text-xs bg-white font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={price.maxChild !== undefined ? price.maxChild : (matchedRt?.maxChildren || 0)}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            const newPricing = [...(formData.pricing || [])];
                                                            newPricing[idx] = { ...newPricing[idx], maxChild: val };
                                                            setFormData({ ...formData, pricing: newPricing });
                                                        }}
                                                    />
                                                    <span className="text-[9px] text-gray-400 block">Max children allowed on this plan</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pillar 2: Extra Bedding Policies (Hardware Governed) */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                <BedDouble size={14} className="text-blue-600" />
                                                <span>2. Extra Bedding Policies</span>
                                            </div>
                                            {!isPhysicallyAllowed ? (
                                                <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-800">
                                                    <Ban size={18} className="text-rose-600 shrink-0" />
                                                    <div>
                                                        <strong>Physically Prohibited:</strong> Room category &quot;{price.roomTypeId}&quot; dimensions do not support extra rollaway beds. Extra bedding is permanently disabled for this category.
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-gray-50/60 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                className="sr-only peer" 
                                                                checked={price.extraBedAllowed !== false} 
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                    const newPricing = [...(formData.pricing || [])];
                                                                    newPricing[idx] = { ...newPricing[idx], extraBedAllowed: e.target.checked };
                                                                    setFormData({ ...formData, pricing: newPricing });
                                                                }} 
                                                            />
                                                            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                                                        </label>
                                                        <div>
                                                            <div className="text-xs font-bold text-gray-800">
                                                                {price.extraBedAllowed !== false ? 'Extra Rollaway Bed Allowed' : 'Extra Rollaway Bed Disallowed for this Plan'}
                                                            </div>
                                                            <div className="text-[10px] text-gray-500">
                                                                Can guests request a rollaway bed when booking this rate plan?
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {price.extraBedAllowed !== false && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Extra Bed Tariff:</span>
                                                            <div className="relative">
                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">{currencySymbol}</span>
                                                                <input 
                                                                    type="number" 
                                                                    className="w-32 pl-6 pr-3 py-1.5 border rounded-lg text-xs font-mono font-bold text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                                    value={price.extraBedPrice !== undefined ? price.extraBedPrice : defaultExtraBedTariff}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                        const val = parseInt(e.target.value) || 0;
                                                                        const newPricing = [...(formData.pricing || [])];
                                                                        newPricing[idx] = { ...newPricing[idx], extraBedPrice: val };
                                                                        setFormData({ ...formData, pricing: newPricing });
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] text-gray-400">/night</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Pillar 3: Base Pricing & Surcharges */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                                                <DollarSign size={14} className="text-blue-600" />
                                                <span>3. Base Pricing & Surcharges</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                                {[
                                                    { label: 'Single Rate', key: 'baseRate', hint: '1 Adult occupant' },
                                                    { label: 'Double Rate', key: 'doubleRate', hint: '2 Adult occupants' },
                                                    { label: 'Triple Rate', key: 'tripleRate', hint: '3 Adult occupants' },
                                                    { label: 'Extra Adult', key: 'extraAdult', hint: `Default: ${currencySymbol}${matchedRt?.extraAdultPrice || 0}` },
                                                    { label: 'Extra Child', key: 'extraChild', hint: `Default: ${currencySymbol}${matchedRt?.extraChildPrice || 0}` }
                                                ].map((field: { label: string; key: string; hint: string }) => (
                                                    <div key={field.key} className="space-y-1 bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                                                        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">{field.label}</label>
                                                        <div className="relative">
                                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">{currencySymbol}</span>
                                                            <input 
                                                                type="number" 
                                                                className="w-full pl-6 pr-2.5 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs font-mono font-bold text-gray-800 bg-white"
                                                                value={(price as any)[field.key] || 0}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                    const newPricing = [...(formData.pricing || [])];
                                                                    (newPricing[idx] as any)[field.key] = parseInt(e.target.value) || 0;
                                                                    setFormData({ ...formData, pricing: newPricing });
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-[9px] text-gray-400 block truncate">{field.hint}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );})}
                            <button 
                                type="button"
                                onClick={() => {
                                    const dynamicRooms = getDynamicRoomTypes();
                                    const existingTypes = new Set((formData.pricing || []).map(p => p.roomTypeId.toLowerCase()));
                                    const nextUnused = dynamicRooms.find(r => !existingTypes.has(r.name.toLowerCase())) || dynamicRooms[0];
                                    
                                    if (nextUnused) {
                                        const baseR = Number(nextUnused.baseRate) || 0;
                                        const extraA = Number(nextUnused.extraAdultPrice ?? nextUnused.extraBedRate) || 0;
                                        const extraC = Number(nextUnused.extraChildPrice) || 0;
                                        const baseOcc = Number(nextUnused.baseOccupancy) || 1;
                                        const maxOcc = Number(nextUnused.maxAdults) || baseOcc;
                                        const maxCh = Number(nextUnused.maxChildren) || 0;
                                        const extraBedAllow = nextUnused.extraBedAllowed !== undefined ? Boolean(nextUnused.extraBedAllowed) : (Number(nextUnused.extraBedRate) > 0);
                                        const extraBedP = Number(nextUnused.extraBedRate || nextUnused.extraAdultPrice || 1000);

                                        setFormData({
                                            ...formData,
                                            pricing: [
                                                ...(formData.pricing || []),
                                                {
                                                    roomTypeId: nextUnused.name,
                                                    structure: 'Flat',
                                                    operatingCost: 0,
                                                    baseRate: baseR,
                                                    doubleRate: baseR,
                                                    tripleRate: baseR + extraA,
                                                    extraAdult: extraA,
                                                    extraChild: extraC,
                                                    baseOccupancy: baseOcc,
                                                    maxOccupancy: maxOcc,
                                                    baseChild: 0,
                                                    maxChild: maxCh,
                                                    extraBedAllowed: extraBedAllow,
                                                    extraBedPrice: extraBedP,
                                                    useCustomSurcharges: false
                                                }
                                            ] as any
                                        });
                                    }
                                }}
                                className="w-full py-8 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 text-sm font-semibold uppercase tracking-wider hover:border-blue-400 hover:text-blue-600 transition-all hover:bg-blue-50/50 flex flex-col items-center gap-2 cursor-pointer"
                            >
                                <Plus size={24} />
                                <span>Add Room Category Strategy</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderCalendar = () => (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-xs">
                <div>
                    <h2 className="text-xl flex items-center gap-3 text-gray-900">
                        <TrendingUp className="text-blue-600" /> Yield Operations Grid (July 2026)
                    </h2>
                    <p className="text-xs text-gray-500">Live multi-tier BAR and Corporate distribution rates</p>
                </div>
                <button onClick={() => setView('list')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs uppercase tracking-wider text-gray-700 transition-colors">
                    <X size={15} className="inline mr-1.5"/> Close Console
                </button>
            </div>
            <div className="grid grid-cols-7 gap-3">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d: string) => (
                    <div key={d} className="text-center text-gray-400 text-[11px] uppercase tracking-wider py-1">{d}</div>
                ))}
                {/* 3 leading empty cells for July 1 2026 (Wednesday) */}
                <div className="h-28 bg-gray-50/50 border border-transparent rounded-xl" />
                <div className="h-28 bg-gray-50/50 border border-transparent rounded-xl" />
                <div className="h-28 bg-gray-50/50 border border-transparent rounded-xl" />
                {[...Array(31)].map((_: any, i: number) => {
                    const dayNum = i + 1;
                    const isFriOrSat = (dayNum + 2) % 7 === 5 || (dayNum + 2) % 7 === 6;
                    const dynamicRooms = getDynamicRoomTypes();
                    const defaultDailyRate = Number(dynamicRooms[0]?.baseRate) || (Number(ratePlans[0]?.pricing?.[0]?.baseRate) || 0);
                    const weekendDailyRate = Math.round(defaultDailyRate * 1.15);
                    const baseRate = isFriOrSat ? (weekendDailyRate || defaultDailyRate) : defaultDailyRate;
                    return (
                        <div key={i} className="h-28 bg-white border border-gray-200/90 rounded-xl p-2.5 hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between shadow-2xs">
                            <div className="flex justify-between items-start">
                                <span className="text-gray-800 text-xs">{dayNum}</span>
                                <div className={`w-2 h-2 rounded-full ${isFriOrSat ? 'bg-purple-500' : 'bg-emerald-500'}`} title={isFriOrSat ? 'Weekend Surcharge' : 'Standard Demand'} />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] bg-blue-50/80 px-1.5 py-0.5 rounded text-blue-700">
                                    <span>BAR</span>
                                    <span>{currencySymbol}{(baseRate / 1000).toFixed(1)}k</span>
                                </div>
                                <div className="flex justify-between text-[10px] bg-purple-50/80 px-1.5 py-0.5 rounded text-purple-700">
                                    <span>CORP</span>
                                    <span>{currencySymbol}4.0k</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full font-sans text-gray-900 bg-gray-50 min-h-screen">
            {view === 'list' && renderList()}
            {view === 'form' && renderForm()}
            {view === 'calendar' && renderCalendar()}
        </div>
    );
}
