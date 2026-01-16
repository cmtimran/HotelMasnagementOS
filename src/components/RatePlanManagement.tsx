import { useState } from 'react';
import {
    Plus, Search, Filter, Edit2, Trash2, Save, X, Calendar, DollarSign,
    Clock, Shield, Percent, Info, CheckCircle, AlertCircle
} from 'lucide-react';

interface RatePlan {
    id: number;
    name: string;
    shortCode: string;
    marketSegment: string;
    currency: string;
    description: string;
    status: 'Active' | 'Inactive';

    // Inclusions
    mealPlan: string;
    taxIncluded: boolean;
    cancellationPolicy: string;
    promoCode?: string;

    // Validity
    activationDate: string;
    expirationDate: string;
    stayDateStart?: string;
    stayDateEnd?: string;
    isSeasonal: boolean;
    seasonName?: string;
    seasonStart?: string;
    seasonEnd?: string;
    validDays: string[]; // Mon, Tue, etc.

    // Restrictions
    minNights: number;
    maxNights?: number;
    cutOffDays: number;
    closedToArrival: boolean;
    closedToDeparture: boolean;
    stopSell: boolean;

    // Pricing
    pricing: RatePricing[];
}

interface RatePricing {
    roomTypeId: string;
    structure: 'Flat' | 'Derived';
    baseRate: number;
    doubleRate: number;
    tripleRate: number;
    extraAdult: number;
    extraChild: number;
    baseOccupancy: number; // fetched from room type ideally
    maxOccupancy: number; // fetched from room type ideally
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function RatePlanManagement() {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [ratePlans, setRatePlans] = useState<RatePlan[]>([
        {
            id: 1,
            name: 'Best Available Rate',
            shortCode: 'BAR',
            marketSegment: 'Walk-in',
            currency: 'USD',
            description: 'Standard flexible rate',
            status: 'Active',
            mealPlan: 'EP (Room Only)',
            taxIncluded: false,
            cancellationPolicy: 'Flexible 24h',
            activationDate: '2024-01-01',
            expirationDate: '2024-12-31',
            isSeasonal: false,
            validDays: DAYS_OF_WEEK,
            minNights: 1,
            cutOffDays: 0,
            closedToArrival: false,
            closedToDeparture: false,
            stopSell: false,
            pricing: [
                { roomTypeId: 'Deluxe King', structure: 'Flat', baseRate: 150, doubleRate: 150, tripleRate: 180, extraAdult: 30, extraChild: 15, baseOccupancy: 2, maxOccupancy: 3 }
            ]
        }
    ]);
    const [formData, setFormData] = useState<Partial<RatePlan>>({});
    const [activeTab, setActiveTab] = useState(1);

    const handleSave = () => {
        if (formData.name && formData.shortCode) {
            const newPlan = { ...formData, id: Date.now() } as RatePlan;
            setRatePlans([...ratePlans, newPlan]);
            setView('list');
            setFormData({});
            setActiveTab(1);
        }
    };

    const toggleDay = (day: string) => {
        const currentDays = formData.validDays || [];
        if (currentDays.includes(day)) {
            setFormData({ ...formData, validDays: currentDays.filter(d => d !== day) });
        } else {
            setFormData({ ...formData, validDays: [...currentDays, day] });
        }
    };

    const renderList = () => (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rate Plans</h1>
                    <p className="text-sm text-gray-500">Manage pricing strategies and restrictions</p>
                </div>
                <button
                    onClick={() => { setFormData({ validDays: DAYS_OF_WEEK, status: 'Active', currency: 'USD' }); setView('form'); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus size={18} />
                    Add Rate Plan
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">Identity</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Market</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Validity</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {ratePlans.map(plan => (
                            <tr key={plan.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900">{plan.name}</div>
                                    <div className="text-xs text-gray-500">{plan.shortCode}</div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{plan.marketSegment}</td>
                                <td className="px-6 py-4 text-gray-600">
                                    {plan.isSeasonal ? 'Seasonal' : 'Year-round'}
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
                            {formData.id ? 'Edit Rate Plan' : 'New Rate Plan'}
                        </h1>
                        <p className="text-sm text-gray-500">Configure comprehensive rate settings</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setView('list')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                        <Save size={18} />
                        Save Rate Plan
                    </button>
                </div>
            </div>

            {/* Stepper/Tabs */}
            <div className="flex border-b bg-white px-6">
                {[
                    { id: 1, label: 'Identity & Market', icon: <Info size={16} /> },
                    { id: 2, label: 'Inclusions', icon: <Percent size={16} /> },
                    { id: 3, label: 'Validity', icon: <Calendar size={16} /> },
                    { id: 4, label: 'Restrictions', icon: <Shield size={16} /> },
                    { id: 5, label: 'Pricing Grid', icon: <DollarSign size={16} /> },
                ].map(step => (
                    <button
                        key={step.id}
                        onClick={() => setActiveTab(step.id)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === step.id ? 'border-primary-600 text-blue-600 border-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {step.icon}
                        {step.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8 max-w-5xl mx-auto w-full">

                {/* 1. Identity & Market */}
                {activeTab === 1 && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        <h3 className="text-lg font-semibold border-b pb-4 mb-4">Basic Information</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Rate Plan Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Winter Getaway"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Short Code <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. BAR"
                                    value={formData.shortCode || ''}
                                    onChange={e => setFormData({ ...formData, shortCode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Market Segment <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-white"
                                    value={formData.marketSegment || ''}
                                    onChange={e => setFormData({ ...formData, marketSegment: e.target.value })}
                                >
                                    <option value="">Select Segment...</option>
                                    <option value="Walk-in">Walk-in</option>
                                    <option value="Corporate">Corporate</option>
                                    <option value="OTA">OTA</option>
                                    <option value="Travel Agent">Travel Agent</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Currency <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-white"
                                    value={formData.currency || 'USD'}
                                    onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                >
                                    <option value="BDT">BDT (৳)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                </select>
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
                                    placeholder="Details shown to staff/guests..."
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Inclusions */}
                {activeTab === 2 && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        <h3 className="text-lg font-semibold border-b pb-4 mb-4">Inclusions & Policies</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Meal Plan <span className="text-red-500">*</span></label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-white"
                                    value={formData.mealPlan || 'EP'}
                                    onChange={e => setFormData({ ...formData, mealPlan: e.target.value })}
                                >
                                    <option value="EP">EP (Room Only)</option>
                                    <option value="CP">CP (Breakfast)</option>
                                    <option value="MAP">MAP (Half Board)</option>
                                    <option value="AP">AP (Full Board)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Cancellation Policy</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg bg-white"
                                    value={formData.cancellationPolicy || ''}
                                    onChange={e => setFormData({ ...formData, cancellationPolicy: e.target.value })}
                                >
                                    <option value="Flexible 24h">Flexible (24h)</option>
                                    <option value="Non-Refundable">Non-Refundable</option>
                                    <option value="Moderate 48h">Moderate (48h)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Promo Code</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. SAVE10"
                                    value={formData.promoCode || ''}
                                    onChange={e => setFormData({ ...formData, promoCode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 flex items-center pt-6">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        checked={formData.taxIncluded || false}
                                        onChange={e => setFormData({ ...formData, taxIncluded: e.target.checked })}
                                    />
                                    <span className="font-medium text-gray-700">Tax Included in Price?</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Validity */}
                {activeTab === 3 && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        <h3 className="text-lg font-semibold border-b pb-4 mb-4">Validity & Seasonality</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Activation Date <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={formData.activationDate || ''}
                                    onChange={e => setFormData({ ...formData, activationDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Expiration Date <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={formData.expirationDate || ''}
                                    onChange={e => setFormData({ ...formData, expirationDate: e.target.value })}
                                />
                            </div>

                            <div className="col-span-2 grid grid-cols-2 gap-6 pt-4 border-t">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Stay Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        value={formData.stayDateStart || ''}
                                        onChange={e => setFormData({ ...formData, stayDateStart: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500">Optional: Specific travel dates</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Stay End Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        value={formData.stayDateEnd || ''}
                                        onChange={e => setFormData({ ...formData, stayDateEnd: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer bg-gray-50 p-3 rounded-lg border">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        checked={formData.isSeasonal || false}
                                        onChange={e => setFormData({ ...formData, isSeasonal: e.target.checked })}
                                    />
                                    <div>
                                        <span className="font-medium text-gray-900 block">Is Season Based?</span>
                                        <span className="text-xs text-gray-500">Enable if rate applies only to specific seasons</span>
                                    </div>
                                </label>
                            </div>

                            {formData.isSeasonal && (
                                <>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Season Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            placeholder="e.g. Summer Peak 2024"
                                            value={formData.seasonName || ''}
                                            onChange={e => setFormData({ ...formData, seasonName: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Season Start <span className="text-red-500">*</span></label>
                                        <input type="date" className="w-full px-3 py-2 border rounded-lg" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Season End <span className="text-red-500">*</span></label>
                                        <input type="date" className="w-full px-3 py-2 border rounded-lg" />
                                    </div>
                                </>
                            )}

                            <div className="col-span-2 space-y-2">
                                <label className="text-sm font-medium text-gray-700 block mb-2">Valid Days</label>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_OF_WEEK.map(day => (
                                        <button
                                            key={day}
                                            onClick={() => toggleDay(day)}
                                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${formData.validDays?.includes(day)
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Restrictions */}
                {activeTab === 4 && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        <h3 className="text-lg font-semibold border-b pb-4 mb-4">Restrictions & Inventory Fences</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Min Nights</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    defaultValue={1}
                                    value={formData.minNights}
                                    onChange={e => setFormData({ ...formData, minNights: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Max Nights</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    value={formData.maxNights || ''}
                                    onChange={e => setFormData({ ...formData, maxNights: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Cut-off Days (Advance Booking)</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    placeholder="0 = Same Day"
                                    value={formData.cutOffDays}
                                    onChange={e => setFormData({ ...formData, cutOffDays: parseInt(e.target.value) })}
                                />
                            </div>

                            <div className="col-span-2 grid grid-cols-3 gap-4 pt-4">
                                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-red-600"
                                        checked={formData.closedToArrival || false}
                                        onChange={e => setFormData({ ...formData, closedToArrival: e.target.checked })}
                                    />
                                    <span className="text-sm font-medium text-gray-700">Closed to Arrival</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-red-600"
                                        checked={formData.closedToDeparture || false}
                                        onChange={e => setFormData({ ...formData, closedToDeparture: e.target.checked })}
                                    />
                                    <span className="text-sm font-medium text-gray-700">Closed to Departure</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 border border-red-200 bg-red-50 rounded-lg cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-red-600"
                                        checked={formData.stopSell || false}
                                        onChange={e => setFormData({ ...formData, stopSell: e.target.checked })}
                                    />
                                    <span className="text-sm font-bold text-red-700">STOP SELL</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. Pricing Grid */}
                {activeTab === 5 && (
                    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                        <div className="flex justify-between items-center border-b pb-4 mb-4">
                            <h3 className="text-lg font-semibold">Room Rate Configuration</h3>
                            <button className="text-sm text-blue-600 font-medium">+ Add Room Type</button>
                        </div>

                        {/* Example Pricing Item */}
                        <div className="border rounded-xl p-4 space-y-4 bg-gray-50/50">
                            <div className="flex justify-between">
                                <h4 className="font-bold text-gray-800">Deluxe King Room</h4>
                                <select className="text-sm border rounded px-2 py-1 bg-white">
                                    <option>Flat Rate</option>
                                    <option>Derived (BAR - %)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-5 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Single (1 Pax)</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                        <input type="number" className="w-full pl-5 pr-2 py-1.5 text-sm border rounded" placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Double (2 Pax)</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                        <input type="number" className="w-full pl-5 pr-2 py-1.5 text-sm border rounded" placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Triple (3 Pax)</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                        <input type="number" className="w-full pl-5 pr-2 py-1.5 text-sm border rounded" placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Ext. Adult</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                        <input type="number" className="w-full pl-5 pr-2 py-1.5 text-sm border rounded" placeholder="0.00" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 block mb-1">Ext. Child</label>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                        <input type="number" className="w-full pl-5 pr-2 py-1.5 text-sm border rounded" placeholder="0.00" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 text-xs text-gray-500">
                                <span>Base Occupancy: 2</span>
                                <span>Max Occupancy: 3</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return view === 'list' ? renderList() : renderForm();
}
