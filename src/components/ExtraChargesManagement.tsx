import React, { useState, useEffect } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    Check,
    CheckCircle2,
    X,
    Search,
    Shield,
    SlidersHorizontal,
    Car,
    Sparkles,
    UtensilsCrossed,
    Monitor,
    Smile,
    Wifi
} from 'lucide-react';

export interface ExtraCharge {
    id: number;
    code: string;
    name: string;
    category: 'Transport' | 'Housekeeping' | 'Food & Beverage' | 'Front Desk' | 'Spa & Wellness' | 'IT & Telecom';
    pricingRule: 'Flat Amount' | 'Per Night' | 'Per Person' | 'Room Rate %';
    basePrice: number;
    taxApplicable: boolean;
    serviceChargeApplicable: boolean;
    revenueLedgerCode: string;
    autoPostTrigger: 'On Reservation' | 'On Check-In' | 'On Demand / Manual';
    active: boolean;
}

const INITIAL_EXTRA_CHARGES: ExtraCharge[] = [
    { id: 1, code: 'TRN-LIMO', name: 'VIP Airport Limousine Transfer', category: 'Transport', pricingRule: 'Flat Amount', basePrice: 3500, taxApplicable: true, serviceChargeApplicable: false, revenueLedgerCode: 'GL-4301 - Airport VIP Fleet', autoPostTrigger: 'On Reservation', active: true },
    { id: 2, code: 'HSK-EXBED', name: 'Rollaway Extra Bed & Bedding', category: 'Housekeeping', pricingRule: 'Per Night', basePrice: 2500, taxApplicable: true, serviceChargeApplicable: true, revenueLedgerCode: 'GL-4050 - Extra Bed Surcharges', autoPostTrigger: 'On Check-In', active: true },
    { id: 3, code: 'FO-EARLY', name: 'Early Morning Check-In (06:00-10:00)', category: 'Front Desk', pricingRule: 'Room Rate %', basePrice: 50, taxApplicable: true, serviceChargeApplicable: false, revenueLedgerCode: 'GL-4060 - Day Use & Hourly Room', autoPostTrigger: 'On Demand / Manual', active: true },
    { id: 4, code: 'FO-LATEOUT', name: 'Late Checkout Surcharge (Until 18:00)', category: 'Front Desk', pricingRule: 'Room Rate %', basePrice: 50, taxApplicable: true, serviceChargeApplicable: false, revenueLedgerCode: 'GL-4060 - Day Use & Hourly Room', autoPostTrigger: 'On Demand / Manual', active: true },
    { id: 5, code: 'LND-EXPRESS', name: 'Express Laundry Service (4h Turnaround)', category: 'Housekeeping', pricingRule: 'Flat Amount', basePrice: 800, taxApplicable: true, serviceChargeApplicable: false, revenueLedgerCode: 'GL-4201 - Guest Valet Laundry', autoPostTrigger: 'On Demand / Manual', active: true },
    { id: 6, code: 'FNB-BBUFFET', name: 'Executive International Breakfast Buffet', category: 'Food & Beverage', pricingRule: 'Per Person', basePrice: 1500, taxApplicable: true, serviceChargeApplicable: true, revenueLedgerCode: 'GL-4101 - Dining Restaurant', autoPostTrigger: 'On Check-In', active: true },
    { id: 7, code: 'SPA-SWEDISH', name: 'Swedish Aromatherapy Spa Massage (60m)', category: 'Spa & Wellness', pricingRule: 'Flat Amount', basePrice: 4500, taxApplicable: true, serviceChargeApplicable: true, revenueLedgerCode: 'GL-4401 - Luxury Spa & Wellness', autoPostTrigger: 'On Demand / Manual', active: true },
    { id: 8, code: 'IT-FIBER', name: 'High-Speed Dedicated 100Mbps Internet', category: 'IT & Telecom', pricingRule: 'Per Night', basePrice: 600, taxApplicable: true, serviceChargeApplicable: false, revenueLedgerCode: 'GL-4060 - Guest Telecom & IT', autoPostTrigger: 'On Demand / Manual', active: true }
];

export const ExtraChargesManagement: React.FC = () => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state from localStorage
    const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>(() => {
        const saved = localStorage.getItem('master_charges_v2');
        return saved ? JSON.parse(saved) : INITIAL_EXTRA_CHARGES;
    });

    useEffect(() => {
        localStorage.setItem('master_charges_v2', JSON.stringify(extraCharges));
    }, [extraCharges]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCharge, setEditingCharge] = useState<ExtraCharge | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        category: 'Housekeeping' as ExtraCharge['category'],
        pricingRule: 'Flat Amount' as ExtraCharge['pricingRule'],
        basePrice: 1000,
        taxApplicable: true,
        serviceChargeApplicable: true,
        revenueLedgerCode: 'GL-4050 - Extra Surcharges',
        autoPostTrigger: 'On Demand / Manual' as ExtraCharge['autoPostTrigger'],
        active: true
    });

    const handleOpenAdd = () => {
        setEditingCharge(null);
        setFormData({
            code: `ADD-${Date.now().toString().slice(-4)}`,
            name: '',
            category: 'Housekeeping',
            pricingRule: 'Flat Amount',
            basePrice: 1000,
            taxApplicable: true,
            serviceChargeApplicable: true,
            revenueLedgerCode: 'GL-4050 - Extra Surcharges',
            autoPostTrigger: 'On Demand / Manual',
            active: true
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (charge: ExtraCharge) => {
        setEditingCharge(charge);
        setFormData({
            code: charge.code,
            name: charge.name,
            category: charge.category,
            pricingRule: charge.pricingRule,
            basePrice: charge.basePrice,
            taxApplicable: charge.taxApplicable,
            serviceChargeApplicable: charge.serviceChargeApplicable,
            revenueLedgerCode: charge.revenueLedgerCode,
            autoPostTrigger: charge.autoPostTrigger,
            active: charge.active
        });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.name) return;

        if (editingCharge) {
            setExtraCharges(prev =>
                prev.map(c => c.id === editingCharge.id ? { ...c, ...formData } : c)
            );
            showToast(`Extra Charge "${formData.name}" updated successfully.`);
        } else {
            const newCharge: ExtraCharge = {
                id: Date.now(),
                ...formData
            };
            setExtraCharges(prev => [...prev, newCharge]);
            showToast(`Extra Charge "${newCharge.name}" added successfully.`);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: number) => {
        const item = extraCharges.find(c => c.id === id);
        if (window.confirm(`Are you sure you want to delete "${item?.name}"?`)) {
            setExtraCharges(prev => prev.filter(c => c.id !== id));
            showToast('Extra Charge removed.');
        }
    };

    const handleToggleActive = (id: number) => {
        setExtraCharges(prev =>
            prev.map(c => c.id === id ? { ...c, active: !c.active } : c)
        );
        const item = extraCharges.find(c => c.id === id);
        showToast(`${item?.name} is now ${!item?.active ? 'Active' : 'Inactive'}.`);
    };

    // Filter
    const filteredCharges = extraCharges.filter(charge => {
        const matchesCategory = selectedCategory === 'ALL' || charge.category === selectedCategory;
        const matchesQuery =
            charge.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            charge.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            charge.revenueLedgerCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            charge.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesQuery;
    });

    const getCategoryIcon = (category: ExtraCharge['category']) => {
        switch (category) {
            case 'Transport': return <Car size={14} className="text-blue-600" />;
            case 'Housekeeping': return <Sparkles size={14} className="text-purple-600" />;
            case 'Food & Beverage': return <UtensilsCrossed size={14} className="text-amber-600" />;
            case 'Front Desk': return <Monitor size={14} className="text-indigo-600" />;
            case 'Spa & Wellness': return <Smile size={14} className="text-rose-600" />;
            case 'IT & Telecom': return <Wifi size={14} className="text-teal-600" />;
            default: return <SlidersHorizontal size={14} />;
        }
    };

    const activeCount = extraCharges.filter(c => c.active).length;
    const autoPostCount = extraCharges.filter(c => c.autoPostTrigger !== 'On Demand / Manual').length;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-150">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-200/90 shadow-2xs p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start md:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md flex-shrink-0">
                        <Plus size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
                                Extra Charges & Ancillary Add-ons
                            </h1>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Folio Surcharges
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Auto Accounting
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Configure supplemental folio services (Airport limos, extra beds, early check-in, laundry) with automated VAT, Service Charge, and GL posting rules.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            Cards
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            Table
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="h-8 px-3.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                        <Plus size={14} />
                        <span>+ Add Extra Charge</span>
                    </button>
                </div>
            </div>

            {/* Accounting Guide Banner */}
            <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white border border-blue-200/70 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900 shadow-2xs">
                <Shield size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold text-gray-900">USALI Revenue Mapping & Automated Folio Billing:</span>
                    <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                        Every ancillary charge is linked to its parent Revenue Head and GL code. When applied during reservation or check-in, the hotel PMS automatically computes <strong>15% VAT</strong> and <strong>10% Service Charge</strong>, preventing folio leakage and ensuring 100% compliance during EOD Night Audit.
                    </p>
                </div>
            </div>

            {/* KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Active Extra Charges</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{activeCount} / {extraCharges.length}</div>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                            <Check size={11} /> Ready on Folios
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                        <Plus size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Auto-Post Triggers</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{autoPostCount} Services</div>
                        <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
                            On Resv / Check-In
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                        <SlidersHorizontal size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Taxable Add-ons</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">
                            {extraCharges.filter(c => c.taxApplicable).length} Items
                        </div>
                        <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">
                            15% VAT Applicable
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                        <Shield size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Service Charge (10%)</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">
                            {extraCharges.filter(c => c.serviceChargeApplicable).length} Items
                        </div>
                        <span className="text-[10px] text-purple-600 font-semibold mt-0.5 block">
                            Staff Gratuity Pool
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                        <Sparkles size={18} />
                    </div>
                </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {['ALL', 'Transport', 'Housekeeping', 'Food & Beverage', 'Front Desk', 'Spa & Wellness', 'IT & Telecom'].map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${selectedCategory === cat ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {cat === 'ALL' ? `All Categories (${extraCharges.length})` : cat}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search charges, codes, GL..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white outline-none w-56 lg:w-64 focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* Content: Grid or Table */}
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
                    {filteredCharges.map(charge => (
                        <div
                            key={charge.id}
                            className={`bg-white p-4 rounded-xl border shadow-2xs transition-all flex flex-col justify-between space-y-3 relative group ${charge.active ? 'border-gray-200/90 hover:border-indigo-300' : 'border-gray-200 bg-gray-50/50 opacity-70'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    {getCategoryIcon(charge.category)}
                                    <span className="font-mono text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                        {charge.code}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEdit(charge)}
                                        className="p-1 text-gray-400 hover:text-indigo-600 cursor-pointer"
                                        title="Edit Charge"
                                    >
                                        <Edit2 size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(charge.id)}
                                        className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                                        title="Delete Charge"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase">{charge.category}</div>
                                <h3 className="font-bold text-gray-900 mt-0.5 text-sm leading-snug">{charge.name}</h3>
                                <div className="text-[10px] text-gray-500 font-mono mt-1">{charge.revenueLedgerCode}</div>
                            </div>

                            <div className="space-y-1.5 pt-2.5 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-900 text-sm">
                                        {charge.pricingRule === 'Room Rate %' ? `${charge.basePrice}% of Room Rate` : `৳ ${charge.basePrice.toLocaleString()}`}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                                        {charge.pricingRule}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 pt-1">
                                    {charge.taxApplicable && (
                                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">
                                            15% VAT
                                        </span>
                                    )}
                                    {charge.serviceChargeApplicable && (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
                                            10% SC
                                        </span>
                                    )}
                                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">
                                        {charge.autoPostTrigger}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-[10.5px] text-gray-500">Service Status</span>
                                <button
                                    type="button"
                                    onClick={() => handleToggleActive(charge.id)}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${charge.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}
                                >
                                    {charge.active ? 'Active' : 'Inactive'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-xs min-w-[850px]">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-3.5 py-2.5">Code</th>
                                    <th className="px-3.5 py-2.5">Charge Name</th>
                                    <th className="px-3.5 py-2.5">Category</th>
                                    <th className="px-3.5 py-2.5">Pricing Rule</th>
                                    <th className="px-3.5 py-2.5">Base Price</th>
                                    <th className="px-3.5 py-2.5">VAT (15%)</th>
                                    <th className="px-3.5 py-2.5">SC (10%)</th>
                                    <th className="px-3.5 py-2.5">Auto-Post Trigger</th>
                                    <th className="px-3.5 py-2.5">Status</th>
                                    <th className="px-3.5 py-2.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCharges.map(charge => (
                                    <tr key={charge.id} className="hover:bg-indigo-50/20 transition-colors">
                                        <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-600">{charge.code}</td>
                                        <td className="px-3.5 py-2.5 font-semibold text-gray-900">{charge.name}</td>
                                        <td className="px-3.5 py-2.5">
                                            <span className="text-[10.5px] font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                                {charge.category}
                                            </span>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-gray-600 font-medium">{charge.pricingRule}</td>
                                        <td className="px-3.5 py-2.5 font-bold text-gray-900">
                                            {charge.pricingRule === 'Room Rate %' ? `${charge.basePrice}%` : `৳ ${charge.basePrice.toLocaleString()}`}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            {charge.taxApplicable ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                    15% VAT
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-[10px]">Exempt</span>
                                            )}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            {charge.serviceChargeApplicable ? (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    10% SC
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-[10px]">Exempt</span>
                                            )}
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            <span className="px-2 py-0.5 rounded text-[10.5px] bg-gray-100 text-gray-700 font-medium">
                                                {charge.autoPostTrigger}
                                            </span>
                                        </td>
                                        <td className="px-3.5 py-2.5">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleActive(charge.id)}
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${charge.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}
                                            >
                                                {charge.active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-3.5 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(charge)}
                                                    className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                                                    title="Edit Charge"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(charge.id)}
                                                    className="p-1 text-gray-400 hover:text-rose-600 rounded"
                                                    title="Delete Charge"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL: ADD / EDIT EXTRA CHARGE */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                <Plus size={15} className="text-indigo-600" />
                                <span>{editingCharge ? 'Edit Extra Charge & Surcharge' : 'Add New Extra Charge'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Charge Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. TRN-LIMO"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Category *</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                    >
                                        <option value="Transport">Transport & Limousine</option>
                                        <option value="Housekeeping">Housekeeping & Extra Bed</option>
                                        <option value="Food & Beverage">Food & Beverage (Buffet, Minibar)</option>
                                        <option value="Front Desk">Front Desk (Early/Late Check-out)</option>
                                        <option value="Spa & Wellness">Spa & Wellness</option>
                                        <option value="IT & Telecom">IT & High-Speed Telecom</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Charge Title / Service Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Airport Limousine Executive Transfer"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Pricing Rule *</label>
                                    <select
                                        value={formData.pricingRule}
                                        onChange={e => setFormData({ ...formData, pricingRule: e.target.value as any })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                    >
                                        <option value="Flat Amount">Flat Amount (Fixed Fee)</option>
                                        <option value="Per Night">Per Night (Daily Recurring)</option>
                                        <option value="Per Person">Per Person (Headcount)</option>
                                        <option value="Room Rate %">Room Rate % (Early/Late Check)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">
                                        {formData.pricingRule === 'Room Rate %' ? 'Percentage (%)' : 'Base Price (BDT ৳) *'}
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={formData.basePrice}
                                        onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">GL Ledger Mapping *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.revenueLedgerCode}
                                        onChange={e => setFormData({ ...formData, revenueLedgerCode: e.target.value })}
                                        placeholder="e.g. GL-4301 - Airport Fleet"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Auto-Post Trigger</label>
                                    <select
                                        value={formData.autoPostTrigger}
                                        onChange={e => setFormData({ ...formData, autoPostTrigger: e.target.value as any })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                    >
                                        <option value="On Demand / Manual">On Demand / Manual Billing</option>
                                        <option value="On Reservation">Auto-Post On Reservation</option>
                                        <option value="On Check-In">Auto-Post On Check-In</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={formData.taxApplicable}
                                        onChange={e => setFormData({ ...formData, taxApplicable: e.target.checked })}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>Apply 15% VAT</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={formData.serviceChargeApplicable}
                                        onChange={e => setFormData({ ...formData, serviceChargeApplicable: e.target.checked })}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>Apply 10% Service Charge (SC)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={formData.active}
                                        onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                        className="rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span>Active</span>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="h-8 px-3.5 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-2xs"
                                >
                                    {editingCharge ? 'Update Extra Charge' : 'Save Extra Charge'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExtraChargesManagement;
