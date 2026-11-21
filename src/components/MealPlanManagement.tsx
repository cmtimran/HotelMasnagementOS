import { useState, useMemo, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Save, X, Utensils,
    DollarSign, Clock, FileText, Search, RefreshCw, AlertTriangle, CheckCircle2,
    Coffee, Pizza, Users, BedDouble, Sparkles
} from 'lucide-react';
import { generateUniqueShortCode, isShortCodeDuplicate } from '../utils/codeGenerator';
import { getApiBaseUrl, getActivePropertyId } from '../utils/apiUrl';
import { useActiveCurrency } from '../utils/currencyUtils';
import { broadcastPMSEvent } from '../utils/roomInventoryEngine';
import PageHeader from './common/PageHeader';
import { confirmModal } from '../context/ConfirmModalContext';
import { toast } from '../context/ToastContext';

interface MealPlan {
    id: number;
    name: string;
    marketingName: string;
    shortCode: string;
    description: string;
    status: 'Active' | 'Inactive';

    // Inclusions
    hasBreakfast: boolean;
    breakfastMenu: string;
    breakfastStyle: 'Buffet' | 'Set Menu' | 'Fixed Credit' | 'À la carte';
    breakfastVenue: string;
    breakfastCuisine: string;

    hasLunch: boolean;
    lunchMenu: string;
    lunchStyle: 'Buffet' | 'Set Menu' | 'Fixed Credit' | 'À la carte';
    lunchVenue: string;
    lunchCuisine: string;

    hasDinner: boolean;
    dinnerMenu: string;
    dinnerStyle: 'Buffet' | 'Set Menu' | 'Fixed Credit' | 'À la carte';
    dinnerVenue: string;
    dinnerCuisine: string;

    hasBrunch: boolean;
    brunchMenu: string;
    brunchStyle: 'Buffet' | 'Set Menu' | 'Fixed Credit' | 'À la carte';
    brunchVenue: string;
    brunchCuisine: string;

    hasCupole: boolean; 
    cupoleMenu: string;
    cupoleStyle: 'Buffet' | 'Set Menu' | 'Fixed Credit' | 'À la carte';
    cupoleVenue: string;
    cupoleCuisine: string;

    hasSnacks: boolean;
    snacksMenu: string;
    snacksStyle: 'Buffet' | 'Set Menu' | 'Fixed Credit' | 'À la carte';
    snacksVenue: string;
    snacksCuisine: string;
    
    // Global Default (Fallback)
    servingType: 'Buffet' | 'Set Menu' | 'Fixed Credit' | 'À la carte';

    // Pricing & 3-Pillar Unified Structure
    baseAdultsIncluded?: number;
    baseChildrenIncluded?: number;
    extraBedMealIncluded?: boolean;
    extraBedMealPrice?: number;

    internalCost: number;
    sellingPriceAdult: number;
    sellingPriceChild: number;
    infantMealsFree: boolean;
    maxInfantAge: number;
    postingFrequency: 'Daily' | 'One-time';
    revenueCode: string;
    taxInclusive: boolean;

    // Operations
    startTime: string;
    endTime: string;
    venue: string;
}

const MEAL_STORAGE_KEY = 'hotel_meal_plans_v1';

export const COURSE_DEFAULTS: Record<string, { adult: number; child: number; cost: number; label: string }> = {
    hasBreakfast: { adult: 450, child: 225, cost: 180, label: 'Breakfast' },
    hasLunch: { adult: 750, child: 375, cost: 300, label: 'Lunch' },
    hasDinner: { adult: 950, child: 475, cost: 380, label: 'Dinner' },
    hasBrunch: { adult: 600, child: 300, cost: 240, label: 'Brunch' },
    hasCupole: { adult: 800, child: 400, cost: 320, label: 'Cupole' },
    hasSnacks: { adult: 300, child: 150, cost: 120, label: 'Snacks' }
};

export const calculateDynamicMealPrice = (plan: Partial<MealPlan>) => {
    let adult = 0;
    let child = 0;
    let cost = 0;
    Object.entries(COURSE_DEFAULTS).forEach(([key, rates]) => {
        if (plan[key as keyof MealPlan]) {
            adult += rates.adult;
            child += rates.child;
            cost += rates.cost;
        }
    });
    return { adult, child, cost, extraBed: Math.round(adult * 0.8) };
};

export default function MealPlanManagement() {
    const { currencySymbol } = useActiveCurrency();
    const [view, setView] = useState<'list' | 'form'>('list');
    const [mealPlans, setMealPlans] = useState<MealPlan[]>(() => {
        try {
            const saved = localStorage.getItem(MEAL_STORAGE_KEY);
            if (saved) return JSON.parse(saved);
        } catch {
            // fallback
        }
        return [];
    });
    const [formData, setFormData] = useState<Partial<MealPlan>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('identity');
    const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);
    const [isCodeManual, setIsCodeManual] = useState(false);

    useEffect(() => {
        const propId = getActivePropertyId();
        fetch(`${getApiBaseUrl()}/api/rates/meal-plans?propertyId=${propId}`)
            .then(res => res.json())
            .then(json => {
                if (json.success && Array.isArray(json.data)) {
                    setMealPlans(json.data);
                    localStorage.setItem(MEAL_STORAGE_KEY, JSON.stringify(json.data));
                }
            })
            .catch(() => {});
    }, []);

    const existingCodes = useMemo(() => mealPlans.map(p => p.shortCode), [mealPlans]);

    const openCreate = () => {
        setIsCodeManual(false);
        setFormData({
            status: 'Active',
            servingType: 'Buffet',
            postingFrequency: 'Daily',
            taxInclusive: false,
            hasBreakfast: false,
            breakfastMenu: 'Standard Menu',
            breakfastStyle: 'Buffet',
            breakfastVenue: 'Main Restaurant',
            breakfastCuisine: 'Continental',
            hasLunch: false,
            lunchMenu: 'Standard Menu',
            lunchStyle: 'Buffet',
            lunchVenue: 'Main Restaurant',
            lunchCuisine: 'Continental',
            hasDinner: false,
            dinnerMenu: 'Standard Menu',
            dinnerStyle: 'Buffet',
            dinnerVenue: 'Main Restaurant',
            dinnerCuisine: 'Continental',
            hasBrunch: false,
            brunchMenu: '',
            brunchStyle: 'Buffet',
            brunchVenue: '',
            brunchCuisine: '',
            hasCupole: false,
            cupoleMenu: '',
            cupoleStyle: 'Buffet',
            cupoleVenue: '',
            cupoleCuisine: '',
            hasSnacks: false,
            snacksMenu: '',
            snacksStyle: 'Buffet',
            snacksVenue: '',
            snacksCuisine: '',
            infantMealsFree: true,
            maxInfantAge: 3,
            baseAdultsIncluded: 0,
            baseChildrenIncluded: 0,
            extraBedMealIncluded: false,
            extraBedMealPrice: 0,
            sellingPriceAdult: 0,
            sellingPriceChild: 0,
            internalCost: 0
        });
        setEditingPlan(null);
        setView('form');
    };

    const openEdit = (plan: MealPlan) => {
        setFormData({ ...plan });
        setEditingPlan(plan);
        setIsCodeManual(true);
        setView('form');
    };

    const handleNameChange = (name: string) => {
        const currentCode = editingPlan?.shortCode;
        let nextCode = formData.shortCode;
        if (!isCodeManual || !nextCode) {
            nextCode = generateUniqueShortCode(name, existingCodes, { currentCode, maxLength: 6 });
        }
        setFormData(prev => ({ ...prev, name, shortCode: nextCode }));
    };

    const persistMealPlans = (updated: MealPlan[]) => {
        setMealPlans(updated);
        try {
            localStorage.setItem(MEAL_STORAGE_KEY, JSON.stringify(updated));
        } catch {
            // fallback
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.shortCode) {
            toast.warning('Please provide Plan Name and Short Code.');
            return;
        }

        const currentCode = editingPlan?.shortCode;
        if (isShortCodeDuplicate(formData.shortCode, existingCodes, currentCode)) {
            toast.error(`Short Code "${formData.shortCode}" is already in use by another Meal Plan! Please use a unique code.`);
            return;
        }

        const API_BASE = getApiBaseUrl();
        let finalPlan: MealPlan;

        if (editingPlan) {
            finalPlan = { ...formData, id: editingPlan.id } as MealPlan;
            try {
                await fetch(`${API_BASE}/api/rates/meal-plans/${editingPlan.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(finalPlan)
                });
            } catch {}
            toast.success(`Meal Plan "${finalPlan.name}" updated!`);
        } else {
            finalPlan = { ...formData, id: Date.now() } as MealPlan;
            try {
                const res = await fetch(`${API_BASE}/api/rates/meal-plans`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(finalPlan)
                });
                const json = await res.json();
                if (json.success && json.data?.id) finalPlan.id = json.data.id;
            } catch {}
            toast.success(`Meal Plan "${finalPlan.name}" created!`);
        }

        let updated: MealPlan[];
        if (editingPlan) {
            updated = mealPlans.map(p => p.id === editingPlan.id ? finalPlan : p);
        } else {
            updated = [...mealPlans, finalPlan];
        }
        persistMealPlans(updated);
        try {
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}
        setView('list');
        setFormData({});
        setEditingPlan(null);
        setActiveTab('identity');
    };

    const handleDelete = async (id: number) => {
        const target = mealPlans.find(p => p.id === id);
        const name = target?.name || 'this meal plan';
        const confirmed = await confirmModal({
            title: `Delete Meal Plan "${name}"?`,
            message: 'Are you sure you want to delete this meal plan configuration? Future reservations will not be able to select this plan.',
            confirmText: 'Delete Plan',
            variant: 'danger'
        });
        if (!confirmed) return;

        try {
            await fetch(`${getApiBaseUrl()}/api/rates/meal-plans/${id}`, { method: 'DELETE' });
        } catch {}
        const updated = mealPlans.filter(p => p.id !== id);
        persistMealPlans(updated);
        try {
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
        } catch {}
        toast.success(`Meal Plan "${name}" deleted.`);
    };

    const toggleInclusion = (field: keyof MealPlan) => {
        const nextVal = !formData[field];
        const next = { ...formData, [field]: nextVal };
        const calc = calculateDynamicMealPrice(next);
        next.sellingPriceAdult = calc.adult;
        next.sellingPriceChild = calc.child;
        next.internalCost = calc.cost;
        if (next.extraBedMealIncluded) {
            next.extraBedMealPrice = calc.extraBed;
        }
        setFormData(next);
    };

    const filteredMealPlans = mealPlans.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.shortCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.marketingName && p.marketingName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const activeCount = mealPlans.filter(p => p.status === 'Active').length;
    const breakfastCount = mealPlans.filter(p => p.hasBreakfast).length;
    const fullBoardCount = mealPlans.filter(p => p.hasBreakfast && p.hasLunch && p.hasDinner).length;

    const renderList = () => (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <PageHeader
                title="Meal Plan Master Data"
                subtitle="Configure standardized catering boards, guest inclusions, serving styles, and revenue accounting ledgers."
                icon={<Utensils className="size-6 text-primary" />}
                actions={
                    <button
                        onClick={openCreate}
                        className="btn-primary"
                    >
                        <Plus className="size-4 mr-1.5" />
                        Create Meal Plan
                    </button>
                }
            />

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Total Plans</span>
                        <div className="size-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                            <Utensils className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">{mealPlans.length}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-1">Configured templates</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Active Board Plans</span>
                        <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <CheckCircle2 className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">{activeCount}</div>
                    <div className="text-[11px] text-emerald-600 font-semibold mt-1">Available for rate packages</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Breakfast Boards</span>
                        <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Coffee className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">{breakfastCount}</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-1">Include morning buffet/set</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Full Board (AP)</span>
                        <div className="size-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Pizza className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 tracking-tight">{fullBoardCount}</div>
                    <div className="text-[11px] text-indigo-600 font-semibold mt-1">All 3 daily courses included</div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                    <input
                        type="text"
                        placeholder="Search meal plans, short code, menu..."
                        className="input-standard pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <span className="text-xs text-slate-500 font-medium">
                        Showing <strong className="text-slate-800">{filteredMealPlans.length}</strong> of {mealPlans.length}
                    </span>
                </div>
            </div>

            {/* Table Container */}
            <div className="table-container">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="py-3.5 px-4">Identity & Code</th>
                            <th className="py-3.5 px-4">Inclusions</th>
                            <th className="py-3.5 px-4">Menu & Catering Details</th>
                            <th className="py-3.5 px-4 text-right">Selling Price</th>
                            <th className="py-3.5 px-4 text-center">Status</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        {filteredMealPlans.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                    <Utensils className="size-8 mx-auto mb-2 text-slate-300" />
                                    No meal plans match your search query.
                                </td>
                            </tr>
                        ) : (
                            filteredMealPlans.map(plan => (
                                <tr key={plan.id} className="hover:bg-slate-50/70 transition">
                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-900 text-sm">{plan.name}</span>
                                            <span className="badge-code">{plan.shortCode}</span>
                                        </div>
                                        {plan.marketingName && (
                                            <div className="text-[11px] text-slate-500 mt-0.5">{plan.marketingName}</div>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="flex flex-wrap gap-1">
                                            {plan.hasBreakfast && <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 rounded-md text-[10px] font-semibold">Breakfast</span>}
                                            {plan.hasLunch && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded-md text-[10px] font-semibold">Lunch</span>}
                                            {plan.hasDinner && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200/80 rounded-md text-[10px] font-semibold">Dinner</span>}
                                            {plan.hasBrunch && <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200/80 rounded-md text-[10px] font-semibold">Brunch</span>}
                                            {plan.hasCupole && <span className="px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200/80 rounded-md text-[10px] font-semibold">Cupole</span>}
                                            {plan.hasSnacks && <span className="px-2 py-0.5 bg-orange-50 text-orange-800 border border-orange-200/80 rounded-md text-[10px] font-semibold">Snacks</span>}
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="space-y-1">
                                            {plan.hasBreakfast && (
                                                <div className="text-[11px] flex items-center gap-1.5 text-slate-600">
                                                    <span className="size-1.5 rounded-full bg-amber-500" />
                                                    <span className="font-medium text-slate-800">{plan.breakfastMenu || 'Continental'}</span>
                                                    <span className="text-slate-400">({plan.breakfastStyle})</span>
                                                </div>
                                            )}
                                            {plan.hasLunch && (
                                                <div className="text-[11px] flex items-center gap-1.5 text-slate-600">
                                                    <span className="size-1.5 rounded-full bg-emerald-500" />
                                                    <span className="font-medium text-slate-800">{plan.lunchMenu || 'Buffet'}</span>
                                                    <span className="text-slate-400">({plan.lunchStyle})</span>
                                                </div>
                                            )}
                                            {plan.hasDinner && (
                                                <div className="text-[11px] flex items-center gap-1.5 text-slate-600">
                                                    <span className="size-1.5 rounded-full bg-indigo-500" />
                                                    <span className="font-medium text-slate-800">{plan.dinnerMenu || 'Gala Buffet'}</span>
                                                    <span className="text-slate-400">({plan.dinnerStyle})</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <div className="font-mono text-slate-900 text-sm">{currencySymbol}{plan.sellingPriceAdult} <span className="text-slate-400 text-xs font-normal">/ {currencySymbol}{plan.sellingPriceChild}</span></div>
                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{plan.revenueCode}</div>
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                        <span className={plan.status === 'Active' ? 'badge-status-active' : 'badge-status-inactive'}>
                                            {plan.status}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button 
                                                onClick={() => openEdit(plan)}
                                                className="btn-icon"
                                                title="Edit Meal Plan"
                                            >
                                                <Edit2 className="size-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(plan.id)}
                                                className="btn-icon-danger"
                                                title="Delete Meal Plan"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderForm = () => (
        <div className="min-h-screen bg-[#fafafc] flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-slate-200/90 px-6 py-4 sticky top-0 z-20 shadow-2xs">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setView('list')} className="btn-secondary p-2">
                            <X className="size-4 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl text-slate-900">
                                {formData.id ? 'Edit Meal Plan' : 'Create New Meal Plan'}
                            </h1>
                            <p className="text-xs text-slate-500">Configure catering inclusions, meal periods, and revenue ledger codes</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <button onClick={() => setView('list')} className="btn-secondary">
                            Cancel
                        </button>
                        <button onClick={handleSave} className="btn-primary">
                            <Save className="size-4 mr-1.5" />
                            Save Meal Plan
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-slate-200/90 sticky top-[69px] z-10 shadow-2xs">
                <div className="max-w-5xl mx-auto flex px-4">
                    {[
                        { id: 'identity', label: 'Identity & Overview', icon: <FileText className="size-4" /> },
                        { id: 'inclusions', label: 'Meal Inclusions', icon: <Utensils className="size-4" /> },
                        { id: 'pricing', label: 'Pricing & Ledgers', icon: <DollarSign className="size-4" /> },
                        { id: 'operations', label: 'Service Operations', icon: <Clock className="size-4" /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3.5 text-xs font-semibold border-b-2 transition ${
                                activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">

                {/* 1. Identity */}
                {activeTab === 'identity' && (
                    <div className="card-container p-6 space-y-6">
                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                            <FileText className="size-5 text-primary" />
                            <h3 className="text-sm text-slate-900">Plan Identity & Codes</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Plan Name <span className="text-rose-500">*</span></label>
                                <input
                                    type="text"
                                    className="input-standard"
                                    placeholder="e.g. Continental Plan (CP)"
                                    value={formData.name || ''}
                                    onChange={e => handleNameChange(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Marketing Name</label>
                                <input
                                    type="text"
                                    className="input-standard"
                                    placeholder="e.g. Daily Buffet Breakfast"
                                    value={formData.marketingName || ''}
                                    onChange={e => setFormData({ ...formData, marketingName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-semibold text-slate-700">Short Code <span className="text-rose-500">*</span></label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const auto = generateUniqueShortCode(formData.name || '', existingCodes, {
                                                currentCode: editingPlan?.shortCode,
                                                maxLength: 6
                                            });
                                            setFormData(prev => ({ ...prev, shortCode: auto }));
                                            setIsCodeManual(false);
                                        }}
                                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                                    >
                                        <RefreshCw className="size-3" /> Auto-Generate
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className={`input-standard font-mono uppercase pr-8 ${
                                            isShortCodeDuplicate(formData.shortCode || '', existingCodes, editingPlan?.shortCode)
                                                ? 'border-rose-400 bg-rose-50/50 text-rose-700'
                                                : ''
                                        }`}
                                        placeholder="e.g. CP"
                                        value={formData.shortCode || ''}
                                        onChange={e => {
                                            setIsCodeManual(true);
                                            setFormData({ ...formData, shortCode: e.target.value.toUpperCase() });
                                        }}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {isShortCodeDuplicate(formData.shortCode || '', existingCodes, editingPlan?.shortCode) ? (
                                            <AlertTriangle className="size-4 text-rose-500" />
                                        ) : formData.shortCode ? (
                                            <CheckCircle2 className="size-4 text-emerald-500" />
                                        ) : null}
                                    </div>
                                </div>
                                {isShortCodeDuplicate(formData.shortCode || '', existingCodes, editingPlan?.shortCode) && (
                                    <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
                                        <AlertTriangle className="size-3" /> Short Code already in use! Must be unique.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Status <span className="text-rose-500">*</span></label>
                                <select
                                    className="select-standard"
                                    value={formData.status || 'Active'}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Description</label>
                                <textarea
                                    className="input-standard h-24 resize-none py-2"
                                    placeholder="Detailed description shown to guest on booking engine..."
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Inclusions */}
                {activeTab === 'inclusions' && (
                    <div className="card-container p-6 space-y-6">
                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                            <Utensils className="size-5 text-primary" />
                            <div>
                                <h3 className="text-sm text-slate-900">Meal Courses & Outlets</h3>
                                <p className="text-xs text-slate-500">Enable courses and select designated restaurant venues</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { key: 'hasBreakfast', menuKey: 'breakfastMenu', styleKey: 'breakfastStyle', venueKey: 'breakfastVenue', cuisineKey: 'breakfastCuisine', label: 'Breakfast', icon: '🍳' },
                                { key: 'hasLunch', menuKey: 'lunchMenu', styleKey: 'lunchStyle', venueKey: 'lunchVenue', cuisineKey: 'lunchCuisine', label: 'Lunch', icon: '🥗' },
                                { key: 'hasDinner', menuKey: 'dinnerMenu', styleKey: 'dinnerStyle', venueKey: 'dinnerVenue', cuisineKey: 'dinnerCuisine', label: 'Dinner', icon: '🍽️' },
                                { key: 'hasBrunch', menuKey: 'brunchMenu', styleKey: 'brunchStyle', venueKey: 'brunchVenue', cuisineKey: 'brunchCuisine', label: 'Brunch', icon: '🥪' },
                                { key: 'hasCupole', menuKey: 'cupoleMenu', styleKey: 'cupoleStyle', venueKey: 'cupoleVenue', cuisineKey: 'cupoleCuisine', label: 'Cupole', icon: '🕯️' },
                                { key: 'hasSnacks', menuKey: 'snacksMenu', styleKey: 'snacksStyle', venueKey: 'snacksVenue', cuisineKey: 'snacksCuisine', label: 'Snacks', icon: '🍪' },
                            ].map((item) => (
                                <div key={item.key} className="space-y-3">
                                    <label className={`flex items-center gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${
                                        formData[item.key as keyof MealPlan]
                                            ? 'bg-primary-subtle/50 border-primary shadow-2xs'
                                            : 'bg-white border-slate-200/90 hover:border-slate-300'
                                    }`}>
                                        <input
                                            type="checkbox"
                                            className="size-4 text-primary rounded border-slate-300 focus:ring-primary"
                                            checked={!!formData[item.key as keyof MealPlan]}
                                            onChange={() => toggleInclusion(item.key as keyof MealPlan)}
                                        />
                                        <span className={`text-xs flex items-center gap-1.5 ${
                                            formData[item.key as keyof MealPlan] ? 'text-primary' : 'text-slate-700'
                                        }`}>
                                            <span>{item.icon}</span> {item.label}
                                        </span>
                                    </label>

                                    {formData[item.key as keyof MealPlan] && (
                                        <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Venue</label>
                                                    <select
                                                        className="select-standard text-xs py-1.5"
                                                        value={formData[item.venueKey as keyof MealPlan] as string || ''}
                                                        onChange={e => setFormData({ ...formData, [item.venueKey]: e.target.value })}
                                                    >
                                                        <option value="">Select Venue...</option>
                                                        <option value="Main Restaurant">Main Restaurant</option>
                                                        <option value="The Atrium Cafe">The Atrium Cafe</option>
                                                        <option value="Poolside Grill">Poolside Grill</option>
                                                        <option value="Executive Lounge">Executive Lounge</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Cuisine</label>
                                                    <select
                                                        className="select-standard text-xs py-1.5"
                                                        value={formData[item.cuisineKey as keyof MealPlan] as string || ''}
                                                        onChange={e => setFormData({ ...formData, [item.cuisineKey]: e.target.value })}
                                                    >
                                                        <option value="">Select Cuisine...</option>
                                                        <option value="Continental">Continental</option>
                                                        <option value="Bengali">Bengali</option>
                                                        <option value="Pan-Asian">Pan-Asian</option>
                                                        <option value="Italian">Italian</option>
                                                        <option value="Multi-cuisine">Multi-cuisine</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Menu</label>
                                                    <select
                                                        className="select-standard text-xs py-1.5"
                                                        value={formData[item.menuKey as keyof MealPlan] as string || ''}
                                                        onChange={e => setFormData({ ...formData, [item.menuKey]: e.target.value })}
                                                    >
                                                        <option value="">Select Menu...</option>
                                                        <option value="Standard Buffet">Standard Buffet</option>
                                                        <option value="Menu A - Intl">Menu A - Intl</option>
                                                        <option value="Menu B - Local">Menu B - Local</option>
                                                        <option value="Chef Signature">Chef Signature</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-slate-500 uppercase tracking-wider">Serving</label>
                                                    <select
                                                        className="select-standard text-xs py-1.5"
                                                        value={formData[item.styleKey as keyof MealPlan] as string || 'Buffet'}
                                                        onChange={e => setFormData({ ...formData, [item.styleKey]: e.target.value as any })}
                                                    >
                                                        <option value="Buffet">Buffet</option>
                                                        <option value="Set Menu">Set Menu</option>
                                                        <option value="À la carte">A La Carte</option>
                                                        <option value="Fixed Credit">Fixed Credit</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. Pricing */}
                {activeTab === 'pricing' && (
                    <div className="card-container p-6 space-y-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <DollarSign className="size-5 text-primary" />
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">3-Pillar Board Pricing & Surcharges</h3>
                                    <p className="text-xs text-slate-500">Occupancy covers, extra bedding meal policies, and ledger surcharges</p>
                                </div>
                            </div>
                            <span className="badge-code">Ledger Sync</span>
                        </div>

                        {/* Pillar 1: Occupancy & Covers Allowance */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Users className="size-4 text-primary" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Pillar 1: Occupancy & Covers Allowance</h4>
                                    <p className="text-[11px] text-slate-500">Base guest meal allowances covered under this board plan</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-slate-700">Base Adults Covered</label>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-primary-subtle text-primary border border-primary-border">
                                            {formData.baseAdultsIncluded === 0 ? '⚡ Dynamic: Matches Room' : `${formData.baseAdultsIncluded} Adults`}
                                        </span>
                                    </div>
                                    <select 
                                        className="select-standard bg-white" 
                                        value={formData.baseAdultsIncluded === 0 ? 'dynamic' : String(formData.baseAdultsIncluded || 2)} 
                                        onChange={e => {
                                            const val = e.target.value === 'dynamic' ? 0 : parseInt(e.target.value, 10);
                                            setFormData({ ...formData, baseAdultsIncluded: val });
                                        }}
                                    >
                                        <option value="dynamic">⚡ Dynamic (Inherit from Reserved Room Type)</option>
                                        <option value="1">Fixed: 1 Adult Covered</option>
                                        <option value="2">Fixed: 2 Adults Covered</option>
                                        <option value="3">Fixed: 3 Adults Covered</option>
                                        <option value="4">Fixed: 4 Adults Covered</option>
                                    </select>
                                    <p className="text-[11px] text-slate-400">
                                        {formData.baseAdultsIncluded === 0 
                                            ? 'Automatically scales meal covers to match the reserved room category' 
                                            : 'Fixed adult guest meals bundled in base tariff'}
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Base Children Covered</label>
                                    <input 
                                        type="number" 
                                        className="input-standard bg-white" 
                                        value={formData.baseChildrenIncluded ?? 0} 
                                        onChange={e => setFormData({ ...formData, baseChildrenIncluded: parseInt(e.target.value) || 0 })} 
                                    />
                                    <p className="text-[11px] text-slate-400">Children meals bundled without extra charge</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Infant Policy</label>
                                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="size-4 rounded text-primary" 
                                                checked={formData.infantMealsFree !== false} 
                                                onChange={e => setFormData({ ...formData, infantMealsFree: e.target.checked })} 
                                            />
                                            <span className="text-xs text-slate-700 font-semibold">Free Meals</span>
                                        </label>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[11px] text-slate-500">Up to</span>
                                            <input 
                                                type="number" 
                                                className="w-10 px-1 py-0.5 border border-slate-200 rounded text-xs text-center font-bold" 
                                                value={formData.maxInfantAge || 3} 
                                                onChange={e => setFormData({ ...formData, maxInfantAge: parseInt(e.target.value) || 3 })} 
                                            />
                                            <span className="text-[11px] text-slate-500">yrs</span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-slate-400">Complimentary baby food / infant buffet</p>
                                </div>
                            </div>
                        </div>

                        {/* Pillar 2: Extra Bedding Meal Policy */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <BedDouble className="size-4 text-primary" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Pillar 2: Extra Bedding Meal Policy</h4>
                                    <p className="text-[11px] text-slate-500">Catering entitlement when guests book a physical rollaway bed</p>
                                </div>
                            </div>
                            <div className="p-4 bg-primary-subtle/30 rounded-2xl border border-primary-border/40 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            id="extraBedMealIncluded"
                                            className="size-4 rounded text-primary" 
                                            checked={formData.extraBedMealIncluded || false} 
                                            onChange={e => setFormData({ ...formData, extraBedMealIncluded: e.target.checked })} 
                                        />
                                        <label htmlFor="extraBedMealIncluded" className="text-xs font-bold text-slate-800 cursor-pointer">
                                            Include Meals for Rollaway Extra Bed?
                                        </label>
                                    </div>
                                    <p className="text-[11px] text-slate-500 pl-6">
                                        If enabled, guests utilizing an extra bed automatically receive this meal plan without additional F&B billing.
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-slate-700">
                                            Extra Bed Meal Supplement ({currencySymbol})
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const calc = calculateDynamicMealPrice(formData);
                                                setFormData({ ...formData, extraBedMealPrice: calc.extraBed });
                                            }}
                                            className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1"
                                        >
                                            <Sparkles className="size-3" /> Auto (80%)
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencySymbol}</span>
                                        <input 
                                            type="number" 
                                            className="input-standard pl-8 font-mono font-bold bg-white" 
                                            placeholder="0" 
                                            value={formData.extraBedMealPrice ?? 0} 
                                            onChange={e => setFormData({ ...formData, extraBedMealPrice: parseFloat(e.target.value) || 0 })} 
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400">Nightly meal surcharge for the extra bed occupant</p>
                                </div>
                            </div>
                        </div>

                        {/* Pillar 3: Base Pricing & Ledger Surcharges */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <DollarSign className="size-4 text-primary" />
                                <div>
                                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Pillar 3: Base Pricing & Ledger Surcharges</h4>
                                    <p className="text-[11px] text-slate-500">A-la-carte meal pricing, internal F&B costing, and folio ledger posting</p>
                                </div>
                            </div>

                            {/* Dynamic Live Course Pricing Banner */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-primary-subtle/40 rounded-xl border border-primary-border/60">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="size-4 text-primary shrink-0" />
                                    <div>
                                        <span className="text-xs font-bold text-slate-800 block">⚡ Dynamic Course-Based Pricing</span>
                                        <span className="text-[11px] text-slate-600">
                                            Active inclusions: {[
                                                formData.hasBreakfast && 'Breakfast',
                                                formData.hasLunch && 'Lunch',
                                                formData.hasDinner && 'Dinner',
                                                formData.hasBrunch && 'Brunch',
                                                formData.hasCupole && 'Cupole',
                                                formData.hasSnacks && 'Snacks'
                                            ].filter(Boolean).join(' + ') || 'None selected'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const calc = calculateDynamicMealPrice(formData);
                                        setFormData({
                                            ...formData,
                                            sellingPriceAdult: calc.adult,
                                            sellingPriceChild: calc.child,
                                            internalCost: calc.cost,
                                            extraBedMealPrice: formData.extraBedMealIncluded ? calc.extraBed : 0
                                        });
                                        toast.success('Prices dynamically synchronized with active meal courses.');
                                    }}
                                    className="px-2.5 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                                >
                                    <RefreshCw className="size-3" /> Sync Dynamic Prices
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Selling Price Adult ({currencySymbol})</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencySymbol}</span>
                                        <input 
                                            type="number" 
                                            className="input-standard pl-8 font-mono font-bold" 
                                            value={formData.sellingPriceAdult || ''} 
                                            onChange={e => setFormData({ ...formData, sellingPriceAdult: parseFloat(e.target.value) || 0 })} 
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400">Per additional adult per meal cycle</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Selling Price Child ({currencySymbol})</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencySymbol}</span>
                                        <input 
                                            type="number" 
                                            className="input-standard pl-8 font-mono font-bold" 
                                            value={formData.sellingPriceChild || ''} 
                                            onChange={e => setFormData({ ...formData, sellingPriceChild: parseFloat(e.target.value) || 0 })} 
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400">Per additional child per meal cycle</p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Internal Cost / Unit ({currencySymbol})</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-slate-400 font-bold">{currencySymbol}</span>
                                        <input 
                                            type="number" 
                                            className="input-standard pl-8" 
                                            placeholder="0.00" 
                                            value={formData.internalCost || ''} 
                                            onChange={e => setFormData({ ...formData, internalCost: parseFloat(e.target.value) || 0 })} 
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400">F&B food cost (calculates kitchen GOP)</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Posting Frequency</label>
                                    <select 
                                        className="select-standard" 
                                        value={formData.postingFrequency || 'Daily'} 
                                        onChange={e => setFormData({ ...formData, postingFrequency: e.target.value as any })}
                                    >
                                        <option value="Daily">Night Audit (Daily Posting)</option>
                                        <option value="One-time">Check-in (Once per Stay)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Revenue Ledger Code</label>
                                    <select
                                        className="select-standard font-mono"
                                        value={formData.revenueCode || ''}
                                        onChange={e => setFormData({ ...formData, revenueCode: e.target.value })}
                                    >
                                        <option value="">Select Revenue Ledger...</option>
                                        <option value="REV-FB-BRK">REV-FB-BRK (Breakfast Revenue)</option>
                                        <option value="REV-FB-LUN">REV-FB-LUN (Lunch Revenue) </option>
                                        <option value="REV-FB-DIN">REV-FB-DIN (Dinner Revenue)</option>
                                        <option value="REV-FB-SNC">REV-FB-SNC (Snack/Mini Revenue)</option>
                                        <option value="REV-FB-MAP">REV-FB-MAP (Meal Inclusion/Half-Board)</option>
                                        <option value="REV-FB-AP">REV-FB-AP (Meal Inclusion/Full-Board)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="mealTaxInclusive"
                                    className="size-4 mt-0.5 text-amber-600 rounded border-amber-300"
                                    checked={formData.taxInclusive || false}
                                    onChange={e => setFormData({ ...formData, taxInclusive: e.target.checked })}
                                />
                                <div className="text-xs">
                                    <label htmlFor="mealTaxInclusive" className="text-amber-900 font-semibold block cursor-pointer">Selling Price is Tax Inclusive</label>
                                    <span className="text-amber-800">If checked, taxes and service charges are included in the tariff. If unchecked, the guest folio will be assessed supplemental VAT/SC.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Operations */}
                {activeTab === 'operations' && (
                    <div className="card-container p-6 space-y-6">
                        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                            <Clock className="size-5 text-primary" />
                            <div>
                                <h3 className="text-sm text-slate-900">Service Hours & POS/KDS Sync</h3>
                                <p className="text-xs text-slate-500">Operational service schedule and kitchen display system routing</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Service Start Time</label>
                                    <input
                                        type="time"
                                        className="input-standard"
                                        value={formData.startTime || ''}
                                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Service End Time</label>
                                    <input
                                        type="time"
                                        className="input-standard"
                                        value={formData.endTime || ''}
                                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Primary Restaurant Outlet</label>
                                    <select
                                        className="select-standard"
                                        value={formData.venue || ''}
                                        onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                    >
                                        <option value="">Select Outlet...</option>
                                        <option value="Main Restaurant">The Cove (Main Restaurant)</option>
                                        <option value="Poolside Grill">Blue Wave (Poolside Grill)</option>
                                        <option value="The Atrium Cafe">The Atrium Cafe</option>
                                        <option value="Executive Lounge">Executive Club Lounge</option>
                                        <option value="In-Room Dining">In-Room Dining (Room Service)</option>
                                    </select>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <div className="size-2 rounded-full bg-emerald-500" />
                                        <span className="text-[11px] text-slate-800 uppercase tracking-wider font-mono">Kitchen Display System (KDS)</span>
                                    </div>
                                    <p className="text-xs text-slate-500">This plan will be broadcasted to kitchen dispatch screens during active meal service hours.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return view === 'list' ? renderList() : renderForm();
} 