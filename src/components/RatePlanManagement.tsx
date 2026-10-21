import React, { useState } from 'react';
import {
    Plus, Edit2, Trash2, Save, X, Calendar, DollarSign,
    Shield, Percent, Star, Calendar as CalendarIcon,
    TrendingUp, AlertCircle, Layers, Coffee, Utensils,
    Moon, Sun, MapPin, Clock, FileText, Search
} from 'lucide-react';

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
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SAMPLE_PACKAGES_L2 = [
    { id: 1, name: 'Honeymoon Delight', code: 'HONEY' },
    { id: 2, name: 'Family Adventure', code: 'FAMADV' },
    { id: 3, name: 'Corporate Executive', code: 'BIZEXEC' },
    { id: 4, name: 'Wellness & Spa Retreat', code: 'SPA-REL' }
];

export default function RatePlanManagement() {
    const [view, setView] = useState<'list' | 'form' | 'calendar'>('list');
    const [ratePlans, setRatePlans] = useState<RatePlan[]>(() => {
        try {
            const saved = localStorage.getItem('hotel_rate_plans_v1');
            if (saved) return JSON.parse(saved);
        } catch {
            // fallback
        }
        return [
        {
            id: 1,
            name: 'Best Available Rate (BAR)',
            shortCode: 'BAR-01',
            marketSegment: 'FIT / Direct',
            currency: 'BDT',
            description: 'Standard flexible rate for all direct bookings. No advance payment required.',
            status: 'Active',
            mealPlan: 'EP',
            taxIncluded: false,
            policies: {
                depositRequired: false,
                depositAmount: 0,
                depositType: 'Percentage',
                cancellationType: 'Flexible',
                cancellationDeadline: 24,
                refundPercentage: 100
            },
            activationDate: '2024-01-01',
            expirationDate: '2025-12-31',
            isSeasonal: false,
            validDays: DAYS_OF_WEEK,
            minNights: 1,
            cutOffDays: 0,
            closedToArrival: false,
            closedToDeparture: false,
            stopSell: false,
            pricing: [
                { roomTypeId: 'Deluxe Suite', structure: 'Flat', operatingCost: 4500, baseRate: 14500, doubleRate: 14500, tripleRate: 18000, extraAdult: 3500, extraChild: 1500, baseOccupancy: 2, maxOccupancy: 3 }
            ]
        },
        {
            id: 2,
            name: 'Corporate Negotiated (Standard)',
            shortCode: 'CORP-A1',
            marketSegment: 'Corporate',
            currency: 'BDT',
            description: 'Negotiated flat rate for Tier-1 Corporate partners. Priority check-in included.',
            status: 'Active',
            mealPlan: 'CP',
            packageId: 3, // Linked to Corporate Executive
            taxIncluded: true,
            policies: {
                depositRequired: true,
                depositAmount: 0,
                depositType: 'Fixed',
                cancellationType: 'Moderate',
                cancellationDeadline: 48,
                refundPercentage: 100
            },
            activationDate: '2024-01-01',
            expirationDate: '2025-12-31',
            isSeasonal: false,
            validDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            minNights: 1,
            cutOffDays: 0,
            closedToArrival: false,
            closedToDeparture: false,
            stopSell: false,
            pricing: [
                { roomTypeId: 'Premium King', structure: 'Flat', operatingCost: 3800, baseRate: 11000, doubleRate: 11000, tripleRate: 14000, extraAdult: 2500, extraChild: 1000, baseOccupancy: 2, maxOccupancy: 3 }
            ]
        },
        {
            id: 3,
            name: 'Honeymoon Bliss Experience',
            shortCode: 'HON-PKG',
            marketSegment: 'Promotional',
            currency: 'BDT',
            description: 'Premium romantic getaway including flower bed decoration and candlelight dinner.',
            status: 'Active',
            mealPlan: 'MAP',
            packageId: 1, // Linked to Honeymoon Delight
            taxIncluded: false,
            policies: {
                depositRequired: true,
                depositAmount: 50,
                depositType: 'Percentage',
                cancellationType: 'Strict',
                cancellationDeadline: 72,
                refundPercentage: 50
            },
            activationDate: '2024-02-01',
            expirationDate: '2025-06-30',
            isSeasonal: true,
            seasonName: 'Summer Season',
            validDays: DAYS_OF_WEEK,
            minNights: 2,
            cutOffDays: 48,
            closedToArrival: false,
            closedToDeparture: false,
            stopSell: false,
            pricing: [
                { roomTypeId: 'Junior Suite', structure: 'Flat', operatingCost: 5500, baseRate: 18500, doubleRate: 18500, tripleRate: 22000, extraAdult: 4500, extraChild: 2000, baseOccupancy: 2, maxOccupancy: 3 }
            ]
        },
        {
            id: 4,
            name: 'Long Stay Weekly (7+ Nights)',
            shortCode: 'LSTAY-7',
            marketSegment: 'Wholesale',
            currency: 'BDT',
            description: 'Heavy discount for stays of 7 days or more. Housekeeping every 2nd day.',
            status: 'Active',
            mealPlan: 'EP',
            taxIncluded: true,
            policies: {
                depositRequired: true,
                depositAmount: 100,
                depositType: 'Fixed',
                cancellationType: 'Non-Refundable',
                cancellationDeadline: 0,
                refundPercentage: 0
            },
            activationDate: '2024-01-01',
            expirationDate: '2025-12-31',
            isSeasonal: false,
            validDays: DAYS_OF_WEEK,
            minNights: 7,
            cutOffDays: 24,
            closedToArrival: false,
            closedToDeparture: false,
            stopSell: false,
            pricing: [
                { roomTypeId: 'Standard Room', structure: 'Flat', operatingCost: 2500, baseRate: 8500, doubleRate: 8500, tripleRate: 10500, extraAdult: 2000, extraChild: 1000, baseOccupancy: 2, maxOccupancy: 2 }
            ]
        }
        ];
    });
    const [formData, setFormData] = useState<Partial<RatePlan>>({});
    const [activeTab, setActiveTab] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingPlan, setEditingPlan] = useState<RatePlan | null>(null);

    const toggleDay = (day: string) => {
        const currentDays = formData.validDays || [];
        if (currentDays.includes(day)) {
            setFormData({ ...formData, validDays: currentDays.filter((d: string) => d !== day) });
        } else {
            setFormData({ ...formData, validDays: [...currentDays, day] });
        }
    };

    const openCreate = () => {
        setFormData({
            status: 'Active',
            currency: 'BDT',
            validDays: DAYS_OF_WEEK,
            mealPlan: 'EP',
            policies: {
                depositRequired: false,
                depositAmount: 0,
                depositType: 'Percentage',
                cancellationType: 'Flexible',
                cancellationDeadline: 24,
                refundPercentage: 100
            },
            activationDate: new Date().toISOString().split('T')[0],
            expirationDate: '2025-12-31',
            minNights: 1,
            cutOffDays: 0,
            taxIncluded: false,
            isSeasonal: false,
            closedToArrival: false,
            closedToDeparture: false,
            stopSell: false,
            pricing: [{ roomTypeId: 'New Room Category', structure: 'Flat', operatingCost: 0, baseRate: 0, doubleRate: 0, tripleRate: 0, extraAdult: 0, extraChild: 0, baseOccupancy: 2, maxOccupancy: 3 }]
        });
        setEditingPlan(null);
        setView('form');
        setActiveTab(1);
    };

    const openEdit = (plan: RatePlan) => {
        setFormData({ ...plan });
        setEditingPlan(plan);
        setView('form');
        setActiveTab(1);
    };

    const persistRatePlans = (updated: RatePlan[]) => {
        setRatePlans(updated);
        try {
            localStorage.setItem('hotel_rate_plans_v1', JSON.stringify(updated));
        } catch {
            // fallback
        }
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Are you sure you want to delete this rate plan?')) {
            const updated = ratePlans.filter(p => p.id !== id);
            persistRatePlans(updated);
        }
    };

    const handleSave = () => {
        if (formData.name && formData.shortCode) {
            const finalData = { ...formData, id: editingPlan?.id || Date.now() } as RatePlan;
            let updated: RatePlan[];
            if (editingPlan) {
                updated = ratePlans.map((p: RatePlan) => p.id === editingPlan.id ? finalData : p);
            } else {
                updated = [...ratePlans, finalData];
            }
            persistRatePlans(updated);
            setView('list');
            setFormData({});
            setEditingPlan(null);
        }
    };

    const renderList = () => (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Rate Plan Management</h1>
                    <p className="text-xs sm:text-sm text-gray-500">Define selling strategies, yield rules, and inventory fencings</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search rate plans..."
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-56 sm:w-64 transition-all shadow-2xs"
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setView('calendar')} className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-xs transition-all shadow-2xs cursor-pointer">
                            <CalendarIcon size={15} /> Yield Console
                        </button>
                        <button onClick={openCreate} className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-xs transition-all shadow-xs cursor-pointer">
                            <Plus size={15} /> Define New Plan
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[960px]">
                        <thead className="bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600">
                            <tr>
                                <th className="px-6 py-3.5">Identity & Segment</th>
                                <th className="px-6 py-3.5">Meal Plan</th>
                                <th className="px-6 py-3.5">Policies</th>
                                <th className="px-6 py-3.5">Fencings</th>
                                <th className="px-6 py-3.5 text-right">Pricing (Base)</th>
                                <th className="px-6 py-3.5 text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-600">
                            {ratePlans
                                .filter((plan: RatePlan) => plan.name.toLowerCase().includes(searchQuery.toLowerCase()) || plan.shortCode.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map((plan: RatePlan) => (
                                <tr key={plan.id} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{plan.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-bold">{plan.shortCode}</span>
                                            <span className="text-[10px] text-blue-700 font-bold uppercase tracking-tight">{plan.marketSegment}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Coffee size={14} className="text-amber-500" />
                                            <span className="font-semibold text-gray-800">{plan.mealPlan}</span>
                                        </div>
                                        {plan.packageId && <div className="text-[10px] text-indigo-600 font-semibold mt-1 inline-flex items-center gap-1"><Layers size={10}/> Package Linked</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${plan.policies.cancellationType === 'Non-Refundable' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                                {plan.policies.cancellationType}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <div className="text-[10.5px] flex items-center gap-1.5 font-medium text-gray-700"><Clock size={12} className="text-gray-400"/> Min {plan.minNights} N</div>
                                            {plan.stopSell && <div className="text-[11px] text-red-600 font-black flex items-center gap-1"><AlertCircle size={12}/> STOP SELL</div>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="font-bold text-gray-900 font-mono">৳{plan.pricing[0]?.baseRate.toLocaleString()}</div>
                                        <div className="text-[10px] text-gray-400 font-medium">Exc. Tax</div>
                                    </td>
                                    <td className="px-6 py-4 text-right pr-6 space-x-1.5">
                                        <button onClick={() => openEdit(plan)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" title="Edit Plan"><Edit2 size={15} /></button>
                                        <button onClick={() => handleDelete(plan.id)} className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" title="Delete Plan"><Trash2 size={15} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderForm = () => (
        <div className="h-full flex flex-col bg-gray-50 min-h-screen">
            <div className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-6">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500 transition-all">
                        <X size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 uppercase tracking-tight">
                            {editingPlan ? `Edit Rate Plan: ${editingPlan.shortCode}` : 'Define New Strategy'}
                        </h1>
                        <p className="text-xs text-gray-500">Configure inclusions, validity, pricing, and yield fences</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setView('list')} className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 rounded-lg font-bold text-xs uppercase transition-all">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-all shadow-md text-sm">
                        <Save size={18} />
                        Deploy Strategy
                    </button>
                </div>
            </div>

            <div className="flex border-b bg-white px-8">
                {[
                    { id: 1, label: 'Identity', icon: <FileText size={16} /> },
                    { id: 2, label: 'Inclusions', icon: <Utensils size={16} /> },
                    { id: 3, label: 'Validity', icon: <Calendar size={16} /> },
                    { id: 4, label: 'Restrictions', icon: <Shield size={16} /> },
                    { id: 5, label: 'Pricing Matrix', icon: <DollarSign size={16} /> }
                ].map((tab: { id: number; label: string; icon: React.ReactNode }) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-8 py-4 text-xs font-bold border-b-4 transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        {tab.icon}
                        {tab.label.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-auto p-10 max-w-5xl mx-auto w-full">
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                    {activeTab === 1 && (
                        <div className="bg-white rounded-xl shadow-sm border p-8 space-y-8">
                            <div className="flex items-center gap-2 border-b pb-4">
                                <FileText size={18} className="text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2 text-xs">
                                    <label className="font-black text-gray-700 uppercase tracking-widest pl-1">Plan Name <span className="text-red-500">*</span></label>
                                    <input className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" value={formData.name || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})} placeholder="e.g. Best Available Rate" />
                                </div>
                                <div className="space-y-2 text-xs">
                                    <label className="font-black text-gray-700 uppercase tracking-widest pl-1">Short Code</label>
                                    <input className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono tracking-widest font-bold text-blue-600" value={formData.shortCode || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, shortCode: e.target.value.toUpperCase()})} placeholder="BAR-01" />
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
                                <h3 className="text-lg font-bold text-gray-900">Meal Plan & Packages</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">Meal Plan Selection</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { id: 'EP', label: 'EP', detail: 'European Plan (Room Only/No Meals)' },
                                            { id: 'CP', label: 'CP', detail: 'Continental Plan: Buffet Breakfast (৳850)' },
                                            { id: 'MAP', label: 'MAP', detail: 'Modified American Plan: Breakfast + Lunch/Dinner (৳2200)' },
                                            { id: 'AP', label: 'AP', detail: 'American Plan: All Inclusive Full Board (৳3500)' },
                                            { id: 'CORP-LUNCH', label: 'CORP-LUNCH', detail: 'Corporate Executive Lunch: Box Menu (৳1200)' }
                                        ].map((item: { id: string; label: string; detail: string }) => (
                                            <button 
                                                key={item.id} 
                                                onClick={() => setFormData({ ...formData, mealPlan: item.id })}
                                                className={`p-4 rounded-xl border-2 text-left transition-all ${formData.mealPlan === item.id ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-gray-50 border-gray-100 hover:border-blue-200 hover:bg-white text-gray-600'}`}
                                            >
                                                <div className="text-sm font-bold">{item.id}</div>
                                                <div className={`text-[10px] leading-tight mt-1 ${formData.mealPlan === item.id ? 'text-blue-100' : 'text-gray-400'}`}>{item.detail}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">Linked Package (Layer 2)</label>
                                    <select className="w-full px-4 py-3 border-2 border-blue-100 rounded-xl bg-blue-50 text-blue-900 font-bold text-sm" value={formData.packageId || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, packageId: parseInt(e.target.value) || undefined })}>
                                        <option value="">None (Standalone Plan)</option>
                                        {SAMPLE_PACKAGES_L2.map((pkg: { id: number; name: string; code: string }) => (
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
                                        <h4 className="font-bold text-gray-900 text-sm">Tax Policy</h4>
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
                                <h3 className="text-lg font-bold text-gray-900">Validity & Seasonality</h3>
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
                                            <h4 className="font-bold text-gray-900 text-sm">Seasonal Rate marking</h4>
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
                                <h3 className="text-lg font-bold text-gray-900">Yield Fences & Controls</h3>
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
                                        <div className="text-center font-bold text-xs uppercase tracking-tighter text-gray-700">{item.label}</div>
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
                        <div className="space-y-8">
                            {(formData.pricing || []).map((price: RatePricing, idx: number) => (
                                <div key={idx} className="bg-white rounded-2xl shadow-sm border p-8 space-y-8 group hover:border-blue-200 transition-all duration-300 relative">
                                    <button onClick={() => setFormData({ ...formData, pricing: (formData.pricing || []).filter((_: RatePricing, i: number) => i !== idx) })} className="absolute top-6 right-6 p-2 text-gray-300 hover:text-red-500 border rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="flex items-center gap-4 border-b pb-6 mb-2">
                                        <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center text-white font-bold text-lg italic">#{idx + 1}</div>
                                        <div className="flex-1">
                                            <input 
                                                className="w-full text-xl font-bold bg-transparent border-none outline-none focus:ring-0 p-0 text-gray-900 placeholder:text-gray-200" 
                                                placeholder="Enter Room Category Name..." 
                                                value={price.roomTypeId}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const newPricing = [...(formData.pricing || [])];
                                                    newPricing[idx] = { ...newPricing[idx], roomTypeId: e.target.value };
                                                    setFormData({ ...formData, pricing: newPricing });
                                                }}
                                            />
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tier-Wise Revenue Grid</div>
                                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded ${price.baseRate >= price.operatingCost ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                    GOP: ৳{(price.baseRate - price.operatingCost).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Internal Operating Cost (OPEX)</label>
                                            <div className="relative inline-block">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">৳</span>
                                                <input 
                                                    type="number"
                                                    className="w-32 pl-7 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold text-gray-500 text-right focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                                    <div className="grid grid-cols-5 gap-4">
                                        {[
                                            { label: 'Single Rate', key: 'baseRate' },
                                            { label: 'Double Rate', key: 'doubleRate' },
                                            { label: 'Triple Rate', key: 'tripleRate' },
                                            { label: 'Extra Adult', key: 'extraAdult' },
                                            { label: 'Extra Child', key: 'extraChild' }
                                        ].map((field: { label: string; key: string }) => (
                                            <div key={field.key} className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block pl-1">{field.label}</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 font-bold">৳</span>
                                                    <input 
                                                        type="number" 
                                                        className="w-full pl-7 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-800"
                                                        value={(price as any)[field.key]}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                            const newPricing = [...(formData.pricing || [])];
                                                            (newPricing[idx] as any)[field.key] = parseInt(e.target.value) || 0;
                                                            setFormData({ ...formData, pricing: newPricing });
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <button 
                                onClick={() => setFormData({ ...formData, pricing: [...(formData.pricing || []), { roomTypeId: 'New Tier Strategy', structure: 'Flat', operatingCost: 0, baseRate: 0, doubleRate: 0, tripleRate: 0, extraAdult: 0, extraChild: 0, baseOccupancy: 2, maxOccupancy: 4 }] as any })}
                                className="w-full py-12 border-2 border-dashed border-gray-200 rounded-2xl text-gray-300 font-bold text-lg uppercase tracking-widest hover:border-blue-400 hover:text-blue-500 transition-all hover:bg-blue-50/50 flex flex-col items-center gap-3"
                            >
                                <Plus size={32} />
                                Add Inventory Tier Configuration
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
                    <h2 className="text-xl font-bold flex items-center gap-3 text-gray-900">
                        <TrendingUp className="text-blue-600" /> Yield Operations Grid (July 2026)
                    </h2>
                    <p className="text-xs text-gray-500">Live multi-tier BAR and Corporate distribution rates</p>
                </div>
                <button onClick={() => setView('list')} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold uppercase tracking-wider text-gray-700 transition-colors">
                    <X size={15} className="inline mr-1.5"/> Close Console
                </button>
            </div>
            <div className="grid grid-cols-7 gap-3">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d: string) => (
                    <div key={d} className="text-center font-bold text-gray-400 text-[11px] uppercase tracking-wider py-1">{d}</div>
                ))}
                {/* 3 leading empty cells for July 1 2026 (Wednesday) */}
                <div className="h-28 bg-gray-50/50 border border-transparent rounded-xl" />
                <div className="h-28 bg-gray-50/50 border border-transparent rounded-xl" />
                <div className="h-28 bg-gray-50/50 border border-transparent rounded-xl" />
                {[...Array(31)].map((_: any, i: number) => {
                    const dayNum = i + 1;
                    const isFriOrSat = (dayNum + 2) % 7 === 5 || (dayNum + 2) % 7 === 6;
                    const baseRate = isFriOrSat ? 3800 : 3000;
                    return (
                        <div key={i} className="h-28 bg-white border border-gray-200/90 rounded-xl p-2.5 hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between shadow-2xs">
                            <div className="flex justify-between items-start">
                                <span className="font-bold text-gray-800 text-xs">{dayNum}</span>
                                <div className={`w-2 h-2 rounded-full ${isFriOrSat ? 'bg-purple-500' : 'bg-emerald-500'}`} title={isFriOrSat ? 'Weekend Surcharge' : 'Standard Demand'} />
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] bg-blue-50/80 px-1.5 py-0.5 rounded font-bold text-blue-700">
                                    <span>BAR</span>
                                    <span>৳{(baseRate / 1000).toFixed(1)}k</span>
                                </div>
                                <div className="flex justify-between text-[10px] bg-purple-50/80 px-1.5 py-0.5 rounded font-bold text-purple-700">
                                    <span>CORP</span>
                                    <span>৳4.0k</span>
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
