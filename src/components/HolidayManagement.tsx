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
import { generateUniqueShortCode, isShortCodeDuplicate } from '../utils/codeGenerator';

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

const STORAGE_KEY = 'hotel_holidays_v1';

const INITIAL_HOLIDAYS: HolidayItem[] = [
    {
        id: 'hol-001',
        code: 'NY-GALA-26',
        name: "New Year's Eve & Grand Gala",
        category: 'PEAK_GALA',
        startDate: '2026-12-31',
        endDate: '2027-01-02',
        daysCount: 3,
        hasSurgeRate: true,
        rateMultiplier: 1.50,
        minStayNights: 2,
        mandatoryGala: true,
        galaDinnerFee: 120,
        staffWageMultiplier: 2.5,
        compOffCredit: true,
        minimumStaffingAlert: 'MAX_PRESENCE',
        status: 'ACTIVE',
        description: "High occupancy seasonal peak. Compulsory rooftop ballroom gala & fireworks package.",
    },
    {
        id: 'hol-002',
        code: 'LANG-DAY-26',
        name: 'International Mother Language Day',
        category: 'PUBLIC',
        startDate: '2026-02-21',
        endDate: '2026-02-21',
        daysCount: 1,
        hasSurgeRate: false,
        rateMultiplier: 1.0,
        minStayNights: 1,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'STANDARD',
        status: 'ACTIVE',
        description: 'Statutory government holiday. Standard rooms with diplomatic morning protocol.',
    },
    {
        id: 'hol-003',
        code: 'EID-FITR-26',
        name: 'Eid-ul-Fitr Grand Holidays',
        category: 'RELIGIOUS',
        startDate: '2026-03-20',
        endDate: '2026-03-23',
        daysCount: 4,
        hasSurgeRate: true,
        rateMultiplier: 1.35,
        minStayNights: 2,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'HIGH_ALERT',
        status: 'ACTIVE',
        description: 'Major family vacation peak. High occupancy banquet and buffet dining operations.',
    },
    {
        id: 'hol-004',
        code: 'INDEP-26',
        name: 'Independence & National Day',
        category: 'PUBLIC',
        startDate: '2026-03-26',
        endDate: '2026-03-26',
        daysCount: 1,
        hasSurgeRate: false,
        rateMultiplier: 1.0,
        minStayNights: 1,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'STANDARD',
        status: 'ACTIVE',
        description: 'National commemoration. State diplomatic flags hoisted and security heightened.',
    },
    {
        id: 'hol-005',
        code: 'LABOR-26',
        name: 'International Workers & Labor Day',
        category: 'PUBLIC',
        startDate: '2026-05-01',
        endDate: '2026-05-01',
        daysCount: 1,
        hasSurgeRate: false,
        rateMultiplier: 1.0,
        minStayNights: 1,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'STANDARD',
        status: 'ACTIVE',
        description: 'Statutory labor day. Roster compensation applied per labor court regulation.',
    },
    {
        id: 'hol-006',
        code: 'EID-ADHA-26',
        name: 'Eid-ul-Adha Holidays',
        category: 'RELIGIOUS',
        startDate: '2026-05-27',
        endDate: '2026-05-30',
        daysCount: 4,
        hasSurgeRate: true,
        rateMultiplier: 1.30,
        minStayNights: 2,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'HIGH_ALERT',
        status: 'ACTIVE',
        description: 'Festival period with high suite bookings and specialized culinary menu rotations.',
    },
    {
        id: 'hol-007',
        code: 'SUMMER-PEAK-26',
        name: 'Mid-Summer Tourism High Season',
        category: 'PEAK_GALA',
        startDate: '2026-08-01',
        endDate: '2026-08-08',
        daysCount: 8,
        hasSurgeRate: true,
        rateMultiplier: 1.25,
        minStayNights: 3,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 1.5,
        compOffCredit: false,
        minimumStaffingAlert: 'HIGH_ALERT',
        status: 'ACTIVE',
        description: 'International travel peak period with heightened pool & wellness activities.',
    },
    {
        id: 'hol-008',
        code: 'VICTORY-26',
        name: 'Victory Day Festival',
        category: 'PUBLIC',
        startDate: '2026-12-16',
        endDate: '2026-12-16',
        daysCount: 1,
        hasSurgeRate: false,
        rateMultiplier: 1.0,
        minStayNights: 1,
        mandatoryGala: false,
        galaDinnerFee: 0,
        staffWageMultiplier: 2.0,
        compOffCredit: true,
        minimumStaffingAlert: 'STANDARD',
        status: 'ACTIVE',
        description: 'National holiday with celebratory executive brunch at the Grand Dining Hall.',
    },
    {
        id: 'hol-009',
        code: 'XMAS-26',
        name: 'Christmas Eve & Winter Holidays',
        category: 'RELIGIOUS',
        startDate: '2026-12-24',
        endDate: '2026-12-26',
        daysCount: 3,
        hasSurgeRate: true,
        rateMultiplier: 1.45,
        minStayNights: 2,
        mandatoryGala: true,
        galaDinnerFee: 95,
        staffWageMultiplier: 2.5,
        compOffCredit: true,
        minimumStaffingAlert: 'MAX_PRESENCE',
        status: 'ACTIVE',
        description: 'Global holiday with festive Christmas Eve dinner buffet and gingerbread lobby house.',
    }
];

export default function HolidayManagement() {
    const [holidays, setHolidays] = useState<HolidayItem[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : INITIAL_HOLIDAYS;
        } catch (e) {
            console.error('Failed to parse saved holidays:', e);
            return INITIAL_HOLIDAYS;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(holidays));
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
                    bg: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
                };
            case 'RELIGIOUS':
                return {
                    label: 'Religious Festival',
                    bg: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
                };
            case 'PUBLIC':
                return {
                    label: 'Public Statutory',
                    bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
                };
            case 'CORPORATE':
                return {
                    label: 'Hotel Observance',
                    bg: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
                };
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Top Header Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                        <CalendarDays className="size-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                                Holiday & Peak Governance
                            </h1>
                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                Settings & Governance
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Statutory public holidays, high-demand peak gala dates, room rate surge multipliers & staff overtime wage rules.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-xl shadow-xs flex items-center gap-2 transition"
                    >
                        <Plus className="size-4" />
                        <span>Add Holiday / Peak Day</span>
                    </button>
                </div>
            </div>

            {/* KPI Metric Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Calendar className="size-5" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-medium">Calendar Holidays</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">
                            {stats.total}{' '}
                            <span className="text-xs font-normal text-emerald-600">({stats.activeCount} Active)</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <TrendingUp className="size-5" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-medium">Surge Rate Peaks</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">
                            {stats.surgeDays} Days
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <DollarSign className="size-5" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-medium">Double Wage (2x) Days</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">
                            {stats.doubleWageDays} Days
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Clock className="size-5" />
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-medium">Next Major Event</div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                            {filteredHolidays[0]?.name || 'None Scheduled'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search holidays, codes, notes..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Year Filter */}
                    <select
                        value={yearFilter}
                        onChange={e => setYearFilter(e.target.value)}
                        className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
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
                        className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
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
                        className={`px-3 py-2 text-xs rounded-lg border font-medium flex items-center gap-1.5 transition ${
                            surgeOnly
                                ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                    >
                        <TrendingUp className="size-3.5" />
                        <span>Surge Rate Only</span>
                    </button>
                </div>
            </div>

            {/* Holidays Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                                <th className="py-3 px-4">Holiday / Event</th>
                                <th className="py-3 px-4">Code</th>
                                <th className="py-3 px-4">Date Range & Days</th>
                                <th className="py-3 px-4">Category</th>
                                <th className="py-3 px-4">Rate & MLOS</th>
                                <th className="py-3 px-4">Staff Wage & Duty</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                            {filteredHolidays.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                                        No holidays found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredHolidays.map(item => {
                                    const catBadge = getCategoryBadge(item.category);
                                    return (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                                        >
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {item.name}
                                                </div>
                                                {item.description && (
                                                    <div className="text-[11px] text-slate-400 line-clamp-1 max-w-[280px]">
                                                        {item.description}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                                    {item.code}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="text-slate-900 dark:text-white font-medium">
                                                    {item.startDate === item.endDate
                                                        ? item.startDate
                                                        : `${item.startDate} → ${item.endDate}`}
                                                </div>
                                                <div className="text-[11px] text-slate-500">
                                                    {item.daysCount} {item.daysCount === 1 ? 'day' : 'days duration'}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4">
                                                <span
                                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catBadge.bg}`}
                                                >
                                                    {catBadge.label}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4">
                                                {item.hasSurgeRate ? (
                                                    <div>
                                                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                                                            {item.rateMultiplier}x Rate ({Math.round((item.rateMultiplier - 1) * 100)}% Surge)
                                                        </span>
                                                        <div className="text-[10px] text-slate-400">
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

                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                                    {item.staffWageMultiplier}x Overtime Pay
                                                </div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                    {item.compOffCredit && <span>+ Comp Off •</span>}
                                                    <span className="capitalize">{item.minimumStaffingAlert.toLowerCase().replace('_', ' ')}</span>
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(item.id)}
                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${
                                                        item.status === 'ACTIVE'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                                            : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}
                                                >
                                                    {item.status}
                                                </button>
                                            </td>

                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(item)}
                                                        className="size-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition"
                                                        title="Edit Holiday"
                                                    >
                                                        <Edit2 className="size-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(item.id, item.name)}
                                                        className="size-7 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center transition"
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
            </div>

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="size-5 text-amber-600" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    {editingItem ? 'Edit Holiday / Peak Rule' : 'Add New Holiday / Peak Season'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {/* Holiday Name */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Holiday / Event Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. New Year Gala, Eid-ul-Fitr, Independence Day"
                                    value={formName}
                                    onChange={e => handleNameChange(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                                />
                            </div>

                            {/* Short Code with Auto-Generator */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Short Code * (Auto-Generated)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleRegenerateCode}
                                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
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
                                        className={`w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-800 border rounded-lg text-slate-900 dark:text-white uppercase focus:outline-none ${
                                            codeError
                                                ? 'border-rose-500 ring-1 ring-rose-500'
                                                : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-amber-500'
                                        }`}
                                    />
                                </div>
                                {codeError && (
                                    <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                                        <AlertCircle className="size-3" />
                                        {codeError}
                                    </p>
                                )}
                            </div>

                            {/* Category & Status */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Category *
                                    </label>
                                    <select
                                        value={formCategory}
                                        onChange={e => setFormCategory(e.target.value as HolidayCategory)}
                                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                                    >
                                        <option value="PUBLIC">Public Statutory Holiday</option>
                                        <option value="RELIGIOUS">Religious Festival</option>
                                        <option value="PEAK_GALA">Peak Gala / High Season</option>
                                        <option value="CORPORATE">Hotel Corporate Observance</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={formStatus}
                                        onChange={e => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive / Archived</option>
                                    </select>
                                </div>
                            </div>

                            {/* Dates: Start and End */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        End Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formEndDate}
                                        min={formStartDate}
                                        onChange={e => setFormEndDate(e.target.value)}
                                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Rate Surcharge & Commercial Section */}
                            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="size-4 text-amber-600" />
                                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                                            Yield & Surge Pricing Rules
                                        </span>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formHasSurgeRate}
                                            onChange={e => setFormHasSurgeRate(e.target.checked)}
                                            className="rounded text-amber-600"
                                        />
                                        <span className="text-xs font-medium text-amber-900 dark:text-amber-200">
                                            Enable Surge Rate
                                        </span>
                                    </label>
                                </div>

                                {formHasSurgeRate && (
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Rate Multiplier (e.g. 1.30 = +30%)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.05"
                                                min="1.0"
                                                max="3.0"
                                                value={formRateMultiplier}
                                                onChange={e => setFormRateMultiplier(parseFloat(e.target.value))}
                                                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Min Stay (MLOS Nights)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="7"
                                                value={formMinStayNights}
                                                onChange={e => setFormMinStayNights(parseInt(e.target.value))}
                                                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Staffing & HR Compensation Section */}
                            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-xl space-y-3">
                                <div className="flex items-center gap-2">
                                    <Users className="size-4 text-blue-600" />
                                    <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                                        Staff Overtime & Statutory Rules
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Overtime Wage Multiplier
                                        </label>
                                        <select
                                            value={formWageMultiplier}
                                            onChange={e => setFormWageMultiplier(parseFloat(e.target.value))}
                                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                                        >
                                            <option value="1.0">1.0x (Standard Wage)</option>
                                            <option value="1.5">1.5x (Time and a Half)</option>
                                            <option value="2.0">2.0x (Double Time / Statutory)</option>
                                            <option value="2.5">2.5x (Premium Holiday Rate)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Staffing Alert Level
                                        </label>
                                        <select
                                            value={formStaffingAlert}
                                            onChange={e =>
                                                setFormStaffingAlert(
                                                    e.target.value as 'STANDARD' | 'HIGH_ALERT' | 'MAX_PRESENCE'
                                                )
                                            }
                                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
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
                                        className="rounded text-blue-600"
                                    />
                                    <span className="text-xs text-slate-700 dark:text-slate-300">
                                        Grant 1-Day Compensatory Off (Comp-off) Credit to working roster staff
                                    </span>
                                </label>
                            </div>

                            {/* Description / Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Operational Notes / Guidelines
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Enter guidelines, protocol requirements, or banqueting arrangements..."
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                                />
                            </div>

                            {/* Modal Footer Buttons */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition"
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
