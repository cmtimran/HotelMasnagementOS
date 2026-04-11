import { useState } from 'react';
import {
    Plus, Edit2, Trash2, Save, X, Utensils,
    DollarSign, Clock, FileText
} from 'lucide-react';

interface MealPlan {
    id: number;
    name: string;
    marketingName: string;
    shortCode: string;
    description: string;
    status: 'Active' | 'Inactive';

    // Inclusions
    hasBreakfast: boolean;
    hasLunch: boolean;
    hasDinner: boolean;
    hasBrunch: boolean;
    hasCupole: boolean; // Special Couple/Private Dinner
    hasSnacks: boolean;
    servingType: 'Buffet' | 'Set Menu' | 'Fixed Credit' | 'À la carte';

    // Pricing
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

export default function MealPlanManagement() {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [mealPlans, setMealPlans] = useState<MealPlan[]>([
        {
            id: 1,
            name: 'Continental Plan (CP)',
            marketingName: 'Buffet Breakfast',
            shortCode: 'CP',
            description: 'Includes daily buffet breakfast at The Cove Restaurant',
            status: 'Active',
            hasBreakfast: true,
            hasLunch: false,
            hasDinner: false,
            hasBrunch: false,
            hasCupole: false,
            hasSnacks: false,
            servingType: 'Buffet',
            internalCost: 250,
            sellingPriceAdult: 850,
            sellingPriceChild: 450,
            infantMealsFree: true,
            maxInfantAge: 4,
            postingFrequency: 'Daily',
            revenueCode: 'REV-FB-BRK',
            taxInclusive: false,
            startTime: '07:00',
            endTime: '10:30',
            venue: 'Main Restaurant'
        },
        {
            id: 2,
            name: 'Modified American Plan (MAP)',
            marketingName: 'Breakfast + Lunch/Dinner',
            shortCode: 'MAP',
            description: 'Breakfast and your choice of Buffet Lunch or Buffet Dinner',
            status: 'Active',
            hasBreakfast: true,
            hasLunch: true,
            hasDinner: true,
            hasBrunch: false,
            hasCupole: false,
            hasSnacks: false,
            servingType: 'Buffet',
            internalCost: 750,
            sellingPriceAdult: 2200,
            sellingPriceChild: 1100,
            infantMealsFree: true,
            maxInfantAge: 4,
            postingFrequency: 'Daily',
            revenueCode: 'REV-FB-MAP',
            taxInclusive: true,
            startTime: '07:00',
            endTime: '22:30',
            venue: 'Main Restaurant'
        },
        {
            id: 3,
            name: 'American Plan (AP) - Full Board',
            marketingName: 'All Incl. Meals',
            shortCode: 'AP',
            description: 'Includes Breakfast, Lunch, and Dinner (Full Board)',
            status: 'Active',
            hasBreakfast: true,
            hasLunch: true,
            hasDinner: true,
            hasBrunch: false,
            hasCupole: false,
            hasSnacks: true,
            servingType: 'Buffet',
            internalCost: 1200,
            sellingPriceAdult: 3500,
            sellingPriceChild: 1800,
            infantMealsFree: true,
            maxInfantAge: 5,
            postingFrequency: 'Daily',
            revenueCode: 'REV-FB-AP',
            taxInclusive: true,
            startTime: '07:00',
            endTime: '23:00',
            venue: 'Multiple Outlets'
        },
        {
            id: 4,
            name: 'Corporate Executive Lunch',
            marketingName: 'Express Business Lunch',
            shortCode: 'CORP-LUNCH',
            description: 'Quick set-menu lunch specifically designed for corporate timings',
            status: 'Active',
            hasBreakfast: false,
            hasLunch: true,
            hasDinner: false,
            hasBrunch: false,
            hasCupole: false,
            hasSnacks: false,
            servingType: 'Set Menu',
            internalCost: 350,
            sellingPriceAdult: 1200,
            sellingPriceChild: 600,
            infantMealsFree: false,
            maxInfantAge: 0,
            postingFrequency: 'One-time',
            revenueCode: 'REV-FB-LUN',
            taxInclusive: true,
            startTime: '12:30',
            endTime: '15:30',
            venue: 'The Atrium Cafe'
        }
    ]);
    const [formData, setFormData] = useState<Partial<MealPlan>>({});
    const [activeTab, setActiveTab] = useState('identity');
    const [editingPlan, setEditingPlan] = useState<MealPlan | null>(null);

    const openCreate = () => {
        setFormData({
            status: 'Active',
            servingType: 'Buffet',
            postingFrequency: 'Daily',
            taxInclusive: false,
            hasBreakfast: false,
            hasLunch: false,
            hasDinner: false,
            hasBrunch: false,
            hasCupole: false,
            hasSnacks: false,
            infantMealsFree: true,
            maxInfantAge: 4
        });
        setEditingPlan(null);
        setView('form');
    };

    const openEdit = (plan: MealPlan) => {
        setFormData({ ...plan });
        setEditingPlan(plan);
        setView('form');
    };

    const handleSave = () => {
        if (formData.name && formData.shortCode) {
            if (editingPlan) {
                setMealPlans(mealPlans.map(p => p.id === editingPlan.id ? { ...formData, id: editingPlan.id } as MealPlan : p));
            } else {
                const newPlan = { ...formData, id: Date.now() } as MealPlan;
                setMealPlans([...mealPlans, newPlan]);
            }
            setView('list');
            setFormData({});
            setEditingPlan(null);
            setActiveTab('identity');
        }
    };

    const handleDelete = (id: number) => {
        setMealPlans(mealPlans.filter(p => p.id !== id));
    };

    const toggleInclusion = (field: keyof MealPlan) => {
        setFormData({ ...formData, [field]: !formData[field] });
    };

    const renderList = () => (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Meal Plan Master Data</h1>
                    <p className="text-sm text-gray-500">Define base meal templates for use in Packages and Rate Plans</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
                >
                    <Plus size={18} />
                    Add Meal Plan
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">Identity</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Inclusions</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Pricing (Adult/Child)</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Revenue Code</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y text-gray-600">
                        {mealPlans.map(plan => (
                            <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{plan.name}</div>
                                    <div className="text-xs font-mono text-gray-400">{plan.shortCode}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {plan.hasBreakfast && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[10px] font-bold">B</span>}
                                        {plan.hasBrunch && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-[10px] font-bold">BR</span>}
                                        {plan.hasLunch && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">L</span>}
                                        {plan.hasDinner && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-bold">D</span>}
                                        {plan.hasCupole && <span className="px-1.5 py-0.5 bg-pink-100 text-pink-800 rounded text-[10px] font-bold">C</span>}
                                        {plan.hasSnacks && <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">S</span>}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">{plan.servingType}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-gray-900">৳{plan.sellingPriceAdult} / ৳{plan.sellingPriceChild}</div>
                                    {plan.infantMealsFree && <div className="text-[10px] text-emerald-500 font-medium">Infants (0-{plan.maxInfantAge}) Free</div>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">{plan.revenueCode}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${plan.status === 'Active' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-800 border border-gray-200'
                                        }`}>
                                        {plan.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button 
                                        onClick={() => openEdit(plan)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(plan.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderForm = () => (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {formData.id ? 'Edit Meal Plan' : 'New Meal Plan'}
                        </h1>
                        <p className="text-sm text-gray-500">Configure comprehensive meal inclusions and revenue routing</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setView('list')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-all shadow-md">
                        <Save size={18} />
                        Save Master Plan
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-white px-6 sticky top-[73px] z-10">
                {[
                    { id: 'identity', label: 'Identity', icon: <FileText size={16} /> },
                    { id: 'inclusions', label: 'Inclusions', icon: <Utensils size={16} /> },
                    { id: 'pricing', label: 'Pricing & Finance', icon: <DollarSign size={16} /> },
                    { id: 'operations', label: 'Operations', icon: <Clock size={16} /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 text-xs font-bold border-b-2 transition-all ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {tab.icon}
                        {tab.label.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">

                {/* 1. Identity */}
                {activeTab === 'identity' && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        <div className="flex items-center gap-2 border-b pb-4">
                            <FileText size={18} className="text-blue-600" />
                            <h3 className="text-lg font-bold text-gray-900">Basic Information</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2 text-xs">
                                <label className="font-bold text-gray-700">Plan Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                    placeholder="e.g. Continental Plan"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 text-xs">
                                <label className="font-bold text-gray-700">Marketing Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                                    placeholder="e.g. Ultra Buffet Breakfast"
                                    value={formData.marketingName || ''}
                                    onChange={e => setFormData({ ...formData, marketingName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 text-xs">
                                <label className="font-bold text-gray-700">Short Code <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono transition-all"
                                    placeholder="e.g. CP"
                                    value={formData.shortCode || ''}
                                    onChange={e => setFormData({ ...formData, shortCode: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="space-y-2 text-xs">
                                <label className="font-bold text-gray-700">Status <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                                    value={formData.status || 'Active'}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="col-span-2 space-y-2 text-xs">
                                <label className="font-bold text-gray-700">Description</label>
                                <textarea
                                    className="w-full px-3 py-2 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                    placeholder="Details shown to guest on booking engine..."
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Inclusions */}
                {activeTab === 'inclusions' && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        <div className="flex items-center gap-2 border-b pb-4">
                            <Utensils size={18} className="text-blue-600" />
                            <h3 className="text-lg font-bold text-gray-900">Meal Configuration</h3>
                        </div>

                        <div className="space-y-4 mb-6">
                            <label className="text-xs font-bold text-gray-700 block uppercase tracking-wider">Select Meals Included</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { key: 'hasBreakfast', label: 'Breakfast', color: 'yellow' },
                                    { key: 'hasBrunch', label: 'Brunch', color: 'orange' },
                                    { key: 'hasLunch', label: 'Lunch', color: 'emerald' },
                                    { key: 'hasDinner', label: 'Dinner', color: 'indigo' },
                                    { key: 'hasCupole', label: 'Cupole Dinner', color: 'pink' },
                                    { key: 'hasSnacks', label: 'Snacks/Mini', color: 'purple' },
                                ].map((item) => (
                                    <label key={item.key} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData[item.key as keyof MealPlan] ? `bg-white border-blue-500 shadow-md` : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                                        }`}>
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-0"
                                            checked={!!formData[item.key as keyof MealPlan]}
                                            onChange={() => toggleInclusion(item.key as keyof MealPlan)}
                                        />
                                        <span className={`text-sm font-bold ${formData[item.key as keyof MealPlan] ? 'text-blue-600' : 'text-gray-500'}`}>{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2 text-xs">
                            <label className="font-bold text-gray-700 block">Serving Style</label>
                            <select
                                className="w-full px-3 py-2 border rounded-xl bg-white text-sm"
                                value={formData.servingType || 'Buffet'}
                                onChange={e => setFormData({ ...formData, servingType: e.target.value as any })}
                            >
                                <option value="Buffet">Standard Buffet</option>
                                <option value="Set Menu">Chef's Set Menu</option>
                                <option value="Fixed Credit">Menu Credit (Allowance)</option>
                                <option value="À la carte">À la carte Service</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* 3. Pricing */}
                {activeTab === 'pricing' && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-2">
                                <DollarSign size={18} className="text-blue-600" />
                                <h3 className="text-lg font-bold text-gray-900">Pricing & Accounting</h3>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 border px-2 py-1 rounded-full uppercase tracking-tighter">Revenue Routing Engine</span>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-1 text-xs">
                                    <label className="font-bold text-gray-700">Internal Cost / Unit</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold">৳</span>
                                        <input type="number" className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="0.00" value={formData.internalCost || ''} onChange={e => setFormData({ ...formData, internalCost: parseFloat(e.target.value) })} />
                                    </div>
                                    <p className="text-[10px] text-gray-400">Used for GOP (Gross Operating Profit) calculation</p>
                                </div>
                                <div className="space-y-1 text-xs">
                                    <label className="font-bold text-gray-700">Posting Frequency</label>
                                    <select className="w-full px-3 py-2 border rounded-lg bg-white text-sm" value={formData.postingFrequency || 'Daily'} onChange={e => setFormData({ ...formData, postingFrequency: e.target.value as any })}>
                                        <option value="Daily">Night Audit (Daily Posting)</option>
                                        <option value="One-time">Check-in (Once per Stay)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 text-xs">
                                        <label className="font-bold text-blue-700">Selling Price (Adult)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-blue-400 font-bold">৳</span>
                                            <input type="number" className="w-full pl-7 pr-3 py-2 border-2 border-blue-100 rounded-lg font-bold text-blue-900 focus:border-blue-500 outline-none text-sm" value={formData.sellingPriceAdult || ''} onChange={e => setFormData({ ...formData, sellingPriceAdult: parseFloat(e.target.value) })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <label className="font-bold text-pink-700">Selling Price (Child)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-pink-300 font-bold">৳</span>
                                            <input type="number" className="w-full pl-7 pr-3 py-2 border-2 border-pink-50 rounded-lg font-bold text-pink-900 focus:border-pink-500 outline-none text-sm" value={formData.sellingPriceChild || ''} onChange={e => setFormData({ ...formData, sellingPriceChild: parseFloat(e.target.value) })} />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2 border-t flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Infants Policy</span>
                                        <input type="checkbox" className="w-4 h-4 rounded text-emerald-500" checked={formData.infantMealsFree || false} onChange={e => setFormData({ ...formData, infantMealsFree: e.target.checked })} />
                                        <span className="text-[10px] text-emerald-600 font-bold">MEALS FREE</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-gray-400 font-bold">UP TO</span>
                                        <input type="number" className="w-10 px-1 py-1 border rounded text-xs text-center font-bold" value={formData.maxInfantAge || 4} onChange={e => setFormData({ ...formData, maxInfantAge: parseInt(e.target.value) })} />
                                        <span className="text-[10px] text-gray-400 font-bold">YRS</span>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2 text-xs">
                                <label className="font-bold text-gray-700">Revenue Code / Ledger <span className="text-[10px] text-blue-500 ml-2 font-normal">(Master Ledger Sync)</span></label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-white text-sm font-mono"
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

                            <div className="col-span-2 pt-2 bg-amber-50 rounded-xl p-4 border border-amber-100 flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 mt-0.5 text-amber-600 rounded border-gray-300"
                                    checked={formData.taxInclusive || false}
                                    onChange={e => setFormData({ ...formData, taxInclusive: e.target.checked })}
                                />
                                <div className="text-xs">
                                    <span className="font-bold text-amber-900 block">Is Price Tax Inclusive?</span>
                                    <span className="text-amber-700">If checked, the selling price includes all applicable taxes (VAT/SC). If unchecked, taxes will be added on top during posting.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Operations */}
                {activeTab === 'operations' && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        <div className="flex items-center gap-2 border-b pb-4">
                            <Clock size={18} className="text-blue-600" />
                            <h3 className="text-lg font-bold text-gray-900">Timings & Service Flow</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2 text-xs">
                                    <label className="font-bold text-gray-700">Service From (Start)</label>
                                    <input
                                        type="time"
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                        value={formData.startTime || ''}
                                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 text-xs">
                                    <label className="font-bold text-gray-700">Service To (End)</label>
                                    <input
                                        type="time"
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                        value={formData.endTime || ''}
                                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2 text-xs">
                                    <label className="font-bold text-gray-700">Primary Restaurant Outlet</label>
                                    <select
                                        className="w-full px-3 py-2 border rounded-lg bg-white text-sm font-medium"
                                        value={formData.venue || ''}
                                        onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                    >
                                        <option value="">Select Outlet...</option>
                                        <option value="Main Kitchen">The Cove (Main Restaurant)</option>
                                        <option value="Poolside Bar">Blue Wave (Poolside)</option>
                                        <option value="Roof Top Restaurant">Sky Cupole (Rooftop)</option>
                                        <option value="Coffee Shop">Bean & Leaf (Cafe)</option>
                                        <option value="In-Room Dining">In-Room Dining (Room Service)</option>
                                    </select>
                                </div>
                                <div className="p-4 bg-gray-900 rounded-xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-gray-400 tracking-tighter uppercase font-mono">Real-time Kitchen Sync</span>
                                    </div>
                                    <p className="text-[10px] text-gray-500 italic">This plan will be visible on the KDS (Kitchen Display System) for the selected outlet during operational hours.</p>
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