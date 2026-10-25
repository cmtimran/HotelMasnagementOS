import React, { useState, useEffect } from 'react';
import PageHeader from './common/PageHeader';
import { toast } from '../context/ToastContext';
import {
    TrendingUp,
    Database,
    Plus,
    Edit2,
    Trash2,
    Check,
    CheckCircle2,
    X,
    Receipt,
    Search,
    Building2,
    ShieldCheck
} from 'lucide-react';

export interface RevenueGroup {
    id: number;
    code: string;
    name: string;
    usaliCategory: 'Operating Revenue' | 'Non-Operating Income';
    departmentHead: string;
    glPrefix: string;
}

export interface RevenueHead {
    id: number;
    groupId: number;
    code: string;
    name: string;
    defaultTaxRate: number; // e.g. 15 for 15% VAT
    serviceChargeApplicable: boolean; // 10%
    glAccountCode: string; // e.g. GL-4001
    costCenter: string; // e.g. CC-101 FO
    accountType: 'Revenue (Credit)' | 'Contra-Revenue (Debit)';
    active: boolean;
}

const INITIAL_REVENUE_GROUPS: RevenueGroup[] = [
    { id: 1, code: 'REV-ROOMS', name: 'Rooms Division', usaliCategory: 'Operating Revenue', departmentHead: 'Front Office Director', glPrefix: '4000-4099' },
    { id: 2, code: 'REV-FNB', name: 'Food & Beverage Division', usaliCategory: 'Operating Revenue', departmentHead: 'F&B Director & Executive Chef', glPrefix: '4100-4199' },
    { id: 3, code: 'REV-OPERATED', name: 'Other Operated Departments', usaliCategory: 'Operating Revenue', departmentHead: 'Operations Director', glPrefix: '4200-4499' },
    { id: 4, code: 'REV-MISC', name: 'Miscellaneous Non-Operating Income', usaliCategory: 'Non-Operating Income', departmentHead: 'Financial Controller', glPrefix: '4500-4599' }
];

const INITIAL_REVENUE_HEADS: RevenueHead[] = [
    { id: 1, groupId: 1, code: 'REV-ROOM-STD', name: 'Deluxe Standard Room Tariffs', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4001', costCenter: 'CC-101 Front Office', accountType: 'Revenue (Credit)', active: true },
    { id: 2, groupId: 1, code: 'REV-ROOM-SUT', name: 'Presidential & Executive Suites', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4002', costCenter: 'CC-101 Front Office', accountType: 'Revenue (Credit)', active: true },
    { id: 3, groupId: 1, code: 'REV-ROOM-EXT', name: 'Extra Bed & Person Surcharges', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4050', costCenter: 'CC-102 Housekeeping', accountType: 'Revenue (Credit)', active: true },
    { id: 4, groupId: 1, code: 'REV-ROOM-DAY', name: 'Day Use & Early/Late Room Tariffs', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4060', costCenter: 'CC-101 Front Office', accountType: 'Revenue (Credit)', active: true },
    
    { id: 5, groupId: 2, code: 'REV-FNB-DINE', name: 'All-Day Dining Restaurant Sales', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4101', costCenter: 'CC-201 Restaurant', accountType: 'Revenue (Credit)', active: true },
    { id: 6, groupId: 2, code: 'REV-FNB-BANQ', name: 'Grand Ballroom & Banquet Hall Rental', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4102', costCenter: 'CC-203 Banquet', accountType: 'Revenue (Credit)', active: true },
    { id: 7, groupId: 2, code: 'REV-FNB-BAR', name: 'Skyline Lounge & Bar Sales', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4103', costCenter: 'CC-202 Lounge', accountType: 'Revenue (Credit)', active: true },
    { id: 8, groupId: 2, code: 'REV-FNB-MINI', name: 'In-Room Minibar Revenue', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4104', costCenter: 'CC-102 Housekeeping', accountType: 'Revenue (Credit)', active: true },

    { id: 9, groupId: 3, code: 'REV-OPS-LND', name: 'Guest Valet Laundry & Dry Cleaning', defaultTaxRate: 15, serviceChargeApplicable: false, glAccountCode: 'GL-4201', costCenter: 'CC-102 Housekeeping', accountType: 'Revenue (Credit)', active: true },
    { id: 10, groupId: 3, code: 'REV-OPS-TRN', name: 'Airport VIP Limousine Fleet Service', defaultTaxRate: 15, serviceChargeApplicable: false, glAccountCode: 'GL-4301', costCenter: 'CC-101 Concierge', accountType: 'Revenue (Credit)', active: true },
    { id: 11, groupId: 3, code: 'REV-OPS-SPA', name: 'Lotus Luxury Spa & Wellness Treatments', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4401', costCenter: 'CC-401 Spa', accountType: 'Revenue (Credit)', active: true },

    { id: 12, groupId: 4, code: 'REV-MSC-CANC', name: 'Late Cancellation Forfeiture Penalties', defaultTaxRate: 0, serviceChargeApplicable: false, glAccountCode: 'GL-4501', costCenter: 'CC-101 Front Office', accountType: 'Revenue (Credit)', active: true },
    { id: 13, groupId: 4, code: 'REV-MSC-NOSH', name: 'Guaranteed No-Show Charge Revenue', defaultTaxRate: 0, serviceChargeApplicable: false, glAccountCode: 'GL-4502', costCenter: 'CC-101 Front Office', accountType: 'Revenue (Credit)', active: true },
    { id: 14, groupId: 4, code: 'REV-MSC-FXGN', name: 'Foreign Exchange Gain & Conversion Margin', defaultTaxRate: 0, serviceChargeApplicable: false, glAccountCode: 'GL-4503', costCenter: 'CC-301 Finance', accountType: 'Revenue (Credit)', active: true }
];

export const RevenueManagement: React.FC = () => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<number | 'ALL'>('ALL');
    const [selectedTaxFilter, setSelectedTaxFilter] = useState<string>('ALL');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state from localStorage
    const [revenueGroups, setRevenueGroups] = useState<RevenueGroup[]>(() => {
        const saved = localStorage.getItem('master_rev_groups_v2');
        return saved ? JSON.parse(saved) : INITIAL_REVENUE_GROUPS;
    });

    const [revenueHeads, setRevenueHeads] = useState<RevenueHead[]>(() => {
        const saved = localStorage.getItem('master_rev_heads_v2');
        return saved ? JSON.parse(saved) : INITIAL_REVENUE_HEADS;
    });

    useEffect(() => {
        localStorage.setItem('master_rev_groups_v2', JSON.stringify(revenueGroups));
    }, [revenueGroups]);

    useEffect(() => {
        localStorage.setItem('master_rev_heads_v2', JSON.stringify(revenueHeads));
    }, [revenueHeads]);

    // Modals
    const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
    const [editingHead, setEditingHead] = useState<RevenueHead | null>(null);
    const [headForm, setHeadForm] = useState({
        groupId: 1,
        code: '',
        name: '',
        defaultTaxRate: 15,
        serviceChargeApplicable: true,
        glAccountCode: '',
        costCenter: 'CC-101 Front Office',
        accountType: 'Revenue (Credit)' as RevenueHead['accountType'],
        active: true
    });

    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<RevenueGroup | null>(null);
    const [groupForm, setGroupForm] = useState({
        code: '',
        name: '',
        usaliCategory: 'Operating Revenue' as RevenueGroup['usaliCategory'],
        departmentHead: '',
        glPrefix: ''
    });

    // Head Actions
    const handleOpenAddHead = () => {
        setEditingHead(null);
        setHeadForm({
            groupId: revenueGroups[0]?.id || 1,
            code: `REV-${Date.now().toString().slice(-4)}`,
            name: '',
            defaultTaxRate: 15,
            serviceChargeApplicable: true,
            glAccountCode: `GL-${(4000 + revenueHeads.length + 1)}`,
            costCenter: 'CC-101 Front Office',
            accountType: 'Revenue (Credit)',
            active: true
        });
        setIsHeadModalOpen(true);
    };

    const handleOpenEditHead = (head: RevenueHead) => {
        setEditingHead(head);
        setHeadForm({
            groupId: head.groupId,
            code: head.code,
            name: head.name,
            defaultTaxRate: head.defaultTaxRate,
            serviceChargeApplicable: head.serviceChargeApplicable,
            glAccountCode: head.glAccountCode,
            costCenter: head.costCenter,
            accountType: head.accountType,
            active: head.active
        });
        setIsHeadModalOpen(true);
    };

    const handleSaveHead = (e: React.FormEvent) => {
        e.preventDefault();
        if (!headForm.code || !headForm.name || !headForm.glAccountCode) return;

        if (editingHead) {
            setRevenueHeads(prev =>
                prev.map(h => h.id === editingHead.id ? { ...h, ...headForm } : h)
            );
            showToast(`Revenue Head "${headForm.name}" updated successfully.`);
        } else {
            const newHead: RevenueHead = {
                id: Date.now(),
                ...headForm
            };
            setRevenueHeads(prev => [...prev, newHead]);
            showToast(`Revenue Head "${newHead.name}" created successfully.`);
        }
        setIsHeadModalOpen(false);
    };

    const handleDeleteHead = (id: number) => {
        const target = revenueHeads.find(h => h.id === id);
        if (window.confirm(`Are you sure you want to delete Revenue Head "${target?.name}"?`)) {
            setRevenueHeads(prev => prev.filter(h => h.id !== id));
            showToast('Revenue Head deleted.');
        }
    };

    const handleToggleHeadActive = (id: number) => {
        setRevenueHeads(prev =>
            prev.map(h => h.id === id ? { ...h, active: !h.active } : h)
        );
        const head = revenueHeads.find(h => h.id === id);
        showToast(`Revenue Head ${head?.code} is now ${!head?.active ? 'Active' : 'Inactive'}.`);
    };

    // Group Actions
    const handleOpenAddGroup = () => {
        setEditingGroup(null);
        setGroupForm({
            code: `REV-GRP-${Date.now().toString().slice(-3)}`,
            name: '',
            usaliCategory: 'Operating Revenue',
            departmentHead: '',
            glPrefix: '4600-4699'
        });
        setIsGroupModalOpen(true);
    };

    const handleOpenEditGroup = (g: RevenueGroup) => {
        setEditingGroup(g);
        setGroupForm({
            code: g.code,
            name: g.name,
            usaliCategory: g.usaliCategory,
            departmentHead: g.departmentHead,
            glPrefix: g.glPrefix
        });
        setIsGroupModalOpen(true);
    };

    const handleSaveGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupForm.code || !groupForm.name) return;

        if (editingGroup) {
            setRevenueGroups(prev =>
                prev.map(g => g.id === editingGroup.id ? { ...g, ...groupForm } : g)
            );
            showToast(`Revenue Group "${groupForm.name}" updated.`);
        } else {
            const newGroup: RevenueGroup = {
                id: Date.now(),
                ...groupForm
            };
            setRevenueGroups(prev => [...prev, newGroup]);
            showToast(`Revenue Group "${newGroup.name}" created.`);
        }
        setIsGroupModalOpen(false);
    };

    const handleDeleteGroup = (id: number) => {
        const headsInGroup = revenueHeads.filter(h => h.groupId === id);
        if (headsInGroup.length > 0) {
            toast.error(`Cannot delete group! It contains ${headsInGroup.length} active revenue heads. Reassign or delete those heads first.`);
            return;
        }
        if (window.confirm('Are you sure you want to delete this revenue group?')) {
            setRevenueGroups(prev => prev.filter(g => g.id !== id));
            showToast('Revenue Group removed.');
        }
    };

    // Filtered data
    const filteredHeads = revenueHeads.filter(head => {
        const matchesGroup = selectedGroupFilter === 'ALL' || head.groupId === selectedGroupFilter;
        const matchesTax = selectedTaxFilter === 'ALL' ||
            (selectedTaxFilter === 'taxable' && head.defaultTaxRate > 0) ||
            (selectedTaxFilter === 'exempt' && head.defaultTaxRate === 0) ||
            (selectedTaxFilter === 'sc' && head.serviceChargeApplicable);
        const matchesQuery =
            head.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            head.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            head.glAccountCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            head.costCenter.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesGroup && matchesTax && matchesQuery;
    });

    const totalHeadsCount = revenueHeads.length;
    const activeHeadsCount = revenueHeads.filter(h => h.active).length;
    const totalGroupsCount = revenueGroups.length;
    const scApplicableCount = revenueHeads.filter(h => h.serviceChargeApplicable).length;

    return (
        <div className="page-container animate-in fade-in duration-150">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-5 right-5 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            <PageHeader
                title="Revenue Heads & Groups Management"
                subtitle="Uniform System of Accounts for the Lodging Industry (USALI) 2-tier chart of accounts, folio charge ledgers, VAT % and Service Charge (SC) rules"
                icon={<TrendingUp size={20} />}
                badge="USALI 11th Edition"
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={handleOpenAddGroup}
                            className="btn-secondary"
                        >
                            <Database size={14} />
                            <span>Add Revenue Group</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenAddHead}
                            className="btn-primary"
                        >
                            <Plus size={14} />
                            <span>New Revenue Head</span>
                        </button>
                    </div>
                }
            />

            {/* KPI Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">USALI Revenue Groups</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{totalGroupsCount} Tier-1 Groups</div>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                            <Check size={11} /> 100% Operating & Non-Op
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                        <Database size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Active Revenue Heads</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{activeHeadsCount} / {totalHeadsCount}</div>
                        <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
                            Sub-Ledger GL Accounts
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Receipt size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Service Charge Applicable</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{scApplicableCount} Heads</div>
                        <span className="text-[10px] text-purple-600 font-semibold mt-0.5 block">
                            10% Standard Hotel SC
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                        <ShieldCheck size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
                    <div>
                        <span className="text-gray-500 font-medium text-[11px]">Standard Tax Bracket</span>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">15% VAT</div>
                        <span className="text-[10px] text-amber-600 font-semibold mt-0.5 block">
                            NBR Hospitality Tax Rate
                        </span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                        <Building2 size={18} />
                    </div>
                </div>
            </div>

            {/* Tier 1: USALI Revenue Groups Card Deck */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Database size={14} className="text-blue-600" />
                        <span>Tier 1: USALI Revenue Groups (Divisions)</span>
                    </h2>
                    <span className="text-[11px] text-gray-500 font-medium">
                        Click group card or use filter below to inspect heads
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5">
                    {revenueGroups.map(group => {
                        const count = revenueHeads.filter(h => h.groupId === group.id).length;
                        const isSelected = selectedGroupFilter === group.id;
                        return (
                            <div
                                key={group.id}
                                onClick={() => setSelectedGroupFilter(isSelected ? 'ALL' : group.id)}
                                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 relative group ${isSelected ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20' : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-xs'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                        {group.code}
                                    </span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditGroup(group)}
                                            className="p-1 text-gray-400 hover:text-blue-600"
                                            title="Edit Group"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteGroup(group.id)}
                                            className="p-1 text-gray-400 hover:text-rose-600"
                                            title="Delete Group"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-xs">{group.name}</h3>
                                    <div className="text-[10px] text-gray-500 mt-0.5">{group.departmentHead}</div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10.5px]">
                                    <span className="font-mono font-bold text-gray-600">{group.glPrefix}</span>
                                    <span className={`font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-emerald-600 text-white' : 'bg-blue-50 text-blue-700'}`}>
                                        {count} Sub-Heads
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tier 2: Revenue Heads Table Section */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50">
                    <div>
                        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Receipt size={14} className="text-emerald-600" />
                            <span>Tier 2: Detailed Chart of Revenue Heads & Folio Ledger Mappings</span>
                        </h2>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            Transactions from Front Desk folios, Point of Sale (POS) terminals, and Banquets are credited to these specific General Ledger codes.
                        </p>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, code, GL..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-lg bg-white outline-none w-48 lg:w-60 focus:border-emerald-500"
                            />
                        </div>

                        <select
                            value={selectedGroupFilter}
                            onChange={e => setSelectedGroupFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                            className="h-8 px-2.5 text-xs font-semibold border border-gray-200 rounded-lg bg-white outline-none cursor-pointer"
                        >
                            <option value="ALL">All Revenue Groups ({revenueHeads.length})</option>
                            {revenueGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>

                        <select
                            value={selectedTaxFilter}
                            onChange={e => setSelectedTaxFilter(e.target.value)}
                            className="h-8 px-2.5 text-xs font-semibold border border-gray-200 rounded-lg bg-white outline-none cursor-pointer"
                        >
                            <option value="ALL">All Tax / SC Rules</option>
                            <option value="taxable">Taxable (15% VAT)</option>
                            <option value="sc">Service Charge (10% SC)</option>
                            <option value="exempt">Tax Exempt (0% VAT)</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-xs min-w-[850px]">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                                <th className="px-3.5 py-2.5">Head Code</th>
                                <th className="px-3.5 py-2.5">Revenue Head Name</th>
                                <th className="px-3.5 py-2.5">USALI Group</th>
                                <th className="px-3.5 py-2.5">GL Account Code</th>
                                <th className="px-3.5 py-2.5">Cost Center</th>
                                <th className="px-3.5 py-2.5">Tax (VAT)</th>
                                <th className="px-3.5 py-2.5">Service Charge</th>
                                <th className="px-3.5 py-2.5">Ledger Type</th>
                                <th className="px-3.5 py-2.5">Status</th>
                                <th className="px-3.5 py-2.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredHeads.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500 text-xs">
                                        No revenue heads match your search or filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredHeads.map(head => {
                                    const parentGroup = revenueGroups.find(g => g.id === head.groupId);
                                    return (
                                        <tr key={head.id} className="hover:bg-blue-50/20 transition-colors">
                                            <td className="px-3.5 py-2.5 font-mono font-bold text-blue-700">{head.code}</td>
                                            <td className="px-3.5 py-2.5 font-semibold text-gray-900">{head.name}</td>
                                            <td className="px-3.5 py-2.5">
                                                <span className="text-[10.5px] font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                                    {parentGroup?.name || 'Operating'}
                                                </span>
                                            </td>
                                            <td className="px-3.5 py-2.5 font-mono font-bold">
                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">
                                                    {head.glAccountCode}
                                                </span>
                                            </td>
                                            <td className="px-3.5 py-2.5 text-gray-600 text-[11px]">{head.costCenter}</td>
                                            <td className="px-3.5 py-2.5">
                                                <span className={`font-bold px-1.5 py-0.5 rounded text-[10.5px] ${head.defaultTaxRate > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-500'}`}>
                                                    {head.defaultTaxRate}% VAT
                                                </span>
                                            </td>
                                            <td className="px-3.5 py-2.5">
                                                {head.serviceChargeApplicable ? (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        10% Applicable
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">Exempt (0%)</span>
                                                )}
                                            </td>
                                            <td className="px-3.5 py-2.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${head.accountType.includes('Contra') ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                                    {head.accountType}
                                                </span>
                                            </td>
                                            <td className="px-3.5 py-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleHeadActive(head.id)}
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${head.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}
                                                >
                                                    {head.active ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>
                                            <td className="px-3.5 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditHead(head)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                                        title="Edit Head"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteHead(head.id)}
                                                        className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                                        title="Delete Head"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL 1: ADD / EDIT REVENUE HEAD */}
            {isHeadModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                <Receipt size={15} className="text-emerald-600" />
                                <span>{editingHead ? 'Edit Revenue Head' : 'Create New Revenue Head'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsHeadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveHead} className="p-4 space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Parent Revenue Group *</label>
                                    <select
                                        value={headForm.groupId}
                                        onChange={e => setHeadForm({ ...headForm, groupId: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                    >
                                        {revenueGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Revenue Head Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={headForm.code}
                                        onChange={e => setHeadForm({ ...headForm, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. REV-ROOM-STD"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Revenue Head Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={headForm.name}
                                    onChange={e => setHeadForm({ ...headForm, name: e.target.value })}
                                    placeholder="e.g. Deluxe Room Accommodation Tariffs"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">General Ledger (GL) Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={headForm.glAccountCode}
                                        onChange={e => setHeadForm({ ...headForm, glAccountCode: e.target.value })}
                                        placeholder="e.g. GL-4001"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Cost Center Mapping *</label>
                                    <input
                                        type="text"
                                        required
                                        value={headForm.costCenter}
                                        onChange={e => setHeadForm({ ...headForm, costCenter: e.target.value })}
                                        placeholder="e.g. CC-101 Front Office"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Default VAT Rate (%)</label>
                                    <select
                                        value={headForm.defaultTaxRate}
                                        onChange={e => setHeadForm({ ...headForm, defaultTaxRate: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                    >
                                        <option value={15}>15% Standard Hospitality VAT</option>
                                        <option value={10}>10% Reduced VAT Rate</option>
                                        <option value={5}>5% Concession VAT</option>
                                        <option value={0}>0% Tax Exempt / Forfeiture</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Account Type</label>
                                    <select
                                        value={headForm.accountType}
                                        onChange={e => setHeadForm({ ...headForm, accountType: e.target.value as any })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                    >
                                        <option value="Revenue (Credit)">Revenue (Credit)</option>
                                        <option value="Contra-Revenue (Debit)">Contra-Revenue (Debit)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={headForm.serviceChargeApplicable}
                                        onChange={e => setHeadForm({ ...headForm, serviceChargeApplicable: e.target.checked })}
                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>Apply 10% Service Charge (SC)</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={headForm.active}
                                        onChange={e => setHeadForm({ ...headForm, active: e.target.checked })}
                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>Status Active</span>
                                </label>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsHeadModalOpen(false)}
                                    className="h-8 px-3.5 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-2xs"
                                >
                                    {editingHead ? 'Update Revenue Head' : 'Create Revenue Head'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: ADD / EDIT REVENUE GROUP */}
            {isGroupModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                <Database size={15} className="text-blue-600" />
                                <span>{editingGroup ? 'Edit Revenue Group' : 'Add Revenue Group (Tier 1)'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsGroupModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveGroup} className="p-4 space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Group Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={groupForm.code}
                                        onChange={e => setGroupForm({ ...groupForm, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. REV-BANQUET"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">USALI Category</label>
                                    <select
                                        value={groupForm.usaliCategory}
                                        onChange={e => setGroupForm({ ...groupForm, usaliCategory: e.target.value as any })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none bg-white font-medium"
                                    >
                                        <option value="Operating Revenue">Operating Revenue</option>
                                        <option value="Non-Operating Income">Non-Operating Income</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Group Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={groupForm.name}
                                    onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                                    placeholder="e.g. Banquet & Conference Division"
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Department Head</label>
                                    <input
                                        type="text"
                                        value={groupForm.departmentHead}
                                        onChange={e => setGroupForm({ ...groupForm, departmentHead: e.target.value })}
                                        placeholder="e.g. Banquet Director"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">GL Prefix Range</label>
                                    <input
                                        type="text"
                                        value={groupForm.glPrefix}
                                        onChange={e => setGroupForm({ ...groupForm, glPrefix: e.target.value })}
                                        placeholder="e.g. 4300-4399"
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsGroupModalOpen(false)}
                                    className="h-8 px-3.5 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50 text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-2xs"
                                >
                                    {editingGroup ? 'Update Group' : 'Save Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RevenueManagement;
