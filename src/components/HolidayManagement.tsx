import React, { useState, useEffect, useMemo } from 'react';
import {
    CalendarDays,
    Plus,
    Search,
    Edit2,
    Trash2,
    AlertCircle,
    Calendar,
    Sparkles,
    DollarSign,
    Users,
    Clock,
    X,
    Save,
    TrendingUp
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { generateUniqueShortCode, isShortCodeDuplicate } from '../utils/codeGenerator';
import { getStoredHolidays, STORAGE_KEY_HOLIDAYS } from '../utils/holidayHelper';

export type HolidayCategory =
    | 'PUBLIC'
    | 'RELIGIOUS'
    | 'PEAK_GALA'
    | 'CORPORATE';

export interface HolidayItem {
    id: string;
    code: string;
    name: string;
    category: HolidayCategory;
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
    daysCount: number;
    // Commercial / Yield Rules
    hasSurgeRate: boolean;
    rateMultiplier: number; // e.g. 1.25 = +25%
    minStayNights: number;  // MLOS e.g. 1, 2, 3
    mandatoryGala: boolean;
    galaDinnerFee: number;
    // Staff & HRM Rules
    staffWageMultiplier: number; // e.g. 2.0 = Double time
    compOffCredit: boolean;
    minimumStaffingAlert: 'STANDARD' | 'HIGH_ALERT' | 'MAX_PRESENCE';
    // Metadata
    status: 'ACTIVE' | 'INACTIVE';
    description?: string;
    createdAt?: string;
}

export default function HolidayManagement() {
    const [holidays, setHolidays] = useState<HolidayItem[]>(() => {
        return getStoredHolidays();
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(holidays));
        } catch (e) {
            console.error('Failed to save holidays:', e);
        }
    }, [holidays]);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [yearFilter, setYearFilter] = useState<string>('2026');
    const [surgeOnly, setSurgeOnly] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<HolidayItem | null>(null);

    // Form State
    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');
    const [formCategory, setFormCategory] = useState<HolidayCategory>('PUBLIC');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');
    const [formHasSurgeRate, setFormHasSurgeRate] = useState(false);
    const [formRateMultiplier, setFormRateMultiplier] = useState(1.25);
    const [formMinStayNights, setFormMinStayNights] = useState(1);
    const [formMandatoryGala, setFormMandatoryGala] = useState(false);
    const [formGalaFee, setFormGalaFee] = useState(0);
    const [formWageMultiplier, setFormWageMultiplier] = useState(2.0);
    const [formCompOff, setFormCompOff] = useState(true);
    const [formStaffingAlert, setFormStaffingAlert] = useState<'STANDARD' | 'HIGH_ALERT' | 'MAX_PRESENCE'>('STANDARD');
    const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [formDescription, setFormDescription] = useState('');
    const [codeError, setCodeError] = useState('');

    // Quick Stats calculation
    const stats = useMemo(() => {
        const total = holidays.length;
        const activeCount = holidays.filter(h => h.status === 'ACTIVE').length;
        const surgeDays = holidays.filter(h => h.hasSurgeRate && h.status === 'ACTIVE').length;
        const doubleWageDays = holidays.filter(h => h.staffWageMultiplier >= 2.0 && h.status === 'ACTIVE').length;
        return { total, activeCount, surgeDays, doubleWageDays };
    }, [holidays]);

    // Filtered holidays list
    const filteredHolidays = useMemo(() => {
        return holidays.filter(item => {
            const matchesSearch =
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

            const matchesYear =
                yearFilter === 'ALL' ||
                item.startDate.startsWith(yearFilter) ||
                item.endDate.startsWith(yearFilter);

            const matchesSurge = !surgeOnly || item.hasSurgeRate;

            return matchesSearch && matchesCategory && matchesYear && matchesSurge;
        }).sort((a, b) => a.startDate.localeCompare(b.startDate));
    }, [holidays, searchTerm, categoryFilter, yearFilter, surgeOnly]);

    // Calculate days between two ISO date strings inclusive
    const calculateDays = (start: string, end: string): number => {
        if (!start || !end) return 1;
        const s = new Date(start);
        const e = new Date(end);
        const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return diff > 0 ? diff : 1;
    };

    // Open Create Modal
    const handleOpenCreate = () => {
        setEditingItem(null);
        setFormName('');
        const newCode = generateUniqueShortCode('HOL', holidays.map(h => h.code));
        setFormCode(newCode);
        setFormCategory('PUBLIC');
        const defaultDate = `${yearFilter !== 'ALL' ? yearFilter : '2026'}-01-01`;
        setFormStartDate(defaultDate);
        setFormEndDate(defaultDate);
        setFormHasSurgeRate(false);
        setFormRateMultiplier(1.25);
        setFormMinStayNights(1);
        setFormMandatoryGala(false);
        setFormGalaFee(0);
        setFormWageMultiplier(2.0);
        setFormCompOff(true);
        setFormStaffingAlert('STANDARD');
        setFormStatus('ACTIVE');
        setFormDescription('');
        setCodeError('');
        setIsModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (item: HolidayItem) => {
        setEditingItem(item);
        setFormName(item.name);
        setFormCode(item.code);
        setFormCategory(item.category);
        setFormStartDate(item.startDate);
        setFormEndDate(item.endDate);
        setFormHasSurgeRate(item.hasSurgeRate);
        setFormRateMultiplier(item.rateMultiplier);
        setFormMinStayNights(item.minStayNights);
        setFormMandatoryGala(item.mandatoryGala);
        setFormGalaFee(item.galaDinnerFee);
        setFormWageMultiplier(item.staffWageMultiplier);
        setFormCompOff(item.compOffCredit);
        setFormStaffingAlert(item.minimumStaffingAlert);
        setFormStatus(item.status);
        setFormDescription(item.description || '');
        setCodeError('');
        setIsModalOpen(true);
    };

    // Handle Name Change with Auto-Code Generation
    const handleNameChange = (val: string) => {
        setFormName(val);
        if (!editingItem && val.trim().length > 2) {
            const autoCode = generateUniqueShortCode(val, holidays.map(h => h.code));
            setFormCode(autoCode);
            setCodeError('');
        }
    };

    // Regenerate Code
    const handleRegenerateCode = () => {
        const base = formName.trim() || 'HOL';
        const existingCodes = holidays.filter(h => h.id !== editingItem?.id).map(h => h.code);
        const code = generateUniqueShortCode(base, existingCodes);
        setFormCode(code);
        setCodeError('');
    };

    // Save Holiday
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        const cleanCode = formCode.trim().toUpperCase();
        if (!cleanCode) {
            setCodeError('Short code is required');
            return;
        }

        const existingCodes = holidays.filter(h => h.id !== editingItem?.id).map(h => h.code);
        if (isShortCodeDuplicate(cleanCode, existingCodes)) {
            setCodeError(`Code "${cleanCode}" is already in use by another holiday.`);
            return;
        }

        const days = calculateDays(formStartDate, formEndDate);

        if (editingItem) {
            // Update
            setHolidays(prev =>
                prev.map(h =>
                    h.id === editingItem.id
                        ? {
                              ...h,
                              code: cleanCode,
                              name: formName.trim(),
                              category: formCategory,
                              startDate: formStartDate,
                              endDate: formEndDate,
                              daysCount: days,
                              hasSurgeRate: formHasSurgeRate,
                              rateMultiplier: formHasSurgeRate ? Number(formRateMultiplier) : 1.0,
                              minStayNights: Number(formMinStayNights) || 1,
                              mandatoryGala: formMandatoryGala,
                              galaDinnerFee: formMandatoryGala ? Number(formGalaFee) : 0,
                              staffWageMultiplier: Number(formWageMultiplier) || 1.0,
                              compOffCredit: formCompOff,
                              minimumStaffingAlert: formStaffingAlert,
                              status: formStatus,
                              description: formDescription.trim(),
                          }
                        : h
                )
            );
        } else {
            // Create
            const newItem: HolidayItem = {
                id: `hol-${Date.now()}`,
                code: cleanCode,
                name: formName.trim(),
                category: formCategory,
                startDate: formStartDate,
                endDate: formEndDate,
                daysCount: days,
                hasSurgeRate: formHasSurgeRate,
                rateMultiplier: formHasSurgeRate ? Number(formRateMultiplier) : 1.0,
                minStayNights: Number(formMinStayNights) || 1,
                mandatoryGala: formMandatoryGala,
                galaDinnerFee: formMandatoryGala ? Number(formGalaFee) : 0,
                staffWageMultiplier: Number(formWageMultiplier) || 1.0,
                compOffCredit: formCompOff,
                minimumStaffingAlert: formStaffingAlert,
                status: formStatus,
                description: formDescription.trim(),
                createdAt: new Date().toISOString(),
            };
            setHolidays(prev => [newItem, ...prev]);
        }

        setIsModalOpen(false);
    };

    // Delete Holiday
    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to remove "${name}" from the holiday calendar?`)) {
            setHolidays(prev => prev.filter(h => h.id !== id));
        }
    };

    // Toggle Status
    const handleToggleStatus = (id: string) => {
        setHolidays(prev =>
            prev.map(h =>
                h.id === id ? { ...h, status: h.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : h
            )
        );
    };

    // Category styling helpers
    const getCategoryBadge = (cat: HolidayCategory) => {
        switch (cat) {
            case 'PEAK_GALA':
                return {
                    label: 'Peak Gala / Surge',
                    bg: 'bg-amber-50 text-amber-800 border border-amber-200/90',
                };
            case 'RELIGIOUS':
                return {
                    label: 'Religious Festival',
                    bg: 'bg-purple-50 text-purple-800 border border-purple-200/90',
                };
            case 'PUBLIC':
                return {
                    label: 'Public Statutory',
                    bg: 'bg-emerald-50 text-emerald-800 border border-emerald-200/90',
                };
            case 'CORPORATE':
                return {
                    label: 'Hotel Observance',
                    bg: 'bg-blue-50 text-blue-800 border border-blue-200/90',
                };
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans">
            {/* Standard Page Header */}
            <PageHeader
                title="Holiday & Peak Governance"
                subtitle="Statutory public holidays, high-demand peak gala dates, room rate surge multipliers & staff overtime wage rules"
                icon={<CalendarDays className="size-6 text-primary" />}
                actions={
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="btn-primary flex items-center gap-2 cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Add Holiday / Peak Day</span>
                    </button>
                }
            />

            {/* 4 Standardized Thesis KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Calendar Holidays</span>
                        <div className="size-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                            <Calendar className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{stats.total}</div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-semibold">{stats.activeCount} Active Observances</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Surge Rate Peaks</span>
                        <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <TrendingUp className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{stats.surgeDays} Days</div>
                    <div className="mt-1 text-[11px] text-amber-600/90 font-medium">Dynamic revenue yield dates</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Double Wage (2x)</span>
                        <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <DollarSign className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{stats.doubleWageDays} Days</div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">Statutory overtime pay required</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Next Observance</span>
                        <div className="size-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            <Clock className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-lg font-black text-slate-900 tracking-tight truncate max-w-[180px]">
                        {filteredHolidays[0]?.name || 'None Scheduled'}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">
                        {filteredHolidays[0]?.startDate || 'N/A'}
                    </div>
                </div>
            </div>

            {/* Standardized Search & Filter Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap gap-3 items-center justify-between">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search holidays, codes, notes..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input-standard pl-10"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Year Filter */}
                    <select
                        value={yearFilter}
                        onChange={e => setYearFilter(e.target.value)}
                        className="select-standard !py-1.5 !text-xs !w-auto"
                    >
                        <option value="ALL">All Years</option>
                        <option value="2025">Year 2025</option>
                        <option value="2026">Year 2026</option>
                        <option value="2027">Year 2027</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="select-standard !py-1.5 !text-xs !w-auto"
                    >
                        <option value="ALL">All Categories</option>
                        <option value="PUBLIC">Public Statutory</option>
                        <option value="RELIGIOUS">Religious Festival</option>
                        <option value="PEAK_GALA">Peak Gala / Surcharge</option>
                        <option value="CORPORATE">Hotel Observance</option>
                    </select>

                    {/* Surge Only toggle */}
                    <button
                        type="button"
                        onClick={() => setSurgeOnly(!surgeOnly)}
                        className={`px-3 py-1.5 text-xs rounded-xl border font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            surgeOnly
                                ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs'
                                : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <TrendingUp className="size-3.5 text-amber-600" />
                        <span>Surge Rate Only</span>
                    </button>
                </div>
            </div>

            {/* Holidays Table Container */}
            <div className="table-container">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200/90 text-slate-600 uppercase tracking-wider">
                            <th className="py-3.5 px-4">Holiday / Event</th>
                            <th className="py-3.5 px-4">Code</th>
                            <th className="py-3.5 px-4">Date Range & Duration</th>
                            <th className="py-3.5 px-4">Category</th>
                            <th className="py-3.5 px-4">Rate & MLOS</th>
                            <th className="py-3.5 px-4">Staff Wage & Duty</th>
                            <th className="py-3.5 px-4 text-center">Status</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredHolidays.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                                    No holidays found matching your filters.
                                </td>
                            </tr>
                        ) : (
                            filteredHolidays.map(item => {
                                const catBadge = getCategoryBadge(item.category);
                                return (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50/70 transition group"
                                    >
                                        <td className="py-3.5 px-4">
                                            <div className="text-slate-900">
                                                {item.name}
                                            </div>
                                            {item.description && (
                                                <div className="text-[11px] text-slate-400 line-clamp-1 max-w-[280px]">
                                                    {item.description}
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <span className="badge-code">
                                                {item.code}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <div className="text-slate-900 font-semibold font-mono">
                                                {item.startDate === item.endDate
                                                    ? item.startDate
                                                    : `${item.startDate} → ${item.endDate}`}
                                            </div>
                                            <div className="text-[11px] text-slate-400 font-medium">
                                                {item.daysCount} {item.daysCount === 1 ? 'day' : 'days duration'}
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <span
                                                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${catBadge.bg}`}
                                            >
                                                {catBadge.label}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            {item.hasSurgeRate ? (
                                                <div>
                                                    <span className="text-amber-600 font-bold">
                                                        {item.rateMultiplier}x Rate (+{Math.round((item.rateMultiplier - 1) * 100)}% Surge)
                                                    </span>
                                                    <div className="text-[11px] text-slate-400 font-medium">
                                                        Min Stay: {item.minStayNights}N
                                                        {item.mandatoryGala && ` • Gala: +$${item.galaDinnerFee}`}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 font-normal">
                                                    Standard Rate (1.0x)
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <div className="font-semibold text-slate-800">
                                                {item.staffWageMultiplier}x Overtime Pay
                                            </div>
                                            <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                                                {item.compOffCredit && <span>+ Comp Off •</span>}
                                                <span className="capitalize">{item.minimumStaffingAlert.toLowerCase().replace('_', ' ')}</span>
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(item.id)}
                                                className={item.status === 'ACTIVE' ? 'badge-status-active cursor-pointer' : 'badge-status-inactive cursor-pointer'}
                                            >
                                                {item.status}
                                            </button>
                                        </td>

                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(item)}
                                                    className="btn-icon"
                                                    title="Edit Holiday"
                                                >
                                                    <Edit2 className="size-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(item.id, item.name)}
                                                    className="btn-icon-danger"
                                                    title="Delete Holiday"
                                                >
                                                    <Trash2 className="size-3.5" />
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

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/90 bg-slate-50/70">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="size-5 text-primary" />
                                <h2 className="text-base text-slate-900">
                                    {editingItem ? 'Edit Holiday / Peak Rule' : 'Add New Holiday / Peak Season'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {/* Holiday Name */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-700">
                                    Holiday / Event Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. New Year Gala, Eid-ul-Fitr, Independence Day"
                                    value={formName}
                                    onChange={e => handleNameChange(e.target.value)}
                                    className="input-standard"
                                />
                            </div>

                            {/* Short Code with Auto-Generator */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Short Code * (Auto-Generated)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleRegenerateCode}
                                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                                    >
                                        <Sparkles className="size-3" />
                                        <span>Auto-Generate</span>
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={formCode}
                                        onChange={e => {
                                            setFormCode(e.target.value.toUpperCase());
                                            setCodeError('');
                                        }}
                                        className={`input-standard font-mono uppercase ${
                                            codeError ? 'border-rose-500 ring-1 ring-rose-500' : ''
                                        }`}
                                    />
                                </div>
                                {codeError && (
                                    <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-medium">
                                        <AlertCircle className="size-3" />
                                        {codeError}
                                    </p>
                                )}
                            </div>

                            {/* Category & Status */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Category *
                                    </label>
                                    <select
                                        value={formCategory}
                                        onChange={e => setFormCategory(e.target.value as HolidayCategory)}
                                        className="select-standard"
                                    >
                                        <option value="PUBLIC">Public Statutory Holiday</option>
                                        <option value="RELIGIOUS">Religious Festival</option>
                                        <option value="PEAK_GALA">Peak Gala / High Season</option>
                                        <option value="CORPORATE">Hotel Corporate Observance</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Status
                                    </label>
                                    <select
                                        value={formStatus}
                                        onChange={e => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                                        className="select-standard"
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive / Archived</option>
                                    </select>
                                </div>
                            </div>

                            {/* Dates: Start and End */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formStartDate}
                                        onChange={e => {
                                            setFormStartDate(e.target.value);
                                            if (!formEndDate || formEndDate < e.target.value) {
                                                setFormEndDate(e.target.value);
                                            }
                                        }}
                                        className="input-standard font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        End Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formEndDate}
                                        min={formStartDate}
                                        onChange={e => setFormEndDate(e.target.value)}
                                        className="input-standard font-mono"
                                    />
                                </div>
                            </div>

                            {/* Rate Surcharge & Commercial Section */}
                            <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="size-4 text-amber-600" />
                                        <span className="text-xs text-amber-900">
                                            Yield & Surge Pricing Rules
                                        </span>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formHasSurgeRate}
                                            onChange={e => setFormHasSurgeRate(e.target.checked)}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        <span className="text-xs font-semibold text-amber-900">
                                            Enable Surge Rate
                                        </span>
                                    </label>
                                </div>

                                {formHasSurgeRate && (
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="space-y-1">
                                            <label className="block text-[11px] font-semibold text-slate-700">
                                                Rate Multiplier (e.g. 1.30 = +30%)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.05"
                                                min="1.0"
                                                max="3.0"
                                                value={formRateMultiplier}
                                                onChange={e => setFormRateMultiplier(parseFloat(e.target.value))}
                                                className="input-standard !py-1.5"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[11px] font-semibold text-slate-700">
                                                Min Stay (MLOS Nights)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="7"
                                                value={formMinStayNights}
                                                onChange={e => setFormMinStayNights(parseInt(e.target.value))}
                                                className="input-standard !py-1.5"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Staffing & HR Compensation Section */}
                            <div className="p-3.5 bg-blue-50/70 border border-blue-200/90 rounded-xl space-y-3">
                                <div className="flex items-center gap-2">
                                    <Users className="size-4 text-primary" />
                                    <span className="text-xs text-slate-900">
                                        Staff Overtime & Statutory Rules
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-semibold text-slate-700">
                                            Overtime Wage Multiplier
                                        </label>
                                        <select
                                            value={formWageMultiplier}
                                            onChange={e => setFormWageMultiplier(parseFloat(e.target.value))}
                                            className="select-standard !py-1.5"
                                        >
                                            <option value="1.0">1.0x (Standard Wage)</option>
                                            <option value="1.5">1.5x (Time and a Half)</option>
                                            <option value="2.0">2.0x (Double Time / Statutory)</option>
                                            <option value="2.5">2.5x (Premium Holiday Rate)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-semibold text-slate-700">
                                            Staffing Alert Level
                                        </label>
                                        <select
                                            value={formStaffingAlert}
                                            onChange={e =>
                                                setFormStaffingAlert(
                                                    e.target.value as 'STANDARD' | 'HIGH_ALERT' | 'MAX_PRESENCE'
                                                )
                                            }
                                            className="select-standard !py-1.5"
                                        >
                                            <option value="STANDARD">Standard Shift</option>
                                            <option value="HIGH_ALERT">High Alert (No Leaves)</option>
                                            <option value="MAX_PRESENCE">Maximum Presence Required</option>
                                        </select>
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer pt-1">
                                    <input
                                        type="checkbox"
                                        checked={formCompOff}
                                        onChange={e => setFormCompOff(e.target.checked)}
                                        className="rounded text-primary focus:ring-primary"
                                    />
                                    <span className="text-xs text-slate-700 font-medium">
                                        Grant 1-Day Compensatory Off (Comp-off) Credit to working roster staff
                                    </span>
                                </label>
                            </div>

                            {/* Description / Notes */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-700">
                                    Operational Notes / Guidelines
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Enter guidelines, protocol requirements, or banqueting arrangements..."
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    className="input-standard"
                                />
                            </div>

                            {/* Modal Footer Buttons */}
                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/90">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex items-center gap-1.5"
                                >
                                    <Save className="size-4" />
                                    <span>{editingItem ? 'Save Changes' : 'Create Holiday'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
