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
    hasSnacks: boolean;
    servingType: 'Buffet' | 'Set Menu' | 'Fixed Credit';

    // Pricing
    internalCost: number;
    sellingPriceAdult: number;
    sellingPriceChild: number;
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
            name: 'Continental Plan',
            marketingName: 'Buffet Breakfast',
            shortCode: 'CP',
            description: 'Includes daily buffet breakfast at The Cafe',
            status: 'Active',
            hasBreakfast: true,
            hasLunch: false,
            hasDinner: false,
            hasSnacks: false,
            servingType: 'Buffet',
            internalCost: 150,
            sellingPriceAdult: 500,
            sellingPriceChild: 250,
            postingFrequency: 'Daily',
            revenueCode: 'REV-FOOD-001',
            taxInclusive: false,
            startTime: '07:00',
            endTime: '10:30',
            venue: 'Main Kitchen'
        }
    ]);
    const [formData, setFormData] = useState<Partial<MealPlan>>({});
    const [activeTab, setActiveTab] = useState('identity');

    const handleSave = () => {
        if (formData.name && formData.shortCode) {
            const newPlan = { ...formData, id: Date.now() } as MealPlan;
            setMealPlans([...mealPlans, newPlan]);
            setView('list');
            setFormData({});
            setActiveTab('identity');
        }
    };

    const toggleInclusion = (field: keyof MealPlan) => {
        setFormData({ ...formData, [field]: !formData[field] });
    };

    const renderList = () => (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Meal Plans</h1>
                    <p className="text-sm text-gray-500">Configure meal packages and pricing</p>
                </div>
                <button
                    onClick={() => {
                        setFormData({
                            status: 'Active',
                            servingType: 'Buffet',
                            postingFrequency: 'Daily',
                            taxInclusive: false,
                            hasBreakfast: false,
                            hasLunch: false,
                            hasDinner: false,
                            hasSnacks: false
                        });
                        setView('form');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
                            <th className="px-6 py-4 font-semibold text-gray-700">Pricing (Adult)</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {mealPlans.map(plan => (
                            <tr key={plan.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{plan.name}</div>
                                    <div className="text-xs text-gray-500">{plan.shortCode}</div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                    <div className="flex gap-1">
                                        {plan.hasBreakfast && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">B</span>}
                                        {plan.hasLunch && <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-xs">L</span>}
                                        {plan.hasDinner && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs">D</span>}
                                        {plan.hasSnacks && <span className="px-1.5 py-0.5 bg-pink-100 text-pink-800 rounded text-xs">S</span>}
                                    </div>
                                    <span className="text-xs text-gray-400 mt-1 block">{plan.servingType}</span>
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    {plan.sellingPriceAdult}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {plan.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-gray-400 hover:text-blue-600 mr-3"><Edit2 size={16} /></button>
                                    <button className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
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
            <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} className="text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {formData.id ? 'Edit Meal Plan' : 'New Meal Plan'}
                        </h1>
                        <p className="text-sm text-gray-500">Configure meal inclusions and costs</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setView('list')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                        <Save size={18} />
                        Save Meal Plan
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b bg-white px-6">
                {[
                    { id: 'identity', label: 'Identity', icon: <FileText size={16} /> },
                    { id: 'inclusions', label: 'Inclusions', icon: <Utensils size={16} /> },
                    { id: 'pricing', label: 'Pricing', icon: <DollarSign size={16} /> },
                    { id: 'operations', label: 'Operations', icon: <Clock size={16} /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-600 text-blue-600 border-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8 max-w-4xl mx-auto w-full">

                {/* 1. Identity */}
                {activeTab === 'identity' && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        <h3 className="text-lg font-semibold border-b pb-4 mb-4">Basic Information</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Plan Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Continental Plan"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Marketing Name</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Buffet Breakfast"
                                    value={formData.marketingName || ''}
                                    onChange={e => setFormData({ ...formData, marketingName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Short Code <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. CP"
                                    value={formData.shortCode || ''}
                                    onChange={e => setFormData({ ...formData, shortCode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Status <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-white"
                                    value={formData.status || 'Active'}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    className="w-full px-3 py-2 border rounded-lg h-24 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Details shown to guest..."
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
                        <h3 className="text-lg font-semibold border-b pb-4 mb-4">Meal Configuration</h3>

                        <div className="space-y-4 mb-6">
                            <label className="text-sm font-medium text-gray-700 block">Select Meals Included</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { key: 'hasBreakfast', label: 'Breakfast' },
                                    { key: 'hasLunch', label: 'Lunch' },
                                    { key: 'hasDinner', label: 'Dinner' },
                                    { key: 'hasSnacks', label: 'Snacks / Hi-Tea' },
                                ].map((item) => (
                                    <label key={item.key} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${formData[item.key as keyof MealPlan] ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                                        }`}>
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-blue-600 rounded"
                                            checked={!!formData[item.key as keyof MealPlan]}
                                            onChange={() => toggleInclusion(item.key as keyof MealPlan)}
                                        />
                                        <span className="font-medium text-gray-900">{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Serving Type</label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg bg-white"
                                value={formData.servingType || 'Buffet'}
                                onChange={e => setFormData({ ...formData, servingType: e.target.value as any })}
                            >
                                <option value="Buffet">Buffet</option>
                                <option value="Set Menu">Set Menu</option>
                                <option value="Fixed Credit">Fixed Credit</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* 3. Pricing */}
                {activeTab === 'pricing' && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        <h3 className="text-lg font-semibold border-b pb-4 mb-4">Pricing & Accounting</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Internal Cost</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="0.00"
                                    value={formData.internalCost || ''}
                                    onChange={e => setFormData({ ...formData, internalCost: parseFloat(e.target.value) })}
                                />
                                <p className="text-xs text-gray-500">For profit analysis</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Posting Frequency</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-white"
                                    value={formData.postingFrequency || 'Daily'}
                                    onChange={e => setFormData({ ...formData, postingFrequency: e.target.value as any })}
                                >
                                    <option value="Daily">Daily (Every Night)</option>
                                    <option value="One-time">One-time (Per Stay)</option>
                                </select>
                            </div>

                            <div className="pt-4 col-span-2 border-t grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Selling Price (Adult)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-lg font-medium"
                                        placeholder="0.00"
                                        value={formData.sellingPriceAdult || ''}
                                        onChange={e => setFormData({ ...formData, sellingPriceAdult: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Selling Price (Child)</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        placeholder="0.00"
                                        value={formData.sellingPriceChild || ''}
                                        onChange={e => setFormData({ ...formData, sellingPriceChild: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700">Revenue Code / Ledger</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-white"
                                    value={formData.revenueCode || ''}
                                    onChange={e => setFormData({ ...formData, revenueCode: e.target.value })}
                                >
                                    <option value="">Select Ledger...</option>
                                    <option value="REV-FOOD-001">Food Revenue</option>
                                    <option value="REV-BEV-001">Beverage Revenue</option>
                                    <option value="REV-ROOM-001">Room Revenue (Package)</option>
                                </select>
                            </div>

                            <div className="col-span-2 pt-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 text-blue-600 rounded border-gray-300"
                                        checked={formData.taxInclusive || false}
                                        onChange={e => setFormData({ ...formData, taxInclusive: e.target.checked })}
                                    />
                                    <span className="font-medium text-gray-700">Tax Inclusive? (VAT Included in Price)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Operations */}
                {activeTab === 'operations' && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        <h3 className="text-lg font-semibold border-b pb-4 mb-4">Timings & Operations</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Start Time</label>
                                <input
                                    type="time"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={formData.startTime || ''}
                                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">End Time</label>
                                <input
                                    type="time"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={formData.endTime || ''}
                                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700">Restaurant Venue</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-white"
                                    value={formData.venue || ''}
                                    onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                >
                                    <option value="">Select Venue...</option>
                                    <option value="Main Kitchen">Main Kitchen</option>
                                    <option value="Poolside Bar">Poolside Bar</option>
                                    <option value="Roof Top Restaurant">Roof Top Restaurant</option>
                                    <option value="Coffee Shop">Coffee Shop</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return view === 'list' ? renderList() : renderForm();
}
