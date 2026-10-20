import React, { useState, useEffect } from 'react';
import {
    Percent,
    Plus,
    Edit2,
    Trash2,
    Check,
    CheckCircle2,
    X,
    Search,
    Shield,
    Lock,
    Unlock,
    Info,
    Receipt,
    Coins
} from 'lucide-react';

export interface DiscountPolicy {
    id: number;
    code: string;
    name: string;
    category: 'Corporate Negotiated' | 'Promotional Campaign' | 'VIP / GM Discretionary' | 'Long Stay Allowance' | 'Staff Privilege';
    type: 'Percentage (%)' | 'Flat Amount (BDT)';
    value: number;
    maxCapBDT: number;
    minSpendBDT: number;
    applicableOn: ('Rooms' | 'F&B' | 'Spa' | 'All Folio')[];
    requiresManagerPin: boolean;
    reasonRequired: boolean;
    contraRevenueGlCode: string;
    active: boolean;
}

const INITIAL_DISCOUNTS: DiscountPolicy[] = [
    { id: 1, code: 'CORP-UN', name: 'UN Agency & Diplomatic Negotiated Rate', category: 'Corporate Negotiated', type: 'Percentage (%)', value: 20, maxCapBDT: 15000, minSpendBDT: 5000, applicableOn: ['Rooms', 'F&B'], requiresManagerPin: false, reasonRequired: true, contraRevenueGlCode: 'GL-4990 - Room Revenue Allowances', active: true },
    { id: 2, code: 'PROMO-SUMMER', name: 'Summer Weekend Getaway Promo Voucher', category: 'Promotional Campaign', type: 'Flat Amount (BDT)', value: 2000, maxCapBDT: 2000, minSpendBDT: 8000, applicableOn: ['Rooms'], requiresManagerPin: false, reasonRequired: false, contraRevenueGlCode: 'GL-4990 - Room Revenue Allowances', active: true },
    { id: 3, code: 'GM-COURTESY', name: 'General Manager Goodwill Courtesy Rebate', category: 'VIP / GM Discretionary', type: 'Percentage (%)', value: 25, maxCapBDT: 25000, minSpendBDT: 1000, applicableOn: ['All Folio'], requiresManagerPin: true, reasonRequired: true, contraRevenueGlCode: 'GL-4990 - Room Revenue Allowances', active: true },
    { id: 4, code: 'LONGSTAY-14', name: 'Extended Stay Concession (14+ Nights)', category: 'Long Stay Allowance', type: 'Percentage (%)', value: 15, maxCapBDT: 30000, minSpendBDT: 40000, applicableOn: ['Rooms'], requiresManagerPin: true, reasonRequired: true, contraRevenueGlCode: 'GL-4990 - Room Revenue Allowances', active: true },
    { id: 5, code: 'STAFF-MEAL', name: 'Staff Duty & Family Dining Allowance', category: 'Staff Privilege', type: 'Percentage (%)', value: 50, maxCapBDT: 3000, minSpendBDT: 500, applicableOn: ['F&B'], requiresManagerPin: false, reasonRequired: false, contraRevenueGlCode: 'GL-4991 - F&B Allowances & Rebates', active: true }
];

export const DiscountManagement: React.FC = () => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state from localStorage
    const [discounts, setDiscounts] = useState<DiscountPolicy[]>(() => {
        const saved = localStorage.getItem('master_discounts_v2');
        return saved ? JSON.parse(saved) : INITIAL_DISCOUNTS;
    });

    useEffect(() => {
        localStorage.setItem('master_discounts_v2', JSON.stringify(discounts));
    }, [discounts]);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<DiscountPolicy | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        category: 'Corporate Negotiated' as DiscountPolicy['category'],
        type: 'Percentage (%)' as DiscountPolicy['type'],
        value: 10,
        maxCapBDT: 10000,
        minSpendBDT: 3000,
        applicableOn: ['Rooms'] as DiscountPolicy['applicableOn'],
        requiresManagerPin: false,
        reasonRequired: true,
        contraRevenueGlCode: 'GL-4990 - Room Revenue Allowances',
        active: true
    });

    const handleOpenAdd = () => {
        setEditingDiscount(null);
        setFormData({
            code: `DISC-${Date.now().toString().slice(-4)}`,
            name: '',
            category: 'Corporate Negotiated',
            type: 'Percentage (%)',
            value: 10,
            maxCapBDT: 10000,
            minSpendBDT: 3000,
            applicableOn: ['Rooms'],
            requiresManagerPin: false,
            reasonRequired: true,
            contraRevenueGlCode: 'GL-4990 - Room Revenue Allowances',
            active: true
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (disc: DiscountPolicy) => {
        setEditingDiscount(disc);
        setFormData({
            code: disc.code,
            name: disc.name,
            category: disc.category,
            type: disc.type,
            value: disc.value,
            maxCapBDT: disc.maxCapBDT,
            minSpendBDT: disc.minSpendBDT,
            applicableOn: [...disc.applicableOn],
            requiresManagerPin: disc.requiresManagerPin,
            reasonRequired: disc.reasonRequired,
            contraRevenueGlCode: disc.contraRevenueGlCode,
            active: disc.active
        });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.code || !formData.name) return;

        if (formData.applicableOn.length === 0) {
            alert('Please select at least one applicable division (Rooms, F&B, Spa, etc.)');
            return;
        }

        if (editingDiscount) {
            setDiscounts(prev =>
                prev.map(d => d.id === editingDiscount.id ? { ...d, ...formData } : d)
            );
            showToast(`Discount policy "${formData.name}" updated successfully.`);
        } else {
            const newDisc: DiscountPolicy = {
                id: Date.now(),
                ...formData
            };
            setDiscounts(prev => [...prev, newDisc]);
            showToast(`Discount policy "${newDisc.name}" created successfully.`);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: number) => {
        const item = discounts.find(d => d.id === id);
        if (window.confirm(`Are you sure you want to delete discount policy "${item?.name}"?`)) {
            setDiscounts(prev => prev.filter(d => d.id !== id));
            showToast('Discount policy removed.');
        }
    };

    const handleToggleActive = (id: number) => {
        setDiscounts(prev =>
            prev.map(d => d.id === id ? { ...d, active: !d.active } : d)
        );
        const item = discounts.find(d => d.id === id);
        showToast(`${item?.name} is now ${!item?.active ? 'Active' : 'Inactive'}.`);
    };

    const handleToggleApplicable = (item: 'Rooms' | 'F&B' | 'Spa' | 'All Folio') => {
        setFormData(prev => {
            if (item === 'All Folio') {
                return { ...prev, applicableOn: ['All Folio'] };
            }
            const withoutAll = prev.applicableOn.filter(x => x !== 'All Folio');
            if (withoutAll.includes(item)) {
                const next = withoutAll.filter(x => x !== item);
                return { ...prev, applicableOn: next.length === 0 ? ['Rooms'] : next };
            } else {
                return { ...prev, applicableOn: [...withoutAll, item] };
            }
        });
    };

    // Filter
    const filteredDiscounts = discounts.filter(disc => {
        const matchesCat = selectedCategory === 'ALL' || disc.category === selectedCategory;
        const matchesQuery =
            disc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            disc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            disc.contraRevenueGlCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            disc.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesQuery;
    });

    const activeCount = discounts.filter(d => d.active).length;
    const pinRequiredCount = discounts.filter(d => d.requiresManagerPin).length;
    const maxDiscountValue = Math.max(...discounts.map(d => d.maxCapBDT), 0);

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
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md flex-shrink-0">
                        <Percent size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
                                Discounts, Allowances & Rebates
                            </h1>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                USALI GL-4990
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Contra-Revenue
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Manage authorized hotel discount policies, spending caps, and supervisor PIN authorization in compliance with international lodging standards.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="h-8 px-3.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer self-start md:self-auto"
                >
                    <Plus size={14} />
                    <span>+ New Discount Policy</span>
                </button>
            </div>

            {/* USALI Accounting Principle Card */}
            <div className="bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-white border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-950 shadow-2xs">
                <Shield size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold">Proper USALI Hospitality Accounting for Discounts:</span>
                    <p className="text-[11px] text-amber-900/80 mt-0.5 leading-relaxed">
                        In professional hotel ERPs, discounts are <strong>never deducted directly from gross tariffs</strong>. Instead, they are posted as a <strong>Debit to Contra-Revenue Account (GL-4990 - Room Revenue Allowances)</strong>. This guarantees that gross tariffs, concessions, and Net Operating Income (NOI) reconcile seamlessly for internal audit and NBR tax compliance.
                    </p>
                </div>
            </div>

            {/* KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Active Discount Policies</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{activeCount} / {discounts.length}</div>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                            <Check size={11} /> Authorized for Front Desk
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                        <Percent size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Supervisor PIN Enforced</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{pinRequiredCount} Policies</div>
                        <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">
                            Manager Security Gate
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                        <Lock size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Maximum Cap Limit</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">৳ {maxDiscountValue.toLocaleString()}</div>
                        <span className="text-[10px] text-purple-600 font-semibold mt-0.5 block">
                            Highest Discretionary Cap
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                        <Coins size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Audit Contra-Ledger</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">GL-4990</div>
                        <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
                            Room Revenue Allowances
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Receipt size={18} />
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {['ALL', 'Corporate Negotiated', 'Promotional Campaign', 'VIP / GM Discretionary', 'Long Stay Allowance', 'Staff Privilege'].map(cat => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`h-7 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {cat === 'ALL' ? `All Policies (${discounts.length})` : cat}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search policy name, code, GL..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white outline-none w-56 lg:w-64 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Discounts List / Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden text-xs">
                <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Percent size={14} className="text-blue-600" />
                        <span>Authorized Discount & Allowance Policies</span>
                    </h2>
                    <span className="text-[11px] text-gray-500">
                        {filteredDiscounts.length} policies matching filter
                    </span>
                </div>

                <div className="divide-y divide-gray-100">
                    {filteredDiscounts.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No discount policies found matching your search.
                        </div>
                    ) : (
                        filteredDiscounts.map(disc => (
                            <div
                                key={disc.id}
                                className={`p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 transition-colors ${disc.active ? 'hover:bg-gray-50/80' : 'bg-gray-50/40 opacity-70'}`}
                            >
                                <div className="flex items-start gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-base flex-shrink-0 shadow-2xs border border-blue-100">
                                        {disc.type === 'Percentage (%)' ? '%' : '৳'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-gray-900 text-sm">{disc.name}</h3>
                                            <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                {disc.code}
                                            </span>
                                            <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                                {disc.category}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1.5">
                                            <span>
                                                Benefit: <strong className="text-blue-700 font-bold">{disc.type === 'Percentage (%)' ? `${disc.value}% Discount` : `৳ ${disc.value.toLocaleString()} Flat`}</strong>
                                            </span>
                                            <span>•</span>
                                            <span>Max Cap: <strong className="text-gray-800">৳ {disc.maxCapBDT.toLocaleString()}</strong></span>
                                            <span>•</span>
                                            <span>Min Spend: <strong className="text-gray-800">৳ {disc.minSpendBDT.toLocaleString()}</strong></span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                Applicable: 
                                                {disc.applicableOn.map(item => (
                                                    <span key={item} className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                                                        {item}
                                                    </span>
                                                ))}
                                            </span>
                                            <span>•</span>
                                            <span className="font-mono text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                                {disc.contraRevenueGlCode}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 self-end lg:self-auto flex-shrink-0">
                                    {disc.requiresManagerPin ? (
                                        <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                            <Lock size={11} /> PIN Required
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
                                            <Unlock size={11} /> Front Desk Direct
                                        </span>
                                    )}

                                    {disc.reasonRequired && (
                                        <span className="px-2 py-1 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                                            <Info size={11} /> Reason Mandatory
                                        </span>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => handleToggleActive(disc.id)}
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${disc.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}
                                    >
                                        {disc.active ? 'Active' : 'Inactive'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleOpenEdit(disc)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                        title="Edit Policy"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(disc.id)}
                                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                        title="Delete Policy"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MODAL: ADD / EDIT DISCOUNT */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                <Percent size={15} className="text-blue-600" />
                                <span>{editingDiscount ? 'Edit Discount Policy' : 'Create New Discount Policy'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-4 space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Policy Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. CORP-AIRLINE"
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
                                        <option value="Corporate Negotiated">Corporate Negotiated</option>
                                        <option value="Promotional Campaign">Promotional Campaign</option>
                                        <option value="VIP / GM Discretionary">VIP / GM Discretionary</option>
                                        <option value="Long Stay Allowance">Long Stay Allowance</option>
                                        <option value="Staff Privilege">Staff Privilege</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Policy Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Airline Crew Negotiated Rate Concession"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Discount Type *</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                    >
                                        <option value="Percentage (%)">Percentage (%)</option>
                                        <option value="Flat Amount (BDT)">Flat Amount (BDT ৳)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">
                                        {formData.type === 'Percentage (%)' ? 'Percentage Value (%)' : 'Amount (BDT ৳)'} *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={formData.value}
                                        onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Maximum Cap (BDT ৳) *</label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={formData.maxCapBDT}
                                        onChange={e => setFormData({ ...formData, maxCapBDT: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Minimum Spend (BDT ৳) *</label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={formData.minSpendBDT}
                                        onChange={e => setFormData({ ...formData, minSpendBDT: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-semibold text-gray-700">Applicable Departments / Folios *</label>
                                <div className="flex items-center gap-3 flex-wrap">
                                    {(['Rooms', 'F&B', 'Spa', 'All Folio'] as const).map(dept => (
                                        <label key={dept} className="flex items-center gap-1.5 cursor-pointer font-medium text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={formData.applicableOn.includes(dept)}
                                                onChange={() => handleToggleApplicable(dept)}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>{dept}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Contra-Revenue GL Account Code *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.contraRevenueGlCode}
                                    onChange={e => setFormData({ ...formData, contraRevenueGlCode: e.target.value })}
                                    placeholder="e.g. GL-4990 - Room Revenue Allowances"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={formData.requiresManagerPin}
                                        onChange={e => setFormData({ ...formData, requiresManagerPin: e.target.checked })}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Require Supervisor PIN</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={formData.reasonRequired}
                                        onChange={e => setFormData({ ...formData, reasonRequired: e.target.checked })}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Mandatory Audit Reason</span>
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
                                    className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-2xs"
                                >
                                    {editingDiscount ? 'Update Policy' : 'Save Policy'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiscountManagement;
